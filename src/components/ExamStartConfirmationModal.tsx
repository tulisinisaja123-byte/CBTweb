import React, { useState } from 'react';
import {
  AlertCircle,
  Clock,
  KeyRound,
  PlayCircle,
  ShieldAlert,
  UserCheck,
  X
} from 'lucide-react';
import { AvailableExamItem } from '../types';

interface ExamStartConfirmationModalProps {
  isOpen: boolean;
  exam: AvailableExamItem | null;
  onClose: () => void;
  onConfirm: (examId: string, tokenInput?: string) => Promise<void> | void;
  isStarting?: boolean;
}

export const ExamStartConfirmationModal: React.FC<ExamStartConfirmationModalProps> = ({
  isOpen,
  exam,
  onClose,
  onConfirm,
  isStarting = false
}) => {
  const [enteredToken, setEnteredToken] = useState('');
  const [tokenError, setTokenError] = useState('');

  if (!isOpen || !exam) return null;

  const isInProgress = exam.status === 'IN_PROGRESS';
  const requiresToken = Boolean(exam.useToken) && !isInProgress;

  const handleStart = async () => {
    setTokenError('');
    if (requiresToken) {
      const cleanInput = enteredToken.trim().toUpperCase();
      if (!cleanInput) {
        setTokenError('Harap masukkan token ujian terlebih dahulu.');
        return;
      }
      if (exam.token && cleanInput !== exam.token.trim().toUpperCase()) {
        setTokenError('Token ujian yang Anda masukkan salah. Silakan tanyakan ke pengawas ruang.');
        return;
      }
    }

    try {
      await onConfirm(exam.id, enteredToken.trim().toUpperCase());
    } catch (err: any) {
      setTokenError(err.message || 'Gagal memulai ujian.');
    }
  };

  const handleClose = () => {
    setEnteredToken('');
    setTokenError('');
    onClose();
  };

  return (
    <div
      id="exam-start-confirm-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={e => {
        if (e.target === e.currentTarget && !isStarting) handleClose();
      }}
    >
      <div
        id="exam-start-confirm-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden transition-all my-8"
      >
        {/* Header with Title & Cancel Close */}
        <div className="bg-gradient-to-r from-[#0052CC] to-[#0747A6] px-6 py-5 text-white relative">
          <button
            type="button"
            id="btn-exam-modal-close-x"
            onClick={handleClose}
            disabled={isStarting}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Batalkan dan tutup"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0 shadow-inner">
              <PlayCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded text-white/90">
                Konfirmasi Pengerjaan
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-1 leading-tight">
                {isInProgress ? 'Lanjutkan Sesi Ujian' : 'Mulai Kerjakan Ujian'}
              </h2>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Exam Summary Details */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-1 rounded-md bg-[#E7F0FF] text-[#0052CC] font-bold text-xs border border-[#B3D1FF]">
                {exam.subject}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Kelas: <b className="text-slate-800">{exam.className}</b>
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {exam.title}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0052CC]" />
                <span>
                  Durasi: <b className="text-slate-800 font-semibold">{exam.duration} Menit</b>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0052CC]" />
                <span>
                  Jam: <b className="text-slate-800 font-semibold">{exam.startTime || '07:30'} WIB</b>
                </span>
              </div>
              {exam.room && (
                <div className="text-slate-500">
                  Ruang: <span className="font-semibold text-slate-800">{exam.room}</span>
                </div>
              )}
              {exam.session && (
                <div className="text-slate-500">
                  Sesi: <span className="font-semibold text-slate-800">{exam.session}</span>
                </div>
              )}
              {exam.supervisor && (
                <div className="col-span-2 flex items-center gap-1.5 text-slate-500 pt-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    Pengawas: <span className="font-semibold text-slate-800">{exam.supervisor}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Token Input Section (if required) */}
          {requiresToken ? (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <KeyRound className="w-4 h-4 text-amber-700" />
                <span>Token Ujian Diperlukan</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Ujian ini menggunakan sistem verifikasi token. Masukkan token resmi yang diberikan oleh pengawas di ruang ujian Anda.
              </p>
              <div>
                <input
                  type="text"
                  id="input-exam-token"
                  placeholder="MASUKKAN TOKEN (MISAL: 5 HURUF)"
                  maxLength={10}
                  value={enteredToken}
                  onChange={e => {
                    setEnteredToken(e.target.value.toUpperCase());
                    setTokenError('');
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleStart();
                    }
                  }}
                  autoFocus
                  className="w-full px-4 py-2.5 text-center font-mono text-base tracking-[0.25em] font-black uppercase rounded-xl border border-amber-300 focus:border-[#0052CC] focus:ring-2 focus:ring-blue-100 bg-white outline-none transition-all"
                />
              </div>
              {tokenError && (
                <div className="flex items-center gap-1.5 text-red-600 text-xs font-semibold pt-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{tokenError}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 flex items-center gap-2.5 text-xs text-blue-800">
              <KeyRound className="w-4 h-4 text-[#0052CC] shrink-0" />
              <span>
                {isInProgress
                  ? 'Sesi ujian Anda sedang berlangsung. Anda dapat langsung melanjutkan pengerjaan.'
                  : 'Ujian ini tidak memerlukan token. Anda dapat langsung menekan tombol Mulai.'}
              </span>
            </div>
          )}

          {/* Integrity and Anti-Cheat Advisory */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-600">
            <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-snug">
              <span className="font-semibold text-slate-800">Peraturan Integritas CBT:</span>
              <p className="text-[11px]">
                Layar penuh akan diaktifkan secara otomatis. Dilarang berganti tab atau keluar aplikasi. Setiap pelanggaran dicatat di sistem pengawas.
              </p>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="bg-slate-100/80 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* BATALKAN BUTTON: Prevents accidental click */}
          <button
            type="button"
            id="btn-cancel-start-exam"
            onClick={handleClose}
            disabled={isStarting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs hover:border-slate-400 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4 text-slate-500" />
            <span>Batalkan</span>
          </button>

          {/* MULAI KERJAKAN BUTTON */}
          <button
            type="button"
            id="btn-confirm-start-exam"
            onClick={handleStart}
            disabled={isStarting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0052CC] hover:bg-[#0047B3] active:bg-[#0747A6] text-white font-bold text-xs shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isStarting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Mempersiapkan Lembar Ujian...</span>
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4 text-white" />
                <span>{isInProgress ? 'Lanjutkan Pengerjaan' : 'Mulai Kerjakan Sekarang'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
