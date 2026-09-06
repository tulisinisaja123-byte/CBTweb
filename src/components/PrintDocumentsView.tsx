import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CetakDokumenUjian } from './CetakDokumenUjian';
import { Exam, User, ClassItem, Subject, AssessmentType, SchoolSettings } from '../types';
import {
  getSchoolSettings as getAsyncSchoolSettings,
  subscribeToRealtimeChanges,
  SUPABASE_TABLES
} from '../services/supabaseLmsStorage';
import {
  getSchoolSettings as getLocalSchoolSettings,
  safeStorageGet
} from '../services/lmsStorage';
import { DEFAULT_SETTINGS } from '../data/initialData';
import { MaCikaramasLogoSvg, MuhammadiyahLogoSvg } from './OfficialLogos';
import {
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Building2,
  UserCheck,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export interface PrintDocumentsViewProps {
  token: string;
  exams: Exam[];
  users?: User[];
  classes?: ClassItem[];
  subjects?: Subject[];
  assessmentTypes?: AssessmentType[];
  settings?: SchoolSettings;
  defaultDocType?: 'cards' | 'attendance' | 'minutes';
  currentUser?: User;
}

/**
 * Fungsi untuk menarik pengaturan sekolah (khususnya Logo Madrasah dan Nama Kepala Sekolah)
 * secara otomatis dari tabel SchoolSettings (Supabase/Database & Local Storage)
 * demi menjaga konsistensi branding di seluruh dokumen cetak (Kartu Peserta, Berita Acara, Daftar Hadir).
 */
export async function fetchSchoolBrandingSettings(
  fallbackSettings?: SchoolSettings
): Promise<SchoolSettings> {
  try {
    // 1. Ambil data terbaru dari tabel SchoolSettings di database / Supabase
    const remote = await getAsyncSchoolSettings();
    const local = getLocalSchoolSettings();
    const dedicatedLogo = safeStorageGet('LMS_OFFICIAL_LOGO_DATA') || '';

    // 2. Prioritas resolusi Logo Madrasah yang valid
    const resolvedLogo =
      remote?.LOGO_URL ||
      dedicatedLogo ||
      fallbackSettings?.LOGO_URL ||
      local?.LOGO_URL ||
      DEFAULT_SETTINGS.LOGO_URL ||
      '/logo-ma-cikaramas.svg';

    // 3. Prioritas resolusi Nama Kepala Sekolah & NIP yang valid
    const resolvedPrincipalName =
      remote?.PRINCIPAL_NAME ||
      fallbackSettings?.PRINCIPAL_NAME ||
      local?.PRINCIPAL_NAME ||
      DEFAULT_SETTINGS.PRINCIPAL_NAME ||
      'Ai Sukaesih, S.Pd';

    const resolvedPrincipalTitle =
      remote?.PRINCIPAL_TITLE ||
      fallbackSettings?.PRINCIPAL_TITLE ||
      local?.PRINCIPAL_TITLE ||
      DEFAULT_SETTINGS.PRINCIPAL_TITLE ||
      'Kepala Madrasah';

    const resolvedPrincipalNip =
      remote?.PRINCIPAL_NIP ||
      fallbackSettings?.PRINCIPAL_NIP ||
      local?.PRINCIPAL_NIP ||
      DEFAULT_SETTINGS.PRINCIPAL_NIP ||
      '1281201';

    // 4. Susun objek SchoolSettings yang komprehensif
    const mergedSettings: SchoolSettings = {
      ...DEFAULT_SETTINGS,
      ...local,
      ...fallbackSettings,
      ...remote,
      LOGO_URL: resolvedLogo,
      PRINCIPAL_NAME: resolvedPrincipalName,
      PRINCIPAL_TITLE: resolvedPrincipalTitle,
      PRINCIPAL_NIP: resolvedPrincipalNip,
      SCHOOL_NAME:
        remote?.SCHOOL_NAME ||
        fallbackSettings?.SCHOOL_NAME ||
        local?.SCHOOL_NAME ||
        DEFAULT_SETTINGS.SCHOOL_NAME ||
        'MAS MUHAMMADIYAH CIKARAMAS',
      SCHOOL_CITY:
        remote?.SCHOOL_CITY ||
        fallbackSettings?.SCHOOL_CITY ||
        local?.SCHOOL_CITY ||
        DEFAULT_SETTINGS.SCHOOL_CITY ||
        'Sumedang',
      SCHOOL_YEAR:
        remote?.SCHOOL_YEAR ||
        fallbackSettings?.SCHOOL_YEAR ||
        local?.SCHOOL_YEAR ||
        DEFAULT_SETTINGS.SCHOOL_YEAR ||
        '2026/2027',
      SEMESTER:
        remote?.SEMESTER ||
        fallbackSettings?.SEMESTER ||
        local?.SEMESTER ||
        DEFAULT_SETTINGS.SEMESTER ||
        '1 (Ganjil)'
    };

    return mergedSettings;
  } catch (err) {
    console.warn('[PrintDocumentsView] Gagal memuat dari tabel SchoolSettings remote, fallback ke lokal:', err);
    const local = getLocalSchoolSettings();
    const dedicatedLogo = safeStorageGet('LMS_OFFICIAL_LOGO_DATA') || '';

    return {
      ...DEFAULT_SETTINGS,
      ...local,
      ...fallbackSettings,
      LOGO_URL:
        fallbackSettings?.LOGO_URL ||
        local?.LOGO_URL ||
        dedicatedLogo ||
        DEFAULT_SETTINGS.LOGO_URL ||
        '/logo-ma-cikaramas.svg',
      PRINCIPAL_NAME:
        fallbackSettings?.PRINCIPAL_NAME ||
        local?.PRINCIPAL_NAME ||
        DEFAULT_SETTINGS.PRINCIPAL_NAME ||
        'Ai Sukaesih, S.Pd',
      PRINCIPAL_TITLE:
        fallbackSettings?.PRINCIPAL_TITLE ||
        local?.PRINCIPAL_TITLE ||
        DEFAULT_SETTINGS.PRINCIPAL_TITLE ||
        'Kepala Madrasah',
      PRINCIPAL_NIP:
        fallbackSettings?.PRINCIPAL_NIP ||
        local?.PRINCIPAL_NIP ||
        DEFAULT_SETTINGS.PRINCIPAL_NIP ||
        '1281201',
      SCHOOL_YEAR:
        fallbackSettings?.SCHOOL_YEAR ||
        local?.SCHOOL_YEAR ||
        DEFAULT_SETTINGS.SCHOOL_YEAR ||
        '2026/2027',
      SEMESTER:
        fallbackSettings?.SEMESTER ||
        local?.SEMESTER ||
        DEFAULT_SETTINGS.SEMESTER ||
        '1 (Ganjil)'
    };
  }
}

export const PrintDocumentsView: React.FC<PrintDocumentsViewProps> = ({
  token,
  exams,
  users,
  classes,
  subjects,
  assessmentTypes,
  settings: propSettings,
  defaultDocType = 'cards',
  currentUser
}) => {
  // Active School Settings loaded directly from storage/table
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(() => {
    return propSettings || getLocalSchoolSettings();
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [showBrandingDetails, setShowBrandingDetails] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  /**
   * Fungsi handler untuk menyinkronkan data branding dari tabel SchoolSettings
   */
  const handleSyncBranding = useCallback(async (isManual = false) => {
    setIsSyncing(true);
    try {
      const refreshed = await fetchSchoolBrandingSettings(propSettings);
      setSchoolSettings(refreshed);
      setLastSynced(new Date());

      if (isManual) {
        setSyncFeedback(
          `Logo (${refreshed.LOGO_URL ? 'Aktif' : 'Default'}) & Kepala Madrasah (${refreshed.PRINCIPAL_NAME}) berhasil ditarik dari tabel SchoolSettings.`
        );
        setTimeout(() => setSyncFeedback(null), 4000);
      }
    } catch (error) {
      console.error('[PrintDocumentsView] Gagal sinkronisasi branding:', error);
      if (isManual) {
        setSyncFeedback('Terjadi kendala saat menghubungi database. Menggunakan data branding lokal.');
        setTimeout(() => setSyncFeedback(null), 4000);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [propSettings]);

  // Otomatis tarik logo dan nama kepala sekolah dari tabel saat pertama kali komponen dimuat
  useEffect(() => {
    handleSyncBranding(false);
  }, [handleSyncBranding]);

  // Pantau perubahan propSettings dari parent
  useEffect(() => {
    if (propSettings) {
      setSchoolSettings(prev => ({
        ...prev,
        ...propSettings
      }));
    }
  }, [propSettings]);

  // Berlangganan perubahan realtime pada tabel SchoolSettings
  useEffect(() => {
    const unsub = subscribeToRealtimeChanges(SUPABASE_TABLES.SETTINGS, () => {
      handleSyncBranding(false);
    });

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'lms_settings' || e.key === 'LMS_OFFICIAL_LOGO_DATA') {
        handleSyncBranding(false);
      }
    };

    const handleCustomDataChange = (e: any) => {
      if (e.detail === 'SETTINGS' || e.detail?.table === 'SchoolSettings') {
        handleSyncBranding(false);
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('cbt:datachange', handleCustomDataChange);

    return () => {
      unsub();
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('cbt:datachange', handleCustomDataChange);
    };
  }, [handleSyncBranding]);

  // Render thumbnail logo yang ditarik dari tabel
  const renderBrandingLogoThumbnail = useMemo(() => {
    const logoUrl = schoolSettings.LOGO_URL;
    if (logoUrl === 'MUHAMMADIYAH_STANDARD') {
      return <MuhammadiyahLogoSvg size={32} className="w-8 h-8 shrink-0" />;
    }
    if (!logoUrl || logoUrl === '/logo-ma-cikaramas.svg') {
      return <MaCikaramasLogoSvg size={32} className="w-8 h-8 shrink-0" idSuffix="print-view-badge" />;
    }
    return (
      <img
        src={logoUrl}
        alt="Logo Madrasah"
        className="w-8 h-8 object-contain rounded shrink-0 bg-white p-0.5 border border-slate-200"
        referrerPolicy="no-referrer"
      />
    );
  }, [schoolSettings.LOGO_URL]);

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* BRANDING SYNCHRONIZATION STATUS BAR (HIDDEN DURING BROWSER PRINTING)     */}
      {/* ========================================================================= */}
      <div className="no-print bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all">
        <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-50 via-slate-50 to-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Visual Logo Thumbnail */}
            <div className="p-1 rounded-lg bg-white border border-emerald-200 shadow-xs shrink-0 flex items-center justify-center">
              {renderBrandingLogoThumbnail}
            </div>

            {/* Nama Lembaga & Kepala Madrasah Terkini */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-900 tracking-tight truncate max-w-xs sm:max-w-md">
                  {schoolSettings.SCHOOL_NAME || 'MAS MUHAMMADIYAH CIKARAMAS'}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Branding Otomatis Aktif
                </span>
              </div>
              <div className="text-[11px] text-slate-600 flex items-center gap-2 flex-wrap mt-0.5">
                <span className="inline-flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-700 shrink-0" />
                  <b>{schoolSettings.PRINCIPAL_TITLE || 'Kepala Madrasah'}:</b>{' '}
                  <span className="font-semibold text-slate-900">{schoolSettings.PRINCIPAL_NAME || 'Ai Sukaesih, S.Pd'}</span>
                </span>
                {schoolSettings.PRINCIPAL_NIP && (
                  <span className="text-slate-500 font-mono text-[10px]">
                    (NBM/NIP: {schoolSettings.PRINCIPAL_NIP})
                  </span>
                )}
                {lastSynced && (
                  <span className="text-[10px] text-slate-400 hidden md:inline">
                    • Sinkron: {lastSynced.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSyncBranding(true)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-300 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              title="Tarik ulang logo dan nama kepala sekolah terbaru dari tabel SchoolSettings"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
              <span>{isSyncing ? 'Menarik Data...' : 'Tarik Ulang dari SchoolSettings'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBrandingDetails(prev => !prev)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title={showBrandingDetails ? 'Sembunyikan rincian branding' : 'Tampilkan rincian branding'}
            >
              {showBrandingDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Feedback Alert if Manual Sync */}
        {syncFeedback && (
          <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100 text-xs text-emerald-800 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Collapsible Details Drawer */}
        {showBrandingDetails && (
          <div className="px-4 py-3 bg-slate-50 text-xs border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-slate-700">
            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-slate-400">Sumber Logo Madrasah</div>
              <div className="font-semibold text-slate-900 truncate">
                {schoolSettings.LOGO_URL === 'MUHAMMADIYAH_STANDARD'
                  ? 'Logo Standar Muhammadiyah'
                  : schoolSettings.LOGO_URL?.startsWith('data:')
                  ? 'Logo Unggahan Kustom (Base64)'
                  : schoolSettings.LOGO_URL || 'Logo Vektor MA Cikaramas'}
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-slate-400">Nama Kepala Madrasah</div>
              <div className="font-semibold text-slate-900 truncate">
                {schoolSettings.PRINCIPAL_NAME || 'Ai Sukaesih, S.Pd'}
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-slate-400">Titimangsa Dokumen</div>
              <div className="font-semibold text-slate-900">
                {(schoolSettings.SCHOOL_CITY || 'Sumedang').replace(/^Kabupaten\s+/i, '')}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-slate-400">Tahun Pelajaran & Semester</div>
              <div className="font-semibold text-slate-900">
                TP {schoolSettings.SCHOOL_YEAR || '2026/2027'} • {schoolSettings.SEMESTER || '1 (Ganjil)'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* CORE DOKUMEN UJIAN VIEW DENGAN BRANDING TERKUNCI DARI SCHOOLSETTINGS      */}
      {/* ========================================================================= */}
      <CetakDokumenUjian
        token={token}
        exams={exams}
        users={users}
        classes={classes}
        subjects={subjects}
        assessmentTypes={assessmentTypes}
        settings={schoolSettings}
        defaultDocType={defaultDocType}
        currentUser={currentUser}
      />
    </div>
  );
};

export { CetakDokumenUjian };
export default PrintDocumentsView;
