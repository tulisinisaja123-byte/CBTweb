import React, { useState } from 'react';
import {
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Sparkles,
  X,
  KeyRound,
  ShieldCheck,
  Check,
  Clock
} from 'lucide-react';
import { User } from '../types';
import { verifyStudentAttendanceCode, getStudentAttendanceForUser } from '../services/supabaseLmsStorage';

interface AttendanceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User;
  user?: User;
  onVerifiedSuccess?: () => void;
  onSuccess?: () => void;
}

export const AttendanceScannerModal: React.FC<AttendanceScannerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  user,
  onVerifiedSuccess,
  onSuccess
}) => {
  const activeUser = currentUser || user;
  const userId = activeUser?.ID || '';
  const todayStr = new Date().toISOString().slice(0, 10);
  const existingRecord = userId ? getStudentAttendanceForUser(userId, todayStr) : undefined;

  const [inputCode, setInputCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    existingRecord?.status === 'PRESENT_SCHOOL'
      ? 'Anda sudah terverifikasi hadir di madrasah hari ini!'
      : null
  );

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed) {
      setErrorMessage('Silakan ketikkan kode presensi harian dari pengawas.');
      return;
    }

    if (!userId) {
      setErrorMessage('Identitas siswa tidak ditemukan.');
      return;
    }

    setIsVerifying(true);
    try {
      const result = verifyStudentAttendanceCode(userId, trimmed, todayStr);
      if (result.success) {
        setSuccessMessage('Presensi Berhasil! Anda terverifikasi hadir di sekolah.');
        if (onVerifiedSuccess) onVerifiedSuccess();
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMessage(result.message || 'Kode presensi tidak sesuai dengan kode harian pengawas.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memverifikasi kode presensi.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <QrCode className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Presensi Fisik di Madrasah</h3>
              <p className="text-xs text-blue-200">Verifikasi kehadiran sebelum membuka soal CBT</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-blue-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status Banner */}
          {successMessage ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-emerald-900 text-sm">{successMessage}</div>
                <div className="text-xs text-emerald-700 mt-1">
                  Status: <b>Hadir di Sekolah</b>. Integritas ujian telah dipenuhi. Anda dapat langsung memilih jadwal ujian.
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
              <Building2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <b>Perhatian Integritas:</b> Ujian CBT diselenggarakan di lingkungan madrasah. Mintalah kode harian pada layar proyektor atau papan pengawas di ruang ujian Anda.
              </div>
            </div>
          )}

          {/* Form input */}
          <form onSubmit={handleVerify} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Kode Presensi Pengawas (6 Karakter):
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: CKR-4892"
                  maxLength={12}
                  disabled={isVerifying || Boolean(successMessage)}
                  className="w-full pl-10 pr-4 py-3 text-center text-lg font-mono font-bold tracking-widest bg-slate-50 border-2 border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none uppercase"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Ketik kode yang tercantum pada barcode lembar pengawas ruang.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying || !inputCode.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4 text-amber-300" />
              <span>{isVerifying ? 'Memverifikasi Kehadiran...' : 'Konfirmasi Presensi Sekarang'}</span>
            </button>
          </form>

          {/* Info note */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Tanggal: <b>{todayStr}</b></span>
            </div>
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>MAS Muhammadiyah Cikaramas</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
