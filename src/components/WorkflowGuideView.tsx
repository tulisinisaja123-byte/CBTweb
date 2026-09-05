import React, { useState, useEffect } from 'react';
import {
  Compass,
  CheckCircle2,
  Circle,
  ArrowRight,
  Printer,
  FileText,
  HelpCircle,
  Calendar,
  CreditCard,
  Activity,
  ClipboardCheck,
  FileCheck2,
  Users,
  GraduationCap,
  BookOpen,
  Settings,
  Search,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Download,
  RotateCcw,
  Check
} from 'lucide-react';
import { User } from '../types';

interface WorkflowGuideViewProps {
  user: User;
  onNavigate: (page: string) => void;
}

interface WorkflowStep {
  id: string;
  stepNumber: number;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'ALL';
  roleLabel: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  inputs: string[];
  outputs: string[];
  targetPage?: string;
  targetButtonLabel?: string;
  tips: string;
  badge: string;
  category: 'SETUP' | 'CONTENT' | 'SCHEDULE' | 'DOCS' | 'EXAM' | 'GRADING';
}

const ALL_STEPS: WorkflowStep[] = [
  // 1. SETUP MASTER
  {
    id: 'step-settings',
    stepNumber: 1,
    role: 'ADMIN',
    roleLabel: 'Administrator',
    category: 'SETUP',
    title: 'Konfigurasi Identitas Madrasah & KOP Dokumen',
    shortDesc: 'Atur profil sekolah, NSM, NPSN, nama Kepala Madrasah, semester, dan logo resmi.',
    fullDesc: 'Langkah pertama sebelum memulai seluruh operasional sistem. Identitas ini otomatis digunakan untuk Kop Surat resmi kartu ujian, daftar hadir, berita acara, serta dokumen SK pembagian tugas.',
    inputs: ['Nama Madrasah: MAS MUHAMMADIYAH CIKARAMAS', 'NPSN & NSM', 'Nama & NIP Kepala Madrasah', 'Tahun Ajaran & Semester Aktif'],
    outputs: ['KOP surat otomatis di semua cetak dokumen', 'Format identitas resmi sistem'],
    targetPage: 'settings',
    targetButtonLabel: 'Buka Pengaturan Madrasah',
    tips: 'Pastikan NIP dan nama Kepala Madrasah sudah benar karena langsung tercantum pada lembar tanda tangan dokumen.',
    badge: 'Fondasi Utama'
  },
  {
    id: 'step-data-master',
    stepNumber: 2,
    role: 'ADMIN',
    roleLabel: 'Administrator',
    category: 'SETUP',
    title: 'Input & Import Data Dasar (Siswa, Guru, Kelas, Mapel)',
    shortDesc: 'Kelola rombel kelas, akun siswa per kelas, data pengajar, mata pelajaran, dan jenis penilaian.',
    fullDesc: 'Data master adalah acuan bagi seluruh modul lain. Administrator dapat mengimpor data siswa dan guru sekaligus dari file Excel (.xlsx) menggunakan template yang sudah disediakan.',
    inputs: ['Daftar Siswa & Rombel (X-A, XI-IPA, XII-IPS)', 'Daftar Guru Pengampu & Kode Inisial', 'Daftar Mata Pelajaran & KKM', 'Master Jenis Penilaian (SAS, STS, AM)'],
    outputs: ['Akun login siswa & guru', 'Database kurikulum madrasah'],
    targetPage: 'students',
    targetButtonLabel: 'Kelola Data Siswa',
    tips: 'Gunakan fitur "Unduh Template Excel Siswa" di halaman Data Siswa untuk memasukkan puluhan siswa dalam satu kali klik import.',
    badge: 'Wajib Lengkap'
  },
  {
    id: 'step-timetable',
    stepNumber: 3,
    role: 'ADMIN',
    roleLabel: 'Administrator',
    category: 'SCHEDULE',
    title: 'Penyusunan Jadwal KBM & SK Beban Kerja Guru (BKG)',
    shortDesc: 'Petakan jadwal harian pelajaran, slot jam, serta pantau pemenuhan jam sertifikasi (≥24 jam).',
    fullDesc: 'Modul ini menyusun jadwal mingguan pembelajaran serta secara otomatis menghitung beban jam masing-masing guru pengampu untuk SK pembagian tugas dan matriks jadwal madrasah yang siap cetak.',
    inputs: ['Alokasi jam per mata pelajaran', 'Ketersediaan ruangan & waktu mengajar guru', 'Batasan jam per hari (Senin - Sabtu)'],
    outputs: ['Matriks Jadwal Pelajaran Mingguan', 'SK Beban Kerja Guru (BKG) Resmi', 'Indikator Pemenuhan Jam Sertifikasi (≥ 24 Jam)'],
    targetPage: 'timetable',
    targetButtonLabel: 'Buka Jadwal Pelajaran & BKG',
    tips: 'Gunakan tombol "Cetak SK & Matriks" untuk langsung menghasilkan berkas administrasi ber-KOP resmi siap tanda tangan.',
    badge: 'Administrasi KBM'
  },
  // 2. CONTENT & BANK SOAL
  {
    id: 'step-question-bank',
    stepNumber: 4,
    role: 'TEACHER',
    roleLabel: 'Guru Pengampu',
    category: 'CONTENT',
    title: 'Penyusunan & Penulisan Bank Soal CBT (6 Tipe Soal)',
    shortDesc: 'Guru membuat dan mengelola butir soal ujian dengan dukungan rumus matematika, gambar, dan 6 variasi soal.',
    fullDesc: 'Guru pengampu memiliki hak akses khusus untuk menyusun naskah soal. Sistem mendukung: 1) Pilihan Ganda Biasa, 2) Pilihan Ganda Kompleks (multi jawaban), 3) Benar / Salah, 4) Menjodohkan (Matching), 5) Isian Singkat, dan 6) Uraian / Esai.',
    inputs: ['Naskah soal & kunci jawaban', 'Gambar/diagram pendukung jika ada', 'Bobot nilai dan rubrik penskoran esai'],
    outputs: ['Paket Bank Soal CBT Digital', 'Database butir soal terstandarisasi'],
    targetPage: 'questions',
    targetButtonLabel: 'Buka Bank Soal (Buat Soal)',
    tips: 'Untuk soal esai/uraian, sertakan pedoman kunci jawaban pada kolom rubrik agar memudahkan proses koreksi di tahap evaluasi.',
    badge: 'Tugas Utama Guru'
  },
  {
    id: 'step-import-word-excel',
    stepNumber: 5,
    role: 'TEACHER',
    roleLabel: 'Guru Pengampu',
    category: 'CONTENT',
    title: 'Import Cepat Naskah Soal dari File Word (.docx) & Excel (.xlsx)',
    shortDesc: 'Ketik soal di Microsoft Word secara offline, lalu unggah file .docx untuk konversi instan.',
    fullDesc: 'Guru tidak perlu mengetik ulang soal satu per satu. Cukup unduh Template Naskah Word resmi yang disediakan sistem, ketik soal beserta opsi A-E dan kunci jawaban, lalu klik Import Soal Word untuk mengekstrak seluruh soal dalam hitungan detik.',
    inputs: ['File Microsoft Word (.docx) format resmi', 'Atau file Microsoft Excel (.xlsx)'],
    outputs: ['Puluhan butir soal terunggah otomatis', 'Kunci jawaban terdeteksi presisi'],
    targetPage: 'questions',
    targetButtonLabel: 'Akses Import Naskah Soal',
    tips: 'Klik "Unduh Template Soal Word" di halaman Bank Soal untuk melihat pedoman penulisan naskah yang kompatibel dengan sistem parser.',
    badge: 'Fitur Unggulan'
  },
  // 3. EXAM SCHEDULE & TICKETS
  {
    id: 'step-exam-schedule',
    stepNumber: 6,
    role: 'ADMIN',
    roleLabel: 'Administrator / Panitia',
    category: 'SCHEDULE',
    title: 'Penjadwalan Pelaksanaan Ujian CBT & Sesi Ruang',
    shortDesc: 'Tentukan tanggal ujian, durasi menit, sesi ruang, pengawas, dan opsi acak butir soal.',
    fullDesc: 'Administrator atau Panitia Asesmen mengatur sesi ujian. Anda juga dapat menggunakan tombol "Generator Jadwal (1-Klik)" untuk otomatis menyusun paket jadwal sepekan penuh lengkap dengan pembagian sesi 1, 2, dan 3.',
    inputs: ['Paket bank soal yang sudah disiapkan guru', 'Rombel kelas peserta', 'Durasi waktu pengerjaan (misal 90 menit)', 'Toleransi pelanggaran pindah tab (Max Violations)'],
    outputs: ['Jadwal CBT Aktif', 'Kesiapan sistem untuk ujian siswa'],
    targetPage: 'exams',
    targetButtonLabel: 'Kelola Jadwal Ujian CBT',
    tips: 'Aktifkan fitur "Acak Soal" untuk mengacak nomor urut butir soal pada masing-masing perangkat siswa guna meminimalisir contek-mencontek.',
    badge: 'Pengaturan Sesi'
  },
  {
    id: 'step-print-documents',
    stepNumber: 7,
    role: 'ADMIN',
    roleLabel: 'Administrator / Panitia',
    category: 'DOCS',
    title: 'Cetak Dokumen Resmi Ujian (Kartu, Daftar Hadir, Berita Acara)',
    shortDesc: 'Cetak perlengkapan ujian madrasah resmi: Kartu Peserta berfoto/QR, Daftar Hadir, & Berita Acara.',
    fullDesc: 'Sistem menyediakan 3 jenis cetak dokumen resmi ber-KOP otomatis yang siap diprint atau disimpan sebagai PDF: 1) Kartu Peserta Siswa lengkap dengan username/password & jadwal mapel, 2) Daftar Hadir Peserta per ruang & sesi, 3) Berita Acara Pelaksanaan Ujian.',
    inputs: ['Pilihan Rombel Kelas atau Jadwal Ujian', 'Format Kertas (A4 / F4)'],
    outputs: ['Kartu Peserta Ujian per Siswa', 'Daftar Presensi Tanda Tangan', 'Lembar Berita Acara Pelaksanaan'],
    targetPage: 'printCards',
    targetButtonLabel: 'Cetak Kartu Peserta',
    tips: 'Bagikan Kartu Peserta kepada siswa 1-2 hari sebelum ujian agar siswa dapat memverifikasi username dan jadwal ujiannya.',
    badge: 'Dokumen Fisik'
  },
  // 4. EXAM EXECUTION & MONITORING
  {
    id: 'step-student-taking',
    stepNumber: 8,
    role: 'STUDENT',
    roleLabel: 'Siswa Peserta',
    category: 'EXAM',
    title: 'Pelaksanaan Ujian Siswa (Mode CBT Lockdown Anti-Curang)',
    shortDesc: 'Siswa login dengan akun kartu ujian, memilih jadwal aktif, dan mengerjakan dengan timer terproteksi.',
    fullDesc: 'Antarmuka pengerjaan ujian ramah gawai (HP, Tablet, Laptop) dengan proteksi anti-curang. Fitur: Timer hitung mundur, navigasi nomor cepat, tanda ragu-ragu kuning, auto-save jawaban instan, dan pencatatan pelanggaran jika berpindah tab browser.',
    inputs: ['Username / NIS & Password dari Kartu Peserta', 'Perangkat browser (Chrome/Edge/Safari/Mobile)'],
    outputs: ['Jawaban siswa tersimpan otomatis', 'Status pengerjaan selesai'],
    targetPage: 'availableExams',
    targetButtonLabel: 'Buka Daftar Ujian Siswa',
    tips: 'Gunakan tombol "Tandai Ragu-Ragu" untuk soal yang belum pasti agar mudah ditemukan kembali melalui nomor peta soal sebelum waktu habis.',
    badge: 'Ujian Realtime'
  },
  {
    id: 'step-live-monitoring',
    stepNumber: 9,
    role: 'ADMIN',
    roleLabel: 'Panitia & Pengawas',
    category: 'EXAM',
    title: 'Live Monitoring Pengawas & Kendali Gangguan Teknis',
    shortDesc: 'Pantau status pengerjaan seluruh peserta secara langsung, sisa waktu, dan deteksi kecurangan.',
    fullDesc: 'Pengawas ruang dan panitia dapat memantau ruang ujian secara realtime: siapa saja yang sedang aktif mengerjakan, sisa waktu, indikator pelanggaran pindah jendela, serta tombol darurat "Reset Login" jika siswa mengalami baterai habis atau browser tertutup.',
    inputs: ['Sesi ujian yang sedang berjalan'],
    outputs: ['Rekap aktivitas peserta real-time', 'Penanganan kendala teknis tanpa kehilangan jawaban'],
    targetPage: 'monitoring',
    targetButtonLabel: 'Buka Live Monitoring',
    tips: 'Jika siswa tidak sengaja menutup browser, pengawas cukup melakukan Reset Status pada Live Monitoring agar siswa dapat melanjutkan dari sisa waktu sebelumnya.',
    badge: 'Pengawasan Ruang'
  },
  // 5. EVALUATION & SCORING
  {
    id: 'step-essay-grading',
    stepNumber: 10,
    role: 'TEACHER',
    roleLabel: 'Guru Pengampu',
    category: 'GRADING',
    title: 'Pemeriksaan & Koreksi Soal Uraian / Esai Siswa',
    shortDesc: 'Guru memeriksa jawaban uraian dengan rubrik perbandingan kunci jawaban dan memberi skor 0-100.',
    fullDesc: 'Soal pilihan ganda, PG kompleks, benar/salah, menjodohkan, dan isian singkat diperiksa otomatis oleh sistem. Untuk soal uraian/esai, guru membuka menu Koreksi Uraian untuk meninjau jawaban dan menginputkan skor beserta catatan apresiasi.',
    inputs: ['Jawaban uraian siswa per butir soal', 'Rubrik kunci jawaban guru'],
    outputs: ['Skor esai tervalidasi', 'Nilai akhir ujian terakumulasi 100%'],
    targetPage: 'reviews',
    targetButtonLabel: 'Koreksi Soal Uraian',
    tips: 'Nilai akhir siswa akan otomatis diperbarui dan langsung masuk ke rekap nilai setelah guru menyimpan nilai esai.',
    badge: 'Penilaian Guru'
  },
  {
    id: 'step-results-export',
    stepNumber: 11,
    role: 'ADMIN',
    roleLabel: 'Admin & Guru',
    category: 'GRADING',
    title: 'Rekapitulasi Hasil Ujian, Analisis Butir, & Ekspor Nilai',
    shortDesc: 'Tinjau ledger nilai per rombel/mapel, persentase ketuntasan KKM, dan unduh laporan nilai dalam Excel.',
    fullDesc: 'Tahap penutup asesmen. Seluruh nilai ujian siswa dapat difilter berdasarkan kelas, mata pelajaran, dan tanggal pelaksanaan. Sistem menyediakan ringkasan nilai rata-rata, nilai tertinggi/terendah, status tuntas/belum tuntas, dan ekspor instan ke format spreadsheet untuk keperluan rapor.',
    inputs: ['Data hasil seluruh pengerjaan siswa'],
    outputs: ['Ledger Nilai Ujian Lengkap', 'File Excel Rekapitulasi Nilai', 'Analisis Ketuntasan Belajar Siswa'],
    targetPage: 'results',
    targetButtonLabel: 'Buka Hasil & Rekap Nilai',
    tips: 'Gunakan tombol "Export Excel" pada halaman Hasil Ujian untuk mengarsipkan rekapitulasi nilai per kelas secara rapi.',
    badge: 'Laporan Akhir'
  }
];

export const WorkflowGuideView: React.FC<WorkflowGuideViewProps> = ({ user, onNavigate }) => {
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | 'ADMIN' | 'TEACHER' | 'STUDENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [completedStepIds, setCompletedStepIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cbt_workflow_checklist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [expandedStepId, setExpandedStepId] = useState<string | null>('step-settings');
  const [isPrintSummaryModalOpen, setIsPrintSummaryModalOpen] = useState(false);

  // Synchronize completed checklist to local storage
  const toggleStepCompletion = (stepId: string) => {
    setCompletedStepIds(prev => {
      const exists = prev.includes(stepId);
      const updated = exists ? prev.filter(id => id !== stepId) : [...prev, stepId];
      try {
        localStorage.setItem('cbt_workflow_checklist', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleResetChecklist = () => {
    if (window.confirm('Reset seluruh tanda centang kemajuan pengerjaan?')) {
      setCompletedStepIds([]);
      try {
        localStorage.removeItem('cbt_workflow_checklist');
      } catch {
        // ignore
      }
    }
  };

  // Filter steps according to role and search term
  const filteredSteps = ALL_STEPS.filter(step => {
    const matchesRole =
      selectedRoleFilter === 'ALL' ||
      step.role === selectedRoleFilter ||
      (selectedRoleFilter === 'ADMIN' && (step.role === 'ADMIN' || step.role === 'ALL')) ||
      (selectedRoleFilter === 'TEACHER' && (step.role === 'TEACHER' || step.role === 'ALL')) ||
      (selectedRoleFilter === 'STUDENT' && (step.role === 'STUDENT' || step.role === 'ALL'));

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      step.title.toLowerCase().includes(q) ||
      step.shortDesc.toLowerCase().includes(q) ||
      step.tips.toLowerCase().includes(q) ||
      step.roleLabel.toLowerCase().includes(q);

    return matchesRole && matchesSearch;
  });

  const completionPercent = Math.round(
    (ALL_STEPS.filter(s => completedStepIds.includes(s.id)).length / ALL_STEPS.length) * 100
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* HERO HEADER */}
      <div className="bg-gradient-to-br from-white to-[#F8F9FA] border border-[#DEE2E6] rounded-2xl p-5 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E7F0FF] text-[#0052CC] border border-[#B3D1FF] text-xs font-semibold">
              <Compass className="w-3.5 h-3.5" />
              <span>Panduan & Alur Kerja Terstruktur</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1A1C1E] tracking-tight">
              Langkah Pengerjaan & Alur Aplikasi CBT
            </h1>
            <p className="text-xs sm:text-sm text-[#495057] leading-relaxed">
              Panduan operasional komprehensif mulai dari penataan Data Master Madrasah, Jadwal KBM & BKG, 
              Pembuatan Bank Soal, Penjadwalan CBT, Pengawasan Real-time, hingga Rekapitulasi Nilai Akhir.
            </p>
          </div>

          {/* PROGRESS TRACKER CARD */}
          <div className="shrink-0 bg-white border border-[#CED4DA] p-4 rounded-xl shadow-xs min-w-[240px] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1A1C1E]">Progress Persiapan</span>
              <span className="text-sm font-bold font-mono text-[#0052CC]">{completionPercent}%</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-[#0052CC] rounded-full transition-all duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#6C757D]">
              <span>{completedStepIds.length} dari {ALL_STEPS.length} tahap selesai</span>
              {completedStepIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetChecklist}
                  className="text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ROLE TABS & QUICK CONTROLS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 mt-6 border-t border-[#DEE2E6]">
          {/* Role Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedRoleFilter === 'ALL'
                  ? 'bg-white text-[#0052CC] shadow-xs'
                  : 'text-[#495057] hover:text-[#1A1C1E]'
              }`}
            >
              Semua Alur ({ALL_STEPS.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('ADMIN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedRoleFilter === 'ADMIN'
                  ? 'bg-white text-[#0052CC] shadow-xs'
                  : 'text-[#495057] hover:text-[#1A1C1E]'
              }`}
            >
              👑 Alur Panitia / Admin
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('TEACHER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedRoleFilter === 'TEACHER'
                  ? 'bg-white text-[#0052CC] shadow-xs'
                  : 'text-[#495057] hover:text-[#1A1C1E]'
              }`}
            >
              👨‍🏫 Alur Guru (Buat Soal)
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('STUDENT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedRoleFilter === 'STUDENT'
                  ? 'bg-white text-[#0052CC] shadow-xs'
                  : 'text-[#495057] hover:text-[#1A1C1E]'
              }`}
            >
              🎓 Alur Siswa (Peserta)
            </button>
          </div>

          {/* Search Box & Print SOP button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari langkah atau fitur..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#CED4DA] rounded-lg focus:outline-hidden focus:border-[#0052CC] text-[#1A1C1E]"
              />
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#CED4DA] hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
              title="Cetak format cetak lembar SOP panduan"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Cetak Panduan</span>
            </button>
          </div>
        </div>
      </div>

      {/* QUICK ROLE SUMMARY BADGES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0052CC] text-white flex items-center justify-center shrink-0 font-bold text-xs">
            1
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-900">Peran Administrator / Panitia</h4>
            <p className="text-[11px] text-blue-800/80 mt-0.5 leading-relaxed">
              Mengatur identitas sekolah, import data master, jadwal pelajaran BKG, jadwal CBT, cetak kartu & berita acara, serta live monitoring.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-xs">
            2
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-900">Peran Guru Pengampu</h4>
            <p className="text-[11px] text-emerald-800/80 mt-0.5 leading-relaxed">
              Fokus menyusun butir soal pada <b>Bank Soal</b> (6 variasi tipe soal), import soal langsung dari Microsoft Word (.docx), dan koreksi uraian siswa.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 font-bold text-xs">
            3
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-900">Peran Siswa Peserta</h4>
            <p className="text-[11px] text-amber-800/80 mt-0.5 leading-relaxed">
              Login dengan akun kartu peserta, memilih ujian aktif, mengerjakan dengan timer terkunci (Lockdown CBT), dan melihat hasil nilai akhir.
            </p>
          </div>
        </div>
      </div>

      {/* MASTER TIMELINE STEPS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-[#1A1C1E] flex items-center gap-2">
            <span>Daftar Urutan Langkah Pengerjaan</span>
            <span className="text-xs font-normal text-slate-500 font-mono">({filteredSteps.length} langkah)</span>
          </h2>
          <span className="text-[11px] text-slate-500">
            Klik pada kartu langkah untuk melihat detail masukan, keluaran, dan tips
          </span>
        </div>

        {filteredSteps.length === 0 ? (
          <div className="p-10 text-center bg-white border border-[#DEE2E6] rounded-xl space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-bold text-slate-700">Tidak ada langkah yang cocok dengan pencarian</div>
            <p className="text-xs text-slate-500">Coba gunakan kata kunci lain atau pilih filter "Semua Alur".</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSteps.map(step => {
              const isCompleted = completedStepIds.includes(step.id);
              const isExpanded = expandedStepId === step.id;

              const roleTagColor = {
                ADMIN: 'bg-blue-100 text-blue-800 border-blue-200',
                TEACHER: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                STUDENT: 'bg-amber-100 text-amber-800 border-amber-200',
                ALL: 'bg-purple-100 text-purple-800 border-purple-200'
              }[step.role];

              return (
                <div
                  key={step.id}
                  className={`bg-white border rounded-xl transition-all duration-200 shadow-2xs overflow-hidden ${
                    isCompleted ? 'border-emerald-300 bg-emerald-50/20' : 'border-[#DEE2E6] hover:border-slate-300'
                  }`}
                >
                  {/* Step Header Bar */}
                  <div className="p-4 sm:p-5 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1">
                      {/* Checkbox Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleStepCompletion(step.id)}
                        className={`mt-0.5 p-1 rounded-md transition-colors cursor-pointer shrink-0 ${
                          isCompleted
                            ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                            : 'text-slate-300 hover:text-slate-500'
                        }`}
                        title={isCompleted ? 'Tandai belum selesai' : 'Tandai tahap ini selesai'}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 fill-emerald-100" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      {/* Title & Badge */}
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-400">
                            LANGKAH {String(step.stepNumber).padStart(2, '0')}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleTagColor}`}>
                            {step.roleLabel}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {step.badge}
                          </span>
                        </div>

                        <h3
                          onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                          className={`text-sm sm:text-base font-bold cursor-pointer transition-colors ${
                            isCompleted ? 'text-emerald-950 line-through decoration-emerald-500' : 'text-[#1A1C1E] hover:text-[#0052CC]'
                          }`}
                        >
                          {step.title}
                        </h3>

                        <p className="text-xs text-[#6C757D] leading-relaxed">
                          {step.shortDesc}
                        </p>
                      </div>
                    </div>

                    {/* Expand/Collapse and Quick Action Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      {step.targetPage && (
                        <button
                          type="button"
                          onClick={() => onNavigate(step.targetPage!)}
                          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0052CC] hover:bg-[#0047B3] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <span>{step.targetButtonLabel || 'Buka Menu'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title={isExpanded ? 'Tutup rincian' : 'Buka rincian langkah'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Step Details */}
                  {isExpanded && (
                    <div className="px-4 pb-5 pt-1 sm:px-5 sm:pb-6 border-t border-slate-100 bg-slate-50/50 space-y-4 text-xs">
                      <p className="text-slate-700 leading-relaxed pt-2">
                        {step.fullDesc}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {/* Inputs Checklist */}
                        <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                          <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                            📥 Masukan & Persyaratan yang Disiapkan:
                          </span>
                          <ul className="space-y-1">
                            {step.inputs.map((inp, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 text-slate-600">
                                <span className="text-[#0052CC] font-bold">•</span>
                                <span>{inp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Outputs Checklist */}
                        <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                          <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                            📤 Hasil / Luaran yang Dihasilkan:
                          </span>
                          <ul className="space-y-1">
                            {step.outputs.map((outp, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 text-emerald-700 font-medium">
                                <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600 mt-0.5" />
                                <span>{outp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Tips Box */}
                      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-900">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <b className="font-semibold text-amber-950">Tips Pro: </b>
                          <span>{step.tips}</span>
                        </div>
                      </div>

                      {/* Mobile action button */}
                      {step.targetPage && (
                        <div className="pt-2 md:hidden">
                          <button
                            type="button"
                            onClick={() => onNavigate(step.targetPage!)}
                            className="w-full py-2 px-3 rounded-lg bg-[#0052CC] hover:bg-[#0047B3] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                          >
                            <span>{step.targetButtonLabel || 'Buka Menu'}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ARCHITECTURE DIAGRAM / FLOWCHART CARD */}
      <div className="bg-white border border-[#DEE2E6] rounded-2xl p-5 sm:p-7 shadow-xs space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#1A1C1E] flex items-center gap-2">
            <span>Peta Arsitektur Alur Sistem CBT</span>
            <span className="text-xs px-2 py-0.5 bg-blue-50 text-[#0052CC] border border-blue-200 font-semibold rounded">
              End-to-End Workflow
            </span>
          </h2>
          <p className="text-xs text-[#6C757D] mt-1">
            Hubungan integrasi modul data master, penyusunan soal, pengerjaan ujian, hingga rekapitulasi penilaian.
          </p>
        </div>

        {/* Diagram Flow Nodes */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          {/* Node 1 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 relative">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tahap 1: Persiapan</div>
            <div className="font-bold text-xs text-slate-900">Data Master & KBM</div>
            <p className="text-[11px] text-slate-600">
              Profil Madrasah, Siswa, Guru, Kelas, Jadwal Mengajar & SK BKG.
            </p>
            <div className="text-[10px] text-[#0052CC] font-semibold flex items-center gap-1">
              <span>Admin & Operator</span>
            </div>
          </div>

          {/* Node 2 */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2 relative">
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Tahap 2: Konten</div>
            <div className="font-bold text-xs text-emerald-950">Bank Soal & Word</div>
            <p className="text-[11px] text-emerald-800">
              Penyusunan 6 tipe soal CBT, rumus matematika, dan import dari file Word .docx.
            </p>
            <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
              <span>Guru Pengampu</span>
            </div>
          </div>

          {/* Node 3 */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2 relative">
            <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Tahap 3: Pelaksanaan</div>
            <div className="font-bold text-xs text-blue-950">Jadwal & CBT Lockdown</div>
            <p className="text-[11px] text-blue-800">
              Cetak Kartu Ujian, Siswa Mengerjakan CBT, dan Live Monitoring Pengawas.
            </p>
            <div className="text-[10px] text-blue-700 font-semibold flex items-center gap-1">
              <span>Admin, Siswa & Pengawas</span>
            </div>
          </div>

          {/* Node 4 */}
          <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2 relative">
            <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Tahap 4: Evaluasi</div>
            <div className="font-bold text-xs text-purple-950">Koreksi & Rekap Nilai</div>
            <p className="text-[11px] text-purple-800">
              Koreksi esai/uraian, analisis KKM, dan ekspor ledger nilai ke format Excel.
            </p>
            <div className="text-[10px] text-purple-700 font-semibold flex items-center gap-1">
              <span>Guru & Panitia</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
