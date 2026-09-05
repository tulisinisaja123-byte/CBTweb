import React, { useState, useEffect } from 'react';
import { School, Lock, User as UserIcon, LogIn, Wrench, FileCode, CheckCircle2, ShieldAlert } from 'lucide-react';
import { login, ensureInitialized, safeStorageSet, getSchoolSettings, subscribeToRealtimeChanges } from '../services/supabaseLmsStorage';
import { User, SchoolSettings, DashboardData } from '../types';
import { DEFAULT_SETTINGS } from '../data/initialData';

interface LoginViewProps {
  onLoginSuccess: (data: { token: string; user: User; settings: SchoolSettings; dashboard: DashboardData }) => void;
  onOpenAppsScript: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onOpenAppsScript }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let isMounted = true;
    getSchoolSettings().then((s) => {
      if (isMounted) setSettings(s);
    });

    const unsubscribe = subscribeToRealtimeChanges('lms_settings', async () => {
      const s = await getSchoolSettings();
      if (isMounted) setSettings(s);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const principalName = settings.PRINCIPAL_NAME || 'Ai Sukaesih, S.Pd';
  const schoolName = settings.SCHOOL_NAME || 'MAS MUHAMMADIYAH CIKARAMAS';
  const principalInitials = principalName
    .replace(/(S\.Pd|M\.Pd|Drs\.|Dr\.|H\.|Hj\.|M\.Ag|M\.Si)/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || 'AS';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(username, password);
      safeStorageSet('lms_token', data.token);
      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Login gagal.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  const handleResetData = async () => {
    try {
      await ensureInitialized(true);
      const refreshed = await getSchoolSettings();
      setSettings(refreshed);
      setResetMessage(`Database berhasil diatur ke data awal pabrik (Kepala Madrasah: ${refreshed.PRINCIPAL_NAME || 'Ai Sukaesih, S.Pd'})!`);
      setTimeout(() => setResetMessage(''), 4000);
    } catch {
      setError('Gagal mereset database.');
    }
  };

  return (
    <div id="loginView" className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] bg-[#F1F3F5]">
      {/* Art / Hero Section */}
      <section className="login-art relative overflow-hidden p-8 lg:p-14 text-white flex flex-col justify-between bg-gradient-to-br from-[#071D49] via-[#003B8E] to-[#0052CC]">
        {/* Subtle Background Watermark */}
        <div className="absolute -bottom-10 -right-10 pointer-events-none select-none opacity-[0.06] text-right font-black uppercase leading-none">
          <div className="text-6xl lg:text-8xl tracking-tight">{principalName}</div>
          <div className="text-3xl lg:text-5xl tracking-widest mt-2">{schoolName}</div>
        </div>

        <div className="relative z-10">
          <div className="brand flex items-center gap-3 font-bold tracking-tight text-lg sm:text-xl">
            <div className="brand-logo w-10 h-10 rounded-md bg-white text-[#0052CC] grid place-items-center shadow-sm">
              <School className="w-5 h-5" />
            </div>
            <span>CBT {schoolName}</span>
          </div>
        </div>

        <div className="login-hero relative z-10 max-w-xl my-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium mb-4 border border-white/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {schoolName} • CBT Edition v1.0.3
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight mb-4 text-white">
            Kelola pembelajaran dan ujian dalam satu aplikasi.
          </h1>
          <p className="text-base sm:text-lg leading-relaxed text-white/80 max-w-lg mb-6">
            Platform CBT terpadu {schoolName}. Dilengkapi CBT Anti-Curang (Lockdown Mode), Bank Soal, Koreksi Uraian, dan Sinkronisasi Real-Time Otomatis.
          </p>

          <div className="feature-pills flex flex-wrap gap-2.5 mb-6">
            <span className="feature-pill px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-white/95">
              ⚡ Real-time Online
            </span>
            <span className="feature-pill px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-white/95">
              🛡️ Lockdown Mode
            </span>
            <span className="feature-pill px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-white/95">
              📊 Live Monitoring
            </span>
            <span className="feature-pill px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-white/95">
              📁 Import / Export Excel & Word
            </span>
            <span className="feature-pill px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-white/95">
              🖨️ Cetak Kartu & Berita Acara
            </span>
          </div>

          {/* Pejabat Sekolah / Latar Lembaga Dinamis */}
          <div className="p-3.5 rounded-lg bg-white/10 border border-white/15 backdrop-blur-xs flex items-center gap-3.5 max-w-md">
            <div className="w-10 h-10 rounded-full bg-white/20 grid place-items-center text-white font-bold text-sm flex-shrink-0">
              {principalInitials}
            </div>
            <div className="text-xs">
              <div className="text-white/70 uppercase tracking-wider font-semibold text-[10px]">
                Penanggung Jawab / Kepala Madrasah
              </div>
              <div className="font-bold text-white text-sm">{principalName}</div>
              <div className="text-blue-200 text-[11px]">{schoolName}</div>
            </div>
          </div>
        </div>

        <div className="login-footer relative z-10 flex flex-wrap items-center justify-between gap-4 text-xs text-white/70 pt-4 border-t border-white/15">
          <span>CBT {schoolName} • {principalName}</span>
          <button
            type="button"
            onClick={onOpenAppsScript}
            className="inline-flex items-center gap-1.5 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors border border-white/20"
          >
            <FileCode className="w-3.5 h-3.5 text-blue-200" />
            <span>Lihat Kode Sumber Apps Script</span>
          </button>
        </div>
      </section>

      {/* Login Form Panel */}
      <section className="login-panel flex items-center justify-center p-6 sm:p-10">
        <div className="login-card w-full max-w-md bg-white border border-[#DEE2E6] rounded-lg p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-[#1A1C1E]">Selamat Datang</h2>
            <div className="w-8 h-8 rounded-md bg-[#E8F0FE] flex items-center justify-center text-[#0052CC]">
              <School className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xs sm:text-sm text-[#6C757D] mb-6">
            Masuk ke portal CBT MAS MUHAMMADIYAH CIKARAMAS untuk guru, siswa, atau administrator.
          </p>

          {error && (
            <div className="mb-5 p-3 rounded-md bg-[#FCE8E6] border border-[#FAD2CF] text-[#C5221F] text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-[#C5221F]" />
              <span>{error}</span>
            </div>
          )}

          {resetMessage && (
            <div className="mb-5 p-3 rounded-md bg-[#E6F4EA] border border-[#CEEAD6] text-[#137333] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#137333]" />
              <span>{resetMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="field">
              <label className="block text-xs font-medium text-[#1A1C1E] mb-1.5">Username / NIS / NIP</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6C757D]">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  id="loginUsername"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 border border-[#CED4DA] rounded-md text-xs sm:text-sm outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] transition-all text-[#1A1C1E] bg-white"
                  placeholder="Masukkan username"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="block text-xs font-medium text-[#1A1C1E] mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6C757D]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="loginPassword"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 border border-[#CED4DA] rounded-md text-xs sm:text-sm outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] transition-all text-[#1A1C1E] bg-white"
                  placeholder="Masukkan password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-xs disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Memeriksa...' : 'Masuk ke CBT'}</span>
            </button>
          </form>

          {/* Demo account selector pills */}
          <div className="mt-6 pt-5 border-t border-[#DEE2E6]">
            <p className="text-xs font-medium text-[#6C757D] mb-2.5">Pilih Akun Demo Cepat (1 Sampel):</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDemoAccount('admin', 'Admin123!')}
                className={`px-2.5 py-2 rounded-md text-xs font-medium border transition-colors text-left ${
                  username === 'admin'
                    ? 'bg-[#0052CC] text-white border-[#0052CC]'
                    : 'bg-[#F8F9FA] text-[#1A1C1E] border-[#DEE2E6] hover:bg-[#E9ECEF]'
                }`}
              >
                <div className="font-bold">Admin</div>
                <div className="text-[10px] opacity-80 truncate">admin / Admin123!</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoAccount('guru01', 'Guru123!')}
                className={`px-2.5 py-2 rounded-md text-xs font-medium border transition-colors text-left ${
                  username === 'guru01'
                    ? 'bg-[#0052CC] text-white border-[#0052CC]'
                    : 'bg-[#F8F9FA] text-[#1A1C1E] border-[#DEE2E6] hover:bg-[#E9ECEF]'
                }`}
              >
                <div className="font-bold">Guru</div>
                <div className="text-[10px] opacity-80 truncate">guru01 / Guru123!</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoAccount('siswa01', 'Siswa123!')}
                className={`px-2.5 py-2 rounded-md text-xs font-medium border transition-colors text-left ${
                  username === 'siswa01'
                    ? 'bg-[#0052CC] text-white border-[#0052CC]'
                    : 'bg-[#F8F9FA] text-[#1A1C1E] border-[#DEE2E6] hover:bg-[#E9ECEF]'
                }`}
              >
                <div className="font-bold">Siswa</div>
                <div className="text-[10px] opacity-80 truncate">siswa01 / Siswa123!</div>
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleResetData}
                className="inline-flex items-center gap-1 text-xs text-[#6C757D] hover:text-[#0052CC] font-medium transition-colors"
                title="Atur ulang database ke pengaturan pabrik (1 sampel)"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Atur Awal / Pabrik Data</span>
              </button>

              <button
                type="button"
                onClick={onOpenAppsScript}
                className="inline-flex items-center gap-1 text-xs text-[#0052CC] hover:underline font-medium"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Kode Script</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
