import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ensureInitialized,
  restoreSession,
  login,
  logout,
  getLookupData,
  listEntity,
  saveEntity,
  deleteEntity,
  deleteEntities,
  importRows,
  startExam,
  safeStorageGet,
  safeStorageSet,
  safeStorageRemove,
  getSchoolSettings,
  subscribeToRealtimeChanges
} from './services/supabaseLmsStorage';
import { User, SchoolSettings, DashboardData, Exam, AssessmentType } from './types';
import { Settings, Loader2, Database } from 'lucide-react';
import { LoginView } from './components/LoginView';
import { Sidebar } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { DashboardView } from './components/DashboardView';
import { MenuLoadingFallback } from './components/MenuLoadingFallback';

// Optimized code-splitting (lazy loading) to keep application lightweight & ultra-fast
const EntityTablePage = React.lazy(() => import('./components/EntityTablePage').then(m => ({ default: m.EntityTablePage })));
const ExamTakerView = React.lazy(() => import('./components/ExamTakerView').then(m => ({ default: m.ExamTakerView })));
const LiveMonitoringView = React.lazy(() => import('./components/LiveMonitoringView').then(m => ({ default: m.LiveMonitoringView })));
const ResultsView = React.lazy(() => import('./components/ResultsView').then(m => ({ default: m.ResultsView })));
const EssayReviewView = React.lazy(() => import('./components/EssayReviewView').then(m => ({ default: m.EssayReviewView })));
const PrintDocumentsView = React.lazy(() => import('./components/PrintDocumentsView').then(m => ({ default: m.PrintDocumentsView })));
const SchoolSettingsView = React.lazy(() => import('./components/SchoolSettingsView').then(m => ({ default: m.SchoolSettingsView })));
const ProfileView = React.lazy(() => import('./components/ProfileView').then(m => ({ default: m.ProfileView })));
const StudentExamsView = React.lazy(() => import('./components/StudentExamsView').then(m => ({ default: m.StudentExamsView })));
const AppsScriptModal = React.lazy(() => import('./components/AppsScriptModal').then(m => ({ default: m.AppsScriptModal })));
const SupabaseRlsModal = React.lazy(() => import('./components/SupabaseRlsModal').then(m => ({ default: m.SupabaseRlsModal })));
const TimetableView = React.lazy(() => import('./components/TimetableView').then(m => ({ default: m.TimetableView })));
const CbtExamScheduleManager = React.lazy(() => import('./components/CbtExamScheduleManager').then(m => ({ default: m.CbtExamScheduleManager })));
const WorkflowGuideView = React.lazy(() => import('./components/WorkflowGuideView').then(m => ({ default: m.WorkflowGuideView })));
const DataMigrationView = React.lazy(() => import('./components/DataMigrationView').then(m => ({ default: m.DataMigrationView })));

export default function App() {
  const [token, setToken] = useState<string>(() => safeStorageGet('lms_token') || '');
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lms_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isAppsScriptModalOpen, setIsAppsScriptModalOpen] = useState<boolean>(false);
  const [isSupabaseRlsModalOpen, setIsSupabaseRlsModalOpen] = useState<boolean>(false);
  const [activeExamData, setActiveExamData] = useState<any | null>(null);
  const [toastNotification, setToastNotification] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [navigatingTitle, setNavigatingTitle] = useState<string>('');

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      safeStorageSet('lms_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Entities & Lookup
  const [lookup, setLookup] = useState<{
    users: User[];
    classes: any[];
    subjects: any[];
    exams: Exam[];
    assessmentTypes: AssessmentType[];
  }>({ users: [], classes: [], subjects: [], exams: [], assessmentTypes: [] });

  const [entityRows, setEntityRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const showToast = (message: string) => {
    setToastNotification(message);
    setTimeout(() => setToastNotification(null), 4000);
  };

  // Initialize session on mount
  useEffect(() => {
    let isMounted = true;
    async function init() {
      await ensureInitialized();
      const storedToken = safeStorageGet('lms_token') || token;
      if (storedToken) {
        try {
          const data = await restoreSession(storedToken);
          if (isMounted) {
            setUser(data.user);
            setSettings(data.settings);
            setDashboard(data.dashboard);
            await refreshLookup(storedToken);
          }
        } catch {
          if (isMounted) {
            safeStorageRemove('lms_token');
            setToken('');
            setUser(null);
            await refreshLookup('');
          }
        }
      } else {
        if (isMounted) {
          await refreshLookup('');
        }
      }
    }
    init();

    const handleTeacherChanged = async () => {
      const activeTok = safeStorageGet('lms_token') || token;
      if (activeTok) {
        await refreshLookup(activeTok);
        const entityMap: Record<string, string> = {
          students: 'USERS',
          teachers: 'USERS',
          classes: 'CLASSES',
          subjects: 'SUBJECTS',
          assessmentTypes: 'ASSESSMENT_TYPES',
          exams: 'EXAMS',
          questions: 'QUESTIONS'
        };
        const targetEntity = entityMap[currentPage];
        if (targetEntity) {
          try {
            const rows = await listEntity(activeTok, targetEntity);
            if (isMounted) setEntityRows(rows);
          } catch {}
        }
      }
    };
    window.addEventListener('LMS_TEACHER_DATA_CHANGED', handleTeacherChanged);

    // Real-time synchronization engine across tabs & in-app updates
    let syncDebounceTimer: any = null;
    const unsubscribe = subscribeToRealtimeChanges('ALL', (payload) => {
      const key = payload?.new;
      if (key === 'lms_sessions' || key === 'lms_activity') {
        return;
      }

      if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
      syncDebounceTimer = setTimeout(async () => {
        const currentTok = safeStorageGet('lms_token') || token;
        const currentSettings = await getSchoolSettings();
        if (isMounted) setSettings(currentSettings);

        if (!currentTok) return;

        await refreshLookup(currentTok);

        try {
          const sessionData = await restoreSession(currentTok);
          if (sessionData && sessionData.dashboard && isMounted) {
            setDashboard(sessionData.dashboard);
          }
        } catch {
          safeStorageRemove('lms_token');
          if (isMounted) {
            setToken('');
            setUser(null);
          }
          await refreshLookup('');
          return;
        }

        const entityMap: Record<string, string> = {
          students: 'USERS',
          teachers: 'USERS',
          classes: 'CLASSES',
          subjects: 'SUBJECTS',
          assessmentTypes: 'ASSESSMENT_TYPES',
          exams: 'EXAMS',
          questions: 'QUESTIONS',
          questionPackages: 'EXAMS',
          participants: 'USERS',
          results: 'ATTEMPTS',
          myResults: 'ATTEMPTS'
        };
        const targetEntity = entityMap[currentPage];
        if (targetEntity) {
          try {
            const rows = await listEntity(currentTok, targetEntity);
            if (isMounted) setEntityRows(rows);
          } catch {}
        }
      }, 80);
    });

    return () => {
      isMounted = false;
      if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
      window.removeEventListener('LMS_TEACHER_DATA_CHANGED', handleTeacherChanged);
      unsubscribe();
    };
  }, [token, currentPage]);

  const refreshLookup = async (tok?: string) => {
    try {
      const lk = await getLookupData(tok || '');
      setLookup(lk);
    } catch {
      // Graceful fallback
    }
  };

  const handleNavigate = (page: string) => {
    if (page === currentPage) {
      setIsSidebarOpen(false);
      return;
    }
    const resolvedPage = page === 'examRoom' ? 'availableExams' : page;
    const targetTitle = pageTitleMap[page] || pageTitleMap[resolvedPage] || resolvedPage;
    setNavigatingTitle(targetTitle);
    setIsNavigating(true);
    setIsSidebarOpen(false);

    // Smooth navigation pacing with microtask frame
    setTimeout(() => {
      setCurrentPage(resolvedPage);
      setTimeout(() => {
        setIsNavigating(false);
      }, 260);
    }, 60);
  };

  const handleLoginSuccess = (data: {
    token: string;
    user: User;
    settings: SchoolSettings;
    dashboard: DashboardData;
  }) => {
    safeStorageSet('lms_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setSettings(data.settings);
    setDashboard(data.dashboard);
    setCurrentPage('dashboard');
    refreshLookup(data.token);
  };

  const handleLogout = async () => {
    await logout(token);
    safeStorageRemove('lms_token');
    setToken('');
    setUser(null);
    setActiveExamData(null);
    setCurrentPage('dashboard');
  };

  const handleQuickSwitchUser = async (username: string) => {
    const passwordMap: Record<string, string> = {
      admin: 'Admin123!',
      guru01: 'Guru123!',
      siswa01: 'Siswa123!'
    };
    try {
      const data = await login(username, passwordMap[username] || 'Admin123!');
      safeStorageSet('lms_token', data.token);
      handleLoginSuccess(data);
    } catch (err: any) {
      showToast(err.message || 'Gagal beralih akun.');
    }
  };

  // Load entity data whenever currentPage changes
  useEffect(() => {
    if (!token || !user) return;
    let isMounted = true;

    const entityMap: Record<string, string> = {
      students: 'USERS',
      teachers: 'USERS',
      classes: 'CLASSES',
      subjects: 'SUBJECTS',
      assessmentTypes: 'ASSESSMENT_TYPES',
      exams: 'EXAMS',
      questions: 'QUESTIONS',
      questionPackages: 'EXAMS',
      participants: 'USERS',
      results: 'ATTEMPTS',
      myResults: 'ATTEMPTS'
    };

    const targetEntity = entityMap[currentPage];
    if (targetEntity) {
      setLoading(true);
      listEntity(token, targetEntity)
        .then((rows) => {
          if (isMounted) setEntityRows(rows);
        })
        .catch((err) => {
          console.error('Failed to list entity', err);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [currentPage, token, user]);

  const handleSaveEntity = async (payload: any, entityType?: string) => {
    if (!token) return;
    const entityMap: Record<string, string> = {
      students: 'USERS',
      teachers: 'USERS',
      classes: 'CLASSES',
      subjects: 'SUBJECTS',
      assessmentTypes: 'ASSESSMENT_TYPES',
      exams: 'EXAMS',
      questions: 'QUESTIONS'
    };
    const ent = entityType || payload?._entityType || entityMap[currentPage];
    if (!ent) return;

    if (payload && payload !== '_REFRESH_ONLY') {
      await saveEntity(token, ent, payload);
    }
    const updatedRows = await listEntity(token, entityMap[currentPage]);
    setEntityRows(updatedRows);
    await refreshLookup(token);
  };

  const handleDeleteEntity = async (id: string | string[], entityType?: string) => {
    if (!token) return;
    const entityMap: Record<string, string> = {
      students: 'USERS',
      teachers: 'USERS',
      classes: 'CLASSES',
      subjects: 'SUBJECTS',
      assessmentTypes: 'ASSESSMENT_TYPES',
      exams: 'EXAMS',
      questions: 'QUESTIONS'
    };
    const ent = entityType || entityMap[currentPage];
    if (!ent) return;

    if (Array.isArray(id)) {
      await deleteEntities(token, ent, id);
    } else {
      await deleteEntity(token, ent, id);
    }
    const updatedRows = await listEntity(token, entityMap[currentPage]);
    setEntityRows(updatedRows);
    await refreshLookup(token);
  };

  const handleImportRows = async (rows: any[], targetExamId?: string) => {
    if (!token) throw new Error('Sesi tidak valid.');
    const entityMap: Record<string, string> = {
      students: 'USERS',
      teachers: 'USERS',
      classes: 'CLASSES',
      subjects: 'SUBJECTS',
      exams: 'QUESTIONS',
      questions: 'QUESTIONS'
    };
    const ent = entityMap[currentPage];
    if (!ent) throw new Error('Entitas tidak mendukung impor.');

    const res = await importRows(token, ent, rows, targetExamId);
    const updatedRows = await listEntity(token, ent === 'QUESTIONS' && currentPage === 'exams' ? 'EXAMS' : ent);
    setEntityRows(updatedRows);
    await refreshLookup(token);
    return res;
  };

  const handleStartExam = async (examId: string) => {
    if (!token) return;
    try {
      const examPayload = await startExam(token, examId);
      setActiveExamData(examPayload);
    } catch (err: any) {
      showToast(err.message || 'Ujian tidak dapat dimulai.');
    }
  };

  const handleExitExam = () => {
    setActiveExamData(null);
    setCurrentPage('dashboard');
    if (token) {
      refreshLookup(token);
    }
  };

  const classNameHelper = (classId: string) => {
    return lookup.classes.find(c => c.ID === classId)?.NAME || classId || '-';
  };

  // If user is not logged in, render LoginView
  if (!token || !user) {
    return (
      <>
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          onOpenAppsScript={() => setIsAppsScriptModalOpen(true)}
        />
        <AppsScriptModal
          isOpen={isAppsScriptModalOpen}
          onClose={() => setIsAppsScriptModalOpen(false)}
        />
      </>
    );
  }

  // If student is currently taking an exam, render ExamTakerView in full view
  if (activeExamData) {
    return (
      <ExamTakerView
        token={token}
        user={user}
        examData={activeExamData}
        onExitExam={handleExitExam}
      />
    );
  }

  const pageTitleMap: Record<string, string> = {
    dashboard: 'Dashboard Utama',
    students: 'Data Siswa',
    teachers: 'Data Guru Pengampu',
    subjects: 'Mata Pelajaran',
    classes: 'Data Kelas',
    questions: 'Bank Soal Ujian',
    questionPackages: 'Paket & Distribusi Soal',
    exams: 'Jadwal Ujian CBT',
    cbtSchedules: 'Jadwal Ujian CBT',
    participants: 'Peserta Ujian',
    results: 'Hasil Nilai Ujian',
    reviews: 'Koreksi Soal Uraian',
    monitoring: 'Live Monitoring CBT',
    printCards: 'Cetak Kartu Peserta',
    printAttendance: 'Cetak Daftar Hadir',
    printMinutes: 'Cetak Berita Acara',
    timetable: 'Jadwal Pelajaran & Mengajar',
    assessmentTypes: 'Jenis Penilaian',
    settings: 'Pengaturan Profil Sekolah',
    migration: 'Migrasi Data ke Supabase',
    availableExams: 'Daftar Ujian Siswa',
    examRoom: 'Ruang Ujian Siswa',
    myResults: 'Hasil Ujian Saya',
    profile: 'Profil & Keamanan Akun',
    workflowGuide: 'Panduan & Langkah Pengerjaan Aplikasi'
  };

  return (
    <div className="min-h-screen bg-[#F1F3F5] text-[#1A1C1E] flex flex-col relative">
      {/* Top Progress Loading Bar for Smooth Menu Transitions */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#0052CC] via-[#2684FF] to-[#00B8D9] z-50 origin-left shadow-xs"
          />
        )}
      </AnimatePresence>

      {/* Smooth Loading Indicator Pill */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="fixed top-20 right-6 sm:right-10 z-40 bg-white/95 backdrop-blur-xs border border-[#B3D1FF] shadow-md px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs font-semibold text-[#0052CC]"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0052CC]" />
            <span>Memuat {navigatingTitle}...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <Sidebar
        user={user}
        currentPage={currentPage}
        isOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onNavigate={handleNavigate}
        onCloseMobile={() => setIsSidebarOpen(false)}
        onToggleCollapse={handleToggleCollapse}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className={`${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'} flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out`}>
        {/* Top Navbar */}
        <TopNavbar
          user={user}
          currentPageTitle={pageTitleMap[currentPage] || 'CBT MAS MUHAMMADIYAH CIKARAMAS'}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onToggleCollapse={handleToggleCollapse}
          onOpenAppsScript={() => setIsAppsScriptModalOpen(true)}
          onOpenSupabaseRls={() => setIsSupabaseRlsModalOpen(true)}
          onQuickSwitchUser={handleQuickSwitchUser}
          onLogout={handleLogout}
        />

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <React.Suspense fallback={<MenuLoadingFallback menuTitle={navigatingTitle || pageTitleMap[currentPage] || 'Halaman'} />}>
            <AnimatePresence mode="wait">
              {isNavigating ? (
                <MenuLoadingFallback key="nav-loader" menuTitle={navigatingTitle || pageTitleMap[currentPage] || 'Halaman'} />
              ) : (
                <motion.div
                  key={currentPage}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {currentPage === 'dashboard' && dashboard && (
                    <DashboardView
                      user={user}
                      dashboard={dashboard}
                      classNameHelper={classNameHelper}
                      onNavigate={handleNavigate}
                      onRefresh={() => {
                        if (token) {
                          restoreSession(token)
                            .then((data) => {
                              setDashboard(data.dashboard);
                              refreshLookup(token);
                            })
                            .catch(() => {
                              handleLogout();
                            });
                        }
                      }}
                    />
                  )}

          {currentPage === 'students' && (
            <EntityTablePage
              entityName="USERS"
              title="Data Siswa"
              subtitle="Kelola data akun siswa, username/NIS, dan kelas siswa."
              rows={entityRows}
              lookup={lookup}
              currentUser={user}
              filterRole="STUDENT"
              onSave={handleSaveEntity}
              onDelete={handleDeleteEntity}
              onImport={handleImportRows}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'teachers' && (
            <EntityTablePage
              entityName="USERS"
              title="Data Guru Pengampu"
              subtitle="Kelola data pengajar dan hak akses guru dalam sistem CBT MAS MUHAMMADIYAH CIKARAMAS."
              rows={entityRows}
              lookup={lookup}
              currentUser={user}
              filterRole="TEACHER"
              onSave={handleSaveEntity}
              onDelete={handleDeleteEntity}
              onImport={handleImportRows}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'classes' && (
            <EntityTablePage
              entityName="CLASSES"
              title="Data Kelas"
              subtitle="Kelola daftar rombel, tingkat kelas, dan wali kelas."
              rows={entityRows}
              lookup={lookup}
              currentUser={user}
              onSave={handleSaveEntity}
              onDelete={handleDeleteEntity}
              onImport={handleImportRows}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'timetable' && (
            <TimetableView
              token={token}
              currentUser={user}
              onShowToast={showToast}
            />
          )}

          {currentPage === 'assessmentTypes' && (
            <EntityTablePage
              entityName="ASSESSMENT_TYPES"
              title="Pengaturan Jenis Penilaian"
              subtitle="Kelola master jenis penilaian kurikulum (Sumatif Harian, Sumatif Awal Semester, Sumatif Tengah Semester, Sumatif Akhir Semester, dsb.) beserta bobot, kode, dan frekuensi penggunaannya."
              rows={entityRows}
              lookup={lookup}
              currentUser={user}
              onSave={handleSaveEntity}
              onDelete={handleDeleteEntity}
              onImport={handleImportRows}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'subjects' && (
            <EntityTablePage
              entityName="SUBJECTS"
              title="Database Mata Pelajaran & Kurikulum"
              subtitle="Kelola mata pelajaran berdasarkan tingkat kelas (X, XI, XII), kelompok kurikulum, guru pengampu per jenjang, KKM, dan beban jam pelajaran."
              rows={entityRows}
              lookup={lookup}
              currentUser={user}
              onSave={handleSaveEntity}
              onDelete={handleDeleteEntity}
              onImport={handleImportRows}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'questions' && (
            <EntityTablePage
              entityName="QUESTIONS"
              title="Bank Soal Ujian"
              subtitle="Kelola 6 variasi tipe soal CBT. Dukungan import naskah soal langsung dari file Microsoft Word (.docx) & Excel (.xlsx)."
              rows={entityRows}
              lookup={lookup}
              currentUser={user}
              onSave={handleSaveEntity}
              onDelete={handleDeleteEntity}
              onImport={handleImportRows}
              onNavigate={handleNavigate}
            />
          )}

          {(currentPage === 'exams' || currentPage === 'cbtSchedules') && (
            <CbtExamScheduleManager
              token={token}
              exams={lookup.exams}
              classes={lookup.classes}
              subjects={lookup.subjects}
              assessmentTypes={lookup.assessmentTypes}
              users={lookup.users}
              currentUser={user}
              onNavigateToPrint={() => handleNavigate('printCards')}
              onNavigateToQuestions={() => handleNavigate('questions')}
              onRefreshData={() => {
                refreshLookup(token);
                listEntity(token, 'EXAMS').then(rows => setEntityRows(rows));
              }}
            />
          )}

          {currentPage === 'questionPackages' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#1A1C1E] tracking-tight">Paket Soal Ujian</h1>
                <p className="text-xs sm:text-sm text-[#6C757D] mt-1">
                  Ringkasan kuota dan jumlah bank soal pada masing-masing jadwal ujian.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {lookup.exams.map(ex => {
                  return (
                    <div
                      key={ex.ID}
                      className="p-5 rounded-lg bg-white border border-[#DEE2E6] shadow-xs space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <span className="px-2 py-0.5 rounded bg-[#E7F0FF] text-[#0052CC] border border-[#B3D1FF] font-mono font-bold text-[10px]">
                          {ex.ID}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] font-semibold text-[10px]">
                          {ex.STATUS}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-[#1A1C1E]">{ex.TITLE}</h3>
                      <div className="text-xs text-[#6C757D]">
                        Durasi: <b className="text-[#1A1C1E]">{ex.DURATION_MIN} menit</b> • Acak Soal:{' '}
                        <b className="text-[#1A1C1E]">{ex.RANDOMIZE ? 'Ya' : 'Tidak'}</b>
                      </div>
                      <div className="pt-3 border-t border-[#DEE2E6] flex justify-between items-center">
                        <button
                          type="button"
                          onClick={() => handleNavigate('questions')}
                          className="text-xs font-semibold text-[#0052CC] hover:text-[#0047B3] hover:underline"
                        >
                          Kelola Soal →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentPage === 'participants' && (
            <EntityTablePage
              entityName="USERS"
              title="Peserta Ujian Sekolah"
              subtitle="Daftar peserta ujian yang terdaftar dalam rombel kelas."
              rows={entityRows}
              lookup={lookup}
              currentUser={user}
              filterRole="STUDENT"
              onSave={handleSaveEntity}
              onDelete={handleDeleteEntity}
              onImport={handleImportRows}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'monitoring' && <LiveMonitoringView token={token} currentUser={user} />}

          {currentPage === 'results' && (
            <ResultsView
              attempts={entityRows}
              exams={lookup.exams}
              users={lookup.users}
              classes={lookup.classes}
              currentUser={user}
              isStudentOnly={false}
            />
          )}

          {currentPage === 'reviews' && <EssayReviewView token={token} />}

          {currentPage === 'printCards' && (
            <PrintDocumentsView
              token={token}
              exams={lookup.exams}
              defaultDocType="cards"
            />
          )}

          {currentPage === 'printAttendance' && (
            <PrintDocumentsView
              token={token}
              exams={lookup.exams}
              defaultDocType="attendance"
            />
          )}

          {currentPage === 'printMinutes' && (
            <PrintDocumentsView
              token={token}
              exams={lookup.exams}
              defaultDocType="minutes"
            />
          )}

          {currentPage === 'settings' && settings && (
            user.ROLE === 'ADMIN' ? (
              <SchoolSettingsView
                token={token}
                initialSettings={settings}
                onSettingsSaved={newSettings => setSettings(newSettings)}
                onOpenSupabaseRls={() => setIsSupabaseRlsModalOpen(true)}
                onOpenMigration={() => handleNavigate('migration')}
              />
            ) : (
              <div className="p-8 bg-white border border-[#DEE2E6] rounded-xl text-center max-w-md mx-auto my-12 space-y-4 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                  <Settings className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Akses Khusus Administrator</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Pengaturan madrasah, kurikulum, dan kop dokumen resmi hanya dapat diubah oleh Administrator.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleNavigate('dashboard')}
                  className="px-4 py-2 bg-[#0052CC] hover:bg-[#0047B3] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Kembali ke Dashboard
                </button>
              </div>
            )
          )}

          {currentPage === 'migration' && (
            user.ROLE === 'ADMIN' ? (
              <DataMigrationView
                token={token}
                onOpenSupabaseRls={() => setIsSupabaseRlsModalOpen(true)}
                onNavigate={handleNavigate}
              />
            ) : (
              <div className="p-8 bg-white border border-[#DEE2E6] rounded-xl text-center max-w-md mx-auto my-12 space-y-4 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Akses Khusus Administrator</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Alat migrasi database dan pencadangan JSON hanya dapat diakses oleh Administrator.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleNavigate('dashboard')}
                  className="px-4 py-2 bg-[#0052CC] hover:bg-[#0047B3] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Kembali ke Dashboard
                </button>
              </div>
            )
          )}

          {(currentPage === 'availableExams' || currentPage === 'examRoom') && (
            <StudentExamsView
              token={token}
              onStartExam={handleStartExam}
            />
          )}

          {currentPage === 'myResults' && (
            <ResultsView
              attempts={entityRows}
              exams={lookup.exams}
              users={lookup.users}
              classes={lookup.classes}
              currentUser={user}
              isStudentOnly={true}
            />
          )}

          {currentPage === 'profile' && (
            <ProfileView
              token={token}
              user={user}
              classNameHelper={classNameHelper}
            />
          )}

          {currentPage === 'workflowGuide' && (
            <WorkflowGuideView
              user={user}
              onNavigate={handleNavigate}
            />
          )}
                </motion.div>
              )}
            </AnimatePresence>
          </React.Suspense>
        </main>
      </div>

      {/* Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#1A1C1E] text-white px-4 py-2.5 rounded-lg shadow-lg text-xs font-medium border border-white/10 animate-fade-in flex items-center gap-2">
          <span>{toastNotification}</span>
        </div>
      )}

      {/* Google Apps Script Source Modal */}
      <React.Suspense fallback={null}>
        {isAppsScriptModalOpen && (
          <AppsScriptModal
            isOpen={isAppsScriptModalOpen}
            onClose={() => setIsAppsScriptModalOpen(false)}
          />
        )}
        {isSupabaseRlsModalOpen && (
          <SupabaseRlsModal
            isOpen={isSupabaseRlsModalOpen}
            onClose={() => setIsSupabaseRlsModalOpen(false)}
          />
        )}
      </React.Suspense>
    </div>
  );
}
