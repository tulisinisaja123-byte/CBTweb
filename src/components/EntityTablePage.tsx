import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Search,
  Upload,
  Download,
  Edit2,
  Trash2,
  X,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUpAZ,
  ArrowDownAZ,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  List,
  Filter,
  Users,
  GraduationCap,
  FileText,
  BookOpen,
  Sparkles,
  Wand2,
  Hash,
  Award,
  Clock,
  Folder,
  FolderOpen,
  Tag,
  Sliders,
  Eye,
  ArrowLeft,
  HelpCircle,
  PlusCircle,
  Copy,
  Printer,
  FileCheck2,
  Smartphone,
  Monitor,
  RotateCcw,
  RefreshCw,
  Check,
  CheckSquare,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { User, ClassItem, Subject, Exam, Question, SchoolSettings, CurriculumType, AssessmentType, QuestionBankPackage } from '../types';
import {
  downloadStudentTemplate,
  downloadTeacherTemplate,
  downloadQuestionsTemplate,
  downloadQuestionsSingleColumnTemplate,
  downloadClassTemplate
} from '../utils/excelTemplates';
import { downloadQuestionsWordTemplate } from '../utils/wordTemplates';
import { parseQuestionsFromWord } from '../utils/wordParser';
import { WordImportModal } from './WordImportModal';
import { BankSoalImportModal, BankSoalItemJSON } from './BankSoalImportModal';
import { QuestionImportPreview, ParsedQuestionItem } from './QuestionImportPreview';
import { parseExcelQuestionRows } from '../utils/excelQuestionParser';
import {
  parseMatchingDetails,
  parseMatchingAnswer,
  formatMatchingAnswer,
  buildMatchingExtraData
} from '../utils/matchingHelper';
import { QuestionBankPrintModal } from './QuestionBankPrintModal';
import { QuestionBankMobileSimulator } from './QuestionBankMobileSimulator';
import { RichContentRenderer } from './RichContentRenderer';
import {
  getQuestionBanks,
  saveQuestionBank,
  deleteQuestionBank,
  cleanUnwantedDemoQuestionBanks,
  STORAGE_KEYS,
  getStorage,
  setStorage,
  safeStorageSet
} from '../services/lmsStorage';
import {
  CURRICULUM_CONFIG,
  OFFICIAL_SUBJECT_PRESETS,
  CLASS_SUGGESTIONS,
  generateSubjectCode,
  generateSubjectId,
  generateSubjectDisplayName,
  sanitizeIdentifier,
  MA_CIKARAMAS_TEACHERS
} from '../data/curriculumData';
import { autoSyncTeacherCodes, safeStorageGet, isSubjectTaughtByTeacher, isClassTaughtByTeacher } from '../services/supabaseLmsStorage';
import {
  getAssessmentBadgeStyle,
  getAssessmentShortLabel,
  getAssessmentFrequency,
  OFFICIAL_ASSESSMENT_PRESETS_MERDEKA,
  OFFICIAL_ASSESSMENT_PRESETS_K13,
  ASSESSMENT_CATEGORIES
} from '../data/assessmentData';

interface EntityTablePageProps {
  entityName: 'USERS' | 'CLASSES' | 'SUBJECTS' | 'EXAMS' | 'QUESTIONS' | 'ASSESSMENT_TYPES';
  title: string;
  subtitle: string;
  rows: any[];
  lookup: {
    users: User[];
    classes: ClassItem[];
    subjects: Subject[];
    exams: Exam[];
    assessmentTypes?: AssessmentType[];
  };
  currentUser: User;
  filterRole?: 'STUDENT' | 'TEACHER';
  settings?: SchoolSettings;
  onSave: (payload: any, entityType?: string) => Promise<any>;
  onDelete: (id: string | string[], entityType?: string) => Promise<any>;
  onImport: (importedRows: any[]) => Promise<{ imported: number; skipped: number }>;
  onNavigate?: (page: string) => void;
}

export const EntityTablePage: React.FC<EntityTablePageProps> = ({
  entityName,
  title,
  subtitle,
  rows,
  lookup,
  currentUser,
  filterRole,
  settings,
  onSave,
  onDelete,
  onImport,
  onNavigate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [wordModalOpen, setWordModalOpen] = useState(false);
  const [bankSoalModalOpen, setBankSoalModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formState, setFormState] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Preview states for Question Import and Generic Import
  const [questionPreviewData, setQuestionPreviewData] = useState<ParsedQuestionItem[] | null>(null);
  const [genericPreviewRows, setGenericPreviewRows] = useState<any[] | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importFileSize, setImportFileSize] = useState<number>(0);
  const [importFileType, setImportFileType] = useState<'WORD' | 'EXCEL' | 'CSV'>('EXCEL');
  const [importTargetExamId, setImportTargetExamId] = useState<string>(lookup?.exams?.[0]?.ID || 'EXAM-01');
  const [isImportSubmitting, setIsImportSubmitting] = useState<boolean>(false);

  const resetImportState = () => {
    setQuestionPreviewData(null);
    setGenericPreviewRows(null);
    setImportFileName('');
    setImportFileSize(0);
    setIsImportSubmitting(false);
  };

  // Grouping, Sorting, and Pagination states
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [subjectLevelFilter, setSubjectLevelFilter] = useState<string>('ALL');
  const [subjectGroupFilter, setSubjectGroupFilter] = useState<string>('ALL');
  const [curriculumFilter, setCurriculumFilter] = useState<'ALL' | 'MERDEKA' | 'K13'>('ALL');
  const [selectedAssessmentCategory, setSelectedAssessmentCategory] = useState<string>('ALL');
  const [groupByClass, setGroupByClass] = useState<boolean>(entityName === 'USERS' && filterRole === 'STUDENT');
  const [sortField, setSortField] = useState<string>('NAME');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [collapsedClasses, setCollapsedClasses] = useState<Record<string, boolean>>({});

  // Bank Soal Specific State
  const [selectedBankPackageId, setSelectedBankPackageId] = useState<string | null>(null);
  const [inputChooserTarget, setInputChooserTarget] = useState<any | null>(null);
  const [newBankPackageModalOpen, setNewBankPackageModalOpen] = useState<boolean>(false);
  const [editingBankPackage, setEditingBankPackage] = useState<any | null>(null);
  const [newBankPackageForm, setNewBankPackageForm] = useState<{
    ID?: string;
    ASSESSMENT_TYPE_ID: string;
    CLASS_ID: string;
    CLASS_IDS: string[];
    SUBJECT_ID: string;
    TARGET_QUESTION_COUNT: number;
    TITLE: string;
  }>({
    ASSESSMENT_TYPE_ID: 'SH',
    CLASS_ID: '',
    CLASS_IDS: [],
    SUBJECT_ID: '',
    TARGET_QUESTION_COUNT: 25,
    TITLE: ''
  });
  const [deletePackageConfirm, setDeletePackageConfirm] = useState<{ id: string; title: string; count: number } | null>(null);
  const [cleanDemoConfirmOpen, setCleanDemoConfirmOpen] = useState<boolean>(false);
  const [questionViewMode, setQuestionViewMode] = useState<'PACKAGES' | 'ALL_QUESTIONS'>('PACKAGES');
  const [packageQuestionFilterType, setPackageQuestionFilterType] = useState<string>('ALL');
  const [packageQuestionSearch, setPackageQuestionSearch] = useState<string>('');
  const [packageReviewMode, setPackageReviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [printPdfModalOpen, setPrintPdfModalOpen] = useState<boolean>(false);

  // Checkbox selection states for bulk delete
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [selectedPackageIds, setSelectedPackageIds] = useState<Set<string>>(new Set());
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<{
    type: 'ROWS' | 'PACKAGES' | 'QUESTIONS';
    ids: string[];
    count: number;
    title?: string;
    totalQuestions?: number;
  } | null>(null);

  // Clear selections when switching pages/views
  useEffect(() => {
    setSelectedRowIds(new Set());
    setSelectedPackageIds(new Set());
    setSelectedQuestionIds(new Set());
  }, [entityName, questionViewMode, selectedBankPackageId, currentPage]);

  const isEditable = currentUser.ROLE === 'ADMIN' || (currentUser.ROLE === 'TEACHER' && entityName === 'QUESTIONS');

  // Teacher-specific access control: only show Bank Soal for subjects they teach or exams they created
  const teacherSubjects = useMemo(() => {
    if (currentUser.ROLE !== 'TEACHER') return lookup?.subjects || [];
    return (lookup?.subjects || []).filter(s => isSubjectTaughtByTeacher(s, currentUser));
  }, [currentUser, lookup?.subjects]);

  const teacherSubjectIdSet = useMemo(() => {
    if (currentUser.ROLE !== 'TEACHER') return null;
    return new Set(teacherSubjects.map(s => s.ID));
  }, [currentUser, teacherSubjects]);

  const teacherExamIdSet = useMemo(() => {
    if (currentUser.ROLE !== 'TEACHER') return null;
    const ids = new Set<string>();
    (lookup?.exams || []).forEach(ex => {
      if (ex.CREATED_BY === currentUser.ID || (teacherSubjectIdSet && teacherSubjectIdSet.has(ex.SUBJECT_ID))) {
        ids.add(ex.ID);
      }
    });
    // Sertakan seluruh paket Bank Soal yang persisten untuk guru
    try {
      const storedBanks = getQuestionBanks();
      storedBanks.forEach(sb => {
        if (sb.CREATED_BY === currentUser.ID || (teacherSubjectIdSet && teacherSubjectIdSet.has(sb.SUBJECT_ID))) {
          ids.add(sb.ID);
        }
      });
    } catch {}
    // Sertakan juga ID bank soal dari daftar butir soal jika mata pelajaran sesuai pengampu atau dibuat guru
    if (entityName === 'QUESTIONS' && Array.isArray(rows)) {
      rows.forEach(q => {
        if (q.CREATED_BY === currentUser.ID || (q.SUBJECT_ID && teacherSubjectIdSet && teacherSubjectIdSet.has(q.SUBJECT_ID))) {
          if (q.EXAM_ID) ids.add(q.EXAM_ID);
          if (q.BANK_ID) ids.add(q.BANK_ID);
        }
      });
    }
    return ids;
  }, [currentUser, lookup?.exams, teacherSubjectIdSet, entityName, rows]);

  // Lookup maps
  const classNameMap = useMemo(() => {
    return Object.fromEntries((lookup?.classes || []).map(c => [c.ID, c.NAME]));
  }, [lookup?.classes]);

  const subjectNameMap = useMemo(() => {
    return Object.fromEntries((lookup?.subjects || []).map(s => [s.ID, s.NAME]));
  }, [lookup?.subjects]);

  const teacherNameMap = useMemo(() => {
    return Object.fromEntries((lookup?.users || []).map(u => [u.ID, u.NAME]));
  }, [lookup?.users]);

  const teacherCodeMap = useMemo(() => {
    return Object.fromEntries((lookup?.users || []).filter(u => u.ROLE === 'TEACHER' && u.TEACHER_CODE).map(u => [u.ID, u.TEACHER_CODE!]));
  }, [lookup?.users]);

  const teachersList = useMemo(() => {
    return (lookup?.users || []).filter(u => u.ROLE === 'TEACHER');
  }, [lookup?.users]);

  const examNameMap = useMemo(() => {
    return Object.fromEntries((lookup?.exams || []).map(e => [e.ID, e.TITLE]));
  }, [lookup?.exams]);

  // Available assessment types from lookup or fallback
  const availableAssessmentTypes = useMemo<AssessmentType[]>(() => {
    if (lookup?.assessmentTypes && lookup.assessmentTypes.length > 0) {
      return lookup.assessmentTypes;
    }
    return OFFICIAL_ASSESSMENT_PRESETS_MERDEKA;
  }, [lookup?.assessmentTypes]);

  // Map exam ID to ASSESSMENT_TYPE_ID
  const examAssessmentMap = useMemo(() => {
    const map: Record<string, string> = {};
    (lookup?.exams || []).forEach(e => {
      if (e.ASSESSMENT_TYPE_ID) map[e.ID] = e.ASSESSMENT_TYPE_ID;
    });
    return map;
  }, [lookup?.exams]);

  // Resolve assessment type ID for any question
  const getQuestionAssessmentId = (q: any): string => {
    if (q.ASSESSMENT_TYPE_ID) return String(q.ASSESSMENT_TYPE_ID).trim();
    if (q.EXAM_ID && examAssessmentMap[q.EXAM_ID]) return examAssessmentMap[q.EXAM_ID];
    return 'SH';
  };

  // Question counts aggregated by assessment type
  const questionCountsByAssessment = useMemo(() => {
    if (entityName !== 'QUESTIONS') return {};
    const counts: Record<string, number> = { ALL: rows.length };
    rows.forEach(q => {
      const typeId = getQuestionAssessmentId(q);
      counts[typeId] = (counts[typeId] || 0) + 1;
      if (typeId === 'SLM') counts['SH'] = (counts['SH'] || 0) + 1;
      if (typeId === 'PH') counts['SH'] = (counts['SH'] || 0) + 1;
    });
    return counts;
  }, [entityName, rows, examAssessmentMap]);

  // Initialize newBankPackageForm defaults
  useEffect(() => {
    if (lookup?.classes?.[0]?.ID && !newBankPackageForm.CLASS_ID) {
      const defaultType = availableAssessmentTypes[0]?.CODE || 'SH';
      const defaultClass = lookup.classes[0]?.ID || '';
      const defaultSubject = (currentUser.ROLE === 'TEACHER' && teacherSubjects.length > 0)
        ? teacherSubjects[0]?.ID
        : (lookup.subjects?.[0]?.ID || '');
      const subjName = subjectNameMap[defaultSubject] || lookup.subjects?.[0]?.NAME || 'Mapel';
      const clsName = classNameMap[defaultClass] || lookup.classes[0]?.NAME || 'Kelas';
      setNewBankPackageForm({
        ASSESSMENT_TYPE_ID: defaultType,
        CLASS_ID: defaultClass,
        CLASS_IDS: defaultClass ? [defaultClass] : [],
        SUBJECT_ID: defaultSubject,
        TARGET_QUESTION_COUNT: 25,
        TITLE: `Bank Soal ${defaultType} ${subjName} (${clsName})`
      });
    }
  }, [lookup?.classes, lookup?.subjects, availableAssessmentTypes, subjectNameMap, classNameMap, currentUser, teacherSubjects]);

  // Aggregate bank soal packages
  const questionPackages = useMemo(() => {
    if (entityName !== 'QUESTIONS') return [];

    const map = new Map<string, {
      ID: string;
      TITLE: string;
      SUBJECT_ID: string;
      CLASS_ID: string;
      CLASS_IDS: string[];
      TARGET_QUESTION_COUNT: number;
      ASSESSMENT_TYPE_ID: string;
      questions: any[];
      questionCount: number;
      mcqCount: number;
      essayCount: number;
      complexCount: number;
      interactiveCount: number;
      totalPoints: number;
    }>();

    // 1. Populate from persistent Question Banks (Source of Truth untuk Bank Soal)
    let storedBanks: QuestionBankPackage[] = [];
    try {
      storedBanks = getQuestionBanks();
      storedBanks.forEach(sb => {
        const hasAccess = currentUser.ROLE !== 'TEACHER' ||
          sb.CREATED_BY === currentUser.ID ||
          (teacherSubjectIdSet && teacherSubjectIdSet.has(sb.SUBJECT_ID));
        if (hasAccess) {
          const cIds = Array.isArray(sb.CLASS_IDS) && sb.CLASS_IDS.length > 0
            ? sb.CLASS_IDS
            : (sb.CLASS_ID && sb.CLASS_ID !== 'ALL' ? [sb.CLASS_ID] : []);
          map.set(sb.ID, {
            ID: sb.ID,
            TITLE: sb.TITLE,
            SUBJECT_ID: sb.SUBJECT_ID || '',
            CLASS_ID: sb.CLASS_ID || cIds[0] || '',
            CLASS_IDS: cIds,
            TARGET_QUESTION_COUNT: Number(sb.TARGET_QUESTION_COUNT || 0),
            ASSESSMENT_TYPE_ID: sb.ASSESSMENT_TYPE_ID || 'SH',
            questions: [],
            questionCount: 0,
            mcqCount: 0,
            essayCount: 0,
            complexCount: 0,
            interactiveCount: 0,
            totalPoints: 0
          });
        }
      });
    } catch {}

    // 2. Sertakan juga jadwal ujian (jika ada soal yang ditautkan ke ujian yang belum ada di map)
    const examsToConsider = (lookup?.exams || []).filter(ex => {
      if (currentUser.ROLE !== 'TEACHER') return true;
      return teacherExamIdSet ? teacherExamIdSet.has(ex.ID) : false;
    });

    examsToConsider.forEach(ex => {
      if (!map.has(ex.ID) && (!ex.QUESTION_BANK_ID || !map.has(ex.QUESTION_BANK_ID))) {
        const classIds = Array.isArray(ex.CLASS_IDS) && ex.CLASS_IDS.length > 0
          ? ex.CLASS_IDS
          : (ex.CLASS_ID && ex.CLASS_ID !== 'ALL' ? [ex.CLASS_ID] : []);
        map.set(ex.ID, {
          ID: ex.ID,
          TITLE: ex.TITLE,
          SUBJECT_ID: ex.SUBJECT_ID || '',
          CLASS_ID: ex.CLASS_ID || classIds[0] || '',
          CLASS_IDS: classIds,
          TARGET_QUESTION_COUNT: Number(ex.TARGET_QUESTION_COUNT || 0),
          ASSESSMENT_TYPE_ID: ex.ASSESSMENT_TYPE_ID || 'SH',
          questions: [],
          questionCount: 0,
          mcqCount: 0,
          essayCount: 0,
          complexCount: 0,
          interactiveCount: 0,
          totalPoints: 0
        });
      }
    });

    // 3. Masukkan butir-butir soal ke paket yang sesuai
    rows.forEach(q => {
      // Prioritaskan paket yang ada di map: q.BANK_ID atau q.EXAM_ID
      const targetId = (q.BANK_ID && map.has(q.BANK_ID))
        ? q.BANK_ID
        : ((q.EXAM_ID && map.has(q.EXAM_ID))
          ? q.EXAM_ID
          : (q.BANK_ID || q.EXAM_ID || 'UNASSIGNED'));

      // If teacher, check if teacher has access to this exam/subject/bank
      const hasTeacherAccess = currentUser.ROLE !== 'TEACHER' ||
        (teacherExamIdSet && (teacherExamIdSet.has(targetId) || (q.EXAM_ID && teacherExamIdSet.has(q.EXAM_ID)) || (q.BANK_ID && teacherExamIdSet.has(q.BANK_ID)))) ||
        q.CREATED_BY === currentUser.ID ||
        (q.SUBJECT_ID && teacherSubjectIdSet && teacherSubjectIdSet.has(q.SUBJECT_ID));

      if (!hasTeacherAccess) {
        return;
      }

      if (!map.has(targetId)) {
        const persistentBank = storedBanks.find(b => b.ID === targetId || b.ID === q.BANK_ID || b.ID === q.EXAM_ID);
        const examObj = (lookup?.exams || []).find(e => e.ID === targetId || e.ID === q.EXAM_ID);
        const isFisika = targetId.toLowerCase().includes('fisika') || targetId === 'UJ-001' || examObj?.TITLE?.toLowerCase().includes('fisika') || persistentBank?.TITLE?.toLowerCase().includes('fisika');

        const fallbackTitle = persistentBank?.TITLE || examObj?.TITLE || (isFisika ? 'Bank Soal Fisika X' : (examNameMap[targetId] || (targetId === 'UNASSIGNED' ? 'Bank Soal Umum' : `Bank Soal (${targetId})`)));

        let resolvedSubj = persistentBank?.SUBJECT_ID || examObj?.SUBJECT_ID || q.SUBJECT_ID;
        if (!resolvedSubj || (isFisika && resolvedSubj !== 'MP-T1')) {
          if (isFisika) {
            resolvedSubj = 'MP-T1';
          } else if (currentUser.ROLE === 'TEACHER' && teacherSubjectIdSet && teacherSubjectIdSet.size > 0) {
            resolvedSubj = Array.from(teacherSubjectIdSet)[0];
          } else {
            const fSubj = (lookup?.subjects || []).find(s => s.NAME?.toLowerCase().includes('fisika') || s.CODE === 'T1');
            resolvedSubj = fSubj ? fSubj.ID : 'MP-T1';
          }
        }

        const resolvedClassId = persistentBank?.CLASS_ID || examObj?.CLASS_ID || (isFisika ? 'KLS-X1' : (lookup?.classes?.[0]?.ID || 'ALL'));
        const resolvedClassIds = (persistentBank?.CLASS_IDS && persistentBank.CLASS_IDS.length > 0)
          ? persistentBank.CLASS_IDS
          : ((examObj?.CLASS_IDS && examObj.CLASS_IDS.length > 0) ? examObj.CLASS_IDS : (isFisika ? ['KLS-X1'] : (lookup?.classes?.[0]?.ID ? [lookup.classes[0].ID] : ['ALL'])));

        map.set(targetId, {
          ID: targetId,
          TITLE: fallbackTitle,
          SUBJECT_ID: resolvedSubj,
          CLASS_ID: resolvedClassId,
          CLASS_IDS: resolvedClassIds,
          TARGET_QUESTION_COUNT: persistentBank?.TARGET_QUESTION_COUNT || 0,
          ASSESSMENT_TYPE_ID: persistentBank?.ASSESSMENT_TYPE_ID || examObj?.ASSESSMENT_TYPE_ID || q.ASSESSMENT_TYPE_ID || (isFisika ? 'SAS' : 'SH'),
          questions: [],
          questionCount: 0,
          mcqCount: 0,
          essayCount: 0,
          complexCount: 0,
          interactiveCount: 0,
          totalPoints: 0
        });
      }
      const pkg = map.get(targetId)!;
      pkg.questions.push(q);
      pkg.questionCount = pkg.questions.length;
      if (q.TYPE === 'MCQ' || !q.TYPE) pkg.mcqCount += 1;
      else if (q.TYPE === 'ESSAY') pkg.essayCount += 1;
      else if (q.TYPE === 'COMPLEX_MCQ') {
        pkg.complexCount += 1;
        pkg.interactiveCount += 1;
      } else if (q.TYPE === 'TRUE_FALSE' || q.TYPE === 'MATCHING' || q.TYPE === 'SHORT_ANSWER') {
        pkg.interactiveCount += 1;
      }
      pkg.totalPoints += Number(q.POINTS || 0);
    });

    return Array.from(map.values());
  }, [entityName, lookup?.exams, lookup?.subjects, lookup?.classes, rows, examNameMap, currentUser, teacherExamIdSet]);

  // Filtered packages based on search, category, and class filter
  const filteredQuestionPackages = useMemo(() => {
    if (entityName !== 'QUESTIONS') return [];
    let list = [...questionPackages];

    if (selectedAssessmentCategory !== 'ALL') {
      list = list.filter(pkg => {
        const typeId = pkg.ASSESSMENT_TYPE_ID || 'SH';
        if (typeId === selectedAssessmentCategory) return true;
        const aType = availableAssessmentTypes.find(a => a.CODE === typeId || a.ID === typeId);
        if (aType && (aType.CODE === selectedAssessmentCategory || aType.ID === selectedAssessmentCategory)) {
          return true;
        }
        if (selectedAssessmentCategory === 'SH') {
          return typeId === 'SH' || typeId === 'SLM' || typeId === 'PH';
        }
        return false;
      });
    }

    if (selectedClassFilter !== 'ALL') {
      list = list.filter(pkg => {
        if (pkg.CLASS_ID === selectedClassFilter) return true;
        if (Array.isArray(pkg.CLASS_IDS) && pkg.CLASS_IDS.includes(selectedClassFilter)) return true;
        return false;
      });
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(pkg => {
        const sName = (subjectNameMap[pkg.SUBJECT_ID] || '').toLowerCase();
        const cName = (classNameMap[pkg.CLASS_ID] || '').toLowerCase();
        const tName = (pkg.TITLE || '').toLowerCase();
        const aCode = (pkg.ASSESSMENT_TYPE_ID || '').toLowerCase();
        const aType = availableAssessmentTypes.find(a => a.CODE === pkg.ASSESSMENT_TYPE_ID || a.ID === pkg.ASSESSMENT_TYPE_ID);
        const aName = (aType?.NAME || '').toLowerCase();
        return sName.includes(q) || cName.includes(q) || tName.includes(q) || aCode.includes(q) || aName.includes(q);
      });
    }

    return list;
  }, [entityName, questionPackages, selectedAssessmentCategory, selectedClassFilter, searchTerm, subjectNameMap, classNameMap, availableAssessmentTypes]);

  // Currently viewed package (when user clicks "Lihat")
  const activeViewingPackage = useMemo(() => {
    if (!selectedBankPackageId) return null;
    return questionPackages.find(p => p.ID === selectedBankPackageId) || null;
  }, [selectedBankPackageId, questionPackages]);

  // Filtered questions inside active viewing package
  const viewingPackageQuestions = useMemo(() => {
    if (!activeViewingPackage) return [];
    let list = activeViewingPackage.questions;
    if (packageQuestionFilterType !== 'ALL') {
      list = list.filter(q => q.TYPE === packageQuestionFilterType);
    }
    if (packageQuestionSearch.trim()) {
      const q = packageQuestionSearch.toLowerCase();
      list = list.filter(item =>
        (item.QUESTION || '').toLowerCase().includes(q) ||
        (item.ANSWER || '').toLowerCase().includes(q) ||
        (item.OPTION_A || '').toLowerCase().includes(q) ||
        (item.OPTION_B || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeViewingPackage, packageQuestionFilterType, packageQuestionSearch]);

  // Bank Soal helper actions
  const handleOpenAddQuestionForPackage = (pkg: any) => {
    setEditingItem(null);
    const initial: Record<string, any> = {
      ACTIVE: true,
      TYPE: 'MCQ',
      POINTS: 10,
      EXAM_ID: pkg.ID,
      ASSESSMENT_TYPE_ID: pkg.ASSESSMENT_TYPE_ID || 'SH',
      ANSWER: 'A'
    };
    setFormState(initial);
    setModalOpen(true);
  };

  const handleOpenWordImportForPackage = (pkg: any) => {
    setImportTargetExamId(pkg.ID);
    setWordModalOpen(true);
  };

  const handleOpenExcelImportForPackage = (pkg: any) => {
    setImportTargetExamId(pkg.ID);
    setImportModalOpen(true);
  };

  const handleDeletePackageConfirm = async () => {
    if (!deletePackageConfirm) return;
    try {
      const targetId = deletePackageConfirm.id;

      // 1. Hapus butir-butir soal yang terkait dengan paket bank soal ini dari storage
      const allQ = getStorage<Question[]>(STORAGE_KEYS.QUESTIONS, []);
      const remainingQ = allQ.filter(q => q.EXAM_ID !== targetId && q.BANK_ID !== targetId);
      setStorage(STORAGE_KEYS.QUESTIONS, remainingQ);
      safeStorageSet('LMS_QUESTIONS_USER_MODIFIED', 'true');

      // 2. Hapus dari daftar bank soal persisten
      deleteQuestionBank(targetId);

      // 3. Hapus entitas jika ada di exams/schedules
      try {
        await onDelete(targetId, 'EXAMS');
      } catch {}

      setDeletePackageConfirm(null);
      if (selectedBankPackageId === targetId) {
        setSelectedBankPackageId(null);
      }
      setStatusMessage({
        type: 'success',
        text: 'Paket Bank Soal beserta seluruh butir soalnya berhasil dihapus secara permanen.'
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menghapus paket bank soal.' });
    }
  };

  const handleCleanDemoQuestionBanks = () => {
    try {
      cleanUnwantedDemoQuestionBanks();
      setCleanDemoConfirmOpen(false);
      setStatusMessage({
        type: 'success',
        text: 'Paket demo berhasil dibersihkan! Bank Soal Fisika X Anda telah dipulihkan dan siap digunakan.'
      });
      setTimeout(() => setStatusMessage(null), 4500);
      try {
        window.dispatchEvent(new CustomEvent('LMS_DATA_CHANGED', { detail: { entity: 'QUESTIONS' } }));
      } catch {}
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal membersihkan paket demo.' });
    }
  };

  const openCreateBankPackageModal = () => {
    const defaultType = availableAssessmentTypes[0]?.CODE || 'SH';
    const defaultClass = lookup.classes?.[0]?.ID || '';
    const defaultSubject = (currentUser.ROLE === 'TEACHER' && teacherSubjects.length > 0)
      ? teacherSubjects[0]?.ID
      : (lookup.subjects?.[0]?.ID || '');
    const sName = subjectNameMap[defaultSubject] || lookup.subjects?.[0]?.NAME || 'Mapel';
    const cName = classNameMap[defaultClass] || lookup.classes?.[0]?.NAME || 'Kelas';

    setEditingBankPackage(null);
    setNewBankPackageForm({
      ASSESSMENT_TYPE_ID: defaultType,
      CLASS_ID: defaultClass,
      CLASS_IDS: defaultClass ? [defaultClass] : [],
      SUBJECT_ID: defaultSubject,
      TARGET_QUESTION_COUNT: 25,
      TITLE: `Bank Soal ${defaultType} ${sName} (${cName})`
    });
    setNewBankPackageModalOpen(true);
  };

  const openEditBankPackageModal = (pkg: any) => {
    setEditingBankPackage(pkg);
    const classIds = Array.isArray(pkg.CLASS_IDS) && pkg.CLASS_IDS.length > 0
      ? pkg.CLASS_IDS
      : (pkg.CLASS_ID && pkg.CLASS_ID !== 'ALL' ? [pkg.CLASS_ID] : []);
    const isFis = pkg.ID === 'UJ-001' || pkg.ID?.toLowerCase().includes('fisika') || pkg.TITLE?.toLowerCase().includes('fisika');
    const effectiveSubj = isFis ? 'MP-T1' : (pkg.SUBJECT_ID || '');
    setNewBankPackageForm({
      ID: pkg.ID,
      ASSESSMENT_TYPE_ID: pkg.ASSESSMENT_TYPE_ID || (isFis ? 'SAS' : 'SH'),
      CLASS_ID: pkg.CLASS_ID || (isFis ? 'KLS-X1' : (classIds[0] || '')),
      CLASS_IDS: classIds.length > 0 ? classIds : (isFis ? ['KLS-X1'] : []),
      SUBJECT_ID: effectiveSubj,
      TARGET_QUESTION_COUNT: Number(pkg.TARGET_QUESTION_COUNT || pkg.questionCount || 0),
      TITLE: pkg.TITLE || ''
    });
    setNewBankPackageModalOpen(true);
  };

  const handleSaveBankPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankPackageForm.TITLE.trim()) {
      setStatusMessage({ type: 'error', text: 'Judul Bank Soal wajib diisi.' });
      return;
    }
    try {
      const primaryClass = newBankPackageForm.CLASS_IDS[0] || newBankPackageForm.CLASS_ID || 'ALL';
      const pkgId = editingBankPackage?.ID || `BANK-${Date.now()}`;
      const payload: any = {
        _entityType: 'EXAMS',
        ID: pkgId,
        TITLE: newBankPackageForm.TITLE.trim(),
        SUBJECT_ID: newBankPackageForm.SUBJECT_ID,
        CLASS_ID: primaryClass,
        CLASS_IDS: newBankPackageForm.CLASS_IDS.length > 0 ? newBankPackageForm.CLASS_IDS : [primaryClass],
        TARGET_QUESTION_COUNT: Number(newBankPackageForm.TARGET_QUESTION_COUNT || 0),
        ASSESSMENT_TYPE_ID: newBankPackageForm.ASSESSMENT_TYPE_ID,
        CREATED_BY: currentUser.ID,
        STATUS: editingBankPackage ? (editingBankPackage.STATUS || 'DRAFT') : 'DRAFT',
        DURATION_MIN: editingBankPackage ? (editingBankPackage.DURATION_MIN || 60) : 60,
        RANDOMIZE: true,
        MAX_VIOLATIONS: 3
      };
      if (editingBankPackage?.ID) {
        payload._originalId = editingBankPackage.ID;
      }

      // Simpan ke bank soal persisten
      saveQuestionBank({
        ID: pkgId,
        TITLE: payload.TITLE,
        SUBJECT_ID: payload.SUBJECT_ID,
        CLASS_ID: payload.CLASS_ID,
        CLASS_IDS: payload.CLASS_IDS,
        ASSESSMENT_TYPE_ID: payload.ASSESSMENT_TYPE_ID,
        TARGET_QUESTION_COUNT: payload.TARGET_QUESTION_COUNT,
        CREATED_BY: currentUser.ID,
        CREATED_AT: new Date().toISOString()
      });

      // Update seluruh butir soal yang berada di paket bank soal ini agar mapel dan jenis penilaiannya sinkron
      const allQ = getStorage<Question[]>(STORAGE_KEYS.QUESTIONS, []);
      let qUpdated = false;
      const updatedQ = allQ.map(q => {
        if (q.EXAM_ID === pkgId || q.BANK_ID === pkgId) {
          qUpdated = true;
          return {
            ...q,
            SUBJECT_ID: payload.SUBJECT_ID,
            ASSESSMENT_TYPE_ID: payload.ASSESSMENT_TYPE_ID
          };
        }
        return q;
      });
      if (qUpdated) {
        setStorage(STORAGE_KEYS.QUESTIONS, updatedQ);
        safeStorageSet('LMS_QUESTIONS_USER_MODIFIED', 'true');
      }

      await onSave(payload, 'EXAMS');
      setNewBankPackageModalOpen(false);
      setEditingBankPackage(null);
      setStatusMessage({
        type: 'success',
        text: editingBankPackage
          ? 'Paket Bank Soal berhasil diperbarui!'
          : 'Paket Bank Soal baru berhasil dibuat! Anda dapat langsung klik "Input" untuk mulai mengisi soal.'
      });
      setTimeout(() => setStatusMessage(null), 4500);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menyimpan paket bank soal.' });
    }
  };

  const updateAutoBankPackageTitle = (typeId: string, classIds: string[], subjectId: string) => {
    const aType = availableAssessmentTypes.find(a => a.CODE === typeId || a.ID === typeId);
    const typeLabel = aType?.CODE || typeId;
    const sName = subjectNameMap[subjectId] || 'Mapel';
    let cLabel = 'Semua Kelas';
    if (classIds && classIds.length > 0) {
      if (classIds.length === 1) {
        cLabel = classNameMap[classIds[0]] || classIds[0];
      } else {
        cLabel = `${classIds.length} Rombel (${classIds.map(c => classNameMap[c] || c).slice(0, 2).join(', ')}${classIds.length > 2 ? '...' : ''})`;
      }
    }
    return `Bank Soal ${typeLabel} ${sName} (${cLabel})`;
  };

  const handleAutoSyncTeacherCodes = async () => {
    try {
      const tok = safeStorageGet('lms_token') || '';
      if (!tok) {
        setStatusMessage({ type: 'error', text: 'Sesi login tidak ditemukan.' });
        return;
      }
      const res = await autoSyncTeacherCodes(tok);
      setStatusMessage({
        type: 'success',
        text: res.message
      });
      window.dispatchEvent(new CustomEvent('LMS_TEACHER_DATA_CHANGED'));
      if (onSave) {
        await onSave(null, '_REFRESH_ONLY');
      }
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menyinkronkan kode guru.' });
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Reset page when filter / sort / view mode changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedClassFilter, subjectLevelFilter, subjectGroupFilter, selectedAssessmentCategory, pageSize, sortField, sortOrder, groupByClass, questionViewMode]);

  // Student counts per class
  const studentCountPerClass = useMemo(() => {
    if (entityName !== 'USERS' || filterRole !== 'STUDENT') return {};
    const counts: Record<string, number> = {};
    rows.filter(r => r.ROLE === 'STUDENT').forEach(s => {
      const cid = s.CLASS_ID || 'UNASSIGNED';
      counts[cid] = (counts[cid] || 0) + 1;
    });
    return counts;
  }, [entityName, filterRole, rows]);

  const studentCountTotal = useMemo(() => {
    if (entityName !== 'USERS' || filterRole !== 'STUDENT') return rows.length;
    return rows.filter(r => r.ROLE === 'STUDENT').length;
  }, [entityName, filterRole, rows]);

  // Filtered and Sorted rows (Alphabetical A-Z by default for students)
  const sortedAndFilteredRows = useMemo(() => {
    let list = [...rows];
    if (filterRole) {
      list = list.filter(r => r.ROLE === filterRole);
    }
    if (entityName === 'USERS' && filterRole === 'STUDENT') {
      if (currentUser.ROLE === 'TEACHER') {
        list = list.filter(r => isClassTaughtByTeacher({ ID: r.CLASS_ID }, currentUser));
      }
      if (selectedClassFilter !== 'ALL') {
        if (selectedClassFilter === 'UNASSIGNED') {
          list = list.filter(r => !r.CLASS_ID);
        } else {
          list = list.filter(r => r.CLASS_ID === selectedClassFilter);
        }
      }
    }
    if (entityName === 'CLASSES') {
      if (currentUser.ROLE === 'TEACHER') {
        list = list.filter(r => isClassTaughtByTeacher(r, currentUser));
      }
      if (curriculumFilter !== 'ALL') {
        list = list.filter(r => (r.CURRICULUM || 'MERDEKA') === curriculumFilter);
      }
    }
    if (entityName === 'SUBJECTS') {
      if (currentUser.ROLE === 'TEACHER') {
        list = list.filter(r => isSubjectTaughtByTeacher(r, currentUser));
      }
      if (curriculumFilter !== 'ALL') {
        list = list.filter(r => (r.CURRICULUM || 'MERDEKA') === curriculumFilter);
      }
      if (subjectLevelFilter !== 'ALL') {
        list = list.filter(r => (r.LEVEL || '').toUpperCase() === subjectLevelFilter.toUpperCase());
      }
      if (subjectGroupFilter !== 'ALL') {
        list = list.filter(r => (r.GROUP || '').toLowerCase().includes(subjectGroupFilter.toLowerCase()));
      }
    }
    if (entityName === 'QUESTIONS') {
      if (currentUser.ROLE === 'TEACHER' && teacherExamIdSet) {
        list = list.filter(q =>
          teacherExamIdSet.has(q.EXAM_ID) ||
          (q.BANK_ID && teacherExamIdSet.has(q.BANK_ID)) ||
          q.CREATED_BY === currentUser.ID ||
          (q.SUBJECT_ID && teacherSubjectIdSet && teacherSubjectIdSet.has(q.SUBJECT_ID))
        );
      }
      if (selectedAssessmentCategory !== 'ALL') {
        list = list.filter(q => {
          const typeId = getQuestionAssessmentId(q);
          if (selectedAssessmentCategory === 'SH') {
            return typeId === 'SH' || typeId === 'SLM' || typeId === 'PH';
          }
          return typeId === selectedAssessmentCategory;
        });
      }
    }
    if (entityName === 'ASSESSMENT_TYPES' && curriculumFilter !== 'ALL') {
      list = list.filter(r => (r.CURRICULUM || 'MERDEKA') === curriculumFilter || r.CURRICULUM === 'ALL');
    }
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      list = list.filter(r =>
        Object.values(r).some(v => String(v || '').toLowerCase().includes(query))
      );
    }

    // Sort order (Alphabetical for strings with Indonesian collation)
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        const cmp = valA.localeCompare(valB, 'id', { sensitivity: 'base', numeric: true });
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [rows, filterRole, entityName, selectedClassFilter, subjectLevelFilter, subjectGroupFilter, curriculumFilter, selectedAssessmentCategory, examAssessmentMap, searchTerm, sortField, sortOrder]);

  // Grouped students per class
  const groupedStudentsByClass = useMemo(() => {
    if (entityName !== 'USERS' || filterRole !== 'STUDENT') {
      return [];
    }

    const map = new Map<string, any[]>();
    const unassigned: any[] = [];

    if (selectedClassFilter === 'ALL') {
      lookup.classes.forEach(c => {
        map.set(c.ID, []);
      });
    } else if (selectedClassFilter !== 'UNASSIGNED') {
      map.set(selectedClassFilter, []);
    }

    sortedAndFilteredRows.forEach(student => {
      const cid = student.CLASS_ID || '';
      if (map.has(cid)) {
        map.get(cid)!.push(student);
      } else if (selectedClassFilter === 'ALL' || selectedClassFilter === 'UNASSIGNED') {
        unassigned.push(student);
      }
    });

    const groups: {
      id: string;
      name: string;
      level?: string;
      homeroom?: string;
      students: any[];
    }[] = [];

    map.forEach((studentList, cid) => {
      const cls = lookup.classes.find(c => c.ID === cid);
      // If filtering or searching, only show classes with matching students; otherwise show all classes
      if (studentList.length > 0 || !searchTerm.trim()) {
        groups.push({
          id: cid,
          name: cls?.NAME || cid || 'Tanpa Nama Kelas',
          level: cls?.LEVEL || '-',
          homeroom: teacherNameMap[cls?.HOMEROOM || ''] || cls?.HOMEROOM || '-',
          students: studentList
        });
      }
    });

    if (unassigned.length > 0) {
      groups.push({
        id: 'UNASSIGNED',
        name: 'Belum Ditentukan Kelas',
        level: '-',
        homeroom: '-',
        students: unassigned
      });
    }

    // Sort groups by class name
    groups.sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true }));

    return groups;
  }, [entityName, filterRole, lookup.classes, selectedClassFilter, sortedAndFilteredRows, searchTerm, teacherNameMap]);

  // Pagination calculation
  const isBankPackagesMode = entityName === 'QUESTIONS' && questionViewMode === 'PACKAGES' && !selectedBankPackageId;
  const totalItems = isBankPackagesMode
    ? filteredQuestionPackages.length
    : sortedAndFilteredRows.length;
  const totalPages = pageSize > 0 ? Math.ceil(totalItems / pageSize) || 1 : 1;
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRows = useMemo(() => {
    const dataSource = isBankPackagesMode
      ? filteredQuestionPackages
      : sortedAndFilteredRows;
    if (pageSize <= 0) return dataSource;
    const start = (validCurrentPage - 1) * pageSize;
    return dataSource.slice(start, start + pageSize);
  }, [isBankPackagesMode, filteredQuestionPackages, sortedAndFilteredRows, validCurrentPage, pageSize]);

  const handleSortToggle = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const openAddModal = () => {
    if (currentUser.ROLE === 'TEACHER' && entityName !== 'QUESTIONS') {
      setStatusMessage({
        type: 'error',
        text: 'Guru tidak memiliki izin untuk menambah data dasar/master. Hak akses guru hanya untuk membuat butir soal pada Bank Soal.'
      });
      setTimeout(() => setStatusMessage(null), 4000);
      return;
    }
    setEditingItem(null);
    const initial: Record<string, any> = { ACTIVE: true };
    const defaultCurriculum: CurriculumType = settings?.CURRICULUM || 'MERDEKA';

    if (entityName === 'USERS') {
      initial.ROLE = filterRole || 'STUDENT';
      initial.CLASS_ID =
        selectedClassFilter !== 'ALL' && selectedClassFilter !== 'UNASSIGNED'
          ? selectedClassFilter
          : lookup.classes[0]?.ID || '';
      if (filterRole === 'TEACHER') {
        const existingCodes = new Set(lookup.users.map(u => u.TEACHER_CODE).filter(Boolean));
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let nextCode = 'A';
        for (let i = 0; i < alphabet.length; i++) {
          if (!existingCodes.has(alphabet[i])) {
            nextCode = alphabet[i];
            break;
          }
        }
        initial.TEACHER_CODE = nextCode;
      }
    } else if (entityName === 'CLASSES') {
      initial.CURRICULUM = defaultCurriculum;
      initial.LEVEL = 'X';
      initial.STREAM = defaultCurriculum === 'MERDEKA' ? 'FASE_E' : 'MIPA';
      const availableTeachers = lookup.users.filter(u => u.ROLE === 'TEACHER');
      initial.HOMEROOM = availableTeachers[0]?.NAME || '';
      const sampleName = defaultCurriculum === 'MERDEKA' ? '10-A' : 'X MIPA 1';
      initial.NAME = sampleName;
      initial.ID = 'KLS-' + sanitizeIdentifier(sampleName);
    } else if (entityName === 'SUBJECTS') {
      initial.CURRICULUM = defaultCurriculum;
      initial.LEVEL = 'X';
      initial.CLASS_ID = '';
      initial.GROUP = 'Mata Pelajaran Umum (Wajib)';
      initial.KKM = 75;
      initial.HOURS_PER_WEEK = 4;
      const availableTeachers = lookup.users.filter(u => u.ROLE === 'TEACHER');
      initial.TEACHER_ID = availableTeachers[0]?.ID || '';

      const presets = OFFICIAL_SUBJECT_PRESETS.filter(p => p.curriculum === defaultCurriculum);
      const firstPreset = presets[0];
      if (firstPreset) {
        initial._selectedPresetCode = firstPreset.baseCode;
        initial._selectedPresetName = firstPreset.name;
        initial.CODE = generateSubjectCode(firstPreset.baseCode, 'X', undefined, defaultCurriculum);
        initial.ID = generateSubjectId(firstPreset.baseCode, 'X', undefined, defaultCurriculum);
        initial.NAME = generateSubjectDisplayName(firstPreset.name, undefined, 'X');
        initial.GROUP = firstPreset.group;
        initial.KKM = firstPreset.defaultKkm;
        initial.HOURS_PER_WEEK = firstPreset.defaultHours;
        if (firstPreset.teacherCode) {
          initial.TEACHER_CODE = firstPreset.teacherCode;
          const matched = lookup.users.find(u => u.ROLE === 'TEACHER' && u.TEACHER_CODE === firstPreset.teacherCode);
          if (matched) initial.TEACHER_ID = matched.ID;
        }
      }
    } else if (entityName === 'EXAMS') {
      initial.DURATION_MIN = 60;
      initial.STATUS = 'DRAFT';
      initial.RANDOMIZE = true;
      initial.MAX_VIOLATIONS = 3;
      initial.SUBJECT_ID = lookup.subjects[0]?.ID || '';
      initial.CLASS_ID = lookup.classes[0]?.ID || '';
      initial.ASSESSMENT_TYPE_ID = availableAssessmentTypes[0]?.CODE || availableAssessmentTypes[0]?.ID || 'SH';
      initial.EXAM_DATE = new Date().toISOString().slice(0, 10);
      initial.START_TIME = '08:00';
    } else if (entityName === 'QUESTIONS') {
      initial.TYPE = 'MCQ';
      initial.POINTS = 10;
      initial.EXAM_ID = lookup.exams[0]?.ID || '';
      const chosenExam = lookup.exams.find(e => e.ID === initial.EXAM_ID);
      initial.ASSESSMENT_TYPE_ID =
        selectedAssessmentCategory !== 'ALL'
          ? selectedAssessmentCategory
          : (chosenExam?.ASSESSMENT_TYPE_ID || availableAssessmentTypes[0]?.CODE || 'SH');
    } else if (entityName === 'ASSESSMENT_TYPES') {
      initial.CODE = 'SH';
      initial.NAME = 'Sumatif Harian (SH)';
      initial.CATEGORY = 'SUMATIF';
      initial.CURRICULUM = defaultCurriculum;
      initial.FREQUENCY = 'Rutin / Berkala per Bab';
      initial.WEIGHT = 20;
      initial.ACTIVE = true;
      initial.DESCRIPTION = 'Penilaian berkala untuk menguji ketercapaian Tujuan Pembelajaran (TP) setiap materi.';
    }
    setFormState(initial);
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    if (currentUser.ROLE === 'TEACHER' && entityName !== 'QUESTIONS') {
      setStatusMessage({
        type: 'error',
        text: 'Guru tidak memiliki izin untuk mengubah data master/dasar. Hak akses guru hanya untuk membuat dan mengelola soal pada Bank Soal.'
      });
      setTimeout(() => setStatusMessage(null), 4000);
      return;
    }
    setEditingItem(item);
    const initialItem = { ...item };
    if (
      entityName === 'USERS' &&
      (filterRole === 'TEACHER' || item.ROLE === 'TEACHER') &&
      (!initialItem.TEACHER_CODE || initialItem.TEACHER_CODE === '-' || !String(initialItem.TEACHER_CODE).trim())
    ) {
      const match = MA_CIKARAMAS_TEACHERS.find(t =>
        t.name.toLowerCase().trim() === (item.NAME || '').toLowerCase().trim() ||
        item.USERNAME === `guru-${t.code.toLowerCase()}` ||
        (t.code === 'T' && item.USERNAME === 'guru01') ||
        item.ID === `USR-GURU-${t.code}` ||
        (item.NAME && (t.name.toLowerCase().includes(item.NAME.toLowerCase()) || item.NAME.toLowerCase().includes(t.name.toLowerCase())))
      );
      if (match) {
        initialItem.TEACHER_CODE = match.code;
      }
    }
    setFormState({
      ...initialItem,
      _originalId: item.ID || item.CODE || item.USERNAME
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);
    try {
      const payloadToSave = {
        ...formState,
        _originalId: editingItem ? (editingItem.ID || editingItem.CODE || editingItem.USERNAME) : formState._originalId
      };
      await onSave(payloadToSave);
      setModalOpen(false);
      setEditingItem(null);
      setStatusMessage({ type: 'success', text: 'Data berhasil disimpan.' });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menyimpan data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    if (currentUser.ROLE === 'TEACHER' && entityName !== 'QUESTIONS') {
      setStatusMessage({
        type: 'error',
        text: 'Guru tidak memiliki hak untuk menghapus data dasar/master. Hak akses guru hanya untuk membuat dan mengelola soal pada Bank Soal.'
      });
      setTimeout(() => setStatusMessage(null), 4000);
      setDeleteConfirmId(null);
      return;
    }
    setLoading(true);
    try {
      await onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
      setStatusMessage({ type: 'success', text: 'Data berhasil dihapus.' });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menghapus data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (!bulkDeleteConfirm) return;
    if (currentUser.ROLE === 'TEACHER' && bulkDeleteConfirm.type !== 'QUESTIONS' && bulkDeleteConfirm.type !== 'PACKAGES') {
      setStatusMessage({
        type: 'error',
        text: 'Guru tidak memiliki hak untuk menghapus data dasar/master secara massal.'
      });
      setTimeout(() => setStatusMessage(null), 4000);
      setBulkDeleteConfirm(null);
      return;
    }
    setLoading(true);
    try {
      if (bulkDeleteConfirm.type === 'PACKAGES') {
        const targetIds = new Set(bulkDeleteConfirm.ids);
        // Hapus seluruh butir soal yang tertaut ke paket-paket ini
        const allQ = getStorage<Question[]>(STORAGE_KEYS.QUESTIONS, []);
        const remainingQ = allQ.filter(q => !targetIds.has(q.EXAM_ID) && (!q.BANK_ID || !targetIds.has(q.BANK_ID)));
        setStorage(STORAGE_KEYS.QUESTIONS, remainingQ);
        safeStorageSet('LMS_QUESTIONS_USER_MODIFIED', 'true');

        // Hapus dari bank soal persisten
        bulkDeleteConfirm.ids.forEach(id => deleteQuestionBank(id));

        try {
          await onDelete(bulkDeleteConfirm.ids, 'EXAMS');
        } catch {}

        setSelectedPackageIds(new Set());
        if (selectedBankPackageId && bulkDeleteConfirm.ids.includes(selectedBankPackageId)) {
          setSelectedBankPackageId(null);
        }
        setStatusMessage({
          type: 'success',
          text: `Berhasil menghapus ${bulkDeleteConfirm.count} paket bank soal beserta seluruh butir soalnya.`
        });
      } else if (bulkDeleteConfirm.type === 'QUESTIONS') {
        await onDelete(bulkDeleteConfirm.ids, 'QUESTIONS');
        safeStorageSet('LMS_QUESTIONS_USER_MODIFIED', 'true');
        setSelectedQuestionIds(new Set());
        setStatusMessage({
          type: 'success',
          text: `Berhasil menghapus ${bulkDeleteConfirm.count} butir soal terpilih.`
        });
      } else {
        await onDelete(bulkDeleteConfirm.ids, entityName);
        setSelectedRowIds(new Set());
        setStatusMessage({
          type: 'success',
          text: `Berhasil menghapus ${bulkDeleteConfirm.count} data terpilih.`
        });
      }
      setBulkDeleteConfirm(null);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menghapus data terpilih.' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const exportData = sortedAndFilteredRows.map(r => {
      const clean = { ...r };
      delete clean.PASSWORD_HASH;
      return clean;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, entityName.slice(0, 31));
    XLSX.writeFile(workbook, `${entityName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      if (entityName === 'QUESTIONS') {
        const defaultExamId = importTargetExamId || lookup.exams[0]?.ID || 'EXAM-01';
        let parsedQuestions: ParsedQuestionItem[] = [];

        if (file.name.toLowerCase().endsWith('.docx')) {
          const docxResults = await parseQuestionsFromWord(file, defaultExamId);
          if (docxResults.length === 0) {
            throw new Error('Tidak ditemukan butir soal yang valid dalam dokumen Word. Pastikan mengikuti format tabel atau penomoran naskah soal.');
          }
          parsedQuestions = docxResults.map(q => {
            const warnings: string[] = [];
            if (!q.QUESTION) warnings.push('Teks pertanyaan belum terisi');
            if (q.TYPE !== 'ESSAY' && !q.ANSWER) warnings.push('Kunci jawaban belum terisi');
            if (q.TYPE === 'MCQ' && (!q.OPTION_A || !q.OPTION_B)) warnings.push('Pilihan A & B wajib diisi untuk PG');
            return {
              ...q,
              warnings
            };
          });
          setImportFileType('WORD');
        } else {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheetName = workbook.SheetNames.includes('BANK_SOAL') ? 'BANK_SOAL' : workbook.SheetNames[0];
          const jsonRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

          if (jsonRows.length === 0) {
            throw new Error('File Excel tidak memuat baris data atau sheet kosong.');
          }
          parsedQuestions = parseExcelQuestionRows(jsonRows, defaultExamId);
          setImportFileType(file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'EXCEL');
        }

        if (parsedQuestions.length === 0) {
          throw new Error('Tidak ditemukan butir soal yang dapat diproses dalam file ini.');
        }

        setQuestionPreviewData(parsedQuestions);
        setImportFileName(file.name);
        setImportFileSize(file.size);
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const jsonRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

        if (jsonRows.length === 0) {
          throw new Error('File Excel tidak memuat baris data atau sheet kosong.');
        }

        setGenericPreviewRows(jsonRows);
        setImportFileName(file.name);
        setImportFileSize(file.size);
        setImportFileType(file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'EXCEL');
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal memproses file upload.' });
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleConfirmQuestionImport = async () => {
    if (!questionPreviewData || questionPreviewData.length === 0) return;
    setIsImportSubmitting(true);
    try {
      const finalRows = questionPreviewData.map(q => {
        const examId = importTargetExamId || q.EXAM_ID || lookup.exams[0]?.ID || 'EXAM-01';
        const ex = lookup.exams.find(e => e.ID === examId);
        const assessmentTypeId =
          q.ASSESSMENT_TYPE_ID ||
          ex?.ASSESSMENT_TYPE_ID ||
          (selectedAssessmentCategory !== 'ALL' ? selectedAssessmentCategory : 'SH');
        return {
          ...q,
          EXAM_ID: examId,
          ASSESSMENT_TYPE_ID: assessmentTypeId
        };
      });
      const res = await onImport(finalRows);
      resetImportState();
      setImportModalOpen(false);
      setStatusMessage({
        type: 'success',
        text: `Import berhasil: ${res.imported} butir soal disimpan ke database${res.skipped > 0 ? ` (${res.skipped} dilewati)` : ''}.`
      });
      setTimeout(() => setStatusMessage(null), 4500);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menyimpan soal ke database.' });
    } finally {
      setIsImportSubmitting(false);
    }
  };

  const handleConfirmGenericImport = async () => {
    if (!genericPreviewRows || genericPreviewRows.length === 0) return;
    if (currentUser.ROLE === 'TEACHER' && entityName !== 'QUESTIONS') {
      setStatusMessage({
        type: 'error',
        text: 'Guru tidak memiliki izin untuk mengimpor data dasar/master.'
      });
      setTimeout(() => setStatusMessage(null), 4000);
      return;
    }
    setIsImportSubmitting(true);
    try {
      const res = await onImport(genericPreviewRows);
      resetImportState();
      setImportModalOpen(false);
      setStatusMessage({
        type: 'success',
        text: `Import selesai: ${res.imported} baris berhasil disimpan${res.skipped > 0 ? `, ${res.skipped} dilewati` : ''}.`
      });
      setTimeout(() => setStatusMessage(null), 4500);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menyimpan data ke database.' });
    } finally {
      setIsImportSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1C1E] tracking-tight">{title}</h1>
          <p className="text-xs sm:text-sm text-[#6C757D] mt-1">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUser.ROLE === 'ADMIN' && entityName === 'USERS' && filterRole === 'STUDENT' && (
            <button
              type="button"
              onClick={() => downloadStudentTemplate(lookup.classes)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#E8F0FE] border border-[#B3D1FF] text-[#0052CC] hover:bg-[#D2E3FC] font-medium text-xs transition-colors shadow-xs"
              title="Unduh file format Excel untuk import data siswa"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#0052CC]" />
              <span>Template Siswa</span>
            </button>
          )}

          {currentUser.ROLE === 'ADMIN' && entityName === 'USERS' && filterRole === 'TEACHER' && (
            <>
              <button
                type="button"
                onClick={() => downloadTeacherTemplate()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#E6F4EA] border border-[#CEEAD6] text-[#137333] hover:bg-[#D4EDDA] font-medium text-xs transition-colors shadow-xs"
                title="Unduh file format Excel untuk import data guru"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#137333]" />
                <span>Template Guru</span>
              </button>
              <button
                type="button"
                onClick={handleAutoSyncTeacherCodes}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#E8F0FE] border border-[#B3D1FF] text-[#0052CC] hover:bg-[#D2E3FC] font-medium text-xs transition-colors shadow-xs"
                title="Sinkronkan atau isi otomatis kode huruf guru (A-T) sesuai master jadwal Cikaramas"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#0052CC]" />
                <span>Sinkronkan Kode Guru</span>
              </button>
            </>
          )}

          {currentUser.ROLE === 'ADMIN' && entityName === 'CLASSES' && (
            <button
              type="button"
              onClick={() => downloadClassTemplate(lookup.users)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#E8F0FE] border border-[#B3D1FF] text-[#0052CC] hover:bg-[#D2E3FC] font-medium text-xs transition-colors shadow-xs"
              title="Unduh file format Excel untuk import data kelas dan referensi guru"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#0052CC]" />
              <span>Template Kelas</span>
            </button>
          )}

          {currentUser.ROLE === 'ADMIN' && entityName === 'USERS' && !filterRole && (
            <>
              <button
                type="button"
                onClick={() => downloadStudentTemplate(lookup.classes)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#E8F0FE] border border-[#B3D1FF] text-[#0052CC] hover:bg-[#D2E3FC] font-medium text-xs transition-colors shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Template Siswa</span>
              </button>
              <button
                type="button"
                onClick={() => downloadTeacherTemplate()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#E6F4EA] border border-[#CEEAD6] text-[#137333] hover:bg-[#D4EDDA] font-medium text-xs transition-colors shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Template Guru</span>
              </button>
            </>
          )}

          {entityName === 'QUESTIONS' && (
            <>
              <button
                type="button"
                onClick={() => setBankSoalModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
                title="Import naskah bank soal dari file Word (.docx) atau Excel (.xlsx) dengan deteksi otomatis"
              >
                <Upload className="w-4 h-4 text-white" />
                <span>Import Bank Soal (Word / Excel)</span>
              </button>
              <button
                type="button"
                onClick={() => setWordModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#E8F0FE] border border-[#B3D1FF] text-[#0052CC] hover:bg-[#D2E3FC] font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                title="Import naskah soal langsung dari file Microsoft Word (.docx)"
              >
                <FileText className="w-3.5 h-3.5 text-[#0052CC]" />
                <span>Import Word Saja</span>
              </button>
              <button
                type="button"
                onClick={() => downloadQuestionsWordTemplate(settings)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#E8F0FE] border border-[#B3D1FF] text-[#0052CC] hover:bg-[#D2E3FC] font-medium text-xs transition-colors shadow-xs"
                title="Unduh template resmi Microsoft Word (.docx) untuk penulisan dan import soal CBT"
              >
                <Download className="w-3.5 h-3.5 text-[#0052CC]" />
                <span>Template Word</span>
              </button>
              <button
                type="button"
                onClick={() => downloadQuestionsTemplate(lookup.exams, lookup.exams[0]?.ID || 'EXAM-01')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#E6F4EA] border border-[#CEEAD6] text-[#137333] hover:bg-[#D4EDDA] font-medium text-xs transition-colors shadow-xs"
                title="Unduh file format Excel (.xlsx) dengan kolom OPSI_A s/d E terpisah"
              >
                <Download className="w-3.5 h-3.5 text-[#137333]" />
                <span>Template Excel (A-E)</span>
              </button>
              <button
                type="button"
                onClick={() => downloadQuestionsSingleColumnTemplate(lookup.exams, lookup.exams[0]?.ID || 'EXAM-01')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 font-medium text-xs transition-colors shadow-xs"
                title="Unduh format praktis: semua opsi jawaban digabung dalam 1 kolom OPSI_PILIHAN"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Template Excel (1 Kolom)</span>
              </button>
            </>
          )}

          {entityName === 'EXAMS' && (
            <button
              type="button"
              onClick={() => setWordModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#E8F0FE] border border-[#B3D1FF] text-[#0052CC] hover:bg-[#D2E3FC] font-semibold text-xs transition-colors shadow-xs"
              title="Import naskah soal langsung dari dokumen Word (.docx) ke salah satu ujian"
            >
              <FileText className="w-3.5 h-3.5 text-[#0052CC]" />
              <span>Import Soal Word</span>
            </button>
          )}

          {isEditable && (
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white border border-[#CED4DA] text-[#1A1C1E] hover:bg-[#F8F9FA] font-medium text-xs transition-colors shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 text-[#0052CC]" />
              <span>Import Excel</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white border border-[#CED4DA] text-[#1A1C1E] hover:bg-[#F8F9FA] font-medium text-xs transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#0052CC]" />
            <span>Export Excel</span>
          </button>

          {isEditable && (
            <button
              type="button"
              onClick={() => {
                if (entityName === 'QUESTIONS') {
                  setNewBankPackageModalOpen(true);
                } else {
                  openAddModal();
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{entityName === 'QUESTIONS' ? 'Buat Bank Soal Baru' : 'Tambah Data'}</span>
            </button>
          )}
        </div>
      </div>

      {currentUser.ROLE === 'TEACHER' && entityName !== 'QUESTIONS' && (
        <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 text-xs text-blue-900">
            <span className="px-2 py-0.5 rounded-md bg-[#0052CC] text-white shrink-0 font-bold text-[10px] tracking-wider uppercase">
              Mode Lihat Saja
            </span>
            <span>
              Hak akses guru pada data dasar/master bersifat <b>hanya lihat (read-only)</b>. Penambahan dan pengeditan data dasar dikelola oleh Administrator. Guru memiliki hak akses penuh untuk <b>membuat, mengedit, dan mengimpor soal</b> pada menu <b>Bank Soal</b>.
            </span>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('questions')}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0052CC] hover:bg-[#0047B3] text-white font-semibold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Buka Bank Soal (Buat Soal) →</span>
            </button>
          )}
        </div>
      )}

      {statusMessage && (
        <div
          className={`p-3 rounded-md text-xs flex items-center gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]'
              : 'bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF]'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#137333] flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#C5221F] flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Showcase Bank Soal Berdasarkan Jenis Penilaian (Panjang istilah disesuaikan frekuensi) */}
      {entityName === 'QUESTIONS' && (
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-[#0052CC]/5 via-[#0052CC]/10 to-transparent p-4 rounded-xl border border-[#B3D1FF] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0052CC] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Folder className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#1A1C1E] flex items-center gap-2">
                  <span>Kategori Bank Soal Berdasarkan Jenis Penilaian</span>
                  <span className="text-[10px] bg-[#E8F0FE] text-[#0052CC] border border-[#B3D1FF] px-2 py-0.5 rounded-full font-bold">
                    Sesuai Frekuensi
                  </span>
                </h2>
                <p className="text-xs text-[#495057] mt-0.5">
                  Soal otomatis dikelompokkan ke dalam Bank Soal berdasarkan jenis penilaian yang dipilih: Sumatif Harian (rutin per bab), Sumatif Awal Semester, Sumatif Tengah Semester (STS), Sumatif Akhir Semester (SAS), dan Sumatif Akhir Jenjang (SAJ).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start md:self-center flex-shrink-0">
              <span className="text-xs font-semibold text-[#6C757D]">Total Bank Soal:</span>
              <span className="px-2.5 py-1 rounded-md bg-[#0052CC] text-white font-bold text-xs shadow-xs">
                {rows.length} Soal
              </span>
            </div>
          </div>

          {/* Folder Filter Chips for Bank Soal - Dinamis sesuai pengaturan di Jenis Penilaian */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {/* Folder 1: Semua Bank Soal */}
            <button
              type="button"
              onClick={() => setSelectedAssessmentCategory('ALL')}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedAssessmentCategory === 'ALL'
                  ? 'bg-[#0052CC] text-white border-[#0052CC] shadow-md ring-2 ring-[#0052CC]/30'
                  : 'bg-white border-[#CED4DA] hover:border-[#0052CC] text-[#1A1C1E] hover:bg-[#F8F9FA]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                  selectedAssessmentCategory === 'ALL' ? 'bg-white/20 text-white' : 'bg-[#E8F0FE] text-[#0052CC]'
                }`}>
                  <FolderOpen className="w-4 h-4" />
                </div>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                  selectedAssessmentCategory === 'ALL' ? 'bg-white/25 text-white' : 'bg-[#F1F3F5] text-[#495057]'
                }`}>
                  {questionPackages.length} Paket
                </span>
              </div>
              <div className="mt-2">
                <div className="font-bold text-xs truncate">Semua Bank Soal</div>
                <div className={`text-[10px] mt-0.5 ${selectedAssessmentCategory === 'ALL' ? 'text-white/80' : 'text-[#6C757D]'}`}>
                  {rows.length} Total Butir Soal
                </div>
              </div>
            </button>

            {/* Folder Dinamis dari Jenis Penilaian */}
            {availableAssessmentTypes.map((at, idx) => {
              const atCode = at.CODE || at.ID;
              const isSelected = selectedAssessmentCategory === atCode || selectedAssessmentCategory === at.ID;

              // Count packages and questions for this assessment type
              const matchingPkgs = questionPackages.filter(p => {
                const pType = p.ASSESSMENT_TYPE_ID || 'SH';
                return pType === atCode || pType === at.ID;
              });
              const pkgCount = matchingPkgs.length;
              const qCount = matchingPkgs.reduce((acc, p) => acc + p.questionCount, 0) || (questionCountsByAssessment[atCode] || 0);

              // Palette variations for visual clarity
              const paletteColors = [
                { bg: 'bg-[#137333]', lightBg: 'bg-[#E6F4EA]', text: 'text-[#137333]', border: 'border-[#137333]', ring: 'ring-[#137333]/30' },
                { bg: 'bg-[#0052CC]', lightBg: 'bg-[#E8F0FE]', text: 'text-[#0052CC]', border: 'border-[#0052CC]', ring: 'ring-[#0052CC]/30' },
                { bg: 'bg-[#7E22CE]', lightBg: 'bg-purple-100', text: 'text-[#7E22CE]', border: 'border-[#7E22CE]', ring: 'ring-[#7E22CE]/30' },
                { bg: 'bg-[#0284C7]', lightBg: 'bg-sky-100', text: 'text-[#0284C7]', border: 'border-[#0284C7]', ring: 'ring-[#0284C7]/30' },
                { bg: 'bg-[#C2410C]', lightBg: 'bg-orange-100', text: 'text-[#C2410C]', border: 'border-[#C2410C]', ring: 'ring-[#C2410C]/30' },
                { bg: 'bg-[#0F9D58]', lightBg: 'bg-emerald-100', text: 'text-[#0F9D58]', border: 'border-[#0F9D58]', ring: 'ring-[#0F9D58]/30' }
              ];
              const pal = paletteColors[idx % paletteColors.length];

              return (
                <button
                  key={at.ID || at.CODE}
                  type="button"
                  onClick={() => setSelectedAssessmentCategory(isSelected ? 'ALL' : atCode)}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? `${pal.bg} text-white ${pal.border} shadow-md ring-2 ${pal.ring}`
                      : `bg-white border-[#CED4DA] hover:${pal.border} text-[#1A1C1E] hover:bg-[#F8F9FA]`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                      isSelected ? 'bg-white/20 text-white' : `${pal.lightBg} ${pal.text}`
                    }`}>
                      <Layers className="w-4 h-4" />
                    </div>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-white/25 text-white' : `${pal.lightBg} ${pal.text}`
                    }`}>
                      {pkgCount} Paket
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="font-bold text-xs truncate">[{at.CODE}] {at.NAME}</div>
                    <div className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-white/85' : 'text-[#6C757D]'}`}>
                      {at.FREQUENCY || at.CATEGORY || 'Penilaian'} • {qCount} Soal
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Header Info Banner for ASSESSMENT_TYPES */}
      {entityName === 'ASSESSMENT_TYPES' && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-[#0052CC]/10 to-transparent p-4 rounded-xl border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0052CC] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1A1C1E] flex items-center gap-2">
                <span>Pengaturan Master Jenis Penilaian Sekolah</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  Standar Kurikulum
                </span>
              </h2>
              <p className="text-xs text-[#495057] mt-0.5">
                Jenis penilaian ini akan otomatis muncul sebagai opsi pilihan ketika guru mata pelajaran atau admin membuat soal CBT dan jadwal ujian. Frekuensi pelaksanaan mengatur ringkasnya istilah penilaian (rutin per bab, tengah semester, akhir semester).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-center flex-shrink-0">
            <button
              type="button"
              onClick={async () => {
                const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
                  ? (() => { try { return window.confirm('Terapkan paket master jenis penilaian standar Kurikulum Merdeka? Data yang ada akan disinkronkan.'); } catch { return true; } })()
                  : true;
                if (confirmed) {
                  setLoading(true);
                  try {
                    await onImport(OFFICIAL_ASSESSMENT_PRESETS_MERDEKA);
                    setStatusMessage({ type: 'success', text: 'Standar Kurikulum Merdeka berhasil diterapkan!' });
                  } catch (e: any) {
                    setStatusMessage({ type: 'error', text: e.message || 'Gagal menerapkan standar' });
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              className="px-3 py-1.5 rounded-md bg-white border border-[#B3D1FF] text-[#0052CC] hover:bg-[#E8F0FE] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Standar Merdeka
            </button>
            <button
              type="button"
              onClick={async () => {
                const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
                  ? (() => { try { return window.confirm('Terapkan paket master jenis penilaian standar Kurikulum 2013 (K13)?'); } catch { return true; } })()
                  : true;
                if (confirmed) {
                  setLoading(true);
                  try {
                    await onImport(OFFICIAL_ASSESSMENT_PRESETS_K13);
                    setStatusMessage({ type: 'success', text: 'Standar Kurikulum 2013 berhasil diterapkan!' });
                  } catch (e: any) {
                    setStatusMessage({ type: 'error', text: e.message || 'Gagal menerapkan standar' });
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              className="px-3 py-1.5 rounded-md bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Standar K13
            </button>
          </div>
        </div>
      )}

      {/* Teacher notice for CLASSES */}
      {entityName === 'CLASSES' && currentUser.ROLE === 'TEACHER' && (
        <div className="bg-[#EBF3FB] border border-[#B3D1FF] p-3.5 rounded-lg flex items-start gap-2.5 text-xs text-[#0052CC]">
          <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#0052CC]" />
          <div>
            <span className="font-semibold">Akses Terbatas Guru:</span> Anda hanya melihat daftar rombongan belajar (kelas) yang terdapat dalam jadwal mengajar dan tugas Anda (Guru: <strong className="font-bold">{currentUser.NAME}</strong> - Kode: <strong className="font-bold">{currentUser.TEACHER_CODE || 'T'}</strong>). Pengelolaan master kelas dilakukan oleh Administrator.
          </div>
        </div>
      )}

      {/* Teacher notice for SUBJECTS */}
      {entityName === 'SUBJECTS' && currentUser.ROLE === 'TEACHER' && (
        <div className="bg-[#EBF3FB] border border-[#B3D1FF] p-3.5 rounded-lg flex items-start gap-2.5 text-xs text-[#0052CC]">
          <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#0052CC]" />
          <div>
            <span className="font-semibold">Mata Pelajaran Ampu Guru:</span> Menampilkan mata pelajaran yang diampu oleh <strong className="font-bold">{currentUser.NAME}</strong> (Kode Guru: <strong className="font-bold">{currentUser.TEACHER_CODE || 'T'}</strong>). Mata pelajaran di luar ampu Anda otomatis disembunyikan demi ketertiban jadwal dan penilaian.
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white border border-[#DEE2E6] rounded-lg overflow-hidden shadow-xs">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-[#DEE2E6] space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#ADB5BD]" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={
                  entityName === 'USERS' && filterRole === 'STUDENT'
                    ? 'Cari nama siswa, NIS, email...'
                    : 'Cari data di tabel...'
                }
                className="w-full pl-9 pr-3.5 py-2 border border-[#CED4DA] rounded-md text-xs outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
              />
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              {/* Class Filter Dropdown for Students */}
              {entityName === 'USERS' && filterRole === 'STUDENT' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[#6C757D] font-medium text-[11px] hidden sm:inline">Kelas:</span>
                  <select
                    value={selectedClassFilter}
                    onChange={e => setSelectedClassFilter(e.target.value)}
                    className="px-2.5 py-1.5 border border-[#CED4DA] rounded-md bg-white text-[#1A1C1E] text-xs outline-none focus:border-[#0052CC] shadow-2xs font-medium cursor-pointer"
                    title="Pilih kelas untuk memfilter data siswa"
                  >
                    <option value="ALL">Semua Kelas ({studentCountTotal} Siswa)</option>
                    {lookup.classes.map(c => (
                      <option key={c.ID} value={c.ID}>
                        {c.NAME} ({studentCountPerClass[c.ID] || 0} Siswa)
                      </option>
                    ))}
                    {studentCountPerClass['UNASSIGNED'] ? (
                      <option value="UNASSIGNED">
                        Belum Ada Kelas ({studentCountPerClass['UNASSIGNED']} Siswa)
                      </option>
                    ) : null}
                  </select>
                </div>
              )}

              {/* Filter Kurikulum for CLASSES */}
              {entityName === 'CLASSES' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[#6C757D] font-medium text-[11px] hidden sm:inline">Kurikulum:</span>
                  <select
                    value={curriculumFilter}
                    onChange={e => setCurriculumFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 border border-[#CED4DA] rounded-md bg-white text-[#1A1C1E] text-xs outline-none focus:border-[#0052CC] shadow-2xs font-medium cursor-pointer"
                    title="Filter kelas berdasarkan kurikulum"
                  >
                    <option value="ALL">Semua Kurikulum</option>
                    <option value="MERDEKA">Kurikulum Merdeka</option>
                    <option value="K13">Kurikulum 2013 (K13)</option>
                  </select>
                </div>
              )}

              {/* Filter Tingkat, Kelompok & Kurikulum for SUBJECTS */}
              {entityName === 'SUBJECTS' && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#6C757D] font-medium text-[11px] hidden sm:inline">Kurikulum:</span>
                    <select
                      value={curriculumFilter}
                      onChange={e => setCurriculumFilter(e.target.value as any)}
                      className="px-2.5 py-1.5 border border-[#CED4DA] rounded-md bg-white text-[#1A1C1E] text-xs outline-none focus:border-[#0052CC] shadow-2xs font-medium cursor-pointer"
                      title="Filter mata pelajaran berdasarkan kurikulum"
                    >
                      <option value="ALL">Semua Kurikulum</option>
                      <option value="MERDEKA">Kurikulum Merdeka</option>
                      <option value="K13">Kurikulum 2013 (K13)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[#6C757D] font-medium text-[11px] hidden sm:inline">Tingkat:</span>
                    <select
                      value={subjectLevelFilter}
                      onChange={e => setSubjectLevelFilter(e.target.value)}
                      className="px-2.5 py-1.5 border border-[#CED4DA] rounded-md bg-white text-[#1A1C1E] text-xs outline-none focus:border-[#0052CC] shadow-2xs font-medium cursor-pointer"
                      title="Filter mata pelajaran berdasarkan tingkat kelas"
                    >
                      <option value="ALL">Semua Tingkat (X, XI, XII)</option>
                      <option value="X">Kelas X (Fase E)</option>
                      <option value="XI">Kelas XI (Fase F)</option>
                      <option value="XII">Kelas XII (Fase F)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[#6C757D] font-medium text-[11px] hidden sm:inline">Kelompok:</span>
                    <select
                      value={subjectGroupFilter}
                      onChange={e => setSubjectGroupFilter(e.target.value)}
                      className="px-2.5 py-1.5 border border-[#CED4DA] rounded-md bg-white text-[#1A1C1E] text-xs outline-none focus:border-[#0052CC] shadow-2xs font-medium cursor-pointer"
                      title="Filter kelompok kurikulum mata pelajaran"
                    >
                      <option value="ALL">Semua Kelompok</option>
                      <option value="Umum">Umum (Wajib)</option>
                      <option value="MIPA">Peminatan MIPA</option>
                      <option value="IPS">Peminatan IPS</option>
                      <option value="Muatan Lokal">Muatan Lokal & Kejuruan</option>
                    </select>
                  </div>
                </>
              )}

              {/* Alphabetical Sort Button (especially for Students) */}
              <button
                type="button"
                onClick={() => {
                  if (sortField === 'NAME') {
                    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
                  } else {
                    setSortField('NAME');
                    setSortOrder('asc');
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors shadow-2xs ${
                  sortField === 'NAME'
                    ? 'bg-[#E8F0FE] border-[#B3D1FF] text-[#0052CC]'
                    : 'bg-white border-[#CED4DA] text-[#495057] hover:bg-[#F8F9FA]'
                }`}
                title="Urutkan nama sesuai abjad alfabetis"
              >
                {sortField === 'NAME' && sortOrder === 'desc' ? (
                  <ArrowDownAZ className="w-3.5 h-3.5 text-[#0052CC]" />
                ) : (
                  <ArrowUpAZ className="w-3.5 h-3.5 text-[#0052CC]" />
                )}
                <span>Abjad {sortField === 'NAME' && sortOrder === 'desc' ? 'Z - A' : 'A - Z'}</span>
              </button>

              {/* Buat/Tambah Bank Soal Button & Bersihkan Demo (Sejajar dengan Abjad A - Z) */}
              {entityName === 'QUESTIONS' && isEditable && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCleanDemoConfirmOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-[#CED4DA] hover:bg-[#FFF5F5] hover:border-[#FAD2CF] text-[#DC3545] text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                    title="Bersihkan paket bank soal dummy bawaan & pulihkan Bank Soal Fisika X"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Bersihkan Paket Demo</span>
                  </button>

                  <button
                    type="button"
                    onClick={openCreateBankPackageModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    title="Buat/Tambah wadah Bank Soal baru (pilih jenis penilaian, kelas berlaku, mapel, jumlah soal)"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Buat Bank Soal</span>
                  </button>
                </div>
              )}

              {/* Group View Toggle for Students */}
              {entityName === 'USERS' && filterRole === 'STUDENT' && (
                <div className="inline-flex rounded-md border border-[#CED4DA] bg-[#F8F9FA] p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setGroupByClass(true)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      groupByClass
                        ? 'bg-white text-[#0052CC] shadow-xs font-bold'
                        : 'text-[#6C757D] hover:text-[#1A1C1E]'
                    }`}
                    title="Tampilkan siswa dikelompokkan per kelas"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Per Kelas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupByClass(false)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      !groupByClass
                        ? 'bg-white text-[#0052CC] shadow-xs font-bold'
                        : 'text-[#6C757D] hover:text-[#1A1C1E]'
                    }`}
                    title="Tampilkan semua siswa dalam satu tabel lengkap"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Tabel Lengkap</span>
                  </button>
                </div>
              )}

              {/* View Toggle for Bank Soal */}
              {entityName === 'QUESTIONS' && (
                <div className="inline-flex rounded-md border border-[#CED4DA] bg-[#F8F9FA] p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      setQuestionViewMode('PACKAGES');
                      setSelectedBankPackageId(null);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                      questionViewMode === 'PACKAGES' && !selectedBankPackageId
                        ? 'bg-white text-[#0052CC] shadow-xs font-bold'
                        : 'text-[#6C757D] hover:text-[#1A1C1E]'
                    }`}
                    title="Tabel Bank Soal berdasarkan Jenis Penilaian, Kelas, Mapel, dan Jumlah Soal"
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>Tabel Bank Soal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuestionViewMode('ALL_QUESTIONS');
                      setSelectedBankPackageId(null);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                      questionViewMode === 'ALL_QUESTIONS'
                        ? 'bg-white text-[#0052CC] shadow-xs font-bold'
                        : 'text-[#6C757D] hover:text-[#1A1C1E]'
                    }`}
                    title="Tampilkan semua butir soal individual"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Semua Butir Soal</span>
                  </button>
                </div>
              )}

              {/* Page Size Selector */}
              <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                <span className="text-[#6C757D] font-medium text-[11px] hidden sm:inline">Tampilkan:</span>
                <select
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                  className="px-2.5 py-1.5 border border-[#CED4DA] rounded-md bg-white text-[#1A1C1E] text-xs outline-none focus:border-[#0052CC] shadow-2xs font-medium cursor-pointer"
                  title="Pilihan jumlah data yang ditampilkan"
                >
                  <option value={10}>10 per halaman</option>
                  <option value={25}>25 per halaman</option>
                  <option value={50}>50 per halaman</option>
                  <option value={100}>100 per halaman</option>
                  <option value={0}>Semua data</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Teacher Access Notification Banner for Subjects */}
        {currentUser.ROLE === 'TEACHER' && entityName === 'SUBJECTS' && (
          <div className="mx-4 mt-3 p-3 rounded-lg bg-[#EBF3FB] border border-[#B3D1FF] flex flex-wrap items-center justify-between gap-3 text-xs text-[#0052CC]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#0052CC]" />
              <span>
                <b>Akses Guru Pengampu:</b> Anda hanya dapat melihat dan mengelola mata pelajaran yang Anda ampu{' '}
                {currentUser.TEACHER_CODE ? `[Kode Guru: ${currentUser.TEACHER_CODE}]` : ''}.
              </span>
            </div>
            <span className="font-bold shrink-0 bg-white px-2.5 py-0.5 rounded border border-[#B3D1FF] text-[11px]">
              {sortedAndFilteredRows.length} Mata Pelajaran Diampu
            </span>
          </div>
        )}

        {/* Teacher Access Notification Banner for Questions */}
        {currentUser.ROLE === 'TEACHER' && entityName === 'QUESTIONS' && (
          <div className="mx-4 mt-3 p-3 rounded-lg bg-[#EBF3FB] border border-[#B3D1FF] flex items-center justify-between gap-3 text-xs text-[#0052CC]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#0052CC]" />
              <span>
                <b>Akses Guru Pengampu:</b> Menampilkan bank soal untuk mata pelajaran yang Anda ampu{' '}
                {teacherSubjects.length > 0 ? (
                  <b>({teacherSubjects.map(s => s.NAME).join(', ')})</b>
                ) : (
                  <span>(Belum ada mata pelajaran yang diampu)</span>
                )}
                {lookup?.exams?.some(e => e.CREATED_BY === currentUser.ID) ? ' dan paket yang Anda buat.' : '.'}
              </span>
            </div>
            <span className="font-bold shrink-0 bg-white px-2.5 py-0.5 rounded border border-[#B3D1FF] text-[11px]">
              {questionPackages.length} Paket Bank Soal
            </span>
          </div>
        )}

        {/* Bulk Selection Bar for Packages View */}
        {isEditable && isBankPackagesMode && selectedPackageIds.size > 0 && (
          <div className="mx-4 mt-3 px-4 py-3 bg-[#FCE8E6] border border-[#FAD2CF] rounded-lg flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#DC3545] text-white flex items-center justify-center font-bold text-xs">
                {selectedPackageIds.size}
              </div>
              <div className="text-xs text-[#1A1C1E]">
                <span className="font-bold text-[#C5221F]">{selectedPackageIds.size} Paket Bank Soal Dicentang</span>
                <span className="text-[#6C757D] ml-2">
                  (Total{' '}
                  {Array.from(selectedPackageIds).reduce((acc, id) => {
                    const p = questionPackages.find(x => x.ID === id);
                    return acc + (p?.questionCount || 0);
                  }, 0)}{' '}
                  butir soal di dalamnya)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedPackageIds(new Set())}
                className="px-3 py-1.5 rounded-md border border-[#CED4DA] bg-white hover:bg-[#F8F9FA] text-[#495057] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                Batal Centang
              </button>
              <button
                type="button"
                onClick={() => {
                  let totalQ = 0;
                  selectedPackageIds.forEach(id => {
                    const p = questionPackages.find(x => x.ID === id);
                    if (p) totalQ += (p.questionCount || 0);
                  });
                  setBulkDeleteConfirm({
                    type: 'PACKAGES',
                    ids: Array.from(selectedPackageIds),
                    count: selectedPackageIds.size,
                    totalQuestions: totalQ
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#DC3545] hover:bg-[#C82333] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus ({selectedPackageIds.size}) Paket Terpilih</span>
              </button>
            </div>
          </div>
        )}

        {/* Bulk Selection Bar for Regular Tables / All Questions */}
        {isEditable && !isBankPackagesMode && !selectedBankPackageId && selectedRowIds.size > 0 && (
          <div className="mx-4 mt-3 px-4 py-3 bg-[#FCE8E6] border border-[#FAD2CF] rounded-lg flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#DC3545] text-white flex items-center justify-center font-bold text-xs">
                {selectedRowIds.size}
              </div>
              <span className="text-xs font-bold text-[#C5221F]">
                {selectedRowIds.size} data {entityName.toLowerCase()} dicentang
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedRowIds(new Set())}
                className="px-3 py-1.5 rounded-md border border-[#CED4DA] bg-white hover:bg-[#F8F9FA] text-[#495057] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                Batal Centang
              </button>
              <button
                type="button"
                onClick={() => {
                  setBulkDeleteConfirm({
                    type: 'ROWS',
                    ids: Array.from(selectedRowIds),
                    count: selectedRowIds.size
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#DC3545] hover:bg-[#C82333] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus ({selectedRowIds.size}) Data Terpilih</span>
              </button>
            </div>
          </div>
        )}

        {/* View Mode 1: Grouped by Class (for Students) */}
        {entityName === 'USERS' && filterRole === 'STUDENT' && groupByClass ? (
          <div className="p-4 space-y-4 bg-[#F8F9FA]/50">
            {groupedStudentsByClass.length > 0 ? (
              groupedStudentsByClass.map(group => {
                const isCollapsed = !!collapsedClasses[group.id];
                const studentsToShow = pageSize > 0 ? group.students.slice(0, pageSize) : group.students;
                const hasMore = pageSize > 0 && group.students.length > pageSize;

                return (
                  <div
                    key={group.id}
                    className="border border-[#DEE2E6] rounded-lg overflow-hidden bg-white shadow-xs"
                  >
                    {/* Class Group Header */}
                    <div
                      onClick={() =>
                        setCollapsedClasses(prev => ({ ...prev, [group.id]: !prev[group.id] }))
                      }
                      className="px-4 py-3 bg-[#FFFFFF] hover:bg-[#F8F9FA] border-b border-[#DEE2E6] flex items-center justify-between cursor-pointer transition-colors select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-[#E8F0FE] text-[#0052CC] grid place-items-center flex-shrink-0">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#1A1C1E]">{group.name}</span>
                            {group.level && group.level !== '-' && (
                              <span className="px-2 py-0.5 rounded bg-[#F1F3F5] text-[#495057] border border-[#DEE2E6] text-[10px] font-semibold">
                                Tingkat {group.level}
                              </span>
                            )}
                          </div>
                          {group.homeroom && group.homeroom !== '-' && (
                            <div className="text-[11px] text-[#6C757D] mt-0.5">
                              Wali Kelas: <span className="text-[#1A1C1E] font-medium">{group.homeroom}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isEditable && group.students.some(s => selectedRowIds.has(s.ID)) && (
                          <span className="px-2 py-0.5 rounded bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF] text-xs font-bold">
                            {group.students.filter(s => selectedRowIds.has(s.ID)).length} dicentang
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-full bg-[#E8F0FE] text-[#0052CC] border border-[#B3D1FF] text-xs font-bold">
                          {group.students.length} Siswa
                        </span>
                        <button
                          type="button"
                          className="p-1 rounded text-[#6C757D] hover:text-[#1A1C1E]"
                          title={isCollapsed ? 'Buka daftar siswa' : 'Tutup daftar siswa'}
                        >
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Class Group Table */}
                    {!isCollapsed && (
                      <div className="overflow-x-auto">
                        {group.students.length > 0 ? (
                          <>
                            <table className="w-full text-xs text-left">
                              <thead className="bg-[#F8F9FA] text-[#6C757D] uppercase text-[10px] font-bold border-b border-[#DEE2E6]">
                                <tr>
                                  {isEditable && (
                                    <th className="px-3 py-2.5 w-10 text-center">
                                      <input
                                        type="checkbox"
                                        checked={group.students.length > 0 && group.students.every(s => selectedRowIds.has(s.ID))}
                                        onChange={(e) => {
                                          const next = new Set(selectedRowIds);
                                          if (e.target.checked) {
                                            group.students.forEach(s => next.add(s.ID));
                                          } else {
                                            group.students.forEach(s => next.delete(s.ID));
                                          }
                                          setSelectedRowIds(next);
                                        }}
                                        className="w-4 h-4 rounded border-[#CED4DA] text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                                        title={`Centang semua siswa di kelas ${group.name}`}
                                      />
                                    </th>
                                  )}
                                  <th className="px-4 py-2.5 w-12 text-center">No.</th>
                                  <th
                                    onClick={() => handleSortToggle('USERNAME')}
                                    className="px-4 py-2.5 cursor-pointer hover:bg-[#F1F3F5] transition-colors"
                                  >
                                    <div className="flex items-center gap-1">
                                      <span>NIS / Username</span>
                                      {sortField === 'USERNAME' && (
                                        <ArrowUpDown className="w-3 h-3 text-[#0052CC]" />
                                      )}
                                    </div>
                                  </th>
                                  <th
                                    onClick={() => handleSortToggle('NAME')}
                                    className="px-4 py-2.5 cursor-pointer hover:bg-[#F1F3F5] transition-colors"
                                  >
                                    <div className="flex items-center gap-1">
                                      <span>Nama Siswa (Abjad A - Z)</span>
                                      {sortField === 'NAME' ? (
                                        sortOrder === 'asc' ? (
                                          <ArrowUpAZ className="w-3.5 h-3.5 text-[#0052CC]" />
                                        ) : (
                                          <ArrowDownAZ className="w-3.5 h-3.5 text-[#0052CC]" />
                                        )
                                      ) : (
                                        <ArrowUpDown className="w-3 h-3 text-[#ADB5BD]" />
                                      )}
                                    </div>
                                  </th>
                                  <th className="px-4 py-2.5">Email</th>
                                  <th className="px-4 py-2.5">Status</th>
                                  <th className="px-4 py-2.5 text-right">Aksi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#DEE2E6]">
                                {studentsToShow.map((student, idx) => {
                                  const isSelected = selectedRowIds.has(student.ID);
                                  return (
                                    <tr
                                      key={student.ID}
                                      className={`hover:bg-[#F8F9FA] transition-colors ${
                                        isSelected ? 'bg-[#F0F5FF]' : ''
                                      }`}
                                    >
                                      {isEditable && (
                                        <td className="px-3 py-2.5 text-center">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              const next = new Set(selectedRowIds);
                                              if (e.target.checked) {
                                                next.add(student.ID);
                                              } else {
                                                next.delete(student.ID);
                                              }
                                              setSelectedRowIds(next);
                                            }}
                                            className="w-4 h-4 rounded border-[#CED4DA] text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                                            title="Centang siswa ini untuk hapus banyak"
                                          />
                                        </td>
                                      )}
                                      <td className="px-4 py-2.5 text-center text-[#6C757D] font-mono text-[11px]">
                                        {idx + 1}
                                      </td>
                                    <td className="px-4 py-2.5 font-mono font-bold text-[#0052CC]">
                                      {student.USERNAME}
                                    </td>
                                    <td className="px-4 py-2.5 font-semibold text-[#1A1C1E]">
                                      {student.NAME}
                                    </td>
                                    <td className="px-4 py-2.5 text-[#6C757D]">
                                      {student.EMAIL || '-'}
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                          student.ACTIVE
                                            ? 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]'
                                            : 'bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF]'
                                        }`}
                                      >
                                        {student.ACTIVE ? 'Aktif' : 'Non-Aktif'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                      {isEditable ? (
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => openEditModal(student)}
                                            className="p-1 rounded-md border border-[#CED4DA] bg-white hover:bg-[#F8F9FA] text-[#495057] transition-colors"
                                            title="Edit Data Siswa"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setDeleteConfirmId(student.ID)}
                                            className="p-1 rounded-md border border-[#FAD2CF] bg-white hover:bg-[#FCE8E6] text-[#DC3545] transition-colors"
                                            title="Hapus Siswa"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-[#6C757D]">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                              </tbody>
                            </table>

                            {hasMore && (
                              <div className="p-3 bg-[#F8F9FA] border-t border-[#DEE2E6] text-center text-xs text-[#6C757D] flex items-center justify-center gap-2">
                                <span>
                                  Menampilkan {pageSize} dari {group.students.length} siswa di kelas ini (sesuai abjad).
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setPageSize(0)}
                                  className="text-[#0052CC] font-bold hover:underline"
                                >
                                  Tampilkan Semua ({group.students.length} Siswa)
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="p-6 text-center text-xs text-[#6C757D]">
                            Belum ada siswa yang terdaftar di kelas ini.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-10 text-center text-xs text-[#6C757D] bg-white rounded-lg border border-[#DEE2E6]">
                Tidak ada data siswa ditemukan untuk kriteria pencarian ini.
              </div>
            )}
          </div>
        ) : entityName === 'QUESTIONS' && selectedBankPackageId && activeViewingPackage ? (
          /* View Mode 2: Bank Soal Package Detail (Lihat Seluruh Soal) */
          <div className="p-5 space-y-5 bg-[#F8F9FA]/40">
            {/* Package Detail Header Card */}
            <div className="bg-white rounded-xl border border-[#DEE2E6] p-5 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBankPackageId(null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CED4DA] bg-white hover:bg-[#F1F3F5] text-[#1A1C1E] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-[#0052CC]" />
                      <span>Kembali ke Tabel Bank Soal</span>
                    </button>
                    {(() => {
                      const atId = activeViewingPackage.ASSESSMENT_TYPE_ID || 'SH';
                      const aType = availableAssessmentTypes.find(a => a.CODE === atId || a.ID === atId);
                      const badgeClass = getAssessmentBadgeStyle(atId);
                      const label = aType ? `[${aType.CODE || aType.ID}] ${aType.NAME}` : `[${atId}] ${getAssessmentShortLabel(atId)}`;
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${badgeClass}`}>
                          <Award className="w-3.5 h-3.5" />
                          <span>{label}</span>
                        </span>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-[#1A1C1E]">
                      {subjectNameMap[activeViewingPackage.SUBJECT_ID] || 'Mata Pelajaran'}
                    </h2>
                    <span className="text-[#ADB5BD]">•</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F8F9FA] text-[#1A1C1E] border border-[#DEE2E6] text-xs font-bold">
                      <GraduationCap className="w-3.5 h-3.5 text-[#0052CC]" />
                      <span>{classNameMap[activeViewingPackage.CLASS_ID] || 'Semua Kelas'}</span>
                    </span>
                    <span className="text-xs text-[#6C757D]">
                      ({activeViewingPackage.TITLE})
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#6C757D] flex-wrap pt-1">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#0052CC]">
                      <HelpCircle className="w-4 h-4" />
                      <span>{activeViewingPackage.questionCount} Butir Soal Terdaftar</span>
                    </span>
                    <span>•</span>
                    <span className="font-mono text-[#1A1C1E]">
                      Total Bobot: <b>{activeViewingPackage.totalPoints} Poin</b>
                    </span>
                    <span>•</span>
                    <span>
                      {activeViewingPackage.mcqCount} Pilihan Ganda • {activeViewingPackage.essayCount} Uraian • {activeViewingPackage.complexCount} Kompleks
                    </span>
                  </div>
                </div>

                {/* Quick Add / Import Actions */}
                <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
                  <button
                    type="button"
                    onClick={() => setPrintPdfModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#137333] hover:bg-[#0E5827] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    title="Cetak naskah soal atau simpan ke format PDF standar A4 rapih"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak / PDF Soal</span>
                  </button>

                  {isEditable && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenAddQuestionForPackage(activeViewingPackage)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0052CC] hover:bg-[#0047B3] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Input Soal Baru</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenWordImportForPackage(activeViewingPackage)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#E8F0FE] border border-[#B3D1FF] text-[#0052CC] hover:bg-[#D2E3FC] text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-[#0052CC]" />
                        <span>Import Word</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenExcelImportForPackage(activeViewingPackage)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[#CED4DA] text-[#1A1C1E] hover:bg-[#F8F9FA] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-[#0052CC]" />
                        <span>Import Excel</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Questions Filter & View Mode Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-[#DEE2E6]">
              <div className="flex items-center gap-3 flex-1 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-[220px] max-w-md">
                  <Search className="w-4 h-4 text-[#6C757D] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari teks soal, pilihan jawaban, atau kunci..."
                    value={packageQuestionSearch}
                    onChange={e => setPackageQuestionSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#F8F9FA] border border-[#CED4DA] rounded-md focus:bg-white focus:border-[#0052CC] outline-none"
                  />
                </div>

                {/* Filter Tipe Soal */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#6C757D] font-medium">Tipe:</span>
                  <select
                    value={packageQuestionFilterType}
                    onChange={e => setPackageQuestionFilterType(e.target.value)}
                    className="px-2.5 py-1.5 border border-[#CED4DA] rounded-md bg-white text-xs text-[#1A1C1E] outline-none font-medium cursor-pointer"
                  >
                    <option value="ALL">Semua Tipe Soal</option>
                    <option value="MCQ">Pilihan Ganda (MCQ)</option>
                    <option value="COMPLEX_MCQ">PG Kompleks</option>
                    <option value="TRUE_FALSE">Benar / Salah</option>
                    <option value="MATCHING">Menjodohkan</option>
                    <option value="SHORT_ANSWER">Isian Singkat</option>
                    <option value="ESSAY">Uraian / Esai</option>
                  </select>
                </div>
              </div>

              {/* Review Mode Toggle (Desktop vs Mobile) */}
              <div className="flex items-center gap-2 self-end md:self-auto">
                <span className="text-xs font-bold text-[#6C757D] mr-1 hidden sm:inline">
                  {viewingPackageQuestions.length} Butir Soal
                </span>
                <div className="inline-flex p-0.5 bg-[#F1F3F5] rounded-lg border border-[#CED4DA] text-xs">
                  <button
                    type="button"
                    onClick={() => setPackageReviewMode('desktop')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                      packageReviewMode === 'desktop'
                        ? 'bg-white text-[#0052CC] shadow-2xs'
                        : 'text-[#6C757D] hover:text-[#1A1C1E]'
                    }`}
                    title="Tinjau daftar lengkap butir soal standar desktop"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPackageReviewMode('mobile')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                      packageReviewMode === 'mobile'
                        ? 'bg-[#0052CC] text-white shadow-2xs'
                        : 'text-[#6C757D] hover:text-[#1A1C1E]'
                    }`}
                    title="Simulasikan tampilan layar ujian smartphone siswa"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Review Mobile</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Questions Review Display */}
            {packageReviewMode === 'mobile' ? (
              /* --- MODE REVIEW MOBILE (SMARTPHONE SISWA) --- */
              <QuestionBankMobileSimulator
                questions={viewingPackageQuestions}
                packageTitle={activeViewingPackage.TITLE}
                subjectName={subjectNameMap[activeViewingPackage.SUBJECT_ID] || 'Mata Pelajaran'}
                className={classNameMap[activeViewingPackage.CLASS_ID] || 'Semua Kelas'}
                assessmentTypeName={(() => {
                  const atId = activeViewingPackage.ASSESSMENT_TYPE_ID || 'SH';
                  const aType = availableAssessmentTypes.find(a => a.CODE === atId || a.ID === atId);
                  return aType ? `[${aType.CODE || aType.ID}] ${aType.NAME}` : atId;
                })()}
                onExitMobileMode={() => setPackageReviewMode('desktop')}
              />
            ) : viewingPackageQuestions.length > 0 ? (
              /* --- MODE REVIEW DESKTOP (KARTU SOAL LENGKAP & REPRESENTASI SISWA) --- */
              <div className="space-y-4">
                {/* Bulk Action Bar for Questions in Package */}
                {isEditable && (
                  <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-[#DEE2E6] shadow-2xs">
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-[#1A1C1E]">
                        <input
                          type="checkbox"
                          checked={viewingPackageQuestions.length > 0 && viewingPackageQuestions.every(q => selectedQuestionIds.has(q.ID))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedQuestionIds(new Set(viewingPackageQuestions.map(q => q.ID)));
                            } else {
                              setSelectedQuestionIds(new Set());
                            }
                          }}
                          className="w-4 h-4 rounded border-[#CED4DA] text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                        />
                        <span>Pilih Semua Soal ({viewingPackageQuestions.length})</span>
                      </label>
                      {selectedQuestionIds.size > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8F0FE] text-[#0052CC] border border-[#B3D1FF]">
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>{selectedQuestionIds.size} butir soal dicentang</span>
                        </span>
                      )}
                    </div>

                    {selectedQuestionIds.size > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedQuestionIds(new Set())}
                          className="px-2.5 py-1.5 rounded-md text-xs font-medium text-[#6C757D] hover:bg-[#F1F3F5] transition-colors cursor-pointer"
                        >
                          Batal Centang
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBulkDeleteConfirm({
                              type: 'QUESTIONS',
                              ids: Array.from(selectedQuestionIds),
                              count: selectedQuestionIds.size
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#DC3545] hover:bg-[#C82333] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus ({selectedQuestionIds.size}) Soal Terpilih</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {viewingPackageQuestions.map((q, idx) => {
                  const isChecked = selectedQuestionIds.has(q.ID);
                  return (
                    <div
                      key={q.ID || idx}
                      className={`bg-white rounded-xl border transition-colors p-5 shadow-xs space-y-4 ${
                        isChecked ? 'border-[#0052CC] ring-2 ring-[#0052CC]/20 bg-[#F8FAFF]' : 'border-[#DEE2E6] hover:border-[#B3D1FF]'
                      }`}
                    >
                      {/* Card Header: Number, Type Badge, Points & Actions */}
                      <div className="flex items-center justify-between gap-2 border-b border-[#DEE2E6] pb-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {isEditable && (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const next = new Set(selectedQuestionIds);
                                if (e.target.checked) next.add(q.ID);
                                else next.delete(q.ID);
                                setSelectedQuestionIds(next);
                              }}
                              className="w-4 h-4 rounded border-[#CED4DA] text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                              title="Centang butir soal ini untuk dihapus"
                            />
                          )}
                          <span className="w-7 h-7 rounded-full bg-[#0052CC] text-white text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                              q.TYPE === 'ESSAY'
                                ? 'bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]'
                                : q.TYPE === 'COMPLEX_MCQ'
                                ? 'bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF]'
                                : q.TYPE === 'TRUE_FALSE'
                                ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                                : q.TYPE === 'MATCHING'
                                ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                                : q.TYPE === 'SHORT_ANSWER'
                                ? 'bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5]'
                                : 'bg-[#E7F0FF] text-[#0052CC] border border-[#B3D1FF]'
                            }`}
                          >
                            {q.TYPE === 'ESSAY'
                              ? 'Uraian / Esai'
                              : q.TYPE === 'COMPLEX_MCQ'
                              ? 'PG Kompleks'
                              : q.TYPE === 'TRUE_FALSE'
                              ? 'Benar / Salah'
                              : q.TYPE === 'MATCHING'
                              ? 'Menjodohkan'
                              : q.TYPE === 'SHORT_ANSWER'
                              ? 'Isian Singkat'
                              : 'Pilihan Ganda'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#F8F9FA] text-[#1A1C1E] border border-[#DEE2E6] text-[11px] font-mono font-bold">
                            {q.POINTS || 10} Poin
                          </span>
                        </div>

                        {isEditable && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(q)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#CED4DA] bg-white hover:bg-[#F8F9FA] text-[#495057] text-xs font-medium transition-colors cursor-pointer"
                              title="Edit Soal"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(q.ID)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#FAD2CF] bg-white hover:bg-[#FCE8E6] text-[#DC3545] text-xs font-medium transition-colors cursor-pointer"
                              title="Hapus Soal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Question Prompt with Rich Content Support */}
                      <div className="text-sm font-medium text-[#1A1C1E] leading-relaxed">
                        {q.TYPE === 'MATCHING' ? (
                          (() => {
                            const details = parseMatchingDetails(q.QUESTION, q, q.EXTRA_DATA, q.ANSWER);
                            return (
                              <RichContentRenderer
                                content={details.prompt || q.QUESTION}
                                className="text-sm"
                              />
                            );
                          })()
                        ) : (
                          <RichContentRenderer content={q.QUESTION} className="text-sm" />
                        )}
                      </div>

                      {/* --- TAMPILAN KHUSUS TIAP TIPE SOAL SESUAI PERSPEKTIF SISWA --- */}

                      {/* 1. MCQ (PILIHAN GANDA TUNGGAL) */}
                      {(q.TYPE === 'MCQ' || (!q.TYPE && !q.EXTRA_DATA)) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {['A', 'B', 'C', 'D', 'E'].map(opt => {
                            const optKey = `OPTION_${opt}`;
                            const optVal = q[optKey];
                            if (!optVal) return null;
                            const isCorrect = String(q.ANSWER || '')
                              .trim()
                              .toUpperCase() === opt;

                            return (
                              <div
                                key={opt}
                                className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition-colors ${
                                  isCorrect
                                    ? 'bg-[#E6F4EA] border-[#34A853] text-[#137333] font-semibold'
                                    : 'bg-[#F8F9FA] border-[#DEE2E6] text-[#495057]'
                                }`}
                              >
                                <span
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                    isCorrect ? 'bg-[#34A853] text-white' : 'bg-white border border-[#CED4DA] text-[#495057]'
                                  }`}
                                >
                                  {opt}
                                </span>
                                <div className="flex-1 pt-0.5">
                                  <RichContentRenderer content={optVal} inline />
                                </div>
                                {isCorrect && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#137333] bg-white px-2 py-0.5 rounded border border-[#CEEAD6] shrink-0">
                                    <Check className="w-3 h-3 text-[#137333]" />
                                    <span>Kunci Benar</span>
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 2. COMPLEX_MCQ (PILIHAN GANDA KOMPLEKS / MULTI-SELECT) */}
                      {q.TYPE === 'COMPLEX_MCQ' && (
                        <div className="space-y-2 pt-1">
                          <div className="text-[11px] text-[#6C757D] font-medium italic">
                            *Siswa dapat mencentang lebih dari satu jawaban yang benar:
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {['A', 'B', 'C', 'D', 'E'].map(opt => {
                              const optKey = `OPTION_${opt}`;
                              const optVal = q[optKey];
                              if (!optVal) return null;
                              const correctKeys = String(q.ANSWER || '')
                                .split(/[,;\s]+/)
                                .map(s => s.trim().toUpperCase());
                              const isCorrect = correctKeys.includes(opt);

                              return (
                                <div
                                  key={opt}
                                  className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition-colors ${
                                    isCorrect
                                      ? 'bg-[#F3E8FF] border-[#A855F7] text-[#6B21A8] font-semibold'
                                      : 'bg-[#F8F9FA] border-[#DEE2E6] text-[#495057]'
                                  }`}
                                >
                                  <span
                                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                      isCorrect ? 'bg-[#9333EA] text-white' : 'bg-white border border-[#CED4DA] text-[#495057]'
                                    }`}
                                  >
                                    {isCorrect ? <Check className="w-3 h-3 text-white" /> : opt}
                                  </span>
                                  <div className="flex-1 pt-0.5">
                                    <RichContentRenderer content={optVal} inline />
                                  </div>
                                  {isCorrect && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6B21A8] bg-white px-2 py-0.5 rounded border border-[#E9D5FF] shrink-0">
                                      <span>Kunci [{opt}]</span>
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 3. TRUE_FALSE (BENAR / SALAH) */}
                      {q.TYPE === 'TRUE_FALSE' && (
                        <div className="pt-2 space-y-2">
                          <div className="text-xs text-[#6C757D] font-medium">
                            Pilihan respon yang akan dipilih siswa:
                          </div>
                          <div className="flex items-center gap-3">
                            {['BENAR', 'SALAH'].map(val => {
                              const isCorrect = String(q.ANSWER || '').trim().toUpperCase() === val;

                              return (
                                <div
                                  key={val}
                                  className={`px-5 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
                                    isCorrect
                                      ? 'bg-[#E6F4EA] border-[#34A853] text-[#137333] shadow-xs'
                                      : 'bg-[#F8F9FA] border-[#DEE2E6] text-[#6C757D]'
                                  }`}
                                >
                                  <div
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                      isCorrect ? 'border-[#34A853] bg-[#34A853] text-white' : 'border-[#CED4DA] bg-white'
                                    }`}
                                  >
                                    {isCorrect && <Check className="w-2.5 h-2.5" />}
                                  </div>
                                  <span>{val}</span>
                                  {isCorrect && (
                                    <span className="text-[10px] bg-white text-[#137333] px-1.5 py-0.2 rounded border border-[#CEEAD6] ml-1">
                                      Kunci Benar
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 4. MATCHING (MENJODOHKAN) - DUA KOLOM DENGAN DIAGNOSTIK KETERWAKILAN KUNCI PASANGAN LENGKAP */}
                      {q.TYPE === 'MATCHING' && (() => {
                        const details = parseMatchingDetails(q.QUESTION, q, q.EXTRA_DATA, q.ANSWER);
                        const keyPairs = details.correctPairs || {};
                        const leftKeys = details.leftItems.map(i => i.key);
                        const rightKeys = details.rightItems.map(i => i.key.toUpperCase());
                        const missingPairs = leftKeys.filter(k => !keyPairs[k]);
                        const invalidPairs = Object.entries(keyPairs).filter(
                          ([, r]) => !rightKeys.includes(String(r).toUpperCase())
                        );
                        const isFullyValid =
                          leftKeys.length > 0 && missingPairs.length === 0 && invalidPairs.length === 0;

                        return (
                          <div className="space-y-4 pt-1">
                            {/* Visual Diagnostic Banner */}
                            <div
                              className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                                isFullyValid
                                  ? 'bg-[#E6F4EA] border-[#CEEAD6] text-[#137333]'
                                  : 'bg-[#FEF7E0] border-[#FEEFC3] text-[#B06000]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 font-bold">
                                  {isFullyValid ? (
                                    <CheckCircle2 className="w-4 h-4 text-[#137333]" />
                                  ) : (
                                    <AlertTriangle className="w-4 h-4 text-[#B06000]" />
                                  )}
                                  <span>
                                    {isFullyValid
                                      ? `Status Validasi Soal: PASANGAN LENGKAP & TEPAT (${leftKeys.length} Pasangan Terpetakan)`
                                      : 'Status Validasi Soal: KUNCI PASANGAN BELUM LENGKAP / TIDAK VALID'}
                                  </span>
                                </div>

                                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white border">
                                  Kunci: {q.ANSWER || '(Belum Ditentukan)'}
                                </span>
                              </div>

                              {/* Visual Connection Chips */}
                              {leftKeys.length > 0 && (
                                <div className="flex items-center gap-2 flex-wrap pt-1">
                                  {details.leftItems.map(left => {
                                    const matchedRightKey = keyPairs[left.key];
                                    const matchedRightItem = details.rightItems.find(
                                      r => r.key.toUpperCase() === matchedRightKey?.toUpperCase()
                                    );
                                    const hasValidMatch = !!matchedRightItem;

                                    return (
                                      <div
                                        key={left.key}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border shadow-2xs ${
                                          hasValidMatch
                                            ? 'bg-white border-[#CEEAD6] text-[#1A1C1E]'
                                            : 'bg-[#FCE8E6] border-[#FAD2CF] text-[#C5221F]'
                                        }`}
                                      >
                                        <span className="font-bold text-[#0052CC] inline-flex items-center gap-1">
                                          <span>[{left.key}]</span>
                                          <RichContentRenderer content={left.text} inline />
                                        </span>
                                        <span className="text-[#6C757D]">➔</span>
                                        {hasValidMatch ? (
                                          <span className="font-bold text-[#137333] inline-flex items-center gap-1">
                                            <span>[{matchedRightKey}]</span>
                                            <RichContentRenderer content={matchedRightItem.text} inline />
                                          </span>
                                        ) : (
                                          <span className="font-bold text-[#C5221F] italic">
                                            (Belum ada pasangan)
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {!isFullyValid && (
                                <div className="text-[11px] pt-1 text-[#C5221F] font-medium leading-relaxed">
                                  {missingPairs.length > 0 && (
                                    <div>
                                      • Premis nomor <b>[{missingPairs.join(', ')}]</b> belum memiliki pasangan di kolom kunci jawaban (format: 1-A; 2-B; 3-C).
                                    </div>
                                  )}
                                  {invalidPairs.length > 0 && (
                                    <div>
                                      • Kunci jawaban mengarahkan ke opsi <b>[{invalidPairs.map(([k, r]) => `${k}➔${r}`).join(', ')}]</b> yang tidak terdapat pada Kolom B.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Tampilan Dua Kolom Menjodohkan Sesuai Layar Siswa */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Kolom Kiri: Premis / Pernyataan */}
                              <div className="p-3.5 rounded-xl border border-[#DEE2E6] bg-[#F8F9FA] space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-[#DEE2E6]">
                                  <span className="font-bold text-xs text-[#1A1C1E]">
                                    Kolom Kiri (Pernyataan / Premis)
                                  </span>
                                  <span className="text-[10px] text-[#6C757D] font-mono">
                                    {details.leftItems.length} Item
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {details.leftItems.map(left => (
                                    <div
                                      key={left.key}
                                      className="p-2.5 rounded-lg border border-[#DEE2E6] bg-white flex items-start gap-2.5 shadow-2xs"
                                    >
                                      <span className="w-5 h-5 rounded-full bg-[#0052CC] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                        {left.key}
                                      </span>
                                      <div className="flex-1 text-xs text-[#1A1C1E] font-medium">
                                        <RichContentRenderer content={left.text} inline />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Kolom Kanan: Pilihan Jawaban / Respon */}
                              <div className="p-3.5 rounded-xl border border-[#DEE2E6] bg-[#F8F9FA] space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-[#DEE2E6]">
                                  <span className="font-bold text-xs text-[#1A1C1E]">
                                    Kolom Kanan (Pilihan Pasangan / Respon)
                                  </span>
                                  <span className="text-[10px] text-[#6C757D] font-mono">
                                    {details.rightItems.length} Item
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {details.rightItems.map(right => (
                                    <div
                                      key={right.key}
                                      className="p-2.5 rounded-lg border border-[#DEE2E6] bg-white flex items-start gap-2.5 shadow-2xs"
                                    >
                                      <span className="w-5 h-5 rounded-md bg-[#F1F3F5] text-[#0052CC] border border-[#CED4DA] text-[10px] font-bold flex items-center justify-center shrink-0">
                                        {right.key}
                                      </span>
                                      <div className="flex-1 text-xs text-[#1A1C1E]">
                                        <RichContentRenderer content={right.text} inline />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 5. SHORT_ANSWER (ISIAN SINGKAT) */}
                      {q.TYPE === 'SHORT_ANSWER' && (
                        <div className="pt-2 space-y-2">
                          <label className="text-xs text-[#6C757D] font-medium">
                            Bidang Input Jawaban Siswa:
                          </label>
                          <div className="w-full max-w-md p-2.5 bg-[#F8F9FA] border border-[#CED4DA] rounded-lg text-xs text-[#6C757D] italic flex items-center justify-between">
                            <span>Siswa akan mengetikkan jawaban singkat di sini...</span>
                            <span className="text-[10px] bg-white px-2 py-0.5 rounded border text-[#0052CC] font-mono font-bold">
                              Kunci: {q.ANSWER || '-'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 6. ESSAY (URAIAN / ESAI) */}
                      {q.TYPE === 'ESSAY' && (
                        <div className="pt-2 space-y-2">
                          <label className="text-xs text-[#6C757D] font-medium">
                            Bidang Lembar Uraian Siswa:
                          </label>
                          <div className="w-full p-3 bg-[#F8F9FA] border border-[#CED4DA] rounded-lg text-xs text-[#6C757D] italic min-h-[70px]">
                            Siswa akan menuliskan uraian jawaban secara lengkap pada area teks ini...
                          </div>
                        </div>
                      )}

                      {/* Answer Key / Rubric Footer */}
                      <div className="flex items-center gap-2 pt-2 border-t border-[#F1F3F5] text-xs flex-wrap">
                        <span className="text-[#6C757D] font-medium">Kunci Jawaban CBT:</span>
                        <span className="font-mono font-bold text-[#0052CC] bg-[#E8F0FE] border border-[#B3D1FF] px-2.5 py-0.5 rounded">
                          {q.ANSWER || '(Belum Ditentukan)'}
                        </span>
                        {q.EXPLANATION && (
                          <span className="text-[#6C757D] ml-2 italic">
                            Pembahasan: {q.EXPLANATION}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-xl border border-[#DEE2E6] space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#E8F0FE] text-[#0052CC] flex items-center justify-center mx-auto">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div className="text-base font-bold text-[#1A1C1E]">
                  Belum Ada Butir Soal dalam Bank Soal Ini
                </div>
                <p className="text-xs text-[#6C757D] max-w-md mx-auto">
                  Silakan tambahkan butir soal secara manual satu per satu, atau import sekaligus puluhan soal langsung dari dokumen Word (.docx) atau Excel (.xlsx).
                </p>
                {isEditable && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAddQuestionForPackage(activeViewingPackage)}
                      className="px-4 py-2 bg-[#0052CC] text-white text-xs font-bold rounded-lg hover:bg-[#0047B3] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Input Soal Manual</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenWordImportForPackage(activeViewingPackage)}
                      className="px-4 py-2 bg-[#E8F0FE] text-[#0052CC] border border-[#B3D1FF] text-xs font-bold rounded-lg hover:bg-[#D2E3FC] transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Import Word (.docx)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* View Mode 3: Flat Table (All Rows or Other Entities) */
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8F9FA] text-[#6C757D] uppercase text-[10px] font-bold tracking-wider border-b border-[#DEE2E6]">
                  {entityName === 'USERS' && (
                    <tr>
                      {isEditable && (
                        <th className="px-3 py-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={paginatedRows.length > 0 && paginatedRows.every(r => selectedRowIds.has(r.ID))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRowIds(new Set([...selectedRowIds, ...paginatedRows.map(r => r.ID)]));
                              } else {
                                const next = new Set(selectedRowIds);
                                paginatedRows.forEach(r => next.delete(r.ID));
                                setSelectedRowIds(next);
                              }
                            }}
                            className="w-4 h-4 rounded border-[#CED4DA] text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                            title="Pilih semua data di halaman ini"
                          />
                        </th>
                      )}
                      <th className="px-4 py-3 w-12 text-center">No.</th>
                      {filterRole === 'TEACHER' && (
                        <th className="px-4 py-3 text-center">
                          <span className="font-semibold text-xs text-[#0052CC]">Kode Guru</span>
                        </th>
                      )}
                      <th
                        onClick={() => handleSortToggle('USERNAME')}
                        className="px-5 py-3 cursor-pointer hover:bg-[#F1F3F5] transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>{filterRole === 'STUDENT' ? 'NIS / Username' : 'Username / NIP'}</span>
                          {sortField === 'USERNAME' && (
                            <ArrowUpDown className="w-3 h-3 text-[#0052CC]" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortToggle('NAME')}
                        className="px-5 py-3 cursor-pointer hover:bg-[#F1F3F5] transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>Nama Lengkap</span>
                          {sortField === 'NAME' ? (
                            sortOrder === 'asc' ? (
                              <ArrowUpAZ className="w-3.5 h-3.5 text-[#0052CC]" />
                            ) : (
                              <ArrowDownAZ className="w-3.5 h-3.5 text-[#0052CC]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-[#ADB5BD]" />
                          )}
                        </div>
                      </th>
                      {filterRole === 'TEACHER' && (
                        <th className="px-5 py-3">Mapel Diampu</th>
                      )}
                      <th className="px-5 py-3">Email</th>
                      {filterRole === 'STUDENT' && (
                        <th
                          onClick={() => handleSortToggle('CLASS_ID')}
                          className="px-5 py-3 cursor-pointer hover:bg-[#F1F3F5] transition-colors select-none"
                        >
                          <div className="flex items-center gap-1">
                            <span>Kelas</span>
                            {sortField === 'CLASS_ID' && (
                              <ArrowUpDown className="w-3 h-3 text-[#0052CC]" />
                            )}
                          </div>
                        </th>
                      )}
                      <th className="px-5 py-3">Peran</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Aksi</th>
                    </tr>
                  )}
                  {entityName === 'CLASSES' && (
                    <tr>
                      {isEditable && (
                        <th className="px-3 py-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={paginatedRows.length > 0 && paginatedRows.every(r => selectedRowIds.has(r.ID))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRowIds(new Set([...selectedRowIds, ...paginatedRows.map(r => r.ID)]));
                              } else {
                                const next = new Set(selectedRowIds);
                                paginatedRows.forEach(r => next.delete(r.ID));
                                setSelectedRowIds(next);
                              }
                            }}
                            className="w-4 h-4 rounded border-[#CED4DA] text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                            title="Pilih semua kelas di halaman ini"
                          />
                        </th>
                      )}
                      <th className="px-4 py-3 w-12 text-center">No.</th>
                      <th
                        onClick={() => handleSortToggle('NAME')}
                        className="px-5 py-3 cursor-pointer hover:bg-[#F1F3F5] transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>Nama Kelas</span>
                          {sortField === 'NAME' && <ArrowUpDown className="w-3 h-3 text-[#0052CC]" />}
                        </div>
                      </th>
                      <th className="px-4 py-3">Kurikulum</th>
                      <th className="px-4 py-3">Tingkat / Fase</th>
                      <th className="px-5 py-3">Wali Kelas</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  )}
                  {entityName === 'SUBJECTS' && (
                    <tr>
                      {isEditable && (
                        <th className="px-3 py-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={paginatedRows.length > 0 && paginatedRows.every(r => selectedRowIds.has(r.ID))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRowIds(new Set([...selectedRowIds, ...paginatedRows.map(r => r.ID)]));
                              } else {
                                const next = new Set(selectedRowIds);
                                paginatedRows.forEach(r => next.delete(r.ID));
                                setSelectedRowIds(next);
                              }
                            }}
                            className="w-4 h-4 rounded border-[#CED4DA] text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                            title="Pilih semua mata pelajaran di halaman ini"
                          />
                        </th>
                      )}
                      <th className="px-4 py-3 w-12 text-center">No.</th>
                      <th
                        onClick={() => handleSortToggle('CODE')}
                        className="px-4 py-3 cursor-pointer hover:bg-[#F1F3F5] transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>Kode</span>
                          {sortField === 'CODE' && <ArrowUpDown className="w-3 h-3 text-[#0052CC]" />}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortToggle('NAME')}
                        className="px-5 py-3 cursor-pointer hover:bg-[#F1F3F5] transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>Nama Mata Pelajaran</span>
                          {sortField === 'NAME' && <ArrowUpDown className="w-3 h-3 text-[#0052CC]" />}
                        </div>
                      </th>
                      <th className="px-4 py-3">Target Rombel / Kelas</th>
                      <th className="px-4 py-3">Kurikulum & Tingkat</th>
                      <th className="px-4 py-3">Kelompok</th>
                      <th className="px-5 py-3">Guru Pengampu</th>
                      <th className="px-3 py-3 text-center">KKM</th>
                      <th className="px-3 py-3 text-center">Beban (JP)</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  )}
                  {entityName === 'EXAMS' && (
                    <tr>
                      {isEditable && (
                        <th className="px-3 py-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={paginatedRows.length > 0 && paginatedRows.every(r => selectedRowIds.has(r.ID))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRowIds(new Set([...selectedRowIds, ...paginatedRows.map(r => r.ID)]));
                              } else {
                                const next = new Set(selectedRowIds);
                                paginatedRows.forEach(r => next.delete(r.ID));
                                setSelectedRowIds(next);
                              }
                            }}
                            className="w-4 h-4 rounded border-[#CED4DA] text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                            title="Pilih semua ujian di halaman ini"
                          />
                        </th>
                      )}
                      <th className="px-4 py-3 w-12 text-center">No.</th>
                      <th
                        onClick={() => handleSortToggle('TITLE')}
                        className="px-5 py-3 cursor-pointer hover:bg-[#F1F3F5] transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>Nama Ujian</span>
                          {sortField === 'TITLE' && <ArrowUpDown className="w-3 h-3 text-[#0052CC]" />}
                        </div>
                      </th>
                      <th className="px-5 py-3">Jenis Penilaian</th>
                      <th className="px-5 py-3">Mata Pelajaran</th>
                      <th className="px-5 py-3">Kelas</th>
                      <th className="px-5 py-3">Tanggal & Waktu</th>
                      <th className="px-5 py-3">Durasi</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Aksi</th>
                    </tr>
                  )}
                  {entityName === 'QUESTIONS' && questionViewMode === 'PACKAGES' && (
                    <tr>
                      {isEditable && (
                        <th className="px-3 py-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={paginatedRows.length > 0 && paginatedRows.every(r => selectedPackageIds.has(r.ID))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPackageIds(new Set([...selectedPackageIds, ...paginatedRows.map(r => r.ID)]));
                              } else {
                                const next = new Set(selectedPackageIds);
                                paginatedRows.forEach(r => next.delete(r.ID));
                                setSelectedPackageIds(next);
                              }
                            }}
                            className="w-4 h-4 rounded border-[#CED4DA] text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                            title="Pilih semua paket bank soal di halaman ini"
                          />
                        </th>
                      )}
                      <th className="px-4 py-3 w-12 text-center text-xs font-bold text-[#495057] uppercase tracking-wider">No.</th>
                      <th className="px-5 py-3 text-xs font-bold text-[#495057] uppercase tracking-wider">Jenis Penilaian</th>
                      <th className="px-5 py-3 text-xs font-bold text-[#495057] uppercase tracking-wider">Kelas</th>
                      <th className="px-5 py-3 text-xs font-bold text-[#495057] uppercase tracking-wider">Mapel</th>
                      <th className="px-5 py-3 text-center text-xs font-bold text-[#495057] uppercase tracking-wider">Jumlah Soal</th>
                      <th className="px-5 py-3 text-right text-xs font-bold text-[#495057] uppercase tracking-wider">Aksi</th>
                    </tr>
                  )}
                  {entityName === 'QUESTIONS' && questionViewMode === 'ALL_QUESTIONS' && (
                    <tr>
                      {isEditable && (
                        <th className="px-3 py-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={paginatedRows.length > 0 && paginatedRows.every(r => selectedRowIds.has(r.ID))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRowIds(new Set([...selectedRowIds, ...paginatedRows.map(r => r.ID)]));
                              } else {
                                const next = new Set(selectedRowIds);
                                paginatedRows.forEach(r => next.delete(r.ID));
                                setSelectedRowIds(next);
                              }
                            }}
                            className="w-4 h-4 rounded border-[#CED4DA] text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                            title="Pilih semua butir soal di halaman ini"
                          />
                        </th>
                      )}
                      <th className="px-4 py-3 w-12 text-center text-xs font-bold text-[#495057] uppercase tracking-wider">No.</th>
                      <th className="px-5 py-3 text-xs font-bold text-[#495057] uppercase tracking-wider">Jenis Penilaian</th>
                      <th className="px-5 py-3 text-xs font-bold text-[#495057] uppercase tracking-wider">Ujian</th>
                      <th className="px-5 py-3 text-xs font-bold text-[#495057] uppercase tracking-wider">Tipe</th>
                      <th className="px-5 py-3 text-xs font-bold text-[#495057] uppercase tracking-wider">Isi Soal</th>
                      <th className="px-5 py-3 text-xs font-bold text-[#495057] uppercase tracking-wider">Kunci</th>
                      <th className="px-5 py-3 text-xs font-bold text-[#495057] uppercase tracking-wider">Poin</th>
                      <th className="px-5 py-3 text-right text-xs font-bold text-[#495057] uppercase tracking-wider">Aksi</th>
                    </tr>
                  )}
                  {entityName === 'ASSESSMENT_TYPES' && (
                    <tr>
                      {isEditable && (
                        <th className="px-3 py-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={paginatedRows.length > 0 && paginatedRows.every(r => selectedRowIds.has(r.ID))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRowIds(new Set([...selectedRowIds, ...paginatedRows.map(r => r.ID)]));
                              } else {
                                const next = new Set(selectedRowIds);
                                paginatedRows.forEach(r => next.delete(r.ID));
                                setSelectedRowIds(next);
                              }
                            }}
                            className="w-4 h-4 rounded border-[#CED4DA] text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                            title="Pilih semua jenis penilaian di halaman ini"
                          />
                        </th>
                      )}
                      <th className="px-4 py-3 w-12 text-center">No.</th>
                      <th
                        onClick={() => handleSortToggle('CODE')}
                        className="px-4 py-3 cursor-pointer hover:bg-[#F1F3F5] transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>Kode</span>
                          {sortField === 'CODE' && <ArrowUpDown className="w-3 h-3 text-[#0052CC]" />}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortToggle('NAME')}
                        className="px-5 py-3 cursor-pointer hover:bg-[#F1F3F5] transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>Nama Jenis Penilaian</span>
                          {sortField === 'NAME' && <ArrowUpDown className="w-3 h-3 text-[#0052CC]" />}
                        </div>
                      </th>
                      <th className="px-4 py-3">Frekuensi Pelaksanaan</th>
                      <th className="px-4 py-3">Kurikulum</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-3 py-3 text-center">Bobot</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-[#DEE2E6]">
                  {paginatedRows.length > 0 ? (
                    paginatedRows.map((row, index) => {
                      const rowNumber = pageSize > 0 ? (validCurrentPage - 1) * pageSize + index + 1 : index + 1;
                      const isSelected = isBankPackagesMode ? selectedPackageIds.has(row.ID) : selectedRowIds.has(row.ID);
                      return (
                        <tr
                          key={row.ID}
                          className={`hover:bg-[#F8F9FA] transition-colors ${
                            isSelected ? 'bg-[#F0F5FF]' : ''
                          }`}
                        >
                          {isEditable && (
                            <td className="px-3 py-3.5 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (isBankPackagesMode) {
                                    const next = new Set(selectedPackageIds);
                                    if (e.target.checked) next.add(row.ID);
                                    else next.delete(row.ID);
                                    setSelectedPackageIds(next);
                                  } else {
                                    const next = new Set(selectedRowIds);
                                    if (e.target.checked) next.add(row.ID);
                                    else next.delete(row.ID);
                                    setSelectedRowIds(next);
                                  }
                                }}
                                className="w-4 h-4 rounded border-[#CED4DA] text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                                title="Centang data ini untuk hapus banyak"
                              />
                            </td>
                          )}
                          <td className="px-4 py-3.5 text-center text-[#6C757D] font-mono text-[11px]">
                            {rowNumber}
                          </td>

                          {entityName === 'USERS' && (
                            <>
                              {filterRole === 'TEACHER' && (
                                <td className="px-4 py-3.5 text-center">
                                  {(() => {
                                    const teacherCode = (row.TEACHER_CODE && row.TEACHER_CODE !== '-') ? row.TEACHER_CODE : (
                                      MA_CIKARAMAS_TEACHERS.find(t =>
                                        t.name.toLowerCase().trim() === (row.NAME || '').toLowerCase().trim() ||
                                        row.USERNAME === `guru-${t.code.toLowerCase()}` ||
                                        (t.code === 'T' && row.USERNAME === 'guru01') ||
                                        row.ID === `USR-GURU-${t.code}` ||
                                        (row.NAME && (t.name.toLowerCase().includes(row.NAME.toLowerCase()) || row.NAME.toLowerCase().includes(t.name.toLowerCase())))
                                      )?.code || null
                                    );
                                    return teacherCode ? (
                                      <span
                                        className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#E8F0FE] text-[#0052CC] border border-[#B3D1FF] font-mono font-bold text-xs shadow-2xs"
                                        title={`Kode Guru di Jadwal: ${teacherCode}`}
                                      >
                                        [{teacherCode}]
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => openEditModal(row)}
                                        className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-mono text-[11px] font-semibold transition-colors shadow-2xs"
                                        title="Kode guru belum diisi. Klik untuk menentukan kode huruf jadwal (A s/d T)"
                                      >
                                        Belum Diisi
                                      </button>
                                    );
                                  })()}
                                </td>
                              )}
                              <td className="px-5 py-3.5 font-mono font-bold text-[#0052CC]">{row.USERNAME}</td>
                              <td className="px-5 py-3.5 font-medium text-[#1A1C1E]">{row.NAME}</td>
                              {filterRole === 'TEACHER' && (
                                <td className="px-5 py-3.5">
                                  <div className="flex flex-wrap gap-1 max-w-xs">
                                    {lookup.subjects
                                      .filter(s => s.TEACHER_ID === row.ID || (row.TEACHER_CODE && s.TEACHER_CODE === row.TEACHER_CODE))
                                      .slice(0, 3)
                                      .map(s => (
                                        <span key={s.ID} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium" title={s.NAME}>
                                          [{s.CODE}] {s.NAME}
                                        </span>
                                      ))}
                                    {lookup.subjects.filter(s => s.TEACHER_ID === row.ID || (row.TEACHER_CODE && s.TEACHER_CODE === row.TEACHER_CODE)).length > 3 && (
                                      <span className="text-[10px] text-gray-500 self-center">
                                        +{lookup.subjects.filter(s => s.TEACHER_ID === row.ID || (row.TEACHER_CODE && s.TEACHER_CODE === row.TEACHER_CODE)).length - 3} lainnya
                                      </span>
                                    )}
                                    {lookup.subjects.filter(s => s.TEACHER_ID === row.ID || (row.TEACHER_CODE && s.TEACHER_CODE === row.TEACHER_CODE)).length === 0 && (
                                      <span className="text-[11px] text-[#ADB5BD] italic">Belum ada mapel</span>
                                    )}
                                  </div>
                                </td>
                              )}
                              <td className="px-5 py-3.5 text-[#6C757D]">{row.EMAIL || '-'}</td>
                              {filterRole === 'STUDENT' && (
                                <td className="px-5 py-3.5">
                                  <span className="px-2 py-0.5 rounded bg-[#F1F3F5] text-[#495057] border border-[#DEE2E6] font-mono text-[10px] font-medium">
                                    {classNameMap[row.CLASS_ID] || row.CLASS_ID || '-'}
                                  </span>
                                </td>
                              )}
                              <td className="px-5 py-3.5">
                                <span className="px-2 py-0.5 rounded bg-[#E7F0FF] text-[#0052CC] border border-[#B3D1FF] text-[10px] font-bold">
                                  {row.ROLE}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                    row.ACTIVE ? 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]' : 'bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF]'
                                  }`}
                                >
                                  {row.ACTIVE ? 'Aktif' : 'Non-Aktif'}
                                </span>
                              </td>
                            </>
                          )}

                          {entityName === 'CLASSES' && (
                            <>
                              <td className="px-5 py-3.5">
                                <div className="font-semibold text-[#1A1C1E]">{row.NAME}</div>
                                <div className="text-[10px] font-mono text-[#6C757D]">{row.ID}</div>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                  row.CURRICULUM === 'K13'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-[#E8F0FE] text-[#0052CC] border-[#B3D1FF]'
                                }`}>
                                  {row.CURRICULUM === 'K13' ? 'Kurikulum 2013' : 'Kurikulum Merdeka'}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded bg-[#F1F3F5] text-[#495057] border border-[#DEE2E6] font-mono text-[10px] font-bold">
                                    Kelas {row.LEVEL}
                                  </span>
                                  {row.CURRICULUM !== 'K13' && (
                                    <span className="text-[10px] text-[#6C757D]">
                                      ({row.LEVEL === 'X' ? 'Fase E' : 'Fase F'})
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-[#1A1C1E]">
                                {row.HOMEROOM ? (
                                  <div className="flex items-center gap-1.5">
                                    <GraduationCap className="w-3.5 h-3.5 text-[#0052CC] flex-shrink-0" />
                                    <span className="font-medium text-[#1A1C1E]">
                                      {teacherNameMap[row.HOMEROOM] || row.HOMEROOM}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[#ADB5BD] italic text-[11px]">Belum ditentukan</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                    row.ACTIVE ? 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]' : 'bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF]'
                                  }`}
                                >
                                  {row.ACTIVE ? 'Aktif' : 'Non-Aktif'}
                                </span>
                              </td>
                            </>
                          )}

                          {entityName === 'SUBJECTS' && (
                            <>
                              <td className="px-4 py-3.5 font-mono font-bold text-[#0052CC]">{row.CODE}</td>
                              <td className="px-5 py-3.5">
                                <div className="font-semibold text-[#1A1C1E]">{row.NAME}</div>
                                <div className="text-[10px] font-mono text-[#0052CC] flex items-center gap-1 mt-0.5">
                                  <span>ID:</span>
                                  <span className="bg-[#EBF3FC] px-1.5 py-0.5 rounded border border-[#B3D1FF] font-bold">{row.ID}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                {row.CLASS_ID ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-[#0052CC] border border-blue-200 text-[10px] font-bold">
                                    Kelas {classNameMap[row.CLASS_ID] || row.CLASS_ID}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-[#6C757D]">
                                    Semua Kelas Tingkat {row.LEVEL || 'X'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex flex-col gap-1">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border w-fit ${
                                    row.CURRICULUM === 'K13'
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-[#E8F0FE] text-[#0052CC] border-[#B3D1FF]'
                                  }`}>
                                    {row.CURRICULUM === 'K13' ? 'K13' : 'Merdeka'}
                                  </span>
                                  <span className="text-[10px] text-[#495057] font-medium">
                                    Tingkat {row.LEVEL || 'Semua'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="text-xs text-[#495057]">
                                  {row.GROUP || 'Umum (Wajib)'}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-[#E8F0FE] text-[#0052CC] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                    {row.TEACHER_CODE || (teacherNameMap[row.TEACHER_ID] || row.TEACHER_ID || '?').slice(0, 1)}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-xs text-[#1A1C1E]">
                                      {teacherNameMap[row.TEACHER_ID] || row.TEACHER_ID || '-'}
                                    </span>
                                    {(row.TEACHER_CODE || teacherCodeMap[row.TEACHER_ID]) && (
                                      <span className="text-[10px] font-mono text-[#0052CC] font-semibold">
                                        Kode Guru: [{row.TEACHER_CODE || teacherCodeMap[row.TEACHER_ID]}]
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3.5 text-center font-bold text-xs text-[#1A1C1E]">
                                {row.KKM || 75}
                              </td>
                              <td className="px-3 py-3.5 text-center text-xs text-[#495057]">
                                {row.HOURS_PER_WEEK || 3} JP
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                    row.ACTIVE ? 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]' : 'bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF]'
                                  }`}
                                >
                                  {row.ACTIVE ? 'Aktif' : 'Non-Aktif'}
                                </span>
                              </td>
                            </>
                          )}

                          {entityName === 'EXAMS' && (
                            <>
                              <td className="px-5 py-3.5 font-semibold text-[#1A1C1E]">{row.TITLE}</td>
                              <td className="px-5 py-3.5">
                                {(() => {
                                  const atId = row.ASSESSMENT_TYPE_ID || 'SH';
                                  const badgeClass = getAssessmentBadgeStyle(atId);
                                  const label = getAssessmentShortLabel(atId);
                                  const freq = getAssessmentFrequency(atId);
                                  return (
                                    <div className="flex flex-col gap-0.5">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border w-fit ${badgeClass}`}>
                                        <Award className="w-3 h-3" />
                                        <span>{label}</span>
                                      </span>
                                      <span className="text-[10px] text-[#6C757D]">
                                        {freq}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="px-5 py-3.5 text-[#495057]">{subjectNameMap[row.SUBJECT_ID] || '-'}</td>
                              <td className="px-5 py-3.5">
                                <span className="px-2 py-0.5 rounded bg-[#F1F3F5] text-[#495057] border border-[#DEE2E6] font-mono text-[10px] font-medium">
                                  {classNameMap[row.CLASS_ID] || '-'}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-[#495057]">
                                {row.EXAM_DATE} {row.START_TIME ? `• ${row.START_TIME}` : ''}
                              </td>
                              <td className="px-5 py-3.5 font-medium text-[#1A1C1E]">{row.DURATION_MIN} menit</td>
                              <td className="px-5 py-3.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]">
                                  {row.STATUS}
                                </span>
                              </td>
                            </>
                          )}

                          {entityName === 'QUESTIONS' && questionViewMode === 'PACKAGES' && (
                            <>
                              {/* 2. Jenis Penilaian */}
                              <td className="px-5 py-3.5">
                                {(() => {
                                  const atId = row.ASSESSMENT_TYPE_ID || 'SH';
                                  const aType = availableAssessmentTypes.find(a => a.CODE === atId || a.ID === atId);
                                  const badgeClass = getAssessmentBadgeStyle(atId);
                                  const label = aType ? `[${aType.CODE || aType.ID}] ${aType.NAME}` : `[${atId}] ${getAssessmentShortLabel(atId)}`;
                                  const freq = aType?.FREQUENCY || getAssessmentFrequency(atId);
                                  return (
                                    <div className="flex flex-col gap-1 items-start">
                                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${badgeClass}`}>
                                        <Award className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span>{label}</span>
                                      </span>
                                      <span className="text-[11px] text-[#6C757D] flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-[#ADB5BD] flex-shrink-0" />
                                        <span>{freq}</span>
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>

                              {/* 3. Kelas Berlaku */}
                              <td className="px-5 py-3.5">
                                {(() => {
                                  const classIds: string[] = Array.isArray(row.CLASS_IDS) && row.CLASS_IDS.length > 0
                                    ? row.CLASS_IDS
                                    : (row.CLASS_ID ? [row.CLASS_ID] : []);

                                  if (classIds.length === 0 || classIds[0] === 'ALL') {
                                    return (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F8F9FA] text-[#495057] border border-[#DEE2E6] text-xs font-semibold">
                                        <GraduationCap className="w-3.5 h-3.5 text-[#6C757D]" />
                                        <span>Semua Kelas</span>
                                      </span>
                                    );
                                  }

                                  if (classIds.length === 1) {
                                    const cls = lookup.classes.find(c => c.ID === classIds[0]);
                                    const cName = cls?.NAME || classNameMap[classIds[0]] || classIds[0];
                                    return (
                                      <div className="flex flex-col gap-0.5">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F0F5FF] text-[#0052CC] border border-[#B3D1FF] text-xs font-bold w-fit">
                                          <GraduationCap className="w-3.5 h-3.5 text-[#0052CC]" />
                                          <span>{cName}</span>
                                        </span>
                                        {cls?.LEVEL && (
                                          <span className="text-[10px] text-[#6C757D]">Tingkat {cls.LEVEL}</span>
                                        )}
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="flex flex-col gap-1">
                                      <div className="flex flex-wrap gap-1 max-w-xs">
                                        {classIds.slice(0, 2).map(cId => {
                                          const cls = lookup.classes.find(c => c.ID === cId);
                                          const cName = cls?.NAME || classNameMap[cId] || cId;
                                          return (
                                            <span key={cId} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F0F5FF] text-[#0052CC] border border-[#B3D1FF] text-[11px] font-bold">
                                              <GraduationCap className="w-3 h-3 text-[#0052CC]" />
                                              <span>{cName}</span>
                                            </span>
                                          );
                                        })}
                                        {classIds.length > 2 && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#F1F3F5] text-[#495057] text-[10px] font-semibold">
                                            +{classIds.length - 2} Rombel
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-[#6C757D] font-medium">
                                        Berlaku untuk {classIds.length} rombel kelas
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>

                              {/* 4. Mapel */}
                              <td className="px-5 py-3.5">
                                {(() => {
                                  const subj = lookup.subjects.find(s => s.ID === row.SUBJECT_ID);
                                  const sName = subj?.NAME || subjectNameMap[row.SUBJECT_ID] || row.SUBJECT_ID || 'Mata Pelajaran';
                                  return (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-bold text-sm text-[#1A1C1E]">
                                        {sName}
                                      </span>
                                      <span className="text-[11px] text-[#6C757D] font-mono">
                                        {subj?.CODE ? `Kode: ${subj.CODE}` : (row.TITLE || '-')}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>

                              {/* 5. Jumlah Soal & Target */}
                              <td className="px-5 py-3.5 text-center">
                                <div className="inline-flex flex-col items-center">
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F0FE] text-[#0052CC] border border-[#B3D1FF] text-xs font-bold">
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    <span>
                                      {row.questionCount}
                                      {row.TARGET_QUESTION_COUNT > 0 ? ` / ${row.TARGET_QUESTION_COUNT}` : ''} Soal
                                    </span>
                                  </span>
                                  <span className="text-[10px] text-[#6C757D] mt-1 font-medium">
                                    {row.mcqCount > 0 ? `${row.mcqCount} PG` : ''}
                                    {row.essayCount > 0 ? ` • ${row.essayCount} Uraian` : ''}
                                    {row.interactiveCount > 0 ? ` • ${row.interactiveCount} Interaktif` : ''}
                                    {row.questionCount === 0 && '0 Soal (Kosong)'}
                                  </span>
                                </div>
                              </td>

                              {/* 6. Kolom Aksi (Input, Lihat, Edit, Konversi, Hapus) */}
                              <td className="px-5 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* 1. Input */}
                                  <button
                                    type="button"
                                    onClick={() => setInputChooserTarget(row)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                    title="Input butir soal baru atau import file Word/Excel"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Input</span>
                                  </button>

                                  {/* 2. Lihat */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedBankPackageId(row.ID)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-[#B3D1FF] hover:bg-[#E8F0FE] text-[#0052CC] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                    title="Lihat seluruh butir soal dalam bank soal ini"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Lihat</span>
                                  </button>

                                  {/* 2b. Jadwalkan Ujian */}
                                  {onNavigate && (
                                    <button
                                      type="button"
                                      onClick={() => onNavigate('exams')}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#E8F0FE] border border-[#B3D1FF] hover:bg-[#D2E3FC] text-[#0052CC] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                      title="Buat sesi jadwal ujian CBT dari paket bank soal ini"
                                    >
                                      <Calendar className="w-3.5 h-3.5" />
                                      <span>Jadwalkan</span>
                                    </button>
                                  )}

                                  {/* 3. Edit */}
                                  {isEditable && (
                                    <button
                                      type="button"
                                      onClick={() => openEditBankPackageModal(row)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-[#CED4DA] hover:bg-[#F8F9FA] text-[#495057] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                      title="Edit pengaturan bank soal (jenis penilaian, kelas berlaku, mapel, target soal)"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-[#495057]" />
                                      <span>Edit</span>
                                    </button>
                                  )}

                                  {/* 4. Hapus */}
                                  {isEditable && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const subj = lookup.subjects.find(s => s.ID === row.SUBJECT_ID);
                                        const sName = subj?.NAME || subjectNameMap[row.SUBJECT_ID] || 'Mapel';
                                        const cls = lookup.classes.find(c => c.ID === row.CLASS_ID);
                                        const cName = cls?.NAME || classNameMap[row.CLASS_ID] || 'Kelas';
                                        setDeletePackageConfirm({
                                          id: row.ID,
                                          title: `${sName} - ${cName} (${row.ASSESSMENT_TYPE_ID || 'SH'})`,
                                          count: row.questionCount
                                        });
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-[#FAD2CF] hover:bg-[#FCE8E6] text-[#DC3545] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                      title="Hapus paket bank soal ini beserta seluruh butir soalnya"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Hapus</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </>
                          )}

                          {entityName === 'QUESTIONS' && questionViewMode === 'ALL_QUESTIONS' && (
                            <>
                              <td className="px-5 py-3.5">
                                {(() => {
                                  const atId = getQuestionAssessmentId(row);
                                  const badgeClass = getAssessmentBadgeStyle(atId);
                                  const label = getAssessmentShortLabel(atId);
                                  const freq = getAssessmentFrequency(atId);
                                  return (
                                    <div className="flex flex-col gap-0.5">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border w-fit ${badgeClass}`}>
                                        <Award className="w-3 h-3" />
                                        <span>{label}</span>
                                      </span>
                                      <span className="text-[10px] text-[#6C757D]">
                                        {freq}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="px-5 py-3.5 font-medium text-[#1A1C1E]">
                                {examNameMap[row.EXAM_ID] || row.EXAM_ID}
                              </td>
                              <td className="px-5 py-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    row.TYPE === 'ESSAY'
                                      ? 'bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]'
                                      : row.TYPE === 'COMPLEX_MCQ'
                                      ? 'bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF]'
                                      : row.TYPE === 'TRUE_FALSE'
                                      ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                                      : row.TYPE === 'MATCHING'
                                      ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                                      : row.TYPE === 'SHORT_ANSWER'
                                      ? 'bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5]'
                                      : 'bg-[#E7F0FF] text-[#0052CC] border border-[#B3D1FF]'
                                  }`}
                                >
                                  {row.TYPE === 'ESSAY'
                                    ? 'Uraian / Esai'
                                    : row.TYPE === 'COMPLEX_MCQ'
                                    ? 'PG Kompleks'
                                    : row.TYPE === 'TRUE_FALSE'
                                    ? 'Benar / Salah'
                                    : row.TYPE === 'MATCHING'
                                    ? 'Menjodohkan'
                                    : row.TYPE === 'SHORT_ANSWER'
                                    ? 'Isian Singkat'
                                    : 'Pilihan Ganda'}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 max-w-sm font-medium text-[#1A1C1E] line-clamp-2">
                                {row.QUESTION}
                              </td>
                              <td className="px-5 py-3.5 font-mono font-bold text-[#0052CC]">{row.ANSWER || '-'}</td>
                              <td className="px-5 py-3.5 font-mono font-medium text-[#1A1C1E]">{row.POINTS} poin</td>
                            </>
                          )}

                          {entityName === 'ASSESSMENT_TYPES' && (
                            <>
                              <td className="px-4 py-3.5 font-mono font-bold text-[#0052CC]">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${getAssessmentBadgeStyle(row.CODE || row.ID)}`}>
                                  <Award className="w-3 h-3" />
                                  <span>{row.CODE || row.ID}</span>
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="font-semibold text-[#1A1C1E]">{row.NAME}</div>
                                {row.DESCRIPTION && (
                                  <div className="text-[11px] text-[#6C757D] line-clamp-1">{row.DESCRIPTION}</div>
                                )}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F1F3F5] text-[#495057] border border-[#DEE2E6] text-[10px] font-medium">
                                  <Clock className="w-3 h-3 text-[#6C757D]" />
                                  <span>{row.FREQUENCY || 'Fleksibel'}</span>
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                  row.CURRICULUM === 'K13'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-[#E8F0FE] text-[#0052CC] border-[#B3D1FF]'
                                }`}>
                                  {row.CURRICULUM === 'K13' ? 'Kurikulum 2013' : 'Kurikulum Merdeka'}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold">
                                  {row.CATEGORY || 'SUMATIF'}
                                </span>
                              </td>
                              <td className="px-3 py-3.5 text-center font-bold text-xs text-[#1A1C1E]">
                                {row.WEIGHT ?? 20}%
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                    row.ACTIVE ? 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]' : 'bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF]'
                                  }`}
                                >
                                  {row.ACTIVE ? 'Aktif' : 'Non-Aktif'}
                                </span>
                              </td>
                            </>
                          )}

                          {/* Actions (only for non-packages view or other entities) */}
                          {!(entityName === 'QUESTIONS' && questionViewMode === 'PACKAGES') && (
                            <td className="px-5 py-3.5 text-right">
                              {isEditable ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(row)}
                                    className="p-1.5 rounded-md border border-[#CED4DA] bg-white hover:bg-[#F8F9FA] text-[#495057] transition-colors"
                                    title="Edit Data"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(row.ID)}
                                    className="p-1.5 rounded-md border border-[#FAD2CF] bg-white hover:bg-[#FCE8E6] text-[#DC3545] transition-colors"
                                    title="Hapus Data"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[#6C757D]">—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={14} className="px-5 py-10 text-center text-[#6C757D]">
                        Tidak ada data ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            <div className="px-4 py-3 border-t border-[#DEE2E6] bg-[#F8F9FA] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-[#6C757D]">
                {totalItems > 0 ? (
                  <>
                    Menampilkan{' '}
                    <span className="font-bold text-[#1A1C1E]">
                      {pageSize > 0 ? (validCurrentPage - 1) * pageSize + 1 : 1}
                    </span>{' '}
                    -{' '}
                    <span className="font-bold text-[#1A1C1E]">
                      {pageSize > 0 ? Math.min(validCurrentPage * pageSize, totalItems) : totalItems}
                    </span>{' '}
                    dari <span className="font-bold text-[#1A1C1E]">{totalItems}</span> data
                  </>
                ) : (
                  <span>0 data ditemukan</span>
                )}
              </div>

              {pageSize > 0 && totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={validCurrentPage <= 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-2.5 py-1.5 rounded border border-[#CED4DA] bg-white text-[#495057] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F1F3F5] font-medium transition-colors inline-flex items-center gap-1 shadow-2xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Sebelumnya</span>
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
                      .map((page, idx, arr) => {
                        const prev = arr[idx - 1];
                        return (
                          <React.Fragment key={page}>
                            {prev && page - prev > 1 && <span className="px-1 text-[#ADB5BD]">...</span>}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(page)}
                              className={`min-w-[28px] h-7 rounded text-xs font-bold transition-colors ${
                                validCurrentPage === page
                                  ? 'bg-[#0052CC] text-white shadow-2xs'
                                  : 'bg-white border border-[#CED4DA] text-[#495057] hover:bg-[#F1F3F5]'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    disabled={validCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="px-2.5 py-1.5 rounded border border-[#CED4DA] bg-white text-[#495057] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F1F3F5] font-medium transition-colors inline-flex items-center gap-1 shadow-2xs"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit / Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg w-full max-w-xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden border border-[#DEE2E6]">
            <div className="px-6 py-4 border-b border-[#DEE2E6] flex items-center justify-between bg-[#F8F9FA]">
              <h3 className="text-base font-bold text-[#1A1C1E]">
                {editingItem ? 'Edit Data' : 'Tambah Data Baru'}
              </h3>
              <button
                type="button"
                onClick={() => { setModalOpen(false); setEditingItem(null); }}
                className="p-1.5 rounded text-[#6C757D] hover:text-[#1A1C1E] hover:bg-[#E9ECEF]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {entityName === 'USERS' && (
                <>
                  <div className="space-y-1">
                    <label className="font-medium text-[#1A1C1E]">Username / NIS / NIP *</label>
                    <input
                      type="text"
                      required
                      value={formState.USERNAME || ''}
                      onChange={e => setFormState({ ...formState, USERNAME: e.target.value })}
                      className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-[#1A1C1E]">Nama Lengkap *</label>
                    <input
                      type="text"
                      required
                      value={formState.NAME || ''}
                      onChange={e => setFormState({ ...formState, NAME: e.target.value })}
                      className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-[#1A1C1E]">Email</label>
                    <input
                      type="email"
                      value={formState.EMAIL || ''}
                      onChange={e => setFormState({ ...formState, EMAIL: e.target.value })}
                      className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
                    />
                  </div>
                  {(filterRole === 'TEACHER' || formState.ROLE === 'TEACHER') && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-medium text-[#1A1C1E]">Kode Guru di Jadwal (A s/d T)</label>
                        <span className="text-[10px] text-[#0052CC] font-mono">Kode Huruf Sesuai Database/Jadwal</span>
                      </div>
                      <input
                        type="text"
                        maxLength={5}
                        value={formState.TEACHER_CODE || ''}
                        onChange={e => setFormState({ ...formState, TEACHER_CODE: e.target.value.toUpperCase() })}
                        placeholder="Contoh: A, B, C, D... T"
                        className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] font-mono text-[#0052CC] font-bold"
                      />
                    </div>
                  )}
                  {filterRole === 'STUDENT' && (
                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E]">Kelas</label>
                      <select
                        value={formState.CLASS_ID || ''}
                        onChange={e => setFormState({ ...formState, CLASS_ID: e.target.value })}
                        className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-white text-[#1A1C1E]"
                      >
                        <option value="">-- Pilih Kelas --</option>
                        {lookup.classes.map(c => (
                          <option key={c.ID} value={c.ID}>
                            {c.NAME}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="font-medium text-[#1A1C1E]">
                      Password {editingItem ? '(Kosongkan jika tidak diubah)' : '*'}
                    </label>
                    <input
                      type="password"
                      required={!editingItem}
                      value={formState.PASSWORD || ''}
                      onChange={e => setFormState({ ...formState, PASSWORD: e.target.value })}
                      placeholder={editingItem ? 'Biarkan kosong jika tidak diubah' : 'Minimal 8 karakter'}
                      className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="userActive"
                      checked={formState.ACTIVE ?? true}
                      onChange={e => setFormState({ ...formState, ACTIVE: e.target.checked })}
                      className="rounded text-[#0052CC] focus:ring-[#0052CC]"
                    />
                    <label htmlFor="userActive" className="font-medium text-[#1A1C1E]">
                      Akun Aktif
                    </label>
                  </div>
                </>
              )}

              {entityName === 'CLASSES' && (
                <>
                  {/* Kurikulum Kelas */}
                  <div className="space-y-1.5 pb-2 border-b border-[#DEE2E6]">
                    <label className="font-medium text-[#1A1C1E] flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#0052CC]" />
                        <span>Kurikulum Kelas *</span>
                      </span>
                      <span className="text-[11px] text-[#0052CC] font-mono">
                        {formState.CURRICULUM || 'MERDEKA'}
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['MERDEKA', 'K13'] as CurriculumType[]).map(cur => {
                        const isCurSelected = (formState.CURRICULUM || 'MERDEKA') === cur;
                        return (
                          <button
                            key={cur}
                            type="button"
                            onClick={() => {
                              const curLevel = formState.LEVEL || 'X';
                              const suggestions = (CLASS_SUGGESTIONS[cur] || []).filter(s => s.level === curLevel);
                              const firstSug = suggestions[0]?.name || '';
                              setFormState({
                                ...formState,
                                CURRICULUM: cur,
                                STREAM: cur === 'MERDEKA' ? (curLevel === 'X' ? 'FASE_E' : 'FASE_F') : 'MIPA',
                                NAME: firstSug || formState.NAME,
                                ID: editingItem ? formState.ID : ('KLS-' + sanitizeIdentifier(firstSug || formState.NAME || ''))
                              });
                            }}
                            className={`px-3 py-2 rounded-md border text-left flex items-center justify-between transition-all ${
                              isCurSelected
                                ? 'border-[#0052CC] bg-[#EBF3FC] text-[#0052CC] font-bold ring-1 ring-[#0052CC]'
                                : 'border-[#CED4DA] bg-white text-[#495057] hover:bg-[#F8F9FA]'
                            }`}
                          >
                            <span>{cur === 'MERDEKA' ? 'Kurikulum Merdeka' : 'Kurikulum 2013 (K13)'}</span>
                            {isCurSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#0052CC]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E]">Tingkat / Jenjang *</label>
                      <select
                        value={formState.LEVEL || 'X'}
                        onChange={e => {
                          const newLvl = e.target.value;
                          const cur = (formState.CURRICULUM || 'MERDEKA') as CurriculumType;
                          const suggestions = (CLASS_SUGGESTIONS[cur] || []).filter(s => s.level === newLvl);
                          const firstSug = suggestions[0]?.name || '';
                          setFormState({
                            ...formState,
                            LEVEL: newLvl,
                            STREAM: cur === 'MERDEKA' ? (newLvl === 'X' ? 'FASE_E' : 'FASE_F') : (formState.STREAM || 'MIPA'),
                            NAME: firstSug || formState.NAME,
                            ID: editingItem ? formState.ID : ('KLS-' + sanitizeIdentifier(firstSug || formState.NAME || ''))
                          });
                        }}
                        className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-white text-[#1A1C1E] font-medium"
                      >
                        <option value="X">Kelas X {formState.CURRICULUM !== 'K13' ? '(Fase E)' : ''}</option>
                        <option value="XI">Kelas XI {formState.CURRICULUM !== 'K13' ? '(Fase F)' : ''}</option>
                        <option value="XII">Kelas XII {formState.CURRICULUM !== 'K13' ? '(Fase F)' : ''}</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E]">Jurusan / Peminatan (Stream)</label>
                      <select
                        value={formState.STREAM || (formState.CURRICULUM === 'K13' ? 'MIPA' : 'FASE_E')}
                        onChange={e => setFormState({ ...formState, STREAM: e.target.value })}
                        className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-white text-[#1A1C1E] font-medium"
                      >
                        {formState.CURRICULUM === 'K13' ? (
                          <>
                            <option value="MIPA">MIPA (Matematika & IPA)</option>
                            <option value="IPS">IPS (Ilmu Pengetahuan Sosial)</option>
                            <option value="BAHASA">Bahasa & Budaya</option>
                            <option value="KEJURUAN">Kejuruan / Vokasi</option>
                            <option value="UMUM">Umum</option>
                          </>
                        ) : (
                          <>
                            <option value="FASE_E">Fase E (Umum Kelas 10)</option>
                            <option value="FASE_F">Fase F (Pilihan Kelas 11 & 12)</option>
                            <option value="MIPA">Fokus Sains (MIPA)</option>
                            <option value="IPS">Fokus Sosial (IPS)</option>
                            <option value="KEJURUAN">Konsentrasi Kejuruan</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Saran Format Cepat Nama Kelas */}
                  <div className="space-y-1.5 p-2.5 bg-[#F8F9FA] rounded-md border border-[#E9ECEF]">
                    <span className="font-semibold text-[#1A1C1E] text-[11px] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#0052CC]" />
                      Saran Cepat Nama Kelas ({formState.CURRICULUM === 'K13' ? 'K13' : 'Kurikulum Merdeka'}):
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(CLASS_SUGGESTIONS[(formState.CURRICULUM || 'MERDEKA') as CurriculumType] || [])
                        .filter(s => s.level === (formState.LEVEL || 'X'))
                        .map(sug => (
                          <button
                            key={sug.name}
                            type="button"
                            onClick={() => {
                              setFormState({
                                ...formState,
                                NAME: sug.name,
                                STREAM: sug.stream || formState.STREAM,
                                ID: editingItem ? formState.ID : ('KLS-' + sanitizeIdentifier(sug.name))
                              });
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] border font-medium transition-all ${
                              formState.NAME === sug.name
                                ? 'bg-[#0052CC] text-white border-[#0052CC]'
                                : 'bg-white text-[#495057] border-[#CED4DA] hover:border-[#0052CC]'
                            }`}
                          >
                            {sug.name}
                          </button>
                        ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E]">Nama Kelas *</label>
                      <input
                        type="text"
                        required
                        value={formState.NAME || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setFormState({
                            ...formState,
                            NAME: val,
                            ID: editingItem ? formState.ID : ('KLS-' + sanitizeIdentifier(val))
                          });
                        }}
                        placeholder="Contoh: 10-A atau X MIPA 1"
                        className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E] font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E] flex items-center justify-between">
                        <span>ID Kelas (Otomatis) *</span>
                        <span className="text-[10px] text-[#6C757D]">Primary Key</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formState.ID || ''}
                        onChange={e => setFormState({ ...formState, ID: e.target.value })}
                        placeholder="Contoh: KLS-10A"
                        className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-[#F8F9FA] font-mono text-[#0052CC] font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-medium text-[#1A1C1E] flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-[#0052CC]" />
                        <span>Wali Kelas (Dari Data Guru)</span>
                      </label>
                      {teachersList.length > 0 ? (
                        <span className="text-[11px] text-[#0052CC] bg-[#E8F0FE] border border-[#B3D1FF] px-2 py-0.5 rounded font-medium">
                          {teachersList.length} Guru Terdaftar
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#C5221F] bg-[#FCE8E6] border border-[#FAD2CF] px-2 py-0.5 rounded font-medium">
                          Belum ada data guru
                        </span>
                      )}
                    </div>

                    <select
                      value={formState.HOMEROOM || ''}
                      onChange={e => setFormState({ ...formState, HOMEROOM: e.target.value })}
                      className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-white text-[#1A1C1E] font-medium"
                    >
                      <option value="">-- Pilih Guru Wali Kelas --</option>
                      {teachersList.map(t => (
                        <option key={t.ID} value={t.NAME}>
                          {t.NAME} {t.USERNAME ? `(NIP/User: ${t.USERNAME})` : ''}
                        </option>
                      ))}
                      {formState.HOMEROOM &&
                        !teachersList.some(
                          t => t.NAME === formState.HOMEROOM || t.ID === formState.HOMEROOM
                        ) && (
                          <option value={formState.HOMEROOM}>
                            {formState.HOMEROOM} (Guru Sebelumnya / Manual)
                          </option>
                        )}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="classActive"
                      checked={formState.ACTIVE ?? true}
                      onChange={e => setFormState({ ...formState, ACTIVE: e.target.checked })}
                      className="rounded text-[#0052CC] focus:ring-[#0052CC]"
                    />
                    <label htmlFor="classActive" className="font-medium text-[#1A1C1E]">
                      Kelas Aktif
                    </label>
                  </div>
                </>
              )}

              {entityName === 'SUBJECTS' && (() => {
                const currentCurriculum: CurriculumType = formState.CURRICULUM || 'MERDEKA';
                const currentLevel = formState.LEVEL || 'X';
                const presetsForCurriculum = OFFICIAL_SUBJECT_PRESETS.filter(p => p.curriculum === currentCurriculum);
                const availablePresets = presetsForCurriculum.filter(
                  p => p.level === currentLevel || p.level === 'SEMUA' || p.level === 'Semua'
                );

                const targetClasses = lookup.classes.filter(
                  c => (!formState.LEVEL || formState.LEVEL === 'Semua Tingkat' || c.LEVEL === formState.LEVEL)
                );

                const applySubjectPreset = (presetBaseCode: string, targetClassId?: string, targetLevel?: string, targetCurriculum?: CurriculumType) => {
                  const cur = targetCurriculum || currentCurriculum;
                  const lvl = targetLevel || currentLevel;
                  const cid = targetClassId !== undefined ? targetClassId : (formState.CLASS_ID || '');
                  const selClass = lookup.classes.find(c => c.ID === cid);
                  const preset = OFFICIAL_SUBJECT_PRESETS.find(p => p.curriculum === cur && p.baseCode === presetBaseCode);

                  if (preset) {
                    const autoCode = generateSubjectCode(preset.baseCode, lvl, selClass, cur);
                    const autoId = generateSubjectId(preset.baseCode, lvl, selClass, cur);
                    const autoName = generateSubjectDisplayName(preset.name, selClass, lvl);

                    setFormState(prev => ({
                      ...prev,
                      _selectedPresetCode: preset.baseCode,
                      _selectedPresetName: preset.name,
                      CODE: autoCode,
                      ID: editingItem ? prev.ID : autoId,
                      NAME: autoName,
                      GROUP: preset.group,
                      KKM: preset.defaultKkm,
                      HOURS_PER_WEEK: preset.defaultHours
                    }));
                  }
                };

                return (
                  <>
                    {/* Kurikulum Mata Pelajaran */}
                    <div className="space-y-1.5 pb-2 border-b border-[#DEE2E6]">
                      <label className="font-medium text-[#1A1C1E] flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-[#0052CC]" />
                          <span>Kurikulum Mata Pelajaran *</span>
                        </span>
                        <span className="text-[11px] text-[#0052CC] font-mono">
                          {CURRICULUM_CONFIG[currentCurriculum]?.shortName || currentCurriculum}
                        </span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['MERDEKA', 'K13'] as CurriculumType[]).map(cur => {
                          const isCurSelected = currentCurriculum === cur;
                          return (
                            <button
                              key={cur}
                              type="button"
                              onClick={() => {
                                setFormState(prev => ({ ...prev, CURRICULUM: cur }));
                                if (formState._selectedPresetCode && formState._selectedPresetCode !== '__MANUAL__') {
                                  applySubjectPreset(formState._selectedPresetCode, formState.CLASS_ID, formState.LEVEL, cur);
                                }
                              }}
                              className={`px-3 py-2 rounded-md border text-left flex items-center justify-between transition-all ${
                                isCurSelected
                                  ? 'border-[#0052CC] bg-[#EBF3FC] text-[#0052CC] font-bold ring-1 ring-[#0052CC]'
                                  : 'border-[#CED4DA] bg-white text-[#495057] hover:bg-[#F8F9FA]'
                              }`}
                            >
                              <span>{cur === 'MERDEKA' ? 'Kurikulum Merdeka' : 'Kurikulum 2013 (K13)'}</span>
                              {isCurSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#0052CC]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Tingkat Kelas */}
                      <div className="space-y-1">
                        <label className="font-medium text-[#1A1C1E]">Tingkat / Jenjang *</label>
                        <select
                          value={formState.LEVEL || 'X'}
                          onChange={e => {
                            const newLevel = e.target.value;
                            setFormState(prev => ({ ...prev, LEVEL: newLevel, CLASS_ID: '' }));
                            if (formState._selectedPresetCode && formState._selectedPresetCode !== '__MANUAL__') {
                              applySubjectPreset(formState._selectedPresetCode, '', newLevel, currentCurriculum);
                            }
                          }}
                          className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-white text-[#1A1C1E] font-medium"
                        >
                          <option value="X">Kelas X {currentCurriculum === 'MERDEKA' ? '(Fase E)' : ''}</option>
                          <option value="XI">Kelas XI {currentCurriculum === 'MERDEKA' ? '(Fase F)' : ''}</option>
                          <option value="XII">Kelas XII {currentCurriculum === 'MERDEKA' ? '(Fase F)' : ''}</option>
                          <option value="Semua Tingkat">Semua Tingkat (Lintas Jenjang)</option>
                        </select>
                      </div>

                      {/* Target Rombel / Kelas Spesifik */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="font-medium text-[#1A1C1E] flex items-center gap-1">
                            <span>Target Kelas / Rombel</span>
                          </label>
                          <span className="text-[10px] text-[#0052CC] font-medium">Bisa beda guru per rombel</span>
                        </div>
                        <select
                          value={formState.CLASS_ID || ''}
                          onChange={e => {
                            const newClassId = e.target.value;
                            setFormState(prev => ({ ...prev, CLASS_ID: newClassId }));
                            if (formState._selectedPresetCode && formState._selectedPresetCode !== '__MANUAL__') {
                              applySubjectPreset(formState._selectedPresetCode, newClassId, currentLevel, currentCurriculum);
                            }
                          }}
                          className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-white text-[#1A1C1E] font-medium"
                        >
                          <option value="">-- Berlaku untuk Semua Kelas Tingkat {currentLevel} --</option>
                          {targetClasses.map(c => (
                            <option key={c.ID} value={c.ID}>
                              Kelas {c.NAME} {c.HOMEROOM ? `(Wali: ${c.HOMEROOM})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Pilihan Nama Mapel Resmi Sesuai Kurikulum */}
                    <div className="space-y-1.5 p-3 rounded-lg bg-[#F8F9FA] border border-[#DEE2E6]">
                      <label className="font-semibold text-[#1A1C1E] flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-[#0052CC]" />
                          <span>Pilihan Nama Mapel Resmi ({currentCurriculum === 'MERDEKA' ? 'Kurikulum Merdeka' : 'Kurikulum K13'}) *</span>
                        </span>
                        <span className="text-[10px] text-[#6C757D]">Otomatis isi Kode & ID</span>
                      </label>

                      <select
                        value={formState._selectedPresetCode || ''}
                        onChange={e => {
                          const code = e.target.value;
                          if (code === '__MANUAL__') {
                            setFormState(prev => ({
                              ...prev,
                              _selectedPresetCode: '__MANUAL__'
                            }));
                          } else if (code) {
                            applySubjectPreset(code);
                          }
                        }}
                        className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-white text-[#1A1C1E] font-medium"
                      >
                        <option value="">-- Pilih dari Daftar Mapel Resmi Kurikulum --</option>
                        {availablePresets.map(p => (
                          <option key={p.baseCode} value={p.baseCode}>
                            {p.name} [{p.baseCode}] — {p.group}
                          </option>
                        ))}
                        <option value="__MANUAL__">+ Ketik Nama Mapel Kustom / Manual</option>
                      </select>

                      <p className="text-[11px] text-[#5E6C84]">
                        Memilih mapel resmi otomatis menghitung <b>Kode Mapel</b> dan <b>ID Mapel unik sesuai kelas</b> yang dipilih.
                      </p>
                    </div>

                    {/* Visual Card: Auto-Generated ID Mapel & Kode Mapel */}
                    <div className="p-3 bg-[#EBF3FC] border border-[#B3D1FF] rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#0052CC] flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5 text-[#0052CC]" />
                          ID Mapel Unik (Otomatis Sesuai Rombel Kelas):
                        </span>
                        <span className="font-mono font-bold text-xs bg-white text-[#0052CC] px-2 py-0.5 rounded border border-[#B3D1FF]">
                          {formState.ID || 'MP-...'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#0052CC]/80 leading-relaxed">
                        ID mapel unik ini memastikan mata pelajaran yang sama (contoh: Matematika) dapat dibedakan untuk tiap kelas ({formState.CLASS_ID ? classNameMap[formState.CLASS_ID] || formState.CLASS_ID : 'Semua Kelas'}), sehingga guru pengampu dan jadwal ujian dapat diatur secara mandiri.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-medium text-[#1A1C1E] flex items-center justify-between">
                          <span>Kode Mapel *</span>
                          <span className="text-[10px] text-[#6C757D]">Otomatis/Dapat Diedit</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formState.CODE || ''}
                          onChange={e => setFormState({ ...formState, CODE: e.target.value })}
                          placeholder="Contoh: MTK-10A"
                          className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] font-mono text-[#1A1C1E] font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-medium text-[#1A1C1E] flex items-center justify-between">
                          <span>ID Mapel *</span>
                          <span className="text-[10px] text-[#6C757D]">Primary Key</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formState.ID || ''}
                          onChange={e => setFormState({ ...formState, ID: e.target.value })}
                          placeholder="Contoh: MP-MTK-10A"
                          className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] font-mono text-[#0052CC] font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E]">Nama Mata Pelajaran *</label>
                      <input
                        type="text"
                        required
                        value={formState.NAME || ''}
                        onChange={e => setFormState({ ...formState, NAME: e.target.value })}
                        placeholder="Contoh: Matematika (Kelas 10-A)"
                        className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E] font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E]">Kelompok Kurikulum</label>
                      <select
                        value={formState.GROUP || 'Mata Pelajaran Umum (Wajib)'}
                        onChange={e => setFormState({ ...formState, GROUP: e.target.value })}
                        className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-white text-[#1A1C1E]"
                      >
                        <option value="Mata Pelajaran Umum (Wajib)">Mata Pelajaran Umum (Wajib)</option>
                        <option value="Peminatan MIPA (Sains)">Peminatan MIPA (Sains)</option>
                        <option value="Peminatan IPS (Sosial)">Peminatan IPS (Sosial)</option>
                        <option value="Muatan Lokal & Kejuruan">Muatan Lokal & Kejuruan</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-medium text-[#1A1C1E] flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#0052CC]" />
                          <span>Guru Pengampu *</span>
                        </label>
                        <span className="text-[11px] text-[#6C757D]">
                          {currentUser.ROLE === 'TEACHER' ? 'Terkunci pada akun Anda' : 'Pengampu spesifik untuk kelas ini'}
                        </span>
                      </div>
                      {currentUser.ROLE === 'TEACHER' ? (
                        <div className="w-full px-3.5 py-2 border border-[#B3D1FF] bg-[#F4F8FD] rounded-md text-[#0052CC] font-semibold text-sm flex items-center justify-between">
                          <span>{currentUser.NAME}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">
                            {currentUser.TEACHER_CODE ? `Kode: ${currentUser.TEACHER_CODE}` : 'Guru Anda'}
                          </span>
                        </div>
                      ) : (
                        <select
                          value={formState.TEACHER_ID || ''}
                          onChange={e => setFormState({ ...formState, TEACHER_ID: e.target.value })}
                          className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-white text-[#1A1C1E] font-medium"
                        >
                          <option value="">-- Pilih Guru Pengampu --</option>
                          {lookup.users
                            .filter(u => u.ROLE === 'TEACHER')
                            .map(t => (
                              <option key={t.ID} value={t.ID}>
                                {t.NAME} ({t.USERNAME})
                              </option>
                            ))}
                        </select>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-medium text-[#1A1C1E]">KKM (Ketuntasan Minimal)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={formState.KKM ?? 75}
                          onChange={e => setFormState({ ...formState, KKM: Number(e.target.value) })}
                          className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-medium text-[#1A1C1E]">Beban Jam Pelajaran (JP/Minggu)</label>
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={formState.HOURS_PER_WEEK ?? 3}
                          onChange={e => setFormState({ ...formState, HOURS_PER_WEEK: Number(e.target.value) })}
                          className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="subjectActive"
                        checked={formState.ACTIVE ?? true}
                        onChange={e => setFormState({ ...formState, ACTIVE: e.target.checked })}
                        className="rounded text-[#0052CC] focus:ring-[#0052CC]"
                      />
                      <label htmlFor="subjectActive" className="font-medium text-[#1A1C1E]">
                        Mata Pelajaran Aktif
                      </label>
                    </div>
                  </>
                );
              })()}

              {entityName === 'EXAMS' && (
                <>
                  <div className="space-y-1">
                    <label className="font-medium text-[#1A1C1E]">Judul / Nama Ujian *</label>
                    <input
                      type="text"
                      required
                      value={formState.TITLE || ''}
                      onChange={e => setFormState({ ...formState, TITLE: e.target.value })}
                      placeholder="Contoh: Ujian Tengah Semester Matematika"
                      className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-[#1A1C1E] flex items-center justify-between">
                      <span>Jenis Penilaian *</span>
                      <span className="text-[10px] text-[#0052CC] font-normal">Sesuai Frekuensi</span>
                    </label>
                    <select
                      required
                      value={formState.ASSESSMENT_TYPE_ID || 'SH'}
                      onChange={e => setFormState({ ...formState, ASSESSMENT_TYPE_ID: e.target.value })}
                      className="w-full px-3 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-white text-[#1A1C1E] font-medium"
                    >
                      {availableAssessmentTypes.map(t => (
                        <option key={t.CODE || t.ID} value={t.CODE || t.ID}>
                          [{t.CODE || t.ID}] {t.NAME} — Frekuensi: {t.FREQUENCY || 'Fleksibel'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E]">Mata Pelajaran *</label>
                      <select
                        required
                        value={formState.SUBJECT_ID || ''}
                        onChange={e => setFormState({ ...formState, SUBJECT_ID: e.target.value })}
                        className="w-full px-3 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-white text-[#1A1C1E]"
                      >
                        <option value="">-- Pilih Mapel --</option>
                        {lookup.subjects.map(s => (
                          <option key={s.ID} value={s.ID}>
                            {s.NAME}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E]">Kelas Sasaran *</label>
                      <select
                        required
                        value={formState.CLASS_ID || ''}
                        onChange={e => setFormState({ ...formState, CLASS_ID: e.target.value })}
                        className="w-full px-3 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-white text-[#1A1C1E]"
                      >
                        <option value="">-- Pilih Kelas --</option>
                        {lookup.classes.map(c => (
                          <option key={c.ID} value={c.ID}>
                            {c.NAME}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E]">Tanggal Ujian *</label>
                      <input
                        type="date"
                        required
                        value={formState.EXAM_DATE || ''}
                        onChange={e => setFormState({ ...formState, EXAM_DATE: e.target.value })}
                        className="w-full px-3 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E]">Jam Mulai *</label>
                      <input
                        type="time"
                        required
                        value={formState.START_TIME || ''}
                        onChange={e => setFormState({ ...formState, START_TIME: e.target.value })}
                        className="w-full px-3 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E]">Durasi (Menit) *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={formState.DURATION_MIN || 60}
                        onChange={e => setFormState({ ...formState, DURATION_MIN: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E]">Maks. Pelanggaran</label>
                      <input
                        type="number"
                        min="1"
                        value={formState.MAX_VIOLATIONS || 3}
                        onChange={e => setFormState({ ...formState, MAX_VIOLATIONS: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-[#1A1C1E]">Status Ujian</label>
                    <select
                      value={formState.STATUS || 'DRAFT'}
                      onChange={e => setFormState({ ...formState, STATUS: e.target.value })}
                      className="w-full px-3 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-white text-[#1A1C1E]"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="SCHEDULED">Terjadwal</option>
                      <option value="ACTIVE">Aktif (Dapat Dikerjakan)</option>
                      <option value="FINISHED">Selesai</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="randomizeQ"
                      checked={formState.RANDOMIZE ?? true}
                      onChange={e => setFormState({ ...formState, RANDOMIZE: e.target.checked })}
                      className="rounded text-[#0052CC] focus:ring-[#0052CC]"
                    />
                    <label htmlFor="randomizeQ" className="font-medium text-[#1A1C1E]">
                      Acak Urutan Soal untuk Siswa
                    </label>
                  </div>
                </>
              )}

              {entityName === 'QUESTIONS' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E]">Pilih Jadwal Ujian *</label>
                      <select
                        required
                        value={formState.EXAM_ID || ''}
                        onChange={e => {
                          const newExamId = e.target.value;
                          const updates: any = { EXAM_ID: newExamId };
                          const ex = lookup.exams.find(x => x.ID === newExamId);
                          if (ex?.ASSESSMENT_TYPE_ID && !formState.ASSESSMENT_TYPE_ID) {
                            updates.ASSESSMENT_TYPE_ID = ex.ASSESSMENT_TYPE_ID;
                          }
                          setFormState({ ...formState, ...updates });
                        }}
                        className="w-full px-3 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-white text-[#1A1C1E]"
                      >
                        <option value="">-- Pilih Ujian --</option>
                        {lookup.exams.map(e => (
                          <option key={e.ID} value={e.ID}>
                            {e.TITLE}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E] flex items-center justify-between">
                        <span>Jenis Penilaian (Kategori Bank Soal) *</span>
                        <span className="text-[10px] text-[#0052CC] font-normal">Sesuai Frekuensi</span>
                      </label>
                      <select
                        required
                        value={formState.ASSESSMENT_TYPE_ID || 'SH'}
                        onChange={e => setFormState({ ...formState, ASSESSMENT_TYPE_ID: e.target.value })}
                        className="w-full px-3 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-white text-[#1A1C1E] font-medium"
                      >
                        {availableAssessmentTypes.map(t => (
                          <option key={t.CODE || t.ID} value={t.CODE || t.ID}>
                            [{t.CODE || t.ID}] {t.NAME} — Frekuensi: {t.FREQUENCY || 'Fleksibel'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E]">Tipe Soal</label>
                      <select
                        value={formState.TYPE || 'MCQ'}
                        onChange={e => {
                          const newType = e.target.value;
                          const updates: any = { TYPE: newType };
                          if (newType === 'TRUE_FALSE') {
                            updates.OPTION_A = 'Benar';
                            updates.OPTION_B = 'Salah';
                            updates.OPTION_C = '';
                            updates.OPTION_D = '';
                            updates.OPTION_E = '';
                            updates.ANSWER = formState.ANSWER || 'BENAR';
                          } else if (newType === 'MCQ' && (!formState.ANSWER || formState.ANSWER.length > 1)) {
                            updates.ANSWER = 'A';
                          }
                          setFormState({ ...formState, ...updates });
                        }}
                        className="w-full px-3 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-white text-[#1A1C1E] font-medium"
                      >
                        <option value="MCQ">Pilihan Ganda (PG Tunggal)</option>
                        <option value="COMPLEX_MCQ">Pilihan Ganda Kompleks (Banyak Jawaban)</option>
                        <option value="TRUE_FALSE">Benar / Salah (True / False)</option>
                        <option value="MATCHING">Menjodohkan / Mencocokkan</option>
                        <option value="SHORT_ANSWER">Isian Singkat</option>
                        <option value="ESSAY">Uraian / Esai</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E]">Bobot Poin</label>
                      <input
                        type="number"
                        min="1"
                        value={formState.POINTS || 10}
                        onChange={e => setFormState({ ...formState, POINTS: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-[#1A1C1E]">Teks Pertanyaan / Soal *</label>
                    <textarea
                      required
                      rows={3}
                      value={formState.QUESTION || ''}
                      onChange={e => setFormState({ ...formState, QUESTION: e.target.value })}
                      placeholder="Tuliskan teks pertanyaan soal secara lengkap..."
                      className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
                    />
                  </div>

                  {/* UI per Question Type */}
                  {formState.TYPE === 'MCQ' && (
                    <div className="space-y-2.5 pt-2 border-t border-[#DEE2E6]">
                      <div className="text-[11px] font-semibold text-[#1A1C1E]">Opsi Pilihan Jawaban (A - E):</div>
                      <div className="space-y-2">
                        {(['A', 'B', 'C', 'D', 'E'] as const).map(letter => (
                          <div key={letter} className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded bg-[#F1F3F5] text-[#495057] font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {letter}
                            </span>
                            <input
                              type="text"
                              placeholder={`Pilihan ${letter} ${letter === 'E' ? '(Opsional)' : ''}`}
                              value={formState[`OPTION_${letter}`] || ''}
                              onChange={e => setFormState({ ...formState, [`OPTION_${letter}`]: e.target.value })}
                              className="flex-1 px-3 py-1.5 border border-[#CED4DA] rounded-md text-xs text-[#1A1C1E]"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 pt-1">
                        <label className="font-medium text-xs text-[#1A1C1E]">Kunci Jawaban Benar:</label>
                        <select
                          value={formState.ANSWER || 'A'}
                          onChange={e => setFormState({ ...formState, ANSWER: e.target.value })}
                          className="px-3 py-1.5 border border-[#CED4DA] rounded-md font-bold text-xs uppercase text-[#0052CC] bg-white"
                        >
                          <option value="A">Opsi A</option>
                          <option value="B">Opsi B</option>
                          <option value="C">Opsi C</option>
                          <option value="D">Opsi D</option>
                          <option value="E">Opsi E</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {formState.TYPE === 'COMPLEX_MCQ' && (
                    <div className="space-y-2.5 pt-2 border-t border-[#DEE2E6]">
                      <div className="text-[11px] font-semibold text-[#1A1C1E]">
                        Opsi Jawaban (Pilih centang pada kunci jawaban yang benar):
                      </div>
                      <div className="space-y-2">
                        {(['A', 'B', 'C', 'D', 'E'] as const).map(letter => {
                          const currentKeys = (formState.ANSWER || '')
                            .split(/[,;\s]+/)
                            .map((s: string) => s.trim().toUpperCase())
                            .filter(Boolean);
                          const isCorrect = currentKeys.includes(letter);

                          const toggleKey = () => {
                            let nextKeys: string[];
                            if (isCorrect) {
                              nextKeys = currentKeys.filter((k: string) => k !== letter);
                            } else {
                              nextKeys = [...currentKeys, letter].sort();
                            }
                            setFormState({ ...formState, ANSWER: nextKeys.join(', ') });
                          };

                          return (
                            <div key={letter} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={toggleKey}
                                className={`w-7 h-7 rounded font-bold text-xs flex items-center justify-center flex-shrink-0 transition-colors ${
                                  isCorrect
                                    ? 'bg-[#0052CC] text-white ring-2 ring-blue-300'
                                    : 'bg-[#F1F3F5] text-[#495057] hover:bg-[#E2E8F0]'
                                }`}
                                title={isCorrect ? 'Kunci Benar' : 'Bukan Kunci'}
                              >
                                {letter}
                              </button>
                              <input
                                type="text"
                                placeholder={`Teks Pilihan ${letter}`}
                                value={formState[`OPTION_${letter}`] || ''}
                                onChange={e => setFormState({ ...formState, [`OPTION_${letter}`]: e.target.value })}
                                className="flex-1 px-3 py-1.5 border border-[#CED4DA] rounded-md text-xs text-[#1A1C1E]"
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="p-2.5 rounded-md bg-[#F0F7FF] border border-[#B3D1FF] flex items-center justify-between text-xs">
                        <span className="text-[#495057]">Kunci Jawaban Terpilih:</span>
                        <span className="font-mono font-bold text-[#0052CC]">
                          {formState.ANSWER || '(Belum ada kunci dipilih - klik huruf di atas)'}
                        </span>
                      </div>
                    </div>
                  )}

                  {formState.TYPE === 'TRUE_FALSE' && (
                    <div className="space-y-3 pt-2 border-t border-[#DEE2E6]">
                      <div className="text-[11px] font-semibold text-[#1A1C1E]">
                        Tentukan Kunci Jawaban Benar / Salah:
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFormState({ ...formState, ANSWER: 'BENAR', OPTION_A: 'Benar', OPTION_B: 'Salah' })}
                          className={`p-3 rounded-lg border text-center font-bold text-xs transition-colors ${
                            formState.ANSWER === 'BENAR'
                              ? 'bg-[#E6F4EA] border-[#137333] text-[#137333] ring-2 ring-emerald-300'
                              : 'bg-white border-[#CED4DA] text-[#495057] hover:bg-[#F8F9FA]'
                          }`}
                        >
                          ✓ KUNCI: BENAR
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormState({ ...formState, ANSWER: 'SALAH', OPTION_A: 'Benar', OPTION_B: 'Salah' })}
                          className={`p-3 rounded-lg border text-center font-bold text-xs transition-colors ${
                            formState.ANSWER === 'SALAH'
                              ? 'bg-[#FCE8E6] border-[#DC3545] text-[#DC3545] ring-2 ring-red-300'
                              : 'bg-white border-[#CED4DA] text-[#495057] hover:bg-[#F8F9FA]'
                          }`}
                        >
                          ✕ KUNCI: SALAH
                        </button>
                      </div>
                    </div>
                  )}

                  {formState.TYPE === 'MATCHING' && (() => {
                    const details = parseMatchingDetails(
                      formState.QUESTION || '',
                      {
                        A: formState.OPTION_A,
                        B: formState.OPTION_B,
                        C: formState.OPTION_C,
                        D: formState.OPTION_D,
                        E: formState.OPTION_E
                      },
                      formState.EXTRA_DATA,
                      formState.ANSWER
                    );
                    const currentPairs = parseMatchingAnswer(formState.ANSWER || '');
                    const leftItems = details.leftItems.length > 0
                      ? details.leftItems
                      : [
                          { key: '1', text: 'Pernyataan 1' },
                          { key: '2', text: 'Pernyataan 2' },
                          { key: '3', text: 'Pernyataan 3' }
                        ];

                    const syncMatching = (
                      newLeft: { key: string; text: string }[],
                      newPairs: Record<string, string>,
                      newOpts?: Partial<{ OPTION_A: string; OPTION_B: string; OPTION_C: string; OPTION_D: string; OPTION_E: string }>
                    ) => {
                      const updatedOpts = {
                        OPTION_A: newOpts?.OPTION_A !== undefined ? newOpts.OPTION_A : (formState.OPTION_A || ''),
                        OPTION_B: newOpts?.OPTION_B !== undefined ? newOpts.OPTION_B : (formState.OPTION_B || ''),
                        OPTION_C: newOpts?.OPTION_C !== undefined ? newOpts.OPTION_C : (formState.OPTION_C || ''),
                        OPTION_D: newOpts?.OPTION_D !== undefined ? newOpts.OPTION_D : (formState.OPTION_D || ''),
                        OPTION_E: newOpts?.OPTION_E !== undefined ? newOpts.OPTION_E : (formState.OPTION_E || '')
                      };
                      const rightList = [
                        updatedOpts.OPTION_A,
                        updatedOpts.OPTION_B,
                        updatedOpts.OPTION_C,
                        updatedOpts.OPTION_D,
                        updatedOpts.OPTION_E
                      ].filter(Boolean);

                      const extraData = buildMatchingExtraData(
                        formState.QUESTION || '',
                        newLeft,
                        rightList
                      );
                      const answerStr = formatMatchingAnswer(newPairs);

                      setFormState(prev => ({
                        ...prev,
                        ...updatedOpts,
                        ANSWER: answerStr,
                        EXTRA_DATA: extraData
                      }));
                    };

                    const handleAddLeftItem = () => {
                      const nextKey = String(leftItems.length + 1);
                      const nextLeft = [...leftItems, { key: nextKey, text: `Pernyataan ${nextKey}` }];
                      syncMatching(nextLeft, currentPairs);
                    };

                    const handleRemoveLeftItem = (idxToRemove: number) => {
                      if (leftItems.length <= 1) return;
                      const nextLeft = leftItems
                        .filter((_, i) => i !== idxToRemove)
                        .map((item, i) => ({ key: String(i + 1), text: item.text }));

                      const nextPairs: Record<string, string> = {};
                      nextLeft.forEach((_, i) => {
                        const oldKey = String(i >= idxToRemove ? i + 2 : i + 1);
                        const newKey = String(i + 1);
                        if (currentPairs[oldKey]) {
                          nextPairs[newKey] = currentPairs[oldKey];
                        }
                      });
                      syncMatching(nextLeft, nextPairs);
                    };

                    const handleLeftItemTextChange = (idx: number, newText: string) => {
                      const nextLeft = leftItems.map((item, i) => (i === idx ? { ...item, text: newText } : item));
                      syncMatching(nextLeft, currentPairs);
                    };

                    const handlePairSelect = (leftKey: string, rightKey: string) => {
                      const nextPairs = { ...currentPairs };
                      if (rightKey) {
                        nextPairs[leftKey.toUpperCase()] = rightKey.toUpperCase();
                      } else {
                        delete nextPairs[leftKey.toUpperCase()];
                      }
                      syncMatching(leftItems, nextPairs);
                    };

                    const rightOptions = [
                      { key: 'A', text: formState.OPTION_A || '', field: 'OPTION_A' as const },
                      { key: 'B', text: formState.OPTION_B || '', field: 'OPTION_B' as const },
                      { key: 'C', text: formState.OPTION_C || '', field: 'OPTION_C' as const },
                      { key: 'D', text: formState.OPTION_D || '', field: 'OPTION_D' as const },
                      { key: 'E', text: formState.OPTION_E || '', field: 'OPTION_E' as const }
                    ];

                    const activeRightOptions = rightOptions.filter(o => o.text.trim().length > 0 || ['A', 'B', 'C'].includes(o.key));

                    return (
                      <div className="space-y-4 pt-2 border-t border-[#DEE2E6]">
                        {/* Section Header */}
                        <div className="p-3 bg-[#F0F7FF] rounded-lg border border-[#B3D1FF] flex items-center justify-between text-xs text-[#0052CC]">
                          <span className="font-semibold">
                            🔗 <b>Pengaturan Soal Menjodohkan:</b> Susun pernyataan di kolom kiri, opsi jawaban di kolom kanan, dan tentukan pasangan kunci jawaban.
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white font-bold border border-[#B3D1FF] shrink-0">
                            {Object.keys(currentPairs).length} / {leftItems.length} Pasangan Terpasang
                          </span>
                        </div>

                        {/* Right Column Options */}
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-[#1A1C1E] uppercase tracking-wider">
                            1. Kolom Kanan (Pilihan Jawaban A, B, C, D, E):
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {rightOptions.map(opt => (
                              <div key={opt.key} className="flex items-center gap-1.5">
                                <span className="w-6 h-6 rounded bg-[#1A1C1E] text-white text-[10px] font-bold inline-flex items-center justify-center shrink-0">
                                  {opt.key}
                                </span>
                                <input
                                  type="text"
                                  placeholder={`Opsi ${opt.key} ${opt.key === 'E' ? '(Opsional)' : ''}`}
                                  value={opt.text}
                                  onChange={e => {
                                    syncMatching(leftItems, currentPairs, { [opt.field]: e.target.value });
                                  }}
                                  className="flex-1 px-3 py-1.5 border border-[#CED4DA] rounded-md text-xs"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Left Column Premises & Matching Dropdowns */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-[#1A1C1E] uppercase tracking-wider">
                              2. Kolom Kiri (Pernyataan / Premis) & Pasangan Kunci:
                            </label>
                            <button
                              type="button"
                              onClick={handleAddLeftItem}
                              className="px-2.5 py-1 text-[11px] font-bold text-[#0052CC] bg-[#E7F0FF] rounded-md border border-[#B3D1FF] hover:bg-[#D0E2FF] transition-colors inline-flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Tambah Pernyataan
                            </button>
                          </div>

                          <div className="space-y-2">
                            {leftItems.map((item, idx) => {
                              const pairedOption = currentPairs[item.key] || '';
                              return (
                                <div
                                  key={item.key}
                                  className="p-3 bg-white border border-[#DEE2E6] rounded-lg space-y-2 shadow-2xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-[#E8F0FE] text-[#0052CC] font-bold text-xs inline-flex items-center justify-center shrink-0">
                                      {idx + 1}
                                    </span>
                                    <input
                                      type="text"
                                      value={item.text}
                                      onChange={e => handleLeftItemTextChange(idx, e.target.value)}
                                      placeholder={`Teks Pernyataan ${idx + 1}...`}
                                      className="flex-1 px-3 py-1.5 border border-[#CED4DA] rounded-md text-xs font-medium text-[#1A1C1E]"
                                    />
                                    {leftItems.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveLeftItem(idx)}
                                        title="Hapus pernyataan"
                                        className="p-1.5 text-[#DC3545] hover:bg-[#FCE8E6] rounded-md transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 pl-8 text-xs">
                                    <span className="text-[#6C757D] font-bold shrink-0">➔ Pasangkan ke Kunci:</span>
                                    <select
                                      value={pairedOption}
                                      onChange={e => handlePairSelect(item.key, e.target.value)}
                                      className={`px-3 py-1.5 border rounded-md text-xs font-bold outline-none transition-colors ${
                                        pairedOption
                                          ? 'border-[#34A853] bg-[#E6F4EA] text-[#137333]'
                                          : 'border-[#CED4DA] bg-white text-[#495057]'
                                      }`}
                                    >
                                      <option value="">-- Pilih Opsi Pasangan --</option>
                                      {activeRightOptions.map(opt => (
                                        <option key={opt.key} value={opt.key}>
                                          Opsi {opt.key}: {opt.text || `(Teks Opsi ${opt.key} kosong)`}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Raw Answer String Input & Live Feedback */}
                        <div className="space-y-1.5 p-3 bg-[#F8F9FA] rounded-lg border border-[#DEE2E6]">
                          <label className="font-medium text-xs text-[#1A1C1E] flex items-center justify-between">
                            <span>Format Kunci Pasangan (Tersinkronisasi Otomatis):</span>
                            <span className="text-[10px] text-[#6C757D]">Format: 1-B; 2-A; 3-C</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formState.ANSWER || ''}
                            onChange={e => {
                              const raw = e.target.value;
                              const parsed = parseMatchingAnswer(raw);
                              syncMatching(leftItems, parsed);
                            }}
                            placeholder="1-B; 2-A; 3-C"
                            className="w-full px-3 py-1.5 border border-[#CED4DA] rounded-md font-mono font-bold text-xs text-[#0052CC] bg-white"
                          />
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] text-[#6C757D]">Preview Pasangan:</span>
                            {Object.entries(currentPairs).length === 0 ? (
                              <span className="text-[10px] text-[#DC3545] font-semibold italic">
                                Belum ada pasangan yang dipilih
                              </span>
                            ) : (
                              Object.entries(currentPairs).map(([l, r]) => (
                                <span
                                  key={l}
                                  className="px-2 py-0.5 rounded bg-[#E8F0FE] text-[#0052CC] border border-[#B3D1FF] font-mono font-bold text-[10px]"
                                >
                                  {l} ➔ {r}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {formState.TYPE === 'SHORT_ANSWER' && (
                    <div className="space-y-2 pt-2 border-t border-[#DEE2E6]">
                      <label className="font-medium text-xs text-[#1A1C1E]">
                        Kunci Jawaban Singkat (Bisa beberapa variasi dipisah koma) *
                      </label>
                      <input
                        type="text"
                        required
                        value={formState.ANSWER || ''}
                        onChange={e => setFormState({ ...formState, ANSWER: e.target.value })}
                        placeholder="Contoh: 90, 90 derajat, sembilan puluh"
                        className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md text-xs font-semibold text-[#0052CC]"
                      />
                      <p className="text-[10px] text-[#6C757D]">
                        Sistem akan mencocokkan jawaban siswa secara otomatis (tidak peka huruf besar/kecil).
                      </p>
                    </div>
                  )}

                  {formState.TYPE === 'ESSAY' && (
                    <div className="space-y-2 pt-2 border-t border-[#DEE2E6]">
                      <label className="font-medium text-xs text-[#1A1C1E]">
                        Pedoman Penskoran / Kunci Jawaban Uraian (Opsional):
                      </label>
                      <textarea
                        rows={2}
                        value={formState.ANSWER || ''}
                        onChange={e => setFormState({ ...formState, ANSWER: e.target.value })}
                        placeholder="Ketik kata kunci atau acuan penilaian untuk guru saat memeriksa esai..."
                        className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md text-xs text-[#1A1C1E]"
                      />
                    </div>
                  )}
                </>
              )}

              {entityName === 'ASSESSMENT_TYPES' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E]">Kode Singkatan *</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: SH, SAS, SAP, STS, SAJ"
                        value={formState.CODE || ''}
                        onChange={e => {
                          const val = e.target.value.toUpperCase();
                          setFormState({ ...formState, CODE: val, ID: formState.ID || val });
                        }}
                        className="w-full px-3 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] font-mono font-bold text-[#0052CC]"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="font-medium text-[#1A1C1E]">Nama Jenis Penilaian *</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Sumatif Harian, Sumatif Akhir Semester"
                        value={formState.NAME || ''}
                        onChange={e => setFormState({ ...formState, NAME: e.target.value })}
                        className="w-full px-3 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E] font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E] flex items-center justify-between">
                        <span>Frekuensi Pelaksanaan *</span>
                        <span className="text-[10px] text-[#6C757D]">Panjang istilah disesuaikan</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Rutin / Berkala per Bab, Akhir Semester"
                        value={formState.FREQUENCY || ''}
                        onChange={e => setFormState({ ...formState, FREQUENCY: e.target.value })}
                        list="freq-options"
                        className="w-full px-3 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
                      />
                      <datalist id="freq-options">
                        <option value="Rutin / Berkala per Bab" />
                        <option value="Awal Semester" />
                        <option value="Tengah Semester" />
                        <option value="Akhir Semester" />
                        <option value="Akhir Jenjang" />
                        <option value="Simulasi / Uji Coba" />
                        <option value="Berkala" />
                      </datalist>
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E]">Kurikulum</label>
                      <select
                        value={formState.CURRICULUM || 'MERDEKA'}
                        onChange={e => setFormState({ ...formState, CURRICULUM: e.target.value })}
                        className="w-full px-3 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-white text-[#1A1C1E]"
                      >
                        <option value="MERDEKA">Kurikulum Merdeka</option>
                        <option value="K13">Kurikulum 2013 (K13)</option>
                        <option value="ALL">Semua Kurikulum</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E]">Kategori Penilaian</label>
                      <select
                        value={formState.CATEGORY || 'SUMATIF'}
                        onChange={e => setFormState({ ...formState, CATEGORY: e.target.value })}
                        className="w-full px-3 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-white text-[#1A1C1E]"
                      >
                        <option value="SUMATIF">Sumatif (Nilai Rapor)</option>
                        <option value="DIAGNOSTIK">Diagnostik (Awal Pembelajaran)</option>
                        <option value="FORMATIF">Formatif (Umpan Balik Belajar)</option>
                        <option value="UJIAN_SEKOLAH">Ujian Sekolah / Akhir Jenjang</option>
                        <option value="SIMULASI">Simulasi / Try Out</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-[#1A1C1E]">Bobot Rapor (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formState.WEIGHT ?? 20}
                        onChange={e => setFormState({ ...formState, WEIGHT: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-[#1A1C1E]">Keterangan / Panduan Pelaksanaan</label>
                    <textarea
                      rows={2}
                      placeholder="Panduan bagi guru pengampu saat menggunakan jenis penilaian ini..."
                      value={formState.DESCRIPTION || ''}
                      onChange={e => setFormState({ ...formState, DESCRIPTION: e.target.value })}
                      className="w-full px-3 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="activeAssessmentType"
                      checked={formState.ACTIVE ?? true}
                      onChange={e => setFormState({ ...formState, ACTIVE: e.target.checked })}
                      className="rounded text-[#0052CC] focus:ring-[#0052CC]"
                    />
                    <label htmlFor="activeAssessmentType" className="font-medium text-[#1A1C1E]">
                      Aktifkan Jenis Penilaian Ini (Muncul pada Pemilihan Soal & Ujian)
                    </label>
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-[#DEE2E6] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setEditingItem(null); }}
                  className="px-4 py-2 rounded-md border border-[#CED4DA] text-[#495057] hover:bg-[#F8F9FA] font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white font-medium inline-flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Menyimpan...' : 'Simpan Data'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg w-full max-w-sm p-6 shadow-xl border border-[#DEE2E6] text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FCE8E6] text-[#C5221F] grid place-items-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1C1E]">Hapus Data?</h3>
              <p className="text-xs text-[#6C757D] mt-1">
                Data yang telah dihapus tidak dapat dipulihkan kembali. Lanjutkan proses?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-md border border-[#CED4DA] text-[#495057] font-medium text-xs hover:bg-[#F8F9FA]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={loading}
                className="px-4 py-2 rounded-md bg-[#DC3545] hover:bg-[#C82333] text-white font-medium text-xs shadow-xs"
              >
                {loading ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl border border-[#DEE2E6] text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#FCE8E6] text-[#C5221F] grid place-items-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1C1E]">
                {bulkDeleteConfirm.type === 'PACKAGES'
                  ? `Hapus ${bulkDeleteConfirm.count} Paket Bank Soal Sekaligus?`
                  : bulkDeleteConfirm.type === 'QUESTIONS'
                  ? `Hapus ${bulkDeleteConfirm.count} Butir Soal Terpilih?`
                  : `Hapus ${bulkDeleteConfirm.count} Data Terpilih?`}
              </h3>
              <p className="text-xs text-[#6C757D] mt-2 leading-relaxed">
                {bulkDeleteConfirm.type === 'PACKAGES' ? (
                  <>
                    Anda akan menghapus <b className="text-[#C5221F]">{bulkDeleteConfirm.count} paket bank soal</b>
                    {bulkDeleteConfirm.totalQuestions !== undefined && bulkDeleteConfirm.totalQuestions > 0 ? (
                      <> beserta seluruh <b className="text-[#C5221F]">{bulkDeleteConfirm.totalQuestions} butir soal</b> di dalamnya.</>
                    ) : (
                      <>.</>
                    )}
                    <br />
                    Tindakan ini permanen dan tidak dapat dibatalkan.
                  </>
                ) : bulkDeleteConfirm.type === 'QUESTIONS' ? (
                  <>
                    Anda akan menghapus <b className="text-[#C5221F]">{bulkDeleteConfirm.count} butir soal</b> yang dicentang dari bank soal ini secara permanen.
                  </>
                ) : (
                  <>
                    Anda akan menghapus <b className="text-[#C5221F]">{bulkDeleteConfirm.count} data</b> terpilih secara permanen.
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBulkDeleteConfirm(null)}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-[#CED4DA] text-[#495057] font-semibold text-xs hover:bg-[#F8F9FA] transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={loading}
                className="px-5 py-2 rounded-lg bg-[#DC3545] hover:bg-[#C82333] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {loading ? (
                  <span>Menghapus...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Semua ({bulkDeleteConfirm.count})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal with Data Preview */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div
            className={`bg-white rounded-xl shadow-2xl ${
              questionPreviewData || genericPreviewRows ? 'max-w-5xl' : 'max-w-xl'
            } w-full border border-[#CED4DA] overflow-hidden my-6 flex flex-col max-h-[90vh] transition-all`}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#DEE2E6] flex items-center justify-between bg-white flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#EBF3FC] text-[#0052CC] grid place-items-center">
                  {entityName === 'QUESTIONS' ? <FileText className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1A1C1E]">
                    {questionPreviewData
                      ? 'Pratinjau Data Soal Ujian Sebelum Import'
                      : genericPreviewRows
                      ? 'Pratinjau Data Sebelum Disimpan'
                      : entityName === 'QUESTIONS'
                      ? 'Import Bank Soal (Word .docx / Excel .xlsx)'
                      : `Import Data ${
                          entityName === 'USERS'
                            ? filterRole === 'STUDENT'
                              ? 'Siswa'
                              : filterRole === 'TEACHER'
                              ? 'Guru'
                              : 'Pengguna'
                            : entityName === 'CLASSES'
                            ? 'Kelas'
                            : entityName === 'SUBJECTS'
                            ? 'Mata Pelajaran'
                            : 'Data'
                        }`}
                  </h3>
                  <p className="text-xs text-[#6C757D]">
                    {questionPreviewData || genericPreviewRows
                      ? 'Periksa kesesuaian data yang terbaca sebelum diproses ke database'
                      : 'Upload file spreadsheet atau dokumen soal untuk memasukkan data secara massal'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetImportState();
                  setImportModalOpen(false);
                }}
                className="text-[#6C757D] hover:text-[#1A1C1E] p-1 rounded-md hover:bg-[#F8F9FA]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Question Import Preview */}
            {questionPreviewData ? (
              <div className="p-6 overflow-y-auto max-h-[80vh]">
                <QuestionImportPreview
                  fileName={importFileName || (importFileType === 'WORD' ? 'Naskah_Soal.docx' : 'Bank_Soal.xlsx')}
                  fileSize={importFileSize}
                  fileType={importFileType}
                  questions={questionPreviewData}
                  exams={lookup.exams}
                  selectedExamId={importTargetExamId}
                  onSelectedExamChange={newId => {
                    setImportTargetExamId(newId);
                    setQuestionPreviewData(prev =>
                      prev ? prev.map(q => ({ ...q, EXAM_ID: newId })) : null
                    );
                  }}
                  onConfirmImport={handleConfirmQuestionImport}
                  onResetFile={resetImportState}
                  onCancel={() => {
                    resetImportState();
                    setImportModalOpen(false);
                  }}
                  isSubmitting={isImportSubmitting}
                />
              </div>
            ) : genericPreviewRows ? (
              /* Generic Excel Preview */
              <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-[#EBF3FC] border border-[#B3D4FF]">
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="w-5 h-5 text-[#0052CC]" />
                    <div>
                      <span className="font-bold text-[#1A1C1E]">{importFileName || 'File_Data.xlsx'}</span>
                      <p className="text-[11px] text-[#5E6C84]">
                        {genericPreviewRows.length} baris data terbaca • Format: {importFileType}
                        {importFileSize > 0 ? ` • ${(importFileSize / 1024).toFixed(1)} KB` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={resetImportState}
                    className="px-3 py-1.5 rounded-md border border-[#CED4DA] bg-white text-[#1A1C1E] font-medium hover:bg-[#F1F3F5] transition-colors"
                  >
                    Pilih File Lain
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#5E6C84]">
                    <span className="font-medium">
                      Menampilkan pratinjau hingga {Math.min(genericPreviewRows.length, 25)} baris pertama:
                    </span>
                    <span className="font-semibold text-[#137333] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Struktur tabel terbaca
                    </span>
                  </div>
                  <div className="border border-[#DEE2E6] rounded-lg overflow-x-auto max-h-80 bg-white shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#F8F9FA] sticky top-0 border-b border-[#DEE2E6] z-10 text-[11px] font-bold text-[#1A1C1E]">
                        <tr>
                          <th className="p-2.5 w-12 text-center">No</th>
                          {Object.keys(genericPreviewRows[0] || {})
                            .slice(0, 8)
                            .map(col => (
                              <th key={col} className="p-2.5 whitespace-nowrap font-mono">
                                {col}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E9ECEF] text-[#495057]">
                        {genericPreviewRows.slice(0, 25).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-[#F8F9FA]">
                            <td className="p-2.5 text-center text-[#6C757D] font-mono text-[11px]">
                              {rIdx + 1}
                            </td>
                            {Object.keys(genericPreviewRows[0] || {})
                              .slice(0, 8)
                              .map(col => (
                                <td key={col} className="p-2.5 whitespace-nowrap max-w-xs truncate">
                                  {String(row[col] ?? '')}
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#DEE2E6]">
                  <div className="text-[11px] text-[#5E6C84]">
                    Total {genericPreviewRows.length} baris siap disimpan ke database
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        resetImportState();
                        setImportModalOpen(false);
                      }}
                      className="px-4 py-2 rounded-md border border-[#CED4DA] text-[#495057] font-medium hover:bg-white transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isImportSubmitting}
                      onClick={handleConfirmGenericImport}
                      className="px-5 py-2 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isImportSubmitting ? (
                        'Menyimpan...'
                      ) : (
                        <>
                          <span>Simpan {genericPreviewRows.length} Data ke Database</span>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Official Template Card */}
              <div className="p-4 rounded-lg bg-[#F8F9FA] border border-[#DEE2E6] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-[#1A1C1E] text-xs flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-[#0052CC]" />
                      Template Resmi Excel (.xlsx)
                    </span>
                    <p className="text-[11px] text-[#6C757D] mt-0.5">
                      Unduh template resmi dengan susunan kolom standar, contoh data, dan petunjuk pengisian.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {entityName === 'USERS' && (
                    <>
                      {(!filterRole || filterRole === 'STUDENT') && (
                        <button
                          type="button"
                          onClick={() => downloadStudentTemplate(lookup.classes)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white font-medium text-xs shadow-xs transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh Template Siswa (.xlsx)</span>
                        </button>
                      )}
                      {(!filterRole || filterRole === 'TEACHER') && (
                        <button
                          type="button"
                          onClick={() => downloadTeacherTemplate()}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#137333] hover:bg-[#0E5827] text-white font-medium text-xs shadow-xs transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh Template Guru (.xlsx)</span>
                        </button>
                      )}
                    </>
                  )}

                  {entityName === 'CLASSES' && (
                    <button
                      type="button"
                      onClick={() => downloadClassTemplate(lookup.users)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white font-medium text-xs shadow-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Template Data Kelas (.xlsx)</span>
                    </button>
                  )}

                  {entityName === 'QUESTIONS' && (
                    <>
                      <button
                        type="button"
                        onClick={() => downloadQuestionsWordTemplate()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white font-medium text-xs shadow-xs transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Unduh Template Word (.docx)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadQuestionsTemplate(lookup.exams[0]?.ID || 'EXAM-01', lookup.exams[0]?.TITLE || 'Ujian')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#137333] hover:bg-[#0E5827] text-white font-medium text-xs shadow-xs transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh Template Excel (.xlsx)</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Column Specification Guide */}
              <div className="space-y-2">
                <div className="font-bold text-[#1A1C1E] text-xs">Struktur Kolom yang Didukung:</div>
                {entityName === 'USERS' && filterRole === 'STUDENT' && (
                  <div className="bg-[#FFFFFF] border border-[#DEE2E6] rounded-md overflow-hidden text-[11px]">
                    <div className="grid grid-cols-3 bg-[#F8F9FA] p-2 font-bold text-[#1A1C1E] border-b border-[#DEE2E6]">
                      <span>Nama Kolom</span>
                      <span>Keterangan</span>
                      <span>Contoh</span>
                    </div>
                    <div className="divide-y divide-[#DEE2E6] text-[#495057]">
                      <div className="grid grid-cols-3 p-2">
                        <span className="font-mono font-bold text-[#0052CC]">NIS *</span>
                        <span>Username login siswa</span>
                        <span className="font-mono">20260101</span>
                      </div>
                      <div className="grid grid-cols-3 p-2">
                        <span className="font-mono font-bold text-[#0052CC]">NAMA_LENGKAP *</span>
                        <span>Nama lengkap siswa</span>
                        <span>Ahmad Fauzi</span>
                      </div>
                      <div className="grid grid-cols-3 p-2">
                        <span className="font-mono text-[#6C757D]">EMAIL</span>
                        <span>Email aktif siswa</span>
                        <span>ahmad@sekolah.sch.id</span>
                      </div>
                      <div className="grid grid-cols-3 p-2">
                        <span className="font-mono text-[#6C757D]">PASSWORD</span>
                        <span>Default: Welcome123!</span>
                        <span className="font-mono">Siswa123!</span>
                      </div>
                      <div className="grid grid-cols-3 p-2">
                        <span className="font-mono text-[#137333]">KELAS</span>
                        <span>Nama kelas atau ID kelas</span>
                        <span>{lookup.classes[0]?.NAME || 'X-MIPA-1'}</span>
                      </div>
                      <div className="grid grid-cols-3 p-2">
                        <span className="font-mono text-[#6C757D]">STATUS_AKTIF</span>
                        <span>Status akun siswa</span>
                        <span>AKTIF</span>
                      </div>
                    </div>
                  </div>
                )}

                {entityName === 'USERS' && filterRole === 'TEACHER' && (
                  <div className="bg-[#FFFFFF] border border-[#DEE2E6] rounded-md overflow-hidden text-[11px]">
                    <div className="grid grid-cols-3 bg-[#F8F9FA] p-2 font-bold text-[#1A1C1E] border-b border-[#DEE2E6]">
                      <span>Nama Kolom</span>
                      <span>Keterangan</span>
                      <span>Contoh</span>
                    </div>
                    <div className="divide-y divide-[#DEE2E6] text-[#495057]">
                      <div className="grid grid-cols-3 p-2">
                        <span className="font-mono font-bold text-[#137333]">NIP *</span>
                        <span>NIP atau Username login</span>
                        <span className="font-mono">198503152010011005</span>
                      </div>
                      <div className="grid grid-cols-3 p-2">
                        <span className="font-mono font-bold text-[#137333]">NAMA_LENGKAP *</span>
                        <span>Nama guru beserta gelar</span>
                        <span>Ipid Abdul Hapid, S.Pd.</span>
                      </div>
                      <div className="grid grid-cols-3 p-2">
                        <span className="font-mono text-[#6C757D]">EMAIL</span>
                        <span>Email resmi guru</span>
                        <span>ipid.hapid@masmuhammadiyahcikaramas.sch.id</span>
                      </div>
                      <div className="grid grid-cols-3 p-2">
                        <span className="font-mono text-[#6C757D]">PASSWORD</span>
                        <span>Default: Welcome123!</span>
                        <span className="font-mono">Guru123!</span>
                      </div>
                      <div className="grid grid-cols-3 p-2">
                        <span className="font-mono text-[#6C757D]">ROLE</span>
                        <span>Hak akses akun</span>
                        <span className="font-mono">TEACHER</span>
                      </div>
                      <div className="grid grid-cols-3 p-2">
                        <span className="font-mono text-[#6C757D]">STATUS_AKTIF</span>
                        <span>Status akun</span>
                        <span>AKTIF</span>
                      </div>
                    </div>
                  </div>
                )}

                {entityName === 'USERS' && !filterRole && (
                  <div className="p-3 rounded-md bg-[#F8F9FA] border border-[#DEE2E6] text-[#495057] text-[11px] space-y-1">
                    <div><b>Kolom Pengguna:</b> USERNAME (atau NIS/NIP), NAME (atau NAMA_LENGKAP), EMAIL, PASSWORD, ROLE (STUDENT/TEACHER), CLASS_ID, ACTIVE</div>
                  </div>
                )}

                {entityName === 'CLASSES' && (
                  <div className="bg-[#FFFFFF] border border-[#DEE2E6] rounded-md overflow-hidden text-[11px]">
                    <div className="grid grid-cols-3 bg-[#F8F9FA] p-2 font-bold text-[#1A1C1E] border-b border-[#DEE2E6]">
                      <span>Nama Kolom</span>
                      <span>Keterangan</span>
                      <span>Contoh</span>
                    </div>
                    <div className="divide-y divide-[#DEE2E6] text-[#495057]">
                      <div className="grid grid-cols-3 p-2">
                        <span className="font-mono font-bold text-[#0052CC]">NAMA_KELAS *</span>
                        <span>Nama rombel/kelas</span>
                        <span className="font-mono">X-MIPA-1</span>
                      </div>
                      <div className="grid grid-cols-3 p-2">
                        <span className="font-mono font-bold text-[#0052CC]">TINGKAT *</span>
                        <span>Tingkat jenjang kelas</span>
                        <span>X / XI / XII</span>
                      </div>
                      <div className="grid grid-cols-3 p-2">
                        <span className="font-mono font-bold text-[#137333]">WALI_KELAS</span>
                        <span>Nama atau NIP guru dari Data Guru</span>
                        <span>Ipid Abdul Hapid, S.Pd.</span>
                      </div>
                      <div className="grid grid-cols-3 p-2">
                        <span className="font-mono text-[#6C757D]">STATUS_AKTIF</span>
                        <span>Status aktif kelas</span>
                        <span>AKTIF</span>
                      </div>
                    </div>
                  </div>
                )}

                {entityName === 'SUBJECTS' && (
                  <div className="p-3 rounded-md bg-[#F8F9FA] border border-[#DEE2E6] text-[#495057] text-[11px]">
                    <b>Kolom Mata Pelajaran:</b> CODE (Kode), NAME (Nama Mapel), TEACHER_ID (ID Guru Pengampu), ACTIVE
                  </div>
                )}

                {entityName === 'QUESTIONS' && (
                  <div className="p-3.5 rounded-md bg-[#F8F9FA] border border-[#DEE2E6] text-[#495057] text-[11px] space-y-2">
                    <div className="font-bold text-[#1A1C1E]">Daftar 6 Tipe Soal yang Didukung:</div>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><b>MCQ</b> (Pilihan Ganda): Opsi A - E, Kunci: A, B, C, D, atau E.</li>
                      <li><b>COMPLEX_MCQ</b> (PG Kompleks): Opsi A - E, Kunci: multi opsi seperti "A, C" atau "B, D, E".</li>
                      <li><b>TRUE_FALSE</b> (Benar / Salah): Kunci: "BENAR" atau "SALAH".</li>
                      <li><b>MATCHING</b> (Menjodohkan): Opsi A - E, Kunci pasangan: "1-B; 2-A; 3-C; 4-D".</li>
                      <li><b>SHORT_ANSWER</b> (Isian Singkat): Kunci berupa teks/kata kunci jawaban singkat.</li>
                      <li><b>ESSAY</b> (Uraian / Esai): Dinilai secara manual oleh guru melalui menu Koreksi.</li>
                    </ul>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[#DEE2E6]">
                      <span className="text-[10px] text-[#0052CC] font-semibold">
                        Format Word (.docx) didukung penuh dengan deteksi cerdas opsi & kunci jawaban!
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setImportModalOpen(false);
                          setWordModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-[#0052CC] text-white text-[11px] font-bold rounded hover:bg-[#0047B3] transition-colors flex items-center gap-1 self-start sm:self-auto shadow-xs cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Buka Impor Soal Word (.docx)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-[#CED4DA] hover:border-[#0052CC] rounded-lg p-6 text-center transition-colors bg-[#F8F9FA]">
                <input
                  type="file"
                  id="excelFileInput"
                  accept={entityName === 'QUESTIONS' ? '.xlsx,.xls,.csv,.docx' : '.xlsx,.xls,.csv'}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="excelFileInput" className="cursor-pointer space-y-2 block">
                  <Upload className="w-8 h-8 text-[#0052CC] mx-auto opacity-80" />
                  <div className="text-xs font-bold text-[#1A1C1E]">
                    {entityName === 'QUESTIONS'
                      ? 'Klik untuk Memilih File Dokumen Word (.docx) atau Excel (.xlsx)'
                      : 'Klik untuk Memilih File Excel (.xlsx / .xls / .csv)'}
                  </div>
                  <div className="text-[11px] text-[#6C757D]">File akan divalidasi dan diimpor secara otomatis</div>
                </label>
              </div>
            </div>
            )}

            {/* Modal Footer */}
            {!questionPreviewData && !genericPreviewRows && (
              <div className="px-6 py-3 border-t border-[#DEE2E6] flex items-center justify-end gap-2 bg-[#F8F9FA] flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    resetImportState();
                    setImportModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-md border border-[#CED4DA] text-[#495057] font-medium text-xs hover:bg-white transition-colors"
                >
                  Batal / Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unified Bank Soal (Word .docx & Excel .xlsx) Import Modal */}
      {bankSoalModalOpen && (
        <BankSoalImportModal
          isOpen={bankSoalModalOpen}
          onClose={() => setBankSoalModalOpen(false)}
          exams={lookup.exams}
          selectedExamId={importTargetExamId || selectedBankPackageId || (lookup.exams[0]?.ID ?? '')}
          onSelectedExamChange={id => setImportTargetExamId(id)}
          teacherName={currentUser?.NAME || 'Guru Mata Pelajaran'}
          onSaveToBankSoal={async (questions, targetExamId) => {
            const formatted = questions.map((q, idx) => ({
              ID: `Q-${Date.now()}-${idx + 1}`,
              EXAM_ID: targetExamId,
              TYPE: q.tipe,
              QUESTION: q.soal,
              OPTION_A: q.pilihan_jawaban.A || '',
              OPTION_B: q.pilihan_jawaban.B || '',
              OPTION_C: q.pilihan_jawaban.C || '',
              OPTION_D: q.pilihan_jawaban.D || '',
              OPTION_E: q.pilihan_jawaban.E || '',
              ANSWER: q.kunci_jawaban,
              POINTS: q.bobot || 10,
              EXTRA_DATA: q.extra_data || ''
            }));
            await onImport(formatted);
            setStatusMessage({
              type: 'success',
              text: `Berhasil mengimpor ${formatted.length} butir soal ke paket bank soal ${targetExamId}!`
            });
          }}
        />
      )}

      {/* Dedicated Word (.docx) Import Modal */}
      {wordModalOpen && (
        <WordImportModal
          isOpen={wordModalOpen}
          onClose={() => setWordModalOpen(false)}
          exams={lookup.exams}
          subjects={lookup.subjects}
          classes={lookup.classes}
          onImportQuestions={async (questions, targetExamId) => {
            return await onImport(questions);
          }}
        />
      )}

      {/* Input Chooser Modal (when clicking "Input" on Bank Soal row) */}
      {inputChooserTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-[#DEE2E6] space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-[#DEE2E6] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1A1C1E] flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#0052CC]" />
                  <span>Input Soal Bank Soal</span>
                </h3>
                <p className="text-xs text-[#6C757D] mt-0.5">
                  {subjectNameMap[inputChooserTarget.SUBJECT_ID] || 'Mapel'} - {classNameMap[inputChooserTarget.CLASS_ID] || 'Kelas'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInputChooserTarget(null)}
                className="text-[#ADB5BD] hover:text-[#1A1C1E] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-[#495057]">
                Pilih metode input butir soal:
              </div>

              {/* Option 1: Manual Form */}
              <button
                type="button"
                onClick={() => {
                  const target = inputChooserTarget;
                  setInputChooserTarget(null);
                  handleOpenAddQuestionForPackage(target);
                }}
                className="w-full text-left p-3.5 rounded-lg border border-[#DEE2E6] hover:border-[#0052CC] hover:bg-[#F8F9FA] transition-all flex items-start gap-3 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-[#E8F0FE] text-[#0052CC] flex items-center justify-center flex-shrink-0 group-hover:bg-[#0052CC] group-hover:text-white transition-colors">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1A1C1E] group-hover:text-[#0052CC]">
                    Input Manual (Satu per Satu)
                  </div>
                  <div className="text-[11px] text-[#6C757D] mt-0.5">
                    Tulis butir soal, buat opsi A-E, tentukan kunci jawaban dan bobot poin melalui formulir interaktif.
                  </div>
                </div>
              </button>

              {/* Option 2: Unified Word / Excel Import */}
              <button
                type="button"
                onClick={() => {
                  const target = inputChooserTarget;
                  setInputChooserTarget(null);
                  if (target) setImportTargetExamId(target.ID);
                  setBankSoalModalOpen(true);
                }}
                className="w-full text-left p-3.5 rounded-lg border-2 border-[#0052CC] bg-[#F0F5FF] hover:bg-[#E8F0FE] transition-all flex items-start gap-3 group cursor-pointer shadow-xs"
              >
                <div className="w-9 h-9 rounded-lg bg-[#0052CC] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0052CC] flex items-center gap-1.5">
                    <span>Import Bank Soal (Word .docx & Excel .xlsx)</span>
                    <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">Rekomendasi</span>
                  </div>
                  <div className="text-[11px] text-[#495057] mt-0.5">
                    Drag-and-drop file Word atau Excel. Sistem otomatis mengekstrak teks soal, opsi A-E, kunci jawaban, dan bobot dengan pratinjau interaktif.
                  </div>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-[#DEE2E6] flex justify-end">
              <button
                type="button"
                onClick={() => setInputChooserTarget(null)}
                className="px-4 py-2 rounded-md border border-[#CED4DA] text-[#495057] text-xs font-medium hover:bg-[#F8F9FA] transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New / Edit Bank Soal Modal */}
      {newBankPackageModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-[#DEE2E6] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2 border-b border-[#DEE2E6] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1A1C1E] flex items-center gap-2">
                  <Folder className="w-5 h-5 text-[#0052CC]" />
                  <span>{editingBankPackage ? 'Edit Pengaturan Bank Soal' : 'Buat / Tambah Bank Soal Baru'}</span>
                </h3>
                <p className="text-xs text-[#6C757D] mt-0.5">
                  Tentukan jenis penilaian, kelas yang berlaku, mata pelajaran, dan target jumlah soal
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewBankPackageModalOpen(false);
                  setEditingBankPackage(null);
                }}
                className="text-[#ADB5BD] hover:text-[#1A1C1E] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBankPackage} className="space-y-4">
              {/* 1. Jenis Penilaian */}
              <div>
                <label className="block text-xs font-bold text-[#1A1C1E] mb-1">
                  Jenis Penilaian *
                </label>
                <select
                  value={newBankPackageForm.ASSESSMENT_TYPE_ID}
                  onChange={e => {
                    const val = e.target.value;
                    setNewBankPackageForm(prev => ({
                      ...prev,
                      ASSESSMENT_TYPE_ID: val,
                      TITLE: updateAutoBankPackageTitle(val, prev.CLASS_IDS, prev.SUBJECT_ID)
                    }));
                  }}
                  className="w-full px-3 py-2 border border-[#CED4DA] rounded-lg text-xs bg-white text-[#1A1C1E] outline-none focus:border-[#0052CC]"
                  required
                >
                  {availableAssessmentTypes.map(at => (
                    <option key={at.ID || at.CODE} value={at.CODE || at.ID}>
                      [{at.CODE || at.ID}] {at.NAME} ({at.FREQUENCY || 'Fleksibel'})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-[#6C757D] mt-0.5 block">
                  Frekuensi dan jenis penilaian disesuaikan dengan pengaturan di Jenis Penilaian.
                </span>
              </div>

              {/* 2. Berlaku untuk Kelas Apa Saja */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#1A1C1E]">
                    Berlaku untuk Kelas Apa Saja *
                  </label>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = (lookup?.classes || []).map(c => c.ID);
                        setNewBankPackageForm(prev => ({
                          ...prev,
                          CLASS_IDS: allIds,
                          CLASS_ID: allIds[0] || 'ALL',
                          TITLE: updateAutoBankPackageTitle(prev.ASSESSMENT_TYPE_ID, allIds, prev.SUBJECT_ID)
                        }));
                      }}
                      className="text-[#0052CC] hover:underline font-semibold cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-[#CED4DA]">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewBankPackageForm(prev => ({
                          ...prev,
                          CLASS_IDS: [],
                          CLASS_ID: '',
                          TITLE: updateAutoBankPackageTitle(prev.ASSESSMENT_TYPE_ID, [], prev.SUBJECT_ID)
                        }));
                      }}
                      className="text-[#6C757D] hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="p-2.5 border border-[#CED4DA] rounded-lg bg-[#F8F9FA] max-h-40 overflow-y-auto space-y-1.5">
                  {(lookup?.classes || []).map(c => {
                    const isChecked = newBankPackageForm.CLASS_IDS.includes(c.ID);
                    return (
                      <label
                        key={c.ID}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-white text-[#0052CC] font-bold border border-[#B3D1FF] shadow-2xs'
                            : 'hover:bg-white/80 text-[#495057]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            const next = e.target.checked
                              ? [...newBankPackageForm.CLASS_IDS, c.ID]
                              : newBankPackageForm.CLASS_IDS.filter(id => id !== c.ID);
                            setNewBankPackageForm(prev => ({
                              ...prev,
                              CLASS_IDS: next,
                              CLASS_ID: next[0] || '',
                              TITLE: updateAutoBankPackageTitle(prev.ASSESSMENT_TYPE_ID, next, prev.SUBJECT_ID)
                            }));
                          }}
                          className="w-3.5 h-3.5 rounded text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                        />
                        <span>{c.NAME}</span>
                        {c.LEVEL && (
                          <span className="text-[10px] text-[#6C757D] font-normal ml-auto">
                            Tingkat {c.LEVEL}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#6C757D] mt-1">
                  <span>
                    Terpilih: <b>{newBankPackageForm.CLASS_IDS.length} rombel kelas</b>
                  </span>
                  <span className="text-[10px] text-[#0052CC]">
                    Soal ini hanya akan muncul di jadwal kelas yang dipilih
                  </span>
                </div>
              </div>

              {/* 3. Mata Pelajaran */}
              <div>
                <label className="block text-xs font-bold text-[#1A1C1E] mb-1">
                  Mata Pelajaran *
                </label>
                <select
                  value={newBankPackageForm.SUBJECT_ID}
                  onChange={e => {
                    const val = e.target.value;
                    setNewBankPackageForm(prev => ({
                      ...prev,
                      SUBJECT_ID: val,
                      TITLE: updateAutoBankPackageTitle(prev.ASSESSMENT_TYPE_ID, prev.CLASS_IDS, val)
                    }));
                  }}
                  className="w-full px-3 py-2 border border-[#CED4DA] rounded-lg text-xs bg-white text-[#1A1C1E] outline-none focus:border-[#0052CC]"
                  required
                >
                  <option value="" disabled>-- Pilih Mata Pelajaran --</option>
                  {(currentUser.ROLE === 'TEACHER' && teacherSubjects.length > 0 ? teacherSubjects : (lookup?.subjects || [])).map(s => (
                    <option key={s.ID} value={s.ID}>
                      {s.NAME} {s.CODE ? `[${s.CODE}]` : ''} {currentUser.ROLE === 'TEACHER' && s.TEACHER_ID === currentUser.ID ? '✓ (Mapel Anda)' : ''}
                    </option>
                  ))}
                </select>
                {currentUser.ROLE === 'TEACHER' && teacherSubjects.length > 0 && (
                  <span className="text-[10px] text-[#0052CC] mt-1 block">
                    ✓ Menampilkan mata pelajaran yang diampu oleh Anda ({currentUser.NAME}).
                  </span>
                )}
              </div>

              {/* 4. Jumlah Soal */}
              <div>
                <label className="block text-xs font-bold text-[#1A1C1E] mb-1">
                  Target Jumlah Soal *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={newBankPackageForm.TARGET_QUESTION_COUNT || 25}
                    onChange={e => setNewBankPackageForm(prev => ({ ...prev, TARGET_QUESTION_COUNT: parseInt(e.target.value, 10) || 0 }))}
                    className="w-32 px-3 py-2 border border-[#CED4DA] rounded-lg text-xs bg-white text-[#1A1C1E] outline-none focus:border-[#0052CC]"
                    required
                  />
                  <div className="flex items-center gap-1.5">
                    {[20, 25, 30, 40, 50].map(cnt => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setNewBankPackageForm(prev => ({ ...prev, TARGET_QUESTION_COUNT: cnt }))}
                        className={`px-2 py-1 rounded text-[11px] font-semibold border cursor-pointer ${
                          newBankPackageForm.TARGET_QUESTION_COUNT === cnt
                            ? 'bg-[#0052CC] text-white border-[#0052CC]'
                            : 'bg-white text-[#495057] border-[#CED4DA] hover:bg-[#F8F9FA]'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-[#6C757D] mt-1 block">
                  Target butir soal yang direncanakan untuk paket penilaian ini.
                </span>
              </div>

              {/* 5. Judul Bank Soal */}
              <div>
                <label className="block text-xs font-bold text-[#1A1C1E] mb-1">
                  Judul / Nama Paket Bank Soal *
                </label>
                <input
                  type="text"
                  value={newBankPackageForm.TITLE}
                  onChange={e => setNewBankPackageForm(prev => ({ ...prev, TITLE: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#CED4DA] rounded-lg text-xs bg-white text-[#1A1C1E] outline-none focus:border-[#0052CC]"
                  required
                  placeholder="Contoh: Bank Soal SAS Matematika (Kelas 7A, 7B)"
                />
              </div>

              <div className="pt-3 border-t border-[#DEE2E6] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewBankPackageModalOpen(false);
                    setEditingBankPackage(null);
                  }}
                  className="px-4 py-2 rounded-md border border-[#CED4DA] text-[#495057] text-xs font-medium hover:bg-[#F8F9FA] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {editingBankPackage ? 'Simpan Perubahan' : 'Buat Bank Soal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Package Confirmation Modal */}
      {deletePackageConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-[#DEE2E6] space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#FCE8E6] text-[#C5221F] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1C1E]">
                Hapus Paket Bank Soal?
              </h3>
              <p className="text-xs text-[#495057] mt-1.5 leading-relaxed">
                Anda yakin ingin menghapus paket bank soal <b>"{deletePackageConfirm.title}"</b>?
              </p>
              {deletePackageConfirm.count > 0 && (
                <div className="mt-2 p-2.5 rounded-lg bg-[#FEF7E0] border border-[#FEEFC3] text-[11px] text-[#B06000] font-medium">
                  Perhatian: Sebanyak <b>{deletePackageConfirm.count} butir soal</b> yang ada di dalam paket ini juga akan terhapus secara otomatis dari bank soal.
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DEE2E6]">
              <button
                type="button"
                onClick={() => setDeletePackageConfirm(null)}
                className="px-4 py-2 rounded-md border border-[#CED4DA] text-[#495057] text-xs font-medium hover:bg-[#F8F9FA] transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeletePackageConfirm}
                className="px-4 py-2 rounded-md bg-[#DC3545] hover:bg-[#C82333] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Hapus Bank Soal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Demo Data Confirmation Modal */}
      {cleanDemoConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-[#DEE2E6] space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#E8F0FE] text-[#0052CC] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1C1E]">
                Bersihkan Paket Demo Bawaan?
              </h3>
              <p className="text-xs text-[#495057] mt-2 leading-relaxed">
                Fitur ini akan membersihkan paket demo contoh (seperti Bahasa Indonesia / Matematika demo lama) dan memastikan <b>Bank Soal Fisika X</b> Anda tersambung dengan benar ke mata pelajaran <b>Fisika</b> dan kelas <b>X.1</b>.
              </p>
              <div className="mt-2.5 p-3 rounded-lg bg-[#F8F9FA] border border-[#DEE2E6] text-[11px] text-[#495057] space-y-1">
                <p>✓ Menghapus butir dan paket demo bawaan</p>
                <p>✓ Memulihkan Bank Soal Fisika X ke kurikulum yang tepat</p>
                <p>✓ Menyelaraskan jumlah butir soal agar siap dijadwalkan ke CBT</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DEE2E6]">
              <button
                type="button"
                onClick={() => setCleanDemoConfirmOpen(false)}
                className="px-4 py-2 rounded-md border border-[#CED4DA] text-[#495057] text-xs font-medium hover:bg-[#F8F9FA] transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCleanDemoQuestionBanks}
                className="px-4 py-2 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Bersihkan & Pulihkan Fisika
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print PDF Modal for Question Bank */}
      {activeViewingPackage && printPdfModalOpen && (
        <QuestionBankPrintModal
          isOpen={printPdfModalOpen}
          onClose={() => setPrintPdfModalOpen(false)}
          packageInfo={activeViewingPackage}
          questions={activeViewingPackage.questions || []}
          settings={settings}
          subjectName={subjectNameMap[activeViewingPackage.SUBJECT_ID] || 'Mata Pelajaran'}
          className={classNameMap[activeViewingPackage.CLASS_ID] || 'Semua Kelas'}
          assessmentTypeName={(() => {
            const atId = activeViewingPackage.ASSESSMENT_TYPE_ID || 'SH';
            const aType = availableAssessmentTypes.find(a => a.CODE === atId || a.ID === atId);
            return aType ? `[${aType.CODE || aType.ID}] ${aType.NAME}` : atId;
          })()}
        />
      )}
    </div>
  );
};

export default EntityTablePage;
