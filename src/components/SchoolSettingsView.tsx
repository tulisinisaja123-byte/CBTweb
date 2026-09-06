import React, { useState } from 'react';
import {
  Save,
  CheckCircle2,
  Building,
  Phone,
  MapPin,
  Calendar,
  UserCheck,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Database,
  Download,
  FileCode,
  Wrench,
  Image as ImageIcon,
  AlertTriangle,
  Layers,
  Upload,
  Trash2,
  FileText,
  Eye
} from 'lucide-react';
import { saveSettings, ensureInitialized, getSchoolSettings } from '../services/supabaseLmsStorage';
import { exportAllLocalStorageToJson } from '../services/migrationService';
import { SchoolSettings, CurriculumType } from '../types';
import { CURRICULUM_CONFIG } from '../data/curriculumData';
import { MaCikaramasLogoSvg, MuhammadiyahLogoSvg } from './OfficialLogos';
import { OfficialKopSurat } from './OfficialKopSurat';
import { compressAndOptimizeLogo } from '../utils/imageCompressor';

interface SchoolSettingsViewProps {
  token: string;
  initialSettings: SchoolSettings;
  onSettingsSaved: (newSettings: SchoolSettings) => void;
  onOpenAppsScript?: () => void;
  onOpenSupabaseRls?: () => void;
  onOpenMigration?: () => void;
}

export const SchoolSettingsView: React.FC<SchoolSettingsViewProps> = ({
  token,
  initialSettings,
  onSettingsSaved,
  onOpenAppsScript,
  onOpenSupabaseRls,
  onOpenMigration
}) => {
  const [form, setForm] = useState<SchoolSettings>(() => {
    return {
      CURRICULUM: 'MERDEKA',
      SEMESTER: '1 (Ganjil)',
      SCHOOL_YEAR: '2026/2027',
      SCHOOL_CITY: 'Kabupaten Sumedang',
      KOP_HEADER_1: 'MAJELIS PENDIDIKAN DASAR DAN MENENGAH',
      KOP_HEADER_2: 'PIMPINAN DAERAH MUHAMMADIYAH SUMEDANG',
      SCHOOL_NAME: 'MA. MUHAMMADIYAH CIKARAMAS',
      KOP_NSM: '131.232.110.020',
      KOP_NPSN: '69976352',
      KOP_AKREDITASI: 'Terakreditasi : B (Baik) SKBAN-SM Nomor : 763/BAN-SM/SK/2025',
      KOP_ALAMAT: 'Jl. Cikaramas-Tanjungmedar KM 01 Kecamatan Tanjungmedar',
      KOP_KOTA_KODEPOS: 'Kabupaten Sumedang Kode Pos. 45354',
      KOP_TELEPON: '085221402402',
      KOP_EMAIL: 'aliyah.cikaramas@gmail.com',
      ...initialSettings
    };
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [logoStats, setLogoStats] = useState<string | null>(null);
  const [isSavingLogo, setIsSavingLogo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setErrorMessage('');
    try {
      const res = await saveSettings(token, form);
      onSettingsSaved(res.settings);
      setSuccess(true);
      setLogoStats(null);
      setTimeout(() => setSuccess(false), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessLogoFile = async (file: File) => {
    if (!file.type.startsWith('image/') && !file.name.toLowerCase().endsWith('.svg')) {
      setErrorMessage('Berkas harus berupa gambar (PNG, JPG, SVG, WebP).');
      return;
    }
    try {
      setErrorMessage('');
      const res = await compressAndOptimizeLogo(file);
      setForm(prev => ({ ...prev, LOGO_URL: res.dataUrl }));
      setLogoStats(`Ukuran gambar dioptimalkan: ${res.sizeKb} KB (sebelumnya ${res.originalSizeKb} KB) — Aman & anti-hilang`);
    } catch (err: any) {
      setErrorMessage('Gagal memproses gambar: ' + (err.message || 'Format tidak didukung'));
    }
  };

  const handleSaveLogoImmediately = async (customLogoUrl?: string) => {
    const targetLogo = customLogoUrl !== undefined ? customLogoUrl : form.LOGO_URL;
    setIsSavingLogo(true);
    setLoading(true);
    setSuccess(false);
    setErrorMessage('');
    try {
      const updatedForm = { ...form, LOGO_URL: targetLogo };
      const res = await saveSettings(token, updatedForm);
      setForm(res.settings);
      onSettingsSaved(res.settings);
      setSuccess(true);
      setLogoStats(null);
      setTimeout(() => setSuccess(false), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan logo.');
    } finally {
      setIsSavingLogo(false);
      setLoading(false);
    }
  };

  const handleResetFactoryData = async () => {
    const confirmReset = window.confirm(
      'PERINGATAN SISTEM PENGKODEAN:\nApakah Anda yakin ingin mengatur ulang data ke data awal pabrik?\nSemua penyesuaian simulasi akan kembali ke konfigurasi standar Madrasah.'
    );
    if (!confirmReset) return;

    setResetting(true);
    setResetMessage('');
    try {
      await ensureInitialized(true);
      const refreshed = await getSchoolSettings();
      setForm(refreshed);
      onSettingsSaved(refreshed);
      setResetMessage('Database dan pengaturan berhasil diatur ulang ke data awal pabrik!');
      setTimeout(() => setResetMessage(''), 5000);
    } catch {
      setErrorMessage('Gagal mereset database ke data awal.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Pengaturan Madrasah & Kurikulum
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Konfigurasi identitas lembaga, tahun ajaran aktif, titimangsa dokumen resmi, logo kop surat, dan pengkodean sistem.
          </p>
        </div>
        <button
          type="submit"
          form="settings-form"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Menyimpan...' : 'Simpan Seluruh Pengaturan'}</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Pengaturan madrasah, kurikulum, dan kop dokumen berhasil diperbarui!</span>
        </div>
      )}

      {resetMessage && (
        <div className="p-3.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>{resetMessage}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
        <form id="settings-form" onSubmit={handleSubmit} className="space-y-6 text-xs">
          
          {/* PEMILIHAN KERANGKA KURIKULUM */}
          <div>
            <label className="block font-semibold text-slate-900 mb-2 text-sm flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-700" />
              <span>Kerangka Kurikulum Aktif</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(CURRICULUM_CONFIG) as CurriculumType[]).map(curKey => {
                const config = CURRICULUM_CONFIG[curKey];
                const isSelected = (form.CURRICULUM || 'MERDEKA') === curKey;
                return (
                  <label
                    key={curKey}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="CURRICULUM"
                      value={curKey}
                      checked={isSelected}
                      onChange={() => setForm({ ...form, CURRICULUM: curKey })}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className={`w-4 h-4 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`} />
                        <span className="font-bold text-slate-900 text-sm">{config.name}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                      {config.description}
                    </p>
                    <div className="mt-3 pt-2 border-t border-black/5 flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-emerald-700 font-semibold">{config.levelNames.X}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold">{config.levelNames.XI}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold">{config.levelNames.XII}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* TAHUN AJARAN & SEMESTER (DIPERBAIKI SECARA DINAMIS) */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>Tahun Pelajaran & Semester Aktif</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800">Tahun Pelajaran *</label>
                <input
                  type="text"
                  required
                  value={form.SCHOOL_YEAR || ''}
                  onChange={e => setForm({ ...form, SCHOOL_YEAR: e.target.value })}
                  placeholder="Contoh: 2026/2027"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-xs font-semibold text-slate-900 bg-white"
                />
                <p className="text-[10px] text-slate-500">
                  Format tahun ajaran resmi (contoh: 2026/2027).
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800">Semester Aktif *</label>
                <select
                  value={form.SEMESTER || '1 (Ganjil)'}
                  onChange={e => setForm({ ...form, SEMESTER: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white font-semibold text-xs text-slate-900"
                >
                  <option value="1 (Ganjil)">1 (Ganjil)</option>
                  <option value="2 (Genap)">2 (Genap)</option>
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
                <p className="text-[10px] text-slate-500">
                  Semester aktif otomatis tertera di judul jadwal & dokumen.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800">Nama Asesmen / Ujian Resmi *</label>
                <input
                  type="text"
                  value={form.DEFAULT_ASSESSMENT_NAME || 'Sumatif Akhir Semester (SAS)'}
                  onChange={e => setForm({ ...form, DEFAULT_ASSESSMENT_NAME: e.target.value, ASSESSMENT_TITLE: e.target.value })}
                  placeholder="Contoh: Sumatif Akhir Semester (SAS)"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-xs font-semibold text-slate-900 bg-white"
                />
                <p className="text-[10px] text-slate-500">
                  Judul asesmen utama untuk Dokumen Jadwal, Kartu & Presensi.
                </p>
              </div>
            </div>
          </div>

          {/* IDENTITAS SEKOLAH / MADRASAH */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-emerald-700" />
              <span>Identitas Resmi Madrasah / Sekolah</span>
            </h3>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800">Nama Sekolah / Lembaga *</label>
              <input
                type="text"
                required
                value={form.SCHOOL_NAME || ''}
                onChange={e => setForm({ ...form, SCHOOL_NAME: e.target.value })}
                placeholder="Contoh: MADRASAH ALIYAH MUHAMMADIYAH CIKARAMAS"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-bold text-xs text-slate-900 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>Alamat Lengkap Madrasah *</span>
              </label>
              <input
                type="text"
                required
                value={form.SCHOOL_ADDRESS || ''}
                onChange={e => setForm({ ...form, SCHOOL_ADDRESS: e.target.value })}
                placeholder="Jalan, Nomor, Kelurahan, Kecamatan"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-xs text-slate-900 bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800">
                  Kabupaten / Kota (Titimangsa Pengesahan Surat) *
                </label>
                <input
                  type="text"
                  required
                  value={form.SCHOOL_CITY || ''}
                  onChange={e => setForm({ ...form, SCHOOL_CITY: e.target.value })}
                  placeholder="Contoh: Kabupaten Sumedang"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-xs font-semibold text-slate-900 bg-white"
                />
                <p className="text-[10px] text-slate-500">
                  Digunakan untuk titimangsa tanggal pengesahan jadwal dan berita acara (contoh: Kabupaten Sumedang).
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Nomor Telepon Madrasah</span>
                </label>
                <input
                  type="text"
                  value={form.SCHOOL_PHONE || ''}
                  onChange={e => setForm({ ...form, SCHOOL_PHONE: e.target.value })}
                  placeholder="(0261) 882190"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-xs text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* PENGATURAN KOP SURAT DOKUMEN RESMI */}
          <div className="pt-6 border-t border-slate-200 space-y-5">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span>Format & Pengaturan Kop Surat Resmi</span>
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                Konfigurasi teks kepala surat, nomor identitas madrasah, akreditasi, kontak, dan logo untuk seluruh dokumen cetak (Kartu Peserta, Berita Acara, Jadwal Ujian, Presensi, dan SK).
              </p>
            </div>

            {/* LIVE PREVIEW KOP SURAT */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Pratinjau Hasil Cetak Kop Surat</span>
                </div>
                <span className="text-[10px] bg-white text-emerald-800 border border-emerald-300 font-semibold px-2 py-0.5 rounded shadow-2xs">
                  Standar Resmi (Tanpa Logo Kemenag Kanan)
                </span>
              </div>
              <div className="p-4 bg-white border border-slate-300 rounded-lg shadow-2xs overflow-x-auto">
                <OfficialKopSurat settings={form} idSuffix="settings-live-preview" />
              </div>
            </div>

            {/* FORM FIELD KOP SURAT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800">Instansi Induk / Majelis (Baris 1)</label>
                <input
                  type="text"
                  value={form.KOP_HEADER_1 || ''}
                  onChange={e => setForm({ ...form, KOP_HEADER_1: e.target.value })}
                  placeholder="MAJELIS PENDIDIKAN DASAR DAN MENENGAH"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 text-xs font-semibold text-slate-900 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800">Pimpinan Daerah / Yayasan (Baris 2)</label>
                <input
                  type="text"
                  value={form.KOP_HEADER_2 || ''}
                  onChange={e => setForm({ ...form, KOP_HEADER_2: e.target.value })}
                  placeholder="PIMPINAN DAERAH MUHAMMADIYAH SUMEDANG"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 text-xs font-semibold text-slate-900 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800">Nama Madrasah / Sekolah (Baris 3)</label>
                <input
                  type="text"
                  value={form.SCHOOL_NAME || ''}
                  onChange={e => setForm({ ...form, SCHOOL_NAME: e.target.value })}
                  placeholder="MA. MUHAMMADIYAH CIKARAMAS"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 text-xs font-bold text-slate-900 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800">Nomor Identitas (NSM & NPSN)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={form.KOP_NSM || ''}
                    onChange={e => setForm({ ...form, KOP_NSM: e.target.value })}
                    placeholder="NSM: 131.232.110.020"
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 text-xs font-semibold text-slate-900 bg-white"
                  />
                  <input
                    type="text"
                    value={form.KOP_NPSN || ''}
                    onChange={e => setForm({ ...form, KOP_NPSN: e.target.value })}
                    placeholder="NPSN: 69976352"
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 text-xs font-semibold text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="font-semibold text-slate-800">Status Akreditasi & Nomor SK</label>
                <input
                  type="text"
                  value={form.KOP_AKREDITASI || ''}
                  onChange={e => setForm({ ...form, KOP_AKREDITASI: e.target.value })}
                  placeholder="Terakreditasi : B (Baik) SKBAN-SM Nomor : 763/BAN-SM/SK/2025"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 text-xs text-slate-900 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800">Alamat Lengkap</label>
                <input
                  type="text"
                  value={form.KOP_ALAMAT || form.SCHOOL_ADDRESS || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setForm({ ...form, KOP_ALAMAT: val, SCHOOL_ADDRESS: val });
                  }}
                  placeholder="Jl. Cikaramas-Tanjungmedar KM 01 Kecamatan Tanjungmedar"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 text-xs text-slate-900 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800">Kabupaten & Kode Pos</label>
                <input
                  type="text"
                  value={form.KOP_KOTA_KODEPOS || ''}
                  onChange={e => setForm({ ...form, KOP_KOTA_KODEPOS: e.target.value })}
                  placeholder="Kabupaten Sumedang Kode Pos. 45354"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 text-xs text-slate-900 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800">Nomor Telepon / Kontak</label>
                <input
                  type="text"
                  value={form.KOP_TELEPON || form.SCHOOL_PHONE || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setForm({ ...form, KOP_TELEPON: val, SCHOOL_PHONE: val });
                  }}
                  placeholder="085221402402"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 text-xs text-slate-900 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800">Email Resmi Madrasah</label>
                <input
                  type="email"
                  value={form.KOP_EMAIL || form.SCHOOL_EMAIL || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setForm({ ...form, KOP_EMAIL: val, SCHOOL_EMAIL: val });
                  }}
                  placeholder="aliyah.cikaramas@gmail.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 text-xs text-slate-900 bg-white"
                />
              </div>
            </div>

            {/* OPSI LOGO KOP SURAT (SISI KIRI) */}
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-700" />
                  <span>Logo Lembaga (Sisi Kiri Kop Surat)</span>
                </h4>
                <div className="flex items-center gap-2">
                  {form.LOGO_URL ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSaveLogoImmediately('')}
                        disabled={isSavingLogo}
                        className="px-2.5 py-1 text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1.5 font-semibold cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus & Simpan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveLogoImmediately(form.LOGO_URL)}
                        disabled={isSavingLogo}
                        className="px-3 py-1 text-xs text-white bg-emerald-700 hover:bg-emerald-800 border border-emerald-700 rounded-lg flex items-center gap-1.5 font-bold cursor-pointer transition-colors shadow-2xs"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSavingLogo ? 'Menyimpan...' : 'Simpan Logo Sekarang'}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSaveLogoImmediately('/logo-ma-cikaramas.svg')}
                      disabled={isSavingLogo}
                      className="px-2.5 py-1 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1.5 font-semibold cursor-pointer transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isSavingLogo ? 'Menyimpan...' : 'Pakai Logo MA Muhammadiyah & Simpan'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Area Unggah & Tautan Logo */}
              <div
                onDragOver={e => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    handleProcessLogoFile(file);
                  }
                }}
                className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-2xs">
                      {!form.LOGO_URL ? (
                        <div className="text-[9px] text-slate-400 font-semibold uppercase">Kosong</div>
                      ) : form.LOGO_URL === '/logo-ma-cikaramas.svg' ? (
                        <MaCikaramasLogoSvg size={44} className="w-11 h-11" idSuffix="settings-preview-sm" />
                      ) : form.LOGO_URL === 'MUHAMMADIYAH_STANDARD' ? (
                        <MuhammadiyahLogoSvg size={44} className="w-11 h-11" />
                      ) : (
                        <img
                          src={form.LOGO_URL}
                          alt="Logo"
                          className="max-h-12 max-w-12 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>{form.LOGO_URL ? 'Logo Aktif Terpasang' : 'Belum Ada Logo (Kop Teks Saja)'}</span>
                        {form.LOGO_URL && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                            Tersedia
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Tarik & lepas file gambar (PNG, JPG, SVG) ke kotak ini atau klik tombol pilih gambar.
                      </p>
                      {logoStats && (
                        <div className="mt-1 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{logoStats}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer transition-colors shrink-0 shadow-2xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Pilih Gambar</span>
                      <input
                        type="file"
                        accept="image/*,.svg"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleProcessLogoFile(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-600 shrink-0">Tautan Gambar (URL):</span>
                  <input
                    type="text"
                    value={form.LOGO_URL || ''}
                    onChange={e => setForm({ ...form, LOGO_URL: e.target.value })}
                    placeholder="https://... (tautan file gambar langsung)"
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 text-xs text-slate-900 bg-slate-50 focus:bg-white transition-colors"
                  />
                  {form.LOGO_URL && (
                    <button
                      type="button"
                      onClick={() => handleSaveLogoImmediately(form.LOGO_URL)}
                      disabled={isSavingLogo}
                      className="px-2.5 py-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      {isSavingLogo ? 'Menyimpan...' : 'Simpan URL'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* PEJABAT MADRASAH */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-700" />
              <span>Pimpinan & Panitia Ujian</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800">Jabatan Pimpinan</label>
                <select
                  value={form.PRINCIPAL_TITLE || 'Kepala Madrasah'}
                  onChange={e => setForm({ ...form, PRINCIPAL_TITLE: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white text-xs font-semibold text-slate-900"
                >
                  <option value="Kepala Madrasah">Kepala Madrasah (MA / MTs / MI)</option>
                  <option value="Kepala Sekolah">Kepala Sekolah (SMA / SMK / SMP / SD)</option>
                  <option value="Plt. Kepala Madrasah">Plt. Kepala Madrasah</option>
                  <option value="Plt. Kepala Sekolah">Plt. Kepala Sekolah</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800">Nama Kepala & Gelar</label>
                <input
                  type="text"
                  value={form.PRINCIPAL_NAME || ''}
                  onChange={e => setForm({ ...form, PRINCIPAL_NAME: e.target.value })}
                  placeholder="Ai Sukaesih, S.Pd"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 text-xs font-semibold text-slate-900 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800">NBM / NIP Kepala</label>
                <input
                  type="text"
                  value={form.PRINCIPAL_NIP || ''}
                  onChange={e => setForm({ ...form, PRINCIPAL_NIP: e.target.value })}
                  placeholder="1281201"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 text-xs text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Menyimpan Pengaturan...' : 'Simpan Seluruh Pengaturan'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* =========================================================================
          PENGATURAN KHUSUS PENGKODEAN, SKRIP & DATABASE (DIPINDAHKAN DARI MENU PUBLIK)
          ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-8 shadow-md border border-slate-800 space-y-6">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <FileCode className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-1">
              Akses Khusus Pengembang & Pengkodean
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Pengaturan Khusus & Pengkodean Sistem
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Bagian ini mengkhususkan semua utilitas teknis, skrip Google Apps Script (GAS), kebijakan keamanan database PostgreSQL Supabase (RLS), migrasi data, dan pemulihan pabrik data.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Card 1: Kode Sumber Apps Script */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <FileCode className="w-4 h-4" />
                <span>Kode Sumber Google Apps Script (GAS)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Salin skrip backend lengkap Apps Script untuk Google Sheets / Spreadsheet jika Anda ingin menjalankan sinkronisasi spreadsheet mandiri.
              </p>
            </div>
            {onOpenAppsScript && (
              <button
                type="button"
                onClick={onOpenAppsScript}
                className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Buka Kode Sumber Apps Script</span>
              </button>
            )}
          </div>

          {/* Card 2: Keamanan Row-Level Security (RLS) */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Keamanan RLS PostgreSQL Supabase</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Konfigurasi aturan baris database untuk membatasi akses lembar jawaban dan bank soal antar siswa dan guru.
              </p>
            </div>
            {onOpenSupabaseRls && (
              <button
                type="button"
                onClick={onOpenSupabaseRls}
                className="w-full py-2 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-cyan-200 border border-slate-600 font-semibold text-xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Kelola Kebijakan RLS</span>
              </button>
            )}
          </div>

          {/* Card 3: Migrasi Database Cloud */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                <Database className="w-4 h-4" />
                <span>Migrasi Data ke Cloud Supabase</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Pindahkan seluruh data bank soal, ujian, rombel, dan nilai dari local storage ke database cloud dengan pemantauan realtime.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {onOpenMigration && (
                <button
                  type="button"
                  onClick={onOpenMigration}
                  className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Buka Migrasi</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  try {
                    exportAllLocalStorageToJson();
                  } catch (e: any) {
                    alert(e.message);
                  }
                }}
                className="py-2 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                title="Unduh berkas JSON cadangan"
              >
                <Download className="w-3.5 h-3.5 text-slate-300" />
                <span>Cadangan JSON</span>
              </button>
            </div>
          </div>

          {/* Card 4: Pabrik Data / Factory Reset */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Wrench className="w-4 h-4" />
                <span>Atur Ulang ke Data Awal Pabrik</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Kembalikan bank soal, jadwal simulasi, dan akun pengawas ke standar awal madrasah jika database mengalami inkonsistensi.
              </p>
            </div>
            <button
              type="button"
              disabled={resetting}
              onClick={handleResetFactoryData}
              className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{resetting ? 'Mengatur Ulang...' : 'Atur Awal / Pabrik Data'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolSettingsView;
