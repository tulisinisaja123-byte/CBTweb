import * as XLSX from 'xlsx';
import { ClassItem, User, Exam } from '../types';

/**
 * Downloads a pre-formatted Excel template for importing Students (Siswa)
 */
export function downloadStudentTemplate(availableClasses: ClassItem[] = []) {
  const workbook = XLSX.utils.book_new();

  // Sample classes to show in examples
  const sampleClass1 = availableClasses[0]?.NAME || 'X-MIPA-1';
  const sampleClass2 = availableClasses[1]?.NAME || 'X-MIPA-2';
  const sampleClass3 = availableClasses[2]?.NAME || 'XI-MIPA-1';

  // 1. DATA_SISWA Sheet
  const sampleData = [
    {
      NIS: '20260101',
      NAMA_LENGKAP: 'Ipid Abdul Hapid, S.Pd.',
      EMAIL: 'ipid.siswa@masmuhammadiyahcikaramas.sch.id',
      PASSWORD: 'Password123!',
      KELAS: sampleClass1,
      STATUS_AKTIF: 'AKTIF'
    }
  ];

  const studentSheet = XLSX.utils.json_to_sheet(sampleData);
  studentSheet['!cols'] = [
    { wch: 16 }, // NIS
    { wch: 30 }, // NAMA_LENGKAP
    { wch: 32 }, // EMAIL
    { wch: 18 }, // PASSWORD
    { wch: 20 }, // KELAS
    { wch: 16 }  // STATUS_AKTIF
  ];
  XLSX.utils.book_append_sheet(workbook, studentSheet, 'DATA_SISWA');

  // 2. DAFTAR_KELAS_REFERENSI Sheet
  const classReferenceData = (availableClasses.length > 0
    ? availableClasses
    : [
        { ID: 'KLS-10-IPA1', NAME: 'X-MIPA-1', LEVEL: 'X', HOMEROOM: 'Dra. Nurhayati, M.Pd.' },
        { ID: 'KLS-10-IPA2', NAME: 'X-MIPA-2', LEVEL: 'X', HOMEROOM: 'Bambang Sudibyo, S.Pd.' },
        { ID: 'KLS-11-IPA1', NAME: 'XI-MIPA-1', LEVEL: 'XI', HOMEROOM: 'Siti Rahmawati, M.Si.' }
      ]
  ).map(c => ({
    NAMA_KELAS: c.NAME,
    KODE_ID_KELAS: c.ID,
    TINGKAT: c.LEVEL || '-',
    WALI_KELAS: c.HOMEROOM || '-'
  }));

  const classSheet = XLSX.utils.json_to_sheet(classReferenceData);
  classSheet['!cols'] = [
    { wch: 22 }, // NAMA_KELAS
    { wch: 20 }, // KODE_ID_KELAS
    { wch: 12 }, // TINGKAT
    { wch: 32 }  // WALI_KELAS
  ];
  XLSX.utils.book_append_sheet(workbook, classSheet, 'REFERENSI_KELAS');

  // 3. PETUNJUK_PENGISIAN Sheet
  const instructions = [
    { NO: 1, ATURAN: 'Kolom Wajib', KETERANGAN: 'Kolom NIS dan NAMA_LENGKAP wajib diisi untuk setiap baris siswa.' },
    { NO: 2, ATURAN: 'Username Akun', KETERANGAN: 'Nilai NIS otomatis menjadi Username login bagi siswa (misal: 20260101).' },
    { NO: 3, ATURAN: 'Format Kelas', KETERANGAN: 'Isi kolom KELAS dengan nama kelas yang sesuai di sheet REFERENSI_KELAS (contoh: X-MIPA-1).' },
    { NO: 4, ATURAN: 'Kata Sandi Default', KETERANGAN: 'Jika kolom PASSWORD dikosongkan, sistem menetapkan password default "Welcome123!".' },
    { NO: 5, ATURAN: 'Status Aktif', KETERANGAN: 'Isi dengan "AKTIF" atau "TRUE" agar siswa dapat langsung login dan mengerjakan ujian.' },
    { NO: 6, ATURAN: 'Baris Contoh', KETERANGAN: 'Anda dapat menghapus atau mengganti baris contoh di sheet DATA_SISWA dengan data siswa asli Anda.' }
  ];

  const guideSheet = XLSX.utils.json_to_sheet(instructions);
  guideSheet['!cols'] = [
    { wch: 8 },  // NO
    { wch: 22 }, // ATURAN
    { wch: 80 }  // KETERANGAN
  ];
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'PETUNJUK');

  // Generate and download
  XLSX.writeFile(workbook, `Template_Import_Siswa_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Downloads a pre-formatted Excel template for importing Teachers (Guru)
 */
export function downloadTeacherTemplate() {
  const workbook = XLSX.utils.book_new();

  // 1. DATA_GURU Sheet
  const sampleData = [
    {
      NIP: '198503152010011005',
      NAMA_LENGKAP: 'Ipid Abdul Hapid, S.Pd.',
      KODE_GURU: 'T',
      EMAIL: 'ipid.hapid@masmuhammadiyahcikaramas.sch.id',
      PASSWORD: 'PasswordGuru123!',
      ROLE: 'TEACHER',
      STATUS_AKTIF: 'AKTIF'
    },
    {
      NIP: '197908122005012003',
      NAMA_LENGKAP: 'Ai Sukaesih, S.Pd',
      KODE_GURU: 'A',
      EMAIL: 'ai.sukaesih@masmuhammadiyahcikaramas.sch.id',
      PASSWORD: 'PasswordGuru123!',
      ROLE: 'TEACHER',
      STATUS_AKTIF: 'AKTIF'
    }
  ];

  const teacherSheet = XLSX.utils.json_to_sheet(sampleData);
  teacherSheet['!cols'] = [
    { wch: 24 }, // NIP
    { wch: 34 }, // NAMA_LENGKAP
    { wch: 14 }, // KODE_GURU
    { wch: 32 }, // EMAIL
    { wch: 20 }, // PASSWORD
    { wch: 14 }, // ROLE
    { wch: 16 }  // STATUS_AKTIF
  ];
  XLSX.utils.book_append_sheet(workbook, teacherSheet, 'DATA_GURU');

  // 2. PETUNJUK_PENGISIAN Sheet
  const instructions = [
    { NO: 1, ATURAN: 'Kolom Wajib', KETERANGAN: 'Kolom NIP (atau Username) dan NAMA_LENGKAP wajib diisi untuk setiap guru.' },
    { NO: 2, ATURAN: 'Kode Guru di Jadwal', KETERANGAN: 'Isi kolom KODE_GURU dengan kode huruf unik (A s/d T). Jika dikosongkan, sistem akan menetapkannya secara otomatis.' },
    { NO: 3, ATURAN: 'Username Login', KETERANGAN: 'NIP akan digunakan sebagai username saat login ke portal guru.' },
    { NO: 4, ATURAN: 'Nama & Gelar', KETERANGAN: 'Tuliskan nama lengkap beserta gelar akademik untuk keperluan cetak rapor dan pengawas ujian.' },
    { NO: 5, ATURAN: 'Role Akun', KETERANGAN: 'Tetapkan kolom ROLE dengan nilai "TEACHER" agar mendapatkan hak akses guru.' },
    { NO: 6, ATURAN: 'Kata Sandi Default', KETERANGAN: 'Jika kolom PASSWORD kosong, sistem menetapkan password bawaan "Welcome123!".' },
    { NO: 7, ATURAN: 'Status Aktif', KETERANGAN: 'Isi dengan "AKTIF" atau "TRUE" agar akun guru langsung aktif.' }
  ];

  const guideSheet = XLSX.utils.json_to_sheet(instructions);
  guideSheet['!cols'] = [
    { wch: 8 },  // NO
    { wch: 22 }, // ATURAN
    { wch: 80 }  // KETERANGAN
  ];
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'PETUNJUK');

  // Generate and download
  XLSX.writeFile(workbook, `Template_Import_Guru_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Downloads a pre-formatted Excel template for importing Bank Soal (Questions)
 * Supports all question types: PG (MCQ), PG Kompleks (COMPLEX_MCQ), Benar/Salah (TRUE_FALSE),
 * Menjodohkan (MATCHING), Isian Singkat (SHORT_ANSWER), and Esai (ESSAY).
 */
export function downloadQuestionsTemplate(
  examsOrId: Exam[] | string = 'UJN-CONTOH',
  defaultExamIdOrTitle: string = 'Contoh Ujian'
) {
  const workbook = XLSX.utils.book_new();

  let targetExamId = 'UJN-01';
  let availableExams: Exam[] = [];

  if (Array.isArray(examsOrId)) {
    availableExams = examsOrId;
    targetExamId = defaultExamIdOrTitle && defaultExamIdOrTitle !== 'ALL' ? defaultExamIdOrTitle : (availableExams[0]?.ID || 'UJN-01');
  } else if (typeof examsOrId === 'string' && examsOrId.trim()) {
    targetExamId = examsOrId;
  }

  const sampleData = [
    {
      ID_UJIAN: targetExamId,
      TIPE_SOAL: 'MCQ',
      PERTANYAAN: 'Hasil dari perhitungan 25 × 14 - 150 adalah ...',
      OPSI_A: '150',
      OPSI_B: '200',
      OPSI_C: '250',
      OPSI_D: '300',
      OPSI_E: '350',
      KUNCI_JAWABAN: 'B',
      BOBOT_POIN: 10
    },
    {
      ID_UJIAN: targetExamId,
      TIPE_SOAL: 'COMPLEX_MCQ',
      PERTANYAAN: 'Pernyataan mana sajakah yang BENAR mengenai fotosintesis tumbuhan? (Pilihan Ganda Kompleks)',
      OPSI_A: 'Memerlukan energi cahaya matahari',
      OPSI_B: 'Menghasilkan gas oksigen (O2)',
      OPSI_C: 'Hanya berlangsung saat malam gelap',
      OPSI_D: 'Memerlukan karbondioksida (CO2) dan air',
      OPSI_E: 'Menghasilkan gas karbon monoksida',
      KUNCI_JAWABAN: 'A, B, D',
      BOBOT_POIN: 15
    },
    {
      ID_UJIAN: targetExamId,
      TIPE_SOAL: 'TRUE_FALSE',
      PERTANYAAN: 'Paus dan lumba-lumba merupakan mamalia laut yang bernapas menggunakan paru-paru.',
      OPSI_A: 'Benar',
      OPSI_B: 'Salah',
      OPSI_C: '',
      OPSI_D: '',
      OPSI_E: '',
      KUNCI_JAWABAN: 'BENAR',
      BOBOT_POIN: 10
    },
    {
      ID_UJIAN: targetExamId,
      TIPE_SOAL: 'MATCHING',
      PERTANYAAN: 'Jodohkan istilah berikut: 1. Barometer, 2. Anemometer, 3. Higrometer',
      OPSI_A: 'A. Kelembaban udara',
      OPSI_B: 'B. Tekanan udara',
      OPSI_C: 'C. Kecepatan angin',
      OPSI_D: '',
      OPSI_E: '',
      KUNCI_JAWABAN: '1-B; 2-C; 3-A',
      BOBOT_POIN: 15
    },
    {
      ID_UJIAN: targetExamId,
      TIPE_SOAL: 'SHORT_ANSWER',
      PERTANYAAN: 'Ibu kota negara Jepang yang merupakan pusat pemerintahan adalah ...',
      OPSI_A: '',
      OPSI_B: '',
      OPSI_C: '',
      OPSI_D: '',
      OPSI_E: '',
      KUNCI_JAWABAN: 'Tokyo',
      BOBOT_POIN: 10
    },
    {
      ID_UJIAN: targetExamId,
      TIPE_SOAL: 'ESSAY',
      PERTANYAAN: 'Jelaskan perbedaan mendasar antara peredaran darah besar dan peredaran darah kecil pada manusia!',
      OPSI_A: '',
      OPSI_B: '',
      OPSI_C: '',
      OPSI_D: '',
      OPSI_E: '',
      KUNCI_JAWABAN: 'Rubrik: Sirkulasi sistemik (jantung ke seluruh tubuh) vs pulmonal (jantung ke paru-paru).',
      BOBOT_POIN: 20
    }
  ];

  const sheet = XLSX.utils.json_to_sheet(sampleData);
  sheet['!cols'] = [
    { wch: 18 }, // ID_UJIAN
    { wch: 16 }, // TIPE_SOAL
    { wch: 65 }, // PERTANYAAN
    { wch: 25 }, // OPSI_A
    { wch: 25 }, // OPSI_B
    { wch: 25 }, // OPSI_C
    { wch: 25 }, // OPSI_D
    { wch: 25 }, // OPSI_E
    { wch: 18 }, // KUNCI_JAWABAN
    { wch: 12 }  // BOBOT_POIN
  ];
  XLSX.utils.book_append_sheet(workbook, sheet, 'BANK_SOAL');

  // Sheet 2: REFERENSI_UJIAN (if available)
  if (availableExams.length > 0) {
    const examRefData = availableExams.map(e => ({
      ID_UJIAN: e.ID,
      JUDUL_UJIAN: e.TITLE,
      ID_KELAS: e.CLASS_ID || 'Semua Kelas',
      DURASI_MENIT: e.DURATION_MIN || 60
    }));
    const examSheet = XLSX.utils.json_to_sheet(examRefData);
    examSheet['!cols'] = [
      { wch: 18 },
      { wch: 38 },
      { wch: 16 },
      { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(workbook, examSheet, 'REFERENSI_UJIAN');
  }

  // Petunjuk tipe soal
  const guideData = [
    { NO: 1, TIPE: 'MCQ (Pilihan Ganda)', CONTOH_KUNCI: 'A, B, C, D, atau E', KETERANGAN: 'Pilihan ganda biasa dengan satu kunci jawaban benar.' },
    { NO: 2, TIPE: 'COMPLEX_MCQ (PG Kompleks)', CONTOH_KUNCI: 'A, B, D', KETERANGAN: 'Siswa dapat memilih lebih dari satu jawaban benar (dipisah koma).' },
    { NO: 3, TIPE: 'TRUE_FALSE (Benar/Salah)', CONTOH_KUNCI: 'BENAR atau SALAH', KETERANGAN: 'Pernyataan benar atau salah.' },
    { NO: 4, TIPE: 'MATCHING (Menjodohkan)', CONTOH_KUNCI: '1-B; 2-C; 3-A', KETERANGAN: 'Pasangan premis (1, 2, 3) dan pilihan respon (A, B, C).' },
    { NO: 5, TIPE: 'SHORT_ANSWER (Isian Singkat)', CONTOH_KUNCI: 'Tokyo', KETERANGAN: 'Kata kunci singkat yang dicocokkan otomatis oleh sistem.' },
    { NO: 6, TIPE: 'ESSAY (Uraian)', CONTOH_KUNCI: 'Rubrik penilaian', KETERANGAN: 'Jawaban esai terbuka yang dinilai manual oleh guru.' }
  ];

  const guideSheet = XLSX.utils.json_to_sheet(guideData);
  guideSheet['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 24 },
    { wch: 65 }
  ];
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'PANDUAN_TIPE_SOAL');

  XLSX.writeFile(workbook, `Template_Import_Soal_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Downloads a pre-formatted Excel template for importing Classes (Kelas)
 * Includes homeroom teacher references from registered teachers
 */
export function downloadClassTemplate(availableTeachers: User[] = []) {
  const workbook = XLSX.utils.book_new();

  const teachers = availableTeachers.filter(u => u.ROLE === 'TEACHER');
  const sampleTeacher1 = teachers[0]?.NAME || 'Ipid Abdul Hapid, S.Pd.';

  // 1. DATA_KELAS Sheet
  const sampleData = [
    {
      NAMA_KELAS: 'X-MAS-1',
      TINGKAT: 'X',
      WALI_KELAS: sampleTeacher1,
      STATUS_AKTIF: 'AKTIF'
    }
  ];

  const classSheet = XLSX.utils.json_to_sheet(sampleData);
  classSheet['!cols'] = [
    { wch: 20 }, // NAMA_KELAS
    { wch: 12 }, // TINGKAT
    { wch: 32 }, // WALI_KELAS
    { wch: 16 }  // STATUS_AKTIF
  ];
  XLSX.utils.book_append_sheet(workbook, classSheet, 'DATA_KELAS');

  // 2. REFERENSI_GURU Sheet
  const teacherReferenceData = (teachers.length > 0
    ? teachers
    : [
        { NAME: 'Ipid Abdul Hapid, S.Pd.', USERNAME: '198205122008011012', EMAIL: 'ipid.hapid@masmuhammadiyahcikaramas.sch.id' }
      ]
  ).map(t => ({
    NAMA_GURU: t.NAME,
    NIP_USERNAME: t.USERNAME || '-',
    EMAIL: t.EMAIL || '-'
  }));

  const teacherSheet = XLSX.utils.json_to_sheet(teacherReferenceData);
  teacherSheet['!cols'] = [
    { wch: 32 }, // NAMA_GURU
    { wch: 22 }, // NIP_USERNAME
    { wch: 30 }  // EMAIL
  ];
  XLSX.utils.book_append_sheet(workbook, teacherSheet, 'REFERENSI_GURU');

  // 3. PETUNJUK Sheet
  const instructions = [
    { NO: 1, ATURAN: 'Kolom Wajib', KETERANGAN: 'Kolom NAMA_KELAS dan TINGKAT wajib diisi untuk setiap kelas.' },
    { NO: 2, ATURAN: 'Wali Kelas dari Data Guru', KETERANGAN: 'Kolom WALI_KELAS dapat diisi nama lengkap atau NIP/username guru yang terdaftar di sheet REFERENSI_GURU.' },
    { NO: 3, ATURAN: 'Format Tingkat', KETERANGAN: 'Isi tingkat kelas dengan format umum seperti X, XI, atau XII.' },
    { NO: 4, ATURAN: 'Status Aktif', KETERANGAN: 'Isi dengan "AKTIF" atau "TRUE" agar kelas langsung aktif dalam sistem.' }
  ];

  const guideSheet = XLSX.utils.json_to_sheet(instructions);
  guideSheet['!cols'] = [
    { wch: 8 },
    { wch: 25 },
    { wch: 80 }
  ];
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'PETUNJUK');

  XLSX.writeFile(workbook, `Template_Import_Kelas_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
