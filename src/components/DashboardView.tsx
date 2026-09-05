import React from 'react';
import {
  Users,
  GraduationCap,
  BookOpen,
  HelpCircle,
  PlayCircle,
  RefreshCw,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { DashboardData, User } from '../types';

interface DashboardViewProps {
  user: User;
  dashboard: DashboardData;
  classNameHelper: (id: string) => string;
  onNavigate: (page: string) => void;
  onRefresh: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  dashboard,
  classNameHelper,
  onNavigate,
  onRefresh
}) => {
  const isStudent = user.ROLE === 'STUDENT';

  const stats = isStudent
    ? [
        {
          label: 'Ujian Tersedia',
          value: dashboard.stats.myAvailableExams,
          icon: PlayCircle,
          accent: 'text-[#0052CC]'
        },
        {
          label: 'Ujian Selesai',
          value: dashboard.stats.myCompletedExams,
          icon: CheckCircle2,
          accent: 'text-[#137333]'
        },
        {
          label: 'Kelas Saya',
          value: classNameHelper(user.CLASS_ID),
          icon: GraduationCap,
          accent: 'text-[#0052CC]',
          smallText: true
        },
        {
          label: 'Status Akun',
          value: 'Aktif Terverifikasi',
          icon: Users,
          accent: 'text-[#495057]',
          smallText: true
        }
      ]
    : [
        {
          label: 'Total Siswa',
          value: dashboard.stats.students,
          icon: Users,
          accent: 'text-[#0052CC]'
        },
        {
          label: 'Total Kelas',
          value: dashboard.stats.classes,
          icon: GraduationCap,
          accent: 'text-[#0052CC]'
        },
        {
          label: 'Total Jadwal Ujian',
          value: dashboard.stats.exams,
          icon: Calendar,
          accent: 'text-[#0052CC]'
        },
        {
          label: 'Total Bank Soal',
          value: dashboard.stats.questions,
          icon: HelpCircle,
          accent: 'text-[#0052CC]'
        }
      ];

  const currentDateFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]">Aktif</span>;
      case 'SCHEDULED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#E7F0FF] text-[#0052CC] border border-[#B3D1FF]">Terjadwal</span>;
      case 'DRAFT':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]">Draft</span>;
      case 'FINISHED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#F1F3F5] text-[#495057] border border-[#DEE2E6]">Selesai</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#F8F9FA] text-[#495057] border border-[#DEE2E6]">{status}</span>;
    }
  };

  const recent = dashboard.recentExams || [];
  const maxClassStudents = Math.max(...(dashboard.charts.classDistribution || []).map(c => c[1]), 1);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1C1E] tracking-tight">
            Selamat Datang, {user.NAME}!
          </h1>
          <p className="text-xs sm:text-sm text-[#6C757D] mt-1">
            {currentDateFormatted} • CBT MAS MUHAMMADIYAH CIKARAMAS
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isStudent ? (
            <button
              type="button"
              onClick={() => onNavigate('availableExams')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white font-medium text-xs shadow-xs transition-colors"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Lihat Jadwal Ujian Saya</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-[#CED4DA] text-[#1A1C1E] hover:bg-[#F8F9FA] font-medium text-xs transition-colors shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#6C757D]" />
                <span>Perbarui Data</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('monitoring')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white font-medium text-xs shadow-xs transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Live Monitoring ({dashboard.stats.activeAttempts})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-lg bg-white border border-[#DEE2E6] shadow-xs flex flex-col justify-between min-h-[105px]"
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider">
                  {s.label}
                </span>
                <div className="w-7 h-7 rounded-md bg-[#F8F9FA] border border-[#DEE2E6] flex items-center justify-center text-[#0052CC]">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className={`font-bold font-mono text-[#1A1C1E] tracking-tight ${s.smallText ? 'text-base mt-2' : 'text-2xl'}`}>
                {s.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Jadwal Pelajaran Tatap Muka Anti-Bentrok Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-[#0052CC] text-white rounded-lg p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-white/20 text-white font-bold text-[10px] uppercase tracking-wider">
              Jadwal Tatap Muka TP 2026/2027
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-200 text-[10px] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-300" />
              Anti-Bentrok Terverifikasi
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold tracking-tight">
            Jadwal Pelajaran & Matriks Guru (A s.d. T)
          </h3>
          <p className="text-xs text-blue-100 max-w-2xl">
            Struktur 7 Rombel (X.1–X.3, XI.1–XI.2, XII.1–XII.2) & mata pelajaran Kurikulum Madrasah Merdeka. Dilengkapi sistem deteksi jadwal bebas tabrakan jam guru.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('timetable')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-[#0052CC] hover:bg-blue-50 font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <CalendarDays className="w-4 h-4 text-[#0052CC]" />
            <span>Buka Jadwal Pelajaran</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Panduan & Langkah Pengerjaan Quick Banner */}
      <div className="bg-white border border-[#CED4DA] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#1A1C1E]">
                Panduan & Langkah Pengerjaan Aplikasi
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0052CC] font-bold text-[10px]">
                SOP Ujian
              </span>
            </div>
            <p className="text-xs text-[#6C757D] mt-0.5 max-w-xl">
              Pelajari urutan operasional pelaksanaan CBT: dari setup data master, pembuatan naskah soal Word, penjadwalan, cetak kartu, hingga rekap nilai.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('workflowGuide')}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#0052CC] hover:bg-[#0047B3] text-white font-semibold text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <span>Buka Langkah Pengerjaan</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid: Recent Exams & Class Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Exams Progress */}
        <div className="lg:col-span-2 bg-white border border-[#DEE2E6] rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#DEE2E6]">
            <div>
              <h3 className="text-sm font-bold text-[#1A1C1E]">Pelaksanaan Ujian Terbaru</h3>
              <p className="text-[11px] text-[#6C757D]">Tingkat penyelesaian siswa per jadwal ujian</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(isStudent ? 'availableExams' : 'exams')}
              className="text-xs font-semibold text-[#0052CC] hover:underline flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {recent.length > 0 ? (
              recent.slice(0, 5).map(item => (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="font-semibold text-[#1A1C1E] truncate max-w-[280px] sm:max-w-md">
                      {item.title}{' '}
                      <span className="text-[#6C757D] font-normal">• {item.subject} ({item.className})</span>
                    </div>
                    <div className="text-[11px] font-mono font-bold text-[#0052CC]">
                      {item.submitted}/{item.totalStudents} siswa ({item.completion}%)
                    </div>
                  </div>
                  <div className="h-2 w-full bg-[#F1F3F5] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0052CC] rounded-full transition-all duration-500"
                      style={{ width: `${item.completion}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-[#6C757D] text-xs">
                Belum ada data ujian yang aktif.
              </div>
            )}
          </div>
        </div>

        {/* Distribution / Summary */}
        <div className="bg-white border border-[#DEE2E6] rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#DEE2E6]">
              <h3 className="text-sm font-bold text-[#1A1C1E]">
                {isStudent ? 'Ringkasan Nilai & Ujian' : 'Distribusi Siswa per Kelas'}
              </h3>
            </div>

            {isStudent ? (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-md bg-[#F8F9FA] border border-[#DEE2E6]">
                  <div className="font-bold text-[#1A1C1E]">Tips CBT Sekolah:</div>
                  <ul className="list-disc list-inside mt-1.5 space-y-1 text-[#495057] text-[11px]">
                    <li>Gunakan mode layar penuh saat ujian.</li>
                    <li>Hindari membuka tab baru atau beralih jendela.</li>
                    <li>Jawaban disimpan otomatis secara real-time.</li>
                  </ul>
                </div>
                <div className="p-3.5 rounded-md bg-[#FEF7E0] border border-[#FEEFC3] text-[#B06000]">
                  <div className="font-bold">Batas Pelanggaran:</div>
                  <div className="text-[11px] mt-1">
                    Maksimal 3x peringatan sebelum sistem mengirimkan jawaban secara otomatis.
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboard.charts.classDistribution && dashboard.charts.classDistribution.length > 0 ? (
                  dashboard.charts.classDistribution.map(([clsName, count]) => {
                    const percentage = Math.round((count / maxClassStudents) * 100);
                    return (
                      <div key={clsName} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium text-[#1A1C1E]">
                          <span>{clsName}</span>
                          <span className="font-mono font-bold text-[#0052CC]">{count} siswa</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#F1F3F5] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0052CC] rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-center text-[#6C757D] py-6">
                    Belum ada data kelas.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-[#DEE2E6]">
            <button
              type="button"
              onClick={() => onNavigate(isStudent ? 'availableExams' : 'exams')}
              className="w-full py-2 px-3 rounded-md bg-[#F8F9FA] hover:bg-[#E9ECEF] border border-[#DEE2E6] text-[#0052CC] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{isStudent ? 'Mulai Ujian Sekarang' : 'Kelola Jadwal & Soal'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Table: Jadwal Ujian */}
      <div className="bg-white border border-[#DEE2E6] rounded-lg overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-[#DEE2E6] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#1A1C1E]">Jadwal Ujian Terdaftar</h3>
            <p className="text-[11px] text-[#6C757D]">Status terkini dan tanggal pelaksanaan</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(isStudent ? 'availableExams' : 'exams')}
            className="text-xs font-semibold text-[#0052CC] hover:underline"
          >
            Lihat Lengkap
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8F9FA] text-[#6C757D] uppercase text-[10px] font-bold tracking-wider border-b border-[#DEE2E6]">
              <tr>
                <th className="px-5 py-3">Nama Ujian</th>
                <th className="px-5 py-3">Mata Pelajaran</th>
                <th className="px-5 py-3">Kelas</th>
                <th className="px-5 py-3">Tanggal Pelaksanaan</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DEE2E6]">
              {recent.length > 0 ? (
                recent.map(item => (
                  <tr key={item.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-[#1A1C1E]">
                      {item.title}
                    </td>
                    <td className="px-5 py-3.5 text-[#495057]">{item.subject}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-[#F1F3F5] text-[#495057] border border-[#DEE2E6] font-mono font-medium text-[10px]">
                        {item.className}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#495057]">{item.date}</td>
                    <td className="px-5 py-3.5">{getStatusBadge(item.status)}</td>
                    <td className="px-5 py-3.5 text-right">
                      {isStudent ? (
                        <button
                          type="button"
                          onClick={() => onNavigate('availableExams')}
                          className="px-3 py-1 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white font-medium text-xs shadow-xs"
                        >
                          Buka
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onNavigate('exams')}
                          className="px-2.5 py-1 rounded-md bg-white hover:bg-[#F8F9FA] border border-[#CED4DA] text-[#1A1C1E] font-medium text-xs"
                        >
                          Detail
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[#6C757D]">
                    Belum ada data jadwal ujian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
