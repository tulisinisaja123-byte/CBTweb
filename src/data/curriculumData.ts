import { ClassItem, CurriculumType, TimetableDay, TeacherMasterItem, TeacherAssignmentRow } from '../types';

export interface SubjectPreset {
  baseCode: string;
  name: string;
  curriculum: CurriculumType;
  level: string; // 'X' | 'XI' | 'XII' | 'SEMUA'
  group: string;
  defaultKkm: number;
  defaultHours: number;
  defaultTeacherRole?: string;
  teacherCode?: string;
  teacherName?: string;
}

/**
 * Data Guru dan Kode Guru MA Muhammadiyah Cikaramas
 * Sesuai Jadwal Pelajaran Tatap Muka TP 2026/2027 & Lampiran SK Pembagian Tugas
 */
export const MA_CIKARAMAS_TEACHERS: TeacherMasterItem[] = [
  { no: 1, code: 'A', name: 'Ai Sukaesih, S.Pd', nipNbm: 'NBM. 1281201', rankGolongan: 'PNS / Pembina (IV.a)', subjectsSummary: ['B. Indonesia'], derivedCodes: ['A'], additionalDuty: 'Kepala Madrasah', additionalDutyHours: 12, note: 'Kepala Madrasah (NBM. 1281201)' },
  { no: 2, code: 'B', name: 'Andri Wildani, S.Pd', nipNbm: 'NBM. 1281202', rankGolongan: 'GTY / Penata (III.c)', subjectsSummary: ['AIK'], derivedCodes: ['B'], additionalDuty: 'Waka Kesiswaan', additionalDutyHours: 12 },
  { no: 3, code: 'C', name: 'Deni Kurniawan R., S.Pd', nipNbm: 'NBM. 1281203', rankGolongan: 'GTY / Penata Muda (III.b)', subjectsSummary: ['1. Matematika', '2. B.Inggris', '3. SB'], derivedCodes: ['C1', 'C2', 'C3'], additionalDuty: 'Waka Kurikulum', additionalDutyHours: 12 },
  { no: 4, code: 'D', name: 'Jajang Ismail A., S.Pd', nipNbm: 'NBM. 1281204', rankGolongan: 'GTY / Penata (III.c)', subjectsSummary: ['PKn'], derivedCodes: ['D'], additionalDuty: 'Waka Humas', additionalDutyHours: 6 },
  { no: 5, code: 'E', name: 'Drs. Dedeng Kusnandar', nipNbm: 'NBM. 1281205', rankGolongan: 'PNS / Pembina (IV.a)', subjectsSummary: ['Sosiologi'], derivedCodes: ['E'], additionalDuty: 'Guru Senior & Konselor', additionalDutyHours: 2 },
  { no: 6, code: 'F', name: 'Yanto Yulian, S.Pd', nipNbm: 'NBM. 1281206', rankGolongan: 'GTY', subjectsSummary: ['1. Prakarya', '2. SB'], derivedCodes: ['F1', 'F2'], additionalDuty: 'Wali Kelas X.2 & Koord. P5', additionalDutyHours: 2, note: 'Koord. Kokulikuler Kelas 10 (Rabu)' },
  { no: 7, code: 'G', name: 'Arif Muslim, S.Pd.I', nipNbm: 'NBM. 1281207', rankGolongan: 'GTY', subjectsSummary: ['PJOK'], derivedCodes: ['G'], additionalDuty: 'Pembina HW / Kepanduan', additionalDutyHours: 2, note: 'Koord. Kokulikuler Kelas 10 (Kamis)' },
  { no: 8, code: 'H', name: 'Rini Sri Mulyani, S.Pd', nipNbm: 'NBM. 1281208', rankGolongan: 'GTY', subjectsSummary: ['1. B. Sunda', '2. B. Indo'], derivedCodes: ['H1', 'H2'], additionalDuty: 'Wali Kelas X.1', additionalDutyHours: 2 },
  { no: 9, code: 'I', name: 'M. Yusup Abdullah, S.Pd', nipNbm: 'NBM. 1281209', rankGolongan: 'GTY', subjectsSummary: ['1. Fiqih', '2. Ilmu Hadist', '3. IK'], derivedCodes: ['I1', 'I2', 'I3'], additionalDuty: 'Wali Kelas XI.1 & Koord. P5', additionalDutyHours: 2, note: 'Koord. Kokulikuler Kelas 11' },
  { no: 10, code: 'J', name: 'Nureni, S.Kom', nipNbm: 'NBM. 1281210', rankGolongan: 'GTY', subjectsSummary: ['1. Geografi', '2. Sejarah'], derivedCodes: ['J1', 'J2'], additionalDuty: 'Wali Kelas X.3 & Kepala Lab Komputer', additionalDutyHours: 4 },
  { no: 11, code: 'K', name: 'Yusup Kamaludin, S.E', nipNbm: 'NBM. 1281211', rankGolongan: 'GTY', subjectsSummary: ['Ekonomi'], derivedCodes: ['K'], additionalDuty: 'Wali Kelas XI.2 & Koord. P5', additionalDutyHours: 2, note: 'Koord. Kokulikuler Kelas 11' },
  { no: 12, code: 'L', name: 'Seny Septiany, Am.Kl', nipNbm: 'NBM. 1281212', rankGolongan: 'GTY', subjectsSummary: ['1. Kimia', '2. Biologi'], derivedCodes: ['L1', 'L2'], additionalDuty: 'Kepala Perpustakaan', additionalDutyHours: 4 },
  { no: 13, code: 'M', name: 'Uci Khotifah, S.Pd', nipNbm: 'NBM. 1281213', rankGolongan: 'GTY', subjectsSummary: ['1. Akidah Akhlak', '2. IK', '3. Qurdis'], derivedCodes: ['M1', 'M2', 'M3'], additionalDuty: 'Guru Pembina Rohis', additionalDutyHours: 2 },
  { no: 14, code: 'N', name: 'Eti Hamidah, S.Pd.I', nipNbm: 'NBM. 1281214', rankGolongan: 'GTY', subjectsSummary: ['1. B Arab', '2. Qurdist'], derivedCodes: ['N1', 'N2'], additionalDuty: 'Pembina Bahasa Arab', additionalDutyHours: 2 },
  { no: 15, code: 'O', name: 'Yeni Fitriyani, S.Pd', nipNbm: 'NBM. 1281215', rankGolongan: 'GTY', subjectsSummary: ['1. MTK', '2. Kimia'], derivedCodes: ['O1', 'O2'], additionalDuty: 'Pembina IPM', additionalDutyHours: 2 },
  { no: 16, code: 'P', name: 'Nanang Sutisna, S.S', nipNbm: 'NBM. 1281216', rankGolongan: 'GTY', subjectsSummary: ['Bahasa Inggris'], derivedCodes: ['P'], additionalDuty: 'Pembina English Club', additionalDutyHours: 2 },
  { no: 17, code: 'Q', name: 'Deni Samsudin, S.E', nipNbm: 'NBM. 1281217', rankGolongan: 'GTY', subjectsSummary: ['Informatika'], derivedCodes: ['Q'], additionalDuty: 'Wali Kelas XII.1 & Koord. P5', additionalDutyHours: 2, note: 'Koord. Kokulikuler Kelas 12' },
  { no: 18, code: 'R', name: 'Tatang Tajmudin, S.Pd.I', nipNbm: 'NBM. 1281218', rankGolongan: 'GTY', subjectsSummary: ['1. SKI', '2. Sejarah'], derivedCodes: ['R1', 'R2'], additionalDuty: 'Wali Kelas XII.2 & Koord. P5', additionalDutyHours: 2, note: 'Koord. Kokulikuler Kelas 12' },
  { no: 19, code: 'S', name: 'Acep Mohammad KH, S.Sos', nipNbm: 'NBM. 1281219', rankGolongan: 'GTY', subjectsSummary: ['1. Sos', '2. B.Sunda', '3. B.Arab'], derivedCodes: ['S1', 'S2', 'S3'], additionalDuty: 'Guru Pembina Budaya Daerah', additionalDutyHours: 2 },
  { no: 20, code: 'T', name: 'Ipid Abdul Hapid, S.Pd', nipNbm: 'NBM. 1281220', rankGolongan: 'GTY / Penata Muda (III.b)', subjectsSummary: ['1. Fisika', '2. Sejarah', '3. Koding'], derivedCodes: ['T1', 'T2', 'T3'], additionalDuty: 'Waka Sarpras & Lab', additionalDutyHours: 6 }
];

/**
 * 7 Rombel Kelas sesuai Header Jadwal Pelajaran Tatap Muka
 */
export const MA_CIKARAMAS_CLASSES = [
  { id: 'KLS-X1', name: 'X.1', level: 'X', homeroom: 'Rini Sri Mulyani, S.Pd', stream: 'FASE_E', curriculum: 'MERDEKA' as const },
  { id: 'KLS-X2', name: 'X.2', level: 'X', homeroom: 'Yanto Yulian, S.Pd', stream: 'FASE_E', curriculum: 'MERDEKA' as const },
  { id: 'KLS-X3', name: 'X.3', level: 'X', homeroom: 'Nureni, S.Kom', stream: 'FASE_E', curriculum: 'MERDEKA' as const },
  { id: 'KLS-XI1', name: 'XI.1', level: 'XI', homeroom: 'M. Yusup Abdullah, S.Pd', stream: 'FASE_F', curriculum: 'MERDEKA' as const },
  { id: 'KLS-XI2', name: 'XI.2', level: 'XI', homeroom: 'Yusup Kamaludin, S.E', stream: 'FASE_F', curriculum: 'MERDEKA' as const },
  { id: 'KLS-XII1', name: 'XII.1', level: 'XII', homeroom: 'Deni Samsudin, S.E', stream: 'FASE_F', curriculum: 'MERDEKA' as const },
  { id: 'KLS-XII2', name: 'XII.2', level: 'XII', homeroom: 'Tatang Tajmudin, S.Pd.I', stream: 'FASE_F', curriculum: 'MERDEKA' as const }
];

/**
 * Daftar Mata Pelajaran Terinci berdasarkan Kode Jadwal MA Muhammadiyah Cikaramas
 */
export const MA_CIKARAMAS_SUBJECTS = [
  { code: 'A', name: 'Bahasa Indonesia', teacherCode: 'A', teacherName: 'Ai Sukaesih, S.Pd', group: 'Mata Pelajaran Umum (Wajib)', kkm: 75, hours: 4 },
  { code: 'B', name: 'AIK (Al-Islam & Kemuhammadiyahan)', teacherCode: 'B', teacherName: 'Andri Wildani, S.Pd', group: 'Mata Pelajaran PAI & Kemuhammadiyahan', kkm: 75, hours: 3 },
  { code: 'C1', name: 'Matematika', teacherCode: 'C', teacherName: 'Deni Kurniawan R., S.Pd', group: 'Mata Pelajaran Umum (Wajib)', kkm: 75, hours: 4 },
  { code: 'C2', name: 'Bahasa Inggris', teacherCode: 'C', teacherName: 'Deni Kurniawan R., S.Pd', group: 'Mata Pelajaran Umum (Wajib)', kkm: 75, hours: 4 },
  { code: 'C3', name: 'Seni Budaya (SB)', teacherCode: 'C', teacherName: 'Deni Kurniawan R., S.Pd', group: 'Mata Pelajaran Umum (Wajib)', kkm: 75, hours: 2 },
  { code: 'D', name: 'Pendidikan Kewarganegaraan (PKn)', teacherCode: 'D', teacherName: 'Jajang Ismail A., S.Pd', group: 'Mata Pelajaran Umum (Wajib)', kkm: 75, hours: 2 },
  { code: 'E', name: 'Sosiologi', teacherCode: 'E', teacherName: 'Drs. Dedeng Kusnandar', group: 'Peminatan IPS (Sosial)', kkm: 75, hours: 3 },
  { code: 'F1', name: 'Prakarya & Kewirausahaan (PKWU)', teacherCode: 'F', teacherName: 'Yanto Yulian, S.Pd', group: 'Mata Pelajaran Umum (Wajib)', kkm: 75, hours: 2 },
  { code: 'F2', name: 'Seni Budaya (SB)', teacherCode: 'F', teacherName: 'Yanto Yulian, S.Pd', group: 'Mata Pelajaran Umum (Wajib)', kkm: 75, hours: 2 },
  { code: 'G', name: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', teacherCode: 'G', teacherName: 'Arif Muslim, S.Pd.I', group: 'Mata Pelajaran Umum (Wajib)', kkm: 75, hours: 3 },
  { code: 'H1', name: 'Bahasa Sunda', teacherCode: 'H', teacherName: 'Rini Sri Mulyani, S.Pd', group: 'Muatan Lokal (Bahasa Daerah)', kkm: 75, hours: 2 },
  { code: 'H2', name: 'Bahasa Indonesia', teacherCode: 'H', teacherName: 'Rini Sri Mulyani, S.Pd', group: 'Mata Pelajaran Umum (Wajib)', kkm: 75, hours: 4 },
  { code: 'I1', name: 'Fiqih', teacherCode: 'I', teacherName: 'M. Yusup Abdullah, S.Pd', group: 'Mata Pelajaran PAI & Kemuhammadiyahan', kkm: 75, hours: 2 },
  { code: 'I2', name: 'Ilmu Hadist', teacherCode: 'I', teacherName: 'M. Yusup Abdullah, S.Pd', group: 'Mata Pelajaran PAI & Kemuhammadiyahan', kkm: 75, hours: 2 },
  { code: 'I3', name: 'IK (Kemuhammadiyahan)', teacherCode: 'I', teacherName: 'M. Yusup Abdullah, S.Pd', group: 'Mata Pelajaran PAI & Kemuhammadiyahan', kkm: 75, hours: 2 },
  { code: 'J1', name: 'Geografi', teacherCode: 'J', teacherName: 'Nureni, S.Kom', group: 'Peminatan IPS (Sosial)', kkm: 75, hours: 3 },
  { code: 'J2', name: 'Sejarah', teacherCode: 'J', teacherName: 'Nureni, S.Kom', group: 'Mata Pelajaran Umum (Wajib)', kkm: 75, hours: 2 },
  { code: 'K', name: 'Ekonomi', teacherCode: 'K', teacherName: 'Yusup Kamaludin, S.E', group: 'Peminatan IPS (Sosial)', kkm: 75, hours: 3 },
  { code: 'L1', name: 'Kimia', teacherCode: 'L', teacherName: 'Seny Septiany, Am.Kl', group: 'Peminatan MIPA (Sains)', kkm: 75, hours: 3 },
  { code: 'L2', name: 'Biologi', teacherCode: 'L', teacherName: 'Seny Septiany, Am.Kl', group: 'Peminatan MIPA (Sains)', kkm: 75, hours: 3 },
  { code: 'M1', name: 'Akidah Akhlak', teacherCode: 'M', teacherName: 'Uci Khotifah, S.Pd', group: 'Mata Pelajaran PAI & Kemuhammadiyahan', kkm: 75, hours: 2 },
  { code: 'M2', name: 'IK (Kemuhammadiyahan)', teacherCode: 'M', teacherName: 'Uci Khotifah, S.Pd', group: 'Mata Pelajaran PAI & Kemuhammadiyahan', kkm: 75, hours: 2 },
  { code: 'M3', name: "Al-Qur'an Hadist (Qurdis)", teacherCode: 'M', teacherName: 'Uci Khotifah, S.Pd', group: 'Mata Pelajaran PAI & Kemuhammadiyahan', kkm: 75, hours: 2 },
  { code: 'N1', name: 'Bahasa Arab', teacherCode: 'N', teacherName: 'Eti Hamidah, S.Pd.I', group: 'Mata Pelajaran PAI & Bahasa Asing', kkm: 75, hours: 3 },
  { code: 'N2', name: "Al-Qur'an Hadist (Qurdist)", teacherCode: 'N', teacherName: 'Eti Hamidah, S.Pd.I', group: 'Mata Pelajaran PAI & Kemuhammadiyahan', kkm: 75, hours: 2 },
  { code: 'O1', name: 'Matematika (MTK)', teacherCode: 'O', teacherName: 'Yeni Fitriyani, S.Pd', group: 'Mata Pelajaran Umum (Wajib)', kkm: 75, hours: 4 },
  { code: 'O2', name: 'Kimia', teacherCode: 'O', teacherName: 'Yeni Fitriyani, S.Pd', group: 'Peminatan MIPA (Sains)', kkm: 75, hours: 3 },
  { code: 'P', name: 'Bahasa Inggris', teacherCode: 'P', teacherName: 'Nanang Sutisna, S.S', group: 'Mata Pelajaran Umum (Wajib)', kkm: 75, hours: 4 },
  { code: 'Q', name: 'Informatika', teacherCode: 'Q', teacherName: 'Deni Samsudin, S.E', group: 'Mata Pelajaran Umum (Wajib)', kkm: 75, hours: 3 },
  { code: 'R1', name: 'Sejarah Kebudayaan Islam (SKI)', teacherCode: 'R', teacherName: 'Tatang Tajmudin, S.Pd.I', group: 'Mata Pelajaran PAI & Kemuhammadiyahan', kkm: 75, hours: 2 },
  { code: 'R2', name: 'Sejarah', teacherCode: 'R', teacherName: 'Tatang Tajmudin, S.Pd.I', group: 'Mata Pelajaran Umum (Wajib)', kkm: 75, hours: 2 },
  { code: 'S1', name: 'Sosiologi (Sos)', teacherCode: 'S', teacherName: 'Acep Mohammad KH, S.Sos', group: 'Peminatan IPS (Sosial)', kkm: 75, hours: 3 },
  { code: 'S2', name: 'Bahasa Sunda', teacherCode: 'S', teacherName: 'Acep Mohammad KH, S.Sos', group: 'Muatan Lokal (Bahasa Daerah)', kkm: 75, hours: 2 },
  { code: 'S3', name: 'Bahasa Arab', teacherCode: 'S', teacherName: 'Acep Mohammad KH, S.Sos', group: 'Mata Pelajaran PAI & Bahasa Asing', kkm: 75, hours: 3 },
  { code: 'T1', name: 'Fisika', teacherCode: 'T', teacherName: 'Ipid Abdul Hapid, S.Pd', group: 'Peminatan MIPA (Sains)', kkm: 75, hours: 3 },
  { code: 'T2', name: 'Sejarah', teacherCode: 'T', teacherName: 'Ipid Abdul Hapid, S.Pd', group: 'Mata Pelajaran Umum (Wajib)', kkm: 75, hours: 2 },
  { code: 'T3', name: 'Koding / Pemrograman', teacherCode: 'T', teacherName: 'Ipid Abdul Hapid, S.Pd', group: 'Muatan Khusus / Informatika Terapan', kkm: 75, hours: 3 },
  { code: 'KO', name: 'Kokulikuler (P5 & Penguatan Karakter)', teacherCode: 'KO', teacherName: 'Koordinator Kokulikuler', group: 'Pengembangan Diri & Kokulikuler', kkm: 75, hours: 2 }
];

/**
 * Data Program Kokulikuler Semester 1
 */
export const MA_CIKARAMAS_KOKULIKULER = {
  kelas10: [
    { title: 'Pembuatan Makanan Tradisional', coordinator: 'Yanto Yulian, S.Pd', day: 'Rabu', target: 'Kelas X (X.1, X.2, X.3)' },
    { title: 'Sekolah Tanpa Perundungan', coordinator: 'Arif Muslim, S.Pd.I', day: 'Kamis', target: 'Kelas X (X.1, X.2, X.3)' }
  ],
  kelas11: [
    { title: 'Pengembangan Diri Keagamaan', coordinator: 'M. Yusup Abdullah, S.Pd', target: 'Kelas XI (XI.1, XI.2)' },
    { title: 'Riset Pasar Lokal', coordinator: 'Yusup Kamaludin, S.E', target: 'Kelas XI (XI.1, XI.2)' }
  ],
  kelas12: [
    { title: 'Penelitian Pengaruh Teknologi', coordinator: 'Deni Samsudin, S.E', target: 'Kelas XII (XII.1, XII.2)' },
    { title: 'Pemetaan Potensi Diri', coordinator: 'Tatang Tajmudin, S.Pd.I', target: 'Kelas XII (XII.1, XII.2)' }
  ]
};

/**
 * Matriks Jadwal Pelajaran Tatap Muka Lengkap (Senin s.d. Jum'at)
 * Sesuai foto dokumen resmi MA Muhammadiyah Cikaramas
 */
export const MA_CIKARAMAS_TIMETABLE: TimetableDay[] = [
  {
    day: 'SENIN',
    dayLabel: 'Senin',
    preActivity: '06.45 - 07.10: Persiapan Upacara',
    slots: [
      { period: 1, time: '07.10 - 07.45', subjectCodes: { 'X.1': 'UPACARA', 'X.2': 'UPACARA', 'X.3': 'UPACARA', 'XI.1': 'UPACARA', 'XI.2': 'UPACARA', 'XII.1': 'UPACARA', 'XII.2': 'UPACARA' }, isSpecial: true, activityName: 'Upacara Bendera' },
      { period: 2, time: '07.45 - 08.20', subjectCodes: { 'X.1': 'H2', 'X.2': 'T3', 'X.3': 'Q', 'XI.1': 'I2', 'XI.2': 'S1', 'XII.1': 'F2', 'XII.2': 'C1' } },
      { period: 3, time: '08.20 - 08.55', subjectCodes: { 'X.1': 'H2', 'X.2': 'T3', 'X.3': 'Q', 'XI.1': 'I2', 'XI.2': 'S1', 'XII.1': 'F2', 'XII.2': 'B' } },
      { period: 4, time: '08.55 - 09.30', subjectCodes: { 'X.1': 'B', 'X.2': 'E', 'X.3': 'C2', 'XI.1': 'T2', 'XI.2': 'S1', 'XII.1': 'R2', 'XII.2': 'A' } },
      { period: 0, time: '09.30 - 09.55', subjectCodes: {}, isBreak: true, activityName: 'Istirahat Pagi' },
      { period: 5, time: '09.55 - 10.30', subjectCodes: { 'X.1': 'I3', 'X.2': 'E', 'X.3': 'C2', 'XI.1': 'T2', 'XI.2': 'F2', 'XII.1': 'R2', 'XII.2': 'A' } },
      { period: 6, time: '10.30 - 11.05', subjectCodes: { 'X.1': 'T3', 'X.2': 'I3', 'X.3': 'E', 'XI.1': 'H2', 'XI.2': 'F2', 'XII.1': 'B', 'XII.2': 'S' } },
      { period: 7, time: '11.05 - 11.40', subjectCodes: { 'X.1': 'T3', 'X.2': 'B', 'X.3': 'E', 'XI.1': 'H2', 'XI.2': 'I1', 'XII.1': 'A', 'XII.2': 'S' } },
      { period: 8, time: '11.40 - 12.15', subjectCodes: { 'X.1': 'E', 'X.2': 'Q', 'X.3': 'B', 'XI.1': 'H2', 'XI.2': 'I1', 'XII.1': 'A', 'XII.2': 'F2' } },
      { period: 0, time: '12.15 - 12.40', subjectCodes: {}, isBreak: true, activityName: 'Istirahat Siang & Sholat Dzuhur' },
      { period: 9, time: '12.40 - 13.15', subjectCodes: { 'X.1': 'E', 'X.2': 'Q', 'X.3': 'I3', 'XI.1': 'S3', 'XI.2': 'B', 'XII.1': 'T1', 'XII.2': 'F2' } },
      { period: 10, time: '13.15 - 13.50', subjectCodes: { 'X.1': 'Q', 'X.2': 'C2', 'X.3': 'J1', 'XI.1': 'S3', 'XI.2': 'H1', 'XII.1': 'T1', 'XII.2': 'I1' } },
      { period: 11, time: '13.50 - 14.25', subjectCodes: { 'X.1': 'Q', 'X.2': 'C2', 'X.3': 'J1', 'XI.1': 'B', 'XI.2': 'H1', 'XII.1': 'T1', 'XII.2': 'I1' } }
    ],
    postActivity: '14.25 - 15.00: Ekstrakulikuler'
  },
  {
    day: 'SELASA',
    dayLabel: 'Selasa',
    preActivity: "06.45 - 07.10: Do'a / Tadarus Bersama",
    slots: [
      { period: 1, time: '07.10 - 07.45', subjectCodes: { 'X.1': 'J1', 'X.2': 'L1', 'X.3': 'S2', 'XI.1': 'F1', 'XI.2': 'M1', 'XII.1': 'A', 'XII.2': 'Q' } },
      { period: 2, time: '07.45 - 08.20', subjectCodes: { 'X.1': 'J1', 'X.2': 'L1', 'X.3': 'S2', 'XI.1': 'F1', 'XI.2': 'M1', 'XII.1': 'O2', 'XII.2': 'Q' } },
      { period: 3, time: '08.20 - 08.55', subjectCodes: { 'X.1': 'L1', 'X.2': 'J1', 'X.3': 'M1', 'XI.1': 'T1', 'XI.2': 'S3', 'XII.1': 'O2', 'XII.2': 'Q' } },
      { period: 4, time: '08.55 - 09.30', subjectCodes: { 'X.1': 'L1', 'X.2': 'J1', 'X.3': 'M1', 'XI.1': 'T1', 'XI.2': 'S3', 'XII.1': 'O2', 'XII.2': 'A' } },
      { period: 0, time: '09.30 - 09.55', subjectCodes: {}, isBreak: true, activityName: 'Istirahat Pagi' },
      { period: 5, time: '09.55 - 10.30', subjectCodes: { 'X.1': 'C3', 'X.2': 'M3', 'X.3': 'J2', 'XI.1': 'R1', 'XI.2': 'O1', 'XII.1': 'F1', 'XII.2': 'G' } },
      { period: 6, time: '10.30 - 11.05', subjectCodes: { 'X.1': 'H2', 'X.2': 'M3', 'X.3': 'J2', 'XI.1': 'R1', 'XI.2': 'O1', 'XII.1': 'F1', 'XII.2': 'G' } },
      { period: 7, time: '11.05 - 11.40', subjectCodes: { 'X.1': 'N1', 'X.2': 'F1', 'X.3': 'H2', 'XI.1': 'G', 'XI.2': 'O1', 'XII.1': 'R1', 'XII.2': 'J1' } },
      { period: 8, time: '11.40 - 12.15', subjectCodes: { 'X.1': 'N1', 'X.2': 'H2', 'X.3': 'L1', 'XI.1': 'G', 'XI.2': 'F1', 'XII.1': 'R1', 'XII.2': 'J1' } },
      { period: 0, time: '12.15 - 12.40', subjectCodes: {}, isBreak: true, activityName: 'Istirahat Siang & Sholat Dzuhur' },
      { period: 9, time: '12.40 - 13.15', subjectCodes: { 'X.1': 'S2', 'X.2': 'H2', 'X.3': 'L1', 'XI.1': 'O2', 'XI.2': 'F1', 'XII.1': 'Q', 'XII.2': 'J1' } },
      { period: 10, time: '13.15 - 13.50', subjectCodes: { 'X.1': 'S2', 'X.2': 'N1', 'X.3': 'T3', 'XI.1': 'O2', 'XI.2': 'J1', 'XII.1': 'Q', 'XII.2': 'R1' } },
      { period: 11, time: '13.50 - 14.25', subjectCodes: { 'X.1': 'F1', 'X.2': 'N1', 'X.3': 'T3', 'XI.1': 'O2', 'XI.2': 'J1', 'XII.1': 'Q', 'XII.2': 'R1' } }
    ],
    postActivity: '14.25 - 15.00: Ekstrakulikuler'
  },
  {
    day: 'RABU',
    dayLabel: 'Rabu',
    preActivity: "06.45 - 07.10: Do'a / Tadarus Bersama",
    slots: [
      { period: 1, time: '07.10 - 07.45', subjectCodes: { 'X.1': 'D', 'X.2': 'S2', 'X.3': 'O1', 'XI.1': 'F2', 'XI.2': 'T2', 'XII.1': 'L2', 'XII.2': 'K' } },
      { period: 2, time: '07.45 - 08.20', subjectCodes: { 'X.1': 'D', 'X.2': 'S2', 'X.3': 'O1', 'XI.1': 'F2', 'XI.2': 'T2', 'XII.1': 'L2', 'XII.2': 'K' } },
      { period: 3, time: '08.20 - 08.55', subjectCodes: { 'X.1': 'N1', 'X.2': 'R1', 'X.3': 'O1', 'XI.1': 'T1', 'XI.2': 'G', 'XII.1': 'L2', 'XII.2': 'K' } },
      { period: 4, time: '08.55 - 09.30', subjectCodes: { 'X.1': 'N1', 'X.2': 'R1', 'X.3': 'F1', 'XI.1': 'T1', 'XI.2': 'G', 'XII.1': 'I1', 'XII.2': 'S' } },
      { period: 0, time: '09.30 - 09.55', subjectCodes: {}, isBreak: true, activityName: 'Istirahat Pagi' },
      { period: 5, time: '09.55 - 10.30', subjectCodes: { 'X.1': 'G', 'X.2': 'O1', 'X.3': 'C2', 'XI.1': 'T1', 'XI.2': 'N2', 'XII.1': 'I1', 'XII.2': 'S' } },
      { period: 6, time: '10.30 - 11.05', subjectCodes: { 'X.1': 'G', 'X.2': 'O1', 'X.3': 'C3', 'XI.1': 'L2', 'XI.2': 'N2', 'XII.1': 'D', 'XII.2': 'S' } },
      { period: 7, time: '11.05 - 11.40', subjectCodes: { 'X.1': 'K', 'X.2': 'M1', 'X.3': 'N1', 'XI.1': 'L2', 'XI.2': 'S1', 'XII.1': 'D', 'XII.2': 'F1' } },
      { period: 8, time: '11.40 - 12.15', subjectCodes: { 'X.1': 'K', 'X.2': 'M1', 'X.3': 'N1', 'XI.1': 'L2', 'XI.2': 'S1', 'XII.1': 'T1', 'XII.2': 'F1' } },
      { period: 0, time: '12.15 - 12.40', subjectCodes: {}, isBreak: true, activityName: 'Istirahat Siang & Sholat Dzuhur' },
      { period: 9, time: '12.40 - 13.15', subjectCodes: { 'X.1': 'L2', 'X.2': 'C2', 'X.3': 'R1', 'XI.1': 'O1', 'XI.2': 'K', 'XII.1': 'T1', 'XII.2': 'D' } },
      { period: 10, time: '13.15 - 13.50', subjectCodes: { 'X.1': 'L2', 'X.2': 'C3', 'X.3': 'R1', 'XI.1': 'O1', 'XI.2': 'K', 'XII.1': 'M1', 'XII.2': 'D' } },
      { period: 11, time: '13.50 - 14.25', subjectCodes: { 'X.1': 'KO', 'X.2': 'KO', 'X.3': 'KO', 'XI.1': 'O1', 'XI.2': 'K', 'XII.1': 'M1', 'XII.2': 'N1' } }
    ],
    postActivity: '14.25 - 15.00: Ekstrakulikuler'
  },
  {
    day: 'KAMIS',
    dayLabel: 'Kamis',
    preActivity: '06.45 - 07.10: Senam Bersama / Kebugaran Jasmani',
    slots: [
      { period: 1, time: '07.10 - 07.45', subjectCodes: { 'X.1': 'M1', 'X.2': 'L2', 'X.3': 'N1', 'XI.1': 'P', 'XI.2': 'R1', 'XII.1': 'H1', 'XII.2': 'J1' } },
      { period: 2, time: '07.45 - 08.20', subjectCodes: { 'X.1': 'M1', 'X.2': 'L2', 'X.3': 'N1', 'XI.1': 'P', 'XI.2': 'R1', 'XII.1': 'H1', 'XII.2': 'J1' } },
      { period: 3, time: '08.20 - 08.55', subjectCodes: { 'X.1': 'J2', 'X.2': 'I1', 'X.3': 'L2', 'XI.1': 'P', 'XI.2': 'H2', 'XII.1': 'G', 'XII.2': 'M1' } },
      { period: 4, time: '08.55 - 09.30', subjectCodes: { 'X.1': 'J2', 'X.2': 'I1', 'X.3': 'L2', 'XI.1': 'N2', 'XI.2': 'H2', 'XII.1': 'G', 'XII.2': 'M1' } },
      { period: 0, time: '09.30 - 09.55', subjectCodes: {}, isBreak: true, activityName: 'Istirahat Pagi' },
      { period: 5, time: '09.55 - 10.30', subjectCodes: { 'X.1': 'I1', 'X.2': 'G', 'X.3': 'T1', 'XI.1': 'N2', 'XI.2': 'H2', 'XII.1': 'P', 'XII.2': 'R2' } },
      { period: 6, time: '10.30 - 11.05', subjectCodes: { 'X.1': 'I1', 'X.2': 'G', 'X.3': 'T1', 'XI.1': 'L2', 'XI.2': 'M2', 'XII.1': 'P', 'XII.2': 'R2' } },
      { period: 7, time: '11.05 - 11.40', subjectCodes: { 'X.1': 'T1', 'X.2': 'J2', 'X.3': 'G', 'XI.1': 'L2', 'XI.2': 'I2', 'XII.1': 'P', 'XII.2': 'H1' } },
      { period: 8, time: '11.40 - 12.15', subjectCodes: { 'X.1': 'T1', 'X.2': 'J2', 'X.3': 'G', 'XI.1': 'M2', 'XI.2': 'I2', 'XII.1': 'N1', 'XII.2': 'H1' } },
      { period: 0, time: '12.15 - 12.40', subjectCodes: {}, isBreak: true, activityName: 'Istirahat Siang & Sholat Dzuhur' },
      { period: 9, time: '12.40 - 13.15', subjectCodes: { 'X.1': 'R1', 'X.2': 'T1', 'X.3': 'H2', 'XI.1': 'M1', 'XI.2': 'J1', 'XII.1': 'L2', 'XII.2': 'N1' } },
      { period: 10, time: '13.15 - 13.50', subjectCodes: { 'X.1': 'R1', 'X.2': 'T1', 'X.3': 'H2', 'XI.1': 'M1', 'XI.2': 'J1', 'XII.1': 'L2', 'XII.2': 'N2' } },
      { period: 11, time: '13.50 - 14.25', subjectCodes: { 'X.1': 'KO', 'X.2': 'KO', 'X.3': 'KO', 'XI.1': 'I2', 'XI.2': 'J1', 'XII.1': 'M2', 'XII.2': 'N2' } }
    ],
    postActivity: '14.25 - 15.00: Ekstrakulikuler'
  },
  {
    day: 'JUMAT',
    dayLabel: "Jum'at",
    preActivity: "06.45 - 07.10: Do'a / Tadarus Bersama",
    slots: [
      { period: 1, time: '07.10 - 07.45', subjectCodes: { 'X.1': 'TAUSYIAH', 'X.2': 'TAUSYIAH', 'X.3': 'TAUSYIAH', 'XI.1': 'TAUSYIAH', 'XI.2': 'TAUSYIAH', 'XII.1': 'TAUSYIAH', 'XII.2': 'TAUSYIAH' }, isSpecial: true, activityName: 'Tausyiah / Pengajian Bersama' },
      { period: 2, time: '07.45 - 08.20', subjectCodes: { 'X.1': 'O1', 'X.2': 'N1', 'X.3': 'D', 'XI.1': 'I1', 'XI.2': 'P', 'XII.1': 'C1', 'XII.2': 'K' } },
      { period: 3, time: '08.20 - 08.55', subjectCodes: { 'X.1': 'O1', 'X.2': 'N1', 'X.3': 'D', 'XI.1': 'I1', 'XI.2': 'P', 'XII.1': 'C1', 'XII.2': 'K' } },
      { period: 4, time: '08.55 - 09.30', subjectCodes: { 'X.1': 'O1', 'X.2': 'D', 'X.3': 'K', 'XI.1': 'H1', 'XI.2': 'P', 'XII.1': 'C1', 'XII.2': 'M2' } },
      { period: 0, time: '09.30 - 09.55', subjectCodes: {}, isBreak: true, activityName: 'Istirahat Pagi' },
      { period: 5, time: '09.55 - 10.30', subjectCodes: { 'X.1': 'M3', 'X.2': 'D', 'X.3': 'K', 'XI.1': 'H1', 'XI.2': 'I2', 'XII.1': 'O2', 'XII.2': 'C1' } },
      { period: 6, time: '10.30 - 11.05', subjectCodes: { 'X.1': 'M3', 'X.2': 'H2', 'X.3': 'I1', 'XI.1': 'D', 'XI.2': 'K', 'XII.1': 'O2', 'XII.2': 'C1' } },
      { period: 7, time: '11.05 - 11.40', subjectCodes: { 'X.1': 'C2', 'X.2': 'O1', 'X.3': 'I1', 'XI.1': 'D', 'XI.2': 'K', 'XII.1': 'N1', 'XII.2': 'P' } },
      { period: 0, time: '11.40 - 12.40', subjectCodes: {}, isBreak: true, activityName: "Sholat Jum'at & Keputrian" },
      { period: 8, time: '12.40 - 13.15', subjectCodes: { 'X.1': 'C2', 'X.2': 'K', 'X.3': 'M3', 'XI.1': 'O2', 'XI.2': 'D', 'XII.1': 'N2', 'XII.2': 'P' } },
      { period: 9, time: '13.15 - 13.50', subjectCodes: { 'X.1': 'C2', 'X.2': 'K', 'X.3': 'M3', 'XI.1': 'O2', 'XI.2': 'D', 'XII.1': 'N2', 'XII.2': 'P' } }
    ],
    postActivity: '13.50 - 15.00: Kepanduan Hizbul Wathan / Pramuka'
  }
];

/**
 * Data Jadwal Tambahan Hari Sabtu (Untuk Opsi Sistem 6 Hari Kerja)
 */
export const MA_CIKARAMAS_SATURDAY_DAY: TimetableDay = {
  day: 'SABTU',
  dayLabel: 'Sabtu',
  preActivity: "06.45 - 07.10: Do'a / Tadarus Bersama",
  slots: [
    { period: 1, time: '07.10 - 07.45', subjectCodes: { 'X.1': 'B', 'X.2': 'H1', 'X.3': 'E', 'XI.1': 'K', 'XI.2': 'F1', 'XII.1': 'T2', 'XII.2': 'L2' } },
    { period: 2, time: '07.45 - 08.20', subjectCodes: { 'X.1': 'B', 'X.2': 'H1', 'X.3': 'E', 'XI.1': 'K', 'XI.2': 'F1', 'XII.1': 'T2', 'XII.2': 'L2' } },
    { period: 3, time: '08.20 - 08.55', subjectCodes: { 'X.1': 'F2', 'X.2': 'C1', 'X.3': 'N1', 'XI.1': 'I1', 'XI.2': 'M1', 'XII.1': 'Q', 'XII.2': 'S1' } },
    { period: 4, time: '08.55 - 09.30', subjectCodes: { 'X.1': 'F2', 'X.2': 'C1', 'X.3': 'N1', 'XI.1': 'I1', 'XI.2': 'M1', 'XII.1': 'Q', 'XII.2': 'S1' } },
    { period: 0, time: '09.30 - 09.55', subjectCodes: {}, isBreak: true, activityName: 'Istirahat Pagi' },
    { period: 5, time: '09.55 - 10.30', subjectCodes: { 'X.1': 'T1', 'X.2': 'S2', 'X.3': 'D', 'XI.1': 'O1', 'XI.2': 'A', 'XII.1': 'R1', 'XII.2': 'G' } },
    { period: 6, time: '10.30 - 11.05', subjectCodes: { 'X.1': 'T1', 'X.2': 'S2', 'X.3': 'D', 'XI.1': 'O1', 'XI.2': 'A', 'XII.1': 'R1', 'XII.2': 'G' } },
    { period: 7, time: '11.05 - 11.40', subjectCodes: { 'X.1': 'M2', 'X.2': 'P', 'X.3': 'L1', 'XI.1': 'J1', 'XI.2': 'T2', 'XII.1': 'C2', 'XII.2': 'N2' } },
    { period: 8, time: '11.40 - 12.15', subjectCodes: { 'X.1': 'M2', 'X.2': 'P', 'X.3': 'L1', 'XI.1': 'J1', 'XI.2': 'T2', 'XII.1': 'C2', 'XII.2': 'N2' } },
    { period: 0, time: '12.15 - 12.40', subjectCodes: {}, isBreak: true, activityName: 'Istirahat Siang & Sholat Dzuhur' },
    { period: 9, time: '12.40 - 13.15', subjectCodes: { 'X.1': 'KO', 'X.2': 'KO', 'X.3': 'KO', 'XI.1': 'H2', 'XI.2': 'S2', 'XII.1': 'D', 'XII.2': 'M1' } },
    { period: 10, time: '13.15 - 13.50', subjectCodes: { 'X.1': 'KO', 'X.2': 'KO', 'X.3': 'KO', 'XI.1': 'H2', 'XI.2': 'S2', 'XII.1': 'D', 'XII.2': 'M1' } }
  ],
  postActivity: '13.50 - 15.00: Evaluasi Pekanan / Kepanduan HW'
};

/**
 * Matriks Lengkap 6 Hari Kerja (Senin s.d. Sabtu)
 */
export const MA_CIKARAMAS_TIMETABLE_6DAYS: TimetableDay[] = [
  ...MA_CIKARAMAS_TIMETABLE,
  MA_CIKARAMAS_SATURDAY_DAY
];

/**
 * Ekstraksi Huruf Kode Guru dari Kode Mapel (misal "T3" -> "T", "C1" -> "C", "Q" -> "Q")
 */
export function getTeacherLetterFromCode(code: string): string {
  if (!code) return '';
  const clean = code.trim().toUpperCase();
  if (['KO', 'KOKULIKULER', 'UPACARA', 'TAUSYIAH', '-', ''].includes(clean)) {
    return clean;
  }
  // Ambil huruf saja
  const letter = clean.replace(/[^A-Z]/g, '');
  return letter;
}

/**
 * Interface Konflik Jadwal Slot
 */
export interface TimetableConflict {
  day: string;
  dayLabel: string;
  period: number;
  time: string;
  teacherCode: string;
  teacherName: string;
  classes: string[];
  subjectCodes: string[];
}

/**
 * Detektor Jadwal Anti-Bentrok
 * Memeriksa seluruh slot jadwal: memastikan tidak ada 1 guru mengajar di lebih dari 1 kelas pada jam yang sama
 */
export function checkTimetableConflicts(timetable: TimetableDay[]): {
  hasConflict: boolean;
  totalConflicts: number;
  conflicts: TimetableConflict[];
} {
  const conflicts: TimetableConflict[] = [];

  for (const day of timetable) {
    for (const slot of day.slots) {
      if (slot.isBreak || !slot.subjectCodes) continue;

      // Group per huruf guru
      const teacherMap: Record<string, { className: string; subjectCode: string }[]> = {};

      for (const [className, rawCode] of Object.entries(slot.subjectCodes)) {
        if (!rawCode) continue;
        const code = String(rawCode).trim().toUpperCase();
        if (['UPACARA', 'TAUSYIAH', 'KO', 'KOKULIKULER', '-', ''].includes(code)) continue;

        const teacherLetter = getTeacherLetterFromCode(code);
        if (!teacherLetter) continue;

        if (!teacherMap[teacherLetter]) {
          teacherMap[teacherLetter] = [];
        }
        teacherMap[teacherLetter].push({ className, subjectCode: code });
      }

      for (const [teacherLetter, assignments] of Object.entries(teacherMap)) {
        if (assignments.length > 1) {
          const teacherObj = lookupTeacherByCode(teacherLetter);
          conflicts.push({
            day: day.day,
            dayLabel: day.dayLabel,
            period: slot.period,
            time: slot.time,
            teacherCode: teacherLetter,
            teacherName: teacherObj ? teacherObj.name : `Guru Kode ${teacherLetter}`,
            classes: assignments.map(a => a.className),
            subjectCodes: assignments.map(a => a.subjectCode)
          });
        }
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    totalConflicts: conflicts.length,
    conflicts
  };
}

/**
 * Validasi Slot Spesifik saat pengeditan jadwal (Real-time Anti-Bentrok Check)
 * Menguji apakah menugaskan guru dengan kode `newSubjectCode` di `day`, `period`, dan `targetClassName` akan bentrok dengan kelas lain
 */
export function validateSlotTeacherAntiClash(
  timetable: TimetableDay[],
  dayKey: string,
  periodNumber: number,
  targetClassName: string,
  newSubjectCode: string
): { isValid: boolean; conflictWith?: { className: string; subjectCode: string; teacherName: string } } {
  const teacherLetter = getTeacherLetterFromCode(newSubjectCode);
  if (!teacherLetter || ['UPACARA', 'TAUSYIAH', 'KO', 'KOKULIKULER', '-', ''].includes(teacherLetter)) {
    return { isValid: true };
  }

  const day = timetable.find(d => d.day.toUpperCase() === dayKey.toUpperCase());
  if (!day) return { isValid: true };

  const slot = day.slots.find(s => s.period === periodNumber && !s.isBreak);
  if (!slot || !slot.subjectCodes) return { isValid: true };

  for (const [otherClass, rawCode] of Object.entries(slot.subjectCodes)) {
    if (otherClass === targetClassName) continue;
    if (!rawCode) continue;

    const otherSubjectCode = String(rawCode).trim().toUpperCase();
    const otherTeacherLetter = getTeacherLetterFromCode(otherSubjectCode);

    if (otherTeacherLetter === teacherLetter) {
      const teacherObj = lookupTeacherByCode(teacherLetter);
      return {
        isValid: false,
        conflictWith: {
          className: otherClass,
          subjectCode: otherSubjectCode,
          teacherName: teacherObj ? teacherObj.name : `Guru Kode ${teacherLetter}`
        }
      };
    }
  }

  return { isValid: true };
}

/**
 * Helper: cari data guru berdasarkan kode guru (A..T)
 */
export function lookupTeacherByCode(code: string): TeacherMasterItem | undefined {
  if (!code) return undefined;
  const clean = code.trim().toUpperCase();
  return MA_CIKARAMAS_TEACHERS.find(t => t.code === clean);
}

/**
 * Helper: cari data mata pelajaran berdasarkan kode mapel jadwal (e.g. 'T3', 'C1', 'A')
 */
export function lookupSubjectByCode(code: string) {
  if (!code) return undefined;
  const clean = code.trim().toUpperCase();
  return MA_CIKARAMAS_SUBJECTS.find(s => s.code === clean);
}

/**
 * Helper format label mapel + guru (e.g. "[T3] Koding / Pemrograman - Ipid Abdul Hapid, S.Pd (Kode T)")
 */
export function formatSubjectWithTeacher(code: string): string {
  const s = lookupSubjectByCode(code);
  if (!s) return code;
  return `[${s.code}] ${s.name} - ${s.teacherName} (Kode: ${s.teacherCode})`;
}

export const CURRICULUM_CONFIG: Record<
  CurriculumType,
  {
    name: string;
    shortName: string;
    badgeColor: string;
    description: string;
    levelNames: { X: string; XI: string; XII: string };
  }
> = {
  MERDEKA: {
    name: 'Kurikulum Merdeka',
    shortName: 'Merdeka',
    badgeColor: 'bg-[#EBF3FC] text-[#0052CC] border-[#B3D4FF]',
    description: 'Struktur Capaian Pembelajaran Fase E (Kelas 10) dan Fase F (Kelas 11-12) dengan pemilihan mapel peminatan mandiri.',
    levelNames: {
      X: 'Kelas X (Fase E)',
      XI: 'Kelas XI (Fase F)',
      XII: 'Kelas XII (Fase F)'
    }
  },
  K13: {
    name: 'Kurikulum 2013 Revisi (K13)',
    shortName: 'K13',
    badgeColor: 'bg-[#FEF7E0] text-[#B06000] border-[#FEEFC3]',
    description: 'Struktur Kompetensi Inti / Dasar (KI-KD) dengan sistem Penjurusan Peminatan MIPA, IPS, dan Bahasa sejak awal.',
    levelNames: {
      X: 'Kelas X (MIPA/IPS)',
      XI: 'Kelas XI (MIPA/IPS)',
      XII: 'Kelas XII (MIPA/IPS)'
    }
  }
};

/**
 * Official subject presets according to Indonesian National Curriculum and MA Muhammadiyah Cikaramas
 */
export const OFFICIAL_SUBJECT_PRESETS: SubjectPreset[] = [
  // MA Muhammadiyah Cikaramas Presets (Kode A s/d T3)
  ...MA_CIKARAMAS_SUBJECTS.map(s => ({
    baseCode: s.code,
    name: s.name,
    curriculum: 'MERDEKA' as CurriculumType,
    level: 'SEMUA',
    group: s.group,
    defaultKkm: s.kkm,
    defaultHours: s.hours,
    teacherCode: s.teacherCode,
    teacherName: s.teacherName
  })),

  // Fallbacks umum untuk kurikulum nasional
  { baseCode: 'BIND', name: 'Bahasa Indonesia', curriculum: 'MERDEKA', level: 'X', group: 'Mata Pelajaran Umum (Wajib)', defaultKkm: 75, defaultHours: 4 },
  { baseCode: 'MTK', name: 'Matematika', curriculum: 'MERDEKA', level: 'X', group: 'Mata Pelajaran Umum (Wajib)', defaultKkm: 75, defaultHours: 4 },
  { baseCode: 'BING', name: 'Bahasa Inggris', curriculum: 'MERDEKA', level: 'X', group: 'Mata Pelajaran Umum (Wajib)', defaultKkm: 75, defaultHours: 3 },
  { baseCode: 'INF', name: 'Informatika', curriculum: 'MERDEKA', level: 'X', group: 'Mata Pelajaran Umum (Wajib)', defaultKkm: 75, defaultHours: 3 },
  { baseCode: 'PJOK', name: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', curriculum: 'MERDEKA', level: 'X', group: 'Mata Pelajaran Umum (Wajib)', defaultKkm: 75, defaultHours: 3 }
];

/**
 * Sanitizes a string for use in code/ID identifiers
 */
export function sanitizeIdentifier(str: string): string {
  return String(str || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Auto-generates a standardized Subject Code following MA Muhammadiyah schedule logic
 */
export function generateSubjectCode(
  baseCode: string,
  level: string,
  classItem?: ClassItem | null,
  curriculum: CurriculumType = 'MERDEKA'
): string {
  const cleanBase = sanitizeIdentifier(baseCode) || 'MAPEL';

  // If baseCode already matches standard teacher derived code (e.g. 'T3', 'C1', 'A')
  const matched = lookupSubjectByCode(cleanBase);
  if (matched) {
    return matched.code;
  }

  if (classItem && classItem.NAME) {
    const cleanClassName = sanitizeIdentifier(classItem.NAME);
    return `${cleanBase}-${cleanClassName}`;
  }

  const cleanLevel = sanitizeIdentifier(level) || 'UMUM';
  return `${cleanBase}-${cleanLevel}`;
}

/**
 * Auto-generates a unique Subject ID
 */
export function generateSubjectId(
  baseCode: string,
  level: string,
  classItem?: ClassItem | null,
  curriculum: CurriculumType = 'MERDEKA'
): string {
  const code = generateSubjectCode(baseCode, level, classItem, curriculum);
  return `MP-${code}`;
}

/**
 * Generates user-friendly Display Name with Class tag
 */
export function generateSubjectDisplayName(
  baseName: string,
  classItem?: ClassItem | null,
  level?: string
): string {
  const cleanName = baseName.trim();
  if (classItem && classItem.NAME) {
    if (!cleanName.toLowerCase().includes(classItem.NAME.toLowerCase())) {
      return `${cleanName} (Kelas ${classItem.NAME})`;
    }
    return cleanName;
  }
  if (level && level !== 'Semua Tingkat' && !cleanName.toLowerCase().includes(level.toLowerCase())) {
    return `${cleanName} (Tingkat ${level})`;
  }
  return cleanName;
}

/**
 * 7 Rombel Classes suggestion matching MA Muhammadiyah Cikaramas schedule
 */
export const CLASS_SUGGESTIONS: Record<CurriculumType, { level: string; name: string; stream: string }[]> = {
  MERDEKA: [
    { level: 'X', name: 'X.1', stream: 'FASE_E' },
    { level: 'X', name: 'X.2', stream: 'FASE_E' },
    { level: 'X', name: 'X.3', stream: 'FASE_E' },
    { level: 'XI', name: 'XI.1', stream: 'FASE_F' },
    { level: 'XI', name: 'XI.2', stream: 'FASE_F' },
    { level: 'XII', name: 'XII.1', stream: 'FASE_F' },
    { level: 'XII', name: 'XII.2', stream: 'FASE_F' }
  ],
  K13: [
    { level: 'X', name: 'X.1', stream: 'MIPA' },
    { level: 'X', name: 'X.2', stream: 'MIPA' },
    { level: 'X', name: 'X.3', stream: 'IPS' },
    { level: 'XI', name: 'XI.1', stream: 'MIPA' },
    { level: 'XI', name: 'XI.2', stream: 'IPS' },
    { level: 'XII', name: 'XII.1', stream: 'MIPA' },
    { level: 'XII', name: 'XII.2', stream: 'IPS' }
  ]
};

/**
 * Otomatis membuat kode sandi derivasi berdasarkan aturan resmi MA Muhammadiyah Cikaramas:
 * - Jika 1 guru mengajar 1 mapel -> Kodenya adalah Huruf (misal: 'A')
 * - Jika 1 guru mengajar >1 mapel -> Kodenya adalah Huruf + Nomor (misal: 'C1', 'C2', 'C3')
 */
export function deriveCodesForTeacher(teacherCode: string, subjectCount: number): string[] {
  const code = teacherCode.trim().toUpperCase();
  if (subjectCount <= 1) {
    return [code];
  }
  const result: string[] = [];
  for (let i = 1; i <= subjectCount; i++) {
    result.push(`${code}${i}`);
  }
  return result;
}

/**
 * Mencari huruf kode guru berikutnya yang belum digunakan (A, B, C, ... Z, AA, AB, dst)
 */
export function getNextAvailableTeacherCode(existingCodes: string[]): string {
  const upperExisting = new Set(existingCodes.map(c => c.trim().toUpperCase()));
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < alphabet.length; i++) {
    const letter = alphabet[i];
    if (!upperExisting.has(letter)) return letter;
  }
  for (let i = 0; i < alphabet.length; i++) {
    for (let j = 0; j < alphabet.length; j++) {
      const pair = `${alphabet[i]}${alphabet[j]}`;
      if (!upperExisting.has(pair)) return pair;
    }
  }
  return `G${existingCodes.length + 1}`;
}

/**
 * Menghitung jam mengajar tatap muka per kelas dari jadwal aktif.
 * Mengembalikan map: fullCode -> { [className]: countJam }
 */
export function calculateHoursFromTimetable(
  timetable: TimetableDay[],
  classList: string[]
): Record<string, Record<string, number>> {
  const codeHours: Record<string, Record<string, number>> = {};

  timetable.forEach(day => {
    day.slots.forEach(slot => {
      if (slot.isBreak || slot.isSpecial || !slot.subjectCodes) return;
      classList.forEach(className => {
        const rawCode = slot.subjectCodes[className];
        if (!rawCode || rawCode === '-' || rawCode === 'KO') return;
        const code = rawCode.trim().toUpperCase();
        if (!codeHours[code]) {
          codeHours[code] = {};
        }
        codeHours[code][className] = (codeHours[code][className] || 0) + 1;
      });
    });
  });

  return codeHours;
}

/**
 * Menghasilkan data awal Tabel Pembagian Tugas Mengajar & Tugas Tambahan (BKG).
 * Menghitung jam per kelas secara live dan mencocokkan dengan guru yang bersangkutan.
 */
export function generateDefaultTeacherAssignments(
  teachers: TeacherMasterItem[] = MA_CIKARAMAS_TEACHERS,
  subjects: any[] = MA_CIKARAMAS_SUBJECTS,
  timetable: TimetableDay[] = MA_CIKARAMAS_TIMETABLE,
  classList: string[] = MA_CIKARAMAS_CLASSES.map(c => c.name)
): TeacherAssignmentRow[] {
  const codeHoursMap = calculateHoursFromTimetable(timetable, classList);
  const assignments: TeacherAssignmentRow[] = [];
  let rowCounter = 1;

  teachers.forEach(teacher => {
    // Cari semua mapel milik guru ini
    const teacherSubjects = subjects.filter(
      s => (s.teacherCode && s.teacherCode.toUpperCase() === teacher.code.toUpperCase()) ||
           (s.teacherName && s.teacherName.toLowerCase().includes(teacher.name.toLowerCase().split(',')[0]))
    );

    if (teacherSubjects.length === 0) {
      // Guru tanpa mapel di daftar subject presets
      const fullCode = teacher.derivedCodes?.[0] || teacher.code;
      const classHours: Record<string, number> = {};
      let totalTeaching = 0;
      classList.forEach(cls => {
        const h = codeHoursMap[fullCode]?.[cls] || 0;
        classHours[cls] = h;
        totalTeaching += h;
      });

      const addDuty = teacher.additionalDuty || '-';
      const addHours = teacher.additionalDutyHours || 0;
      const totalWorkload = totalTeaching + addHours;

      assignments.push({
        id: `ASSIGN-${teacher.code}-${rowCounter++}`,
        teacherNo: teacher.no,
        teacherCode: teacher.code,
        teacherName: teacher.name,
        nipNbm: teacher.nipNbm || `NBM. ${1281200 + teacher.no}`,
        rankGolongan: teacher.rankGolongan || 'GTY',
        subjectName: (teacher.subjectsSummary || []).join(', ') || 'Mata Pelajaran',
        fullCode,
        classHours,
        totalTeachingHours: totalTeaching,
        isLinear: true,
        additionalDuty: addDuty,
        additionalDutyHours: addHours,
        totalWorkloadHours: totalWorkload,
        meetsCertification: totalWorkload >= 24,
        notes: totalWorkload >= 24 ? 'Memenuhi Beban TPG' : 'Kurang dari 24 Jam'
      });
    } else {
      teacherSubjects.forEach((sub, subIdx) => {
        const fullCode = sub.code;
        const classHours: Record<string, number> = {};
        let totalTeaching = 0;
        classList.forEach(cls => {
          const h = codeHoursMap[fullCode]?.[cls] || 0;
          classHours[cls] = h;
          totalTeaching += h;
        });

        // Hanya baris pertama guru yang mencatat tugas tambahan agar tidak terhitung dobel
        const isFirst = subIdx === 0;
        const isLinear = teacher.linearSubjects && teacher.linearSubjects.length > 0
          ? teacher.linearSubjects.includes(sub.name)
          : isFirst; // Default: mapel pertama adalah mapel linier
        const addDuty = isFirst ? (teacher.additionalDuty || '-') : '-';
        const addHours = isFirst ? (teacher.additionalDutyHours || 0) : 0;
        const totalWorkload = totalTeaching + addHours;

        assignments.push({
          id: `ASSIGN-${sub.code}-${rowCounter++}`,
          teacherNo: teacher.no,
          teacherCode: teacher.code,
          teacherName: teacher.name,
          nipNbm: teacher.nipNbm || `NBM. ${1281200 + teacher.no}`,
          rankGolongan: teacher.rankGolongan || 'GTY',
          subjectName: sub.name,
          fullCode,
          classHours,
          totalTeachingHours: totalTeaching,
          isLinear,
          additionalDuty: addDuty,
          additionalDutyHours: addHours,
          totalWorkloadHours: totalWorkload,
          meetsCertification: totalWorkload >= 24,
          notes: totalWorkload >= 24 ? 'Memenuhi Beban TPG' : 'Perlu Tambahan Jam'
        });
      });
    }
  });

  return assignments;
}

