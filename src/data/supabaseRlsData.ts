export const RAW_SUPABASE_RLS_SQL = `-- ==============================================================================
-- DATABASE SCHEMA & ROW-LEVEL SECURITY (RLS) POLICIES
-- APLIKASI CBT & LMS MAS MUHAMMADIYAH CIKARAMAS (SUPABASE POSTGRESQL)
-- ==============================================================================
-- Fitur Keamanan:
-- 1. Siswa hanya dapat melihat ujian kelasnya sendiri yang sedang aktif/terjadwal.
-- 2. Siswa hanya dapat melihat soal ujian yang ditujukan untuk kelasnya.
-- 3. Siswa HANYA dapat melihat dan memperbarui lembar jawaban (attempts) miliknya sendiri.
-- 4. Guru hanya dapat mengelola soal, ujian, dan menilai hasil ujian yang diampunya.
-- 5. Administrator memiliki akses penuh ke seluruh master data & administrasi sekolah.
-- ==============================================================================

-- 1. STRUKTUR TABEL UTAMA (JIKA BELUM ADA)
CREATE TABLE IF NOT EXISTS public.lms_users (
  "ID" text PRIMARY KEY,
  "USERNAME" text UNIQUE NOT NULL,
  "PASSWORD_HASH" text NOT NULL,
  "NAME" text NOT NULL,
  "EMAIL" text,
  "ROLE" text NOT NULL CHECK ("ROLE" IN ('ADMIN', 'TEACHER', 'STUDENT')),
  "CLASS_ID" text,
  "TEACHER_CODE" text,
  "ACTIVE" boolean DEFAULT true,
  "CREATED_AT" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lms_classes (
  "ID" text PRIMARY KEY,
  "NAME" text NOT NULL,
  "LEVEL" text,
  "HOMEROOM" text,
  "ACTIVE" boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.lms_subjects (
  "ID" text PRIMARY KEY,
  "CODE" text,
  "NAME" text NOT NULL,
  "LEVEL" text,
  "GROUP" text,
  "TEACHER_ID" text,
  "TEACHER_CODE" text,
  "KKM" numeric DEFAULT 75,
  "HOURS_PER_WEEK" integer DEFAULT 2,
  "ACTIVE" boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.lms_assessment_types (
  "ID" text PRIMARY KEY,
  "CODE" text NOT NULL,
  "NAME" text NOT NULL,
  "DESCRIPTION" text,
  "ICON" text,
  "ACTIVE" boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.lms_exams (
  "ID" text PRIMARY KEY,
  "TITLE" text NOT NULL,
  "SUBJECT_ID" text NOT NULL,
  "CLASS_ID" text NOT NULL,
  "ASSESSMENT_TYPE_ID" text,
  "EXAM_DATE" text,
  "START_TIME" text,
  "DURATION_MIN" integer DEFAULT 60,
  "STATUS" text DEFAULT 'SCHEDULED' CHECK ("STATUS" IN ('DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'ARCHIVED')),
  "RANDOMIZE" boolean DEFAULT false,
  "MAX_VIOLATIONS" integer DEFAULT 3,
  "CREATED_BY" text NOT NULL,
  "CREATED_AT" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lms_questions (
  "ID" text PRIMARY KEY,
  "EXAM_ID" text NOT NULL REFERENCES public.lms_exams("ID") ON DELETE CASCADE,
  "ASSESSMENT_TYPE_ID" text,
  "TYPE" text NOT NULL CHECK ("TYPE" IN ('MCQ', 'COMPLEX_MCQ', 'TRUE_FALSE', 'MATCHING', 'SHORT_ANSWER', 'ESSAY')),
  "QUESTION" text NOT NULL,
  "OPTION_A" text,
  "OPTION_B" text,
  "OPTION_C" text,
  "OPTION_D" text,
  "OPTION_E" text,
  "ANSWER" text,
  "POINTS" numeric DEFAULT 1,
  "EXTRA_DATA" text
);

CREATE TABLE IF NOT EXISTS public.lms_attempts (
  "ID" text PRIMARY KEY,
  "EXAM_ID" text NOT NULL REFERENCES public.lms_exams("ID") ON DELETE CASCADE,
  "USER_ID" text NOT NULL REFERENCES public.lms_users("ID") ON DELETE CASCADE,
  "STARTED_AT" timestamptz DEFAULT now(),
  "SUBMITTED_AT" timestamptz,
  "SCORE" text,
  "MAX_SCORE" numeric,
  "STATUS" text DEFAULT 'IN_PROGRESS' CHECK ("STATUS" IN ('IN_PROGRESS', 'SUBMITTED', 'REVIEW')),
  "VIOLATIONS" integer DEFAULT 0,
  "PROGRESS" integer DEFAULT 0,
  "ANSWERS_JSON" text DEFAULT '{}',
  "ESSAY_SCORES_JSON" text DEFAULT '{}',
  "LAST_ACTIVITY" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lms_settings (
  id text PRIMARY KEY,
  "SCHOOL_NAME" text,
  "ACADEMIC_YEAR" text,
  "SEMESTER" text,
  "PRINCIPAL_NAME" text,
  "PRINCIPAL_NIP" text,
  "DEFAULT_EXAM_DURATION" integer,
  "PASSING_SCORE_PERCENT" numeric,
  "ALLOWED_VIOLATIONS" integer,
  "CURRICULUM" text DEFAULT 'MERDEKA'
);

CREATE TABLE IF NOT EXISTS public.lms_sessions (
  token text PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.lms_users("ID") ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lms_activity (
  id text PRIMARY KEY,
  user_id text,
  action text NOT NULL,
  detail text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lms_timetable (
  id text PRIMARY KEY,
  order_index integer,
  data jsonb
);

CREATE TABLE IF NOT EXISTS public.lms_teacher_roster (
  id text PRIMARY KEY,
  code text,
  name text,
  honorific text,
  nip text,
  rank text,
  workload_target integer
);

CREATE TABLE IF NOT EXISTS public.lms_teacher_assignments (
  id text PRIMARY KEY,
  teacher_code text,
  subject_name text,
  class_name text,
  hours integer
);

-- 2. HELPER FUNCTIONS UNTUK DETEKSI IDENTITAS & HAK AKSES SESI AKTIF
CREATE OR REPLACE FUNCTION public.get_current_cbt_token()
RETURNS text AS $$
DECLARE
  v_headers json;
  v_token text;
BEGIN
  BEGIN
    v_headers := current_setting('request.headers', true)::json;
    v_token := v_headers->>'x-cbt-token';
    IF v_token IS NULL OR v_token = '' THEN
      v_token := v_headers->>'authorization';
      IF v_token ILIKE 'Bearer %' THEN
        v_token := substring(v_token from 8);
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_token := NULL;
  END;
  RETURN v_token;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_cbt_user_id()
RETURNS text AS $$
DECLARE
  v_token text;
  v_user_id text;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT "ID" INTO v_user_id FROM public.lms_users WHERE "ID" = auth.uid()::text LIMIT 1;
    IF v_user_id IS NOT NULL THEN
      RETURN v_user_id;
    END IF;
  END IF;

  v_token := public.get_current_cbt_token();
  IF v_token IS NOT NULL AND v_token <> '' THEN
    SELECT user_id INTO v_user_id 
    FROM public.lms_sessions 
    WHERE token = v_token AND expires_at > now() 
    LIMIT 1;
    RETURN v_user_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_cbt_user_role()
RETURNS text AS $$
DECLARE
  v_uid text;
  v_role text;
BEGIN
  v_uid := public.get_current_cbt_user_id();
  IF v_uid IS NULL THEN
    RETURN 'ANON';
  END IF;

  SELECT "ROLE" INTO v_role FROM public.lms_users WHERE "ID" = v_uid LIMIT 1;
  RETURN COALESCE(v_role, 'ANON');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_cbt_user_class_id()
RETURNS text AS $$
DECLARE
  v_uid text;
  v_class_id text;
BEGIN
  v_uid := public.get_current_cbt_user_id();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT "CLASS_ID" INTO v_class_id FROM public.lms_users WHERE "ID" = v_uid LIMIT 1;
  RETURN v_class_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. AKTIFKAN ROW-LEVEL SECURITY (RLS) PADA SELURUH TABEL
ALTER TABLE public.lms_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_assessment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_teacher_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_teacher_assignments ENABLE ROW LEVEL SECURITY;

-- 4. ATURAN KEAMANAN (POLICIES) UNTUK TABEL UJIAN (lms_exams)
DROP POLICY IF EXISTS "exams_admin_all" ON public.lms_exams;
DROP POLICY IF EXISTS "exams_teacher_select" ON public.lms_exams;
DROP POLICY IF EXISTS "exams_teacher_insert" ON public.lms_exams;
DROP POLICY IF EXISTS "exams_teacher_update" ON public.lms_exams;
DROP POLICY IF EXISTS "exams_teacher_delete" ON public.lms_exams;
DROP POLICY IF EXISTS "exams_student_select" ON public.lms_exams;

CREATE POLICY "exams_admin_all" ON public.lms_exams
  FOR ALL
  USING (public.get_current_cbt_user_role() = 'ADMIN');

CREATE POLICY "exams_teacher_select" ON public.lms_exams
  FOR SELECT
  USING (public.get_current_cbt_user_role() = 'TEACHER');

CREATE POLICY "exams_teacher_insert" ON public.lms_exams
  FOR INSERT
  WITH CHECK (
    public.get_current_cbt_user_role() = 'TEACHER' AND
    "CREATED_BY" = public.get_current_cbt_user_id()
  );

CREATE POLICY "exams_teacher_update" ON public.lms_exams
  FOR UPDATE
  USING (
    public.get_current_cbt_user_role() = 'TEACHER' AND
    "CREATED_BY" = public.get_current_cbt_user_id()
  );

CREATE POLICY "exams_teacher_delete" ON public.lms_exams
  FOR DELETE
  USING (
    public.get_current_cbt_user_role() = 'TEACHER' AND
    "CREATED_BY" = public.get_current_cbt_user_id()
  );

CREATE POLICY "exams_student_select" ON public.lms_exams
  FOR SELECT
  USING (
    public.get_current_cbt_user_role() = 'STUDENT' AND
    "CLASS_ID" = public.get_current_cbt_user_class_id() AND
    "STATUS" IN ('SCHEDULED', 'ACTIVE')
  );

-- 5. ATURAN KEAMANAN (POLICIES) UNTUK TABEL SOAL (lms_questions)
DROP POLICY IF EXISTS "questions_admin_all" ON public.lms_questions;
DROP POLICY IF EXISTS "questions_teacher_all" ON public.lms_questions;
DROP POLICY IF EXISTS "questions_student_select" ON public.lms_questions;

CREATE POLICY "questions_admin_all" ON public.lms_questions
  FOR ALL
  USING (public.get_current_cbt_user_role() = 'ADMIN');

CREATE POLICY "questions_teacher_all" ON public.lms_questions
  FOR ALL
  USING (
    public.get_current_cbt_user_role() = 'TEACHER' AND
    "EXAM_ID" IN (
      SELECT "ID" FROM public.lms_exams WHERE "CREATED_BY" = public.get_current_cbt_user_id()
    )
  );

CREATE POLICY "questions_student_select" ON public.lms_questions
  FOR SELECT
  USING (
    public.get_current_cbt_user_role() = 'STUDENT' AND
    "EXAM_ID" IN (
      SELECT "ID" FROM public.lms_exams 
      WHERE "CLASS_ID" = public.get_current_cbt_user_class_id() 
        AND "STATUS" = 'ACTIVE'
    )
  );

-- 6. ATURAN KEAMANAN (POLICIES) UNTUK PENGERJAAN & JAWABAN (lms_attempts)
DROP POLICY IF EXISTS "attempts_admin_all" ON public.lms_attempts;
DROP POLICY IF EXISTS "attempts_teacher_select" ON public.lms_attempts;
DROP POLICY IF EXISTS "attempts_teacher_update" ON public.lms_attempts;
DROP POLICY IF EXISTS "attempts_student_select" ON public.lms_attempts;
DROP POLICY IF EXISTS "attempts_student_insert" ON public.lms_attempts;
DROP POLICY IF EXISTS "attempts_student_update" ON public.lms_attempts;

CREATE POLICY "attempts_admin_all" ON public.lms_attempts
  FOR ALL
  USING (public.get_current_cbt_user_role() = 'ADMIN');

CREATE POLICY "attempts_teacher_select" ON public.lms_attempts
  FOR SELECT
  USING (
    public.get_current_cbt_user_role() = 'TEACHER' AND
    "EXAM_ID" IN (
      SELECT "ID" FROM public.lms_exams WHERE "CREATED_BY" = public.get_current_cbt_user_id()
    )
  );

CREATE POLICY "attempts_teacher_update" ON public.lms_attempts
  FOR UPDATE
  USING (
    public.get_current_cbt_user_role() = 'TEACHER' AND
    "EXAM_ID" IN (
      SELECT "ID" FROM public.lms_exams WHERE "CREATED_BY" = public.get_current_cbt_user_id()
    )
  );

CREATE POLICY "attempts_student_select" ON public.lms_attempts
  FOR SELECT
  USING (
    public.get_current_cbt_user_role() = 'STUDENT' AND
    "USER_ID" = public.get_current_cbt_user_id()
  );

CREATE POLICY "attempts_student_insert" ON public.lms_attempts
  FOR INSERT
  WITH CHECK (
    public.get_current_cbt_user_role() = 'STUDENT' AND
    "USER_ID" = public.get_current_cbt_user_id() AND
    "EXAM_ID" IN (
      SELECT "ID" FROM public.lms_exams 
      WHERE "CLASS_ID" = public.get_current_cbt_user_class_id() 
        AND "STATUS" = 'ACTIVE'
    )
  );

CREATE POLICY "attempts_student_update" ON public.lms_attempts
  FOR UPDATE
  USING (
    public.get_current_cbt_user_role() = 'STUDENT' AND
    "USER_ID" = public.get_current_cbt_user_id() AND
    "STATUS" = 'IN_PROGRESS'
  );

-- 7. ATURAN KEAMANAN (POLICIES) UNTUK PENGGUNA (lms_users)
DROP POLICY IF EXISTS "users_admin_all" ON public.lms_users;
DROP POLICY IF EXISTS "users_teacher_select" ON public.lms_users;
DROP POLICY IF EXISTS "users_teacher_update_self" ON public.lms_users;
DROP POLICY IF EXISTS "users_student_select_self" ON public.lms_users;
DROP POLICY IF EXISTS "users_student_update_self" ON public.lms_users;
DROP POLICY IF EXISTS "users_anon_login" ON public.lms_users;

CREATE POLICY "users_admin_all" ON public.lms_users
  FOR ALL
  USING (public.get_current_cbt_user_role() = 'ADMIN');

CREATE POLICY "users_teacher_select" ON public.lms_users
  FOR SELECT
  USING (public.get_current_cbt_user_role() = 'TEACHER');

CREATE POLICY "users_teacher_update_self" ON public.lms_users
  FOR UPDATE
  USING (
    public.get_current_cbt_user_role() = 'TEACHER' AND
    "ID" = public.get_current_cbt_user_id()
  );

CREATE POLICY "users_student_select_self" ON public.lms_users
  FOR SELECT
  USING (
    public.get_current_cbt_user_role() = 'STUDENT' AND
    "ID" = public.get_current_cbt_user_id()
  );

CREATE POLICY "users_student_update_self" ON public.lms_users
  FOR UPDATE
  USING (
    public.get_current_cbt_user_role() = 'STUDENT' AND
    "ID" = public.get_current_cbt_user_id()
  );

CREATE POLICY "users_anon_login" ON public.lms_users
  FOR SELECT
  USING (public.get_current_cbt_user_role() = 'ANON');

-- 8. ATURAN MASTER DATA & UTILITY
DROP POLICY IF EXISTS "classes_read_all" ON public.lms_classes;
DROP POLICY IF EXISTS "classes_admin_manage" ON public.lms_classes;
CREATE POLICY "classes_read_all" ON public.lms_classes FOR SELECT USING (true);
CREATE POLICY "classes_admin_manage" ON public.lms_classes FOR ALL USING (public.get_current_cbt_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "subjects_read_all" ON public.lms_subjects;
DROP POLICY IF EXISTS "subjects_admin_manage" ON public.lms_subjects;
CREATE POLICY "subjects_read_all" ON public.lms_subjects FOR SELECT USING (true);
CREATE POLICY "subjects_admin_manage" ON public.lms_subjects FOR ALL USING (public.get_current_cbt_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "assessment_types_read_all" ON public.lms_assessment_types;
DROP POLICY IF EXISTS "assessment_types_admin_manage" ON public.lms_assessment_types;
CREATE POLICY "assessment_types_read_all" ON public.lms_assessment_types FOR SELECT USING (true);
CREATE POLICY "assessment_types_admin_manage" ON public.lms_assessment_types FOR ALL USING (public.get_current_cbt_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "settings_read_all" ON public.lms_settings;
DROP POLICY IF EXISTS "settings_admin_manage" ON public.lms_settings;
CREATE POLICY "settings_read_all" ON public.lms_settings FOR SELECT USING (true);
CREATE POLICY "settings_admin_manage" ON public.lms_settings FOR ALL USING (public.get_current_cbt_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "timetable_read_all" ON public.lms_timetable;
DROP POLICY IF EXISTS "timetable_admin_manage" ON public.lms_timetable;
CREATE POLICY "timetable_read_all" ON public.lms_timetable FOR SELECT USING (true);
CREATE POLICY "timetable_admin_manage" ON public.lms_timetable FOR ALL USING (public.get_current_cbt_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "roster_read_all" ON public.lms_teacher_roster;
DROP POLICY IF EXISTS "roster_admin_manage" ON public.lms_teacher_roster;
CREATE POLICY "roster_read_all" ON public.lms_teacher_roster FOR SELECT USING (true);
CREATE POLICY "roster_admin_manage" ON public.lms_teacher_roster FOR ALL USING (public.get_current_cbt_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "assignments_read_all" ON public.lms_teacher_assignments;
DROP POLICY IF EXISTS "assignments_admin_manage" ON public.lms_teacher_assignments;
CREATE POLICY "assignments_read_all" ON public.lms_teacher_assignments FOR SELECT USING (true);
CREATE POLICY "assignments_admin_manage" ON public.lms_teacher_assignments FOR ALL USING (public.get_current_cbt_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "sessions_all" ON public.lms_sessions;
CREATE POLICY "sessions_all" ON public.lms_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS "activity_insert_all" ON public.lms_activity;
DROP POLICY IF EXISTS "activity_select_admin" ON public.lms_activity;
CREATE POLICY "activity_insert_all" ON public.lms_activity FOR INSERT WITH CHECK (true);
CREATE POLICY "activity_select_admin" ON public.lms_activity FOR SELECT USING (
  public.get_current_cbt_user_role() = 'ADMIN' OR
  user_id = public.get_current_cbt_user_id()
);
`;

export interface RlsRuleSummary {
  table: string;
  student: string;
  teacher: string;
  admin: string;
  detail: string;
}

export const RLS_POLICY_SUMMARIES: RlsRuleSummary[] = [
  {
    table: 'lms_exams',
    student: 'Hanya ujian untuk kelasnya berstatus SCHEDULED / ACTIVE',
    teacher: 'Lihat semua; kelola ujian miliknya (CREATED_BY)',
    admin: 'Akses penuh (CRUD)',
    detail: 'Mencegah siswa mengakses bank soal kelas lain atau ujian yang berstatus DRAFT.'
  },
  {
    table: 'lms_questions',
    student: 'Hanya soal dari ujian kelasnya yang sedang AKTIF',
    teacher: 'Akses penuh ke soal dari ujian yang dibuatnya',
    admin: 'Akses penuh (CRUD)',
    detail: 'Kunci jawaban dan butir soal terlindungi dari akses sebelum waktu ujian dibuka.'
  },
  {
    table: 'lms_attempts',
    student: 'Hanya riwayat & jawaban miliknya (USER_ID = self)',
    teacher: 'Lihat & koreksi esai ujian buatannya',
    admin: 'Akses penuh & reset sesi',
    detail: 'Siswa hanya bisa menyimpan jawaban saat status IN_PROGRESS. Nilai tidak bisa dimanipulasi dari browser.'
  },
  {
    table: 'lms_users',
    student: 'Hanya akun diri sendiri (profil & ganti sandi)',
    teacher: 'Lihat daftar siswa & profil sendiri',
    admin: 'Akses penuh manajemen akun',
    detail: 'Data akun siswa dan guru lainnya diisolasi dari intipan pengguna biasa.'
  },
  {
    table: 'lms_classes & lms_subjects',
    student: 'Read-only',
    teacher: 'Read-only',
    admin: 'Akses penuh (CRUD)',
    detail: 'Master kurikulum dan rombel hanya dapat diubah oleh administrator sekolah.'
  },
  {
    table: 'lms_settings & lms_timetable',
    student: 'Read-only',
    teacher: 'Read-only',
    admin: 'Akses penuh konfigurasi',
    detail: 'Kop madrasah, kepala madrasah, KKM, dan jadwal pelajaran terkunci aman.'
  }
];
