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
  SEMESTER: 'Semester 1 & 2',
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
  // Sample Students per Class
  {
    ID: 'USR-SISWA01',
    USERNAME: 'siswa01',
    NAME: 'Ahmad Fauzan',
    EMAIL: 'siswa01@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-X1',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  {
    ID: 'USR-SISWA02',
    USERNAME: 'siswa02',
    NAME: 'Siti Nurhaliza',
    EMAIL: 'siswa02@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-X2',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  {
    ID: 'USR-SISWA03',
    USERNAME: 'siswa03',
    NAME: 'Budi Kurniawan',
    EMAIL: 'siswa03@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-XI1',
    ACTIVE: true,
    CREATED_AT: new Date().toISOString()
  },
  {
    ID: 'USR-SISWA04',
    USERNAME: 'siswa04',
    NAME: 'Dewi Lestari',
    EMAIL: 'siswa04@masmuhammadiyahcikaramas.sch.id',
    PASSWORD_HASH: 'Siswa123!',
    ROLE: 'STUDENT',
    CLASS_ID: 'KLS-XII1',
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
    TITLE: 'Sumatif Tengah Semester (STS) Koding & Pemrograman',
    SUBJECT_ID: 'MP-T3',
    CLASS_ID: 'KLS-X1',
    ASSESSMENT_TYPE_ID: 'STS',
    EXAM_DATE: formatDateYMD(today),
    START_TIME: '08:00',
    DURATION_MIN: 90,
    STATUS: 'ACTIVE',
    RANDOMIZE: true,
    MAX_VIOLATIONS: 3,
    CREATED_BY: 'USR-GURU-T',
    CREATED_AT: new Date().toISOString()
  },
  {
    ID: 'UJ-002',
    TITLE: 'Sumatif Akhir Semester (SAS) Bahasa Indonesia',
    SUBJECT_ID: 'MP-A',
    CLASS_ID: 'KLS-XII1',
    ASSESSMENT_TYPE_ID: 'SAS',
    EXAM_DATE: formatDateYMD(today),
    START_TIME: '09:30',
    DURATION_MIN: 90,
    STATUS: 'ACTIVE',
    RANDOMIZE: true,
    MAX_VIOLATIONS: 3,
    CREATED_BY: 'USR-GURU-A',
    CREATED_AT: new Date().toISOString()
  },
  {
    ID: 'UJ-003',
    TITLE: 'Sumatif Harian Matematika Aljabar',
    SUBJECT_ID: 'MP-C1',
    CLASS_ID: 'KLS-X2',
    ASSESSMENT_TYPE_ID: 'SH',
    EXAM_DATE: formatDateYMD(today),
    START_TIME: '10:00',
    DURATION_MIN: 60,
    STATUS: 'ACTIVE',
    RANDOMIZE: true,
    MAX_VIOLATIONS: 3,
    CREATED_BY: 'USR-GURU-C',
    CREATED_AT: new Date().toISOString()
  }
];

export const INITIAL_QUESTIONS: Question[] = [
  {
    ID: 'SOAL-001',
    EXAM_ID: 'UJ-001',
    ASSESSMENT_TYPE_ID: 'STS',
    TYPE: 'MCQ',
    QUESTION: 'Dalam pemrograman web modern, struktur tata letak dasar sebuah halaman HTML didefinisikan menggunakan elemen ...',
    OPTION_A: '<header> dan <footer>',
    OPTION_B: '<html>, <head>, dan <body>',
    OPTION_C: '<script> dan <style>',
    OPTION_D: '<form> dan <input>',
    OPTION_E: '<div> dan <span>',
    ANSWER: 'B',
    POINTS: 30
  },
  {
    ID: 'SOAL-002',
    EXAM_ID: 'UJ-001',
    ASSESSMENT_TYPE_ID: 'STS',
    TYPE: 'MCQ',
    QUESTION: 'Tipe data dalam bahasa pemrograman yang digunakan untuk menyimpan nilai logika benar (true) atau salah (false) adalah ...',
    OPTION_A: 'Integer',
    OPTION_B: 'String',
    OPTION_C: 'Float',
    OPTION_D: 'Boolean',
    OPTION_E: 'Array',
    ANSWER: 'D',
    POINTS: 30
  },
  {
    ID: 'SOAL-003',
    EXAM_ID: 'UJ-001',
    ASSESSMENT_TYPE_ID: 'STS',
    TYPE: 'ESSAY',
    QUESTION: 'Jelaskan perbedaan mendasar antara loop (perulangan) "for" dan "while" dalam algoritma pemrograman koding!',
    ANSWER: 'Perulangan "for" biasanya digunakan ketika jumlah iterasi atau pengulangan sudah diketahui secara pasti sebelumnya. Sedangkan perulangan "while" digunakan ketika perulangan bergantung pada suatu kondisi logika dan jumlah iterasi belum tentu diketahui sebelumnya hingga kondisi berhenti terpenuhi.',
    POINTS: 40
  },
  {
    ID: 'SOAL-004',
    EXAM_ID: 'UJ-002',
    ASSESSMENT_TYPE_ID: 'SAS',
    TYPE: 'MCQ',
    QUESTION: 'Ciri utama dari teks artikel ilmiah populer adalah disajikan dengan ragam bahasa yang ...',
    OPTION_A: 'Kaku dan sangat teknis',
    OPTION_B: 'Komunikatif, lugas, dan mudah dipahami khalayak umum',
    OPTION_C: 'Menggunakan majas kiasan puisi',
    OPTION_D: 'Penuh istilah asing tanpa penjelasan',
    OPTION_E: 'Bersifat fiktif imajinatif',
    ANSWER: 'B',
    POINTS: 50
  },
  {
    ID: 'SOAL-005',
    EXAM_ID: 'UJ-003',
    ASSESSMENT_TYPE_ID: 'SH',
    TYPE: 'MCQ',
    QUESTION: 'Nilai x yang memenuhi persamaan linier 3x + 15 = 45 adalah ...',
    OPTION_A: '5',
    OPTION_B: '10',
    OPTION_C: '15',
    OPTION_D: '20',
    OPTION_E: '30',
    ANSWER: 'B',
    POINTS: 50
  }
];
