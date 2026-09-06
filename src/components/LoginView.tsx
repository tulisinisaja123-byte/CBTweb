import React, { useState, useEffect } from 'react';
import { School, Lock, User as UserIcon, LogIn, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { login, safeStorageSet, getSchoolSettings, subscribeToRealtimeChanges } from '../services/supabaseLmsStorage';
import { User, SchoolSettings, DashboardData } from '../types';
import { DEFAULT_SETTINGS } from '../data/initialData';
import { MuhammadiyahLogoSvg, MaCikaramasLogoSvg } from './OfficialLogos';

interface LoginViewProps {
  onLoginSuccess: (data: { token: string; user: User; settings: SchoolSettings; dashboard: DashboardData }) => void;
  onOpenAppsScript?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  const schoolName = settings.SCHOOL_NAME || 'MAS MUHAMMADIYAH CIKARAMAS';
  const schoolCity = settings.SCHOOL_CITY || 'Kabupaten Sumedang';
  const schoolYear = settings.SCHOOL_YEAR || '2026/2027';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(username, password);
      safeStorageSet('lms_token', data.token);
      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Login gagal. Periksa username dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="loginView" className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] bg-[#F4F6F4]">
      {/* Art / Hero Section: Nuansa Hijau Khas Madrasah & Muhammadiyah yang Profesional */}
      <section className="login-art relative overflow-hidden p-8 lg:p-14 text-white flex flex-col justify-between bg-gradient-to-br from-[#032815] via-[#064e28] to-[#0a6e3b]">
        
        {/* Background Watermark Motto Madrasah (Bukan Nama Kepala) */}
        <div className="absolute -bottom-10 -right-10 pointer-events-none select-none opacity-[0.04] text-right font-black uppercase leading-none">
          <div className="text-6xl lg:text-8xl tracking-tight">IKHLAS BERAMAL</div>
          <div className="text-3xl lg:text-5xl tracking-widest mt-2">{schoolName}</div>
        </div>

        {/* Subtle Decorative Geometric Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />

        <div className="relative z-10">
          <div className="brand flex items-center gap-3 font-bold tracking-tight text-lg sm:text-xl">
            <div className="brand-logo w-11 h-11 rounded-lg bg-white p-1 text-[#064e28] grid place-items-center shadow-md overflow-hidden shrink-0">
              {settings.LOGO_URL === 'MUHAMMADIYAH_STANDARD' ? (
                <MuhammadiyahLogoSvg size={36} className="w-9 h-9" />
              ) : settings.LOGO_URL === '/logo-ma-cikaramas.svg' ? (
                <MaCikaramasLogoSvg size={36} className="w-9 h-9" idSuffix="login" />
              ) : settings.LOGO_URL ? (
                <img src={settings.LOGO_URL} alt="Logo" className="w-9 h-9 object-contain" referrerPolicy="no-referrer" />
              ) : (
                <School className="w-6 h-6 text-[#064e28]" />
              )}
            </div>
            <div>
              <div className="text-xs uppercase font-semibold tracking-wider text-emerald-300 leading-tight">
                Computer-Based Test & Android
              </div>
              <span className="text-white font-extrabold text-base sm:text-lg tracking-tight">
                CBT {schoolName}
              </span>
            </div>
          </div>
        </div>

        <div className="login-hero relative z-10 max-w-xl my-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/60 text-emerald-200 text-xs font-medium mb-4 border border-emerald-500/30 backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Tahun Pelajaran {schoolYear} • Sistem Penilaian Terstandar</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight mb-4 text-white">
            Portal Asesmen & Ujian Madrasah Terpadu
          </h1>

          <p className="text-sm sm:text-base leading-relaxed text-emerald-100/90 max-w-lg mb-6 font-normal">
            Platform asesmen digital {schoolName}. Dilengkapi proteksi anti-curang (Lockdown Mode), sinkronisasi nilai realtime, bank soal terstandar, dan pencetakan dokumen resmi.
          </p>

          <div className="feature-pills flex flex-wrap gap-2.5 mb-8">
            <span className="feature-pill px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-white/95 backdrop-blur-xs">
              ⚡ Real-time Online
            </span>
            <span className="feature-pill px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-white/95 backdrop-blur-xs">
              🛡️ Anti-Curang Lockdown
            </span>
            <span className="feature-pill px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-white/95 backdrop-blur-xs">
              📊 Koreksi Soal Otomatis
            </span>
            <span className="feature-pill px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-white/95 backdrop-blur-xs">
              🖨️ Cetak Kartu & Berita Acara
            </span>
          </div>

          {/* Profil Satuan Pendidikan Resmi */}
          <div className="p-4 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs flex items-center gap-4 max-w-md shadow-sm">
            <div className="w-11 h-11 rounded-lg bg-emerald-500/20 border border-emerald-400/30 grid place-items-center text-emerald-200 font-bold flex-shrink-0">
              <School className="w-5 h-5 text-emerald-100" />
            </div>
            <div className="text-xs">
              <div className="text-emerald-200/90 uppercase tracking-wider font-semibold text-[10px]">
                Satuan Pendidikan Penyelenggara
              </div>
              <div className="font-bold text-white text-sm tracking-tight">{schoolName}</div>
              <div className="text-emerald-300/90 text-[11px] mt-0.5">{schoolCity} • Jawa Barat</div>
            </div>
          </div>
        </div>

        {/* Footer: Bebas Nama Kepala & Bebas Tombol Kode */}
        <div className="login-footer relative z-10 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-200/80 pt-4 border-t border-white/15">
          <span>CBT {schoolName} • Portal Asesmen Berbasis Komputer & Android</span>
          <span className="font-medium text-emerald-300">TP {schoolYear}</span>
        </div>
      </section>

      {/* Login Form Panel: Elegan, Bersih, dan Profesional */}
      <section className="login-panel flex items-center justify-center p-6 sm:p-12">
        <div className="login-card w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Masuk ke Portal
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Silakan masukkan kredensial akun Anda
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
          </div>

          <div className="h-0.5 w-12 bg-emerald-600 rounded-full mb-6" />

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="field">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username / NISN / NIP
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  id="loginUsername"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-xs sm:text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-all text-slate-900 bg-white"
                  placeholder="Masukkan username Anda"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="loginPassword"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-xs sm:text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-all text-slate-900 bg-white"
                  placeholder="Masukkan kata sandi"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-white" />
              <span>{loading ? 'Memverifikasi...' : 'Masuk ke Sistem CBT'}</span>
            </button>
          </form>

          {/* Security & Access Protection Notice */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex items-center gap-3 text-slate-500 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px] leading-relaxed">
              Hak akses terlindungi dengan enkripsi keamanan terpusat untuk Administrator, Dewan Guru, dan Peserta Didik.
            </span>
          </div>

        </div>
      </section>
    </div>
  );
};
