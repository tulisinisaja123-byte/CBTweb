import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Printer,
  CreditCard,
  Sparkles,
  Search,
  Filter,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Copy,
  ChevronDown,
  Layers,
  FileSpreadsheet,
  Building,
  UserCheck,
  CalendarDays,
  ListFilter,
  Check,
  Table,
  LayoutGrid,
  HelpCircle
} from 'lucide-react';
import { Exam, ExamStatus, ClassItem, Subject, User, AssessmentType, SchoolSettings } from '../types';
import { MA_CIKARAMAS_CLASSES, MA_CIKARAMAS_TEACHERS } from '../data/curriculumData';
import { bulkSaveExams, saveEntity, deleteEntity, getSchoolSettings } from '../services/lmsStorage';

interface CbtExamScheduleManagerProps {
  token: string;
  exams: Exam[];
  classes: ClassItem[];
  subjects: Subject[];
  assessmentTypes: AssessmentType[];
  users: User[];
  currentUser?: User;
  onNavigateToPrint?: () => void;
  onNavigateToQuestions?: () => void;
  onRefreshData?: () => void;
}

export const CbtExamScheduleManager: React.FC<CbtExamScheduleManagerProps> = ({
  token,
  exams,
  classes,
  subjects,
  assessmentTypes,
  users,
  currentUser,
  onNavigateToPrint,
  onNavigateToQuestions,
  onRefreshData
}) => {
  const isAdmin = currentUser?.ROLE === 'ADMIN';
  // Views: 'TABLE_GROUPED' (Tabel Per Hari), 'TABLE_ALL' (Daftar Tabel Master), or 'CARDS' (Model Kartu)
  const [viewMode, setViewMode] = useState<'TABLE_GROUPED' | 'TABLE_ALL' | 'CARDS'>('TABLE_GROUPED');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssessmentFilter, setSelectedAssessmentFilter] = useState<string>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Partial<Exam> | null>(null);
  const [isAutoGeneratorModalOpen, setIsAutoGeneratorModalOpen] = useState(false);
  const [isMasterPrintModalOpen, setIsMasterPrintModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State for Add/Edit
  const [formExam, setFormExam] = useState<{
    id: string;
    title: string;
    subjectId: string;
    classId: string;
    assessmentTypeId: string;
    examDate: string;
    startTime: string;
    durationMin: number;
    room: string;
    session: string;
    supervisor: string;
    status: ExamStatus;
    randomize: boolean;
    maxViolations: number;
  }>({
    id: '',
    title: '',
    subjectId: subjects[0]?.ID || '',
    classId: classes[0]?.ID || 'ALL',
    assessmentTypeId: assessmentTypes[0]?.ID || 'SAS',
    examDate: new Date().toISOString().split('T')[0],
    startTime: '07:30',
    durationMin: 90,
    room: 'Ruang 01',
    session: 'Sesi 1 (07:30 - 09:00)',
    supervisor: MA_CIKARAMAS_TEACHERS[0]?.name || '',
    status: 'ACTIVE',
    randomize: true,
    maxViolations: 3
  });

  // Auto Generator Wizard State
  const [genConfig, setGenConfig] = useState<{
    assessmentTypeId: string;
    targetClassIds: string[];
    startDate: string;
    daysCount: number;
    sessionsPerDay: number;
    defaultDuration: number;
    roomPrefix: string;
  }>({
    assessmentTypeId: 'SAS',
    targetClassIds: classes.map(c => c.ID),
    startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
    daysCount: 6,
    sessionsPerDay: 2,
    defaultDuration: 90,
    roomPrefix: 'Ruang'
  });

  // Lookup maps
  const classMap = useMemo(() => new Map(classes.map(c => [c.ID, c.NAME])), [classes]);
  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.ID, s.NAME])), [subjects]);
  const assessmentMap = useMemo(() => new Map(assessmentTypes.map(a => [a.ID, a.NAME])), [assessmentTypes]);
  const settings: SchoolSettings = useMemo(() => getSchoolSettings(), []);

  // Filtered Exams
  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      if (selectedAssessmentFilter !== 'ALL' && e.ASSESSMENT_TYPE_ID !== selectedAssessmentFilter) {
        return false;
      }
      if (selectedClassFilter !== 'ALL' && e.CLASS_ID !== selectedClassFilter && e.CLASS_ID !== 'ALL') {
        return false;
      }
      if (selectedStatusFilter !== 'ALL') {
        if (selectedStatusFilter === 'DRAFT' || selectedStatusFilter === 'SCHEDULED') {
          if (e.STATUS !== 'DRAFT' && e.STATUS !== 'SCHEDULED') return false;
        } else if (selectedStatusFilter === 'FINISHED' || selectedStatusFilter === 'COMPLETED') {
          if (e.STATUS !== 'FINISHED') return false;
        } else if (e.STATUS !== selectedStatusFilter) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = (e.TITLE || '').toLowerCase().includes(query);
        const subName = (subjectMap.get(e.SUBJECT_ID) || '').toLowerCase();
        const clsName = (classMap.get(e.CLASS_ID) || '').toLowerCase();
        const roomMatch = (e.ROOM || '').toLowerCase().includes(query);
        const spvMatch = (e.SUPERVISOR || '').toLowerCase().includes(query);
        return titleMatch || subName.includes(query) || clsName.includes(query) || roomMatch || spvMatch;
      }
      return true;
    });
  }, [exams, selectedAssessmentFilter, selectedClassFilter, selectedStatusFilter, searchQuery, subjectMap, classMap]);

  // Grouped by Date for Matrix View
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Exam[]> = {};
    filteredExams.forEach(e => {
      const dateKey = e.EXAM_DATE || 'Tanpa Tanggal';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(e);
    });

    // Sort dates
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredExams]);

  // KPI counts
  const stats = useMemo(() => {
    const total = exams.length;
    const active = exams.filter(e => e.STATUS === 'ACTIVE').length;
    const draft = exams.filter(e => e.STATUS === 'DRAFT' || e.STATUS === 'SCHEDULED').length;
    const completed = exams.filter(e => e.STATUS === 'FINISHED').length;
    return { total, active, draft, completed };
  }, [exams]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const handleOpenAdd = () => {
    if (!isAdmin) {
      showNotification('error', 'Hanya Administrator yang dapat menambah jadwal ujian. Silakan buat soal pada Bank Soal.');
      return;
    }
    setEditingExam(null);
    setFormExam({
      id: `EXAM-${Date.now().toString().slice(-4)}`,
      title: '',
      subjectId: subjects[0]?.ID || '',
      classId: classes[0]?.ID || 'ALL',
      assessmentTypeId: assessmentTypes[0]?.ID || 'SAS',
      examDate: new Date().toISOString().split('T')[0],
      startTime: '07:30',
      durationMin: 90,
      room: 'Ruang 01',
      session: 'Sesi 1 (07:30 - 09:00)',
      supervisor: MA_CIKARAMAS_TEACHERS[0]?.name || '',
      status: 'ACTIVE',
      randomize: true,
      maxViolations: 3
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (exam: Exam) => {
    if (!isAdmin) {
      if (onNavigateToQuestions) {
        onNavigateToQuestions();
      } else {
        showNotification('error', 'Pengaturan sesi jadwal ujian dikelola oleh Administrator.');
      }
      return;
    }
    setEditingExam(exam);
    setFormExam({
      id: exam.ID,
      title: exam.TITLE,
      subjectId: exam.SUBJECT_ID,
      classId: exam.CLASS_ID,
      assessmentTypeId: exam.ASSESSMENT_TYPE_ID,
      examDate: exam.EXAM_DATE,
      startTime: exam.START_TIME || '07:30',
      durationMin: exam.DURATION_MIN || 90,
      room: exam.ROOM || 'Ruang 01',
      session: exam.SESSION || 'Sesi 1',
      supervisor: exam.SUPERVISOR || '',
      status: exam.STATUS,
      randomize: exam.RANDOMIZE !== false,
      maxViolations: exam.MAX_VIOLATIONS || 3
    });
    setIsAddEditModalOpen(true);
  };

  const handleSaveForm = () => {
    if (!isAdmin) {
      showNotification('error', 'Hanya Administrator yang dapat menyimpan jadwal ujian.');
      return;
    }
    if (!formExam.title.trim()) {
      // Auto-generate title if empty
      const sub = subjectMap.get(formExam.subjectId) || 'Mapel';
      const asType = assessmentMap.get(formExam.assessmentTypeId) || 'Ujian';
      const cls = formExam.classId === 'ALL' ? 'Semua Kelas' : (classMap.get(formExam.classId) || formExam.classId);
      formExam.title = `${asType} ${sub} - ${cls}`;
    }

    try {
      // Calculate end time
      let endTime = '';
      if (formExam.startTime && formExam.durationMin) {
        const [h, m] = formExam.startTime.split(':').map(Number);
        const totalMinutes = h * 60 + m + formExam.durationMin;
        const endH = Math.floor(totalMinutes / 60) % 24;
        const endM = totalMinutes % 60;
        endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      }

      const payload: Partial<Exam> = {
        ID: formExam.id || `EXAM-${Date.now().toString().slice(-4)}`,
        TITLE: formExam.title,
        SUBJECT_ID: formExam.subjectId,
        CLASS_ID: formExam.classId,
        ASSESSMENT_TYPE_ID: formExam.assessmentTypeId,
        EXAM_DATE: formExam.examDate,
        START_TIME: formExam.startTime,
        END_TIME: endTime,
        DURATION_MIN: Number(formExam.durationMin),
        ROOM: formExam.room,
        SESSION: formExam.session,
        SUPERVISOR: formExam.supervisor,
        STATUS: formExam.status,
        RANDOMIZE: formExam.randomize,
        MAX_VIOLATIONS: Number(formExam.maxViolations),
        CREATED_AT: editingExam?.CREATED_AT || new Date().toISOString()
      };

      saveEntity(token, 'EXAMS', payload);
      setIsAddEditModalOpen(false);
      showNotification('success', `Jadwal ujian "${payload.TITLE}" berhasil disimpan!`);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal menyimpan jadwal ujian.');
    }
  };

  const handleDelete = (examId: string, title: string) => {
    if (!isAdmin) {
      showNotification('error', 'Hanya Administrator yang dapat menghapus jadwal ujian.');
      return;
    }
    let confirmed = true;
    try {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        confirmed = window.confirm(`Hapus jadwal ujian "${title}"?`);
      }
    } catch {
      confirmed = true;
    }
    if (confirmed) {
      try {
        deleteEntity(token, 'EXAMS', examId);
        showNotification('success', `Jadwal ujian berhasil dihapus.`);
        if (onRefreshData) onRefreshData();
      } catch (err: any) {
        showNotification('error', err.message || 'Gagal menghapus jadwal ujian.');
      }
    }
  };

  const handleDuplicateToClass = (exam: Exam, targetClassId: string) => {
    if (!isAdmin) {
      showNotification('error', 'Hanya Administrator yang dapat menduplikasi jadwal ujian.');
      return;
    }
    try {
      const targetClassName = classMap.get(targetClassId) || targetClassId;
      const subName = subjectMap.get(exam.SUBJECT_ID) || 'Mapel';
      const asTypeName = assessmentMap.get(exam.ASSESSMENT_TYPE_ID) || 'Asesmen';

      const newExam: Exam = {
        ...exam,
        ID: `EXAM-${Date.now().toString().slice(-5)}`,
        TITLE: `${asTypeName} ${subName} - ${targetClassName}`,
        CLASS_ID: targetClassId,
        CREATED_AT: new Date().toISOString()
      };

      saveEntity(token, 'EXAMS', newExam);
      showNotification('success', `Jadwal berhasil diduplikasi untuk ${targetClassName}!`);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal menduplikasi jadwal.');
    }
  };

  // 1-Click Automatic Schedule Generator for Full Assessment Week
  const handleRunAutoGenerator = () => {
    try {
      const generatedExams: Exam[] = [];
      const sessionTimes = [
        { session: 'Sesi 1', start: '07:30', duration: 90, end: '09:00' },
        { session: 'Sesi 2', start: '09:30', duration: 90, end: '11:00' },
        { session: 'Sesi 3', start: '13:00', duration: 90, end: '14:30' }
      ];

      const teachersList = MA_CIKARAMAS_TEACHERS.map(t => t.name);

      // Start date parsing
      const startDate = new Date(genConfig.startDate);

      // Map subjects per class level
      let examIndex = 1;
      let dayOffset = 0;

      for (let day = 0; day < genConfig.daysCount; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + dayOffset);
        
        // Skip Sunday
        if (currentDate.getDay() === 0) {
          dayOffset++;
          currentDate.setDate(startDate.getDate() + dayOffset);
        }

        const dateStr = currentDate.toISOString().split('T')[0];

        for (let sIdx = 0; sIdx < genConfig.sessionsPerDay; sIdx++) {
          const sTime = sessionTimes[sIdx] || sessionTimes[0];

          // For each selected class
          genConfig.targetClassIds.forEach((clsId, cIdx) => {
            // Find appropriate subject for this class
            const cls = classes.find(c => c.ID === clsId);
            const classSubjects = subjects.filter(sub => !sub.CLASS_ID || sub.CLASS_ID === clsId || sub.CLASS_ID === 'ALL');
            
            // Pick subject cyclically
            const subject = classSubjects[(day * genConfig.sessionsPerDay + sIdx) % (classSubjects.length || 1)] || subjects[0];
            const supervisor = teachersList[(day + sIdx + cIdx) % teachersList.length] || 'Pengawas Ruang';
            const roomNumber = String((cIdx % 7) + 1).padStart(2, '0');
            const roomName = `${genConfig.roomPrefix} ${roomNumber}`;

            const asTypeName = assessmentMap.get(genConfig.assessmentTypeId) || genConfig.assessmentTypeId;
            const subName = subject?.NAME || 'Mata Pelajaran';
            const clsName = cls?.NAME || clsId;

            const examId = `UJN-${genConfig.assessmentTypeId}-${clsName.replace(/\./g, '')}-${String(examIndex).padStart(3, '0')}`;

            generatedExams.push({
              ID: examId,
              TITLE: `${asTypeName} ${subName} (${clsName})`,
              SUBJECT_ID: subject?.ID || '',
              CLASS_ID: clsId,
              ASSESSMENT_TYPE_ID: genConfig.assessmentTypeId,
              EXAM_DATE: dateStr,
              START_TIME: sTime.start,
              END_TIME: sTime.end,
              DURATION_MIN: genConfig.defaultDuration,
              ROOM: roomName,
              SESSION: `${sTime.session} (${sTime.start} - ${sTime.end})`,
              SUPERVISOR: supervisor,
              STATUS: 'ACTIVE',
              RANDOMIZE: true,
              MAX_VIOLATIONS: 3,
              CREATED_BY: 'AUTO_GENERATOR',
              CREATED_AT: new Date().toISOString()
            });

            examIndex++;
          });
        }
        dayOffset++;
      }

      bulkSaveExams(token, generatedExams);
      setIsAutoGeneratorModalOpen(false);
      showNotification('success', `Berhasil membuat ${generatedExams.length} jadwal ujian otomatis untuk ${genConfig.targetClassIds.length} kelas!`);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal menjalankan generator jadwal.');
    }
  };

  const handlePrintMasterSchedule = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`no-print p-4 rounded-xl shadow-lg border flex items-center justify-between text-xs font-semibold ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:bg-black/5 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TOP HEADER & ACTION BAR */}
      <div className="no-print bg-white border border-[#DEE2E6] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-50 text-[#0052CC]">
                <CalendarDays className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1A1C1E] tracking-tight">
                Pengaturan Jadwal Ujian & CBT
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#6C757D] mt-1 ml-9">
              Kelola jadwal pelaksanaan Asesmen Madrasah (SAS, STS, AM), sesi ruang, pengawas, dan cetak kartu ujian otomatis per siswa.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {isAdmin && (
              <button
                onClick={() => setIsAutoGeneratorModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                title="Buat paket jadwal lengkap 1 semester/pekan otomatis"
              >
                <Sparkles className="w-4 h-4 text-amber-700" />
                <span>Generator Jadwal (1-Klik)</span>
              </button>
            )}

            <button
              onClick={() => setIsMasterPrintModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
              title="Cetak format jadwal ujian resmi ber-KOP untuk madrasah"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span>Cetak Master Jadwal</span>
            </button>

            {onNavigateToPrint && (
              <button
                onClick={onNavigateToPrint}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                title="Cetak kartu peserta siswa dengan tabel jadwal otomatis"
              >
                <CreditCard className="w-4 h-4 text-emerald-700" />
                <span>Cetak Kartu Siswa</span>
              </button>
            )}

            {isAdmin ? (
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 rounded-xl bg-[#0052CC] hover:bg-[#0047B3] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jadwal Ujian</span>
              </button>
            ) : onNavigateToQuestions ? (
              <button
                onClick={onNavigateToQuestions}
                className="px-4 py-2 rounded-xl bg-[#0052CC] hover:bg-[#0047B3] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Buka Bank Soal untuk membuat dan mengelola butir soal ujian"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Bank Soal (Kelola & Buat Soal)</span>
              </button>
            ) : null}
          </div>
        </div>

        {!isAdmin && (
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 text-xs text-blue-900">
              <span className="px-2 py-0.5 rounded-md bg-[#0052CC] text-white shrink-0 font-bold text-[10px] tracking-wider uppercase">
                Akses Guru
              </span>
              <span>
                Jadwal sesi dan ruang ujian diatur oleh Panitia / Administrator. Anda memiliki hak akses penuh untuk <b>membuat dan mengelola butir soal</b> pada menu <b>Bank Soal</b>.
              </span>
            </div>
            {onNavigateToQuestions && (
              <button
                type="button"
                onClick={onNavigateToQuestions}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0052CC] hover:bg-[#0047B3] text-white font-semibold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Ke Bank Soal (Buat Soal) →</span>
              </button>
            )}
          </div>
        )}

        {/* STATS TILES */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-medium text-slate-500 block">Total Jadwal</span>
            <span className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">{stats.total}</span>
          </div>
          <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80">
            <span className="text-[11px] font-medium text-emerald-700 block">Ujian Aktif / Berjalan</span>
            <span className="text-xl font-bold font-mono text-emerald-900 mt-0.5 block">{stats.active}</span>
          </div>
          <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200/80">
            <span className="text-[11px] font-medium text-blue-700 block">Ujian Terjadwal (Draft)</span>
            <span className="text-xl font-bold font-mono text-[#0052CC] mt-0.5 block">{stats.draft}</span>
          </div>
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-medium text-slate-500 block">Ujian Selesai</span>
            <span className="text-xl font-bold font-mono text-slate-700 mt-0.5 block">{stats.completed}</span>
          </div>
        </div>

        {/* SEARCH, FILTERS & VIEW TOGGLE */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari mapel, kelas, ruang, pengawas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-[#0052CC] focus:bg-white"
              />
            </div>

            {/* Filter Jenis Asesmen */}
            <select
              value={selectedAssessmentFilter}
              onChange={e => setSelectedAssessmentFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-[#0052CC]"
            >
              <option value="ALL">Semua Jenis Asesmen</option>
              {assessmentTypes.map(as => (
                <option key={as.ID} value={as.ID}>
                  {as.NAME} ({as.ID})
                </option>
              ))}
            </select>

            {/* Filter Kelas */}
            <select
              value={selectedClassFilter}
              onChange={e => setSelectedClassFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-[#0052CC]"
            >
              <option value="ALL">Semua Kelas</option>
              {classes.map(c => (
                <option key={c.ID} value={c.ID}>
                  Kelas {c.NAME}
                </option>
              ))}
            </select>

            {/* Filter Status */}
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-[#0052CC]"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="DRAFT">Terjadwal</option>
              <option value="FINISHED">Selesai</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start md:self-auto">
            <button
              onClick={() => setViewMode('TABLE_GROUPED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'TABLE_GROUPED'
                  ? 'bg-white text-[#0052CC] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Tabel Per Hari</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE_ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'TABLE_ALL'
                  ? 'bg-white text-[#0052CC] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Tabel Semua Jadwal</span>
            </button>
            <button
              onClick={() => setViewMode('CARDS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'CARDS'
                  ? 'bg-white text-[#0052CC] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Model Kartu</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT AREA: TABLE PER HARI (DEFAULT), TABEL SEMUA, OR MODEL KARTU */}
      {viewMode === 'TABLE_GROUPED' ? (
        /* 1. TABLE GROUPED BY DAY VIEW */
        <div className="space-y-6">
          {groupedByDate.map(([dateStr, dateExams]) => (
            <div
              key={dateStr}
              className="bg-white border border-[#DEE2E6] rounded-2xl p-5 shadow-xs space-y-4"
            >
              {/* Date Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-[#0052CC]">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {dateStr !== 'Tanpa Tanggal' ? (
                        new Date(dateStr).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })
                      ) : (
                        'Tanpa Tanggal'
                      )}
                    </h3>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {dateStr} • {dateExams.length} Ujian Terjadwal
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                    {dateExams.length} Mapel Diujikan
                  </span>

                  <button
                    onClick={() => {
                      setFormExam({
                        id: '',
                        title: '',
                        subjectId: subjects[0]?.ID || '',
                        classId: classes[0]?.ID || 'ALL',
                        assessmentTypeId: assessmentTypes[0]?.ID || 'SAS',
                        examDate: dateStr !== 'Tanpa Tanggal' ? dateStr : new Date().toISOString().split('T')[0],
                        startTime: '07:30',
                        durationMin: 90,
                        room: 'Ruang 01',
                        session: 'Sesi 1 (07:30 - 09:00)',
                        supervisor: MA_CIKARAMAS_TEACHERS[0]?.name || '',
                        status: 'ACTIVE',
                        randomize: true,
                        maxViolations: 3
                      });
                      setEditingExam(null);
                      setIsAddEditModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-[11px] font-semibold text-slate-700 hover:text-[#0052CC] flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah di Hari Ini</span>
                  </button>
                </div>
              </div>

              {/* TABLE OF EXAMS FOR THIS DAY */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3 w-36">Waktu & Sesi</th>
                      <th className="py-2.5 px-3">Mata Pelajaran</th>
                      <th className="py-2.5 px-3 w-28">Kelas / Rombel</th>
                      <th className="py-2.5 px-3 w-20">Durasi</th>
                      <th className="py-2.5 px-3">Jenis Asesmen</th>
                      <th className="py-2.5 px-3 w-24">Ruang</th>
                      <th className="py-2.5 px-3">Pengawas Ruang</th>
                      <th className="py-2.5 px-3 w-24 text-center">Status</th>
                      <th className="py-2.5 px-3 w-28 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {dateExams.map((ex, exIdx) => {
                      const subName = subjectMap.get(ex.SUBJECT_ID) || ex.SUBJECT_ID;
                      const clsName = ex.CLASS_ID === 'ALL' ? 'Semua Kelas' : (classMap.get(ex.CLASS_ID) || ex.CLASS_ID);
                      const asName = assessmentMap.get(ex.ASSESSMENT_TYPE_ID) || ex.ASSESSMENT_TYPE_ID;

                      return (
                        <tr key={ex.ID} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-medium">
                            {exIdx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-800">
                            <div className="font-bold flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{ex.START_TIME || '07:30'} {ex.END_TIME ? `- ${ex.END_TIME}` : ''} WIB</span>
                            </div>
                            {ex.SESSION && (
                              <div className="text-[10px] text-slate-500 mt-0.5">{ex.SESSION}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{subName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{ex.ID} • {ex.TITLE}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                              {clsName}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono">
                            {ex.DURATION_MIN || 90} Menit
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0052CC] font-bold text-[10px] border border-blue-100">
                              {asName}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-800 flex items-center gap-1">
                              <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{ex.ROOM || 'Ruang 01'}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[140px]">{ex.SUPERVISOR || '-'}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full font-semibold text-[10px] inline-block ${
                                ex.STATUS === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ex.STATUS === 'FINISHED'
                                  ? 'bg-slate-200 text-slate-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {ex.STATUS === 'ACTIVE' ? 'Aktif' : ex.STATUS === 'FINISHED' ? 'Selesai' : 'Terjadwal'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Quick Duplicate to other class */}
                              <div className="relative group/dup">
                                <button
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Salin Jadwal ke Rombel Lain"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <div className="hidden group-hover/dup:block absolute bottom-full right-0 mb-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 p-1.5 z-30 space-y-1">
                                  <span className="text-[10px] font-bold text-slate-400 block px-1">Duplikasi ke:</span>
                                  {classes.filter(c => c.ID !== ex.CLASS_ID).map(c => (
                                    <button
                                      key={c.ID}
                                      onClick={() => handleDuplicateToClass(ex, c.ID)}
                                      className="w-full text-left px-2 py-1 rounded text-[11px] text-slate-700 hover:bg-blue-50 hover:text-blue-600 font-medium"
                                    >
                                      Kelas {c.NAME}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {isAdmin ? (
                                <>
                                  <button
                                    onClick={() => handleOpenEdit(ex)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                    title="Edit Jadwal"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(ex.ID, ex.TITLE)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Hapus Jadwal"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : onNavigateToQuestions ? (
                                <button
                                  onClick={onNavigateToQuestions}
                                  className="px-2 py-1 rounded bg-blue-50 text-[#0052CC] hover:bg-blue-100 font-semibold text-[11px] flex items-center gap-1 border border-blue-200 transition-colors cursor-pointer"
                                  title="Kelola butir soal pada Bank Soal"
                                >
                                  <HelpCircle className="w-3 h-3" />
                                  <span>Kelola Soal</span>
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {filteredExams.length === 0 && (
            <div className="bg-white border border-[#DEE2E6] rounded-2xl p-12 text-center space-y-3">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">Belum Ada Jadwal Ujian yang Cocok</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Silakan ubah filter atau klik tombol <b>Tambah Jadwal Ujian</b> atau <b>Generator Jadwal (1-Klik)</b> untuk membuat jadwal asesmen otomatis.
              </p>
              <button
                onClick={handleOpenAdd}
                className="mt-2 px-4 py-2 rounded-xl bg-[#0052CC] text-white font-semibold text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Jadwal Pertama</span>
              </button>
            </div>
          )}
        </div>
      ) : viewMode === 'CARDS' ? (
        /* 2. CARD MATRIX VIEW */
        <div className="space-y-6">
          {groupedByDate.map(([dateStr, dateExams]) => (
            <div
              key={dateStr}
              className="bg-white border border-[#DEE2E6] rounded-2xl p-5 shadow-xs space-y-4"
            >
              {/* Date Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-[#0052CC]">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {dateStr !== 'Tanpa Tanggal' ? (
                        new Date(dateStr).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })
                      ) : (
                        'Tanpa Tanggal'
                      )}
                    </h3>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {dateStr} • {dateExams.length} Ujian Terjadwal
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                  {dateExams.length} Mapel Diujikan
                </span>
              </div>

              {/* Grid of Exams for this Day */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {dateExams.map(ex => {
                  const subName = subjectMap.get(ex.SUBJECT_ID) || ex.SUBJECT_ID;
                  const clsName = ex.CLASS_ID === 'ALL' ? 'Semua Kelas' : (classMap.get(ex.CLASS_ID) || ex.CLASS_ID);
                  const asName = assessmentMap.get(ex.ASSESSMENT_TYPE_ID) || ex.ASSESSMENT_TYPE_ID;

                  return (
                    <div
                      key={ex.ID}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-xs transition-all space-y-3 relative group"
                    >
                      {/* Top badges */}
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-blue-100/70 text-[#0052CC] font-bold text-[10px]">
                          {asName}
                        </span>
                        <div className="flex items-center gap-1">
                          <span
                            className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                              ex.STATUS === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ex.STATUS === 'FINISHED'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ex.STATUS === 'ACTIVE' ? 'Aktif' : ex.STATUS === 'FINISHED' ? 'Selesai' : 'Terjadwal'}
                          </span>
                        </div>
                      </div>

                      {/* Subject and Class */}
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">{subName}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-medium text-[11px]">
                            Kelas: {clsName}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {ex.DURATION_MIN || 90} Menit
                          </span>
                        </div>
                      </div>

                      {/* Time, Session, Room, Supervisor */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-semibold text-slate-800">
                            {ex.START_TIME || '07:30'} {ex.END_TIME ? `- ${ex.END_TIME}` : ''} WIB
                          </span>
                          {ex.SESSION && (
                            <span className="text-slate-400">({ex.SESSION})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Ruang: <b className="text-slate-700">{ex.ROOM || 'Ruang 01'}</b></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">Pengawas: <b className="text-slate-700">{ex.SUPERVISOR || '-'}</b></span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                        <span className="font-mono text-[10px] text-slate-400">{ex.ID}</span>
                        <div className="flex items-center gap-1">
                          {/* Quick Duplicate to other class */}
                          <div className="relative group/dup">
                            <button
                              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                              title="Salin Jadwal ke Rombel Lain"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <div className="hidden group-hover/dup:block absolute bottom-full right-0 mb-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 p-1.5 z-30 space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 block px-1">Duplikasi ke:</span>
                              {classes.filter(c => c.ID !== ex.CLASS_ID).map(c => (
                                <button
                                  key={c.ID}
                                  onClick={() => handleDuplicateToClass(ex, c.ID)}
                                  className="w-full text-left px-2 py-1 rounded text-[11px] text-slate-700 hover:bg-blue-50 hover:text-blue-600 font-medium"
                                >
                                  Kelas {c.NAME}
                                </button>
                              ))}
                            </div>
                          </div>

                          {isAdmin ? (
                            <>
                              <button
                                onClick={() => handleOpenEdit(ex)}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                title="Edit Jadwal"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(ex.ID, ex.TITLE)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Hapus Jadwal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : onNavigateToQuestions ? (
                            <button
                              onClick={onNavigateToQuestions}
                              className="px-2 py-1 rounded bg-blue-50 text-[#0052CC] hover:bg-blue-100 font-semibold text-[11px] flex items-center gap-1 border border-blue-200 transition-colors cursor-pointer"
                              title="Kelola butir soal pada Bank Soal"
                            >
                              <HelpCircle className="w-3 h-3" />
                              <span>Kelola Soal</span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredExams.length === 0 && (
            <div className="bg-white border border-[#DEE2E6] rounded-2xl p-12 text-center space-y-3">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">Belum Ada Jadwal Ujian yang Cocok</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Silakan ubah filter atau klik tombol <b>Tambah Jadwal Ujian</b> atau <b>Generator Jadwal (1-Klik)</b> untuk membuat jadwal asesmen otomatis.
              </p>
              <button
                onClick={handleOpenAdd}
                className="mt-2 px-4 py-2 rounded-xl bg-[#0052CC] text-white font-semibold text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Jadwal Pertama</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* 3. TABLE ALL VIEW (MASTER LIST) */
        <div className="bg-white border border-[#DEE2E6] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-250px)] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 font-bold border-b border-slate-300 shadow-xs">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">No</th>
                  <th className="py-3 px-3">Hari & Tanggal</th>
                  <th className="py-3 px-3">Waktu (WIB)</th>
                  <th className="py-3 px-3">Mata Pelajaran</th>
                  <th className="py-3 px-3">Kelas</th>
                  <th className="py-3 px-3">Jenis Asesmen</th>
                  <th className="py-3 px-3">Ruang / Sesi</th>
                  <th className="py-3 px-3">Pengawas Ruang</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredExams.map((ex, idx) => {
                  const subName = subjectMap.get(ex.SUBJECT_ID) || ex.SUBJECT_ID;
                  const clsName = ex.CLASS_ID === 'ALL' ? 'Semua Kelas' : (classMap.get(ex.CLASS_ID) || ex.CLASS_ID);
                  const asName = assessmentMap.get(ex.ASSESSMENT_TYPE_ID) || ex.ASSESSMENT_TYPE_ID;

                  return (
                    <tr key={ex.ID} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {ex.EXAM_DATE ? (
                          <>
                            <div>{new Date(ex.EXAM_DATE).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{ex.EXAM_DATE}</div>
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-800">
                        <div className="font-bold">{ex.START_TIME || '07:30'} - {ex.END_TIME || '09:00'}</div>
                        <div className="text-[10px] text-slate-400">{ex.DURATION_MIN || 90} Menit</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{subName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{ex.TITLE}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium">
                          {clsName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-blue-100/80 text-[#0052CC] font-bold text-[10px]">
                          {asName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{ex.ROOM || 'Ruang 01'}</div>
                        <div className="text-[10px] text-slate-500">{ex.SESSION || 'Sesi 1'}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {ex.SUPERVISOR || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                            ex.STATUS === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ex.STATUS === 'FINISHED'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ex.STATUS === 'ACTIVE' ? 'Aktif' : ex.STATUS === 'FINISHED' ? 'Selesai' : 'Terjadwal'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isAdmin ? (
                            <>
                              <button
                                onClick={() => handleOpenEdit(ex)}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(ex.ID, ex.TITLE)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : onNavigateToQuestions ? (
                            <button
                              onClick={onNavigateToQuestions}
                              className="px-2 py-1 rounded bg-blue-50 text-[#0052CC] hover:bg-blue-100 font-semibold text-[11px] flex items-center gap-1 border border-blue-200 transition-colors cursor-pointer"
                              title="Kelola butir soal pada Bank Soal"
                            >
                              <HelpCircle className="w-3 h-3" />
                              <span>Kelola Soal</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium italic">Hanya Baca</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT EXAM */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingExam ? 'Edit Jadwal Ujian' : 'Tambah Jadwal Ujian CBT Baru'}
              </h3>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Jenis Penilaian & Mata Pelajaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Jenis Penilaian / Asesmen *</label>
                  <select
                    value={formExam.assessmentTypeId}
                    onChange={e => setFormExam({ ...formExam, assessmentTypeId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                  >
                    {assessmentTypes.map(as => (
                      <option key={as.ID} value={as.ID}>
                        {as.NAME} ({as.ID})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Mata Pelajaran *</label>
                  <select
                    value={formExam.subjectId}
                    onChange={e => setFormExam({ ...formExam, subjectId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                  >
                    {subjects.map(s => (
                      <option key={s.ID} value={s.ID}>
                        {s.NAME} ({s.CODE || s.ID})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Kelas & Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Target Rombel / Kelas *</label>
                  <select
                    value={formExam.classId}
                    onChange={e => setFormExam({ ...formExam, classId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                  >
                    <option value="ALL">Semua Kelas (Paralel)</option>
                    {classes.map(c => (
                      <option key={c.ID} value={c.ID}>
                        Kelas {c.NAME}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Tanggal Pelaksanaan *</label>
                  <input
                    type="date"
                    value={formExam.examDate}
                    onChange={e => setFormExam({ ...formExam, examDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                  />
                </div>
              </div>

              {/* Jam Mulai, Durasi, Sesi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Jam Mulai (WIB) *</label>
                  <input
                    type="time"
                    value={formExam.startTime}
                    onChange={e => setFormExam({ ...formExam, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Durasi Pengerjaan *</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={10}
                      max={240}
                      step={5}
                      value={formExam.durationMin}
                      onChange={e => setFormExam({ ...formExam, durationMin: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                    />
                    <span className="text-slate-500 font-medium">Menit</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Nama Sesi</label>
                  <input
                    type="text"
                    placeholder="Contoh: Sesi 1"
                    value={formExam.session}
                    onChange={e => setFormExam({ ...formExam, session: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                  />
                </div>
              </div>

              {/* Ruang & Pengawas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Ruang Ujian</label>
                  <input
                    type="text"
                    placeholder="Contoh: Ruang 01 / Lab Komputer"
                    value={formExam.room}
                    onChange={e => setFormExam({ ...formExam, room: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Guru Pengawas Ruang</label>
                  <input
                    type="text"
                    list="teachers-list"
                    placeholder="Pilih atau ketik nama pengawas"
                    value={formExam.supervisor}
                    onChange={e => setFormExam({ ...formExam, supervisor: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                  />
                  <datalist id="teachers-list">
                    {MA_CIKARAMAS_TEACHERS.map(t => (
                      <option key={t.code} value={t.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Judul Ujian Otomatis / Kustom */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Judul Ujian (Opsional)</label>
                <input
                  type="text"
                  placeholder="Kosongkan untuk otomatis format judul standar"
                  value={formExam.title}
                  onChange={e => setFormExam({ ...formExam, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                />
              </div>

              {/* Status, Acak Soal, Toleransi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Status Pelaksanaan</label>
                  <select
                    value={formExam.status}
                    onChange={e => setFormExam({ ...formExam, status: e.target.value as ExamStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                  >
                    <option value="ACTIVE">Aktif (Bisa Dikerjakan)</option>
                    <option value="SCHEDULED">Terjadwal</option>
                    <option value="DRAFT">Draft</option>
                    <option value="FINISHED">Selesai</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Batas Pelanggaran</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formExam.maxViolations}
                    onChange={e => setFormExam({ ...formExam, maxViolations: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="randomize-toggle"
                    checked={formExam.randomize}
                    onChange={e => setFormExam({ ...formExam, randomize: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="randomize-toggle" className="font-semibold text-slate-700 select-none">
                    Acak Urutan Soal
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsAddEditModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveForm}
                className="px-5 py-2 rounded-xl bg-[#0052CC] hover:bg-[#0047B3] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Jadwal Ujian</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: 1-CLICK AUTOMATIC SCHEDULE GENERATOR */}
      {isAutoGeneratorModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                  <Sparkles className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Generator Jadwal Asesmen Otomatis
                </h3>
              </div>
              <button
                onClick={() => setIsAutoGeneratorModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Fitur ini akan secara otomatis menyusun jadwal ujian lengkap selama 1 pekan untuk semua mapel kurikulum madrasah, membagi sesi waktu, dan menetapkan ruang serta guru pengawas.
            </p>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Jenis Asesmen *</label>
                <select
                  value={genConfig.assessmentTypeId}
                  onChange={e => setGenConfig({ ...genConfig, assessmentTypeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                >
                  {assessmentTypes.map(as => (
                    <option key={as.ID} value={as.ID}>
                      {as.NAME} ({as.ID})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Tanggal Mulai Ujian *</label>
                  <input
                    type="date"
                    value={genConfig.startDate}
                    onChange={e => setGenConfig({ ...genConfig, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Lama Hari Ujian *</label>
                  <select
                    value={genConfig.daysCount}
                    onChange={e => setGenConfig({ ...genConfig, daysCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                  >
                    <option value={4}>4 Hari (Ujian Singkat)</option>
                    <option value={5}>5 Hari (Senin - Jumat)</option>
                    <option value={6}>6 Hari (Senin - Sabtu)</option>
                    <option value={8}>8 Hari (Pekan Penuh)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Sesi Ujian Per Hari *</label>
                  <select
                    value={genConfig.sessionsPerDay}
                    onChange={e => setGenConfig({ ...genConfig, sessionsPerDay: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                  >
                    <option value={1}>1 Sesi Per Hari (07:30 - 09:00)</option>
                    <option value={2}>2 Sesi Per Hari (Sesi 1 & 2)</option>
                    <option value={3}>3 Sesi Per Hari (Sesi 1, 2, & 3)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Durasi Per Mapel *</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={genConfig.defaultDuration}
                      onChange={e => setGenConfig({ ...genConfig, defaultDuration: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                    />
                    <span className="text-slate-500 font-medium">Menit</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Pilih Rombel / Kelas Sasaran ({genConfig.targetClassIds.length} dipilih)</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl max-h-32 overflow-y-auto">
                  {classes.map(c => {
                    const isChecked = genConfig.targetClassIds.includes(c.ID);
                    return (
                      <label key={c.ID} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setGenConfig({ ...genConfig, targetClassIds: [...genConfig.targetClassIds, c.ID] });
                            } else {
                              setGenConfig({ ...genConfig, targetClassIds: genConfig.targetClassIds.filter(id => id !== c.ID) });
                            }
                          }}
                          className="w-3.5 h-3.5 rounded text-blue-600"
                        />
                        <span>Kelas {c.NAME}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsAutoGeneratorModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRunAutoGenerator}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>Buat Jadwal Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRINTABLE MASTER EXAM SCHEDULE (FORMAT RESMI MADRASAH) */}
      {isMasterPrintModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto print-modal-backdrop">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 sm:p-10 space-y-6 my-8 print-modal-body">
            {/* Top Toolbar (Hidden on print) */}
            <div className="no-print flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-slate-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Dokumen Cetak Master Jadwal Ujian Madrasah
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintMasterSchedule}
                  className="px-4 py-2 rounded-xl bg-[#0052CC] hover:bg-[#0047B3] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Sekarang (Ctrl + P)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMasterPrintModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PRINTABLE OFFICIAL DOCUMENT CONTENT */}
            <div className="printable-sheet space-y-6 text-black">
              {/* Kop Surat Resmi Madrasah */}
              <div className="text-center pb-4 border-b-2 border-double border-black space-y-1">
                <div className="text-xs uppercase tracking-widest font-semibold text-slate-600">
                  YAYASAN PENDIDIKAN ISLAM MUHAMMADIYAH
                </div>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-black tracking-tight">
                  {settings.SCHOOL_NAME || 'MADRASAH ALIYAH MUHAMMADIYAH CIKARAMAS'}
                </h2>
                <div className="text-xs text-slate-700">
                  {settings.SCHOOL_ADDRESS || 'Jl. Raya Cikaramas - Wado No. 12, Sumedang, Jawa Barat'} • Telp: {settings.SCHOOL_PHONE || '(0261) 882190'}
                </div>
                <div className="text-xs text-slate-700 font-medium">
                  Website: {settings.SCHOOL_WEBSITE || 'www.mamuhammadiyahcikaramas.sch.id'} • Email: {settings.SCHOOL_EMAIL || 'info@mamuhammadiyahcikaramas.sch.id'}
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold uppercase tracking-wide underline">
                  JADWAL PELAKSANAAN ASESMEN SUMATIF / CBT
                </h3>
                <div className="text-xs font-semibold">
                  TAHUN PELAJARAN {settings.SCHOOL_YEAR || '2026/2027'} - SEMESTER {settings.SEMESTER?.toUpperCase() || 'GANJIL'}
                </div>
              </div>

              {/* Master Table of Exams */}
              <table className="w-full text-xs border border-black border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-black font-bold text-center">
                    <th className="p-2 border-r border-black w-10">NO</th>
                    <th className="p-2 border-r border-black w-36">HARI, TANGGAL</th>
                    <th className="p-2 border-r border-black w-28">WAKTU (WIB)</th>
                    <th className="p-2 border-r border-black">MATA PELAJARAN</th>
                    <th className="p-2 border-r border-black w-20">KELAS</th>
                    <th className="p-2 border-r border-black w-24">RUANG / SESI</th>
                    <th className="p-2 border-r border-black">PENGAWAS RUANG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {filteredExams.map((ex, i) => {
                    const subName = subjectMap.get(ex.SUBJECT_ID) || ex.SUBJECT_ID;
                    const clsName = ex.CLASS_ID === 'ALL' ? 'Semua Kelas' : (classMap.get(ex.CLASS_ID) || ex.CLASS_ID);

                    return (
                      <tr key={ex.ID} className="break-inside-avoid">
                        <td className="p-2 border-r border-black text-center font-mono">{i + 1}</td>
                        <td className="p-2 border-r border-black font-semibold">
                          {ex.EXAM_DATE ? new Date(ex.EXAM_DATE).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                        <td className="p-2 border-r border-black text-center font-mono font-medium">
                          {ex.START_TIME || '07:30'} - {ex.END_TIME || '09:00'}
                        </td>
                        <td className="p-2 border-r border-black font-bold">
                          {subName}
                        </td>
                        <td className="p-2 border-r border-black text-center font-medium">
                          {clsName}
                        </td>
                        <td className="p-2 border-r border-black text-center text-[11px]">
                          {ex.ROOM || 'Ruang 01'} {ex.SESSION ? `(${ex.SESSION})` : ''}
                        </td>
                        <td className="p-2 text-[11px] font-medium">
                          {ex.SUPERVISOR || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Signature Section */}
              <div className="flex justify-between pt-8 text-xs break-inside-avoid">
                <div className="text-center space-y-16">
                  <div>
                    Mengetahui,<br />
                    Ketua Panitia Asesmen,
                  </div>
                  <div>
                    <div className="font-bold underline">Deni Kurniawan R., S.Pd</div>
                    <div className="text-[11px]">NBM. 1281203</div>
                  </div>
                </div>

                <div className="text-center space-y-16">
                  <div>
                    {settings.SCHOOL_CITY || 'Sumedang'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />
                    {settings.PRINCIPAL_TITLE || 'Kepala Madrasah'},
                  </div>
                  <div>
                    <div className="font-bold underline">{settings.PRINCIPAL_NAME || 'Ai Sukaesih, S.Pd'}</div>
                    <div className="text-[11px]">{settings.PRINCIPAL_NIP ? (settings.PRINCIPAL_NIP.startsWith('NBM') || settings.PRINCIPAL_NIP.startsWith('NIP') ? settings.PRINCIPAL_NIP : `NBM. ${settings.PRINCIPAL_NIP}`) : 'NBM. 1281201'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CbtExamScheduleManager;

