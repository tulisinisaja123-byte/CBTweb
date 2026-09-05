import React, { useState } from 'react';
import { User as UserIcon, Lock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { changePassword } from '../services/lmsStorage';
import { User } from '../types';

interface ProfileViewProps {
  token: string;
  user: User;
  classNameHelper: (id: string) => string;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ token, user, classNameHelper }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password baru harus memiliki panjang minimal 8 karakter.' });
      return;
    }

    setLoading(true);
    try {
      changePassword(token, oldPassword, newPassword);
      setMessage({ type: 'success', text: 'Password Anda berhasil diperbarui!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal mengubah password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1A1C1E] tracking-tight">Profil & Keamanan Akun</h1>
        <p className="text-xs sm:text-sm text-[#6C757D] mt-1">
          Informasi identitas akun LMS dan pengaturan kata sandi pribadi Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Identity Card */}
        <div className="bg-white border border-[#DEE2E6] rounded-lg p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#DEE2E6]">
            <div className="w-10 h-10 rounded-md bg-[#0052CC] text-white font-bold text-sm grid place-items-center">
              {user.NAME.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1A1C1E]">{user.NAME}</h3>
              <div className="text-[11px] text-[#6C757D]">{user.ROLE}</div>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[#DEE2E6]">
              <span className="text-[#6C757D]">Username / NIS</span>
              <span className="font-bold text-[#1A1C1E] font-mono">{user.USERNAME}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#DEE2E6]">
              <span className="text-[#6C757D]">Email</span>
              <span className="font-medium text-[#1A1C1E]">{user.EMAIL || '-'}</span>
            </div>
            {user.ROLE === 'STUDENT' && (
              <div className="flex justify-between py-1.5 border-b border-[#DEE2E6]">
                <span className="text-[#6C757D]">Kelas</span>
                <span className="font-medium text-[#0052CC]">{classNameHelper(user.CLASS_ID)}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5 border-b border-[#DEE2E6]">
              <span className="text-[#6C757D]">Status Akun</span>
              <span className="font-medium text-[#137333]">Aktif Terverifikasi</span>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white border border-[#DEE2E6] rounded-lg p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#DEE2E6]">
            <Lock className="w-4 h-4 text-[#0052CC]" />
            <h3 className="text-sm font-bold text-[#1A1C1E]">Ubah Password</h3>
          </div>

          {message && (
            <div
              className={`p-3 rounded-md text-xs flex items-center gap-2 border ${
                message.type === 'success'
                  ? 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
                  : 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#137333] flex-shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-[#C5221F] flex-shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-medium text-[#1A1C1E]">Password Lama</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                placeholder="Masukkan password saat ini"
                className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-[#1A1C1E]">Password Baru (Min. 8 Karakter)</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Buat password baru"
                className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-[#1A1C1E]">Ulangi Password Baru</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password baru"
                className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white font-medium text-xs shadow-xs transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Memperbarui...' : 'Perbarui Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;

