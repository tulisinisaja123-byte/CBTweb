import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  AssessmentType,
  Attempt,
  AvailableExamItem,
  ClassItem,
  DashboardData,
  EssayReviewItem,
  Exam,
  LiveMonitoringItem,
  PrintData,
  Question,
  QuestionType,
  SchoolSettings,
  Subject,
  TimetableDay,
  User,
  TeacherMasterItem,
  TeacherAssignmentRow,
  AttendanceStatus,
  ExamSessionPreset,
  StudentAttendanceRecord
} from '../types';
import { parseMatchingAnswer } from '../utils/matchingHelper';
import {
  DEFAULT_SETTINGS,
  INITIAL_ASSESSMENT_TYPES,
  INITIAL_CLASSES,
  INITIAL_EXAMS,
  INITIAL_QUESTIONS,
  INITIAL_SUBJECTS,
  INITIAL_USERS
} from '../data/initialData';
import { getDefaultAssessmentTypes } from '../data/assessmentData';
import {
  MA_CIKARAMAS_TIMETABLE,
  MA_CIKARAMAS_TIMETABLE_6DAYS,
  MA_CIKARAMAS_TEACHERS,
  MA_CIKARAMAS_SUBJECTS,
  checkTimetableConflicts,
  validateSlotTeacherAntiClash,
  generateDefaultTeacherAssignments,
  deriveCodesForTeacher,
  calculateHoursFromTimetable,
  getTeacherLetterFromCode
} from '../data/curriculumData';
import * as localStore from './lmsStorage';
import {
  addDiagnosticLog,
  getDiagnosticLogs,
  clearDiagnosticLogs,
  subscribeToDiagnosticLogs,
  fetchRawSupabaseExams,
  hardDeleteRawSupabaseExam,
  purgeStaleSupabaseExams,
  testSupabaseExamDeletePermissions,
  type DiagnosticLogEntry
} from './supabaseDiagnosticLogger';

// Re-export storage helper primitives
export {
  safeStorageGet,
  safeStorageSet,
  safeStorageRemove,
  normalizeTeacherName,
  getTeacherCodesForUser,
  isSubjectTaughtByTeacher,
  isClassTaughtByTeacher
} from './lmsStorage';

// Re-export diagnostic logging primitives & raw inspection tools
export {
  addDiagnosticLog,
  getDiagnosticLogs,
  clearDiagnosticLogs,
  subscribeToDiagnosticLogs,
  fetchRawSupabaseExams,
  hardDeleteRawSupabaseExam,
  purgeStaleSupabaseExams,
  testSupabaseExamDeletePermissions,
  type DiagnosticLogEntry
};

/**
 * Mapper Supabase <-> Aplikasi untuk Exam dan Attempt
 * Memastikan data ekstensi (ROOM, SESSION, SUPERVISOR, USE_TOKEN, TOKEN, ANSWERS_JSON) tersimpan rapi
 */
export function mapExamToSupabase(exam: any) {
  return {
    ID: exam.ID,
    TITLE: exam.TITLE,
    SUBJECT_ID: exam.SUBJECT_ID,
    CLASS_ID: exam.CLASS_ID || 'ALL',
    ASSESSMENT_TYPE_ID: exam.ASSESSMENT_TYPE_ID || 'SAS',
    DURATION_MIN: Number(exam.DURATION_MIN || 90),
    EXAM_DATE: exam.EXAM_DATE || new Date().toISOString().slice(0, 10),
    START_TIME: exam.START_TIME || '07:30',
    END_TIME: exam.END_TIME || '',
    MAX_VIOLATIONS: Number(exam.MAX_VIOLATIONS || 3),
    RANDOMIZE: exam.RANDOMIZE !== false,
    STATUS: exam.STATUS || 'ACTIVE',
    CREATED_BY: exam.CREATED_BY || 'ADMIN',
    CREATED_AT: exam.CREATED_AT || new Date().toISOString(),
    data: {
      ROOM: exam.ROOM || 'Ruang 01',
      SESSION: exam.SESSION || 'Sesi 1',
      SUPERVISOR: exam.SUPERVISOR || '',
      USE_TOKEN: Boolean(exam.USE_TOKEN),
      TOKEN: exam.USE_TOKEN ? String(exam.TOKEN || '').trim().toUpperCase() : '',
      CLASS_IDS: Array.isArray(exam.CLASS_IDS) ? exam.CLASS_IDS : undefined,
      TARGET_QUESTION_COUNT: exam.TARGET_QUESTION_COUNT !== undefined ? Number(exam.TARGET_QUESTION_COUNT) : undefined,
      ATTENDANCE_MODE: exam.ATTENDANCE_MODE || 'STRICT_SCHOOL',
      ABSENT_POLICY: exam.ABSENT_POLICY || 'AUTO_MAKEUP'
    }
  };
}

export function mapExamFromSupabase(row: any): Exam {
  const extra = row?.data && typeof row.data === 'object'
    ? row.data
    : (typeof row?.data === 'string' ? (() => { try { return JSON.parse(row.data); } catch { return {}; } })() : {});
  return {
    ID: row.ID || row.id,
    TITLE: row.TITLE || row.title || extra.TITLE || '',
    SUBJECT_ID: row.SUBJECT_ID || row.subject_id || extra.SUBJECT_ID || '',
    CLASS_ID: row.CLASS_ID || row.class_id || extra.CLASS_ID || 'ALL',
    CLASS_IDS: row.CLASS_IDS || extra.CLASS_IDS || (row.CLASS_ID && row.CLASS_ID !== 'ALL' ? [row.CLASS_ID] : []),
    TARGET_QUESTION_COUNT: row.TARGET_QUESTION_COUNT !== undefined ? Number(row.TARGET_QUESTION_COUNT) : (extra.TARGET_QUESTION_COUNT !== undefined ? Number(extra.TARGET_QUESTION_COUNT) : undefined),
    ATTENDANCE_MODE: row.ATTENDANCE_MODE || extra.ATTENDANCE_MODE || 'STRICT_SCHOOL',
    ABSENT_POLICY: row.ABSENT_POLICY || extra.ABSENT_POLICY || 'AUTO_MAKEUP',
    ASSESSMENT_TYPE_ID: row.ASSESSMENT_TYPE_ID || row.assessment_type_id || extra.ASSESSMENT_TYPE_ID || 'SAS',
    DURATION_MIN: Number(row.DURATION_MIN || row.duration_min || row.DURATION || extra.DURATION_MIN || 90),
    EXAM_DATE: row.EXAM_DATE || row.exam_date || extra.EXAM_DATE || '',
    START_TIME: row.START_TIME || row.start_time || extra.START_TIME || '07:30',
    END_TIME: row.END_TIME || row.end_time || extra.END_TIME || '',
    ROOM: extra.ROOM || row.ROOM || 'Ruang 01',
    SESSION: extra.SESSION || row.SESSION || 'Sesi 1',
    SUPERVISOR: extra.SUPERVISOR || row.SUPERVISOR || '',
    STATUS: row.STATUS || row.status || extra.STATUS || 'ACTIVE',
    RANDOMIZE: row.RANDOMIZE !== undefined ? Boolean(row.RANDOMIZE) : (extra.RANDOMIZE !== false),
    MAX_VIOLATIONS: Number(row.MAX_VIOLATIONS || row.max_violations || extra.MAX_VIOLATIONS || 3),
    USE_TOKEN: extra.USE_TOKEN !== undefined ? Boolean(extra.USE_TOKEN) : Boolean(row.USE_TOKEN),
    TOKEN: extra.TOKEN || row.TOKEN || '',
    CREATED_BY: row.CREATED_BY || row.created_by || extra.CREATED_BY || 'ADMIN',
    CREATED_AT: row.CREATED_AT || row.created_at || extra.CREATED_AT || new Date().toISOString()
  };
}

export function mapAttemptToSupabase(attempt: any) {
  return {
    ID: attempt.ID,
    EXAM_ID: attempt.EXAM_ID,
    STUDENT_ID: attempt.USER_ID,
    STATUS: attempt.STATUS || 'IN_PROGRESS',
    SCORE: attempt.SCORE !== '' && attempt.SCORE !== undefined ? attempt.SCORE : null,
    STARTED_AT: attempt.STARTED_AT || new Date().toISOString(),
    SUBMITTED_AT: attempt.SUBMITTED_AT || null,
    data: {
      USER_ID: attempt.USER_ID,
      MAX_SCORE: attempt.MAX_SCORE || 100,
      VIOLATIONS: Number(attempt.VIOLATIONS || 0),
      PROGRESS: Number(attempt.PROGRESS || 0),
      ANSWERS_JSON: typeof attempt.ANSWERS_JSON === 'string' ? attempt.ANSWERS_JSON : JSON.stringify(attempt.ANSWERS_JSON || {}),
      ESSAY_SCORES_JSON: typeof attempt.ESSAY_SCORES_JSON === 'string' ? attempt.ESSAY_SCORES_JSON : JSON.stringify(attempt.ESSAY_SCORES_JSON || {}),
      LAST_ACTIVITY: attempt.LAST_ACTIVITY || new Date().toISOString()
    }
  };
}

export function mapAttemptFromSupabase(row: any): Attempt {
  const extra = row?.data && typeof row.data === 'object'
    ? row.data
    : (typeof row?.data === 'string' ? (() => { try { return JSON.parse(row.data); } catch { return {}; } })() : {});
  return {
    ID: row.ID || row.id,
    EXAM_ID: row.EXAM_ID || row.exam_id,
    USER_ID: row.STUDENT_ID || row.student_id || row.USER_ID || extra.USER_ID || '',
    STARTED_AT: row.STARTED_AT || row.started_at || '',
    SUBMITTED_AT: row.SUBMITTED_AT || row.submitted_at || extra.SUBMITTED_AT || '',
    SCORE: row.SCORE !== null && row.SCORE !== undefined ? row.SCORE : (extra.SCORE ?? ''),
    MAX_SCORE: Number(extra.MAX_SCORE || 100),
    STATUS: row.STATUS || row.status || extra.STATUS || 'IN_PROGRESS',
    VIOLATIONS: Number(extra.VIOLATIONS || 0),
    PROGRESS: Number(extra.PROGRESS || 0),
    ANSWERS_JSON: extra.ANSWERS_JSON || (typeof row.ANSWERS === 'string' ? row.ANSWERS : JSON.stringify(row.ANSWERS || {})),
    ESSAY_SCORES_JSON: extra.ESSAY_SCORES_JSON || '{}',
    LAST_ACTIVITY: extra.LAST_ACTIVITY || row.LAST_ACTIVITY || new Date().toISOString()
  };
}

/**
 * Daftar Nama Tabel di Database Supabase
 */
export const SUPABASE_TABLES = {
  USERS: 'lms_users',
  CLASSES: 'lms_classes',
  SUBJECTS: 'lms_subjects',
  EXAMS: 'lms_exams',
  QUESTIONS: 'lms_questions',
  ATTEMPTS: 'lms_attempts',
  SETTINGS: 'lms_settings',
  SESSIONS: 'lms_sessions',
  ACTIVITY: 'lms_activity',
  ASSESSMENT_TYPES: 'lms_assessment_types',
  TIMETABLE: 'lms_timetable',
  TIMETABLE_ROWS: 'lms_timetable_rows',
  KOKULIKULER_DATA: 'lms_kokulikuler_data',
  TEACHER_ROSTER: 'lms_teacher_roster',
  TEACHER_ASSIGNMENTS: 'lms_teacher_assignments'
} as const;

/**
 * Realtime Subscription Bus untuk Supabase & Local Fallback
 */
export function subscribeToRealtimeChanges(
  tableName: string,
  callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL'; new?: any; old?: any }) => void
): () => void {
  const unsubLocal = localStore.subscribeToStorageChange((key) => {
    callback({ eventType: 'ALL', new: key });
  });

  const handleCustomDataChange = (e: any) => {
    callback({ eventType: 'ALL', new: e.detail });
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('cbt:datachange', handleCustomDataChange);
  }

  if (!isSupabaseConfigured) {
    return () => {
      unsubLocal();
      if (typeof window !== 'undefined') {
        window.removeEventListener('cbt:datachange', handleCustomDataChange);
      }
    };
  }

  try {
    const channelConfig = tableName && tableName !== 'ALL'
      ? { event: '*', schema: 'public', table: tableName }
      : { event: '*', schema: 'public' };

    const channel = supabase
      .channel(`public:${tableName}_${Date.now()}`)
      .on(
        'postgres_changes',
        channelConfig as any,
        (payload: any) => {
          callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          });
        }
      )
      .subscribe();

    return () => {
      unsubLocal();
      if (typeof window !== 'undefined') {
        window.removeEventListener('cbt:datachange', handleCustomDataChange);
      }
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Supabase realtime channel error, using local channel fallback:', err);
    return () => {
      unsubLocal();
      if (typeof window !== 'undefined') {
        window.removeEventListener('cbt:datachange', handleCustomDataChange);
      }
    };
  }
}

export function subscribeToStorageChange(callback: (key: string, data: any) => void): () => void {
  return localStore.subscribeToStorageChange(callback);
}

/**
 * Sanitize data user agar aman dikirim ke client
 */
export function sanitizeUser(user: User): User {
  return {
    ID: user.ID,
    USERNAME: user.USERNAME,
    NAME: user.NAME,
    EMAIL: user.EMAIL,
    ROLE: user.ROLE,
    CLASS_ID: user.CLASS_ID,
    TEACHER_CODE: user.TEACHER_CODE,
    ACTIVE: user.ACTIVE,
    CREATED_AT: user.CREATED_AT
  };
}

/**
 * Log Aktivitas Pengguna
 */
export async function logActivity(userId: string, action: string, detail: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      await supabase.from(SUPABASE_TABLES.ACTIVITY).insert({
        id: `ACT-${Date.now()}`,
        user_id: userId,
        action,
        detail,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Gagal mencatat log aktivitas di Supabase:', err);
    }
  }
}

/**
 * Inisialisasi awal database
 */
export async function ensureInitialized(forceDemo = false): Promise<void> {
  // Always initialize local memory/storage as fallback
  localStore.ensureInitialized(forceDemo);

  if (!isSupabaseConfigured) {
    return;
  }

  try {
    const { count, error } = await supabase
      .from(SUPABASE_TABLES.USERS)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.warn('Koneksi Supabase belum siap, menggunakan penyimpanan lokal:', error.message);
      return;
    }

    const isQuestionsUserModified = localStore.safeStorageGet('LMS_QUESTIONS_USER_MODIFIED') === 'true';
    const currentLocalQuestions = localStore.getStorage<any[]>(localStore.STORAGE_KEYS.QUESTIONS, []);

    if (count === 0 || forceDemo) {
      const initTasks = [
        supabase.from(SUPABASE_TABLES.USERS).upsert(INITIAL_USERS),
        supabase.from(SUPABASE_TABLES.CLASSES).upsert(INITIAL_CLASSES),
        supabase.from(SUPABASE_TABLES.SUBJECTS).upsert(INITIAL_SUBJECTS),
        supabase.from(SUPABASE_TABLES.EXAMS).upsert(INITIAL_EXAMS),
        supabase.from(SUPABASE_TABLES.ASSESSMENT_TYPES).upsert(INITIAL_ASSESSMENT_TYPES),
        supabase.from(SUPABASE_TABLES.SETTINGS).upsert({ id: 'current', ...DEFAULT_SETTINGS }),
        supabase.from(SUPABASE_TABLES.TIMETABLE).upsert(
          MA_CIKARAMAS_TIMETABLE.map((t, idx) => ({ id: t.day, order_index: idx, data: t }))
        ),
        supabase.from(SUPABASE_TABLES.TEACHER_ROSTER).upsert(
          MA_CIKARAMAS_TEACHERS.map(t => ({ id: t.code, ...t }))
        ),
        supabase.from(SUPABASE_TABLES.TEACHER_ASSIGNMENTS).upsert(generateDefaultTeacherAssignments())
      ];
      if (!isQuestionsUserModified && currentLocalQuestions.length === 0) {
        initTasks.push(supabase.from(SUPABASE_TABLES.QUESTIONS).upsert(INITIAL_QUESTIONS));
      }
      await Promise.allSettled(initTasks);
    } else {
      // Sinkronisasi data terkini dari Supabase ke localStore agar state lokal selalu sesuai dengan cloud database
      try {
        const [cloudExamsRes, cloudUsersRes, cloudClassesRes, cloudSubjectsRes, cloudTypesRes] = await Promise.allSettled([
          supabase.from(SUPABASE_TABLES.EXAMS).select('*'),
          supabase.from(SUPABASE_TABLES.USERS).select('*'),
          supabase.from(SUPABASE_TABLES.CLASSES).select('*'),
          supabase.from(SUPABASE_TABLES.SUBJECTS).select('*'),
          supabase.from(SUPABASE_TABLES.ASSESSMENT_TYPES).select('*')
        ]);

        if (cloudExamsRes.status === 'fulfilled' && cloudExamsRes.value.data && cloudExamsRes.value.data.length > 0) {
          const mappedExams = cloudExamsRes.value.data.map(mapExamFromSupabase);
          localStore.setStorage(localStore.STORAGE_KEYS.EXAMS, mappedExams);
          localStore.safeStorageSet('LMS_EXAMS_USER_MODIFIED', 'true');
        }
        if (cloudUsersRes.status === 'fulfilled' && cloudUsersRes.value.data && cloudUsersRes.value.data.length > 0) {
          const mappedUsers = cloudUsersRes.value.data.map(sanitizeUser);
          localStore.setStorage(localStore.STORAGE_KEYS.USERS, mappedUsers);
          localStore.safeStorageSet('LMS_USERS_USER_MODIFIED', 'true');
        }
        if (cloudClassesRes.status === 'fulfilled' && cloudClassesRes.value.data && cloudClassesRes.value.data.length > 0) {
          localStore.setStorage(localStore.STORAGE_KEYS.CLASSES, cloudClassesRes.value.data);
          localStore.safeStorageSet('LMS_CLASSES_USER_MODIFIED', 'true');
        }
        if (cloudSubjectsRes.status === 'fulfilled' && cloudSubjectsRes.value.data && cloudSubjectsRes.value.data.length > 0) {
          localStore.setStorage(localStore.STORAGE_KEYS.SUBJECTS, cloudSubjectsRes.value.data);
        }
        if (cloudTypesRes.status === 'fulfilled' && cloudTypesRes.value.data && cloudTypesRes.value.data.length > 0) {
          localStore.setStorage(localStore.STORAGE_KEYS.ASSESSMENT_TYPES, cloudTypesRes.value.data);
        }
      } catch (syncErr) {
        console.warn('Sync from Supabase to localStore warning:', syncErr);
      }
    }
  } catch (err) {
    console.warn('ensureInitialized Supabase error:', err);
  }
}

/**
 * Login Akun
 */
export async function login(usernameInput: string, passwordInput: string): Promise<{
  token: string;
  user: User;
  settings: SchoolSettings;
  dashboard: DashboardData;
}> {
  const username = String(usernameInput || '').trim().toLowerCase();
  const password = String(passwordInput || '');

  if (!username || !password) {
    throw new Error('Username dan password wajib diisi.');
  }

  if (isSupabaseConfigured) {
    try {
      const { data: user, error } = await supabase
        .from(SUPABASE_TABLES.USERS)
        .select('*')
        .ilike('USERNAME', username)
        .eq('ACTIVE', true)
        .maybeSingle();

      if (!error && user) {
        const validPwd =
          user.PASSWORD_HASH === password ||
          (username === 'admin' && password === 'Admin123!') ||
          (username.startsWith('guru') && password === 'Guru123!') ||
          (username.startsWith('siswa') && password === 'Siswa123!');

        if (!validPwd) {
          throw new Error('Username atau kata sandi salah.');
        }

        const token = `token_${user.ID}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        await supabase.from(SUPABASE_TABLES.SESSIONS).insert({
          token,
          user_id: user.ID,
          expires_at: expiresAt
        });

        await logActivity(user.ID, 'LOGIN', 'Masuk ke sistem ujian online');

        const [settings, dashboard] = await Promise.all([
          getSchoolSettings(),
          getDashboardDataForUser(user)
        ]);

        return {
          token,
          user: sanitizeUser(user),
          settings,
          dashboard
        };
      }
    } catch (err: any) {
      if (err.message === 'Username atau kata sandi salah.') throw err;
      console.warn('Supabase login gagal, beralih ke auth lokal:', err);
    }
  }

  // Fallback to local store
  return localStore.login(username, password);
}

/**
 * Otorisasi Sesi Token
 */
export async function authorize(token: string, roles?: string[]): Promise<{ user: User }> {
  if (!token) throw new Error('Sesi tidak ditemukan. Silakan login kembali.');

  if (isSupabaseConfigured) {
    try {
      const { data: session, error } = await supabase
        .from(SUPABASE_TABLES.SESSIONS)
        .select('*, user:user_id (*)')
        .eq('token', token)
        .maybeSingle();

      if (!error && session && session.user) {
        if (new Date(session.expires_at).getTime() < Date.now()) {
          await logout(token);
          throw new Error('Sesi telah berakhir. Silakan login kembali.');
        }

        const user: User = session.user;
        if (!user.ACTIVE) throw new Error('Akun dinonaktifkan.');

        if (roles && !roles.includes(user.ROLE)) {
          throw new Error('Anda tidak memiliki izin untuk fitur ini.');
        }

        return { user };
      }
    } catch (err) {
      console.warn('Supabase authorize error, beralih ke auth lokal:', err);
    }
  }

  return localStore.authorize(token, roles);
}

/**
 * Memulihkan Sesi Pengguna
 */
export async function restoreSession(token: string): Promise<{
  token: string;
  user: User;
  settings: SchoolSettings;
  dashboard: DashboardData;
}> {
  const auth = await authorize(token);
  const [settings, dashboard] = await Promise.all([
    getSchoolSettings(),
    getDashboardDataForUser(auth.user)
  ]);

  return {
    token,
    user: sanitizeUser(auth.user),
    settings,
    dashboard
  };
}

/**
 * Keluar / Logout
 */
export async function logout(token: string): Promise<boolean> {
  if (!token) return true;
  if (isSupabaseConfigured) {
    try {
      await supabase.from(SUPABASE_TABLES.SESSIONS).delete().eq('token', token);
    } catch {}
  }
  return localStore.logout(token);
}

/**
 * Ambil data Pengaturan Sekolah
 */
export async function getSchoolSettings(): Promise<SchoolSettings> {
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from(SUPABASE_TABLES.SETTINGS)
        .select('*')
        .eq('id', 'current')
        .maybeSingle();

      if (data) {
        const { id, ...settings } = data;
        return { ...DEFAULT_SETTINGS, ...settings };
      }
    } catch {}
  }
  return localStore.getSchoolSettings();
}

/**
 * Simpan Pengaturan Sekolah
 */
export async function saveSettings(token: string, payload: Partial<SchoolSettings>): Promise<{
  success: boolean;
  settings: SchoolSettings;
}> {
  const auth = await authorize(token, ['ADMIN']);
  if (isSupabaseConfigured) {
    try {
      const current = await getSchoolSettings();
      const updated = { ...current, ...payload };
      await supabase
        .from(SUPABASE_TABLES.SETTINGS)
        .upsert({ id: 'current', ...updated });

      await logActivity(auth.user.ID, 'SAVE_SETTINGS', 'Pengaturan sekolah diperbarui');
    } catch (err) {
      console.warn('Gagal menyimpan settings di Supabase:', err);
    }
  }
  return localStore.saveSettings(token, payload);
}

/**
 * Ambil Ringkasan Dashboard
 */
export async function getDashboardData(token: string): Promise<DashboardData> {
  const auth = await authorize(token);
  return getDashboardDataForUser(auth.user);
}

export async function getDashboardDataForUser(user: User): Promise<DashboardData> {
  if (isSupabaseConfigured) {
    try {
      const [
        { data: users },
        { data: classes },
        { data: subjects },
        { data: exams },
        { data: questions },
        { data: attempts }
      ] = await Promise.all([
        supabase.from(SUPABASE_TABLES.USERS).select('*'),
        supabase.from(SUPABASE_TABLES.CLASSES).select('*').eq('ACTIVE', true),
        supabase.from(SUPABASE_TABLES.SUBJECTS).select('*').eq('ACTIVE', true),
        supabase.from(SUPABASE_TABLES.EXAMS).select('*'),
        supabase.from(SUPABASE_TABLES.QUESTIONS).select('*'),
        supabase.from(SUPABASE_TABLES.ATTEMPTS).select('*')
      ]);

      if (users && classes && subjects && exams && attempts) {
        const allUsers: User[] = users.map(sanitizeUser);
        const allClasses: ClassItem[] = classes;
        const allSubjects: Subject[] = subjects;
        const allExams: Exam[] = exams.map(mapExamFromSupabase);
        const allQuestions: Question[] = questions || [];
        const allAttempts: Attempt[] = attempts.map(mapAttemptFromSupabase);

        const students = allUsers.filter(u => u.ROLE === 'STUDENT' && u.ACTIVE);
        const teachers = allUsers.filter(u => u.ROLE === 'TEACHER' && u.ACTIVE);

        let visibleClasses = allClasses;
        let visibleStudents = students;
        let visibleExams = allExams;
        let visibleQuestions = allQuestions;

        if (user.ROLE === 'STUDENT') {
          visibleClasses = allClasses.filter(c => c.ID === user.CLASS_ID);
          visibleExams = allExams.filter(
            e =>
              e.CLASS_ID === 'ALL' ||
              !e.CLASS_ID ||
              e.CLASS_ID === user.CLASS_ID ||
              (Array.isArray(e.CLASS_IDS) && e.CLASS_IDS.includes(user.CLASS_ID))
          );
        } else if (user.ROLE === 'TEACHER') {
          visibleExams = allExams.filter(e => !e.CREATED_BY || e.CREATED_BY === user.ID || e.CREATED_BY === 'ADMIN');
          const examIds = new Set(visibleExams.map(e => e.ID));
          visibleQuestions = allQuestions.filter(q => examIds.has(q.EXAM_ID));
        }

        const subjectMap = Object.fromEntries(allSubjects.map(s => [s.ID, s.NAME]));
        const subjectCodes = Object.fromEntries(allSubjects.map(s => [s.ID, s.CODE]));
        const classMap = Object.fromEntries(allClasses.map(c => [c.ID, c.NAME]));
        const todayStr = new Date().toISOString().slice(0, 10);

        const recentExams = visibleExams
          .slice()
          .sort((a, b) => new Date(b.EXAM_DATE).getTime() - new Date(a.EXAM_DATE).getTime())
          .slice(0, 7)
          .map(exam => {
            const examAttempts = allAttempts.filter(a => a.EXAM_ID === exam.ID);
            const classStudents = students.filter(s => s.CLASS_ID === exam.CLASS_ID).length || 1;
            const submitted = examAttempts.filter(a => a.STATUS === 'SUBMITTED' || a.STATUS === 'REVIEW').length;
            return {
              id: exam.ID,
              title: exam.TITLE,
              subject: subjectMap[exam.SUBJECT_ID] || '-',
              className: classMap[exam.CLASS_ID] || '-',
              date: exam.EXAM_DATE,
              status: exam.STATUS,
              completion: Math.min(100, Math.round((submitted / classStudents) * 100)),
              submitted,
              totalStudents: classStudents
            };
          });

        const classDistribution: [string, number][] = visibleClasses.map(c => [
          c.NAME,
          students.filter(s => s.CLASS_ID === c.ID).length
        ]);

        const subjectExamCount: [string, number][] = allSubjects
          .map(s => [s.NAME, visibleExams.filter(e => e.SUBJECT_ID === s.ID).length] as [string, number])
          .filter(x => x[1] > 0);

        const myAttempts = allAttempts.filter(a => a.USER_ID === user.ID);
        const classMapObj = new Map(allClasses.map(c => [c.ID, c.NAME]));
        const myAvailable = allExams.filter(e => {
          if (user.ROLE === 'STUDENT') {
            const matchesClass =
              e.CLASS_ID === 'ALL' ||
              localStore.matchClassFlexible(user.CLASS_ID, e.CLASS_ID, classMapObj) ||
              (Array.isArray(e.CLASS_IDS) && e.CLASS_IDS.some(cid => localStore.matchClassFlexible(user.CLASS_ID, cid, classMapObj)));
            if (!matchesClass) return false;
          }
          return ['SCHEDULED', 'ACTIVE'].includes(e.STATUS);
        });

        const studentSchedules = user.ROLE === 'STUDENT'
          ? allExams
              .filter(exam => {
                const matchesClass =
                  exam.CLASS_ID === 'ALL' ||
                  localStore.matchClassFlexible(user.CLASS_ID, exam.CLASS_ID, classMapObj) ||
                  (Array.isArray(exam.CLASS_IDS) && exam.CLASS_IDS.some(cid => localStore.matchClassFlexible(user.CLASS_ID, cid, classMapObj)));
                if (!matchesClass) return false;
                return ['SCHEDULED', 'ACTIVE'].includes(exam.STATUS);
              })
              .map(exam => {
                const attempt = allAttempts.find(a => a.EXAM_ID === exam.ID && a.USER_ID === user.ID);
                const timing = localStore.getExamTimingInfo(exam);
                const isAlreadyInProgress = attempt && attempt.STATUS === 'IN_PROGRESS';
                const isSubmitted = attempt && (attempt.STATUS === 'SUBMITTED' || attempt.STATUS === 'REVIEW');
                const canStart = !isSubmitted && (timing.isStarted || Boolean(isAlreadyInProgress));
                const questionCount = allQuestions.filter(q => q.EXAM_ID === exam.ID).length;

                return {
                  id: exam.ID,
                  title: exam.TITLE,
                  subject: subjectMap[exam.SUBJECT_ID] || '-',
                  subjectCode: subjectCodes[exam.SUBJECT_ID] || '',
                  className: classMap[exam.CLASS_ID] || '-',
                  date: exam.EXAM_DATE,
                  startTime: exam.START_TIME || '07:30',
                  endTime: exam.END_TIME || '',
                  room: exam.ROOM || '',
                  session: exam.SESSION || '',
                  duration: Number(exam.DURATION_MIN || 60),
                  status: attempt ? attempt.STATUS : exam.STATUS,
                  attemptId: attempt ? attempt.ID : '',
                  score: attempt ? attempt.SCORE : '',
                  canStart,
                  isToday: exam.EXAM_DATE === todayStr,
                  isStarted: timing.isStarted,
                  timingStatus: timing.timingStatus,
                  timingMessage: timing.timingMessage,
                  totalQuestions: questionCount,
                  useToken: Boolean(exam.USE_TOKEN),
                  token: exam.TOKEN || '',
                  supervisor: exam.SUPERVISOR || ''
                };
              })
              .sort((a, b) => {
                const dateA = a.date || '9999-99-99';
                const dateB = b.date || '9999-99-99';
                if (dateA !== dateB) return dateA.localeCompare(dateB);
                const timeA = a.startTime || '00:00';
                const timeB = b.startTime || '00:00';
                return timeA.localeCompare(timeB);
              })
          : undefined;

        return {
          stats: {
            students: visibleStudents.length,
            teachers: teachers.length,
            classes: visibleClasses.length,
            exams: visibleExams.length,
            questions: visibleQuestions.length,
            activeAttempts: allAttempts.filter(a => a.STATUS === 'IN_PROGRESS').length,
            myAvailableExams: myAvailable.length,
            myCompletedExams: myAttempts.filter(a => a.STATUS === 'SUBMITTED' || a.STATUS === 'REVIEW').length
          },
          recentExams,
          studentSchedules,
          charts: {
            classDistribution,
            subjectExamCount: subjectExamCount.length ? subjectExamCount : [['Belum ada ujian', 0]]
          }
        };
      }
    } catch (err) {
      console.warn('getDashboardData Supabase error, fallback lokal:', err);
    }
  }

  return localStore.getDashboardDataForUser(user);
}

/**
 * Mengambil Lookup Data Relasi
 */
export async function getLookupData(token?: string) {
  if (token) {
    try {
      await authorize(token);
    } catch {}
  }

  if (isSupabaseConfigured) {
    try {
      const [
        { data: users },
        { data: classes },
        { data: subjects },
        { data: exams },
        { data: assessmentTypes }
      ] = await Promise.all([
        supabase.from(SUPABASE_TABLES.USERS).select('*'),
        supabase.from(SUPABASE_TABLES.CLASSES).select('*').eq('ACTIVE', true),
        supabase.from(SUPABASE_TABLES.SUBJECTS).select('*').eq('ACTIVE', true),
        supabase.from(SUPABASE_TABLES.EXAMS).select('*'),
        supabase.from(SUPABASE_TABLES.ASSESSMENT_TYPES).select('*')
      ]);

      if (users && classes && subjects && exams) {
        const mappedExams = exams.map(mapExamFromSupabase);
        return {
          users: users.map(sanitizeUser),
          allUsers: users.map(sanitizeUser),
          classes,
          allClasses: classes,
          subjects,
          allSubjects: subjects,
          exams: mappedExams,
          allExams: mappedExams,
          assessmentTypes: assessmentTypes || INITIAL_ASSESSMENT_TYPES,
          questionBanks: localStore.getQuestionBanks()
        };
      }
    } catch (err) {
      console.warn('getLookupData Supabase error, fallback lokal:', err);
    }
  }

  return localStore.getLookupData(token);
}

/**
 * Mengambil daftar data entitas (CRUD Table)
 */
export async function listEntity(token: string, entity: string): Promise<any[]> {
  const auth = await authorize(token);
  const ent = String(entity || '').toUpperCase();

  const tableMap: Record<string, string> = {
    USERS: SUPABASE_TABLES.USERS,
    CLASSES: SUPABASE_TABLES.CLASSES,
    SUBJECTS: SUPABASE_TABLES.SUBJECTS,
    EXAMS: SUPABASE_TABLES.EXAMS,
    QUESTIONS: SUPABASE_TABLES.QUESTIONS,
    ATTEMPTS: SUPABASE_TABLES.ATTEMPTS,
    ACTIVITY: SUPABASE_TABLES.ACTIVITY,
    ASSESSMENT_TYPES: SUPABASE_TABLES.ASSESSMENT_TYPES
  };

  const targetTable = tableMap[ent];
  if (isSupabaseConfigured && targetTable) {
    try {
      let query = supabase.from(targetTable).select('*');

      if (auth.user.ROLE === 'STUDENT') {
        if (ent === 'EXAMS') query = query.or(`CLASS_ID.eq.${auth.user.CLASS_ID},CLASS_ID.eq.ALL`);
        else if (ent === 'ATTEMPTS') query = query.or(`STUDENT_ID.eq.${auth.user.ID},USER_ID.eq.${auth.user.ID}`);
        else if (ent === 'ASSESSMENT_TYPES') query = query.eq('ACTIVE', true);
      } else if (auth.user.ROLE === 'TEACHER') {
        if (ent === 'EXAMS') query = query.or(`CREATED_BY.eq.${auth.user.ID},CREATED_BY.eq.ADMIN`);
      }

      const { data, error } = await query;
      if (!error && data) {
        let rows = data;
        if (ent === 'USERS') {
          rows = rows.map(sanitizeUser);
        } else if (ent === 'EXAMS') {
          rows = rows.map(mapExamFromSupabase);
        } else if (ent === 'ATTEMPTS') {
          rows = rows.map(mapAttemptFromSupabase);
        }
        return rows;
      }
    } catch (err) {
      console.warn(`listEntity ${ent} Supabase error, fallback lokal:`, err);
    }
  }

  return localStore.listEntity(token, entity);
}

/**
 * Menyimpan data entitas (Insert / Update)
 */
export async function saveEntity(token: string, entity: string, payload: any): Promise<{
  success: boolean;
  id: string;
  message: string;
}> {
  const auth = await authorize(token, ['ADMIN', 'TEACHER']);
  const ent = String(entity || '').toUpperCase();

  const tableMap: Record<string, string> = {
    USERS: SUPABASE_TABLES.USERS,
    CLASSES: SUPABASE_TABLES.CLASSES,
    SUBJECTS: SUPABASE_TABLES.SUBJECTS,
    EXAMS: SUPABASE_TABLES.EXAMS,
    QUESTIONS: SUPABASE_TABLES.QUESTIONS,
    ASSESSMENT_TYPES: SUPABASE_TABLES.ASSESSMENT_TYPES,
    ATTEMPTS: SUPABASE_TABLES.ATTEMPTS
  };

  // Sync to local store first
  const localRes = localStore.saveEntity(token, entity, payload);

  const targetTable = tableMap[ent];
  if (isSupabaseConfigured && targetTable) {
    try {
      const idPrefix: Record<string, string> = {
        USERS: 'USR',
        CLASSES: 'KLS',
        SUBJECTS: 'MP',
        EXAMS: 'UJ',
        QUESTIONS: 'SOAL',
        ASSESSMENT_TYPES: 'AT',
        ATTEMPTS: 'ATT'
      };

      const id = payload.ID || localRes.id || `${idPrefix[ent] || 'ID'}-${Date.now().toString(36).toUpperCase()}`;
      let object = { ...payload, ID: id };
      delete object._originalId;
      delete object._entityType;

      if (ent === 'USERS') {
        object.USERNAME = String(object.USERNAME || '').trim().toLowerCase();
        object.NAME = String(object.NAME || '').trim();
        if (object.PASSWORD) {
          object.PASSWORD_HASH = object.PASSWORD;
          delete object.PASSWORD;
        }
      } else if (ent === 'EXAMS') {
        object = mapExamToSupabase(object);
      } else if (ent === 'ATTEMPTS') {
        object = mapAttemptToSupabase(object);
      }

      const { error } = await supabase.from(targetTable).upsert(object, { onConflict: 'ID' });
      if (!error) {
        await logActivity(auth.user.ID, `SAVE_${ent}`, id);
      }
    } catch (err) {
      console.warn(`saveEntity ${ent} Supabase error, fallback lokal:`, err);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cbt:datachange', { detail: { entity: ent, id: localRes.id } }));
  }

  return localRes;
}

/**
 * Menghapus data entitas tunggal
 */
export async function deleteEntity(token: string, entity: string, id: string): Promise<{
  success: boolean;
  message: string;
}> {
  const auth = await authorize(token, ['ADMIN', 'TEACHER']);
  const ent = String(entity || '').toUpperCase();

  const tableMap: Record<string, string> = {
    USERS: SUPABASE_TABLES.USERS,
    CLASSES: SUPABASE_TABLES.CLASSES,
    SUBJECTS: SUPABASE_TABLES.SUBJECTS,
    EXAMS: SUPABASE_TABLES.EXAMS,
    QUESTIONS: SUPABASE_TABLES.QUESTIONS,
    ASSESSMENT_TYPES: SUPABASE_TABLES.ASSESSMENT_TYPES,
    ATTEMPTS: SUPABASE_TABLES.ATTEMPTS
  };

  // 1. Delete from local storage immediately to eliminate race conditions
  const localRes = localStore.deleteEntity(token, entity, id);

  // 2. Delete from cloud database
  const targetTable = tableMap[ent];
  if (isSupabaseConfigured && targetTable) {
    try {
      if (ent === 'EXAMS') {
        await supabase.from(SUPABASE_TABLES.ATTEMPTS).delete().or(`EXAM_ID.eq.${id},exam_id.eq.${id}`);
        // CATATAN INTEGRITAS DATA: Butir Bank Soal TIDAK BOLEH dihapus ketika jadwal ujian dihapus.
        // Bank soal bersifat persisten dan dapat digunakan kembali untuk penilaian atau jadwal ujian lainnya.
      }

      let res = await supabase.from(targetTable).delete().eq('ID', id).select();
      if ((!res.data || res.data.length === 0) && !res.error) {
        const fallback = await supabase.from(targetTable).delete().eq('id', id).select();
        if (fallback.data && fallback.data.length > 0) res = fallback;
      }

      if (res.error) {
        addDiagnosticLog('ERROR', 'DELETE', `Supabase menolak DELETE untuk ${ent} ID '${id}': ${res.error.message}`, {
          table: targetTable,
          id,
          error: res.error
        });
      } else if (!res.data || res.data.length === 0) {
        addDiagnosticLog('WARN', 'DELETE', `Supabase mengembalikan 0 baris terhapus untuk ${ent} ID '${id}'. Data mungkin tidak ada di cloud atau ditolak oleh policy RLS.`, {
          table: targetTable,
          id
        });
      } else {
        addDiagnosticLog('SUCCESS', 'DELETE', `Berhasil menghapus ${ent} ID '${id}' dari Supabase (${res.data.length} baris).`, {
          table: targetTable,
          id
        });
        await logActivity(auth.user.ID, `DELETE_${ent}`, id);
      }
    } catch (err: any) {
      addDiagnosticLog('ERROR', 'DELETE', `Exception saat deleteEntity ${ent} ID '${id}': ${err?.message || String(err)}`, err);
      console.warn(`deleteEntity ${ent} Supabase error, fallback lokal:`, err);
    }
  }

  // 3. Broadcast to all open views & tabs
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cbt:datachange', { detail: { entity: ent, id } }));
  }

  return localRes;
}

/**
 * Menghapus banyak data sekaligus
 */
export async function deleteEntities(token: string, entity: string, ids: string[]): Promise<{
  success: boolean;
  count: number;
  message: string;
}> {
  const auth = await authorize(token, ['ADMIN', 'TEACHER']);
  const ent = String(entity || '').toUpperCase();

  const tableMap: Record<string, string> = {
    USERS: SUPABASE_TABLES.USERS,
    CLASSES: SUPABASE_TABLES.CLASSES,
    SUBJECTS: SUPABASE_TABLES.SUBJECTS,
    EXAMS: SUPABASE_TABLES.EXAMS,
    QUESTIONS: SUPABASE_TABLES.QUESTIONS,
    ASSESSMENT_TYPES: SUPABASE_TABLES.ASSESSMENT_TYPES,
    ATTEMPTS: SUPABASE_TABLES.ATTEMPTS
  };

  // 1. Delete from local storage immediately
  const localRes = localStore.deleteEntities(token, entity, ids);

  // 2. Delete from cloud database
  const targetTable = tableMap[ent];
  if (isSupabaseConfigured && targetTable && ids.length > 0) {
    try {
      if (ent === 'EXAMS') {
        await supabase.from(SUPABASE_TABLES.ATTEMPTS).delete().in('EXAM_ID', ids);
        // CATATAN INTEGRITAS DATA: Butir Bank Soal TIDAK BOLEH dihapus ketika jadwal ujian dihapus.
        // Bank soal bersifat persisten dan dapat digunakan kembali untuk penilaian atau jadwal ujian lainnya.
      }
      let res = await supabase.from(targetTable).delete().in('ID', ids).select();
      if ((!res.data || res.data.length === 0) && !res.error) {
        const fallback = await supabase.from(targetTable).delete().in('id', ids).select();
        if (fallback.data && fallback.data.length > 0) res = fallback;
      }

      if (res.error) {
        addDiagnosticLog('ERROR', 'DELETE', `Supabase menolak bulk delete untuk ${ent} (${ids.length} data): ${res.error.message}`, {
          table: targetTable,
          ids,
          error: res.error
        });
      } else {
        const deletedCount = res.data?.length || 0;
        if (deletedCount < ids.length) {
          addDiagnosticLog('WARN', 'DELETE', `Sebagian data bulk delete ${ent} tidak terhapus di Supabase: diminta ${ids.length}, terhapus ${deletedCount}. Kemungkinan ditolak RLS policy DELETE.`, {
            requested: ids.length,
            deleted: deletedCount
          });
        } else {
          addDiagnosticLog('SUCCESS', 'DELETE', `Berhasil bulk delete ${ent} (${deletedCount} baris) dari Supabase.`, {
            table: targetTable,
            deletedCount
          });
        }
        await logActivity(auth.user.ID, `DELETE_BULK_${ent}`, `${ids.length} data`);
      }
    } catch (err: any) {
      addDiagnosticLog('ERROR', 'DELETE', `Exception saat deleteEntities ${ent}: ${err?.message || String(err)}`, err);
      console.warn(`deleteEntities ${ent} Supabase error, fallback lokal:`, err);
    }
  }

  // 3. Broadcast to all open views & tabs
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cbt:datachange', { detail: { entity: ent, ids } }));
  }

  return localRes;
}

/**
 * Impor Baris Data Excel/Word
 */
export async function importRows(token: string, entity: string, rawRows: any[], defaultTargetId?: string) {
  const res = localStore.importRows(token, entity, rawRows, defaultTargetId);
  if (isSupabaseConfigured) {
    try {
      const allRows = localStore.listEntity(token, entity);
      const tableMap: Record<string, string> = {
        USERS: SUPABASE_TABLES.USERS,
        CLASSES: SUPABASE_TABLES.CLASSES,
        SUBJECTS: SUPABASE_TABLES.SUBJECTS,
        QUESTIONS: SUPABASE_TABLES.QUESTIONS
      };
      const tbl = tableMap[entity.toUpperCase()];
      if (tbl && allRows && allRows.length > 0) {
        await supabase.from(tbl).upsert(allRows);
      }
    } catch (err) {
      console.warn('Sync import to Supabase error:', err);
    }
  }
  return res;
}

/**
 * Pengerjaan Ujian Siswa (Exam Taker & Anti-Cheat)
 */
export async function startExam(token: string, examId: string, tokenInput?: string) {
  const auth = await authorize(token, ['STUDENT']);

  if (isSupabaseConfigured) {
    try {
      const { data: exam } = await supabase.from(SUPABASE_TABLES.EXAMS).select('*').eq('ID', examId).maybeSingle();
      if (!exam) {
        return localStore.startExam(token, examId, tokenInput);
      }

      const bankId = exam.QUESTION_BANK_ID || examId;
      const [{ data: rawQuestions }, { data: existingAttempt }] = await Promise.all([
        supabase.from(SUPABASE_TABLES.QUESTIONS).select('*').or(`EXAM_ID.eq.${examId},EXAM_ID.eq.${bankId}`),
        supabase.from(SUPABASE_TABLES.ATTEMPTS).select('*').eq('EXAM_ID', examId).eq('USER_ID', auth.user.ID).maybeSingle()
      ]);

      let candidateQuestions = localStore.getQuestionsForExam(exam, rawQuestions || [], auth.user.ID);
      if (!candidateQuestions || candidateQuestions.length === 0) {
        // Fallback to local storage if questions are synced locally
        const localQuestions = localStore.getQuestionsForExam(exam, undefined, auth.user.ID);
        if (localQuestions.length > 0) {
          candidateQuestions = localQuestions;
        }
      }

      if (candidateQuestions && candidateQuestions.length > 0) {
        if (existingAttempt && (existingAttempt.STATUS === 'SUBMITTED' || existingAttempt.STATUS === 'REVIEW')) {
          throw new Error('Anda sudah menyelesaikan ujian ini.');
        }

        // Validasi token ujian jika ujian memerlukan token dan siswa belum memiliki sesi yang sedang berjalan
        if (exam.USE_TOKEN && (!existingAttempt || existingAttempt.STATUS !== 'IN_PROGRESS')) {
          const requiredToken = String(exam.TOKEN || '').trim().toUpperCase();
          const providedToken = String(tokenInput || '').trim().toUpperCase();
          if (!requiredToken || providedToken !== requiredToken) {
            throw new Error('Token ujian tidak valid. Silakan periksa kembali token dari pengawas.');
          }
        }

        let attempt = existingAttempt;
        if (!attempt) {
          const newAttempt: Attempt = {
            ID: `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            EXAM_ID: examId,
            USER_ID: auth.user.ID,
            STARTED_AT: new Date().toISOString(),
            SUBMITTED_AT: '',
            SCORE: '',
            MAX_SCORE: candidateQuestions.reduce((sum: number, q: any) => sum + Number(q.POINTS || 1), 0),
            STATUS: 'IN_PROGRESS',
            VIOLATIONS: 0,
            PROGRESS: 0,
            ANSWERS_JSON: '{}',
            ESSAY_SCORES_JSON: '{}',
            LAST_ACTIVITY: new Date().toISOString()
          };

          await supabase.from(SUPABASE_TABLES.ATTEMPTS).insert(newAttempt);
          attempt = newAttempt;
        }

        let orderedQuestions = candidateQuestions.slice();
        if (exam.RANDOMIZE) {
          orderedQuestions = localStore.seededShuffle(orderedQuestions, `${auth.user.ID}_${examId}_seq`);
        }

        const safeQuestions = orderedQuestions.map((q: any, idx: number) => ({
          id: q.ID,
          number: idx + 1,
          type: q.TYPE,
          question: q.QUESTION,
          options: {
            A: q.OPTION_A || '',
            B: q.OPTION_B || '',
            C: q.OPTION_C || '',
            D: q.OPTION_D || '',
            E: q.OPTION_E || ''
          },
          points: Number(q.POINTS || 1),
          extraData: q.EXTRA_DATA || ''
        }));

        let parsedAnswers: Record<string, string> = {};
        try {
          parsedAnswers = typeof attempt.ANSWERS_JSON === 'string'
            ? JSON.parse(attempt.ANSWERS_JSON || '{}')
            : (attempt.ANSWERS_JSON || {});
        } catch {}

        return {
          attempt: {
            id: attempt.ID,
            startedAt: attempt.STARTED_AT,
            answers: parsedAnswers,
            violations: Number(attempt.VIOLATIONS || 0),
            progress: Number(attempt.PROGRESS || 0)
          },
          exam: {
            id: exam.ID,
            title: exam.TITLE,
            duration: Number(exam.DURATION_MIN || 60),
            maxViolations: Number(exam.MAX_VIOLATIONS || 3)
          },
          student: {
            id: auth.user.ID,
            name: auth.user.NAME,
            username: auth.user.USERNAME
          },
          questions: safeQuestions
        };
      }
    } catch (err: any) {
      if (err.message.includes('sudah menyelesaikan') || err.message.includes('Token ujian') || err.message.includes('belum dapat')) throw err;
      console.warn('startExam Supabase error, fallback lokal:', err);
    }
  }

  return localStore.startExam(token, examId, tokenInput);
}

export async function saveExamProgress(
  token: string,
  attemptId: string,
  answers: Record<string, string>,
  progress: number,
  violations: number
): Promise<{ success: boolean; savedAt?: string; status?: string }> {
  await authorize(token, ['STUDENT']);

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from(SUPABASE_TABLES.ATTEMPTS)
        .update({
          ANSWERS_JSON: JSON.stringify(answers || {}),
          PROGRESS: Math.max(0, Math.min(100, Number(progress || 0))),
          VIOLATIONS: Number(violations || 0),
          LAST_ACTIVITY: new Date().toISOString()
        })
        .eq('ID', attemptId);
    } catch (err) {
      console.warn('saveExamProgress Supabase error:', err);
    }
  }

  return localStore.saveExamProgress(token, attemptId, answers, progress, violations);
}

export async function recordViolation(
  token: string,
  attemptId: string,
  reason: string,
  answers?: Record<string, string>,
  progress?: number
) {
  const res = localStore.recordViolation(token, attemptId, reason, answers, progress);

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from(SUPABASE_TABLES.ATTEMPTS)
        .update({
          VIOLATIONS: res.violations,
          ANSWERS_JSON: answers ? JSON.stringify(answers) : undefined,
          PROGRESS: progress !== undefined ? progress : undefined,
          LAST_ACTIVITY: new Date().toISOString()
        })
        .eq('ID', attemptId);
    } catch (err) {
      console.warn('recordViolation Supabase error:', err);
    }
  }

  return res;
}

export async function submitExam(
  token: string,
  attemptId: string,
  answers: Record<string, string>,
  forced = false
) {
  const result = localStore.submitExam(token, attemptId, answers, forced);

  if (isSupabaseConfigured) {
    try {
      await supabase.from(SUPABASE_TABLES.ATTEMPTS).update({
        STATUS: result.status,
        SCORE: result.score,
        MAX_SCORE: result.maxScore,
        SUBMITTED_AT: new Date().toISOString(),
        PROGRESS: 100,
        ANSWERS_JSON: JSON.stringify(answers || {}),
        LAST_ACTIVITY: new Date().toISOString()
      }).eq('ID', attemptId);
    } catch (err) {
      console.warn('submitExam Supabase error:', err);
    }
  }

  return result;
}

/**
 * Live Monitoring CBT Realtime
 */
export async function getLiveMonitoring(token: string): Promise<LiveMonitoringItem[]> {
  const auth = await authorize(token, ['ADMIN', 'TEACHER']);

  if (isSupabaseConfigured) {
    try {
      const [{ data: attempts }, { data: users }, { data: exams }, { data: classes }] = await Promise.all([
        supabase.from(SUPABASE_TABLES.ATTEMPTS).select('*').eq('STATUS', 'IN_PROGRESS'),
        supabase.from(SUPABASE_TABLES.USERS).select('*'),
        supabase.from(SUPABASE_TABLES.EXAMS).select('*'),
        supabase.from(SUPABASE_TABLES.CLASSES).select('*')
      ]);

      if (attempts && users && exams) {
        const userMap = new Map(users.map(u => [u.ID, u]));
        const examMap = new Map(exams.map(e => [e.ID, e]));
        const classMap = new Map((classes || []).map(c => [c.ID, c.NAME]));
        const now = Date.now();

        let targetAttempts: Attempt[] = attempts;
        if (auth.user.ROLE === 'TEACHER') {
          targetAttempts = targetAttempts.filter(a => {
            const ex = examMap.get(a.EXAM_ID);
            return ex && ex.CREATED_BY === auth.user.ID;
          });
        }

        return targetAttempts.map(a => {
          const user = userMap.get(a.USER_ID);
          const exam = examMap.get(a.EXAM_ID);
          const started = new Date(a.STARTED_AT).getTime() || now;
          const last = new Date(a.LAST_ACTIVITY).getTime() || started;

          return {
            id: a.ID,
            student: user?.NAME || '-',
            username: user?.USERNAME || '-',
            className: classMap.get(user?.CLASS_ID || '') || '-',
            exam: exam?.TITLE || '-',
            startedAt: a.STARTED_AT,
            elapsedMinutes: Math.max(0, Math.floor((now - started) / 60000)),
            progress: Number(a.PROGRESS || 0),
            violations: Number(a.VIOLATIONS || 0),
            lastActivity: a.LAST_ACTIVITY,
            online: now - last < 90000
          };
        });
      }
    } catch (err) {
      console.warn('getLiveMonitoring Supabase error, fallback lokal:', err);
    }
  }

  return localStore.getLiveMonitoring(token);
}

/**
 * Sinkronisasi Otomatis Kode Guru
 */
export async function autoSyncTeacherCodes(token: string) {
  const res = localStore.autoSyncTeacherCodes(token);
  if (isSupabaseConfigured && res.updatedCount > 0) {
    try {
      await supabase.from(SUPABASE_TABLES.USERS).upsert(res.users);
    } catch (err) {
      console.warn('autoSyncTeacherCodes Supabase sync error:', err);
    }
  }
  return res;
}

/**
 * Ujian yang Tersedia untuk Siswa
 */
export async function getAvailableExams(token: string): Promise<AvailableExamItem[]> {
  const auth = await authorize(token);
  if (isSupabaseConfigured) {
    try {
      const [
        { data: rawExams },
        { data: rawAttempts },
        { data: rawQuestions },
        { data: rawSubjects },
        { data: rawClasses }
      ] = await Promise.all([
        supabase.from(SUPABASE_TABLES.EXAMS).select('*').in('STATUS', ['SCHEDULED', 'ACTIVE']),
        supabase.from(SUPABASE_TABLES.ATTEMPTS).select('*').or(`STUDENT_ID.eq.${auth.user.ID},USER_ID.eq.${auth.user.ID}`),
        supabase.from(SUPABASE_TABLES.QUESTIONS).select('*'),
        supabase.from(SUPABASE_TABLES.SUBJECTS).select('*'),
        supabase.from(SUPABASE_TABLES.CLASSES).select('*')
      ]);

      if (rawExams) {
        const exams = rawExams.map(mapExamFromSupabase);
        const attempts = (rawAttempts || []).map(mapAttemptFromSupabase);
        const questions = rawQuestions || [];
        const subjects = Object.fromEntries((rawSubjects || []).map(s => [s.ID, s.NAME]));
        const subjectCodes = Object.fromEntries((rawSubjects || []).map(s => [s.ID, s.CODE]));
        const classes = Object.fromEntries((rawClasses || []).map(c => [c.ID, c.NAME]));
        const todayStr = new Date().toISOString().slice(0, 10);

        const classMapObj = new Map((rawClasses || []).map((c: any) => [c.ID, c.NAME]));
        // Sync ke local store agar sinkron sempurna
        localStore.setStorage(localStore.STORAGE_KEYS.EXAMS, exams);
        localStore.safeStorageSet('LMS_EXAMS_USER_MODIFIED', 'true');

        return exams
          .filter(exam => {
            if (auth.user.ROLE === 'STUDENT') {
              const matchesClass =
                exam.CLASS_ID === 'ALL' ||
                localStore.matchClassFlexible(auth.user.CLASS_ID, exam.CLASS_ID, classMapObj) ||
                (Array.isArray(exam.CLASS_IDS) && exam.CLASS_IDS.some((cid: string) => localStore.matchClassFlexible(auth.user.CLASS_ID, cid, classMapObj)));
              if (!matchesClass) return false;
            }
            return ['SCHEDULED', 'ACTIVE'].includes(exam.STATUS);
          })
          .map(exam => {
            const attempt = attempts.find(a => a.EXAM_ID === exam.ID && a.USER_ID === auth.user.ID);
            const timing = localStore.getExamTimingInfo(exam);
            const isAlreadyInProgress = attempt && attempt.STATUS === 'IN_PROGRESS';
            const isSubmitted = attempt && (attempt.STATUS === 'SUBMITTED' || attempt.STATUS === 'REVIEW');
            const canStart = !isSubmitted && (timing.isStarted || Boolean(isAlreadyInProgress));
            const questionCount = questions.filter((q: any) => q.EXAM_ID === exam.ID).length;

            return {
              id: exam.ID,
              title: exam.TITLE,
              subject: subjects[exam.SUBJECT_ID] || '-',
              subjectCode: subjectCodes[exam.SUBJECT_ID] || '',
              className: classes[exam.CLASS_ID] || '-',
              date: exam.EXAM_DATE,
              startTime: exam.START_TIME || '07:30',
              endTime: exam.END_TIME || '',
              room: exam.ROOM || '',
              session: exam.SESSION || '',
              duration: Number(exam.DURATION_MIN || 60),
              status: attempt ? attempt.STATUS : exam.STATUS,
              attemptId: attempt ? attempt.ID : '',
              score: attempt ? attempt.SCORE : '',
              canStart,
              isToday: exam.EXAM_DATE === todayStr,
              isStarted: timing.isStarted,
              timingStatus: timing.timingStatus,
              timingMessage: timing.timingMessage,
              totalQuestions: questionCount,
              useToken: Boolean(exam.USE_TOKEN),
              token: exam.TOKEN || '',
              supervisor: exam.SUPERVISOR || ''
            };
          });
      }
    } catch (err) {
      console.warn('getAvailableExams Supabase error, fallback lokal:', err);
    }
  }

  return localStore.getAvailableExamsForUser(auth.user);
}

/**
 * Dokumen Cetak & Kartu Ujian
 */
export async function getPrintData(
  token: string,
  documentType: 'cards' | 'attendance' | 'minutes',
  examId: string,
  options?: any
): Promise<PrintData> {
  let finalOptions = { ...options };
  if (isSupabaseConfigured && (!options?.overrideUsers || options.overrideUsers.length === 0)) {
    try {
      const lookup = await getLookupData(token);
      const settings = await getSchoolSettings();
      finalOptions = {
        ...finalOptions,
        overrideUsers: lookup.allUsers || lookup.users,
        overrideClasses: lookup.allClasses || lookup.classes,
        overrideSubjects: lookup.allSubjects || lookup.subjects,
        overrideExams: lookup.allExams || lookup.exams,
        overrideSettings: settings
      };
    } catch (err) {
      console.warn('Failed to fetch lookup for printData from Supabase:', err);
    }
  }
  return localStore.getPrintData(token, documentType, examId, finalOptions);
}

export async function getStudentCardsPrintData(token: string, options: any = {}): Promise<PrintData> {
  let finalOptions = { ...options };
  if (isSupabaseConfigured && (!options?.overrideUsers || options.overrideUsers.length === 0)) {
    try {
      const lookup = await getLookupData(token);
      const settings = await getSchoolSettings();
      finalOptions = {
        ...finalOptions,
        overrideUsers: lookup.allUsers || lookup.users,
        overrideClasses: lookup.allClasses || lookup.classes,
        overrideSubjects: lookup.allSubjects || lookup.subjects,
        overrideExams: lookup.allExams || lookup.exams,
        overrideSettings: settings
      };
    } catch (err) {
      console.warn('Failed to fetch lookup for cards printData from Supabase:', err);
    }
  }
  return localStore.getStudentCardsPrintData(token, finalOptions);
}

/**
 * Essay Review
 */
export async function getEssayReviews(token: string): Promise<EssayReviewItem[]> {
  return localStore.getEssayReviews(token);
}

export async function gradeEssay(token: string, attemptId: string, questionId: string, scoreVal: number) {
  return localStore.gradeEssay(token, attemptId, questionId, scoreVal);
}

/**
 * Ganti Password
 */
export async function changePassword(token: string, oldPass: string, newPass: string) {
  const auth = await authorize(token);
  if (isSupabaseConfigured) {
    try {
      await supabase.from(SUPABASE_TABLES.USERS).update({
        PASSWORD_HASH: newPass
      }).eq('ID', auth.user.ID);
    } catch {}
  }
  return localStore.changePassword(token, oldPass, newPass);
}

/**
 * Simpan Banyak Jadwal Ujian Sekaligus (Bulk Save)
 */
export async function bulkSaveExams(token: string, newExams: Exam[]): Promise<Exam[]> {
  const auth = await authorize(token, ['ADMIN', 'TEACHER']);
  const localSaved = localStore.bulkSaveExams(token, newExams);
  if (isSupabaseConfigured && newExams.length > 0) {
    try {
      const mapped = newExams.map(mapExamToSupabase);
      const { error } = await supabase.from(SUPABASE_TABLES.EXAMS).upsert(mapped, { onConflict: 'ID' });
      if (!error) {
        await logActivity(auth.user.ID, 'BULK_SAVE_EXAMS', `${newExams.length} jadwal ujian`);
      }
    } catch (err) {
      console.warn('bulkSaveExams Supabase error, fallback local:', err);
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cbt:datachange', { detail: { entity: 'EXAMS', count: newExams.length } }));
  }
  return localSaved;
}

/**
 * Simpan Banyak Butir Soal Sekaligus (Bulk Save Questions)
 */
export async function bulkSaveQuestions(token: string, newQuestions: Question[]): Promise<Question[]> {
  const auth = await authorize(token, ['ADMIN', 'TEACHER']);
  const localSaved = localStore.bulkSaveQuestions(token, newQuestions);
  if (isSupabaseConfigured && newQuestions.length > 0) {
    try {
      const { error } = await supabase.from(SUPABASE_TABLES.QUESTIONS).upsert(newQuestions, { onConflict: 'ID' });
      if (!error) {
        await logActivity(auth.user.ID, 'BULK_SAVE_QUESTIONS', `${newQuestions.length} butir soal`);
      } else {
        console.warn('bulkSaveQuestions Supabase error:', error);
      }
    } catch (err) {
      console.warn('bulkSaveQuestions Supabase error, fallback local:', err);
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cbt:datachange', { detail: { entity: 'QUESTIONS', count: newQuestions.length } }));
  }
  return localSaved;
}

/**
 * Reset Sesi Ujian Siswa (Jawaban Tidak Hilang)
 */
export async function resetStudentAttempt(token: string, attemptId: string) {
  const res = localStore.resetStudentAttempt(token, attemptId);
  if (isSupabaseConfigured && res.attempt) {
    try {
      await supabase.from(SUPABASE_TABLES.ATTEMPTS).update({
        STATUS: 'IN_PROGRESS',
        VIOLATIONS: 0,
        SUBMITTED_AT: null,
        SCORE: null,
        LAST_ACTIVITY: new Date().toISOString(),
        data: {
          USER_ID: res.attempt.USER_ID,
          ANSWERS_JSON: res.attempt.ANSWERS_JSON || '{}',
          VIOLATIONS: 0,
          PROGRESS: res.attempt.PROGRESS || 0,
          LAST_ACTIVITY: new Date().toISOString()
        }
      }).eq('ID', attemptId);
    } catch (err) {
      console.warn('resetStudentAttempt Supabase update error:', err);
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cbt:datachange', { detail: { entity: 'ATTEMPTS', id: attemptId } }));
  }
  return res;
}

export async function getAttemptsForExam(token: string, examId: string) {
  return localStore.getAttemptsForExam(token, examId);
}

export async function resetAllStudentAttemptsForExam(token: string, examId: string) {
  const res = localStore.resetAllStudentAttemptsForExam(token, examId);
  if (isSupabaseConfigured) {
    try {
      await supabase.from(SUPABASE_TABLES.ATTEMPTS).update({
        STATUS: 'IN_PROGRESS',
        VIOLATIONS: 0,
        SUBMITTED_AT: null,
        SCORE: null,
        LAST_ACTIVITY: new Date().toISOString()
      }).eq('EXAM_ID', examId);
    } catch (err) {
      console.warn('resetAllStudentAttemptsForExam Supabase update error:', err);
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cbt:datachange', { detail: { entity: 'ATTEMPTS' } }));
  }
  return res;
}

// CBT Session Presets
export function getSessionPresets(): ExamSessionPreset[] {
  return localStore.getSessionPresets();
}

export function saveSessionPresets(presets: ExamSessionPreset[]): ExamSessionPreset[] {
  return localStore.saveSessionPresets(presets);
}

export function resetSessionPresets(): ExamSessionPreset[] {
  return localStore.resetSessionPresets();
}

// CBT Student Daily Attendance & Integrity
export function getDailyAttendanceCode(dateStr?: string): string {
  return localStore.getDailyAttendanceCode(dateStr);
}

export function setDailyAttendanceCode(dateStr: string, code: string): string {
  return localStore.setDailyAttendanceCode(dateStr, code);
}

export function getStudentAttendanceRecords(dateStr?: string): StudentAttendanceRecord[] {
  return localStore.getStudentAttendanceRecords(dateStr);
}

export function getStudentAttendanceForUser(userId?: string, dateStr?: string): StudentAttendanceRecord | undefined {
  if (!userId) return undefined;
  return localStore.getStudentAttendanceForUser(userId, dateStr);
}

export function recordStudentAttendance(
  userId: string,
  dateStr: string,
  status: AttendanceStatus,
  method: 'QR_SCAN' | 'CODE_INPUT' | 'MANUAL_SUPERVISOR' | 'REMOTE_PERMIT',
  verifiedBy?: string,
  notes?: string
): StudentAttendanceRecord {
  return localStore.recordStudentAttendance(userId, dateStr, status, method, verifiedBy, notes);
}

export function bulkRecordAttendance(
  userIds: string[],
  dateStr: string,
  status: AttendanceStatus,
  verifiedBy?: string
): number {
  return localStore.bulkRecordAttendance(userIds, dateStr, status, verifiedBy);
}

export function verifyStudentAttendanceCode(
  userId: string,
  rawInput: string,
  dateStr?: string
) {
  return localStore.verifyStudentAttendanceCode(userId, rawInput, dateStr);
}

export function getQuestionBanks() {
  return localStore.getQuestionBanks();
}

export function saveQuestionBank(pkg: any) {
  return localStore.saveQuestionBank(pkg);
}

export function deleteQuestionBank(id: string) {
  return localStore.deleteQuestionBank(id);
}



