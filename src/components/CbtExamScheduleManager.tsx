import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  HelpCircle,
  CheckSquare,
  Square,
  KeyRound,
  RefreshCw,
  GraduationCap,
  QrCode,
  ShieldCheck,
  Home,
  Building2,
  RotateCcw,
  Database,
  Terminal,
  AlertTriangle,
  Folder,
  BookOpen,
  ListChecks,
  SlidersHorizontal,
  Shuffle
} from 'lucide-react';
import { Exam, ExamStatus, ClassItem, Subject, User, AssessmentType, SchoolSettings, ExamSessionPreset, Question } from '../types';
import { MA_CIKARAMAS_CLASSES, MA_CIKARAMAS_TEACHERS } from '../data/curriculumData';
import { INITIAL_SUBJECTS, INITIAL_CLASSES, INITIAL_ASSESSMENT_TYPES, INITIAL_EXAMS } from '../data/initialData';
import {
  getStorage,
  STORAGE_KEYS,
  getQuestionsForExam,
  getQuestionBanks,
  subscribeToStorageChange,
  getSchoolSettings as getLocalSchoolSettings,
  getTimeOfDayPeriod,
  formatTimeWithPeriod
} from '../services/lmsStorage';
import {
  bulkSaveExams,
  saveEntity,
  deleteEntity,
  deleteEntities,
  getSchoolSettings,
  getSessionPresets,
  getAttemptsForExam,
  resetAllStudentAttemptsForExam,
  resetStudentAttempt,
  fetchRawSupabaseExams,
  addDiagnosticLog
} from '../services/supabaseLmsStorage';
import { SupabaseRawExamsInspector } from './SupabaseRawExamsInspector';
import { DailySchoolPresenceModal } from './DailySchoolPresenceModal';
import { SessionPresetsModal } from './SessionPresetsModal';

interface CbtExamScheduleManagerProps {
  token: string;
  exams?: Exam[];
  classes?: ClassItem[];
  subjects?: Subject[];
  assessmentTypes?: AssessmentType[];
  users?: User[];
  currentUser?: User;
  onNavigateToPrint?: () => void;
  onNavigateToQuestions?: () => void;
  onRefreshData?: () => Promise<any> | void;
  onDelete?: (id: string | string[]) => Promise<any> | void;
  onSave?: (examData: any) => Promise<any> | void;
}

// Safe Indonesian Date Formatter
function formatSafeDate(dateStr?: string, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr || dateStr === 'Tanpa Tanggal') return 'Tanpa Tanggal';
  try {
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('id-ID', options || {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('id-ID', options || {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export const CbtExamScheduleManager: React.FC<CbtExamScheduleManagerProps> = ({
  token,
  exams = [],
  classes = [],
  subjects = [],
  assessmentTypes = [],
  users = [],
  currentUser,
  onNavigateToPrint,
  onNavigateToQuestions,
  onRefreshData,
  onDelete,
  onSave
}) => {
  const safeClasses = useMemo(() => Array.isArray(classes) && classes.length > 0 ? classes : INITIAL_CLASSES, [classes]);
  const safeSubjects = useMemo(() => Array.isArray(subjects) && subjects.length > 0 ? subjects : INITIAL_SUBJECTS, [subjects]);
  const safeAssessmentTypes = useMemo(() => Array.isArray(assessmentTypes) && assessmentTypes.length > 0 ? assessmentTypes : INITIAL_ASSESSMENT_TYPES, [assessmentTypes]);

  // Reactive state for optimistic instant UI updates
  const [currentExams, setCurrentExams] = useState<Exam[]>(() => {
    if (Array.isArray(exams)) return exams;
    return [];
  });

  useEffect(() => {
    if (Array.isArray(exams)) {
      setCurrentExams(exams);
    }
  }, [exams]);

  const safeExams = currentExams;

  const isAdmin = currentUser?.ROLE === 'ADMIN';

  // Compute subjects taught by teacher
  const teacherSubjectIds = useMemo(() => {
    if (!currentUser || currentUser.ROLE !== 'TEACHER') return new Set<string>();
    const normUser = (currentUser.NAME || '').trim().toLowerCase();
    const tCode = (currentUser.TEACHER_CODE || '').trim().toUpperCase();
    const subIds = new Set<string>();
    safeSubjects.forEach(s => {
      if (s.TEACHER_ID === currentUser.ID) subIds.add(s.ID);
      if (tCode && s.TEACHER_CODE && s.TEACHER_CODE.toUpperCase() === tCode) subIds.add(s.ID);
      if (normUser && (s as any).TEACHER_NAME && String((s as any).TEACHER_NAME).trim().toLowerCase() === normUser) subIds.add(s.ID);
    });
    return subIds;
  }, [currentUser, safeSubjects]);

  // Permission check for an exam
  const canManageExam = (exam?: Partial<Exam> | null) => {
    if (isAdmin) return true;
    if (!currentUser) return true;
    if (!exam || !exam.ID) return true; // Adding new exam is ALWAYS permitted!
    if (exam.CREATED_BY === currentUser.ID) return true;
    if (currentUser.ROLE === 'TEACHER') {
      return true; // Teachers in CBT committee can manage exam schedules
    }
    return false;
  };

  // Views: 'TABLE_BY_CLASS' (Tabel Per Kelas), 'TABLE_GROUPED' (Tabel Per Hari), 'TABLE_ALL' (Daftar Tabel Master), 'CARDS' (Model Kartu), or 'RAW_SUPABASE' (Inspektor Database Supabase)
  const [viewMode, setViewMode] = useState<'TABLE_GROUPED' | 'TABLE_BY_CLASS' | 'TABLE_ALL' | 'CARDS' | 'RAW_SUPABASE'>('TABLE_BY_CLASS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssessmentFilter, setSelectedAssessmentFilter] = useState<string>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Supabase Raw Inspector & Stale Tracker
  const [isSupabaseInspectorOpen, setIsSupabaseInspectorOpen] = useState<boolean>(false);
  const [supabaseRawRows, setSupabaseRawRows] = useState<any[]>([]);
  const [supabaseStaleCount, setSupabaseStaleCount] = useState<number>(0);
  const [isCheckingSupabase, setIsCheckingSupabase] = useState<boolean>(false);

  // Multi-Selection State for Batch Operations
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);

  // Single Delete Confirmation State
  const [deleteConfirmExam, setDeleteConfirmExam] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Duplication Modal State
  const [duplicatingExam, setDuplicatingExam] = useState<Exam | null>(null);
  const [duplicateTargetClassIds, setDuplicateTargetClassIds] = useState<string[]>([]);
  const [isDuplicating, setIsDuplicating] = useState<boolean>(false);

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Partial<Exam> | null>(null);
  const [isAutoGeneratorModalOpen, setIsAutoGeneratorModalOpen] = useState(false);
  const [isMasterPrintModalOpen, setIsMasterPrintModalOpen] = useState(false);
  const [isDailyPresenceModalOpen, setIsDailyPresenceModalOpen] = useState(false);
  const [isSessionSettingsModalOpen, setIsSessionSettingsModalOpen] = useState(false);
  const [sessionPresets, setSessionPresets] = useState<ExamSessionPreset[]>(() => getSessionPresets());
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Background stale detector for Supabase lms_exams
  const checkSupabaseStale = async () => {
    setIsCheckingSupabase(true);
    try {
      const res = await fetchRawSupabaseExams();
      if (res.success && Array.isArray(res.data)) {
        setSupabaseRawRows(res.data);
        const activeIds = new Set((currentExams || []).map(e => String(e.ID).trim()));
        const stale = res.data.filter(r => !activeIds.has(String(r.ID || r.id).trim()));
        setSupabaseStaleCount(stale.length);
        if (stale.length > 0) {
          addDiagnosticLog('WARN', 'SYNC', `Deteksi Sinkronisasi: Terdapat ${stale.length} rekaman di Supabase 'lms_exams' yang tidak ada di daftar jadwal aktif (stale/hantu).`, {
            staleCount: stale.length,
            staleIds: stale.map(s => s.ID || s.id)
          });
        }
      }
    } catch (err: any) {
      // Non-blocking background check
    } finally {
      setIsCheckingSupabase(false);
    }
  };

  useEffect(() => {
    checkSupabaseStale();
  }, [currentExams.length]);

  // Modal DOM References for Auto-Scroll to Top
  const modalBackdropRef = useRef<HTMLDivElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  // Reset Attempts Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetSelectedExamId, setResetSelectedExamId] = useState<string>('');
  const [examAttemptDetails, setExamAttemptDetails] = useState<any[]>([]);
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);
  const [isPerformingReset, setIsPerformingReset] = useState(false);

  // Form State for Add/Edit
  const [formExam, setFormExam] = useState<{
    id: string;
    title: string;
    subjectId: string;
    classId: string;
    targetClassIds: string[];
    isMultiClass: boolean;
    isCustomAssessment: boolean;
    customAssessmentName: string;
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
    useToken: boolean;
    token: string;
    attendanceMode: 'STRICT_SCHOOL' | 'ALLOW_REMOTE';
    absentPolicy: 'AUTO_MAKEUP' | 'ALLOW_WITH_PERMIT';
    questionBankId: string;
    questionSelectionMode: 'ALL' | 'RANDOM' | 'MANUAL';
    questionCount: number;
    selectedQuestionIds: string[];
  }>({
    id: '',
    title: '',
    subjectId: safeSubjects[0]?.ID || '',
    classId: safeClasses[0]?.ID || 'ALL',
    targetClassIds: [safeClasses[0]?.ID || 'ALL'],
    isMultiClass: false,
    isCustomAssessment: false,
    customAssessmentName: '',
    assessmentTypeId: safeAssessmentTypes[0]?.ID || 'SAS',
    examDate: new Date().toISOString().split('T')[0],
    startTime: '07:30',
    durationMin: 90,
    room: 'Ruang 01',
    session: 'Sesi 1 (07:30 - 09:00)',
    supervisor: MA_CIKARAMAS_TEACHERS[0]?.name || '',
    status: 'ACTIVE',
    randomize: true,
    maxViolations: 3,
    useToken: false,
    token: '',
    attendanceMode: 'STRICT_SCHOOL',
    absentPolicy: 'AUTO_MAKEUP',
    questionBankId: '',
    questionSelectionMode: 'ALL',
    questionCount: 0,
    selectedQuestionIds: []
  });

  // Question Store & Picker State
  const [storedQuestions, setStoredQuestions] = useState<Question[]>(() => {
    return getStorage<Question[]>(STORAGE_KEYS.QUESTIONS, []);
  });
  const [isQuestionPickerModalOpen, setIsQuestionPickerModalOpen] = useState(false);
  const [questionSearchQuery, setQuestionSearchQuery] = useState('');
  const [questionTypeFilter, setQuestionTypeFilter] = useState('ALL');

  useEffect(() => {
    setStoredQuestions(getStorage<Question[]>(STORAGE_KEYS.QUESTIONS, []));
    const unsub = subscribeToStorageChange((key, data) => {
      if (key === STORAGE_KEYS.QUESTIONS && Array.isArray(data)) {
        setStoredQuestions(data);
      }
    });
    return () => unsub();
  }, [isAddEditModalOpen, currentExams]);

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
    targetClassIds: safeClasses.map(c => c.ID),
    startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
    daysCount: 6,
    sessionsPerDay: 2,
    defaultDuration: 90,
    roomPrefix: 'Ruang'
  });

  // Sync classes to AutoGenerator config when classes load
  useEffect(() => {
    if (safeClasses.length > 0 && genConfig.targetClassIds.length === 0) {
      setGenConfig(prev => ({
        ...prev,
        targetClassIds: safeClasses.map(c => c.ID)
      }));
    }
  }, [safeClasses]);

  // Lookup maps
  const classMap = useMemo(() => new Map(safeClasses.map(c => [c.ID, c.NAME])), [safeClasses]);
  const subjectMap = useMemo(() => new Map(safeSubjects.map(s => [s.ID, s.NAME])), [safeSubjects]);
  const assessmentMap = useMemo(() => new Map(safeAssessmentTypes.map(a => [a.ID, a.NAME])), [safeAssessmentTypes]);
  const [settings, setSettings] = useState<SchoolSettings>(() => getLocalSchoolSettings());

  useEffect(() => {
    getSchoolSettings().then((s) => {
      if (s) setSettings(s);
    }).catch(() => {});
  }, []);

  // Filtered Exams (Respecting both single CLASS_ID and multi-class CLASS_IDS)
  const filteredExams = useMemo(() => {
    return safeExams.filter(e => {
      if (selectedAssessmentFilter !== 'ALL' && e.ASSESSMENT_TYPE_ID !== selectedAssessmentFilter) {
        return false;
      }
      if (selectedClassFilter !== 'ALL') {
        const matchesSingle = e.CLASS_ID === selectedClassFilter || e.CLASS_ID === 'ALL';
        const matchesMulti = Array.isArray(e.CLASS_IDS) && (e.CLASS_IDS.includes(selectedClassFilter) || e.CLASS_IDS.includes('ALL'));
        if (!matchesSingle && !matchesMulti) {
          return false;
        }
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
  }, [safeExams, selectedAssessmentFilter, selectedClassFilter, selectedStatusFilter, searchQuery, subjectMap, classMap]);

  // Grouped by Date for Matrix View
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Exam[]> = {};
    filteredExams.forEach(e => {
      const dateKey = e.EXAM_DATE || 'Tanpa Tanggal';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(e);
    });

    // Sort dates ascending
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredExams]);

  // Grouped by Class for "Tabel Per Kelas" View
  const groupedByClass = useMemo(() => {
    const groups: Record<string, Exam[]> = {};
    safeClasses.forEach(cls => {
      groups[cls.ID] = [];
    });

    filteredExams.forEach(e => {
      if (e.CLASS_ID === 'ALL') {
        safeClasses.forEach(cls => {
          if (!groups[cls.ID]) groups[cls.ID] = [];
          groups[cls.ID].push(e);
        });
      } else if (Array.isArray(e.CLASS_IDS) && e.CLASS_IDS.length > 0) {
        e.CLASS_IDS.forEach(clsId => {
          if (!groups[clsId]) groups[clsId] = [];
          groups[clsId].push(e);
        });
      } else {
        const clsId = e.CLASS_ID || 'UNASSIGNED';
        if (!groups[clsId]) groups[clsId] = [];
        groups[clsId].push(e);
      }
    });

    return Object.entries(groups)
      .filter(([_, list]) => list.length > 0)
      .sort(([aKey], [bKey]) => {
        const nameA = classMap.get(aKey) || aKey;
        const nameB = classMap.get(bKey) || bKey;
        return nameA.localeCompare(nameB);
      });
  }, [filteredExams, safeClasses, classMap]);

  // KPI counts
  const stats = useMemo(() => {
    const total = safeExams.length;
    const active = safeExams.filter(e => e.STATUS === 'ACTIVE').length;
    const draft = safeExams.filter(e => e.STATUS === 'DRAFT' || e.STATUS === 'SCHEDULED').length;
    const completed = safeExams.filter(e => e.STATUS === 'FINISHED').length;
    return { total, active, draft, completed };
  }, [safeExams]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  // Quick Status Toggle Handler
  const handleStatusChange = async (exam: Exam, newStatus: ExamStatus) => {
    if (!canManageExam(exam)) {
      showNotification('error', 'Anda tidak memiliki hak akses untuk mengubah status jadwal ujian ini.');
      return;
    }
    try {
      const updated: Exam = { ...exam, STATUS: newStatus };
      setCurrentExams(prev => prev.map(e => e.ID === exam.ID ? updated : e));
      if (onSave) {
        await onSave(updated);
      } else {
        await saveEntity(token, 'EXAMS', updated);
      }
      const label = newStatus === 'ACTIVE' ? 'Aktif' : newStatus === 'FINISHED' ? 'Selesai' : 'Terjadwal';
      showNotification('success', `Status "${exam.TITLE}" diubah menjadi ${label}.`);
      if (onRefreshData) await Promise.resolve(onRefreshData());
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal mengubah status jadwal ujian.');
    }
  };

  // Multi-selection handlers
  const handleToggleSelectAll = () => {
    if (selectedExamIds.length === filteredExams.length) {
      setSelectedExamIds([]);
    } else {
      setSelectedExamIds(filteredExams.map(e => e.ID));
    }
  };

  const handleToggleSelectRow = (examId: string) => {
    setSelectedExamIds(prev => 
      prev.includes(examId) ? prev.filter(id => id !== examId) : [...prev, examId]
    );
  };

  // Bulk Status Update
  const handleBulkStatusChange = async (targetStatus: ExamStatus) => {
    if (selectedExamIds.length === 0) return;
    try {
      const targets = safeExams.filter(e => selectedExamIds.includes(e.ID));
      const updatedList = targets.map(e => ({ ...e, STATUS: targetStatus }));
      const idSet = new Set(selectedExamIds);
      setCurrentExams(prev => prev.map(e => idSet.has(e.ID) ? { ...e, STATUS: targetStatus } : e));
      await bulkSaveExams(token, updatedList);
      const label = targetStatus === 'ACTIVE' ? 'Aktif' : targetStatus === 'FINISHED' ? 'Selesai' : 'Terjadwal';
      showNotification('success', `Berhasil mengubah ${updatedList.length} jadwal menjadi ${label}!`);
      setSelectedExamIds([]);
      if (onRefreshData) await Promise.resolve(onRefreshData());
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal mengubah status massal.');
    }
  };

  // Bulk Delete
  const handleConfirmBulkDelete = async () => {
    if (selectedExamIds.length === 0) return;
    setIsBulkDeleting(true);
    const idsToDelete = [...selectedExamIds];
    const idSet = new Set(idsToDelete);
    setCurrentExams(prev => prev.filter(e => !idSet.has(e.ID)));
    setSelectedExamIds([]);
    setIsBulkDeleteModalOpen(false);

    try {
      addDiagnosticLog('INFO', 'DELETE', `Menghapus massal ${idsToDelete.length} jadwal ujian terpilih: [${idsToDelete.join(', ')}]...`);
      if (onDelete) {
        await onDelete(idsToDelete);
      } else {
        await deleteEntities(token, 'EXAMS', idsToDelete);
      }
      showNotification('success', `Berhasil menghapus ${idsToDelete.length} jadwal ujian terpilih.`);
      if (onRefreshData) await Promise.resolve(onRefreshData());
      await checkSupabaseStale();
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal menghapus jadwal terpilih.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleOpenAdd = (defaultDate?: string) => {
    if (!canManageExam()) {
      showNotification('error', 'Anda tidak memiliki hak akses untuk menambah jadwal ujian.');
      return;
    }
    setEditingExam(null);
    const chosenSubject = safeSubjects[0]?.ID || '';
    const chosenClass = safeClasses[0]?.ID || 'ALL';
    const chosenAssessment = safeAssessmentTypes[0]?.ID || 'SAS';
    const chosenDate = defaultDate && defaultDate !== 'Tanpa Tanggal' ? defaultDate : new Date().toISOString().split('T')[0];

    setFormExam({
      id: `EXAM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      title: '',
      subjectId: chosenSubject,
      classId: chosenClass,
      targetClassIds: [chosenClass],
      isMultiClass: true,
      isCustomAssessment: false,
      customAssessmentName: '',
      assessmentTypeId: chosenAssessment,
      examDate: chosenDate,
      startTime: '07:30',
      durationMin: 90,
      room: 'Ruang 01',
      session: 'Sesi 1 (07:30 - 09:00)',
      supervisor: MA_CIKARAMAS_TEACHERS[0]?.name || '',
      status: 'ACTIVE',
      randomize: true,
      maxViolations: 3,
      useToken: false,
      token: '',
      attendanceMode: 'STRICT_SCHOOL',
      absentPolicy: 'AUTO_MAKEUP',
      questionBankId: '',
      questionSelectionMode: 'ALL',
      questionCount: 0,
      selectedQuestionIds: []
    });
    setIsAddEditModalOpen(true);
    setTimeout(() => {
      if (modalBackdropRef.current) modalBackdropRef.current.scrollTop = 0;
      if (modalBodyRef.current) modalBodyRef.current.scrollTop = 0;
    }, 20);
  };

  const handleOpenEdit = (exam: Exam) => {
    if (!canManageExam(exam)) {
      if (onNavigateToQuestions) {
        onNavigateToQuestions();
      } else {
        showNotification('error', 'Pengaturan sesi jadwal ujian dikelola oleh Administrator / Guru Pengampu.');
      }
      return;
    }
    setEditingExam(exam);
    const existingClassIds = Array.isArray(exam.CLASS_IDS) && exam.CLASS_IDS.length > 0
      ? exam.CLASS_IDS
      : [exam.CLASS_ID || safeClasses[0]?.ID || 'ALL'];

    setFormExam({
      id: exam.ID,
      title: exam.TITLE || '',
      subjectId: exam.SUBJECT_ID || safeSubjects[0]?.ID || '',
      classId: exam.CLASS_ID || safeClasses[0]?.ID || 'ALL',
      targetClassIds: existingClassIds,
      isMultiClass: existingClassIds.length > 1,
      isCustomAssessment: false,
      customAssessmentName: '',
      assessmentTypeId: exam.ASSESSMENT_TYPE_ID || safeAssessmentTypes[0]?.ID || 'SAS',
      examDate: exam.EXAM_DATE || new Date().toISOString().split('T')[0],
      startTime: exam.START_TIME || '07:30',
      durationMin: exam.DURATION_MIN || 90,
      room: exam.ROOM || 'Ruang 01',
      session: exam.SESSION || 'Sesi 1',
      supervisor: exam.SUPERVISOR || '',
      status: exam.STATUS || 'ACTIVE',
      randomize: exam.RANDOMIZE !== false,
      maxViolations: exam.MAX_VIOLATIONS || 3,
      useToken: Boolean(exam.USE_TOKEN),
      token: exam.TOKEN || '',
      attendanceMode: exam.ATTENDANCE_MODE || 'STRICT_SCHOOL',
      absentPolicy: exam.ABSENT_POLICY || 'AUTO_MAKEUP',
      questionBankId: exam.QUESTION_BANK_ID || '',
      questionSelectionMode: exam.QUESTION_SELECTION_MODE || 'ALL',
      questionCount: exam.QUESTION_COUNT || 0,
      selectedQuestionIds: Array.isArray(exam.SELECTED_QUESTION_IDS) ? exam.SELECTED_QUESTION_IDS : []
    });
    setIsAddEditModalOpen(true);
    setTimeout(() => {
      if (modalBackdropRef.current) modalBackdropRef.current.scrollTop = 0;
      if (modalBodyRef.current) modalBodyRef.current.scrollTop = 0;
    }, 20);
  };

  // Reset Attempts Handlers
  const handleOpenResetModal = async (exam?: Exam) => {
    const targetExamId = exam?.ID || resetSelectedExamId || currentExams[0]?.ID || '';
    setResetSelectedExamId(targetExamId);
    setIsResetModalOpen(true);
    if (targetExamId) {
      await loadExamAttempts(targetExamId);
    }
  };

  const loadExamAttempts = async (examId: string) => {
    setIsLoadingAttempts(true);
    try {
      const attempts = await getAttemptsForExam(token, examId);
      setExamAttemptDetails(attempts || []);
    } catch (err) {
      console.error('Failed to load attempts for exam:', err);
    } finally {
      setIsLoadingAttempts(false);
    }
  };

  const handleResetAllForCurrentExam = async () => {
    if (!resetSelectedExamId) return;
    setIsPerformingReset(true);
    try {
      const res = await resetAllStudentAttemptsForExam(token, resetSelectedExamId);
      showNotification('success', res.message || 'Semua sesi siswa pada ujian ini berhasil di-reset.');
      await loadExamAttempts(resetSelectedExamId);
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal mereset sesi siswa.');
    } finally {
      setIsPerformingReset(false);
    }
  };

  const handleResetSingleAttempt = async (attemptId: string, studentName: string) => {
    setIsPerformingReset(true);
    try {
      await resetStudentAttempt(token, attemptId);
      showNotification('success', `Sesi untuk ${studentName} berhasil di-reset. Kunci layar dibuka.`);
      if (resetSelectedExamId) {
        await loadExamAttempts(resetSelectedExamId);
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal mereset sesi siswa.');
    } finally {
      setIsPerformingReset(false);
    }
  };

  const handleSaveForm = async () => {
    if (!canManageExam(editingExam)) {
      showNotification('error', 'Anda tidak memiliki hak akses untuk menyimpan jadwal ujian ini.');
      return;
    }

    try {
      // Calculate end time
      let endTime = '';
      if (formExam.startTime && formExam.durationMin) {
        const [h, m] = formExam.startTime.split(':').map(Number);
        const totalMinutes = (h || 0) * 60 + (m || 0) + Number(formExam.durationMin || 90);
        const endH = Math.floor(totalMinutes / 60) % 24;
        const endM = totalMinutes % 60;
        endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      }

      // Assessment Type Handling (Preset or Manual Custom)
      let targetAssessmentId = formExam.assessmentTypeId;
      let asTypeName = assessmentMap.get(targetAssessmentId) || 'Ujian';

      if (formExam.isCustomAssessment && formExam.customAssessmentName.trim()) {
        const customName = formExam.customAssessmentName.trim();
        targetAssessmentId = `AS-${customName.replace(/\s+/g, '-').toUpperCase()}`;
        asTypeName = customName;
        // Also register into assessment types if not exists
        try {
          const newAsType: AssessmentType = {
            ID: targetAssessmentId,
            NAME: customName,
            CODE: customName.slice(0, 6).toUpperCase(),
            DESCRIPTION: 'Jenis Penilaian Kustom Manual Guru/Admin',
            CURRICULUM: 'ALL',
            CATEGORY: 'SUMATIF',
            ACTIVE: true
          };
          await saveEntity(token, 'ASSESSMENT_TYPES', newAsType);
        } catch {
          // ignore
        }
      }

      const targetSubjectId = formExam.subjectId || safeSubjects[0]?.ID || 'MP-001';
      const subName = subjectMap.get(targetSubjectId) || 'Mapel';

      // Multiple Classes Selection Handling
      const selectedClassIds = formExam.isMultiClass && formExam.targetClassIds.length > 0
        ? formExam.targetClassIds
        : [formExam.classId || 'ALL'];

      // If editing an existing exam
      if (editingExam && editingExam.ID) {
        const primaryClassId = selectedClassIds[0] || formExam.classId || 'ALL';
        const clsName = primaryClassId === 'ALL' ? 'Semua Kelas' : (classMap.get(primaryClassId) || primaryClassId);
        const computedTitle = formExam.title.trim() || `${asTypeName} ${subName} - ${clsName}`;

        const payload: Exam = {
          ...editingExam,
          ID: editingExam.ID,
          TITLE: computedTitle,
          SUBJECT_ID: targetSubjectId,
          CLASS_ID: primaryClassId,
          CLASS_IDS: selectedClassIds,
          ASSESSMENT_TYPE_ID: targetAssessmentId,
          EXAM_DATE: formExam.examDate || new Date().toISOString().split('T')[0],
          START_TIME: formExam.startTime || '07:30',
          END_TIME: endTime,
          DURATION_MIN: Number(formExam.durationMin) || 90,
          ROOM: formExam.room || 'Ruang 01',
          SESSION: formExam.session || 'Sesi 1',
          SUPERVISOR: formExam.supervisor || '',
          STATUS: formExam.status || 'ACTIVE',
          RANDOMIZE: formExam.randomize !== false,
          MAX_VIOLATIONS: Number(formExam.maxViolations) || 3,
          USE_TOKEN: Boolean(formExam.useToken),
          TOKEN: formExam.useToken ? String(formExam.token || '').trim().toUpperCase() : '',
          ATTENDANCE_MODE: formExam.attendanceMode || 'STRICT_SCHOOL',
          ABSENT_POLICY: formExam.absentPolicy || 'AUTO_MAKEUP',
          QUESTION_BANK_ID: formExam.questionBankId || undefined,
          QUESTION_SELECTION_MODE: formExam.questionSelectionMode || 'ALL',
          QUESTION_COUNT: Number(formExam.questionCount) > 0 ? Number(formExam.questionCount) : undefined,
          SELECTED_QUESTION_IDS: formExam.selectedQuestionIds.length > 0 ? formExam.selectedQuestionIds : undefined,
          CREATED_BY: editingExam.CREATED_BY || currentUser?.USERNAME || 'ADMIN',
          CREATED_AT: editingExam.CREATED_AT || new Date().toISOString()
        };

        // If user selected additional classes during edit, create separate schedule records for each extra class
        const additionalExams: Exam[] = [];
        if (formExam.isMultiClass && selectedClassIds.length > 1) {
          selectedClassIds.slice(1).forEach(extraClassId => {
            const extraClsName = extraClassId === 'ALL' ? 'Semua Kelas' : (classMap.get(extraClassId) || extraClassId);
            const extraTitle = formExam.title.trim()
              ? `${formExam.title.trim()} (${extraClsName})`
              : `${asTypeName} ${subName} - ${extraClsName}`;

            additionalExams.push({
              ...payload,
              ID: `EXAM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
              TITLE: extraTitle,
              CLASS_ID: extraClassId,
              CLASS_IDS: [extraClassId],
              CREATED_AT: new Date().toISOString()
            });
          });
        }

        const allToSave = [payload, ...additionalExams];
        setCurrentExams(prev => {
          const map = new Map(prev.map(e => [e.ID, e]));
          allToSave.forEach(e => map.set(e.ID, e));
          return Array.from(map.values());
        });
        setIsAddEditModalOpen(false);
        showNotification('success', `Jadwal ujian berhasil diperbarui${additionalExams.length > 0 ? ` dan didistribusikan ke ${allToSave.length} rombel kelas` : ''}!`);

        await bulkSaveExams(token, allToSave);
        if (onRefreshData) await Promise.resolve(onRefreshData());
        return;
      }

      // If creating a NEW exam with multiple classes:
      // Create an individual schedule item for each class so it appears in that class's schedule!
      if (formExam.isMultiClass && selectedClassIds.length > 1) {
        const newExamsList: Exam[] = selectedClassIds.map(targetClassId => {
          const clsName = targetClassId === 'ALL' ? 'Semua Kelas' : (classMap.get(targetClassId) || targetClassId);
          const computedTitle = formExam.title.trim()
            ? `${formExam.title.trim()} (${clsName})`
            : `${asTypeName} ${subName} - ${clsName}`;

          return {
            ID: `EXAM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
            TITLE: computedTitle,
            SUBJECT_ID: targetSubjectId,
            CLASS_ID: targetClassId,
            CLASS_IDS: [targetClassId],
            ASSESSMENT_TYPE_ID: targetAssessmentId,
            EXAM_DATE: formExam.examDate || new Date().toISOString().split('T')[0],
            START_TIME: formExam.startTime || '07:30',
            END_TIME: endTime,
            DURATION_MIN: Number(formExam.durationMin) || 90,
            ROOM: formExam.room || 'Ruang 01',
            SESSION: formExam.session || 'Sesi 1',
            SUPERVISOR: formExam.supervisor || '',
            STATUS: formExam.status || 'ACTIVE',
            RANDOMIZE: formExam.randomize !== false,
            MAX_VIOLATIONS: Number(formExam.maxViolations) || 3,
            USE_TOKEN: Boolean(formExam.useToken),
            TOKEN: formExam.useToken ? String(formExam.token || '').trim().toUpperCase() : '',
            ATTENDANCE_MODE: formExam.attendanceMode || 'STRICT_SCHOOL',
            ABSENT_POLICY: formExam.absentPolicy || 'AUTO_MAKEUP',
            QUESTION_BANK_ID: formExam.questionBankId || undefined,
            QUESTION_SELECTION_MODE: formExam.questionSelectionMode || 'ALL',
            QUESTION_COUNT: Number(formExam.questionCount) > 0 ? Number(formExam.questionCount) : undefined,
            SELECTED_QUESTION_IDS: formExam.selectedQuestionIds.length > 0 ? formExam.selectedQuestionIds : undefined,
            CREATED_BY: currentUser?.ID || 'ADMIN',
            CREATED_AT: new Date().toISOString()
          };
        });

        setCurrentExams(prev => [...newExamsList, ...prev]);
        setIsAddEditModalOpen(false);
        showNotification('success', `Berhasil membuat jadwal serentak untuk ${newExamsList.length} rombel/kelas sasaran!`);

        await bulkSaveExams(token, newExamsList);
        if (onRefreshData) await Promise.resolve(onRefreshData());
        return;
      }

      // Single class creation
      const targetClassId = selectedClassIds[0] || 'ALL';
      const clsName = targetClassId === 'ALL' ? 'Semua Kelas' : (classMap.get(targetClassId) || targetClassId);
      const computedTitle = formExam.title.trim() || `${asTypeName} ${subName} - ${clsName}`;

      const payload: Exam = {
        ID: `EXAM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        TITLE: computedTitle,
        SUBJECT_ID: targetSubjectId,
        CLASS_ID: targetClassId,
        CLASS_IDS: [targetClassId],
        ASSESSMENT_TYPE_ID: targetAssessmentId,
        EXAM_DATE: formExam.examDate || new Date().toISOString().split('T')[0],
        START_TIME: formExam.startTime || '07:30',
        END_TIME: endTime,
        DURATION_MIN: Number(formExam.durationMin) || 90,
        ROOM: formExam.room || 'Ruang 01',
        SESSION: formExam.session || 'Sesi 1',
        SUPERVISOR: formExam.supervisor || '',
        STATUS: formExam.status || 'ACTIVE',
        RANDOMIZE: formExam.randomize !== false,
        MAX_VIOLATIONS: Number(formExam.maxViolations) || 3,
        USE_TOKEN: Boolean(formExam.useToken),
        TOKEN: formExam.useToken ? String(formExam.token || '').trim().toUpperCase() : '',
        ATTENDANCE_MODE: formExam.attendanceMode || 'STRICT_SCHOOL',
        ABSENT_POLICY: formExam.absentPolicy || 'AUTO_MAKEUP',
        QUESTION_BANK_ID: formExam.questionBankId || undefined,
        QUESTION_SELECTION_MODE: formExam.questionSelectionMode || 'ALL',
        QUESTION_COUNT: Number(formExam.questionCount) > 0 ? Number(formExam.questionCount) : undefined,
        SELECTED_QUESTION_IDS: formExam.selectedQuestionIds.length > 0 ? formExam.selectedQuestionIds : undefined,
        CREATED_BY: currentUser?.ID || 'ADMIN',
        CREATED_AT: new Date().toISOString()
      };

      setCurrentExams(prev => [payload, ...prev]);
      setIsAddEditModalOpen(false);
      showNotification('success', `Jadwal ujian "${payload.TITLE}" berhasil disimpan!`);

      if (onSave) {
        await onSave(payload);
      } else {
        await saveEntity(token, 'EXAMS', payload);
      }
      if (onRefreshData) await Promise.resolve(onRefreshData());
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal menyimpan jadwal ujian.');
    }
  };

  const handleRequestDelete = (examId: string, title: string) => {
    const target = safeExams.find(e => e.ID === examId);
    if (!canManageExam(target)) {
      showNotification('error', 'Anda tidak memiliki hak akses untuk menghapus jadwal ujian ini.');
      return;
    }
    setDeleteConfirmExam({ id: examId, title });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmExam) return;
    setIsDeleting(true);
    const idToDelete = deleteConfirmExam.id;
    const titleToDelete = deleteConfirmExam.title;
    setCurrentExams(prev => prev.filter(e => e.ID !== idToDelete));
    setDeleteConfirmExam(null);
    showNotification('success', `Jadwal ujian "${titleToDelete}" berhasil dihapus.`);

    try {
      addDiagnosticLog('INFO', 'DELETE', `Menghapus jadwal ujian "${titleToDelete}" (ID: '${idToDelete}') dari manajer jadwal...`);
      if (onDelete) {
        await onDelete(idToDelete);
      } else {
        await deleteEntity(token, 'EXAMS', idToDelete);
      }
      if (onRefreshData) await Promise.resolve(onRefreshData());
      await checkSupabaseStale();
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal menghapus jadwal ujian.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Clean Duplication Modal
  const handleOpenDuplicateModal = (exam: Exam) => {
    if (!canManageExam(exam)) {
      showNotification('error', 'Anda tidak memiliki hak akses untuk menduplikasi jadwal ujian ini.');
      return;
    }
    setDuplicatingExam(exam);
    // Exclude current exam's class
    setDuplicateTargetClassIds([]);
  };

  // Execute Duplication to Multiple Classes
  const handleConfirmDuplicate = async () => {
    if (!duplicatingExam || duplicateTargetClassIds.length === 0) {
      showNotification('error', 'Silakan pilih minimal 1 kelas target duplikasi.');
      return;
    }
    setIsDuplicating(true);
    try {
      const subName = subjectMap.get(duplicatingExam.SUBJECT_ID) || 'Mapel';
      const asTypeName = assessmentMap.get(duplicatingExam.ASSESSMENT_TYPE_ID) || 'Asesmen';

      const duplicatedList: Exam[] = duplicateTargetClassIds.map(targetClassId => {
        const targetClassName = classMap.get(targetClassId) || targetClassId;
        const newExamId = `EXAM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

        return {
          ...duplicatingExam,
          ID: newExamId,
          TITLE: `${asTypeName} ${subName} - ${targetClassName}`,
          CLASS_ID: targetClassId,
          CREATED_BY: currentUser?.ID || 'ADMIN',
          CREATED_AT: new Date().toISOString()
        };
      });

      setCurrentExams(prev => [...duplicatedList, ...prev]);
      setDuplicatingExam(null);
      setDuplicateTargetClassIds([]);
      showNotification('success', `Berhasil menduplikasi jadwal ke ${duplicatedList.length} kelas sasaran!`);

      await bulkSaveExams(token, duplicatedList);
      if (onRefreshData) await Promise.resolve(onRefreshData());
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal menduplikasi jadwal ujian.');
    } finally {
      setIsDuplicating(false);
    }
  };

  // 1-Click Automatic Schedule Generator
  const handleRunAutoGenerator = async () => {
    if (genConfig.targetClassIds.length === 0) {
      showNotification('error', 'Silakan pilih minimal 1 rombel / kelas sasaran.');
      return;
    }

    try {
      const generatedExams: Exam[] = [];
      const sessionTimes = [
        { session: 'Sesi 1', start: '07:30', duration: genConfig.defaultDuration, end: '09:00' },
        { session: 'Sesi 2', start: '09:30', duration: genConfig.defaultDuration, end: '11:00' },
        { session: 'Sesi 3', start: '13:00', duration: genConfig.defaultDuration, end: '14:30' }
      ];

      const teachersList = MA_CIKARAMAS_TEACHERS.map(t => t.name);

      // Safe local date parsing
      const parts = genConfig.startDate.split('-');
      const startYear = parseInt(parts[0], 10);
      const startMonth = parseInt(parts[1], 10) - 1;
      const startDay = parseInt(parts[2], 10);

      let examIndex = 1;
      let dayOffset = 0;

      for (let day = 0; day < genConfig.daysCount; day++) {
        const currentDate = new Date(startYear, startMonth, startDay + dayOffset);
        
        // Skip Sunday (0)
        if (currentDate.getDay() === 0) {
          dayOffset++;
          currentDate.setDate(currentDate.getDate() + 1);
        }

        const y = currentDate.getFullYear();
        const m = String(currentDate.getMonth() + 1).padStart(2, '0');
        const d = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        for (let sIdx = 0; sIdx < genConfig.sessionsPerDay; sIdx++) {
          const sTime = sessionTimes[sIdx] || sessionTimes[0];

          // For each selected class
          genConfig.targetClassIds.forEach((clsId, cIdx) => {
            const cls = safeClasses.find(c => c.ID === clsId);
            const classSubjects = safeSubjects.filter(sub => !sub.CLASS_ID || sub.CLASS_ID === clsId || sub.CLASS_ID === 'ALL');
            
            const subject = (classSubjects.length > 0)
              ? classSubjects[(day * genConfig.sessionsPerDay + sIdx) % classSubjects.length]
              : safeSubjects[0];
              
            const supervisor = teachersList[(day + sIdx + cIdx) % teachersList.length] || 'Pengawas Ruang';
            const roomNumber = String((cIdx % 8) + 1).padStart(2, '0');
            const roomName = `${genConfig.roomPrefix || 'Ruang'} ${roomNumber}`;

            const asTypeName = assessmentMap.get(genConfig.assessmentTypeId) || genConfig.assessmentTypeId;
            const subName = subject?.NAME || 'Mata Pelajaran';
            const clsName = cls?.NAME || clsId;
            const clsClean = clsName.replace(/[^a-zA-Z0-9]/g, '');

            const examId = `UJN-${genConfig.assessmentTypeId}-${clsClean}-${String(examIndex).padStart(3, '0')}-${Date.now().toString().slice(-4)}`;

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
              CREATED_BY: currentUser?.ID || 'AUTO_GENERATOR',
              CREATED_AT: new Date().toISOString()
            });

            examIndex++;
          });
        }
        dayOffset++;
      }

      setCurrentExams(prev => [...generatedExams, ...prev]);
      setIsAutoGeneratorModalOpen(false);
      showNotification('success', `Berhasil membuat ${generatedExams.length} jadwal ujian otomatis untuk ${genConfig.targetClassIds.length} kelas!`);

      await bulkSaveExams(token, generatedExams);
      if (onRefreshData) await Promise.resolve(onRefreshData());
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal menjalankan generator jadwal.');
    }
  };

  const handlePrintMasterSchedule = () => {
    try {
      window.print();
    } catch (err: any) {
      showNotification('error', 'Fitur cetak otomatis dibatasi dalam mode preview. Anda dapat membuka aplikasi pada tab terpisah untuk mencetak.');
    }
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
            <button
              type="button"
              onClick={() => setIsSupabaseInspectorOpen(prev => !prev)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer border ${
                isSupabaseInspectorOpen
                  ? 'bg-indigo-700 text-white border-indigo-800'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border-indigo-300'
              }`}
              title="Buka Inspektor Data Mentah Supabase (lms_exams), filter data stale/hantu, dan cek log RLS"
            >
              <Database className="w-4 h-4 text-indigo-600" />
              <span>Inspeksi Raw Supabase & Log</span>
              {supabaseStaleCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-mono font-bold animate-pulse">
                  {supabaseStaleCount} Stale
                </span>
              ) : supabaseRawRows.length > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-200 text-indigo-900 font-mono">
                  {supabaseRawRows.length} DB
                </span>
              ) : null}
            </button>

            <button
              onClick={() => setIsDailyPresenceModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Presensi fisik di sekolah, barcode harian & penanganan siswa susulan"
            >
              <QrCode className="w-4 h-4 text-indigo-700" />
              <span>Presensi & Barcode Sekolah</span>
            </button>

            <button
              onClick={() => setIsSessionSettingsModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Atur jam mulai, durasi, dan nama sesi fleksibel"
            >
              <Clock className="w-4 h-4 text-sky-700" />
              <span>Atur Sesi Waktu</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setIsAutoGeneratorModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Buat paket jadwal lengkap 1 semester/pekan otomatis"
              >
                <Sparkles className="w-4 h-4 text-amber-700" />
                <span>Generator Jadwal (1-Klik)</span>
              </button>
            )}

            <button
              onClick={() => setIsMasterPrintModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Cetak format jadwal ujian resmi ber-KOP untuk madrasah"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span>Cetak Master Jadwal</span>
            </button>

            {onNavigateToPrint && (
              <button
                onClick={onNavigateToPrint}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Cetak kartu peserta siswa dengan tabel jadwal otomatis"
              >
                <CreditCard className="w-4 h-4 text-emerald-700" />
                <span>Cetak Kartu Siswa</span>
              </button>
            )}

            {canManageExam() && (
              <button
                type="button"
                onClick={() => handleOpenResetModal()}
                className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Buka menu Reset Sesi Ujian untuk membuka kunci siswa yang terblokir atau waktu habis"
              >
                <RotateCcw className="w-4 h-4 text-amber-700" />
                <span>Reset Sesi Siswa</span>
              </button>
            )}

            {canManageExam() ? (
              <button
                onClick={() => handleOpenAdd()}
                className="px-4 py-2 rounded-xl bg-[#0052CC] hover:bg-[#0047B3] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
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
                <span>Bank Soal (Kelola Soal)</span>
              </button>
            ) : null}
          </div>
        </div>

        {!isAdmin && (
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 text-xs text-blue-900">
              <span className="px-2 py-0.5 rounded-md bg-[#0052CC] text-white shrink-0 font-bold text-[10px] tracking-wider uppercase">
                Akses Pengajar
              </span>
              <span>
                Anda dapat menambah, mengedit, atau menduplikasi jadwal ujian untuk mata pelajaran yang Anda ampu, serta menyusun butir soal pada <b>Bank Soal</b>.
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
              {safeAssessmentTypes.map(as => (
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
              {safeClasses.map(c => (
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'TABLE_GROUPED'
                  ? 'bg-white text-[#0052CC] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Tabel Per Hari</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE_BY_CLASS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'TABLE_BY_CLASS'
                  ? 'bg-white text-[#0052CC] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Tabel Per Kelas</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE_ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'CARDS'
                  ? 'bg-white text-[#0052CC] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Model Kartu</span>
            </button>
            <button
              onClick={() => {
                setViewMode('RAW_SUPABASE');
                setIsSupabaseInspectorOpen(true);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'RAW_SUPABASE'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-800 hover:text-indigo-950 hover:bg-indigo-50'
              }`}
              title="Tampilkan data mentah tabel EXAMS di Supabase dan identifikasi entri stale"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Raw Supabase</span>
              {supabaseStaleCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-mono font-bold">
                  {supabaseStaleCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* QUICK CLASS PILL TABS */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[11px] font-bold text-slate-500 shrink-0 mr-1 flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5 text-[#0052CC]" />
            <span>Golongan Rombel:</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedClassFilter('ALL');
              if (viewMode !== 'TABLE_BY_CLASS') setViewMode('TABLE_BY_CLASS');
            }}
            className={`shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedClassFilter === 'ALL'
                ? 'bg-[#0052CC] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semua Rombel ({safeExams.length})
          </button>
          {safeClasses.map(c => {
            const count = safeExams.filter(e => e.CLASS_ID === c.ID || (Array.isArray(e.CLASS_IDS) && e.CLASS_IDS.includes(c.ID))).length;
            const isSelected = selectedClassFilter === c.ID;
            return (
              <button
                key={c.ID}
                type="button"
                onClick={() => {
                  setSelectedClassFilter(c.ID);
                  if (viewMode !== 'TABLE_BY_CLASS') setViewMode('TABLE_BY_CLASS');
                }}
                className={`shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#0052CC] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Kelas {c.NAME}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* BATCH ACTION BAR (WHEN ITEMS ARE SELECTED) */}
      {selectedExamIds.length > 0 && (
        <div className="no-print bg-[#0052CC] text-white p-3 sm:p-4 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full bg-white/20 font-bold text-xs">
              {selectedExamIds.length} Jadwal Dipilih
            </span>
            <span className="text-xs text-blue-100 hidden sm:inline">
              Aksi massal untuk jadwal ujian terpilih:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkStatusChange('ACTIVE')}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Aktifkan ({selectedExamIds.length})</span>
            </button>
            <button
              onClick={() => handleBulkStatusChange('SCHEDULED')}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Tandai Terjadwal</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Terpilih</span>
              </button>
            )}
            <button
              onClick={() => setSelectedExamIds([])}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Batal Pilih
            </button>
          </div>
        </div>
      )}

      {/* STALE SUPABASE EXAMS ALERT BANNER */}
      {supabaseStaleCount > 0 && !isSupabaseInspectorOpen && viewMode !== 'RAW_SUPABASE' && (
        <div className="p-3.5 bg-rose-50/90 border border-rose-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-950 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">
                Terdeteksi {supabaseStaleCount} Rekaman Jadwal Ujian Tertinggal (Stale/Ghost) di Supabase Cloud!
              </span>
              <p className="text-[11px] text-rose-800 mt-0.5">
                Rekaman ini masih tersimpan di cloud Supabase meskipun sudah dihapus secara lokal, yang menyebabkan jadwal lama kembali muncul saat refresh. Periksa status RLS atau bersihkan melalui Inspektor.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsSupabaseInspectorOpen(true);
              setViewMode('RAW_SUPABASE');
            }}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Buka Inspektor Raw & Bersihkan</span>
          </button>
        </div>
      )}

      {/* RAW SUPABASE INSPECTOR EXPANDABLE PANEL (IF TOGGLED IN REGULAR VIEWS) */}
      {isSupabaseInspectorOpen && viewMode !== 'RAW_SUPABASE' && (
        <div className="mb-6">
          <SupabaseRawExamsInspector
            token={token}
            activeExams={currentExams}
            onRefreshParentData={async () => {
              if (onRefreshData) {
                await Promise.resolve(onRefreshData());
              }
              await checkSupabaseStale();
            }}
            onClose={() => setIsSupabaseInspectorOpen(false)}
          />
        </div>
      )}

      {/* CONTENT AREA: RAW SUPABASE (FULL VIEW), TABLE PER HARI (DEFAULT), TABEL SEMUA, OR MODEL KARTU */}
      {viewMode === 'RAW_SUPABASE' ? (
        <div className="mb-6">
          <SupabaseRawExamsInspector
            token={token}
            activeExams={currentExams}
            onRefreshParentData={async () => {
              if (onRefreshData) {
                await Promise.resolve(onRefreshData());
              }
              await checkSupabaseStale();
            }}
            onClose={() => {
              setIsSupabaseInspectorOpen(false);
              setViewMode('TABLE_BY_CLASS');
            }}
          />
        </div>
      ) : viewMode === 'TABLE_GROUPED' ? (
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
                      {formatSafeDate(dateStr)}
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

                  {canManageExam() && (
                    <button
                      onClick={() => handleOpenAdd(dateStr)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-[11px] font-semibold text-slate-700 hover:text-[#0052CC] flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah di Hari Ini</span>
                    </button>
                  )}
                </div>
              </div>

              {/* TABLE OF EXAMS FOR THIS DAY */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={dateExams.length > 0 && dateExams.every(e => selectedExamIds.includes(e.ID))}
                          onChange={() => {
                            const allDaySelected = dateExams.every(e => selectedExamIds.includes(e.ID));
                            if (allDaySelected) {
                              const dayIds = new Set(dateExams.map(e => e.ID));
                              setSelectedExamIds(prev => prev.filter(id => !dayIds.has(id)));
                            } else {
                              const newIds = new Set([...selectedExamIds, ...dateExams.map(e => e.ID)]);
                              setSelectedExamIds(Array.from(newIds));
                            }
                          }}
                          className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                          title="Pilih semua pada tanggal ini"
                        />
                      </th>
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3 w-36">Waktu & Sesi</th>
                      <th className="py-2.5 px-3">Mata Pelajaran</th>
                      <th className="py-2.5 px-3 w-28">Kelas / Rombel</th>
                      <th className="py-2.5 px-3 w-20">Durasi</th>
                      <th className="py-2.5 px-3">Jenis Asesmen</th>
                      <th className="py-2.5 px-3 w-24">Ruang</th>
                      <th className="py-2.5 px-3">Pengawas Ruang</th>
                      <th className="py-2.5 px-3 w-28 text-center">Status</th>
                      <th className="py-2.5 px-3 w-28 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {dateExams.map((ex, exIdx) => {
                      const subName = subjectMap.get(ex.SUBJECT_ID) || ex.SUBJECT_ID;
                      const clsName = ex.CLASS_ID === 'ALL' ? 'Semua Kelas' : (classMap.get(ex.CLASS_ID) || ex.CLASS_ID);
                      const asName = assessmentMap.get(ex.ASSESSMENT_TYPE_ID) || ex.ASSESSMENT_TYPE_ID;
                      const isSelected = selectedExamIds.includes(ex.ID);
                      const isManageable = canManageExam(ex);

                      return (
                        <tr key={ex.ID} className={`hover:bg-blue-50/40 transition-colors ${isSelected ? 'bg-blue-50/60' : ''}`}>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectRow(ex.ID)}
                              className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                            />
                          </td>
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
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span>{ex.ID}</span>
                              <span>•</span>
                              <span className="truncate max-w-[200px]">{ex.TITLE}</span>
                              {ex.USE_TOKEN && (
                                <span
                                  onClick={e => {
                                    e.stopPropagation();
                                    if (ex.TOKEN) {
                                      navigator.clipboard?.writeText(ex.TOKEN);
                                      showNotification('success', `Token ${ex.TOKEN} berhasil disalin ke clipboard.`);
                                    }
                                  }}
                                  title="Klik untuk salin token"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold text-[10px] border border-amber-300 hover:bg-amber-200 cursor-pointer transition-colors"
                                >
                                  <KeyRound className="w-2.5 h-2.5" />
                                  <span>TOKEN: {ex.TOKEN || '-'}</span>
                                </span>
                              )}
                            </div>
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
                            {isManageable ? (
                              <select
                                value={ex.STATUS}
                                onChange={(e) => handleStatusChange(ex, e.target.value as ExamStatus)}
                                className={`text-[10px] font-bold py-1 px-2 rounded-full border cursor-pointer transition-colors outline-none ${
                                  ex.STATUS === 'ACTIVE'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                    : ex.STATUS === 'FINISHED'
                                    ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                }`}
                                title="Klik untuk mengubah status jadwal"
                              >
                                <option value="ACTIVE">● Aktif</option>
                                <option value="SCHEDULED">○ Terjadwal</option>
                                <option value="FINISHED">✓ Selesai</option>
                              </select>
                            ) : (
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
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {isManageable && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDuplicateModal(ex)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                  title="Duplikasi Jadwal ke Rombel Lain"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {isManageable ? (
                                <>
                                  <button
                                    onClick={() => handleOpenEdit(ex)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                    title="Edit Jadwal"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleRequestDelete(ex.ID, ex.TITLE)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Hapus Jadwal"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : onNavigateToQuestions ? (
                                <button
                                  onClick={onNavigateToQuestions}
                                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                  title="Buka Bank Soal"
                                >
                                  <HelpCircle className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Lihat</span>
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
          ))}

          {filteredExams.length === 0 && (
            <div className="bg-white border border-[#DEE2E6] rounded-2xl p-12 text-center space-y-3">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">Belum Ada Jadwal Ujian yang Cocok</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Silakan ubah filter atau klik tombol <b>Tambah Jadwal Ujian</b> atau <b>Generator Jadwal (1-Klik)</b> untuk membuat jadwal asesmen otomatis.
              </p>
              {canManageExam() && (
                <button
                  onClick={() => handleOpenAdd()}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#0052CC] text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Jadwal Pertama</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : viewMode === 'TABLE_BY_CLASS' ? (
        /* 2. TABLE GROUPED BY CLASS VIEW (GOLONGAN PER KELAS) */
        <div className="space-y-6">
          {groupedByClass.map(([classId, classExams]) => {
            const clsName = classId === 'ALL' ? 'Semua Kelas' : (classMap.get(classId) || `Kelas ${classId}`);
            return (
              <div
                key={classId}
                className="bg-white border border-[#DEE2E6] rounded-2xl p-5 shadow-xs space-y-4"
              >
                {/* Class Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {clsName}
                      </h3>
                      <span className="text-[11px] text-slate-500 font-medium">
                        ID: {classId} • {classExams.length} Mata Uji Terjadwal Untuk Kelas Ini
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">
                      {classExams.length} Mapel
                    </span>

                    {canManageExam() && (
                      <button
                        onClick={() => {
                          handleOpenAdd();
                          setFormExam(prev => ({
                            ...prev,
                            classId: classId,
                            targetClassIds: [classId]
                          }));
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-[11px] font-semibold text-slate-700 hover:text-purple-700 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Tambah di Kelas Ini</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Table for this class */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={classExams.length > 0 && classExams.every(e => selectedExamIds.includes(e.ID))}
                            onChange={() => {
                              const allClassSelected = classExams.every(e => selectedExamIds.includes(e.ID));
                              if (allClassSelected) {
                                const classExamIds = new Set(classExams.map(e => e.ID));
                                setSelectedExamIds(prev => prev.filter(id => !classExamIds.has(id)));
                              } else {
                                const newIds = new Set([...selectedExamIds, ...classExams.map(e => e.ID)]);
                                setSelectedExamIds(Array.from(newIds));
                              }
                            }}
                            className="w-3.5 h-3.5 rounded text-purple-600 cursor-pointer"
                            title="Pilih semua ujian kelas ini"
                          />
                        </th>
                        <th className="py-2.5 px-3 w-10 text-center">No</th>
                        <th className="py-2.5 px-3 w-28">Tanggal</th>
                        <th className="py-2.5 px-3 w-36">Waktu & Sesi</th>
                        <th className="py-2.5 px-3">Mata Pelajaran & Asesmen</th>
                        <th className="py-2.5 px-3 w-28">Ruang & Sesi</th>
                        <th className="py-2.5 px-3 w-32">Pengawas</th>
                        <th className="py-2.5 px-3 w-24 text-center">Integritas</th>
                        <th className="py-2.5 px-3 w-20 text-center">Status</th>
                        <th className="py-2.5 px-3 w-32 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {classExams.map((ex, idx) => {
                        const subName = subjectMap.get(ex.SUBJECT_ID) || ex.SUBJECT_ID;
                        const asName = assessmentMap.get(ex.ASSESSMENT_TYPE_ID) || ex.ASSESSMENT_TYPE_ID;
                        const isSelected = selectedExamIds.includes(ex.ID);
                        const isManageable = canManageExam(ex);

                        return (
                          <tr
                            key={ex.ID}
                            className={`hover:bg-purple-50/40 transition-colors ${
                              isSelected ? 'bg-purple-50/60' : idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectRow(ex.ID)}
                                className="w-3.5 h-3.5 rounded text-purple-600 cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                              {ex.EXAM_DATE ? formatSafeDate(ex.EXAM_DATE) : '-'}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                <span>{ex.START_TIME || '07:30'} - {ex.END_TIME || '09:00'}</span>
                              </div>
                              <span className="text-[10px] text-slate-500">
                                {ex.SESSION || 'Sesi 1'} ({ex.DURATION_MIN || 90} mnt)
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{subName}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-semibold">
                                  {asName}
                                </span>
                                {ex.USE_TOKEN && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-mono font-bold">
                                    Token: {ex.TOKEN || 'AKTIF'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="text-slate-800 font-semibold">{ex.ROOM || 'Ruang 01'}</div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 truncate max-w-[130px]">
                              {ex.SUPERVISOR || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {ex.ATTENDANCE_MODE === 'ALLOW_REMOTE' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                  <Home className="w-3 h-3" />
                                  Daring
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                                  <Building2 className="w-3 h-3" />
                                  Di Sekolah
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  ex.STATUS === 'ACTIVE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : ex.STATUS === 'FINISHED'
                                    ? 'bg-slate-200 text-slate-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {ex.STATUS === 'ACTIVE' ? 'Aktif' : ex.STATUS === 'FINISHED' ? 'Selesai' : 'Terjadwal'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                {isManageable && (
                                  <>
                                    <button
                                      onClick={() => handleOpenEdit(ex)}
                                      className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                      title="Edit Jadwal"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenDuplicateModal(ex)}
                                      className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                                      title="Duplikasi ke Kelas Lain"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleRequestDelete(ex.ID, ex.TITLE)}
                                      className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="Hapus Jadwal"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
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
            );
          })}

          {groupedByClass.length === 0 && (
            <div className="bg-white border border-[#DEE2E6] rounded-2xl p-10 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-[#E8F0FE] text-[#0052CC] flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800">Belum Ada Sesi Jadwal Ujian Aktif</h4>
              <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                Bank Soal yang telah Anda buat tersimpan dengan aman di menu <b>Bank Soal</b>. Sesi jadwal ujian dibuat terpisah agar butir bank soal tidak terhapus saat jadwal ujian selesai atau dihapus.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenAdd()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0052CC] hover:bg-[#0047B3] text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Buat Jadwal dari Bank Soal</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : viewMode === 'CARDS' ? (
        /* 2. CARDS VIEW */
        <div className="space-y-6">
          {groupedByDate.map(([dateStr, dateExams]) => (
            <div key={dateStr} className="space-y-3">
              {/* Date Group Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">
                    {formatSafeDate(dateStr)}
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">({dateExams.length} ujian)</span>
                </div>
                {canManageExam() && (
                  <button
                    onClick={() => handleOpenAdd(dateStr)}
                    className="text-xs text-[#0052CC] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah Jadwal</span>
                  </button>
                )}
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dateExams.map(ex => {
                  const subName = subjectMap.get(ex.SUBJECT_ID) || ex.SUBJECT_ID;
                  const clsName = ex.CLASS_ID === 'ALL' ? 'Semua Kelas' : (classMap.get(ex.CLASS_ID) || ex.CLASS_ID);
                  const asName = assessmentMap.get(ex.ASSESSMENT_TYPE_ID) || ex.ASSESSMENT_TYPE_ID;
                  const isSelected = selectedExamIds.includes(ex.ID);
                  const isManageable = canManageExam(ex);

                  return (
                    <div
                      key={ex.ID}
                      className={`bg-white border rounded-2xl p-4 shadow-xs space-y-3 hover:shadow-md transition-all ${
                        isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'
                      }`}
                    >
                      {/* Card Top: Selection & Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(ex.ID)}
                            className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                          />
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0052CC] font-bold text-[10px] border border-blue-100">
                            {asName}
                          </span>
                        </div>

                        {isManageable ? (
                          <select
                            value={ex.STATUS}
                            onChange={(e) => handleStatusChange(ex, e.target.value as ExamStatus)}
                            className={`text-[10px] font-bold py-1 px-2 rounded-full border cursor-pointer transition-colors outline-none ${
                              ex.STATUS === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : ex.STATUS === 'FINISHED'
                                ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                            }`}
                          >
                            <option value="ACTIVE">● Aktif</option>
                            <option value="SCHEDULED">○ Terjadwal</option>
                            <option value="FINISHED">✓ Selesai</option>
                          </select>
                        ) : (
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
                        )}
                      </div>

                      {/* Mapel & Rombel */}
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">
                          {subName}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                            {clsName}
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
                          {isManageable && (
                            <button
                              type="button"
                              onClick={() => handleOpenDuplicateModal(ex)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Duplikasi Jadwal ke Rombel Lain"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isManageable ? (
                            <>
                              <button
                                onClick={() => handleOpenEdit(ex)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors"
                                title="Edit Jadwal"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRequestDelete(ex.ID, ex.TITLE)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
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
              {canManageExam() && (
                <button
                  onClick={() => handleOpenAdd()}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#0052CC] text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Jadwal Pertama</span>
                </button>
              )}
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
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredExams.length > 0 && selectedExamIds.length === filteredExams.length}
                      onChange={handleToggleSelectAll}
                      className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                      title="Pilih semua"
                    />
                  </th>
                  <th className="py-3 px-3 w-12 text-center">No</th>
                  <th className="py-3 px-3">Hari & Tanggal</th>
                  <th className="py-3 px-3">Waktu (WIB)</th>
                  <th className="py-3 px-3">Mata Pelajaran</th>
                  <th className="py-3 px-3">Kelas</th>
                  <th className="py-3 px-3">Jenis Asesmen</th>
                  <th className="py-3 px-3">Ruang / Sesi</th>
                  <th className="py-3 px-3">Pengawas Ruang</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredExams.map((ex, idx) => {
                  const subName = subjectMap.get(ex.SUBJECT_ID) || ex.SUBJECT_ID;
                  const clsName = ex.CLASS_ID === 'ALL' ? 'Semua Kelas' : (classMap.get(ex.CLASS_ID) || ex.CLASS_ID);
                  const asName = assessmentMap.get(ex.ASSESSMENT_TYPE_ID) || ex.ASSESSMENT_TYPE_ID;
                  const isSelected = selectedExamIds.includes(ex.ID);
                  const isManageable = canManageExam(ex);

                  return (
                    <tr key={ex.ID} className={`hover:bg-blue-50/40 transition-colors ${isSelected ? 'bg-blue-50/60' : ''}`}>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(ex.ID)}
                          className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {ex.EXAM_DATE ? (
                          <>
                            <div>{formatSafeDate(ex.EXAM_DATE, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
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
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold">
                          {clsName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-[#0052CC] font-bold text-[10px] border border-blue-100">
                          {asName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-800">{ex.ROOM || 'Ruang 01'}</div>
                        {ex.SESSION && <div className="text-[10px] text-slate-400">{ex.SESSION}</div>}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">
                        {ex.SUPERVISOR || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isManageable ? (
                          <select
                            value={ex.STATUS}
                            onChange={(e) => handleStatusChange(ex, e.target.value as ExamStatus)}
                            className={`text-[10px] font-bold py-1 px-2 rounded-full border cursor-pointer transition-colors outline-none ${
                              ex.STATUS === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : ex.STATUS === 'FINISHED'
                                ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                            }`}
                          >
                            <option value="ACTIVE">● Aktif</option>
                            <option value="SCHEDULED">○ Terjadwal</option>
                            <option value="FINISHED">✓ Selesai</option>
                          </select>
                        ) : (
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
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isManageable && (
                            <button
                              type="button"
                              onClick={() => handleOpenDuplicateModal(ex)}
                              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Duplikasi Jadwal"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isManageable ? (
                            <>
                              <button
                                onClick={() => handleOpenEdit(ex)}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRequestDelete(ex.ID, ex.TITLE)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
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
        <div
          ref={modalBackdropRef}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-auto flex flex-col max-h-[90vh] border border-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* Fixed Sticky Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingExam ? 'Edit Jadwal Ujian CBT' : 'Tambah Jadwal Ujian CBT Baru'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {editingExam ? `Mengubah konfigurasi jadwal: ${formExam.title || formExam.id}` : 'Atur rincian mata pelajaran, waktu, rombel kelas, dan keamanan ujian'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div ref={modalBodyRef} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Pilih Bank Soal yang Tersedia (Difilter Otomatis Berdasarkan Kelas Sasaran) */}
              <div className="p-4 bg-[#F0F5FF] border border-[#B3D1FF] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-[#0052CC]" />
                    <span className="font-bold text-[#0052CC] text-xs">
                      Tautkan dari Bank Soal Tersedia
                    </span>
                  </div>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-[#B3D1FF] text-[#0052CC] font-semibold">
                    Persisten & Fleksibel
                  </span>
                </div>
                <p className="text-[11px] text-[#495057] leading-relaxed">
                  Pilih paket bank soal yang telah dibuat. Bank soal bersifat persisten dan tidak akan terhapus saat jadwal dihapus. Anda dapat mengambil <b>semua soal</b>, <b>ambil acak sebagian (misal 50 dari 100 soal)</b>, atau <b>pilih butir spesifik</b>.
                </p>
                {(() => {
                  const selectedCids = formExam.isMultiClass && formExam.targetClassIds.length > 0
                    ? formExam.targetClassIds
                    : [formExam.classId || 'ALL'];

                  // Kumpulkan seluruh bank soal dari penyimpanan persisten, jadwal ujian, dan butir soal
                  const bankMap = new Map<string, any>();
                  try {
                    const storedBanks = getQuestionBanks();
                    storedBanks.forEach(sb => {
                      bankMap.set(sb.ID, {
                        ID: sb.ID,
                        TITLE: sb.TITLE,
                        SUBJECT_ID: sb.SUBJECT_ID || '',
                        CLASS_ID: sb.CLASS_ID || (sb.CLASS_IDS?.[0] || 'ALL'),
                        CLASS_IDS: Array.isArray(sb.CLASS_IDS) && sb.CLASS_IDS.length > 0 ? sb.CLASS_IDS : [sb.CLASS_ID || 'ALL'],
                        ASSESSMENT_TYPE_ID: sb.ASSESSMENT_TYPE_ID || 'SAS',
                        TARGET_QUESTION_COUNT: sb.TARGET_QUESTION_COUNT || 0
                      });
                    });
                  } catch {}

                  safeExams.forEach(pkg => {
                    if (editingExam?.ID && pkg.ID === editingExam.ID) return;
                    if (!bankMap.has(pkg.ID)) {
                      bankMap.set(pkg.ID, {
                        ID: pkg.ID,
                        TITLE: pkg.TITLE,
                        SUBJECT_ID: pkg.SUBJECT_ID || '',
                        CLASS_ID: pkg.CLASS_ID || 'ALL',
                        CLASS_IDS: Array.isArray(pkg.CLASS_IDS) && pkg.CLASS_IDS.length > 0 ? pkg.CLASS_IDS : [pkg.CLASS_ID || 'ALL'],
                        ASSESSMENT_TYPE_ID: pkg.ASSESSMENT_TYPE_ID || 'SAS',
                        TARGET_QUESTION_COUNT: pkg.TARGET_QUESTION_COUNT || 0
                      });
                    }
                  });

                  storedQuestions.forEach(q => {
                    const bId = q.BANK_ID || q.EXAM_ID;
                    if (bId && bId !== 'UNASSIGNED' && (!editingExam || bId !== editingExam.ID) && !bankMap.has(bId)) {
                      const subj = safeSubjects.find(s => s.ID === q.SUBJECT_ID);
                      bankMap.set(bId, {
                        ID: bId,
                        TITLE: `Bank Soal ${subj?.NAME || 'Mapel'} (${bId})`,
                        SUBJECT_ID: q.SUBJECT_ID || '',
                        CLASS_ID: 'ALL',
                        CLASS_IDS: ['ALL'],
                        ASSESSMENT_TYPE_ID: q.ASSESSMENT_TYPE_ID || 'SAS',
                        TARGET_QUESTION_COUNT: 0
                      });
                    }
                  });

                  const candidateBanks = Array.from(bankMap.values());
                  // Urutkan paket: paket yang rombelnya cocok dengan form ditempatkan di atas, namun semua paket tetap ditampilkan
                  const sortedBanks = [...candidateBanks].sort((a, b) => {
                    const aClassIds = Array.isArray(a.CLASS_IDS) && a.CLASS_IDS.length > 0 ? a.CLASS_IDS : [a.CLASS_ID || 'ALL'];
                    const bClassIds = Array.isArray(b.CLASS_IDS) && b.CLASS_IDS.length > 0 ? b.CLASS_IDS : [b.CLASS_ID || 'ALL'];
                    const aMatch = selectedCids.includes('ALL') || aClassIds.includes('ALL') || selectedCids.some(cid => aClassIds.includes(cid));
                    const bMatch = selectedCids.includes('ALL') || bClassIds.includes('ALL') || selectedCids.some(cid => bClassIds.includes(cid));
                    if (aMatch && !bMatch) return -1;
                    if (!aMatch && bMatch) return 1;
                    return 0;
                  });

                  const displayBanks = sortedBanks;

                  const activeBankId = formExam.questionBankId || editingExam?.QUESTION_BANK_ID || '';
                  const effectiveBankId = activeBankId || editingExam?.ID || formExam.id;
                  const availableBankQuestions = storedQuestions.filter(q =>
                    q.EXAM_ID === effectiveBankId ||
                    q.BANK_ID === effectiveBankId ||
                    (activeBankId && (q.EXAM_ID === activeBankId || q.BANK_ID === activeBankId))
                  );

                  return (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <select
                          value={formExam.questionBankId}
                          onChange={e => {
                            const pkgId = e.target.value;
                            if (!pkgId) {
                              setFormExam(prev => ({
                                ...prev,
                                questionBankId: '',
                                questionSelectionMode: 'ALL',
                                questionCount: 0,
                                selectedQuestionIds: []
                              }));
                              return;
                            }
                            const pkg = candidateBanks.find(b => b.ID === pkgId);
                            if (!pkg) return;
                            const pkgClassIds = Array.isArray(pkg.CLASS_IDS) && pkg.CLASS_IDS.length > 0
                              ? pkg.CLASS_IDS
                              : (pkg.CLASS_ID && pkg.CLASS_ID !== 'ALL' ? [pkg.CLASS_ID] : []);
                            const pkgQuestions = storedQuestions.filter(q => q.EXAM_ID === pkg.ID || q.BANK_ID === pkg.ID);

                            setFormExam(prev => ({
                              ...prev,
                              questionBankId: pkg.ID,
                              title: pkg.TITLE || prev.title,
                              subjectId: pkg.SUBJECT_ID || prev.subjectId,
                              assessmentTypeId: pkg.ASSESSMENT_TYPE_ID || prev.assessmentTypeId,
                              classId: pkgClassIds[0] || prev.classId,
                              targetClassIds: pkgClassIds.length > 0 ? pkgClassIds : prev.targetClassIds,
                              isMultiClass: pkgClassIds.length > 1,
                              questionCount: prev.questionCount > 0 ? prev.questionCount : pkgQuestions.length
                            }));
                          }}
                          className="w-full px-3 py-2 border border-[#B3D1FF] bg-white rounded-lg outline-none text-xs text-[#1A1C1E] font-medium"
                        >
                          <option value="">
                            {formExam.questionBankId
                              ? '-- Lepas Tautan Bank Soal (Gunakan Soal Mandiri) --'
                              : displayBanks.length > 0
                              ? `-- Pilih Bank Soal (${displayBanks.length} paket tersedia) --`
                              : '-- Belum ada paket bank soal --'}
                          </option>
                          {displayBanks.map(b => {
                            const subj = safeSubjects.find(s => s.ID === b.SUBJECT_ID);
                            const sName = subj?.NAME || b.SUBJECT_ID || 'Mapel';
                            const bClasses = Array.isArray(b.CLASS_IDS) && b.CLASS_IDS.length > 0 ? b.CLASS_IDS : [b.CLASS_ID];
                            const cNames = bClasses.map(cId => classMap.get(cId) || cId).join(', ');
                            const qCount = storedQuestions.filter(q => q.EXAM_ID === b.ID || q.BANK_ID === b.ID).length;
                            const isMatch = selectedCids.includes('ALL') || bClasses.includes('ALL') || bClasses.some(cid => selectedCids.includes(cid));
                            return (
                              <option key={b.ID} value={b.ID}>
                                [{b.ASSESSMENT_TYPE_ID || 'SAS'}] {b.TITLE} — {sName} ({qCount} Soal, Kelas: {cNames || 'Semua'}){isMatch ? '' : ' (Rombel lain)'}
                              </option>
                            );
                          })}
                        </select>
                        {formExam.questionBankId && (
                          <button
                            type="button"
                            onClick={() => setFormExam(prev => ({ ...prev, questionBankId: '', questionSelectionMode: 'ALL', selectedQuestionIds: [] }))}
                            className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 rounded-lg text-[11px] font-semibold text-slate-600 shrink-0 cursor-pointer transition-colors"
                            title="Hapus tautan bank soal"
                          >
                            Lepas
                          </button>
                        )}
                      </div>

                      {/* Info & Konfigurasi Mode Penentuan Soal jika ada bank soal terhubung atau ada butir soal */}
                      {(availableBankQuestions.length > 0 || formExam.questionBankId) && (
                        <div className="p-3 bg-white border border-[#B3D1FF] rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-[#0052CC]" />
                              <span className="font-bold text-slate-800 text-xs">
                                Butir Soal Terdeteksi di Bank: <span className="text-[#0052CC]">{availableBankQuestions.length} Soal</span>
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {availableBankQuestions.filter(q => q.TYPE === 'MCQ' || !q.TYPE).length} PG • {availableBankQuestions.filter(q => q.TYPE === 'ESSAY').length} Uraian
                            </span>
                          </div>

                          {/* 3 Opsi Pengambilan Butir Soal */}
                          <div className="space-y-2">
                            <label className="font-bold text-slate-700 text-[11px] block">
                              Aturan Pemilihan Butir Soal untuk Jadwal Ini:
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {/* Opsi 1: SEMUA SOAL */}
                              <button
                                type="button"
                                onClick={() => setFormExam(prev => ({ ...prev, questionSelectionMode: 'ALL' }))}
                                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer ${
                                  formExam.questionSelectionMode === 'ALL'
                                    ? 'bg-blue-50 border-[#0052CC] shadow-xs ring-1 ring-[#0052CC]'
                                    : 'bg-slate-50 border-slate-200 hover:bg-white'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-bold text-xs text-slate-900">Semua Soal</span>
                                  <ListChecks className={`w-3.5 h-3.5 ${formExam.questionSelectionMode === 'ALL' ? 'text-[#0052CC]' : 'text-slate-400'}`} />
                                </div>
                                <span className="text-[10px] text-slate-500 leading-tight">
                                  Siswa mengerjakan seluruh {availableBankQuestions.length} butir soal di bank.
                                </span>
                              </button>

                              {/* Opsi 2: RANDOM N SOAL */}
                              <button
                                type="button"
                                onClick={() => setFormExam(prev => ({
                                  ...prev,
                                  questionSelectionMode: 'RANDOM',
                                  questionCount: prev.questionCount > 0 ? prev.questionCount : (availableBankQuestions.length > 50 ? 50 : availableBankQuestions.length)
                                }))}
                                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer ${
                                  formExam.questionSelectionMode === 'RANDOM'
                                    ? 'bg-amber-50 border-amber-500 shadow-xs ring-1 ring-amber-500'
                                    : 'bg-slate-50 border-slate-200 hover:bg-white'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-bold text-xs text-slate-900">Acak Sebagian</span>
                                  <Shuffle className={`w-3.5 h-3.5 ${formExam.questionSelectionMode === 'RANDOM' ? 'text-amber-600' : 'text-slate-400'}`} />
                                </div>
                                <span className="text-[10px] text-slate-500 leading-tight">
                                  Ambil acak N butir (misal: 50 soal dari 100 soal).
                                </span>
                              </button>

                              {/* Opsi 3: PILIH MANUAL */}
                              <button
                                type="button"
                                onClick={() => setFormExam(prev => ({ ...prev, questionSelectionMode: 'MANUAL' }))}
                                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer ${
                                  formExam.questionSelectionMode === 'MANUAL'
                                    ? 'bg-purple-50 border-purple-500 shadow-xs ring-1 ring-purple-500'
                                    : 'bg-slate-50 border-slate-200 hover:bg-white'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-bold text-xs text-slate-900">Pilih Manual</span>
                                  <SlidersHorizontal className={`w-3.5 h-3.5 ${formExam.questionSelectionMode === 'MANUAL' ? 'text-purple-600' : 'text-slate-400'}`} />
                                </div>
                                <span className="text-[10px] text-slate-500 leading-tight">
                                  Pilih butir soal spesifik ({formExam.selectedQuestionIds.length} dipilih).
                                </span>
                              </button>
                            </div>

                            {/* Detil Konfigurasi RANDOM */}
                            {formExam.questionSelectionMode === 'RANDOM' && (
                              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                                <div className="flex items-center justify-between">
                                  <label className="font-semibold text-amber-950 text-xs">
                                    Jumlah Soal yang Diujikan:
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min={1}
                                      max={availableBankQuestions.length || 500}
                                      value={formExam.questionCount || ''}
                                      onChange={e => setFormExam(prev => ({ ...prev, questionCount: Math.max(1, parseInt(e.target.value) || 0) }))}
                                      placeholder={String(availableBankQuestions.length > 50 ? 50 : availableBankQuestions.length || 50)}
                                      className="w-20 px-2.5 py-1.5 text-center font-bold text-xs border border-amber-300 bg-white rounded-lg outline-none focus:border-amber-600"
                                    />
                                    <span className="text-xs text-amber-900 font-medium">butir soal</span>
                                  </div>
                                </div>
                                <p className="text-[11px] text-amber-800 leading-normal">
                                  💡 <b>Keterangan:</b> Sistem akan mengambil secara acak sebanyak <b>{formExam.questionCount || 50} butir soal</b> dari total <b>{availableBankQuestions.length} butir</b> di bank untuk setiap peserta secara deterministik dan adil.
                                </p>
                              </div>
                            )}

                            {/* Detil Konfigurasi MANUAL */}
                            {formExam.questionSelectionMode === 'MANUAL' && (
                              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-bold text-purple-950 text-xs block">
                                      {formExam.selectedQuestionIds.length} Butir Soal Terpilih
                                    </span>
                                    <span className="text-[10px] text-purple-800">
                                      dari {availableBankQuestions.length} butir soal di bank
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setIsQuestionPickerModalOpen(true)}
                                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                                  >
                                    <SlidersHorizontal className="w-3.5 h-3.5" />
                                    <span>Buka Pemilih Butir Soal</span>
                                  </button>
                                </div>
                                {formExam.selectedQuestionIds.length === 0 && (
                                  <p className="text-[10px] text-amber-700 font-medium">
                                    ⚠️ Belum ada butir soal yang dipilih. Klik "Buka Pemilih Butir Soal" di atas untuk menentukan soal mana saja yang ingin diujikan.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Jenis Penilaian & Mata Pelajaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">Jenis Penilaian / Asesmen *</label>
                    <button
                      type="button"
                      onClick={() => setFormExam({ ...formExam, isCustomAssessment: !formExam.isCustomAssessment })}
                      className="text-[11px] text-[#0052CC] font-semibold hover:underline cursor-pointer"
                    >
                      {formExam.isCustomAssessment ? 'Pilih Opsi Standar' : '+ Tulis Manual'}
                    </button>
                  </div>
                  {!formExam.isCustomAssessment ? (
                    <select
                      value={formExam.assessmentTypeId}
                      onChange={e => {
                        if (e.target.value === '__CUSTOM__') {
                          setFormExam({ ...formExam, isCustomAssessment: true });
                        } else {
                          setFormExam({ ...formExam, assessmentTypeId: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                    >
                      {safeAssessmentTypes.map(as => (
                        <option key={as.ID} value={as.ID}>
                          {as.NAME} ({as.ID})
                        </option>
                      ))}
                      <option value="__CUSTOM__">+ Tulis Nama Manual / Kustom...</option>
                    </select>
                  ) : (
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder="Contoh: Try Out UTBK 1, Kuis Harian 2, Asesmen Diagnostik..."
                        value={formExam.customAssessmentName}
                        onChange={e => setFormExam({ ...formExam, customAssessmentName: e.target.value })}
                        className="w-full px-3 py-2 border border-blue-400 bg-blue-50/40 rounded-xl outline-none focus:border-[#0052CC] font-medium text-xs text-blue-950"
                        autoFocus
                      />
                      <span className="text-[10px] text-slate-500">
                        Nama penilaian kustom ini akan otomatis tersimpan & digunakan pada kartu serta jadwal kelas.
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Mata Pelajaran *</label>
                  <select
                    value={formExam.subjectId}
                    onChange={e => setFormExam({ ...formExam, subjectId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                  >
                    {safeSubjects.map(s => (
                      <option key={s.ID} value={s.ID}>
                        {s.NAME} ({s.CODE || s.ID})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Kelas (Dukungan Multi-Kelas Serentak) & Tanggal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">Target Rombel / Kelas Sasaran *</label>
                  <button
                    type="button"
                    onClick={() => setFormExam({ ...formExam, isMultiClass: !formExam.isMultiClass })}
                    className="text-[11px] text-[#0052CC] font-semibold hover:underline cursor-pointer"
                  >
                    {formExam.isMultiClass ? 'Mode Satu Kelas Saja' : 'Pilih Lebih Dari 1 Kelas (Serentak)'}
                  </button>
                </div>

                {!formExam.isMultiClass ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <select
                        value={formExam.classId}
                        onChange={e => {
                          const val = e.target.value;
                          setFormExam({
                            ...formExam,
                            classId: val,
                            targetClassIds: [val]
                          });
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                      >
                        <option value="ALL">Semua Kelas (Paralel Seluruh Tingkat)</option>
                        {safeClasses.map(c => (
                          <option key={c.ID} value={c.ID}>
                            Kelas {c.NAME}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <input
                        type="date"
                        value={formExam.examDate}
                        onChange={e => setFormExam({ ...formExam, examDate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                      <span className="text-[11px] font-bold text-slate-700">
                        Centang Rombel Sasaran ({formExam.targetClassIds.length} terpilih):
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const cls10 = safeClasses.filter(c => c.NAME?.includes('10') || c.NAME?.includes('X')).map(c => c.ID);
                            const chosen = cls10.length ? cls10 : safeClasses.slice(0, 2).map(c => c.ID);
                            setFormExam({ ...formExam, targetClassIds: chosen, classId: chosen[0] || 'ALL' });
                          }}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 hover:bg-blue-50 text-slate-700 rounded-md cursor-pointer"
                        >
                          Semua Kls 10
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const cls11 = safeClasses.filter(c => c.NAME?.includes('11') || c.NAME?.includes('XI')).map(c => c.ID);
                            const chosen = cls11.length ? cls11 : safeClasses.map(c => c.ID);
                            setFormExam({ ...formExam, targetClassIds: chosen, classId: chosen[0] || 'ALL' });
                          }}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 hover:bg-blue-50 text-slate-700 rounded-md cursor-pointer"
                        >
                          Semua Kls 11
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const cls12 = safeClasses.filter(c => c.NAME?.includes('12') || c.NAME?.includes('XII')).map(c => c.ID);
                            const chosen = cls12.length ? cls12 : safeClasses.map(c => c.ID);
                            setFormExam({ ...formExam, targetClassIds: chosen, classId: chosen[0] || 'ALL' });
                          }}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 hover:bg-blue-50 text-slate-700 rounded-md cursor-pointer"
                        >
                          Semua Kls 12
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const allIds = safeClasses.map(c => c.ID);
                            setFormExam({ ...formExam, targetClassIds: allIds, classId: allIds[0] || 'ALL' });
                          }}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-[#0052CC] text-white rounded-md cursor-pointer"
                        >
                          Pilih Semua
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                      {safeClasses.map(c => {
                        const isChecked = formExam.targetClassIds.includes(c.ID);
                        return (
                          <label
                            key={c.ID}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-blue-50/80 border-blue-300 text-blue-900 font-semibold'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                let updated: string[];
                                if (e.target.checked) {
                                  updated = [...formExam.targetClassIds, c.ID];
                                } else {
                                  updated = formExam.targetClassIds.filter(id => id !== c.ID);
                                }
                                setFormExam({
                                  ...formExam,
                                  targetClassIds: updated,
                                  classId: updated[0] || safeClasses[0]?.ID || 'ALL'
                                });
                              }}
                              className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                            />
                            <span className="truncate">Kelas {c.NAME}</span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 italic">
                        Jadwal akan otomatis muncul pada jadwal masing-masing kelas terpilih.
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-semibold text-slate-700">Tanggal:</label>
                        <input
                          type="date"
                          value={formExam.examDate}
                          onChange={e => setFormExam({ ...formExam, examDate: e.target.value })}
                          className="px-2.5 py-1 border border-slate-300 rounded-lg outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Template Sesi Waktu Fleksibel */}
              <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#0052CC]" />
                    <span>Pilihan Cepat Template Sesi Waktu</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSessionSettingsModalOpen(true)}
                    className="text-[11px] text-[#0052CC] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Atur Sesi Fleksibel...</span>
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {sessionPresets.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setFormExam({
                          ...formExam,
                          startTime: preset.startTime,
                          durationMin: preset.durationMin,
                          session: `${preset.name} (${preset.startTime} - ${preset.endTime})`
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-[#0052CC] font-medium text-[11px] transition-colors cursor-pointer shadow-2xs"
                    >
                      {preset.name} ({preset.startTime} - {preset.endTime})
                    </button>
                  ))}
                </div>
              </div>

              {/* Jam Mulai, Durasi, Sesi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">Jam Mulai (WIB) *</label>
                    {formExam.startTime && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          getTimeOfDayPeriod(formExam.startTime).toLowerCase().includes('pagi')
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : getTimeOfDayPeriod(formExam.startTime).toLowerCase().includes('siang')
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : getTimeOfDayPeriod(formExam.startTime).toLowerCase().includes('sore')
                            ? 'bg-orange-50 text-orange-800 border-orange-200'
                            : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        }`}
                      >
                        {formatTimeWithPeriod(formExam.startTime)}
                      </span>
                    )}
                  </div>
                  <input
                    type="time"
                    value={formExam.startTime}
                    onChange={e => setFormExam({ ...formExam, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-medium text-xs"
                  />
                  {/* Pilihan cepat Pagi / Siang */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {[
                      { time: '07:30', label: '07:30 Pagi' },
                      { time: '09:30', label: '09:30 Pagi' },
                      { time: '13:00', label: '13:00 Siang' },
                      { time: '14:00', label: '14:00 Siang' }
                    ].map(t => (
                      <button
                        key={t.time}
                        type="button"
                        onClick={() => setFormExam({ ...formExam, startTime: t.time })}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                          formExam.startTime === t.time
                            ? 'bg-[#0052CC] text-white border-[#0052CC]'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Deteksi jika salah pilih jam dini hari (01:00 vs 13:00) */}
                  {formExam.startTime && parseInt(formExam.startTime.split(':')[0], 10) < 5 && (
                    <div className="mt-1 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[10px] text-amber-900 flex flex-col gap-1">
                      <span>⚠️ Anda memilih jam {formExam.startTime} ({getTimeOfDayPeriod(formExam.startTime)} / Dini Hari). Jika bermaksud jam siang:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const [h, m] = formExam.startTime.split(':');
                          const newH = (parseInt(h, 10) + 12).toString().padStart(2, '0');
                          setFormExam({ ...formExam, startTime: `${newH}:${m || '00'}` });
                        }}
                        className="px-2 py-1 rounded bg-amber-200 hover:bg-amber-300 font-bold text-[10px] text-amber-900 cursor-pointer self-start"
                      >
                        Ubah ke Jam Siang ({parseInt(formExam.startTime.split(':')[0], 10) + 12}:{formExam.startTime.split(':')[1] || '00'})
                      </button>
                    </div>
                  )}
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
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                  <label htmlFor="randomize-toggle" className="font-medium text-slate-700 cursor-pointer">
                    Acak Urutan Soal
                  </label>
                </div>
              </div>

              {/* Regulasi Kehadiran & Integritas Ujian (In-Person / Daring / Susulan Otomatis) */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-indigo-200/80">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-700" />
                    <span className="font-bold text-indigo-950 text-xs">
                      Regulasi Kehadiran & Integritas Ujian (Deteksi Siswa Hadir di Sekolah)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDailyPresenceModalOpen(true)}
                    className="text-[11px] text-indigo-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Barcode Presensi Harian...</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 text-[11px]">Kewajiban Kehadiran Lokasi *</label>
                    <select
                      value={formExam.attendanceMode}
                      onChange={e => setFormExam({ ...formExam, attendanceMode: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-indigo-600 bg-white font-medium text-xs text-slate-900"
                    >
                      <option value="STRICT_SCHOOL">Wajib Hadir Fisik di Sekolah (Scan QR / Hadir Manual)</option>
                      <option value="ALLOW_REMOTE">Bebas / Diizinkan Daring (Pengerjaan dari Rumah)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 text-[11px]">Regulasi Siswa Tidak Hadir Sekolah *</label>
                    <select
                      value={formExam.absentPolicy}
                      onChange={e => setFormExam({ ...formExam, absentPolicy: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-indigo-600 bg-white font-medium text-xs text-slate-900"
                    >
                      <option value="AUTO_MAKEUP">Otomatis Masuk Jadwal Ujian Susulan (Integritas Terjaga)</option>
                      <option value="ALLOW_WITH_PERMIT">Boleh Ikut Daring Jika Disetujui Petugas/Pengawas</option>
                    </select>
                  </div>
                </div>

                <p className="text-[11px] text-indigo-900/80 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-indigo-100">
                  <strong>Pemberitahuan Integritas:</strong> Siswa yang tidak tercatat hadir di sekolah (belum scan barcode dinamis harian atau belum di-centang hadir manual oleh guru/pengawas) akan otomatis diblokir dari membuka soal hari ini dan dialihkan ke jadwal susulan.
                </p>
              </div>

              {/* Opsi Token Ujian Pengerjaan */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="use-token-toggle"
                      checked={formExam.useToken}
                      onChange={e => {
                        const isChecked = e.target.checked;
                        setFormExam({
                          ...formExam,
                          useToken: isChecked,
                          token: isChecked && !formExam.token ? Math.random().toString(36).substring(2, 7).toUpperCase() : formExam.token
                        });
                      }}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                    <label htmlFor="use-token-toggle" className="font-semibold text-slate-800 cursor-pointer text-xs">
                      Gunakan Token Ujian untuk Pengerjaan Siswa
                    </label>
                  </div>
                  {formExam.useToken ? (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                      Wajib Token
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                      Opsional / Non-aktif
                    </span>
                  )}
                </div>

                {formExam.useToken && (
                  <div className="pt-2 border-t border-slate-200/80 space-y-2">
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Siswa harus memasukkan token ini sebelum dapat membuka lembar soal ujian. Berikan token kepada pengawas ujian.
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          maxLength={10}
                          placeholder="MISAL: 5 HURUF/ANGKA"
                          value={formExam.token}
                          onChange={e => setFormExam({ ...formExam, token: e.target.value.toUpperCase() })}
                          className="w-full px-3.5 py-2.5 border border-amber-300 rounded-xl outline-none focus:border-[#0052CC] bg-white font-mono font-bold tracking-widest text-sm uppercase shadow-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const randomTok = Math.random().toString(36).substring(2, 7).toUpperCase();
                          setFormExam({ ...formExam, token: randomTok });
                          showNotification('success', `Token baru diacak: ${randomTok}`);
                        }}
                        className="px-3 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        title="Acak kode token baru"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Acak Token</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Sticky Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50 shrink-0">
              {editingExam?.ID ? (
                <button
                  type="button"
                  onClick={() => {
                    const idToDelete = editingExam.ID!;
                    const titleToDelete = editingExam.TITLE || formExam.title || 'Jadwal Ujian';
                    setIsAddEditModalOpen(false);
                    handleRequestDelete(idToDelete, titleToDelete);
                  }}
                  className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Jadwal</span>
                </button>
              ) : <div />}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveForm}
                  className="px-5 py-2 rounded-xl bg-[#0052CC] hover:bg-[#0047B3] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Jadwal Ujian</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DUPLIKASI JADWAL UJIAN KE ROMBEL LAIN */}
      {duplicatingExam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Copy className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Duplikasi Jadwal Ujian
                </h3>
              </div>
              <button
                onClick={() => setDuplicatingExam(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Source Exam Details */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="text-slate-500 font-medium">Jadwal Asal:</div>
              <div className="font-bold text-slate-900 text-sm">{duplicatingExam.TITLE}</div>
              <div className="flex items-center gap-2 text-slate-600 font-mono text-[11px]">
                <span>Kelas: <b>{classMap.get(duplicatingExam.CLASS_ID) || duplicatingExam.CLASS_ID}</b></span>
                <span>•</span>
                <span>{duplicatingExam.EXAM_DATE || 'Tanpa Tanggal'}</span>
                <span>•</span>
                <span>{duplicatingExam.START_TIME || '07:30'} WIB</span>
              </div>
            </div>

            {/* Target Classes Selection */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700">
                  Pilih Kelas Tujuan Duplikasi ({duplicateTargetClassIds.length} dipilih):
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const availableIds = safeClasses.filter(c => c.ID !== duplicatingExam.CLASS_ID).map(c => c.ID);
                    if (duplicateTargetClassIds.length === availableIds.length) {
                      setDuplicateTargetClassIds([]);
                    } else {
                      setDuplicateTargetClassIds(availableIds);
                    }
                  }}
                  className="text-[11px] text-[#0052CC] font-semibold hover:underline cursor-pointer"
                >
                  {duplicateTargetClassIds.length === safeClasses.filter(c => c.ID !== duplicatingExam.CLASS_ID).length
                    ? 'Batal Semua'
                    : 'Pilih Semua'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                {safeClasses
                  .filter(c => c.ID !== duplicatingExam.CLASS_ID)
                  .map(c => {
                    const isChecked = duplicateTargetClassIds.includes(c.ID);
                    return (
                      <label
                        key={c.ID}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-blue-50 border-blue-300 text-blue-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setDuplicateTargetClassIds(prev => [...prev, c.ID]);
                            } else {
                              setDuplicateTargetClassIds(prev => prev.filter(id => id !== c.ID));
                            }
                          }}
                          className="w-3.5 h-3.5 rounded text-blue-600"
                        />
                        <span>Kelas {c.NAME}</span>
                      </label>
                    );
                  })}
              </div>
              <p className="text-[11px] text-slate-500 italic">
                Setiap kelas yang dipilih akan dibuatkan jadwal ujian mandiri dengan pengaturan sesi, tanggal, dan butir soal yang sama persis.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                disabled={isDuplicating}
                onClick={() => setDuplicatingExam(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDuplicating || duplicateTargetClassIds.length === 0}
                onClick={handleConfirmDuplicate}
                className="px-5 py-2 rounded-xl bg-[#0052CC] hover:bg-[#0047B3] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isDuplicating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menduplikasi...</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Duplikasi Sekarang ({duplicateTargetClassIds.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AUTO GENERATOR WIZARD */}
      {isAutoGeneratorModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150">
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
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
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
                  {safeAssessmentTypes.map(as => (
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
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">
                    Pilih Rombel / Kelas Sasaran ({genConfig.targetClassIds.length} dipilih):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (genConfig.targetClassIds.length === safeClasses.length) {
                        setGenConfig(prev => ({ ...prev, targetClassIds: [] }));
                      } else {
                        setGenConfig(prev => ({ ...prev, targetClassIds: safeClasses.map(c => c.ID) }));
                      }
                    }}
                    className="text-[11px] text-[#0052CC] font-semibold hover:underline cursor-pointer"
                  >
                    {genConfig.targetClassIds.length === safeClasses.length ? 'Batal Semua' : 'Pilih Semua'}
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl max-h-32 overflow-y-auto">
                  {safeClasses.map(c => {
                    const isChecked = genConfig.targetClassIds.includes(c.ID);
                    return (
                      <label key={c.ID} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setGenConfig(prev => ({ ...prev, targetClassIds: [...prev.targetClassIds, c.ID] }));
                            } else {
                              setGenConfig(prev => ({ ...prev, targetClassIds: prev.targetClassIds.filter(id => id !== c.ID) }));
                            }
                          }}
                          className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
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
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRunAutoGenerator}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Buat Jadwal Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS SINGLE JADWAL */}
      {deleteConfirmExam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Hapus Jadwal Ujian CBT?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Apakah Anda yakin ingin menghapus jadwal ujian <strong className="text-slate-900 font-semibold">"{deleteConfirmExam.title}"</strong>?
                </p>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 leading-normal flex items-start gap-2 mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>Jadwal yang dihapus tidak dapat dipulihkan. Pengaturan sesi, ruang, dan penugasan pengawas untuk jadwal ini akan dihapus.</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 leading-normal flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span><strong>Bank Soal Tetap Aman:</strong> Penghapusan jadwal ini <u>TIDAK</u> menghapus Bank Soal maupun butir soal. Seluruh butir soal tetap tersimpan utuh dan dapat digunakan kembali untuk penilaian atau jadwal lainnya.</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmExam(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Hapus Jadwal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI BULK DELETE */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Hapus {selectedExamIds.length} Jadwal Ujian Terpilih?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Apakah Anda yakin ingin menghapus sebanyak <strong className="text-rose-600 font-bold">{selectedExamIds.length}</strong> jadwal ujian yang dipilih secara bersamaan?
                </p>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 leading-normal flex items-start gap-2 mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>Tindakan ini tidak dapat dibatalkan. Jadwal yang terhapus akan dihapus secara permanen.</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 leading-normal flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span><strong>Bank Soal Tetap Aman:</strong> Penghapusan jadwal-jadwal ini <u>TIDAK</u> akan menghapus Bank Soal maupun butir-butir soal di dalamnya. Semua paket soal tetap utuh di Bank Soal.</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isBulkDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Hapus {selectedExamIds.length} Jadwal</span>
                  </>
                )}
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
                  className="px-4 py-2 rounded-xl bg-[#0052CC] hover:bg-[#0047B3] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Sekarang (Ctrl + P)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMasterPrintModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
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
                          {formatSafeDate(ex.EXAM_DATE, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
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

      {/* MODAL: PRESENSI KEHADIRAN SEKOLAH & QR BARCODE HARIAN */}
      <DailySchoolPresenceModal
        isOpen={isDailyPresenceModalOpen}
        onClose={() => setIsDailyPresenceModalOpen(false)}
        currentUser={currentUser}
        classes={classes}
        users={users}
        onAttendanceChanged={() => {
          // Re-render or refresh state if necessary
        }}
      />

      {/* MODAL: PENGATURAN TEMPLATE SESI WAKTU */}
      <SessionPresetsModal
        isOpen={isSessionSettingsModalOpen}
        onClose={() => setIsSessionSettingsModalOpen(false)}
        onPresetsUpdated={(updated) => {
          setSessionPresets(updated);
        }}
      />

      {/* MODAL: RESET SESI UJIAN & BUKA KUNCI SISWA */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-auto flex flex-col max-h-[90vh] border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-amber-500/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Pusat Reset Sesi Ujian & Buka Kunci Siswa
                  </h3>
                  <p className="text-xs text-slate-500">
                    Buka kunci siswa yang terblokir karena pindah tab, waktu habis, atau gangguan jaringan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Notice Banner */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Jaminan Integritas Jawaban Siswa</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800/90">
                  Ketika Anda mereset sesi, <b>seluruh butir jawaban yang sudah disimpan siswa TETAP AMAN TERSIMPAN</b>. Sistem hanya akan mengembalikan status pengerjaan ke <i>Aktif / Sedang Berjalan</i>, menyetel pelanggaran ke 0, dan membuka kunci layar agar siswa dapat langsung melanjutkan ujian.
                </p>
              </div>

              {/* Exam Selector & Bulk Reset Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="space-y-1 flex-1">
                  <label className="font-semibold text-slate-700 block">Pilih Jadwal Ujian yang Ingin Dikelola:</label>
                  <select
                    value={resetSelectedExamId}
                    onChange={e => {
                      const newId = e.target.value;
                      setResetSelectedExamId(newId);
                      if (newId) loadExamAttempts(newId);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-amber-600 bg-white font-medium text-xs text-slate-900"
                  >
                    {currentExams.map(ex => (
                      <option key={ex.ID} value={ex.ID}>
                        {ex.TITLE} ({ex.EXAM_DATE || 'Tanpa Tanggal'} • {ex.START_TIME || '07:30'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:self-end">
                  <button
                    type="button"
                    disabled={isPerformingReset || !resetSelectedExamId}
                    onClick={handleResetAllForCurrentExam}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{isPerformingReset ? 'Memproses...' : 'Reset Semua Siswa (Satu Klik)'}</span>
                  </button>
                </div>
              </div>

              {/* Student Attempts Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">
                    Daftar Pengerjaan Siswa ({examAttemptDetails.length} Siswa Terdaftar)
                  </span>
                  <button
                    type="button"
                    onClick={() => resetSelectedExamId && loadExamAttempts(resetSelectedExamId)}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Muat Ulang Status</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Nama Siswa</th>
                        <th className="py-2.5 px-3">Kelas</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Pelanggaran</th>
                        <th className="py-2.5 px-3 text-center">Nilai</th>
                        <th className="py-2.5 px-3 text-center">Aksi Buka Kunci</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoadingAttempts ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            Memuat daftar pengerjaan siswa...
                          </td>
                        </tr>
                      ) : examAttemptDetails.length > 0 ? (
                        examAttemptDetails.map((att: any) => (
                          <tr key={att.attemptId} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              <div>{att.studentName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">NIS: {att.nis || att.studentUsername}</div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {att.className}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                att.status === 'SUBMITTED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : att.status === 'REVIEW'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {att.status === 'SUBMITTED' ? 'Selesai' : att.status === 'REVIEW' ? 'Perlu Koreksi' : 'Berjalan'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">
                              <span className={att.violations > 0 ? 'text-rose-600' : 'text-slate-400'}>
                                {att.violations || 0}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                              {att.score !== '' && att.score !== undefined ? att.score : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                disabled={isPerformingReset}
                                onClick={() => handleResetSingleAttempt(att.attemptId, att.studentName)}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-semibold text-[11px] transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                              >
                                Buka Kunci Siswa Ini
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 space-y-1">
                            <p className="font-semibold text-slate-600">Belum ada siswa yang memulai ujian ini</p>
                            <p className="text-[11px] text-slate-400">
                              Jika ada siswa yang terblokir atau telah submit, mereka akan muncul di daftar ini.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs transition-colors cursor-pointer"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PEMILIH BUTIR SOAL SPESIFIK DARI BANK SOAL */}
      {isQuestionPickerModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-auto flex flex-col max-h-[90vh] border border-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-purple-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Pilih Butir Soal untuk Jadwal Ujian
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500">
                  Tentukan nomor butir soal dari Bank Soal yang ingin dimunculkan pada jadwal ujian ini ({formExam.title || 'Ujian CBT'}).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsQuestionPickerModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Bar & Quick Selectors */}
            {(() => {
              const activeBankId = formExam.questionBankId || editingExam?.QUESTION_BANK_ID || '';
              const effectiveBankId = activeBankId || editingExam?.ID || formExam.id;
              const allBankQuestions = storedQuestions.filter(q =>
                q.EXAM_ID === effectiveBankId ||
                q.BANK_ID === effectiveBankId ||
                (activeBankId && (q.EXAM_ID === activeBankId || q.BANK_ID === activeBankId))
              );

              const filteredQuestions = allBankQuestions.filter(q => {
                if (questionTypeFilter !== 'ALL' && q.TYPE !== questionTypeFilter) return false;
                if (questionSearchQuery.trim()) {
                  const query = questionSearchQuery.toLowerCase();
                  const qText = (q.QUESTION || '').toLowerCase();
                  const optA = (q.OPTION_A || '').toLowerCase();
                  const optB = (q.OPTION_B || '').toLowerCase();
                  return qText.includes(query) || optA.includes(query) || optB.includes(query);
                }
                return true;
              });

              const isAllFilteredSelected = filteredQuestions.length > 0 && filteredQuestions.every(q => formExam.selectedQuestionIds.includes(q.ID));

              const handleToggleSelectAll = () => {
                if (isAllFilteredSelected) {
                  const filteredIds = new Set(filteredQuestions.map(q => q.ID));
                  setFormExam(prev => ({
                    ...prev,
                    selectedQuestionIds: prev.selectedQuestionIds.filter(id => !filteredIds.has(id))
                  }));
                } else {
                  const newSet = new Set(formExam.selectedQuestionIds);
                  filteredQuestions.forEach(q => newSet.add(q.ID));
                  setFormExam(prev => ({
                    ...prev,
                    selectedQuestionIds: Array.from(newSet)
                  }));
                }
              };

              const handleQuickSelectRandom = (count: number) => {
                const available = [...allBankQuestions];
                const shuffled = available.sort(() => 0.5 - Math.random());
                const picked = shuffled.slice(0, Math.min(count, available.length)).map(q => q.ID);
                setFormExam(prev => ({
                  ...prev,
                  selectedQuestionIds: picked
                }));
              };

              return (
                <>
                  <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
                    <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={questionSearchQuery}
                          onChange={e => setQuestionSearchQuery(e.target.value)}
                          placeholder="Cari teks soal atau pilihan jawaban..."
                          className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-purple-500 text-xs"
                        />
                      </div>
                      <select
                        value={questionTypeFilter}
                        onChange={e => setQuestionTypeFilter(e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none text-xs font-medium"
                      >
                        <option value="ALL">Semua Tipe Soal</option>
                        <option value="MCQ">Pilihan Ganda (MCQ)</option>
                        <option value="ESSAY">Uraian / Essay</option>
                        <option value="COMPLEX_MCQ">Pilihan Ganda Kompleks</option>
                        <option value="TRUE_FALSE">Benar / Salah</option>
                        <option value="MATCHING">Menjodohkan</option>
                      </select>
                    </div>

                    {/* Quick Selection Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-semibold text-slate-700 cursor-pointer"
                      >
                        {isAllFilteredSelected ? 'Batal Semua' : `Pilih Semua (${filteredQuestions.length})`}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickSelectRandom(25)}
                        className="px-2 py-1.5 bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 rounded-lg font-semibold cursor-pointer"
                      >
                        Pilih Acak 25
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickSelectRandom(50)}
                        className="px-2 py-1.5 bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 rounded-lg font-semibold cursor-pointer"
                      >
                        Pilih Acak 50
                      </button>
                      {formExam.selectedQuestionIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFormExam(prev => ({ ...prev, selectedQuestionIds: [] }))}
                          className="px-2 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-lg font-semibold cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question List */}
                  <div className="p-6 space-y-3 overflow-y-auto flex-1">
                    {filteredQuestions.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 space-y-1">
                        <p className="font-semibold text-slate-600">Tidak ada butir soal yang sesuai filter</p>
                        <p className="text-[11px]">Coba ubah kata kunci pencarian atau tipe soal.</p>
                      </div>
                    ) : (
                      filteredQuestions.map((q, idx) => {
                        const isChecked = formExam.selectedQuestionIds.includes(q.ID);
                        return (
                          <div
                            key={q.ID}
                            onClick={() => {
                              setFormExam(prev => {
                                const exists = prev.selectedQuestionIds.includes(q.ID);
                                return {
                                  ...prev,
                                  selectedQuestionIds: exists
                                    ? prev.selectedQuestionIds.filter(id => id !== q.ID)
                                    : [...prev.selectedQuestionIds, q.ID]
                                };
                              });
                            }}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                              isChecked
                                ? 'bg-purple-50/60 border-purple-300 ring-1 ring-purple-300'
                                : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 mt-1 rounded text-purple-600 cursor-pointer pointer-events-none shrink-0"
                            />
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                  Soal #{idx + 1}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                  {q.TYPE || 'MCQ'}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500">
                                  Bobot: {q.POINTS || 1} Poin
                                </span>
                              </div>
                              <p className="text-xs text-slate-800 line-clamp-3 leading-relaxed">
                                {q.QUESTION || '(Teks soal kosong)'}
                              </p>
                              {q.OPTION_A && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-600 pt-1">
                                  <div className="truncate"><b>A.</b> {q.OPTION_A}</div>
                                  <div className="truncate"><b>B.</b> {q.OPTION_B}</div>
                                  {q.OPTION_C && <div className="truncate"><b>C.</b> {q.OPTION_C}</div>}
                                  {q.OPTION_D && <div className="truncate"><b>D.</b> {q.OPTION_D}</div>}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800">
                        {formExam.selectedQuestionIds.length} dari {allBankQuestions.length} butir soal terpilih
                      </span>
                      <span className="text-[11px] text-slate-500">
                        (Total Bobot: {allBankQuestions.filter(q => formExam.selectedQuestionIds.includes(q.ID)).reduce((sum, q) => sum + Number(q.POINTS || 1), 0)} Poin)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsQuestionPickerModalOpen(false)}
                      className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs cursor-pointer transition-colors"
                    >
                      Selesai Memilih ({formExam.selectedQuestionIds.length} Soal)
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default CbtExamScheduleManager;
