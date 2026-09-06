import { Attempt, ClassItem, Exam, Question, SchoolSettings, Subject, User } from '../types';
import { INITIAL_ASSESSMENT_TYPES } from './assessmentData';
import { MA_CIKARAMAS_CLASSES, MA_CIKARAMAS_SUBJECTS, MA_CIKARAMAS_TEACHERS } from './curriculumData';

export { INITIAL_ASSESSMENT_TYPES };

export const DEFAULT_SETTINGS: SchoolSettings = {
  SCHOOL_NAME: 'MA. MUHAMMADIYAH CIKARAMAS',
  SCHOOL_ADDRESS: 'Jl. Cikaramas-Tanjungmedar KM 01 Kecamatan Tanjungmedar',
  SCHOOL_CITY: 'Kabupaten Sumedang',
  SCHOOL_PHONE: '085221402402',
  PRINCIPAL_TITLE: 'Kepala Madrasah',
  PRINCIPAL_NAME: 'Ai Sukaesih, S.Pd',
  PRINCIPAL_NIP: '1281201',
  SCHOOL_YEAR: '2026/2027',
  SEMESTER: '1 (Ganjil)',
  DEFAULT_ASSESSMENT_NAME: 'Sumatif Akhir Semester (SAS)',
  ASSESSMENT_TITLE: 'Sumatif Akhir Semester (SAS)',
  CURRICULUM: 'MERDEKA',
  LOGO_URL: '',
  APP_VERSION: '1.0.4',
  KOP_HEADER_1: 'MAJELIS PENDIDIKAN DASAR DAN MENENGAH',
  KOP_HEADER_2: 'PIMPINAN DAERAH MUHAMMADIYAH SUMEDANG',
  KOP_NSM: '131.232.110.020',
  KOP_NPSN: '69976352',
  KOP_AKREDITASI: 'Terakreditasi : B (Baik) SKBAN-SM Nomor : 763/BAN-SM/SK/2025',
  KOP_KOTA_KODEPOS: 'Kabupaten Sumedang Kode Pos. 45354',
  KOP_TELEPON: '085221402402',
  KOP_EMAIL: 'aliyah.cikaramas@gmail.com'
};

export const INITIAL_CLASSES: ClassItem[] = MA_CIKARAMAS_CLASSES.map(c => ({
  ID: c.id,
  NAME: c.name,
  LEVEL: c.level,
  HOMEROOM: c.homeroom,
  CURRICULUM: c.curriculum,
  STREAM: c.stream,
  ACTIVE: true
}));

export const TEACHER_ID = 'USR-GURU-T';

export const INITIAL_USERS: User[] = [
  {
    ID: 'USR-ADMIN',
    USERNAME: 'admin',
    NAME: 'Ai Sukaesih, S.Pd',
    EMAIL: 'kepala@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Admin123!',
    ROLE: 'ADMIN',
    CLASS_ID: '',
    TEACHER_CODE: 'A',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  // All 20 Teachers from MA Muhammadiyah Cikaramas
  ...MA_CIKARAMAS_TEACHERS.map(t => ({
    ID: `USR-GURU-${t.code}`,
    USERNAME: t.code === 'T' ? 'guru01' : `guru-${t.code.toLowerCase()}`,
    NAME: t.name,
    EMAIL: `guru.${t.code.toLowerCase()}@masmuhammadiyahcikaramas.sch.id`,
    PASSWORD_HASH: 'Guru123!',
    ROLE: 'TEACHER' as const,
    CLASS_ID: '',
    TEACHER_CODE: t.code,
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  })),
  // Complete Sample Students for all 7 Classes (X.1, X.2, X.3, XI.1, XI.2, XII.1, XII.2)
  // Kelas X.1
  {
    ID: 'USR-SISWA01',
    USERNAME: 'siswa01',
    NAME: 'Ahmad Fauzan',
    EMAIL: 'siswa01@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-X1',
    NIS: '26271001',
    NISN: '0081234501',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  {
    ID: 'USR-SISWA-X1-2',
    USERNAME: 'siswa02',
    NAME: 'Anisa Rahmawati',
    EMAIL: 'siswa02@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-X1',
    NIS: '26271002',
    NISN: '0081234502',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  {
    ID: 'USR-SISWA-X1-3',
    USERNAME: 'siswa03',
    NAME: 'Bayu Pratama',
    EMAIL: 'siswa03@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-X1',
    NIS: '26271003',
    NISN: '0081234503',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  // Kelas X.2
  {
    ID: 'USR-SISWA-X2-1',
    USERNAME: 'siswa04',
    NAME: 'Siti Nurhaliza',
    EMAIL: 'siswa04@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-X2',
    NIS: '26271021',
    NISN: '0081234521',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  {
    ID: 'USR-SISWA-X2-2',
    USERNAME: 'siswa05',
    NAME: 'Rian Hidayat',
    EMAIL: 'siswa05@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-X2',
    NIS: '26271022',
    NISN: '0081234522',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  // Kelas X.3
  {
    ID: 'USR-SISWA-X3-1',
    USERNAME: 'siswa06',
    NAME: 'Ahmad Fauzi Ridwan',
    EMAIL: 'siswa06@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-X3',
    NIS: '26271031',
    NISN: '0081234531',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  {
    ID: 'USR-SISWA-X3-2',
    USERNAME: 'siswa07',
    NAME: 'Bella Safitri',
    EMAIL: 'siswa07@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-X3',
    NIS: '26271032',
    NISN: '0081234532',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  {
    ID: 'USR-SISWA-X3-3',
    USERNAME: 'siswa08',
    NAME: 'Dadan Gunawan',
    EMAIL: 'siswa08@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-X3',
    NIS: '26271033',
    NISN: '0081234533',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  {
    ID: 'USR-SISWA-X3-4',
    USERNAME: 'siswa09',
    NAME: 'Fitri Handayani',
    EMAIL: 'siswa09@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-X3',
    NIS: '26271034',
    NISN: '0081234534',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  {
    ID: 'USR-SISWA-X3-5',
    USERNAME: 'siswa10',
    NAME: 'Hendra Permana',
    EMAIL: 'siswa10@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-X3',
    NIS: '26271035',
    NISN: '0081234535',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  // Kelas XI.1
  {
    ID: 'USR-SISWA-XI1-1',
    USERNAME: 'siswa11',
    NAME: 'Budi Kurniawan',
    EMAIL: 'siswa11@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-XI1',
    NIS: '25261101',
    NISN: '0071234501',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  {
    ID: 'USR-SISWA-XI1-2',
    USERNAME: 'siswa12',
    NAME: 'Citra Kirana',
    EMAIL: 'siswa12@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-XI1',
    NIS: '25261102',
    NISN: '0071234502',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  // Kelas XI.2
  {
    ID: 'USR-SISWA-XI2-1',
    USERNAME: 'siswa13',
    NAME: 'Dimas Anggara',
    EMAIL: 'siswa13@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-XI2',
    NIS: '25261121',
    NISN: '0071234521',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  {
    ID: 'USR-SISWA-XI2-2',
    USERNAME: 'siswa14',
    NAME: 'Eka Wahyuni',
    EMAIL: 'siswa14@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-XI2',
    NIS: '25261122',
    NISN: '0071234522',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  // Kelas XII.1
  {
    ID: 'USR-SISWA-XII1-1',
    USERNAME: 'siswa15',
    NAME: 'Dewi Lestari',
    EMAIL: 'siswa15@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-XII1',
    NIS: '24251201',
    NISN: '0061234501',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  {
    ID: 'USR-SISWA-XII1-2',
    USERNAME: 'siswa16',
    NAME: 'Fahri Hamzah',
    EMAIL: 'siswa16@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-XII1',
    NIS: '24251202',
    NISN: '0061234502',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  // Kelas XII.2
  {
    ID: 'USR-SISWA-XII2-1',
    USERNAME: 'siswa17',
    NAME: 'Gilang Ramadhan',
    EMAIL: 'siswa17@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-XII2',
    NIS: '24251221',
    NISN: '0061234521',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  {
    ID: 'USR-SISWA-XII2-2',
    USERNAME: 'siswa18',
    NAME: 'Hani Puspitasari',
    EMAIL: 'siswa18@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-XII2',
    NIS: '24251222',
    NISN: '0061234522',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  }
];

export const INITIAL_SUBJECTS: Subject[] = MA_CIKARAMAS_SUBJECTS.map(s => ({
  ID: `MP-${s.code}`,
  CODE: s.code,
  NAME: s.name,
  CURRICULUM: 'MERDEKA',
  LEVEL: 'Semua Tingkat',
  GROUP: s.group,
  TEACHER_ID: s.teacherCode === 'KO' ? 'USR-ADMIN' : `USR-GURU-${s.teacherCode}`,
  TEACHER_CODE: s.teacherCode,
  KKM: s.kkm,
  HOURS_PER_WEEK: s.hours,
  ACTIVE: true
}));

const today = new Date();
const formatDateYMD = (d: Date) => d.toISOString().slice(0, 10);

export const INITIAL_EXAMS: Exam[] = [
  {
    ID: 'UJ-001',
    TITLE: 'Bank Soal Fisika X',
    SUBJECT_ID: 'MP-T1',
    CLASS_ID: 'KLS-X1',
    CLASS_IDS: ['KLS-X1'],
    ASSESSMENT_TYPE_ID: 'SAS',
    EXAM_DATE: formatDateYMD(today),
    START_TIME: '07:30',
    END_TIME: '09:00',
    DURATION_MIN: 90,
    STATUS: 'DRAFT',
    RANDOMIZE: true,
    MAX_VIOLATIONS: 3,
    ROOM: 'Laboratorium IPA / Kelas X.1',
    SESSION: 'Sesi 1 (07:30 - 09:00)',
    SUPERVISOR: 'Ipid Abdul Hapid, S.Pd',
    CREATED_BY: 'USR-GURU-T',
    CREATED_AT: new Date().toISOString()
  }
];

export const INITIAL_QUESTIONS: Question[] = [
  {
    ID: 'SOAL-FIS-001',
    EXAM_ID: 'UJ-001',
    BANK_ID: 'UJ-001',
    SUBJECT_ID: 'MP-T1',
    ASSESSMENT_TYPE_ID: 'SAS',
    TYPE: 'MCQ',
    QUESTION: 'Sebuah mobil bergerak lurus dengan kecepatan awal 10 m/s dan mengalami percepatan konstan 2 m/s². Kecepatan mobil tersebut setelah bergerak selama 5 detik adalah ...',
    OPTION_A: '15 m/s',
    OPTION_B: '20 m/s',
    OPTION_C: '25 m/s',
    OPTION_D: '30 m/s',
    OPTION_E: '35 m/s',
    ANSWER: 'B',
    POINTS: 10
  },
  {
    ID: 'SOAL-FIS-002',
    EXAM_ID: 'UJ-001',
    BANK_ID: 'UJ-001',
    SUBJECT_ID: 'MP-T1',
    ASSESSMENT_TYPE_ID: 'SAS',
    TYPE: 'MCQ',
    QUESTION: 'Kelompok besaran di bawah ini yang seluruhnya merupakan besaran pokok dalam Sistem Internasional (SI) adalah ...',
    OPTION_A: 'Panjang, massa, dan waktu',
    OPTION_B: 'Gaya, kecepatan, dan percepatan',
    OPTION_C: 'Massa, berat, dan volume',
    OPTION_D: 'Suhu, kuat arus, dan gaya',
    OPTION_E: 'Waktu, intensitas cahaya, dan usaha',
    ANSWER: 'A',
    POINTS: 10
  },
  {
    ID: 'SOAL-FIS-003',
    EXAM_ID: 'UJ-001',
    BANK_ID: 'UJ-001',
    SUBJECT_ID: 'MP-T1',
    ASSESSMENT_TYPE_ID: 'SAS',
    TYPE: 'MCQ',
    QUESTION: 'Dimensi dari besaran usaha dan energi dalam notasi dimensi besaran pokok adalah ...',
    OPTION_A: '[M][L][T]⁻¹',
    OPTION_B: '[M][L]²[T]⁻¹',
    OPTION_C: '[M][L]²[T]⁻²',
    OPTION_D: '[M][L]⁻¹[T]⁻²',
    OPTION_E: '[M][L]³[T]⁻²',
    ANSWER: 'C',
    POINTS: 10
  },
  {
    ID: 'SOAL-FIS-004',
    EXAM_ID: 'UJ-001',
    BANK_ID: 'UJ-001',
    SUBJECT_ID: 'MP-T1',
    ASSESSMENT_TYPE_ID: 'SAS',
    TYPE: 'MCQ',
    QUESTION: 'Dua buah gaya F1 = 6 N dan F2 = 8 N bekerja pada satu titik tangkap dan saling tegak lurus membentuk sudut 90°. Besar resultan kedua vektor gaya tersebut adalah ...',
    OPTION_A: '2 N',
    OPTION_B: '7 N',
    OPTION_C: '14 N',
    OPTION_D: '10 N',
    OPTION_E: '48 N',
    ANSWER: 'D',
    POINTS: 10
  },
  {
    ID: 'SOAL-FIS-005',
    EXAM_ID: 'UJ-001',
    BANK_ID: 'UJ-001',
    SUBJECT_ID: 'MP-T1',
    ASSESSMENT_TYPE_ID: 'SAS',
    TYPE: 'MCQ',
    QUESTION: 'Sebuah balok bermassa 10 kg ditarik di atas lantai mendatar licin dengan gaya konstan 50 N. Besar percepatan yang dialami balok tersebut adalah ...',
    OPTION_A: '5 m/s²',
    OPTION_B: '0,2 m/s²',
    OPTION_C: '500 m/s²',
    OPTION_D: '40 m/s²',
    OPTION_E: '25 m/s²',
    ANSWER: 'A',
    POINTS: 10
  },
  {
    ID: 'SOAL-FIS-006',
    EXAM_ID: 'UJ-001',
    BANK_ID: 'UJ-001',
    SUBJECT_ID: 'MP-T1',
    ASSESSMENT_TYPE_ID: 'SAS',
    TYPE: 'MCQ',
    QUESTION: 'Sebuah kelapa jatuh bebas dari tangkai pohonnya pada ketinggian 20 meter di atas tanah. Jika percepatan gravitasi bumi g = 10 m/s², kecepatan buah kelapa saat menyentuh tanah adalah ...',
    OPTION_A: '10 m/s',
    OPTION_B: '20 m/s',
    OPTION_C: '30 m/s',
    OPTION_D: '40 m/s',
    OPTION_E: '200 m/s',
    ANSWER: 'B',
    POINTS: 10
  },
  {
    ID: 'SOAL-FIS-007',
    EXAM_ID: 'UJ-001',
    BANK_ID: 'UJ-001',
    SUBJECT_ID: 'MP-T1',
    ASSESSMENT_TYPE_ID: 'SAS',
    TYPE: 'MCQ',
    QUESTION: 'Seorang murid membawa tas ransel seberat 40 N sambil berjalan mendatar sejauh 15 meter menuju kelasnya. Besar usaha fisika yang dilakukan gaya berat tas ransel tersebut adalah ...',
    OPTION_A: '600 Joule',
    OPTION_B: '300 Joule',
    OPTION_C: '0 Joule',
    OPTION_D: '2,67 Joule',
    OPTION_E: '40 Joule',
    ANSWER: 'C',
    POINTS: 10
  },
  {
    ID: 'SOAL-FIS-008',
    EXAM_ID: 'UJ-001',
    BANK_ID: 'UJ-001',
    SUBJECT_ID: 'MP-T1',
    ASSESSMENT_TYPE_ID: 'SAS',
    TYPE: 'MCQ',
    QUESTION: 'Gaya gesek yang bekerja pada suatu benda yang sedang meluncur di atas bidang kasar selalu ...',
    OPTION_A: 'Searah dengan arah perpindahan benda',
    OPTION_B: 'Berlawanan arah dengan arah kecenderungan gerak benda',
    OPTION_C: 'Tegak lurus terhadap permukaan bidang sentuh',
    OPTION_D: 'Sama besar dengan gaya berat benda',
    OPTION_E: 'Bernilai nol jika kecepatan benda konstan',
    ANSWER: 'B',
    POINTS: 10
  },
  {
    ID: 'SOAL-FIS-009',
    EXAM_ID: 'UJ-001',
    BANK_ID: 'UJ-001',
    SUBJECT_ID: 'MP-T1',
    ASSESSMENT_TYPE_ID: 'SAS',
    TYPE: 'MCQ',
    QUESTION: 'Energi potensial gravitasi sebuah benda bermassa 2 kg yang diletakkan di atas lemari setinggi 3 meter dari lantai (g = 10 m/s²) bernilai ...',
    OPTION_A: '6 Joule',
    OPTION_B: '15 Joule',
    OPTION_C: '30 Joule',
    OPTION_D: '60 Joule',
    OPTION_E: '120 Joule',
    ANSWER: 'D',
    POINTS: 10
  },
  {
    ID: 'SOAL-FIS-010',
    EXAM_ID: 'UJ-001',
    BANK_ID: 'UJ-001',
    SUBJECT_ID: 'MP-T1',
    ASSESSMENT_TYPE_ID: 'SAS',
    TYPE: 'MCQ',
    QUESTION: 'Pernyataan berikut yang paling tepat mengenai Hukum Kekekalan Energi Mekanik pada sistem tanpa gesekan udara adalah ...',
    OPTION_A: 'Jumlah energi kinetik dan energi potensial selalu konstan di setiap titik lintasan',
    OPTION_B: 'Energi kinetik benda selalu bertambah seiring bertambahnya ketinggian',
    OPTION_C: 'Energi potensial benda bernilai maksimum ketika benda menyentuh tanah',
    OPTION_D: 'Energi mekanik akan musnah saat benda berhenti bergerak',
    OPTION_E: 'Energi kinetik bernilai nol ketika kecepatan benda maksimum',
    ANSWER: 'A',
    POINTS: 10
  }
];

export const INITIAL_ATTEMPTS: Attempt[] = [
  {
    ID: 'ATT-UJ001-01',
    EXAM_ID: 'UJ-001',
    USER_ID: 'USR-SISWA-X1-1', // Siti Rahmawati
    STARTED_AT: new Date(Date.now() - 3600000).toISOString(),
    SUBMITTED_AT: new Date(Date.now() - 600000).toISOString(),
    SCORE: 90,
    MAX_SCORE: 100,
    STATUS: 'SUBMITTED',
    VIOLATIONS: 0,
    PROGRESS: 100,
    ANSWERS_JSON: JSON.stringify({
      'SOAL-FIS-001': 'B',
      'SOAL-FIS-002': 'A',
      'SOAL-FIS-003': 'C',
      'SOAL-FIS-004': 'D',
      'SOAL-FIS-005': 'A',
      'SOAL-FIS-006': 'B',
      'SOAL-FIS-007': 'C',
      'SOAL-FIS-008': 'A', // salah
      'SOAL-FIS-009': 'D',
      'SOAL-FIS-010': 'A'
    }),
    ESSAY_SCORES_JSON: '{}',
    LAST_ACTIVITY: new Date().toISOString()
  },
  {
    ID: 'ATT-UJ001-02',
    EXAM_ID: 'UJ-001',
    USER_ID: 'USR-SISWA-X1-2', // Muhammad Rizki
    STARTED_AT: new Date(Date.now() - 3500000).toISOString(),
    SUBMITTED_AT: new Date(Date.now() - 700000).toISOString(),
    SCORE: 90,
    MAX_SCORE: 100,
    STATUS: 'SUBMITTED',
    VIOLATIONS: 0,
    PROGRESS: 100,
    ANSWERS_JSON: JSON.stringify({
      'SOAL-FIS-001': 'B',
      'SOAL-FIS-002': 'A',
      'SOAL-FIS-003': 'C',
      'SOAL-FIS-004': 'D',
      'SOAL-FIS-005': 'A',
      'SOAL-FIS-006': 'B',
      'SOAL-FIS-007': 'A', // salah
      'SOAL-FIS-008': 'B',
      'SOAL-FIS-009': 'D',
      'SOAL-FIS-010': 'A'
    }),
    ESSAY_SCORES_JSON: '{}',
    LAST_ACTIVITY: new Date().toISOString()
  },
  {
    ID: 'ATT-UJ001-03',
    EXAM_ID: 'UJ-001',
    USER_ID: 'USR-SISWA-X1-3', // Bayu Pratama
    STARTED_AT: new Date(Date.now() - 3400000).toISOString(),
    SUBMITTED_AT: new Date(Date.now() - 800000).toISOString(),
    SCORE: 80,
    MAX_SCORE: 100,
    STATUS: 'SUBMITTED',
    VIOLATIONS: 0,
    PROGRESS: 100,
    ANSWERS_JSON: JSON.stringify({
      'SOAL-FIS-001': 'B',
      'SOAL-FIS-002': 'A',
      'SOAL-FIS-003': 'C',
      'SOAL-FIS-004': 'D',
      'SOAL-FIS-005': 'A',
      'SOAL-FIS-006': 'B',
      'SOAL-FIS-007': 'C',
      'SOAL-FIS-008': 'C', // salah
      'SOAL-FIS-009': 'D',
      'SOAL-FIS-010': 'B' // salah
    }),
    ESSAY_SCORES_JSON: '{}',
    LAST_ACTIVITY: new Date().toISOString()
  },
  {
    ID: 'ATT-UJ001-04',
    EXAM_ID: 'UJ-001',
    USER_ID: 'USR-SISWA-X2-1', // Siti Nurhaliza
    STARTED_AT: new Date(Date.now() - 3300000).toISOString(),
    SUBMITTED_AT: new Date(Date.now() - 900000).toISOString(),
    SCORE: 80,
    MAX_SCORE: 100,
    STATUS: 'SUBMITTED',
    VIOLATIONS: 0,
    PROGRESS: 100,
    ANSWERS_JSON: JSON.stringify({
      'SOAL-FIS-001': 'B',
      'SOAL-FIS-002': 'A',
      'SOAL-FIS-003': 'C',
      'SOAL-FIS-004': 'D',
      'SOAL-FIS-005': 'C', // salah
      'SOAL-FIS-006': 'B',
      'SOAL-FIS-007': 'A', // salah
      'SOAL-FIS-008': 'B',
      'SOAL-FIS-009': 'D',
      'SOAL-FIS-010': 'A'
    }),
    ESSAY_SCORES_JSON: '{}',
    LAST_ACTIVITY: new Date().toISOString()
  },
  {
    ID: 'ATT-UJ001-05',
    EXAM_ID: 'UJ-001',
    USER_ID: 'USR-SISWA-X2-2', // Rian Hidayat
    STARTED_AT: new Date(Date.now() - 3200000).toISOString(),
    SUBMITTED_AT: new Date(Date.now() - 950000).toISOString(),
    SCORE: 80,
    MAX_SCORE: 100,
    STATUS: 'SUBMITTED',
    VIOLATIONS: 0,
    PROGRESS: 100,
    ANSWERS_JSON: JSON.stringify({
      'SOAL-FIS-001': 'B',
      'SOAL-FIS-002': 'A',
      'SOAL-FIS-003': 'C',
      'SOAL-FIS-004': 'C', // salah
      'SOAL-FIS-005': 'A',
      'SOAL-FIS-006': 'B',
      'SOAL-FIS-007': 'B', // salah
      'SOAL-FIS-008': 'B',
      'SOAL-FIS-009': 'D',
      'SOAL-FIS-010': 'A'
    }),
    ESSAY_SCORES_JSON: '{}',
    LAST_ACTIVITY: new Date().toISOString()
  },
  {
    ID: 'ATT-UJ001-06',
    EXAM_ID: 'UJ-001',
    USER_ID: 'USR-SISWA-X3-1', // Ahmad Fauzi Ridwan
    STARTED_AT: new Date(Date.now() - 3100000).toISOString(),
    SUBMITTED_AT: new Date(Date.now() - 1000000).toISOString(),
    SCORE: 70,
    MAX_SCORE: 100,
    STATUS: 'SUBMITTED',
    VIOLATIONS: 1,
    PROGRESS: 100,
    ANSWERS_JSON: JSON.stringify({
      'SOAL-FIS-001': 'B',
      'SOAL-FIS-002': 'A',
      'SOAL-FIS-003': 'B', // salah
      'SOAL-FIS-004': 'D',
      'SOAL-FIS-005': 'B', // salah
      'SOAL-FIS-006': 'B',
      'SOAL-FIS-007': 'D', // salah
      'SOAL-FIS-008': 'B',
      'SOAL-FIS-009': 'D',
      'SOAL-FIS-010': 'A'
    }),
    ESSAY_SCORES_JSON: '{}',
    LAST_ACTIVITY: new Date().toISOString()
  },
  {
    ID: 'ATT-UJ001-07',
    EXAM_ID: 'UJ-001',
    USER_ID: 'USR-SISWA-X3-2', // Bella Safitri
    STARTED_AT: new Date(Date.now() - 3000000).toISOString(),
    SUBMITTED_AT: new Date(Date.now() - 1100000).toISOString(),
    SCORE: 60,
    MAX_SCORE: 100,
    STATUS: 'SUBMITTED',
    VIOLATIONS: 0,
    PROGRESS: 100,
    ANSWERS_JSON: JSON.stringify({
      'SOAL-FIS-001': 'B',
      'SOAL-FIS-002': 'A',
      'SOAL-FIS-003': 'A', // salah
      'SOAL-FIS-004': 'C', // salah
      'SOAL-FIS-005': 'C', // salah
      'SOAL-FIS-006': 'B',
      'SOAL-FIS-007': 'A', // salah
      'SOAL-FIS-008': 'B',
      'SOAL-FIS-009': 'D',
      'SOAL-FIS-010': 'A'
    }),
    ESSAY_SCORES_JSON: '{}',
    LAST_ACTIVITY: new Date().toISOString()
  },
  {
    ID: 'ATT-UJ001-08',
    EXAM_ID: 'UJ-001',
    USER_ID: 'USR-SISWA-X3-3', // Dadan Gunawan
    STARTED_AT: new Date(Date.now() - 2900000).toISOString(),
    SUBMITTED_AT: new Date(Date.now() - 1200000).toISOString(),
    SCORE: 50,
    MAX_SCORE: 100,
    STATUS: 'SUBMITTED',
    VIOLATIONS: 0,
    PROGRESS: 100,
    ANSWERS_JSON: JSON.stringify({
      'SOAL-FIS-001': 'B',
      'SOAL-FIS-002': 'B', // salah
      'SOAL-FIS-003': 'C',
      'SOAL-FIS-004': 'D',
      'SOAL-FIS-005': 'D', // salah
      'SOAL-FIS-006': 'A', // salah
      'SOAL-FIS-007': 'C',
      'SOAL-FIS-008': 'A', // salah
      'SOAL-FIS-009': 'C', // salah
      'SOAL-FIS-010': 'C' // salah
    }),
    ESSAY_SCORES_JSON: '{}',
    LAST_ACTIVITY: new Date().toISOString()
  },
  {
    ID: 'ATT-UJ001-09',
    EXAM_ID: 'UJ-001',
    USER_ID: 'USR-SISWA-X3-4', // Dewi Lestari
    STARTED_AT: new Date(Date.now() - 2800000).toISOString(),
    SUBMITTED_AT: new Date(Date.now() - 1300000).toISOString(),
    SCORE: 50,
    MAX_SCORE: 100,
    STATUS: 'SUBMITTED',
    VIOLATIONS: 0,
    PROGRESS: 100,
    ANSWERS_JSON: JSON.stringify({
      'SOAL-FIS-001': 'B',
      'SOAL-FIS-002': 'C', // salah
      'SOAL-FIS-003': 'B', // salah
      'SOAL-FIS-004': 'A', // salah
      'SOAL-FIS-005': 'A',
      'SOAL-FIS-006': 'B',
      'SOAL-FIS-007': 'E', // salah
      'SOAL-FIS-008': 'B',
      'SOAL-FIS-009': 'D',
      'SOAL-FIS-010': 'D' // salah
    }),
    ESSAY_SCORES_JSON: '{}',
    LAST_ACTIVITY: new Date().toISOString()
  },
  {
    ID: 'ATT-UJ001-10',
    EXAM_ID: 'UJ-001',
    USER_ID: 'USR-SISWA-XI1-1', // Fajar Nugraha
    STARTED_AT: new Date(Date.now() - 2700000).toISOString(),
    SUBMITTED_AT: new Date(Date.now() - 1400000).toISOString(),
    SCORE: 40,
    MAX_SCORE: 100,
    STATUS: 'SUBMITTED',
    VIOLATIONS: 2,
    PROGRESS: 100,
    ANSWERS_JSON: JSON.stringify({
      'SOAL-FIS-001': 'B',
      'SOAL-FIS-002': 'D', // salah
      'SOAL-FIS-003': 'D', // salah
      'SOAL-FIS-004': 'B', // salah
      'SOAL-FIS-005': 'C', // salah
      'SOAL-FIS-006': 'C', // salah
      'SOAL-FIS-007': 'B', // salah
      'SOAL-FIS-008': 'B',
      'SOAL-FIS-009': 'D',
      'SOAL-FIS-010': 'B' // salah
    }),
    ESSAY_SCORES_JSON: '{}',
    LAST_ACTIVITY: new Date().toISOString()
  },
  {
    ID: 'ATT-UJ001-11',
    EXAM_ID: 'UJ-001',
    USER_ID: 'USR-SISWA-XI1-2', // Gita Permata
    STARTED_AT: new Date(Date.now() - 2600000).toISOString(),
    SUBMITTED_AT: new Date(Date.now() - 1500000).toISOString(),
    SCORE: 40,
    MAX_SCORE: 100,
    STATUS: 'SUBMITTED',
    VIOLATIONS: 0,
    PROGRESS: 100,
    ANSWERS_JSON: JSON.stringify({
      'SOAL-FIS-001': 'B',
      'SOAL-FIS-002': 'A',
      'SOAL-FIS-003': 'E', // salah
      'SOAL-FIS-004': 'C', // salah
      'SOAL-FIS-005': 'E', // salah
      'SOAL-FIS-006': 'D', // salah
      'SOAL-FIS-007': 'D', // salah
      'SOAL-FIS-008': 'D', // salah
      'SOAL-FIS-009': 'B', // salah
      'SOAL-FIS-010': 'A'
    }),
    ESSAY_SCORES_JSON: '{}',
    LAST_ACTIVITY: new Date().toISOString()
  },
  {
    ID: 'ATT-UJ001-12',
    EXAM_ID: 'UJ-001',
    USER_ID: 'USR-SISWA-XII1-1', // Dimas Anggara
    STARTED_AT: new Date(Date.now() - 2500000).toISOString(),
    SUBMITTED_AT: new Date(Date.now() - 1600000).toISOString(),
    SCORE: 30,
    MAX_SCORE: 100,
    STATUS: 'SUBMITTED',
    VIOLATIONS: 0,
    PROGRESS: 100,
    ANSWERS_JSON: JSON.stringify({
      'SOAL-FIS-001': 'A', // salah
      'SOAL-FIS-002': 'B', // salah
      'SOAL-FIS-003': 'A', // salah
      'SOAL-FIS-004': 'D',
      'SOAL-FIS-005': 'B', // salah
      'SOAL-FIS-006': 'C', // salah
      'SOAL-FIS-007': 'A', // salah
      'SOAL-FIS-008': 'C', // salah
      'SOAL-FIS-009': 'D',
      'SOAL-FIS-010': 'E' // salah
    }),
    ESSAY_SCORES_JSON: '{}',
    LAST_ACTIVITY: new Date().toISOString()
  }
];
