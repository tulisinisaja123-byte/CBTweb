import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  UploadCloud,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  FolderArchive,
  Play,
  Clock,
  ShieldCheck,
  Check,
  X,
  FileText,
  Terminal,
  Copy,
  ExternalLink,
  Layers,
  HardDrive,
  Info,
  Loader2,
  FileUp
} from 'lucide-react';
import {
  auditParity,
  executeOneClickMigration,
  exportAllLocalStorageToJson,
  importJsonBackupToLocalStorage,
  MIGRATION_SCHEMA_ORDER,
  MigrationEntityInfo,
  MigrationProgress
} from '../services/migrationService';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';
import { RAW_SUPABASE_RLS_SQL } from '../data/supabaseRlsData';

interface DataMigrationViewProps {
  token: string;
  onOpenSupabaseRls?: () => void;
  onNavigate?: (page: string) => void;
}

export const DataMigrationView: React.FC<DataMigrationViewProps> = ({
  token,
  onOpenSupabaseRls,
  onNavigate
}) => {
  const [entities, setEntities] = useState<MigrationEntityInfo[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>(
    MIGRATION_SCHEMA_ORDER.map(i => i.table)
  );
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const loadParityData = async () => {
    setIsLoadingAudit(true);
    try {
      const data = await auditParity();
      setEntities(data);
    } catch (err: any) {
      showToast(err.message || 'Gagal memeriksa audit data.', 'error');
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    loadParityData();
  }, []);

  // Auto-scroll terminal log
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [migrationProgress?.logs]);

  const handleToggleTable = (table: string) => {
    if (selectedTables.includes(table)) {
      setSelectedTables(selectedTables.filter(t => t !== table));
    } else {
      setSelectedTables([...selectedTables, table]);
    }
  };

  const handleSelectAll = () => {
    if (selectedTables.length === MIGRATION_SCHEMA_ORDER.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(MIGRATION_SCHEMA_ORDER.map(i => i.table));
    }
  };

  const handleStartMigration = async () => {
    if (selectedTables.length === 0) {
      showToast('Pilih minimal satu tabel untuk dimigrasikan.', 'error');
      return;
    }

    if (!isSupabaseConfigured) {
      showToast('Supabase belum terkonfigurasi. Silakan periksa kredensial environment terlebih dahulu.', 'error');
      return;
    }

    setIsMigrating(true);
    setShowProgressModal(true);

    try {
      await executeOneClickMigration(
        { selectedTables },
        (progress) => {
          setMigrationProgress(progress);
        }
      );
      showToast('Migrasi data ke Supabase berhasil diselesaikan!', 'success');
      await loadParityData();
    } catch (err: any) {
      showToast(`Migrasi gagal: ${err.message}`, 'error');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleExportJson = () => {
    try {
      const res = exportAllLocalStorageToJson();
      showToast(`Berkas cadangan ${res.filename} (${(res.sizeBytes / 1024).toFixed(1)} KB) berhasil diunduh!`, 'success');
    } catch (err: any) {
      showToast(`Gagal mengunduh berkas cadangan: ${err.message}`, 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setImportJsonText(content);
      setImportError('');
    };
    reader.onerror = () => {
      setImportError('Gagal membaca berkas yang dipilih.');
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = () => {
    if (!importJsonText.trim()) {
      setImportError('Pilih berkas JSON atau tempelkan teks data JSON.');
      return;
    }

    try {
      const res = importJsonBackupToLocalStorage(importJsonText);
      setImportSuccess(`Berhasil memulihkan ${res.totalRecordsRestored} baris data pada ${res.restoredTables.length} tabel ke penyimpanan lokal!`);
      setImportError('');
      loadParityData();
      setTimeout(() => {
        setShowImportModal(false);
        setImportSuccess('');
        setImportJsonText('');
        showToast('Data berhasil dipulihkan dari berkas cadangan JSON!', 'success');
      }, 2000);
    } catch (err: any) {
      setImportError(err.message || 'Gagal memulihkan berkas JSON.');
    }
  };

  const handleCopySql = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(RAW_SUPABASE_RLS_SQL).then(() => {
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 2500);
      });
    }
  };

  // Aggregated stats
  const totalLocalRecords = entities.reduce((acc, curr) => acc + curr.localCount, 0);
  const totalSupabaseRecords = entities.reduce((acc, curr) => acc + (curr.supabaseCount ?? 0), 0);
  const syncedTablesCount = entities.filter(e => e.status === 'SYNCED').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-xs font-semibold flex items-center gap-2 border animate-in fade-in slide-in-from-bottom-3 ${
            notification.type === 'success'
              ? 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
              : notification.type === 'error'
              ? 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]'
              : 'bg-[#1A1C1E] text-white border-white/10'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#137333]" />
          ) : notification.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-[#C5221F]" />
          ) : (
            <Info className="w-4 h-4 text-blue-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header & Status Banner */}
      <div className="bg-white border border-[#DEE2E6] rounded-xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E7F0FF] text-[#0052CC] border border-[#B3D1FF] flex items-center gap-1.5">
                <Database className="w-3 h-3 text-[#0052CC]" />
                Sistem Sinkronisasi & Migrasi
              </span>
              {isSupabaseConfigured ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Supabase Terhubung
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  Mode Penyimpanan Lokal
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1C1E] tracking-tight">
              Migrasi Data ke Supabase (One-Click Migration)
            </h1>
            <p className="text-xs sm:text-sm text-[#6C757D] leading-relaxed">
              Pindahkan data tersimpan dari browser (localStorage) ke database PostgreSQL Supabase secara otomatis dan aman.
              Skrip migrasi ini mengeksekusi batch upsert dengan menjaga keutuhan relasi kunci asing (Foreign Keys) serta menyediakan cadangan berkas JSON.
            </p>
          </div>

          {/* Quick Actions Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleStartMigration}
              disabled={isMigrating || !isSupabaseConfigured}
              className="px-4 py-2.5 rounded-lg bg-[#0052CC] hover:bg-[#0047B3] text-white text-xs font-bold shadow-xs inline-flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isMigrating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-white" />
              )}
              <span>{isMigrating ? 'Sedang Memigrasikan...' : 'Mulai Migrasi Satu Kali'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="px-3.5 py-2.5 rounded-lg bg-white hover:bg-[#F8F9FA] text-[#1A1C1E] border border-[#CED4DA] text-xs font-semibold shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Unduh semua data lokal ke berkas .json"
            >
              <Download className="w-4 h-4 text-[#0052CC]" />
              <span>Ekspor Cadangan JSON</span>
            </button>

            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="px-3.5 py-2.5 rounded-lg bg-white hover:bg-[#F8F9FA] text-[#1A1C1E] border border-[#CED4DA] text-xs font-semibold shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Pulihkan data dari berkas .json"
            >
              <FileUp className="w-4 h-4 text-emerald-600" />
              <span>Pulihkan JSON</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSqlModal(true)}
              className="px-3.5 py-2.5 rounded-lg bg-white hover:bg-[#F8F9FA] text-[#1A1C1E] border border-[#CED4DA] text-xs font-semibold shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Lihat Skrip SQL Pembuatan Tabel & Kebijakan RLS"
            >
              <FileCode className="w-4 h-4 text-purple-600" />
              <span>Skrip DDL SQL</span>
            </button>
          </div>
        </div>

        {/* Database notice if not configured */}
        {!isSupabaseConfigured && (
          <div className="mt-5 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5 leading-relaxed">
            <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Konfigurasi Supabase Belum Terhubung:</strong> Aplikasi saat ini beroperasi penuh menggunakan penyimpanan lokal (localStorage).
              Untuk mengaktifkan sinkronisasi cloud Supabase, konfigurasikan variabel <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono text-[11px]">VITE_SUPABASE_URL</code> dan <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono text-[11px]">VITE_SUPABASE_ANON_KEY</code> pada pengaturan environment proyek Anda.
            </div>
          </div>
        )}
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#DEE2E6] rounded-xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-[#0052CC] grid place-items-center flex-shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#6C757D] uppercase tracking-wider">Data di LocalStorage</div>
            <div className="text-xl font-extrabold text-[#1A1C1E] mt-0.5">
              {totalLocalRecords.toLocaleString('id-ID')} <span className="text-xs font-normal text-[#6C757D]">baris</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#DEE2E6] rounded-xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 grid place-items-center flex-shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#6C757D] uppercase tracking-wider">Data di Supabase</div>
            <div className="text-xl font-extrabold text-[#1A1C1E] mt-0.5">
              {isSupabaseConfigured ? `${totalSupabaseRecords.toLocaleString('id-ID')} baris` : 'Offline'}
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#DEE2E6] rounded-xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 grid place-items-center flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#6C757D] uppercase tracking-wider">Tabel Terdaftar</div>
            <div className="text-xl font-extrabold text-[#1A1C1E] mt-0.5">
              {MIGRATION_SCHEMA_ORDER.length} <span className="text-xs font-normal text-[#6C757D]">tabel master</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#DEE2E6] rounded-xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 grid place-items-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#6C757D] uppercase tracking-wider">Status Paritas</div>
            <div className="text-xl font-extrabold text-[#1A1C1E] mt-0.5">
              {syncedTablesCount} / {MIGRATION_SCHEMA_ORDER.length} <span className="text-xs font-normal text-[#6C757D]">sinkron</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison & Entity Selection Table */}
      <div className="bg-white border border-[#DEE2E6] rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#DEE2E6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8F9FA]/60">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#1A1C1E]">
              Daftar Entitas & Perbandingan Data (LocalStorage vs Supabase)
            </h2>
            <p className="text-[11px] sm:text-xs text-[#6C757D] mt-0.5">
              Urutan migrasi disusun secara otomatis berdasarkan dependensi relasional untuk mencegah kendala foreign key.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-md border border-[#CED4DA] bg-white text-[#1A1C1E] hover:bg-[#F8F9FA] text-xs font-semibold shadow-2xs transition-colors"
            >
              {selectedTables.length === MIGRATION_SCHEMA_ORDER.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
            </button>

            <button
              type="button"
              onClick={loadParityData}
              disabled={isLoadingAudit}
              className="p-1.5 rounded-md border border-[#CED4DA] bg-white text-[#1A1C1E] hover:bg-[#F8F9FA] text-xs font-semibold shadow-2xs transition-colors"
              title="Segarkan Audit Paritas"
            >
              <RefreshCw className={`w-4 h-4 text-[#0052CC] ${isLoadingAudit ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F1F3F5] text-[#495057] font-bold uppercase text-[10px] tracking-wider border-b border-[#DEE2E6]">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Pilih</th>
                <th className="py-3 px-4 w-12 text-center">Urutan</th>
                <th className="py-3 px-4">Nama Entitas & Deskripsi</th>
                <th className="py-3 px-4">Tabel Supabase</th>
                <th className="py-3 px-4 text-center">Baris Lokal</th>
                <th className="py-3 px-4 text-center">Baris Supabase</th>
                <th className="py-3 px-4 text-center">Status Paritas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DEE2E6]">
              {entities.map((item, idx) => {
                const isSelected = selectedTables.includes(item.tableName);
                return (
                  <tr
                    key={item.tableName}
                    onClick={() => handleToggleTable(item.tableName)}
                    className={`hover:bg-[#F8F9FA] cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleTable(item.tableName)}
                        className="rounded border-[#CED4DA] text-[#0052CC] focus:ring-[#0052CC] w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[11px] text-[#6C757D]">
                      #{idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#1A1C1E]">{item.name}</div>
                      <div className="text-[11px] text-[#6C757D] mt-0.5">{item.description}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#F1F3F5] text-[#1A1C1E] border border-[#DEE2E6]">
                        {item.tableName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-[#1A1C1E]">
                      {item.localCount}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      {item.supabaseCount !== null ? (
                        <span className="text-[#1A1C1E]">{item.supabaseCount}</span>
                      ) : (
                        <span className="text-[#ADB5BD]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.status === 'SYNCED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Tersinkron
                        </span>
                      )}
                      {item.status === 'DESYNC' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Perlu Migrasi
                        </span>
                      )}
                      {item.status === 'EMPTY' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-50 text-gray-600 border border-gray-200">
                          Kosong
                        </span>
                      )}
                      {item.status === 'ERROR' && (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200"
                          title={item.errorMessage}
                        >
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          Tabel Belum Siap
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer summary inside table container */}
        <div className="p-4 bg-[#F8F9FA] border-t border-[#DEE2E6] flex flex-col sm:flex-row items-center justify-between text-xs text-[#6C757D] gap-3">
          <div>
            Terpilih <span className="font-bold text-[#1A1C1E]">{selectedTables.length}</span> dari {MIGRATION_SCHEMA_ORDER.length} tabel untuk dieksekusi.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartMigration}
              disabled={isMigrating || selectedTables.length === 0 || !isSupabaseConfigured}
              className="px-4 py-2 rounded-lg bg-[#0052CC] hover:bg-[#0047B3] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Migrasikan {selectedTables.length} Tabel Terpilih</span>
            </button>
          </div>
        </div>
      </div>

      {/* Migration Progress Modal / Overlay */}
      {showProgressModal && migrationProgress && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#DEE2E6] max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#DEE2E6] flex items-center justify-between bg-[#F8F9FA]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-100 text-[#0052CC]">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-[#1A1C1E]">
                    {migrationProgress.status === 'COMPLETED'
                      ? 'Migrasi Selesai'
                      : migrationProgress.status === 'FAILED'
                      ? 'Migrasi Terhenti'
                      : 'Proses Migrasi Berlangsung'}
                  </h3>
                  <p className="text-[11px] text-[#6C757D]">
                    {migrationProgress.status === 'COMPLETED'
                      ? 'Seluruh tabel terpilih telah diproses dan disinkronkan ke Supabase'
                      : `Tahap ${migrationProgress.currentEntityIndex} dari ${migrationProgress.totalEntities}: ${migrationProgress.currentEntityName}`}
                  </p>
                </div>
              </div>

              {!isMigrating && (
                <button
                  type="button"
                  onClick={() => setShowProgressModal(false)}
                  className="p-1.5 rounded-md hover:bg-slate-200 text-[#6C757D] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Progress Bar & Indicators */}
            <div className="p-5 border-b border-[#DEE2E6] space-y-3 bg-white">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#1A1C1E] flex items-center gap-1.5">
                  {isMigrating && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0052CC]" />}
                  {migrationProgress.currentEntityName || 'Inisialisasi'}
                </span>
                <span className="font-mono font-bold text-[#0052CC]">{migrationProgress.percentage}%</span>
              </div>

              <div className="w-full bg-[#E9ECEF] h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0052CC] via-[#2684FF] to-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${migrationProgress.percentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#6C757D]">
                <span>Tabel: <code className="font-mono text-[#0052CC]">{migrationProgress.currentEntityTable || '-'}</code></span>
                <span>Waktu Berjalan: {((migrationProgress.elapsedMs || 0) / 1000).toFixed(1)} detik</span>
              </div>
            </div>

            {/* Realtime Terminal Execution Logs */}
            <div className="p-4 bg-[#1A1C1E] text-slate-200 font-mono text-[11px] flex-1 overflow-y-auto space-y-2 min-h-[220px] max-h-[300px]">
              <div className="text-slate-500 pb-1 border-b border-white/10 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  Terminal Log Eksekusi
                </span>
                <span>{migrationProgress.logs.length} catatan</span>
              </div>

              {migrationProgress.logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-500 select-none">[{log.timestamp}]</span>
                  <span
                    className={`font-semibold uppercase text-[9px] px-1 py-0.2 rounded ${
                      log.level === 'success'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : log.level === 'error'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : log.level === 'warning'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-blue-950 text-blue-400 border border-blue-800'
                    }`}
                  >
                    {log.level}
                  </span>
                  <span
                    className={
                      log.level === 'error'
                        ? 'text-rose-300'
                        : log.level === 'success'
                        ? 'text-emerald-300'
                        : log.level === 'warning'
                        ? 'text-amber-300'
                        : 'text-slate-300'
                    }
                  >
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#DEE2E6] flex items-center justify-between bg-[#F8F9FA]">
              <div className="text-xs text-[#6C757D]">
                {migrationProgress.status === 'COMPLETED' && (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Semua operasi selesai dengan sukses.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowProgressModal(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-[#CED4DA] hover:bg-[#E9ECEF] text-xs font-semibold text-[#1A1C1E] transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SQL DDL Script Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#DEE2E6] max-w-3xl w-full overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#DEE2E6] flex items-center justify-between bg-[#F8F9FA]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-[#1A1C1E]">
                    Skrip SQL Schema & RLS Supabase
                  </h3>
                  <p className="text-[11px] text-[#6C757D]">
                    Jalankan skrip ini sekali di Supabase SQL Editor jika tabel database belum dibuat.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="p-1.5 rounded-md hover:bg-slate-200 text-[#6C757D] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-900 text-slate-100 font-mono text-xs overflow-y-auto flex-1 max-h-[480px]">
              <pre className="whitespace-pre leading-relaxed">{RAW_SUPABASE_RLS_SQL}</pre>
            </div>

            <div className="p-4 border-t border-[#DEE2E6] flex items-center justify-between bg-[#F8F9FA]">
              <div className="text-xs text-[#6C757D]">
                Format standar PostgreSQL yang kompatibel dengan seluruh versi Supabase.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-4 py-2 rounded-lg bg-[#0052CC] hover:bg-[#0047B3] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                  <span>{copiedSql ? 'Tersalin!' : 'Salin Seluruh SQL'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-[#CED4DA] hover:bg-[#E9ECEF] text-xs font-semibold text-[#1A1C1E] transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JSON Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#DEE2E6] max-w-xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#DEE2E6] flex items-center justify-between bg-[#F8F9FA]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-[#1A1C1E]">
                    Pulihkan Data dari Berkas Cadangan JSON
                  </h3>
                  <p className="text-[11px] text-[#6C757D]">
                    Unggah berkas cadangan JSON yang telah diekspor sebelumnya untuk memulihkan seluruh data lokal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1.5 rounded-md hover:bg-slate-200 text-[#6C757D] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {importError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{importSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#1A1C1E] mb-1.5">
                  Pilih Berkas JSON:
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-[#495057] file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#0052CC] hover:file:bg-blue-100 cursor-pointer border border-[#CED4DA] rounded-lg p-1.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1C1E] mb-1.5">
                  Atau Tempelkan Konten JSON:
                </label>
                <textarea
                  rows={6}
                  value={importJsonText}
                  onChange={(e) => {
                    setImportJsonText(e.target.value);
                    setImportError('');
                  }}
                  placeholder='{"metadata": { ... }, "tables": { ... }}'
                  className="w-full px-3 py-2 border border-[#CED4DA] rounded-lg font-mono text-[11px] text-[#1A1C1E] focus:outline-none focus:border-[#0052CC]"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#DEE2E6] flex items-center justify-between bg-[#F8F9FA]">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-lg bg-white border border-[#CED4DA] hover:bg-[#E9ECEF] text-xs font-semibold text-[#1A1C1E] transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Pulihkan Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
