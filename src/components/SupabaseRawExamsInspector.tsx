import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Database,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Terminal,
  Search,
  Filter,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Eye,
  Sparkles,
  ExternalLink,
  Layers,
  Clock
} from 'lucide-react';
import { Exam } from '../types';
import {
  fetchRawSupabaseExams,
  hardDeleteRawSupabaseExam,
  purgeStaleSupabaseExams,
  testSupabaseExamDeletePermissions,
  getDiagnosticLogs,
  clearDiagnosticLogs,
  subscribeToDiagnosticLogs,
  addDiagnosticLog,
  type DiagnosticLogEntry
} from '../services/supabaseLmsStorage';

interface SupabaseRawExamsInspectorProps {
  token: string;
  activeExams?: Exam[];
  onRefreshParentData?: () => Promise<any> | void;
  onClose?: () => void;
}

export const SupabaseRawExamsInspector: React.FC<SupabaseRawExamsInspectorProps> = ({
  token,
  activeExams = [],
  onRefreshParentData,
  onClose
}) => {
  // Tabs: 'RAW_TABLE' or 'LOGS'
  const [activeTab, setActiveTab] = useState<'RAW_TABLE' | 'LOGS'>('RAW_TABLE');

  // Raw data from Supabase
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string>('');

  // Diagnostic Logs
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>(() => getDiagnosticLogs());
  const [logLevelFilter, setLogLevelFilter] = useState<string>('ALL');

  // Search & Filters for Raw Table
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [staleFilter, setStaleFilter] = useState<'ALL' | 'STALE_ONLY' | 'ACTIVE_ONLY'>('ALL');

  // Expanded Row for JSON Inspection
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Modal / Action states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [isTestingRLS, setIsTestingRLS] = useState<boolean>(false);
  const [rlsTestResult, setRlsTestResult] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // Active exam ID set for stale detection
  const activeIdsSet = useMemo(() => {
    return new Set(activeExams.map(e => String(e.ID).trim()));
  }, [activeExams]);

  // Subscribe to real-time diagnostic logs
  useEffect(() => {
    const unsubscribe = subscribeToDiagnosticLogs((updatedLogs) => {
      setLogs([...updatedLogs]);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Fetch raw Supabase data on mount
  const loadRawData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetchRawSupabaseExams();
      if (res.success) {
        setRawRows(res.data);
        setLastFetchedAt(new Date().toLocaleTimeString('id-ID'));
      } else {
        setFetchError(res.error?.message || String(res.error) || 'Gagal mengambil data dari Supabase');
        setRawRows([]);
      }
    } catch (err: any) {
      setFetchError(err?.message || 'Terjadi kesalahan sistem saat menghubungi Supabase');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRawData();
  }, []);

  // Identify stale rows (rows in Supabase but not in active local schedules)
  const classifiedRows = useMemo(() => {
    return rawRows.map(row => {
      const rowId = String(row.ID || row.id || '').trim();
      const isStale = !activeIdsSet.has(rowId);
      const isLegacyKoding = String(row.TITLE || row.title || '').toLowerCase().includes('koding') ||
                            String(row.SUBJECT_ID || row.subject_id || '').toLowerCase().includes('koding');
      return {
        ...row,
        _rowId: rowId,
        _isStale: isStale,
        _isLegacyKoding: isLegacyKoding
      };
    });
  }, [rawRows, activeIdsSet]);

  // Filtered rows based on search and stale filter
  const filteredRows = useMemo(() => {
    return classifiedRows.filter(row => {
      // Stale filter
      if (staleFilter === 'STALE_ONLY' && !row._isStale) return false;
      if (staleFilter === 'ACTIVE_ONLY' && row._isStale) return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const id = String(row._rowId).toLowerCase();
      const title = String(row.TITLE || row.title || '').toLowerCase();
      const sub = String(row.SUBJECT_ID || row.subject_id || '').toLowerCase();
      const cls = String(row.CLASS_ID || row.class_id || '').toLowerCase();
      return id.includes(q) || title.includes(q) || sub.includes(q) || cls.includes(q);
    });
  }, [classifiedRows, staleFilter, searchQuery]);

  const staleCount = useMemo(() => {
    return classifiedRows.filter(r => r._isStale).length;
  }, [classifiedRows]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    if (logLevelFilter === 'ALL') return logs;
    return logs.filter(l => l.level === logLevelFilter);
  }, [logs, logLevelFilter]);

  // Handle single Hard Delete
  const handleHardDelete = async (rowId: string, rowTitle: string) => {
    const confirm = window.confirm(
      `YAKIN HAPUS PERMANEN DARI SUPABASE?\n\nJudul: ${rowTitle}\nID: ${rowId}\n\nOperasi ini akan langsung mengeksekusi DELETE pada tabel Supabase 'lms_exams'.`
    );
    if (!confirm) return;

    setDeletingId(rowId);
    try {
      const res = await hardDeleteRawSupabaseExam(rowId);
      if (res.success) {
        setRawRows(prev => prev.filter(r => String(r.ID || r.id).trim() !== rowId));
        if (onRefreshParentData) {
          await Promise.resolve(onRefreshParentData());
        }
      } else {
        alert(`Gagal menghapus dari Supabase:\n${res.error || 'Ditolak RLS'}`);
      }
    } catch (err: any) {
      alert(`Error saat menghapus: ${err?.message || err}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Handle 1-Click Purge of all Stale Exams
  const handlePurgeAllStale = async () => {
    if (staleCount === 0) {
      alert('Tidak ada entri stale/hantu yang terdeteksi di Supabase.');
      return;
    }

    const confirm = window.confirm(
      `PERINGATAN BERSIHKAN SEMUA JADWAL STALE!\n\nDitemukan ${staleCount} entri di Supabase yang tidak ada di daftar jadwal lokal aktif.\n\nApakah Anda ingin menghapus SEMUA entri stale ini secara permanen dari tabel Supabase 'lms_exams'?`
    );
    if (!confirm) return;

    setIsPurging(true);
    try {
      const activeIds = activeExams.map(e => e.ID);
      const res = await purgeStaleSupabaseExams(activeIds);
      await loadRawData();
      if (onRefreshParentData) {
        await Promise.resolve(onRefreshParentData());
      }
      alert(`Pembersihan selesai!\n\nBerhasil dihapus: ${res.purgedCount} entri\nGagal: ${res.failedIds.length} entri`);
    } catch (err: any) {
      alert(`Error saat membersihkan data stale: ${err?.message || err}`);
    } finally {
      setIsPurging(false);
    }
  };

  // Handle Test RLS Delete Permission
  const handleTestRLS = async () => {
    setIsTestingRLS(true);
    setRlsTestResult(null);
    try {
      const res = await testSupabaseExamDeletePermissions();
      setRlsTestResult(res);
      addDiagnosticLog(
        res.canDelete ? 'SUCCESS' : 'ERROR',
        'RLS',
        res.canDelete
          ? 'Uji coba RLS DELETE Berhasil: Akun/klien ini memiliki hak penuh untuk INSERT & DELETE baris di Supabase.'
          : 'Uji coba RLS DELETE GAGAL: Baris tidak dapat dihapus karena kebijakan RLS Supabase memblokir operasi DELETE.',
        res
      );
    } catch (err: any) {
      setRlsTestResult({ canDelete: false, message: err?.message || 'Test error' });
    } finally {
      setIsTestingRLS(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Inspektor Database Supabase: Tabel &apos;lms_exams&apos;
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  RAW CLOUD VIEW
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Memeriksa data mentah langsung dari server Supabase untuk melacak dan memusnahkan rekaman jadwal lama / stale yang tertinggal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadRawData}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Query ulang langsung ke Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Mengambil...' : 'Refresh Supabase'}</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Tutup Inspektor
              </button>
            )}
          </div>
        </div>

        {/* Stats & Health Status Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-white/10 text-xs">
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-slate-400 text-[11px] block">Baris di Supabase</span>
            <span className="text-lg font-bold font-mono text-white mt-0.5 block">{rawRows.length} Entri</span>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-slate-400 text-[11px] block">Jadwal Aktif Lokal</span>
            <span className="text-lg font-bold font-mono text-indigo-200 mt-0.5 block">{activeExams.length} Entri</span>
          </div>

          <div className={`rounded-xl p-2.5 border ${staleCount > 0 ? 'bg-amber-500/20 border-amber-400/40 text-amber-200' : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'}`}>
            <span className="text-[11px] block opacity-80">Jadwal Stale / Ghost</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-lg font-bold font-mono">{staleCount}</span>
              <span className="text-[11px] font-medium">{staleCount > 0 ? 'Perlu Pembersihan' : '100% Bersih'}</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex flex-col justify-center">
            <span className="text-slate-400 text-[11px] block">Waktu Query Terakhir</span>
            <span className="text-xs font-mono text-slate-200 mt-1">{lastFetchedAt || 'Belum diambil'}</span>
          </div>
        </div>
      </div>

      {/* Tabs & Diagnostic Actions Bar */}
      <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('RAW_TABLE')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'RAW_TABLE'
                ? 'bg-[#0052CC] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Tabel Data Mentah Supabase ({filteredRows.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('LOGS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'LOGS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Log Diagnostik & RLS ({logs.length})</span>
          </button>
        </div>

        {/* Global Diagnostic Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {staleCount > 0 && (
            <button
              onClick={handlePurgeAllStale}
              disabled={isPurging}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Hapus semua entri di Supabase yang tidak ada di jadwal aktif"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isPurging ? 'Membersihkan...' : `Bersihkan ${staleCount} Stale Supabase`}</span>
            </button>
          )}

          <button
            onClick={handleTestRLS}
            disabled={isTestingRLS}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Tes apakah RLS Supabase mengizinkan operasi DELETE"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isTestingRLS ? 'Menguji...' : 'Uji Hak Akses RLS DELETE'}</span>
          </button>
        </div>
      </div>

      {/* RLS Test Result Alert if present */}
      {rlsTestResult && (
        <div className={`p-3.5 mx-4 mt-4 rounded-xl border text-xs flex items-start gap-3 ${
          rlsTestResult.canDelete
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          {rlsTestResult.canDelete ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="font-bold">
              {rlsTestResult.canDelete
                ? 'Hasil Uji Coba: RLS DELETE Supabase Berfungsi Normal'
                : 'Penyebab Terdeteksi: RLS Supabase Memblokir Penghapusan Baris'}
            </div>
            <p className="mt-0.5 opacity-90">{rlsTestResult.message}</p>
            {rlsTestResult.details && (
              <pre className="mt-1.5 p-2 bg-black/10 rounded font-mono text-[10px] overflow-x-auto max-h-24">
                {JSON.stringify(rlsTestResult.details, null, 2)}
              </pre>
            )}

            {!rlsTestResult.canDelete && (
              <div className="mt-2.5 pt-2.5 border-t border-rose-200">
                <div className="font-semibold text-rose-950 mb-1.5 flex items-center justify-between">
                  <span>Solusi Cepat: Eksekusi SQL ini di Supabase SQL Editor:</span>
                  <button
                    onClick={() => {
                      const sql = `-- Solusi: Mengizinkan hak DELETE pada tabel ujian & relasinya di Supabase PostgreSQL\nCREATE POLICY "Allow public delete on lms_exams" ON public.lms_exams FOR DELETE USING (true);\nCREATE POLICY "Allow public delete on lms_attempts" ON public.lms_attempts FOR DELETE USING (true);\nCREATE POLICY "Allow public delete on lms_questions" ON public.lms_questions FOR DELETE USING (true);`;
                      navigator.clipboard?.writeText(sql);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2500);
                    }}
                    className="px-2.5 py-1 rounded bg-rose-200 hover:bg-rose-300 text-rose-950 font-mono text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'Tersalin ke Clipboard!' : 'Salin Skrip SQL'}</span>
                  </button>
                </div>
                <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[10px] overflow-x-auto border border-slate-800">
{`-- Izinkan operasi DELETE pada tabel lms_exams dan child table
CREATE POLICY "Allow public delete on lms_exams" ON public.lms_exams FOR DELETE USING (true);
CREATE POLICY "Allow public delete on lms_attempts" ON public.lms_attempts FOR DELETE USING (true);
CREATE POLICY "Allow public delete on lms_questions" ON public.lms_questions FOR DELETE USING (true);`}
                </pre>
              </div>
            )}
          </div>
          <button
            onClick={() => setRlsTestResult(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer text-sm font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* TAB 1: RAW TABLE CONTENT */}
      {activeTab === 'RAW_TABLE' && (
        <div className="p-4 sm:p-5">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari ID, Judul, Mapel, atau Kelas mentah..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              {/* Stale Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setStaleFilter('ALL')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                    staleFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({classifiedRows.length})
                </button>
                <button
                  onClick={() => setStaleFilter('STALE_ONLY')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                    staleFilter === 'STALE_ONLY'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <span>Hanya Stale/Ghost</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800">
                    {staleCount}
                  </span>
                </button>
                <button
                  onClick={() => setStaleFilter('ACTIVE_ONLY')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                    staleFilter === 'ACTIVE_ONLY' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Aktif ({classifiedRows.length - staleCount})
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Menampilkan <b>{filteredRows.length}</b> dari <b>{rawRows.length}</b> entri Supabase
            </div>
          </div>

          {fetchError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{fetchError}</span>
            </div>
          )}

          {/* Table */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-3 w-44">ID Supabase</th>
                  <th className="py-2.5 px-3">Judul (TITLE)</th>
                  <th className="py-2.5 px-3 w-28">Mata Pelajaran</th>
                  <th className="py-2.5 px-3 w-24">Kelas</th>
                  <th className="py-2.5 px-3 w-28">Tanggal & Jam</th>
                  <th className="py-2.5 px-3 w-24 text-center">Status DB</th>
                  <th className="py-2.5 px-3 w-28 text-center">Kondisi</th>
                  <th className="py-2.5 px-3 w-28 text-center">Aksi Cloud</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                {filteredRows.map((row, idx) => {
                  const rowId = row._rowId;
                  const rowTitle = row.TITLE || row.title || 'Tanpa Judul';
                  const rowSubject = row.SUBJECT_ID || row.subject_id || '-';
                  const rowClass = row.CLASS_ID || row.class_id || '-';
                  const rowDate = row.EXAM_DATE || row.exam_date || '-';
                  const rowTime = row.START_TIME || row.start_time || '-';
                  const rowStatus = row.STATUS || row.status || 'ACTIVE';
                  const isStale = row._isStale;
                  const isExpanded = expandedRowId === rowId;
                  const isDeletingThis = deletingId === rowId;

                  return (
                    <React.Fragment key={rowId || idx}>
                      <tr className={`transition-colors ${
                        isStale ? 'bg-rose-50/50 hover:bg-rose-50' : idx % 2 === 1 ? 'bg-slate-50/40 hover:bg-slate-50' : 'bg-white hover:bg-slate-50'
                      }`}>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[11px] text-slate-900 font-bold truncate max-w-[140px]" title={rowId}>
                              {rowId}
                            </span>
                            <button
                              onClick={() => copyToClipboard(rowId, rowId)}
                              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                              title="Copy ID"
                            >
                              {copiedId === rowId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{rowTitle}</div>
                          {row._isLegacyKoding && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                              ⚠️ REKAMAN KODING LAMA
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-800">
                          {rowSubject}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-800 font-semibold font-mono text-[11px]">
                            {rowClass}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="text-slate-900">{rowDate}</div>
                          <div className="text-[10px] text-slate-500">{rowTime}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rowStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {rowStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {isStale ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              STALE (Hantu)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Sinkron Aktif
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setExpandedRowId(isExpanded ? null : rowId)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Lihat JSON Mentah"
                            >
                              <Eye className="w-3 h-3" />
                              <span>{isExpanded ? 'Tutup' : 'JSON'}</span>
                            </button>

                            <button
                              onClick={() => handleHardDelete(rowId, rowTitle)}
                              disabled={isDeletingThis}
                              className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 text-[11px] font-semibold flex items-center gap-1 border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                              title="Hard delete langsung dari Supabase"
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" />
                              <span>{isDeletingThis ? '...' : 'Hapus'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded JSON Inspector */}
                      {isExpanded && (
                        <tr className="bg-slate-900 text-slate-100">
                          <td colSpan={9} className="p-3">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-700 text-[11px] text-slate-400">
                              <span className="font-mono">Payload JSON Supabase [Tabel: lms_exams, ID: {rowId}]</span>
                              <button
                                onClick={() => copyToClipboard(JSON.stringify(row, null, 2), `json_${rowId}`)}
                                className="hover:text-white flex items-center gap-1 cursor-pointer"
                              >
                                {copiedId === `json_${rowId}` ? 'Disalin!' : 'Copy JSON'}
                              </button>
                            </div>
                            <pre className="font-mono text-[11px] text-emerald-400 p-2 overflow-x-auto max-h-52 bg-slate-950 rounded mt-1.5">
                              {JSON.stringify(row, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      Tidak ada entri data mentah yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: REAL-TIME DIAGNOSTIC LOGS CONTENT */}
      {activeTab === 'LOGS' && (
        <div className="p-4 sm:p-5">
          {/* Logs Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Filter Tingkat Log:</span>
              <select
                value={logLevelFilter}
                onChange={e => setLogLevelFilter(e.target.value)}
                className="px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-lg text-xs outline-none"
              >
                <option value="ALL">Semua Level ({logs.length})</option>
                <option value="ERROR">ERROR Saja</option>
                <option value="WARN">WARN Saja</option>
                <option value="SUCCESS">SUCCESS Saja</option>
                <option value="INFO">INFO Saja</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const txt = logs.map(l => `[${l.timestamp}][${l.level}][${l.category}] ${l.message} ${l.details ? JSON.stringify(l.details) : ''}`).join('\n');
                  copyToClipboard(txt, 'all_logs');
                }}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copiedId === 'all_logs' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Salin Semua Log</span>
              </button>

              <button
                onClick={clearDiagnosticLogs}
                className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 border border-rose-200 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Layar Log</span>
              </button>
            </div>
          </div>

          {/* Log Viewer Terminal Window */}
          <div className="bg-slate-950 text-slate-200 font-mono text-xs rounded-xl p-3 max-h-[500px] overflow-y-auto border border-slate-800 shadow-inner">
            {filteredLogs.map((log) => {
              const levelColor =
                log.level === 'ERROR' ? 'text-rose-400 bg-rose-950/40 border-rose-800' :
                log.level === 'WARN' ? 'text-amber-300 bg-amber-950/30 border-amber-800' :
                log.level === 'SUCCESS' ? 'text-emerald-400 bg-emerald-950/30 border-emerald-800' :
                'text-sky-300 bg-sky-950/20 border-sky-800';

              return (
                <div key={log.id} className="py-1.5 border-b border-slate-800/80 last:border-0">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-500 shrink-0 text-[10px]">{log.timestamp}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border shrink-0 ${levelColor}`}>
                      {log.level}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px] shrink-0">
                      {log.category}
                    </span>
                    <span className="text-slate-200 break-words flex-1 leading-relaxed">
                      {log.message}
                    </span>
                  </div>
                  {log.details && (
                    <pre className="mt-1 ml-16 p-1.5 bg-slate-900 rounded text-[10px] text-slate-400 overflow-x-auto">
                      {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}

            {filteredLogs.length === 0 && (
              <div className="py-8 text-center text-slate-600">
                Belum ada entri log diagnostik untuk level ini.
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};
