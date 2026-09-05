export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

export type CurriculumType = 'MERDEKA' | 'K13';

export type ExamStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'FINISHED';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'REVIEW';
export type QuestionType =
  | 'MCQ'
  | 'COMPLEX_MCQ'
  | 'ESSAY'
  | 'MATCHING'
  | 'TRUE_FALSE'
  | 'SHORT_ANSWER';

export interface User {
  ID: string;
  USERNAME: string;
  NAME: string;
  EMAIL: string;
  PASSWORD_HASH?: string;
  ROLE: Role;
  CLASS_ID: string;
  TEACHER_CODE?: string; // Kode Guru (A..T) sesuai Jadwal Pelajaran
  ACTIVE: boolean;
  CREATED_AT: string;
}

export interface ClassItem {
  ID: string;
  NAME: string;
  LEVEL: string; // 'X' | 'XI' | 'XII'
  HOMEROOM: string;
  CURRICULUM?: CurriculumType; // 'MERDEKA' | 'K13'
  STREAM?: string; // 'MIPA' | 'IPS' | 'BAHASA' | 'FASE_E' | 'FASE_F' | 'UMUM'
  ACTIVE: boolean;
}

export type AssessmentCategory =
  | 'DIAGNOSTIK'
  | 'FORMATIF'
  | 'SUMATIF'
  | 'UJIAN_SEKOLAH'
  | 'SIMULASI';

export interface AssessmentType {
  ID: string;
  CODE: string;
  NAME: string;
  DESCRIPTION: string;
  CURRICULUM: CurriculumType | 'ALL';
  CATEGORY: AssessmentCategory;
  FREQUENCY?: string; // e.g., 'Rutin / Berkala', 'Tengah Semester', 'Akhir Semester', 'Awal Semester', 'Akhir Jenjang'
  WEIGHT?: number;
  COLOR?: string;
  ACTIVE: boolean;
  CREATED_AT?: string;
}

export interface Subject {
  ID: string;
  CODE: string;
  NAME: string;
  CURRICULUM?: CurriculumType; // 'MERDEKA' | 'K13'
  LEVEL?: string; // 'X' | 'XI' | 'XII' | 'Semua Tingkat'
  CLASS_ID?: string; // Linked specific class ID if class-specific (e.g. 'KLS-10A')
  GROUP?: string; // 'Mata Pelajaran Umum (Wajib)' | 'Peminatan MIPA (Sains)' | 'Peminatan IPS (Sosial)' | etc.
  TEACHER_ID: string;
  TEACHER_CODE?: string; // Kode Guru pemilik mapel (A..T)
  KKM?: number;
  HOURS_PER_WEEK?: number;
  ACTIVE: boolean;
}

export interface TimetableSlot {
  period: number; // 1, 2, 3, ...
  time: string; // e.g. "07.45 - 08.25"
  subjectCodes: Record<string, string>; // class name -> subject code, e.g. { 'X.1': 'H2', 'X.2': 'T3', ... }
  isBreak?: boolean;
  isSpecial?: boolean;
  activityName?: string; // e.g. "Upacara", "Istirahat", "Ekstrakulikuler"
}

export interface TimetableDay {
  day: 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU';
  dayLabel: string;
  preActivity?: string;
  slots: TimetableSlot[];
  postActivity?: string;
}

export interface Exam {
  ID: string;
  TITLE: string;
  SUBJECT_ID: string;
  CLASS_ID: string;
  ASSESSMENT_TYPE_ID?: string; // Link to AssessmentType ID, e.g. 'SAS', 'STS', 'SLM', 'SAP', 'SAJ'
  EXAM_DATE: string;
  START_TIME: string;
  END_TIME?: string;
  DURATION_MIN: number;
  ROOM?: string; // Ruang 01, Lab Komputer, dll.
  SESSION?: string; // Sesi 1, Sesi 2, dll.
  SUPERVISOR?: string; // Nama Guru / Pengawas Ujian
  STATUS: ExamStatus;
  RANDOMIZE: boolean;
  MAX_VIOLATIONS: number;
  CREATED_BY: string;
  CREATED_AT: string;
}

export interface Question {
  ID: string;
  EXAM_ID: string;
  ASSESSMENT_TYPE_ID?: string; // Direct link or derived from Exam
  TYPE: QuestionType;
  QUESTION: string;
  OPTION_A?: string;
  OPTION_B?: string;
  OPTION_C?: string;
  OPTION_D?: string;
  OPTION_E?: string;
  ANSWER: string;
  POINTS: number;
  EXTRA_DATA?: string;
}

export interface Attempt {
  ID: string;
  EXAM_ID: string;
  USER_ID: string;
  STARTED_AT: string;
  SUBMITTED_AT: string;
  SCORE: number | string;
  MAX_SCORE: number;
  STATUS: AttemptStatus;
  VIOLATIONS: number;
  PROGRESS: number;
  ANSWERS_JSON: string;
  ESSAY_SCORES_JSON: string;
  LAST_ACTIVITY: string;
}

export interface Session {
  TOKEN: string;
  USER_ID: string;
  EXPIRES_AT: string;
  CREATED_AT: string;
}

export interface SchoolSettings {
  SCHOOL_NAME: string;
  SCHOOL_ADDRESS: string;
  SCHOOL_CITY: string;
  SCHOOL_PHONE: string;
  PRINCIPAL_TITLE?: string; // e.g. 'Kepala Madrasah' | 'Kepala Sekolah'
  PRINCIPAL_NAME: string;
  PRINCIPAL_NIP?: string; // e.g. '1281201' (NBM) or NIP
  SCHOOL_YEAR: string;
  SEMESTER: string;
  CURRICULUM?: CurriculumType; // 'MERDEKA' | 'K13'
  PASSWORD_SALT?: string;
  APP_VERSION?: string;
  [key: string]: string | undefined;
}

export interface ActivityLog {
  ID: string;
  USER_ID: string;
  ACTION: string;
  DETAIL: string;
  CREATED_AT: string;
}

export interface DashboardStats {
  students: number;
  teachers: number;
  classes: number;
  exams: number;
  questions: number;
  activeAttempts: number;
  myAvailableExams: number;
  myCompletedExams: number;
}

export interface RecentExamItem {
  id: string;
  title: string;
  subject: string;
  className: string;
  date: string;
  status: ExamStatus;
  completion: number;
  submitted: number;
  totalStudents: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentExams: RecentExamItem[];
  charts: {
    classDistribution: [string, number][];
    subjectExamCount: [string, number][];
  };
}

export interface AvailableExamItem {
  id: string;
  title: string;
  subject: string;
  className: string;
  date: string;
  duration: number;
  status: string;
  attemptId: string;
  score: number | string;
  canStart: boolean;
  isToday: boolean;
}

export interface LiveMonitoringItem {
  id: string;
  student: string;
  username: string;
  className: string;
  exam: string;
  startedAt: string;
  elapsedMinutes: number;
  progress: number;
  violations: number;
  lastActivity: string;
  online: boolean;
  isFocused?: boolean;
  isLockedOut?: boolean;
  currentQuestion?: number;
  totalQuestions?: number;
  lastViolationReason?: string;
  lastPresenceUpdate?: number;
}

export interface StudentPresencePayload {
  attemptId: string;
  userId: string;
  studentName: string;
  username: string;
  className: string;
  examId: string;
  examTitle: string;
  startedAt: string;
  progress: number;
  currentQuestion: number;
  totalQuestions: number;
  violations: number;
  isLockedOut: boolean;
  isFocused: boolean;
  online: boolean;
  lastViolationReason?: string;
  lastPing: number;
}

export interface LiveIncidentLog {
  id: string;
  type: 'violation' | 'blur' | 'lockdown' | 'submitted' | 'alert' | 'unlock';
  studentName: string;
  className: string;
  examTitle: string;
  message: string;
  timestamp: string;
  severity: 'warning' | 'danger' | 'info' | 'success';
}

export interface EssayReviewItem {
  attemptId: string;
  questionId: string;
  student: string;
  exam: string;
  question: string;
  answer: string;
  maxPoints: number;
  score: number | string;
}

export interface PrintData {
  documentType: 'cards' | 'attendance' | 'minutes';
  settings: SchoolSettings;
  exam?: Exam & {
    CLASS_NAME: string;
    SUBJECT_NAME: string;
    FORMATTED_DATE: string;
  };
  students: User[];
  studentSchedules?: Record<string, (Exam & { SUBJECT_NAME: string; FORMATTED_DATE: string; FORMATTED_TIME: string; ROOM?: string; SESSION?: string })[]>;
  allExams?: (Exam & { SUBJECT_NAME: string; CLASS_NAME: string; FORMATTED_DATE: string; FORMATTED_TIME: string; ROOM?: string; SESSION?: string; SUPERVISOR?: string })[];
}

export interface TeacherMasterItem {
  no: number;
  code: string; // 'A' .. 'Z', 'AA', etc.
  name: string;
  nipNbm?: string;
  rankGolongan?: string; // e.g. "GTY", "PNS / III.c", "GTT"
  subjectsSummary: string[];
  derivedCodes: string[];
  linearSubjects?: string[]; // Mapel yang linier dengan sertifikasi / kualifikasi
  additionalDuty?: string; // e.g. "Kepala Madrasah", "Waka Kurikulum", "Wali Kelas X.1"
  additionalDutyHours?: number; // e.g. 12, 6, 2
  note?: string;
}

export interface TeacherAssignmentRow {
  id: string;
  teacherNo: number;
  teacherCode: string;
  teacherName: string;
  nipNbm: string;
  rankGolongan: string;
  subjectName: string;
  fullCode: string; // e.g. "A", "C1", "C2", "T3"
  classHours: Record<string, number>; // className -> count of hours per week
  totalTeachingHours: number; // sum of classHours
  isLinear?: boolean; // Linier dengan sertifikasi / bidang keahlian guru (true jika mapel linier)
  additionalDuty: string; // Tugas Tambahan
  additionalDutyHours: number; // Ekuivalensi jam
  totalWorkloadHours: number; // totalTeachingHours + additionalDutyHours
  meetsCertification: boolean; // >= 24 Jam
  notes?: string;
}

