import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  GraduationCap,
  BookOpen,
  HelpCircle,
  PlayCircle,
  RefreshCw,
  Calendar,
  CalendarDays,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Compass,
  Lock,
  BookMarked,
  Sparkles,
  AlertCircle,
  CreditCard,
  Printer,
  X,
  QrCode
} from 'lucide-react';
import { DashboardData, User, AvailableExamItem, SchoolSettings } from '../types';
import { getAvailableExamsForUser, getSchoolSettings as getLocalSchoolSettings } from '../services/lmsStorage';
import { DEFAULT_SETTINGS } from '../data/initialData';
import { ExamStartConfirmationModal } from './ExamStartConfirmationModal';
import { SvgQrCode, SvgBarcode } from './CetakDokumenUjian';
import { printElementReliable } from '../utils/printHelper';

interface DashboardViewProps {
  user: User;
  dashboard: DashboardData;
  classNameHelper: (id: string) => string;
  onNavigate: (page: string) => void;
  onRefresh: () => void;
  onStartExam?: (examId: string, tokenInput?: string) => Promise<void> | void;
  settings?: SchoolSettings;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  dashboard,
  classNameHelper,
  onNavigate,
  onRefresh,
  onStartExam,
  settings
}) => {
  const isStudent = user.ROLE === 'STUDENT';
  const [confirmExamModal, setConfirmExamModal] = useState<AvailableExamItem | null>(null);
  const [isStartingExam, setIsStartingExam] = useState(false);
  const [showStudentCardModal, setShowStudentCardModal] = useState(false);
  const studentCardRef = useRef<HTMLDivElement>(null);

  // Dynamic school settings and school year
  const schoolSettings: SchoolSettings = useMemo(() => {
    const base = getLocalSchoolSettings();
    return {
      ...DEFAULT_SETTINGS,
      ...base,
      ...(settings || {})
    };
  }, [settings]);

  const schoolYear = schoolSettings.SCHOOL_YEAR || DEFAULT_SETTINGS.SCHOOL_YEAR || '2026/2027';

  // Compute student exam schedules sorted chronologically by exam date and start time
  const sortedStudentSchedules = useMemo(() => {
    if (!isStudent) return [];
    const list: AvailableExamItem[] = (dashboard.studentSchedules !== undefined && dashboard.studentSchedules !== null)
      ? dashboard.studentSchedules
      : getAvailableExamsForUser(user);

    return [...list].sort((a, b) => {
      const dateA = a.date || '9999-99-99';
      const dateB = b.date || '9999-99-99';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const timeA = a.startTime || '00:00';
      const timeB = b.startTime || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [isStudent, dashboard.studentSchedules, user]);

  const formatExamDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      if (!y || !m || !d) return dateStr;
      const dt = new Date(y, m - 1, d);
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(dt);
    } catch {
      return dateStr;
    }
  };

  const stats = isStudent
    ? [
        {
          label: 'Jadwal Ujian Mapel',
          value: sortedStudentSchedules.length,
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
          value: 'Siswa Terverifikasi',
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
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowStudentCardModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-white border border-[#0052CC] text-[#0052CC] hover:bg-blue-50 font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-[#0052CC]" />
                <span>Kartu Peserta Ujian</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('availableExams')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Lihat Jadwal Ujian Saya</span>
              </button>
            </div>
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

      {/* Jadwal Pelajaran Tatap Muka Anti-Bentrok Banner (HANYA UNTUK GURU & ADMIN, SISWA HANYA MELIHAT JADWAL UJIAN) */}
      {!isStudent && (
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
      )}

      {/* DASHBOARD SISWA: JADWAL MATA PELAJARAN UJIAN CBT SECARA KRONOLOGIS */}
      {isStudent && (
        <div className="space-y-5">
          {/* Header Banner Jadwal Ujian Siswa */}
          <div className="bg-gradient-to-r from-[#003B99] via-[#0052CC] to-[#0747A6] text-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Jadwal Ujian CBT Kelas {classNameHelper(user.CLASS_ID)}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[10px] font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-300" />
                  Waktu Mulai Tersinkronisasi
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight">
                Jadwal Mata Pelajaran yang Akan Diujikan
              </h3>
              <p className="text-xs text-blue-100 max-w-2xl leading-relaxed">
                Diurutkan berdasarkan <strong>urutan tanggal dan waktu mulai ujian</strong>. Ujian hanya dapat dikerjakan saat waktu ujian telah dimulai. Jawaban Anda tersimpan otomatis secara aman.
              </p>
            </div>

            <div className="shrink-0 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowStudentCardModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-xs border border-white/30 transition-colors cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-white" />
                <span>Kartu Peserta</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('availableExams')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-[#0052CC] hover:bg-blue-50 font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <BookMarked className="w-4 h-4 text-[#0052CC]" />
                <span>Ruang Ujian CBT</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Daftar Jadwal Ujian Siswa Terurut */}
          <div className="bg-white border border-[#DEE2E6] rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-[#DEE2E6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8F9FA]/70">
              <div>
                <h3 className="text-sm font-bold text-[#1A1C1E] flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-[#0052CC]" />
                  <span>Daftar Mata Pelajaran & Jadwal Waktu Dimulai</span>
                </h3>
                <p className="text-[11px] text-[#6C757D]">
                  Urutan pelaksanaan ujian CBT dari tanggal terdekat hingga selesai
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-[#0052CC] border border-blue-100">
                  {sortedStudentSchedules.length} Mata Pelajaran
                </span>
              </div>
            </div>

            <div className="divide-y divide-[#DEE2E6]">
              {sortedStudentSchedules.length > 0 ? (
                sortedStudentSchedules.map((exam, idx) => {
                  const isCompleted = exam.status === 'SUBMITTED' || exam.status === 'FINISHED';
                  const isInProgress = exam.status === 'IN_PROGRESS';
                  const isStarted = !!exam.isStarted;
                  const canAttempt = isStarted && exam.canStart;

                  return (
                    <div
                      key={exam.id}
                      className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                        canAttempt
                          ? 'bg-blue-50/40 hover:bg-blue-50/70 border-l-4 border-l-[#0052CC]'
                          : isCompleted
                          ? 'bg-gray-50/40 hover:bg-gray-50'
                          : 'hover:bg-[#F8F9FA]'
                      }`}
                    >
                      {/* Left: Schedule Order & Info */}
                      <div className="flex items-start gap-3.5">
                        {/* Sequential Order Number */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            canAttempt
                              ? 'bg-[#0052CC] text-white shadow-xs'
                              : isCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-[#F1F3F5] text-[#495057]'
                          }`}
                        >
                          #{idx + 1}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-[#E7F0FF] text-[#0052CC] font-bold text-xs border border-[#B3D1FF]">
                              {exam.subject}
                            </span>
                            {exam.subjectCode && (
                              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-mono font-semibold">
                                {exam.subjectCode}
                              </span>
                            )}

                            {/* Status Timing Pill */}
                            {isCompleted ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Selesai Dikerjakan
                              </span>
                            ) : isInProgress ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 animate-pulse">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Sesi Aktif (Lanjutkan Pengerjaan)
                              </span>
                            ) : isStarted ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping mr-0.5" />
                                Waktu Ujian Telah Dimulai
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-gray-500" />
                                Belum Dimulai (Pukul {exam.startTime || '07:30'} WIB)
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-bold text-[#1A1C1E]">
                            {exam.title}
                          </h4>

                          {/* Date and Time Details */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6C757D] pt-0.5">
                            <div className="flex items-center gap-1 font-medium text-[#1A1C1E]">
                              <Calendar className="w-3.5 h-3.5 text-[#0052CC]" />
                              <span>{formatExamDate(exam.date)}</span>
                            </div>
                            <div className="flex items-center gap-1 font-medium text-[#1A1C1E]">
                              <Clock className="w-3.5 h-3.5 text-[#0052CC]" />
                              <span>
                                Pukul {exam.startTime || '07:30'} {exam.endTime ? `- ${exam.endTime}` : ''} WIB
                              </span>
                            </div>
                            <div className="text-[11px] text-[#6C757D]">
                              Durasi: <strong className="text-gray-800">{exam.duration} menit</strong>
                            </div>
                            {exam.totalQuestions ? (
                              <div className="text-[11px] text-[#6C757D]">
                                Soal: <strong className="text-gray-800">{exam.totalQuestions} butir</strong>
                              </div>
                            ) : null}
                            {exam.room && (
                              <div className="text-[11px] text-[#6C757D]">
                                Ruang: <strong className="text-gray-800">{exam.room}</strong>
                              </div>
                            )}
                            {exam.session && (
                              <div className="text-[11px] text-[#6C757D]">
                                Sesi: <strong className="text-gray-800">{exam.session}</strong>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Action Button */}
                      <div className="shrink-0 flex items-center gap-2">
                        {isCompleted ? (
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-[10px] text-[#6C757D]">Nilai Anda:</div>
                              <div className="font-mono font-bold text-sm text-[#0052CC]">
                                {exam.score !== '' ? `${exam.score} Poin` : 'Menunggu Koreksi'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onNavigate('myResults')}
                              className="px-3.5 py-2 rounded-lg bg-white border border-[#DEE2E6] hover:bg-[#F8F9FA] text-[#495057] text-xs font-semibold cursor-pointer shadow-2xs"
                            >
                              Lihat Nilai
                            </button>
                          </div>
                        ) : canAttempt ? (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmExamModal(exam);
                            }}
                            className="px-4 py-2.5 rounded-lg bg-[#0052CC] hover:bg-[#0047B3] text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                          >
                            <PlayCircle className="w-4 h-4 text-white" />
                            <span>{isInProgress ? 'Lanjutkan Ujian' : 'Mulai Kerjakan Ujian'}</span>
                          </button>
                        ) : (
                          <div className="flex flex-col items-end">
                            <button
                              type="button"
                              disabled
                              title={`Ujian dapat dikerjakan saat waktu ujian dimulai pada ${exam.date} pukul ${exam.startTime || '07:30'} WIB`}
                              className="px-3.5 py-2 rounded-lg bg-gray-100 border border-gray-200 text-gray-400 font-semibold text-xs inline-flex items-center gap-1.5 cursor-not-allowed"
                            >
                              <Lock className="w-3.5 h-3.5 text-gray-400" />
                              <span>Belum Dimulai ({exam.startTime || '07:30'} WIB)</span>
                            </button>
                            <span className="text-[10px] text-gray-500 mt-1">
                              Tombol aktif saat jam ujian tiba
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-[#6C757D] p-6 space-y-2">
                  <BookMarked className="w-10 h-10 text-gray-300 mx-auto" />
                  <div className="font-bold text-sm text-[#1A1C1E]">
                    Belum Ada Jadwal Ujian Terdaftar
                  </div>
                  <p className="text-xs text-[#6C757D] max-w-sm mx-auto">
                    Jadwal ujian untuk kelas Anda belum dirilis oleh proktor/panitia.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Grid Khusus Guru/Admin: Recent Exams & Class Distribution Chart */}
      {!isStudent && (
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
                onClick={() => onNavigate('exams')}
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

          {/* Distribution per Kelas */}
          <div className="bg-white border border-[#DEE2E6] rounded-lg p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#DEE2E6]">
                <h3 className="text-sm font-bold text-[#1A1C1E]">
                  Distribusi Siswa per Kelas
                </h3>
              </div>

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
            </div>

            <div className="pt-4 mt-4 border-t border-[#DEE2E6]">
              <button
                type="button"
                onClick={() => onNavigate('exams')}
                className="w-full py-2 px-3 rounded-md bg-[#F8F9FA] hover:bg-[#E9ECEF] border border-[#DEE2E6] text-[#0052CC] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Kelola Jadwal & Soal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid Khusus Siswa: Panduan Teknis CBT & Tata Tertib */}
      {isStudent && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white border border-[#DEE2E6] rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#DEE2E6]">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-[#1A1C1E] uppercase tracking-wider">
                Tata Tertib & Keamanan CBT Siswa
              </h3>
            </div>
            <ul className="space-y-2 text-xs text-[#495057]">
              <li className="flex items-start gap-2">
                <span className="text-[#0052CC] font-bold">&bull;</span>
                <span><strong>Waktu Mulai:</strong> Tombol pengerjaan baru akan aktif saat jam mulai ujian telah tiba sesuai jadwal di atas.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0052CC] font-bold">&bull;</span>
                <span><strong>Penyimpanan Jawaban:</strong> Setiap opsi yang Anda klik langsung tersimpan otomatis secara real-time ke sistem.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0052CC] font-bold">&bull;</span>
                <span><strong>Reset Sesi:</strong> Jika koneksi terputus atau layar terkunci, pengawas dapat melakukan reset sesi tanpa menghilangkan jawaban yang sudah diisi.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-[#DEE2E6] rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#DEE2E6]">
              <Clock className="w-4 h-4 text-[#0052CC]" />
              <h3 className="text-xs font-bold text-[#1A1C1E] uppercase tracking-wider">
                Deteksi Pelanggaran & Batas Toleransi
              </h3>
            </div>
            <div className="space-y-2.5 text-xs text-[#495057]">
              <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-xs">
                <strong>Penting:</strong> Dilarang berpindah tab browser, membuka aplikasi lain, atau membagi layar (split screen) selama ujian berlangsung.
              </div>
              <p className="text-[11px] text-[#6C757D]">
                Sistem mencatat setiap perpindahan tab. Jika mencapai batas maksimal toleransi pelanggaran, layar akan terkunci dan pengawas ruang ujian berhak memeriksa perangkat Anda.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Table Jadwal Ujian Terdaftar (HANYA UNTUK GURU & ADMIN) */}
      {!isStudent && (
        <div className="bg-white border border-[#DEE2E6] rounded-lg overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-[#DEE2E6] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#1A1C1E]">Jadwal Ujian Terdaftar</h3>
              <p className="text-[11px] text-[#6C757D]">Status terkini dan tanggal pelaksanaan</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('exams')}
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
                        <button
                          type="button"
                          onClick={() => onNavigate('exams')}
                          className="px-2.5 py-1 rounded-md bg-white hover:bg-[#F8F9FA] border border-[#CED4DA] text-[#1A1C1E] font-medium text-xs"
                        >
                          Detail
                        </button>
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
      )}

      {/* Confirmation & Token Modal with Cancel Button */}
      <ExamStartConfirmationModal
        isOpen={Boolean(confirmExamModal)}
        exam={confirmExamModal}
        isStarting={isStartingExam}
        onClose={() => setConfirmExamModal(null)}
        onConfirm={async (examId, tokenInput) => {
          if (onStartExam) {
            setIsStartingExam(true);
            try {
              await onStartExam(examId, tokenInput);
              setConfirmExamModal(null);
            } finally {
              setIsStartingExam(false);
            }
          } else {
            setConfirmExamModal(null);
            onNavigate('availableExams');
          }
        }}
      />

      {/* MODAL KARTU PESERTA UJIAN CBT SISWA */}
      {showStudentCardModal && (
        <div className="print-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="no-print px-4 sm:px-5 py-3.5 sm:py-4 bg-gradient-to-r from-emerald-800 to-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold tracking-tight truncate">Kartu Peserta Ujian Asesmen CBT</h3>
                  <p className="text-[10px] sm:text-[11px] text-emerald-100 truncate">{schoolSettings.SCHOOL_NAME || 'MAS MUHAMMADIYAH CIKARAMAS'} • TP {schoolYear}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStudentCardModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0 ml-2"
                aria-label="Tutup Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Official Card Design */}
            <div className="print-modal-body p-2.5 sm:p-5 space-y-3 sm:space-y-4 max-h-[82vh] sm:max-h-[78vh] overflow-y-auto">
              <div ref={studentCardRef} className="border-2 border-[#1A1C1E] rounded-xl p-3 sm:p-4 bg-white shadow-xs space-y-3 font-sans">
                {/* Kop Kartu */}
                <div className="text-center pb-2 border-b-2 border-[#1A1C1E]">
                  <h4 className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-[#495057]">
                    {schoolSettings.KOP_HEADER_1 || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA'}
                  </h4>
                  <h3 className="text-xs sm:text-sm font-black text-[#1A1C1E] tracking-tight uppercase leading-snug">
                    {schoolSettings.SCHOOL_NAME || 'MAS MUHAMMADIYAH CIKARAMAS'}
                  </h3>
                  <p className="text-[9px] sm:text-[10px] text-[#495057] leading-tight mt-0.5">
                    {schoolSettings.SCHOOL_ADDRESS || 'Jl. Raya Cikaramas - Wado No. 12, Tanjungmedar, Sumedang 45354'}
                  </p>
                  <div className="inline-block mt-1 px-2.5 py-0.5 bg-emerald-700 text-white rounded font-bold text-[9px] sm:text-[10px] uppercase tracking-wider">
                    KARTU PESERTA UJIAN ASESMEN CBT TP {schoolYear}
                  </div>
                </div>

                {/* Identitas Siswa - Mobile Responsive Layout Without Overlap */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:gap-4 pt-1">
                  {/* Top Bar on Mobile: Pasfoto (left) + QR Code (right) */}
                  <div className="flex items-center justify-between sm:flex-col sm:justify-start gap-2 shrink-0 bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none border border-slate-200 sm:border-none">
                    {/* Pasfoto & Barcode */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="w-16 h-20 sm:w-20 sm:h-24 border border-slate-300 rounded bg-white flex flex-col items-center justify-center p-1 text-center shadow-2xs">
                        <Users className="w-6 h-6 sm:w-7 sm:h-7 text-slate-400 mb-0.5" />
                        <span className="text-[8px] sm:text-[9px] text-slate-600 font-bold leading-tight">Pasfoto 3x4</span>
                        <span className="text-[7px] sm:text-[8px] text-slate-400">Resmi</span>
                      </div>
                      <div className="w-20 flex justify-center">
                        <SvgBarcode value={user.USERNAME || user.ID} width={76} height={18} showText={false} />
                      </div>
                    </div>

                    {/* QR Code - Mobile Position: Docked at top-right alongside photo to prevent overlapping biodata */}
                    <div className="sm:hidden flex flex-col items-center bg-white p-1.5 rounded-md border border-slate-200 shadow-2xs">
                      <SvgQrCode value={`CBT-MAS-CIKARAMAS|${user.USERNAME}|${user.NAME}|${user.CLASS_ID}`} size={54} />
                      <span className="text-[8px] font-mono font-bold text-emerald-800 mt-0.5">VERIFIKASI</span>
                    </div>
                  </div>

                  {/* Biodata Siswa - Clean full width on mobile, no overlapping with QR */}
                  <div className="flex-1 min-w-0 space-y-1 sm:space-y-1.5 text-xs">
                    <div className="grid grid-cols-[92px_8px_1fr] sm:grid-cols-[110px_10px_1fr] items-baseline">
                      <span className="text-slate-600 font-medium text-[11px] sm:text-xs">No. Peserta / Akun</span>
                      <span className="text-slate-400">:</span>
                      <span className="font-bold text-[#1A1C1E] font-mono text-xs break-all">{user.USERNAME || user.ID}</span>
                    </div>
                    <div className="grid grid-cols-[92px_8px_1fr] sm:grid-cols-[110px_10px_1fr] items-baseline">
                      <span className="text-slate-600 font-medium text-[11px] sm:text-xs">Nama Lengkap</span>
                      <span className="text-slate-400">:</span>
                      <span className="font-bold text-[#1A1C1E] uppercase text-xs break-words">{user.NAME}</span>
                    </div>
                    <div className="grid grid-cols-[92px_8px_1fr] sm:grid-cols-[110px_10px_1fr] items-baseline">
                      <span className="text-slate-600 font-medium text-[11px] sm:text-xs">Kelas / Rombel</span>
                      <span className="text-slate-400">:</span>
                      <span className="font-bold text-[#0052CC] text-xs">{classNameHelper(user.CLASS_ID)}</span>
                    </div>
                    <div className="grid grid-cols-[92px_8px_1fr] sm:grid-cols-[110px_10px_1fr] items-baseline">
                      <span className="text-slate-600 font-medium text-[11px] sm:text-xs">Ruang & Sesi</span>
                      <span className="text-slate-400">:</span>
                      <span className="text-slate-800 text-xs break-words">
                        {sortedStudentSchedules[0]?.room || 'Ruang Kelas'} • {sortedStudentSchedules[0]?.session || 'Sesi 1 (07:30 - 09:00)'}
                      </span>
                    </div>
                    <div className="grid grid-cols-[92px_8px_1fr] sm:grid-cols-[110px_10px_1fr] items-baseline">
                      <span className="text-slate-600 font-medium text-[11px] sm:text-xs">Status Peserta</span>
                      <span className="text-slate-400">:</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Terdaftar Aktif</span>
                      </span>
                    </div>
                  </div>

                  {/* QR Code on Desktop (hidden on mobile to prevent overlapping) */}
                  <div className="hidden sm:flex shrink-0 flex-col items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <SvgQrCode value={`CBT-MAS-CIKARAMAS|${user.USERNAME}|${user.NAME}|${user.CLASS_ID}`} size={60} />
                    <span className="text-[8px] font-mono font-bold text-emerald-800 mt-1">VERIFIKASI</span>
                  </div>
                </div>

                {/* Jadwal Ujian Terdaftar */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                      Mata Pelajaran Ujian yang Diikuti:
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Total: {sortedStudentSchedules.length} Ujian
                    </span>
                  </div>
                  {sortedStudentSchedules.length > 0 ? (
                    <div className="border border-slate-200 rounded-lg overflow-x-auto scrollbar-thin text-[10px]">
                      <table className="w-full text-left min-w-[320px]">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-1.5 text-center w-8">No</th>
                            <th className="p-1.5">Mata Pelajaran</th>
                            <th className="p-1.5 text-center">Tanggal</th>
                            <th className="p-1.5 text-center">Waktu Mulai</th>
                            <th className="p-1.5 text-center">Durasi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedStudentSchedules.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-slate-50">
                              <td className="p-1.5 text-center text-slate-500 font-medium">{idx + 1}</td>
                              <td className="p-1.5 font-bold text-slate-800">{item.title}</td>
                              <td className="p-1.5 text-center text-slate-600">{item.date || '-'}</td>
                              <td className="p-1.5 text-center font-mono font-medium text-emerald-800">
                                {item.startTime || '07:30'} WIB
                              </td>
                              <td className="p-1.5 text-center text-slate-600">{item.duration} Menit</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-lg text-center text-xs text-slate-500">
                      Tidak ada jadwal ujian aktif untuk rombel kelas Anda saat ini.
                    </div>
                  )}
                </div>

                {/* Tanda Tangan Kepala Madrasah */}
                <div className="pt-2 flex flex-col-reverse sm:flex-row items-center sm:items-end justify-between gap-3 text-[10px] text-slate-700 border-t border-slate-200">
                  <div className="text-[9px] text-slate-500 text-center sm:text-left max-w-[260px] leading-relaxed">
                    * Bawa kartu ini saat pelaksanaan asesmen CBT. Jangan membagikan akun dan password kepada orang lain.
                  </div>
                  <div className="text-center min-w-[150px]">
                    <p className="text-[10px]">{(schoolSettings.SCHOOL_CITY || 'Sumedang').replace(/^Kabupaten\s+/i, '')}, {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                    <p className="font-semibold text-[10px]">{schoolSettings.PRINCIPAL_TITLE || 'Kepala Madrasah'},</p>
                    <div className="h-8 sm:h-10 flex items-center justify-center">
                      <span className="text-[9px] italic text-slate-400">[Ttd & Cap Digital]</span>
                    </div>
                    <p className="font-bold underline text-[10px]">{schoolSettings.PRINCIPAL_NAME || 'Ai Sukaesih, S.Pd'}</p>
                    <p className="text-[9px] text-slate-500">NBM. {schoolSettings.PRINCIPAL_NIP || '1281201'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="no-print px-4 sm:px-5 py-3 sm:py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
              <div className="text-[11px] sm:text-xs text-slate-500 text-center sm:text-left">
                Kartu resmi Asesmen CBT MAS Muhammadiyah Cikaramas
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (studentCardRef.current) {
                      printElementReliable(studentCardRef.current, {
                        title: `Kartu_Peserta_${user.NAME}`,
                        paperSize: 'A4',
                        orientation: 'portrait'
                      });
                    } else {
                      window.print();
                    }
                  }}
                  className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  title="Cetak langsung atau simpan sebagai file PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Kartu</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowStudentCardModal(false);
                    onNavigate('printCards');
                  }}
                  className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg bg-white border border-[#CED4DA] hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Halaman Cetak</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowStudentCardModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#0052CC] hover:bg-[#0047B3] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
