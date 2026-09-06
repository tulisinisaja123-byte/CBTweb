import React, { useState, useEffect } from 'react';
import {
  BookMarked,
  PlayCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  QrCode,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  AlertCircle,
  Lock
} from 'lucide-react';
import { getStudentAttendanceForUser, calculateEndTime } from '../services/lmsStorage';
import { getAvailableExams } from '../services/supabaseLmsStorage';
import { AvailableExamItem, User, StudentAttendanceRecord } from '../types';
import { ExamStartConfirmationModal } from './ExamStartConfirmationModal';
import { AttendanceScannerModal } from './AttendanceScannerModal';

interface StudentExamsViewProps {
  token: string;
  currentUser?: User;
  onStartExam: (examId: string, tokenInput?: string) => Promise<void> | void;
}

export const StudentExamsView: React.FC<StudentExamsViewProps> = ({ token, currentUser, onStartExam }) => {
  const [exams, setExams] = useState<AvailableExamItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmExamModal, setConfirmExamModal] = useState<AvailableExamItem | null>(null);
  const [isStartingExam, setIsStartingExam] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceRecord, setAttendanceRecord] = useState<StudentAttendanceRecord | undefined>(undefined);

  const todayStr = new Date().toISOString().slice(0, 10);

  const checkAttendanceStatus = () => {
    if (currentUser?.ID) {
      const rec = getStudentAttendanceForUser(currentUser.ID, todayStr);
      setAttendanceRecord(rec);
    }
  };

  const loadExams = async () => {
    try {
      setLoading(true);
      const list = await getAvailableExams(token);
      setExams(list);
      checkAttendanceStatus();
    } catch (err) {
      console.error('Failed to load available exams', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, [token, currentUser?.ID]);

  const isVerifiedPresentToday = Boolean(
    attendanceRecord &&
    (attendanceRecord.status === 'PRESENT_SCHOOL' || attendanceRecord.status === 'REMOTE_PERMIT')
  );

  const getStatusBadge = (status: string, exam: AvailableExamItem) => {
    if (exam.presenceBlocked) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-amber-700" />
          <span>Jadwal Ujian Susulan</span>
        </span>
      );
    }

    switch (status) {
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7F0FF] text-[#0052CC] border border-[#B3D1FF]">Sedang Berjalan</span>;
      case 'SUBMITTED':
      case 'FINISHED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]">Selesai</span>;
      case 'REVIEW':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]">Menunggu Koreksi</span>;
      default:
        if (exam.timingStatus === 'EXPIRED') {
          return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Sesi Berakhir</span>;
        }
        if (exam.timingStatus === 'UPCOMING') {
          return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">Belum Dibuka</span>;
        }
        if (status === 'ACTIVE') {
          return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]">Sesi Aktif</span>;
        }
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F1F3F5] text-[#495057] border border-[#DEE2E6]">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Integrity Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1C1E] tracking-tight">Daftar Ujian Siswa</h1>
          <p className="text-xs sm:text-sm text-[#6C757D] mt-1">
            Pilih jadwal ujian aktif untuk kelas Anda. Ujian tatap muka mensyaratkan verifikasi kehadiran fisik di madrasah.
          </p>
        </div>

        {/* Presence Status Pill & Button */}
        <div className="flex items-center gap-2">
          {isVerifiedPresentToday ? (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Hadir di Madrasah ({attendanceRecord?.method === 'QR_SCAN' ? 'Scan Barcode' : 'Terverifikasi'})</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAttendanceModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-amber-300" />
              <span>Scan Barcode Presensi Harian</span>
            </button>
          )}
        </div>
      </div>

      {/* Attendance Warning Banner if Not Present */}
      {!isVerifiedPresentToday && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200 mt-0.5 sm:mt-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm">
                Integritas Ujian: Kehadiran Fisik di Sekolah Belum Terverifikasi Hari Ini
              </h4>
              <p className="text-xs text-amber-900/80 mt-0.5 leading-relaxed">
                Sesuai regulasi madrasah, soal ujian hanya dapat dibuka jika Anda terdata hadir di sekolah (scan barcode proyektor/papan pengawas atau dihadirkan manual). Siswa yang tidak hadir di sekolah otomatis dialihkan ke <strong>Jadwal Ujian Susulan</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAttendanceModalOpen(true)}
            className="shrink-0 px-3.5 py-2 bg-amber-900 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-300" />
            <span>Scan / Input Kode Presensi</span>
          </button>
        </div>
      )}

      {/* Exams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {exams.length > 0 ? (
          exams.map(exam => (
            <div
              key={exam.id}
              className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all space-y-4 ${
                exam.presenceBlocked
                  ? 'border-amber-300 bg-amber-50/20'
                  : 'border-[#DEE2E6] hover:border-[#0052CC]'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-[#E7F0FF] text-[#0052CC] font-bold text-[11px] border border-[#B3D1FF]">
                    {exam.subject}
                  </span>
                  {getStatusBadge(exam.status, exam)}
                </div>

                <div>
                  <h3 className="text-base font-bold text-[#1A1C1E] tracking-tight leading-snug">
                    {exam.title}
                  </h3>
                  <div className="text-xs text-[#6C757D] mt-2 space-y-1">
                    <div>Kelas: <span className="font-semibold text-[#1A1C1E]">{exam.className}</span></div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Tanggal: <b className="text-[#1A1C1E] font-medium">{exam.date}</b></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#0052CC]" />
                      <span>
                        Waktu Sesi: <b className="text-[#1A1C1E] font-semibold">{exam.startTime} s.d. {exam.endTime || calculateEndTime(exam.startTime, exam.duration)} WIB</b> • Durasi:{' '}
                        <b className="text-[#1A1C1E] font-medium">{exam.duration} menit</b>
                      </span>
                    </div>
                    {exam.room && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Ruang: <b className="text-[#1A1C1E] font-medium">{exam.room}</b> {exam.session ? `(${exam.session})` : ''}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Integrity Notice Box if Blocked */}
                {exam.presenceBlocked && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-900">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950 text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                      <span>Dialihkan ke Jadwal Ujian Susulan</span>
                    </div>
                    <p className="text-[11px] text-amber-800/90 leading-relaxed">
                      Ujian ini wajib dikerjakan di lingkungan madrasah. Jika Anda sudah berada di sekolah, silakan scan barcode pengawas atau minta pengawas ruang mengkonfirmasi kehadiran Anda.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#DEE2E6] flex flex-col gap-2">
                {exam.canStart ? (
                  <button
                    type="button"
                    onClick={() => setConfirmExamModal(exam)}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#0052CC] hover:bg-[#0047B3] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <PlayCircle className="w-4 h-4 text-white" />
                    <span>{exam.status === 'IN_PROGRESS' ? 'Lanjutkan Ujian' : 'Mulai Kerjakan Ujian'}</span>
                  </button>
                ) : exam.presenceBlocked ? (
                  <button
                    type="button"
                    onClick={() => setIsAttendanceModalOpen(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-amber-300" />
                    <span>Scan Barcode Presensi Sekolah</span>
                  </button>
                ) : (exam.status === 'SUBMITTED' || exam.status === 'FINISHED' || exam.status === 'REVIEW') ? (
                  <div className="w-full flex items-center justify-between text-xs py-1">
                    <span className="text-[#6C757D]">Nilai Anda:</span>
                    <span className="text-base font-bold font-mono text-[#0052CC]">
                      {exam.score !== '' ? `${exam.score} Poin` : 'Menunggu Koreksi'}
                    </span>
                  </div>
                ) : exam.timingStatus === 'UPCOMING' ? (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-1">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-900">
                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Sesi Belum Dibuka</span>
                    </div>
                    <div className="text-[11px] text-amber-800">
                      Akses pengerjaan dibuka pukul <b>{exam.startTime} s.d. {exam.endTime || calculateEndTime(exam.startTime, exam.duration)} WIB</b>.
                    </div>
                  </div>
                ) : exam.timingStatus === 'EXPIRED' ? (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-center space-y-1">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-800">
                      <Lock className="w-3.5 h-3.5 text-rose-600" />
                      <span>Batas Waktu Sesi Berakhir</span>
                    </div>
                    <div className="text-[11px] text-rose-700">
                      Sesi ujian telah selesai pukul <b>{exam.endTime || calculateEndTime(exam.startTime, exam.duration)} WIB</b>. Akses otomatis ditutup.
                    </div>
                  </div>
                ) : (
                  <div className="w-full text-center text-xs text-slate-500 py-1 font-medium">
                    Ujian tidak aktif atau belum dijadwalkan
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center text-[#6C757D] bg-white rounded-2xl border border-[#DEE2E6] p-6 space-y-3">
            <BookMarked className="w-12 h-12 text-[#CED4DA] mx-auto" />
            <div className="font-bold text-sm text-[#1A1C1E]">Tidak Ada Jadwal Ujian Aktif</div>
            <div className="text-xs text-slate-500 max-w-sm mx-auto">
              Ujian untuk kelas Anda belum dijadwalkan atau telah selesai dilaksanakan.
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ExamStartConfirmationModal
        isOpen={Boolean(confirmExamModal)}
        exam={confirmExamModal}
        isStarting={isStartingExam}
        onClose={() => setConfirmExamModal(null)}
        onConfirm={async (examId, tokenInput) => {
          setIsStartingExam(true);
          try {
            await onStartExam(examId, tokenInput);
            setConfirmExamModal(null);
          } finally {
            setIsStartingExam(false);
          }
        }}
      />

      {/* Attendance Scanner Modal */}
      {currentUser && (
        <AttendanceScannerModal
          isOpen={isAttendanceModalOpen}
          user={currentUser}
          currentUser={currentUser}
          onClose={() => setIsAttendanceModalOpen(false)}
          onSuccess={() => {
            loadExams();
            checkAttendanceStatus();
          }}
          onVerifiedSuccess={() => {
            loadExams();
            checkAttendanceStatus();
          }}
        />
      )}
    </div>
  );
};

export default StudentExamsView;

