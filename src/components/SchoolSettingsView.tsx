import React, { useState } from 'react';
import { Save, CheckCircle2, Building, Phone, MapPin, Calendar, UserCheck, BookOpen, Sparkles, ShieldCheck, Database, Download } from 'lucide-react';
import { saveSettings } from '../services/supabaseLmsStorage';
import { exportAllLocalStorageToJson } from '../services/migrationService';
import { SchoolSettings, CurriculumType } from '../types';
import { CURRICULUM_CONFIG } from '../data/curriculumData';

interface SchoolSettingsViewProps {
  token: string;
  initialSettings: SchoolSettings;
  onSettingsSaved: (newSettings: SchoolSettings) => void;
  onOpenSupabaseRls?: () => void;
  onOpenMigration?: () => void;
}

export const SchoolSettingsView: React.FC<SchoolSettingsViewProps> = ({
  token,
  initialSettings,
  onSettingsSaved,
  onOpenSupabaseRls,
  onOpenMigration
}) => {
  const [form, setForm] = useState<SchoolSettings>({
    CURRICULUM: 'MERDEKA',
    ...initialSettings
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setErrorMessage('');
    try {
      const res = await saveSettings(token, form);
      onSettingsSaved(res.settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1A1C1E] tracking-tight">Pengaturan Sekolah</h1>
        <p className="text-xs sm:text-sm text-[#6C757D] mt-1">
          Informasi kurikulum, identitas lembaga, dan kop surat resmi pada administrasi ujian (Kartu Peserta, Daftar Hadir, Berita Acara).
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-md bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF] text-xs flex items-center gap-2">
          <span>{errorMessage}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-md bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#137333] flex-shrink-0" />
          <span>Pengaturan sekolah dan kurikulum berhasil disimpan!</span>
        </div>
      )}

      <div className="bg-white border border-[#DEE2E6] rounded-lg p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* Kurikulum Selection */}
          <div className="space-y-3 pb-5 border-b border-[#DEE2E6]">
            <label className="font-bold text-sm text-[#1A1C1E] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#0052CC]" />
              <span>Kurikulum Utama Sekolah *</span>
            </label>
            <p className="text-[11px] text-[#6C757D]">
              Pilihan kurikulum ini akan menyesuaikan rekomendasi mata pelajaran, struktur kelas (Fase E/F vs MIPA/IPS), dan format template soal Word.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {(['MERDEKA', 'K13'] as CurriculumType[]).map(cur => {
                const config = CURRICULUM_CONFIG[cur];
                const isSelected = (form.CURRICULUM || 'MERDEKA') === cur;
                return (
                  <label
                    key={cur}
                    onClick={() => setForm({ ...form, CURRICULUM: cur })}
                    className={`cursor-pointer p-4 rounded-lg border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#0052CC] bg-[#EBF3FC] ring-2 ring-[#0052CC]/20'
                        : 'border-[#CED4DA] bg-white hover:border-[#0052CC]/60 hover:bg-[#F8F9FA]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-sm text-[#1A1C1E] flex items-center gap-1.5">
                        {cur === 'MERDEKA' && <Sparkles className="w-3.5 h-3.5 text-[#0052CC]" />}
                        {config.name}
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-[#0052CC] bg-[#0052CC]' : 'border-[#CED4DA] bg-white'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-[#5E6C84] mt-2 leading-relaxed">
                      {config.description}
                    </p>
                    <div className="mt-3 pt-2 border-t border-black/5 flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-[#0052CC] font-semibold">{config.levelNames.X}</span>
                      <span>•</span>
                      <span className="text-[#0052CC] font-semibold">{config.levelNames.XI}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-[#1A1C1E] flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[#0052CC]" />
              <span>Nama Sekolah / Lembaga *</span>
            </label>
            <input
              type="text"
              required
              value={form.SCHOOL_NAME || ''}
              onChange={e => setForm({ ...form, SCHOOL_NAME: e.target.value })}
              placeholder="Contoh: SMA NEGERI 1 INDONESIA"
              className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] font-medium text-sm text-[#1A1C1E]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-[#1A1C1E] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0052CC]" />
              <span>Alamat Lengkap Sekolah *</span>
            </label>
            <input
              type="text"
              required
              value={form.SCHOOL_ADDRESS || ''}
              onChange={e => setForm({ ...form, SCHOOL_ADDRESS: e.target.value })}
              placeholder="Jalan, Nomor, Kelurahan, Kecamatan"
              className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-xs text-[#1A1C1E]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-medium text-[#1A1C1E]">Kota / Kabupaten</label>
              <input
                type="text"
                value={form.SCHOOL_CITY || ''}
                onChange={e => setForm({ ...form, SCHOOL_CITY: e.target.value })}
                placeholder="Contoh: Jakarta Pusat"
                className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-xs text-[#1A1C1E]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-[#1A1C1E] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#0052CC]" />
                <span>Nomor Telepon Sekolah</span>
              </label>
              <input
                type="text"
                value={form.SCHOOL_PHONE || ''}
                onChange={e => setForm({ ...form, SCHOOL_PHONE: e.target.value })}
                placeholder="(021) xxxxxxxx"
                className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-xs text-[#1A1C1E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#DEE2E6]">
            <div className="space-y-1.5">
              <label className="font-medium text-[#1A1C1E] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#0052CC]" />
                <span>Jabatan Pimpinan</span>
              </label>
              <select
                value={form.PRINCIPAL_TITLE || 'Kepala Madrasah'}
                onChange={e => setForm({ ...form, PRINCIPAL_TITLE: e.target.value })}
                className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-white text-xs text-[#1A1C1E] font-medium"
              >
                <option value="Kepala Madrasah">Kepala Madrasah (MA / MTs / MI)</option>
                <option value="Kepala Sekolah">Kepala Sekolah (SMA / SMK / SMP / SD)</option>
                <option value="Plt. Kepala Madrasah">Plt. Kepala Madrasah</option>
                <option value="Plt. Kepala Sekolah">Plt. Kepala Sekolah</option>
              </select>
              <p className="text-[10px] text-[#6C757D]">
                Menentukan sebutan resmi pada kartu, jadwal, naskah ujian, & pengesahan.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-[#1A1C1E] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#0052CC]" />
                <span>Nama Kepala & Gelar</span>
              </label>
              <input
                type="text"
                value={form.PRINCIPAL_NAME || ''}
                onChange={e => setForm({ ...form, PRINCIPAL_NAME: e.target.value })}
                placeholder="Contoh: Ai Sukaesih, S.Pd"
                className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-xs text-[#1A1C1E]"
              />
              <p className="text-[10px] text-[#6C757D]">
                Nama pimpinan beserta gelar akademik.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-[#1A1C1E] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#0052CC]" />
                <span>NBM / NIP Kepala</span>
              </label>
              <input
                type="text"
                value={form.PRINCIPAL_NIP || ''}
                onChange={e => setForm({ ...form, PRINCIPAL_NIP: e.target.value })}
                placeholder="Contoh: 1281201"
                className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-xs text-[#1A1C1E]"
              />
              <p className="text-[10px] text-[#6C757D]">
                Nomor Baku Muhammadiyah (NBM) atau NIP.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-medium text-[#1A1C1E] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#0052CC]" />
                <span>Tahun Pelajaran Aktif</span>
              </label>
              <input
                type="text"
                value={form.SCHOOL_YEAR || ''}
                onChange={e => setForm({ ...form, SCHOOL_YEAR: e.target.value })}
                placeholder="2026/2027"
                className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-xs text-[#1A1C1E]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-[#1A1C1E]">Semester Aktif</label>
              <select
                value={form.SEMESTER || 'Ganjil'}
                onChange={e => setForm({ ...form, SEMESTER: e.target.value })}
                className="w-full px-3.5 py-2 border border-[#CED4DA] rounded-md outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] bg-white font-medium text-xs text-[#1A1C1E]"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-[#DEE2E6] flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white font-medium text-xs inline-flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Menyimpan...' : 'Simpan Pengaturan Sekolah'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Row-Level Security (RLS) Database Info Card */}
      <div className="bg-white border border-[#DEE2E6] rounded-lg p-5 sm:p-6 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1A1C1E] flex items-center gap-2">
                Keamanan Database & Row-Level Security (RLS)
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Supabase PostgreSQL
                </span>
              </h3>
              <p className="text-xs text-[#6C757D] mt-1 max-w-xl leading-relaxed">
                Database CBT MAS MUHAMMADIYAH CIKARAMAS dilindungi dengan aturan keamanan tingkat baris (Row-Level Security) untuk menjamin siswa hanya dapat mengakses ujian kelasnya sendiri dan lembar jawabannya masing-masing.
              </p>
            </div>
          </div>

          {onOpenSupabaseRls && (
            <button
              type="button"
              onClick={onOpenSupabaseRls}
              className="px-3.5 py-2 rounded-lg bg-[#F8F9FA] hover:bg-[#E9ECEF] border border-[#CED4DA] text-xs font-semibold text-[#1A1C1E] inline-flex items-center gap-1.5 shadow-2xs transition-all whitespace-nowrap cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Kelola Kebijakan RLS</span>
            </button>
          )}
        </div>
      </div>

      {/* Migrasi & Ekspor Data ke Supabase Card */}
      <div className="bg-white border border-[#DEE2E6] rounded-lg p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-[#0052CC] mt-0.5">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1A1C1E] flex items-center gap-2">
                Migrasi & Ekspor Data ke Supabase
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-[#0052CC]">
                  One-Click Migration
                </span>
              </h3>
              <p className="text-xs text-[#6C757D] mt-1 max-w-xl leading-relaxed">
                Pindahkan seluruh data bank soal, ujian, rombel, nilai siswa, dan profil sekolah dari penyimpanan lokal browser (localStorage) ke database cloud Supabase secara otomatis dan aman dengan pemantauan progress realtime.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            {onOpenMigration && (
              <button
                type="button"
                onClick={onOpenMigration}
                className="px-3.5 py-2 rounded-lg bg-[#0052CC] hover:bg-[#0047B3] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Database className="w-4 h-4 text-white" />
                <span>Buka Panel Migrasi</span>
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
              className="px-3.5 py-2 rounded-lg bg-[#F8F9FA] hover:bg-[#E9ECEF] border border-[#CED4DA] text-xs font-semibold text-[#1A1C1E] inline-flex items-center gap-1.5 shadow-2xs transition-all whitespace-nowrap cursor-pointer"
              title="Unduh berkas cadangan JSON lengkap"
            >
              <Download className="w-4 h-4 text-[#0052CC]" />
              <span>Ekspor JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolSettingsView;

