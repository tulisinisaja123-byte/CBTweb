import { ClassItem, Exam, Question, SchoolSettings, Subject, User } from '../types';
import { INITIAL_ASSESSMENT_TYPES } from './assessmentData';
import { MA_CIKARAMAS_CLASSES, MA_CIKARAMAS_SUBJECTS, MA_CIKARAMAS_TEACHERS } from './curriculumData';

export { INITIAL_ASSESSMENT_TYPES };

export const DEFAULT_SETTINGS: SchoolSettings = {
  SCHOOL_NAME: 'MA MUHAMMADIYAH CIKARAMAS',
  SCHOOL_ADDRESS: 'Jl. Cikaramas No. 1, Desa Cikaramas, Kec. Tanjungmedar',
  SCHOOL_CITY: 'Kabupaten Sumedang',
  SCHOOL_PHONE: '(0261) 0000000',
  PRINCIPAL_TITLE: 'Kepala Madrasah',
  PRINCIPAL_NAME: 'Ai Sukaesih, S.Pd',
  PRINCIPAL_NIP: '1281201',
  SCHOOL_YEAR: '2026/2027',
  SEMESTER: '1 (Ganjil)',
  CURRICULUM: 'MERDEKA',
  APP_VERSION: '1.0.4'
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
    POINTS: 30
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
    POINTS: 30
  },
  {
    ID: 'SOAL-FIS-003',
    EXAM_ID: 'UJ-001',
    BANK_ID: 'UJ-001',
    SUBJECT_ID: 'MP-T1',
    ASSESSMENT_TYPE_ID: 'SAS',
    TYPE: 'ESSAY',
    QUESTION: 'Jelaskan bunyi Hukum I Newton (Hukum Kelembaman/Inersia) dan berikan satu contoh fenomena dalam kehidupan sehari-hari yang membuktikan hukum tersebut!',
    ANSWER: 'Hukum I Newton menyatakan bahwa jika resultan gaya yang bekerja pada suatu benda sama dengan nol, maka benda yang mula-mula diam akan tetap diam, dan benda yang bergerak lurus beraturan akan tetap bergerak lurus beraturan. Contoh fenomena: saat kita menumpang mobil yang tiba-tiba direm mendadak, badan kita terdorong ke depan karena sifat kelembaman tubuh kita yang berusaha mempertahankan keadaan geraknya.',
    POINTS: 40
  }
];
