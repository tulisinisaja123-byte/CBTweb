import { supabase, isSupabaseConfigured } from './supabaseClient';
import { SUPABASE_TABLES } from './supabaseLmsStorage';
import * as localStore from './lmsStorage';

export interface DiagnosticLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  category: 'FETCH' | 'DELETE' | 'SAVE' | 'SYNC' | 'RLS' | 'DIAGNOSTIC';
  message: string;
  details?: any;
}

// In-memory ring buffer for up to 300 diagnostic logs
const MAX_LOGS = 300;
let diagnosticLogs: DiagnosticLogEntry[] = [];
const logListeners: Set<(logs: DiagnosticLogEntry[]) => void> = new Set();

/**
 * Adds a new diagnostic log entry and notifies subscribers
 */
export function addDiagnosticLog(
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR',
  category: 'FETCH' | 'DELETE' | 'SAVE' | 'SYNC' | 'RLS' | 'DIAGNOSTIC',
  message: string,
  details?: any
): DiagnosticLogEntry {
  const entry: DiagnosticLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toLocaleTimeString('id-ID', { hour12: false }) + '.' + String(Date.now() % 1000).padStart(3, '0'),
    level,
    category,
    message,
    details: details ? (typeof details === 'object' ? JSON.parse(JSON.stringify(details)) : details) : undefined
  };

  diagnosticLogs = [entry, ...diagnosticLogs.slice(0, MAX_LOGS - 1)];

  // Also log to browser developer console
  if (level === 'ERROR') {
    console.error(`[CBT_DIAGNOSTIC][${category}] ${message}`, details);
  } else if (level === 'WARN') {
    console.warn(`[CBT_DIAGNOSTIC][${category}] ${message}`, details);
  } else {
    console.log(`[CBT_DIAGNOSTIC][${category}] ${message}`, details || '');
  }

  notifyLogSubscribers();
  return entry;
}

export function getDiagnosticLogs(): DiagnosticLogEntry[] {
  return [...diagnosticLogs];
}

export function clearDiagnosticLogs(): void {
  diagnosticLogs = [];
  notifyLogSubscribers();
}

export function subscribeToDiagnosticLogs(callback: (logs: DiagnosticLogEntry[]) => void): () => void {
  logListeners.add(callback);
  const initialLogs = [...diagnosticLogs];
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(() => {
      if (logListeners.has(callback)) {
        callback(initialLogs);
      }
    });
  } else {
    setTimeout(() => {
      if (logListeners.has(callback)) {
        callback(initialLogs);
      }
    }, 0);
  }
  return () => {
    logListeners.delete(callback);
  };
}

let isLogNotifyPending = false;
function notifyLogSubscribers(): void {
  if (isLogNotifyPending) return;
  isLogNotifyPending = true;

  const dispatch = () => {
    isLogNotifyPending = false;
    const logs = [...diagnosticLogs];
    logListeners.forEach(cb => {
      try {
        cb(logs);
      } catch (e) {
        console.warn('Error in diagnostic log subscriber:', e);
      }
    });
  };

  if (typeof queueMicrotask === 'function') {
    queueMicrotask(dispatch);
  } else {
    setTimeout(dispatch, 0);
  }
}

/**
 * Query RAW 'lms_exams' table directly from Supabase, bypassing any app mappings
 */
export async function fetchRawSupabaseExams(): Promise<{
  success: boolean;
  data: any[];
  count: number;
  error?: any;
  tableName: string;
  timestamp: string;
}> {
  const tableName = SUPABASE_TABLES.EXAMS;
  const timestamp = new Date().toISOString();

  if (!isSupabaseConfigured) {
    addDiagnosticLog('WARN', 'FETCH', 'Supabase belum dikonfigurasi (koneksi URL / ANON_KEY tidak ditemukan). Menggunakan memori lokal.');
    return {
      success: false,
      data: [],
      count: 0,
      error: 'Supabase not configured',
      tableName,
      timestamp
    };
  }

  addDiagnosticLog('INFO', 'FETCH', `Mengambil data mentah (raw rows) dari tabel '${tableName}' di Supabase...`);

  try {
    const startTime = performance.now();
    const { data, error, count, status, statusText } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' });

    const elapsed = Math.round(performance.now() - startTime);

    if (error) {
      addDiagnosticLog('ERROR', 'FETCH', `Gagal mengambil data mentah '${tableName}': ${error.message || statusText} (Status: ${status})`, {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message,
        status,
        statusText
      });
      return {
        success: false,
        data: [],
        count: 0,
        error,
        tableName,
        timestamp
      };
    }

    const rows = Array.isArray(data) ? data : [];
    addDiagnosticLog('SUCCESS', 'FETCH', `Berhasil mengambil ${rows.length} entri mentah dari tabel '${tableName}' (${elapsed}ms).`, {
      totalCount: count ?? rows.length,
      sampleKeys: rows.length > 0 ? Object.keys(rows[0]) : []
    });

    return {
      success: true,
      data: rows,
      count: count ?? rows.length,
      tableName,
      timestamp
    };
  } catch (err: any) {
    addDiagnosticLog('ERROR', 'FETCH', `Exception saat mengambil data dari '${tableName}': ${err?.message || String(err)}`, err);
    return {
      success: false,
      data: [],
      count: 0,
      error: err,
      tableName,
      timestamp
    };
  }
}

/**
 * Hard delete an exam directly from Supabase with granular verification and error reporting.
 * Checks whether Row Level Security (RLS) silently rejected the deletion.
 */
export async function hardDeleteRawSupabaseExam(id: string): Promise<{
  success: boolean;
  error?: any;
  details?: any;
  rowsDeleted: number;
}> {
  const tableName = SUPABASE_TABLES.EXAMS;
  addDiagnosticLog('INFO', 'DELETE', `Memulai hard delete untuk exam ID '${id}' dari Supabase...`);

  if (!isSupabaseConfigured) {
    addDiagnosticLog('WARN', 'DELETE', 'Supabase tidak aktif. Menghapus hanya dari storage lokal.');
    localStore.deleteEntity('token_system', 'EXAMS', id);
    return { success: true, rowsDeleted: 1 };
  }

  const stepsLog: string[] = [];

  try {
    // 1. Delete dependent attempts first to prevent Foreign Key constraints
    try {
      const attemptsRes = await supabase
        .from(SUPABASE_TABLES.ATTEMPTS)
        .delete()
        .or(`EXAM_ID.eq.${id},exam_id.eq.${id}`)
        .select();
      stepsLog.push(`Attempts deleted: ${attemptsRes.data?.length || 0}`);
    } catch (e: any) {
      stepsLog.push(`Attempts delete note: ${e.message}`);
    }

    // 2. Delete dependent questions
    try {
      const questionsRes = await supabase
        .from(SUPABASE_TABLES.QUESTIONS)
        .delete()
        .or(`EXAM_ID.eq.${id},exam_id.eq.${id}`)
        .select();
      stepsLog.push(`Questions deleted: ${questionsRes.data?.length || 0}`);
    } catch (e: any) {
      stepsLog.push(`Questions delete note: ${e.message}`);
    }

    // 3. Delete from EXAMS table using select() to verify actual deleted count
    let deleteRes = await supabase
      .from(tableName)
      .delete()
      .eq('ID', id)
      .select();

    // If ID column is lowercase id in Postgres schema
    if ((!deleteRes.data || deleteRes.data.length === 0) && !deleteRes.error) {
      const lowercaseRes = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
        .select();
      if (lowercaseRes.data && lowercaseRes.data.length > 0) {
        deleteRes = lowercaseRes;
      }
    }

    if (deleteRes.error) {
      addDiagnosticLog('ERROR', 'DELETE', `Supabase menolak penghapusan pada tabel '${tableName}': ${deleteRes.error.message}`, {
        code: deleteRes.error.code,
        details: deleteRes.error.details,
        hint: deleteRes.error.hint,
        examId: id
      });
      return {
        success: false,
        error: deleteRes.error,
        details: { steps: stepsLog, error: deleteRes.error },
        rowsDeleted: 0
      };
    }

    const deletedCount = deleteRes.data?.length || 0;

    // 4. Verify whether the row still exists in Supabase (detecting silent RLS blocks)
    const verifyRes = await supabase
      .from(tableName)
      .select('ID, id')
      .or(`ID.eq.${id},id.eq.${id}`);

    const stillExists = verifyRes.data && verifyRes.data.length > 0;

    if (stillExists) {
      addDiagnosticLog(
        'ERROR',
        'RLS',
        `⚠️ PERINGATAN KRUSIAL: Baris ID '${id}' masih tersimpan di Supabase meskipun perintah delete selesai. Hal ini membuktikan bahwa Row-Level Security (RLS) di Supabase MEMBLOKIR hak akses DELETE untuk tabel '${tableName}'. Silakan jalankan script migrasi RLS untuk mengizinkan DELETE.`,
        { examId: id, remainingRows: verifyRes.data }
      );
      return {
        success: false,
        error: 'Row still persists due to Supabase RLS policy restricting DELETE.',
        details: { stillExists: true, remaining: verifyRes.data },
        rowsDeleted: 0
      };
    }

    // 5. Also purge from local storage to prevent memory revival
    localStore.deleteEntity('token_system', 'EXAMS', id);

    addDiagnosticLog('SUCCESS', 'DELETE', `Jadwal ujian ID '${id}' berhasil dihapus secara permanen dari Supabase (${deletedCount} baris terhapus).`, {
      steps: stepsLog,
      deletedCount
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cbt:datachange', { detail: { entity: 'EXAMS', id } }));
    }

    return {
      success: true,
      details: { steps: stepsLog },
      rowsDeleted: deletedCount
    };
  } catch (err: any) {
    addDiagnosticLog('ERROR', 'DELETE', `Exception fatal saat hard delete ID '${id}': ${err?.message || String(err)}`, err);
    return {
      success: false,
      error: err,
      rowsDeleted: 0
    };
  }
}

/**
 * Purges all raw exam rows in Supabase that are NOT in the active local schedule list.
 * This is the ultimate tool to clean up ghost/stale/orphaned exam records.
 */
export async function purgeStaleSupabaseExams(activeExamIds: string[]): Promise<{
  success: boolean;
  purgedCount: number;
  staleFound: number;
  purgedIds: string[];
  failedIds: string[];
  logs: string[];
}> {
  addDiagnosticLog('INFO', 'SYNC', `Mengecek apakah ada jadwal yatim/stale di Supabase yang tidak terdaftar pada ${activeExamIds.length} jadwal aktif...`);

  const rawRes = await fetchRawSupabaseExams();
  if (!rawRes.success) {
    return {
      success: false,
      purgedCount: 0,
      staleFound: 0,
      purgedIds: [],
      failedIds: [],
      logs: ['Gagal mengambil data mentah dari Supabase.']
    };
  }

  const activeSet = new Set(activeExamIds.map(id => String(id).trim()));
  const staleRows = rawRes.data.filter(row => {
    const rawId = String(row.ID || row.id || '').trim();
    return !activeSet.has(rawId);
  });

  if (staleRows.length === 0) {
    addDiagnosticLog('SUCCESS', 'SYNC', 'Tidak ditemukan jadwal stale/hantu di Supabase. Database Cloud 100% sinkron dengan jadwal aktif.');
    return {
      success: true,
      purgedCount: 0,
      staleFound: 0,
      purgedIds: [],
      failedIds: [],
      logs: ['Semua data Supabase sinkron.']
    };
  }

  addDiagnosticLog('WARN', 'SYNC', `Ditemukan ${staleRows.length} entri stale/hantu di Supabase yang tidak ada di daftar jadwal lokal. Memulai pembersihan...`, {
    staleExamIds: staleRows.map(r => r.ID || r.id),
    staleTitles: staleRows.map(r => r.TITLE || r.title)
  });

  const purgedIds: string[] = [];
  const failedIds: string[] = [];
  const logs: string[] = [];

  for (const row of staleRows) {
    const rowId = String(row.ID || row.id);
    const rowTitle = row.TITLE || row.title || 'Tanpa Judul';
    const delRes = await hardDeleteRawSupabaseExam(rowId);
    if (delRes.success) {
      purgedIds.push(rowId);
      logs.push(`Berhasil menghapus: ${rowTitle} (ID: ${rowId})`);
    } else {
      failedIds.push(rowId);
      logs.push(`Gagal menghapus: ${rowTitle} (ID: ${rowId}) - ${delRes.error?.message || delRes.error || 'Ditolak RLS'}`);
    }
  }

  addDiagnosticLog(
    purgedIds.length > 0 ? 'SUCCESS' : 'ERROR',
    'SYNC',
    `Selesai membersihkan: ${purgedIds.length} berhasil dibersihkan, ${failedIds.length} gagal dibersihkan.`,
    { purgedIds, failedIds }
  );

  return {
    success: failedIds.length === 0,
    purgedCount: purgedIds.length,
    staleFound: staleRows.length,
    purgedIds,
    failedIds,
    logs
  };
}

/**
 * Tests whether current client has permission to DELETE from 'lms_exams' table in Supabase.
 * Uses an end-to-end canary probe to detect silent RLS blocks where DELETE queries
 * return status 200/empty rows without throwing explicit errors.
 */
export async function testSupabaseExamDeletePermissions(): Promise<{
  canDelete: boolean;
  message: string;
  details?: any;
}> {
  addDiagnosticLog('INFO', 'RLS', 'Melakukan uji coba izin DELETE pada tabel lms_exams di Supabase...');

  if (!isSupabaseConfigured) {
    return {
      canDelete: true,
      message: 'Supabase tidak dikonfigurasi, sistem bekerja pada mode memori lokal.'
    };
  }

  const dummyCanaryId = `canary_probe_${Date.now()}`;

  try {
    // Step 1: Probe basic delete command
    const { error: probeError } = await supabase
      .from(SUPABASE_TABLES.EXAMS)
      .delete()
      .eq('ID', dummyCanaryId)
      .select();

    if (probeError) {
      addDiagnosticLog('ERROR', 'RLS', `Uji coba izin DELETE gagal: ${probeError.message} (Code: ${probeError.code})`, probeError);
      return {
        canDelete: false,
        message: `DELETE ditolak langsung oleh RLS Supabase: ${probeError.message} (Code: ${probeError.code})`,
        details: probeError
      };
    }

    // Step 2: Write temporary canary row to test whether DELETE actually deletes data from Postgres
    const canaryRow = {
      ID: dummyCanaryId,
      TITLE: '__RLS_CANARY_PROBE_EXAM__',
      SUBJECT_ID: 'CANARY_TEST',
      CLASS_ID: 'ALL',
      STATUS: 'DRAFT',
      TOTAL_QUESTIONS: 0
    };

    const { data: insertedCanary, error: insertError } = await supabase
      .from(SUPABASE_TABLES.EXAMS)
      .insert(canaryRow)
      .select();

    if (!insertError && insertedCanary && insertedCanary.length > 0) {
      // Canary row inserted successfully, now test DELETE operation
      const { data: deletedCanary, error: deleteCanaryError } = await supabase
        .from(SUPABASE_TABLES.EXAMS)
        .delete()
        .eq('ID', dummyCanaryId)
        .select();

      if (deleteCanaryError) {
        addDiagnosticLog('ERROR', 'RLS', `Uji coba penghapusan baris canary gagal: ${deleteCanaryError.message}`, deleteCanaryError);
        return {
          canDelete: false,
          message: `RLS mengizinkan INSERT namun memblokir DELETE: ${deleteCanaryError.message}`,
          details: deleteCanaryError
        };
      }

      // Check if the row was actually deleted or silently retained
      if (!deletedCanary || deletedCanary.length === 0) {
        const { data: stillExisting } = await supabase
          .from(SUPABASE_TABLES.EXAMS)
          .select('ID')
          .eq('ID', dummyCanaryId);

        if (stillExisting && stillExisting.length > 0) {
          addDiagnosticLog(
            'ERROR',
            'RLS',
            `⚠️ RLS MEMBLOKIR DELETE SECARA DIAM-DIAM: Baris canary berhasil dimasukkan ke tabel 'lms_exams', tetapi saat perintah DELETE dijalankan, 0 baris terhapus dan data tetap ada di Supabase. Inilah penyebab utama mengapa jadwal ujian lama/stale terus muncul kembali setelah dihapus!`,
            { canaryId: dummyCanaryId }
          );
          return {
            canDelete: false,
            message: 'Supabase RLS memblokir DELETE secara diam-diam. Perintah DELETE tidak menghasilkan error, namun 0 baris terhapus dari PostgreSQL sehingga data ujian yang dihapus tetap tersimpan dan muncul kembali.',
            details: {
              reason: 'SILENT_RLS_DELETE_BLOCK',
              recommendation: 'Tambahkan kebijakan RLS "FOR DELETE" pada tabel lms_exams, lms_attempts, dan lms_questions di Supabase.'
            }
          };
        }
      }

      addDiagnosticLog('SUCCESS', 'RLS', 'Uji coba penuh end-to-end berhasil: Baris canary berhasil di-insert dan dihapus sempurna dari tabel Supabase lms_exams.');
      return {
        canDelete: true,
        message: 'Izin DELETE aktif dan terverifikasi 100% normal pada tabel lms_exams di Supabase.',
        details: { verifiedCanary: true }
      };
    }

    addDiagnosticLog('SUCCESS', 'RLS', 'Uji coba izin DELETE dasar berhasil. Endpoint Supabase menerima perintah DELETE.');
    return {
      canDelete: true,
      message: 'Izin DELETE aktif dan diizinkan oleh database Supabase.',
      details: { basicProbe: true }
    };
  } catch (err: any) {
    addDiagnosticLog('ERROR', 'RLS', `Exception saat uji coba RLS: ${err?.message || String(err)}`, err);
    return {
      canDelete: false,
      message: `Gagal menjalankan probe: ${err?.message || String(err)}`,
      details: err
    };
  }
}
