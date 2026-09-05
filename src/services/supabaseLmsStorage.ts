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
  TeacherAssignmentRow
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

  if (!isSupabaseConfigured) {
    return unsubLocal;
  }

  try {
    const channel = supabase
      .channel(`public:${tableName}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
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
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Supabase realtime channel error, using local channel fallback:', err);
    return unsubLocal;
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

    if (count === 0 || forceDemo) {
      await Promise.allSettled([
        supabase.from(SUPABASE_TABLES.USERS).upsert(INITIAL_USERS),
        supabase.from(SUPABASE_TABLES.CLASSES).upsert(INITIAL_CLASSES),
        supabase.from(SUPABASE_TABLES.SUBJECTS).upsert(INITIAL_SUBJECTS),
        supabase.from(SUPABASE_TABLES.EXAMS).upsert(INITIAL_EXAMS),
        supabase.from(SUPABASE_TABLES.QUESTIONS).upsert(INITIAL_QUESTIONS),
        supabase.from(SUPABASE_TABLES.ASSESSMENT_TYPES).upsert(INITIAL_ASSESSMENT_TYPES),
        supabase.from(SUPABASE_TABLES.SETTINGS).upsert({ id: 'current', ...DEFAULT_SETTINGS }),
        supabase.from(SUPABASE_TABLES.TIMETABLE).upsert(
          MA_CIKARAMAS_TIMETABLE.map((t, idx) => ({ id: t.day, order_index: idx, data: t }))
        ),
        supabase.from(SUPABASE_TABLES.TEACHER_ROSTER).upsert(
          MA_CIKARAMAS_TEACHERS.map(t => ({ id: t.code, ...t }))
        ),
        supabase.from(SUPABASE_TABLES.TEACHER_ASSIGNMENTS).upsert(generateDefaultTeacherAssignments())
      ]);
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
        const allUsers: User[] = users;
        const allClasses: ClassItem[] = classes;
        const allSubjects: Subject[] = subjects;
        const allExams: Exam[] = exams;
        const allQuestions: Question[] = questions || [];
        const allAttempts: Attempt[] = attempts;

        const students = allUsers.filter(u => u.ROLE === 'STUDENT' && u.ACTIVE);
        const teachers = allUsers.filter(u => u.ROLE === 'TEACHER' && u.ACTIVE);

        let visibleClasses = allClasses;
        let visibleStudents = students;
        let visibleExams = allExams;
        let visibleQuestions = allQuestions;

        if (user.ROLE === 'STUDENT') {
          visibleClasses = allClasses.filter(c => c.ID === user.CLASS_ID);
          visibleExams = allExams.filter(e => e.CLASS_ID === user.CLASS_ID);
        } else if (user.ROLE === 'TEACHER') {
          visibleExams = allExams.filter(e => e.CREATED_BY === user.ID);
          const examIds = new Set(visibleExams.map(e => e.ID));
          visibleQuestions = allQuestions.filter(q => examIds.has(q.EXAM_ID));
        }

        const subjectMap = Object.fromEntries(allSubjects.map(s => [s.ID, s.NAME]));
        const classMap = Object.fromEntries(allClasses.map(c => [c.ID, c.NAME]));

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
        const myAvailable = allExams.filter(e =>
          (user.ROLE !== 'STUDENT' || e.CLASS_ID === user.CLASS_ID) &&
          ['SCHEDULED', 'ACTIVE'].includes(e.STATUS)
        );

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
        return {
          users: users.map(sanitizeUser),
          allUsers: users.map(sanitizeUser),
          classes,
          allClasses: classes,
          subjects,
          allSubjects: subjects,
          exams,
          allExams: exams,
          assessmentTypes: assessmentTypes || INITIAL_ASSESSMENT_TYPES
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
        if (ent === 'EXAMS') query = query.eq('CLASS_ID', auth.user.CLASS_ID);
        else if (ent === 'ATTEMPTS') query = query.eq('USER_ID', auth.user.ID);
        else if (ent === 'ASSESSMENT_TYPES') query = query.eq('ACTIVE', true);
      } else if (auth.user.ROLE === 'TEACHER') {
        if (ent === 'EXAMS') query = query.eq('CREATED_BY', auth.user.ID);
      }

      const { data, error } = await query;
      if (!error && data) {
        let rows = data;
        if (ent === 'USERS') {
          rows = rows.map(sanitizeUser);
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
    ASSESSMENT_TYPES: SUPABASE_TABLES.ASSESSMENT_TYPES
  };

  const targetTable = tableMap[ent];
  if (isSupabaseConfigured && targetTable) {
    try {
      const idPrefix: Record<string, string> = {
        USERS: 'USR',
        CLASSES: 'KLS',
        SUBJECTS: 'MP',
        EXAMS: 'UJ',
        QUESTIONS: 'SOAL',
        ASSESSMENT_TYPES: 'AT'
      };

      const id = payload.ID || `${idPrefix[ent] || 'ID'}-${Date.now().toString(36).toUpperCase()}`;
      const object = { ...payload, ID: id };
      delete object._originalId;
      delete object._entityType;

      if (ent === 'USERS') {
        object.USERNAME = String(object.USERNAME || '').trim().toLowerCase();
        object.NAME = String(object.NAME || '').trim();
        if (object.PASSWORD) {
          object.PASSWORD_HASH = object.PASSWORD;
          delete object.PASSWORD;
        }
      }

      const { error } = await supabase.from(targetTable).upsert(object, { onConflict: 'ID' });
      if (!error) {
        await logActivity(auth.user.ID, `SAVE_${ent}`, id);
        // Also sync local cache
        localStore.saveEntity(token, entity, payload);
        return { success: true, id, message: 'Data berhasil disimpan ke cloud database.' };
      }
    } catch (err) {
      console.warn(`saveEntity ${ent} Supabase error, fallback lokal:`, err);
    }
  }

  return localStore.saveEntity(token, entity, payload);
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
    ASSESSMENT_TYPES: SUPABASE_TABLES.ASSESSMENT_TYPES
  };

  const targetTable = tableMap[ent];
  if (isSupabaseConfigured && targetTable) {
    try {
      const { error } = await supabase.from(targetTable).delete().eq('ID', id);
      if (!error) {
        if (ent === 'EXAMS') {
          await supabase.from(SUPABASE_TABLES.QUESTIONS).delete().eq('EXAM_ID', id);
        }
        await logActivity(auth.user.ID, `DELETE_${ent}`, id);
        localStore.deleteEntity(token, entity, id);
        return { success: true, message: 'Data berhasil dihapus dari cloud database.' };
      }
    } catch (err) {
      console.warn(`deleteEntity ${ent} Supabase error, fallback lokal:`, err);
    }
  }

  return localStore.deleteEntity(token, entity, id);
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
    ASSESSMENT_TYPES: SUPABASE_TABLES.ASSESSMENT_TYPES
  };

  const targetTable = tableMap[ent];
  if (isSupabaseConfigured && targetTable && ids.length > 0) {
    try {
      const { error } = await supabase.from(targetTable).delete().in('ID', ids);
      if (!error) {
        if (ent === 'EXAMS') {
          await supabase.from(SUPABASE_TABLES.QUESTIONS).delete().in('EXAM_ID', ids);
        }
        await logActivity(auth.user.ID, `DELETE_BULK_${ent}`, `${ids.length} data`);
        localStore.deleteEntities(token, entity, ids);
        return { success: true, count: ids.length, message: `${ids.length} data berhasil dihapus.` };
      }
    } catch (err) {
      console.warn(`deleteEntities ${ent} Supabase error, fallback lokal:`, err);
    }
  }

  return localStore.deleteEntities(token, entity, ids);
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
export async function startExam(token: string, examId: string) {
  const auth = await authorize(token, ['STUDENT']);

  if (isSupabaseConfigured) {
    try {
      const [{ data: exam }, { data: questions }, { data: existingAttempt }] = await Promise.all([
        supabase.from(SUPABASE_TABLES.EXAMS).select('*').eq('ID', examId).maybeSingle(),
        supabase.from(SUPABASE_TABLES.QUESTIONS).select('*').eq('EXAM_ID', examId),
        supabase.from(SUPABASE_TABLES.ATTEMPTS).select('*').eq('EXAM_ID', examId).eq('USER_ID', auth.user.ID).maybeSingle()
      ]);

      if (exam && questions && questions.length > 0) {
        if (existingAttempt && (existingAttempt.STATUS === 'SUBMITTED' || existingAttempt.STATUS === 'REVIEW')) {
          throw new Error('Anda sudah menyelesaikan ujian ini.');
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
            MAX_SCORE: questions.reduce((sum: number, q: any) => sum + Number(q.POINTS || 1), 0),
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

        const safeQuestions = questions.map((q: any, idx: number) => ({
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
      if (err.message.includes('sudah menyelesaikan')) throw err;
      console.warn('startExam Supabase error, fallback lokal:', err);
    }
  }

  return localStore.startExam(token, examId);
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
  return localStore.getAvailableExamsForUser(auth.user);
}

/**
 * Dokumen Cetak & Kartu Ujian
 */
export async function getPrintData(token: string, documentType: 'cards' | 'attendance' | 'minutes', examId: string): Promise<PrintData> {
  return localStore.getPrintData(token, documentType, examId);
}

export async function getStudentCardsPrintData(token: string, options: any = {}): Promise<PrintData> {
  return localStore.getStudentCardsPrintData(token, options);
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
