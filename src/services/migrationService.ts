/**
 * Migration Service: LocalStorage ke Supabase
 * CBT & LMS MAS MUHAMMADIYAH CIKARAMAS
 * 
 * Skrip migrasi data satu kali (One-Click Migration) untuk memindahkan seluruh data
 * yang tersimpan di localStorage browser ke database Supabase PostgreSQL secara aman,
 * berurutan sesuai dependensi Foreign Key, dengan progress bar realtime & pencadangan JSON.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { SUPABASE_TABLES } from './supabaseLmsStorage';
import { STORAGE_KEYS, safeStorageGet, safeStorageSet } from './lmsStorage';
import {
  User,
  ClassItem,
  Subject,
  Exam,
  Question,
  Attempt,
  SchoolSettings,
  AssessmentType
} from '../types';

export interface MigrationEntityInfo {
  key: string;
  name: string;
  tableName: string;
  description: string;
  localCount: number;
  supabaseCount: number | null;
  status: 'PENDING' | 'SYNCED' | 'DESYNC' | 'ERROR' | 'EMPTY';
  errorMessage?: string;
  dependencies?: string[];
}

export interface MigrationProgressLog {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

export interface MigrationProgress {
  status: 'IDLE' | 'ANALYZING' | 'MIGRATING' | 'COMPLETED' | 'FAILED';
  currentEntityIndex: number;
  totalEntities: number;
  currentEntityName: string;
  currentEntityTable: string;
  itemsProcessed: number;
  totalItemsInEntity: number;
  percentage: number;
  logs: MigrationProgressLog[];
  startTime?: number;
  endTime?: number;
  elapsedMs?: number;
  summary?: {
    totalRecordsMigrated: number;
    successTables: number;
    failedTables: number;
    tableResults: Record<string, { count: number; success: boolean; error?: string }>;
  };
}

export type MigrationProgressCallback = (progress: MigrationProgress) => void;

/**
 * Metadata definisi entitas & pemetaan tabel
 */
export const MIGRATION_SCHEMA_ORDER: Array<{
  key: keyof typeof STORAGE_KEYS;
  table: string;
  name: string;
  desc: string;
  primaryKey: string;
  order: number;
}> = [
  { key: 'CLASSES', table: SUPABASE_TABLES.CLASSES, name: 'Data Rombel / Kelas', desc: 'Daftar rombel Fase E/F dan kelas X, XI, XII', primaryKey: 'ID', order: 1 },
  { key: 'USERS', table: SUPABASE_TABLES.USERS, name: 'Pengguna (Siswa, Guru, Admin)', desc: 'Akun login, NIS, dan kode pengampu guru', primaryKey: 'ID', order: 2 },
  { key: 'SUBJECTS', table: SUPABASE_TABLES.SUBJECTS, name: 'Mata Pelajaran', desc: 'Struktur mapel umum, peminatan & muatan lokal', primaryKey: 'ID', order: 3 },
  { key: 'ASSESSMENT_TYPES', table: SUPABASE_TABLES.ASSESSMENT_TYPES, name: 'Jenis Penilaian', desc: 'Format asesmen STS, SAS, Asesmen Harian', primaryKey: 'ID', order: 4 },
  { key: 'EXAMS', table: SUPABASE_TABLES.EXAMS, name: 'Jadwal & Paket Ujian CBT', desc: 'Konfigurasi ujian, waktu, durasi & token', primaryKey: 'ID', order: 5 },
  { key: 'QUESTIONS', table: SUPABASE_TABLES.QUESTIONS, name: 'Bank Soal Ujian', desc: 'Butir soal PG, PG Kompleks, Menjodohkan, Uraian', primaryKey: 'ID', order: 6 },
  { key: 'ATTEMPTS', table: SUPABASE_TABLES.ATTEMPTS, name: 'Lembar Jawaban & Nilai Siswa', desc: 'Hasil pengerjaan, skor, status submit & pelanggaran', primaryKey: 'ID', order: 7 },
  { key: 'SETTINGS', table: SUPABASE_TABLES.SETTINGS, name: 'Pengaturan Profil Sekolah', desc: 'Identitas madrasah, kurikulum & kop surat', primaryKey: 'id', order: 8 },
  { key: 'TIMETABLE', table: SUPABASE_TABLES.TIMETABLE, name: 'Jadwal Pelajaran Mingguan', desc: 'Plot jam KBM Senin-Sabtu tiap kelas', primaryKey: 'id', order: 9 },
  { key: 'TEACHER_ROSTER', table: SUPABASE_TABLES.TEACHER_ROSTER, name: 'Data Roster Guru', desc: 'Profil master 20 guru kode A..T & beban kerja', primaryKey: 'id', order: 10 },
  { key: 'TEACHER_ASSIGNMENTS', table: SUPABASE_TABLES.TEACHER_ASSIGNMENTS, name: 'Beban Mengajar Guru', desc: 'Distribusi jam tatap muka per rombel & linieritas', primaryKey: 'id', order: 11 },
  { key: 'ACTIVITY', table: SUPABASE_TABLES.ACTIVITY, name: 'Log Aktivitas Sistem', desc: 'Audit trail login, ubah jadwal & submit ujian', primaryKey: 'id', order: 12 }
];

/**
 * Mengambil data mentah dari LocalStorage untuk satu key
 */
export function getLocalDataByKey<T = any>(key: string, fallback: T): T {
  try {
    const raw = safeStorageGet(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Menghasilkan snapshot lengkap seluruh data lokal
 */
export function getFullLocalStorageSnapshot(): Record<string, any> {
  const snapshot: Record<string, any> = {};
  for (const item of MIGRATION_SCHEMA_ORDER) {
    const storageKey = STORAGE_KEYS[item.key];
    snapshot[item.table] = getLocalDataByKey(storageKey, null);
  }
  // Data tambahan
  snapshot['lms_timetable_rows'] = getLocalDataByKey('lms_timetable_rows', []);
  snapshot['lms_kokulikuler_data'] = getLocalDataByKey('lms_kokulikuler_data', null);
  return snapshot;
}

/**
 * Menghitung jumlah baris data lokal per entitas
 */
export function countLocalEntities(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of MIGRATION_SCHEMA_ORDER) {
    const storageKey = STORAGE_KEYS[item.key];
    const data = getLocalDataByKey(storageKey, null);
    if (Array.isArray(data)) {
      counts[item.table] = data.length;
    } else if (data && typeof data === 'object') {
      counts[item.table] = 1; // Single record (e.g. settings)
    } else {
      counts[item.table] = 0;
    }
  }
  return counts;
}

/**
 * Mengaudit perbandingan data (Parity Check) antara LocalStorage dan Supabase
 */
export async function auditParity(): Promise<MigrationEntityInfo[]> {
  const localCounts = countLocalEntities();
  const results: MigrationEntityInfo[] = [];

  for (const item of MIGRATION_SCHEMA_ORDER) {
    const localCount = localCounts[item.table] || 0;
    let supabaseCount: number | null = null;
    let status: MigrationEntityInfo['status'] = 'PENDING';
    let errorMessage: string | undefined;

    if (isSupabaseConfigured) {
      try {
        const { count, error } = await supabase
          .from(item.table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          errorMessage = error.message;
          status = 'ERROR';
        } else {
          supabaseCount = count ?? 0;
          if (localCount === 0 && supabaseCount === 0) {
            status = 'EMPTY';
          } else if (localCount === supabaseCount && localCount > 0) {
            status = 'SYNCED';
          } else {
            status = 'DESYNC';
          }
        }
      } catch (err: any) {
        errorMessage = err.message || 'Gagal terhubung ke Supabase';
        status = 'ERROR';
      }
    } else {
      status = localCount > 0 ? 'DESYNC' : 'EMPTY';
      errorMessage = 'Supabase belum dikonfigurasi (VITE_SUPABASE_URL belum diatur)';
    }

    results.push({
      key: item.key,
      name: item.name,
      tableName: item.table,
      description: item.desc,
      localCount,
      supabaseCount,
      status,
      errorMessage
    });
  }

  return results;
}

/**
 * Format dan sanitize record sebelum di-upsert ke Supabase
 */
function sanitizeRecordForSupabase(table: string, record: any): any {
  if (!record || typeof record !== 'object') return record;

  const clone = { ...record };

  // Khusus Tabel LMS_SETTINGS
  if (table === SUPABASE_TABLES.SETTINGS) {
    return {
      id: 'current',
      SCHOOL_NAME: clone.SCHOOL_NAME || 'MAS MUHAMMADIYAH CIKARAMAS',
      ACADEMIC_YEAR: clone.SCHOOL_YEAR || clone.ACADEMIC_YEAR || '2026/2027',
      SCHOOL_YEAR: clone.SCHOOL_YEAR || clone.ACADEMIC_YEAR || '2026/2027',
      SEMESTER: clone.SEMESTER || '1 (Ganjil)',
      PRINCIPAL_NAME: clone.PRINCIPAL_NAME || 'Ai Sukaesih, S.Pd',
      PRINCIPAL_NIP: clone.PRINCIPAL_NIP || '1281201',
      DEFAULT_EXAM_DURATION: Number(clone.DEFAULT_EXAM_DURATION || 60),
      PASSING_SCORE_PERCENT: Number(clone.PASSING_SCORE_PERCENT || 75),
      ALLOWED_VIOLATIONS: Number(clone.ALLOWED_VIOLATIONS || 3),
      CURRICULUM: clone.CURRICULUM || 'MERDEKA'
    };
  }

  // Khusus Tabel LMS_TIMETABLE
  if (table === SUPABASE_TABLES.TIMETABLE) {
    return {
      id: clone.day || clone.id || `DAY-${Date.now()}`,
      order_index: typeof clone.order_index === 'number' ? clone.order_index : 0,
      data: clone.data || clone
    };
  }

  // Khusus Tabel LMS_TEACHER_ROSTER
  if (table === SUPABASE_TABLES.TEACHER_ROSTER) {
    return {
      id: clone.code || clone.id,
      code: clone.code || '',
      name: clone.name || '',
      honorific: clone.honorific || '',
      nip: clone.nipNbm || clone.nip || '',
      rank: clone.rankGolongan || clone.rank || '',
      workload_target: Number(clone.additionalDutyHours || 0)
    };
  }

  // Khusus Tabel LMS_TEACHER_ASSIGNMENTS
  if (table === SUPABASE_TABLES.TEACHER_ASSIGNMENTS) {
    return {
      id: clone.id || `ASSIGN-${Date.now()}`,
      teacher_code: clone.teacherCode || '',
      subject_name: clone.subjectName || '',
      class_name: clone.className || '',
      hours: Number(clone.totalTeachingHours || clone.hours || 0)
    };
  }

  // Khusus Tabel LMS_ATTEMPTS
  if (table === SUPABASE_TABLES.ATTEMPTS) {
    return {
      ID: clone.ID,
      EXAM_ID: clone.EXAM_ID,
      USER_ID: clone.USER_ID,
      STARTED_AT: clone.STARTED_AT || new Date().toISOString(),
      SUBMITTED_AT: clone.SUBMITTED_AT || null,
      SCORE: clone.SCORE !== undefined && clone.SCORE !== null ? String(clone.SCORE) : null,
      MAX_SCORE: clone.MAX_SCORE !== undefined ? Number(clone.MAX_SCORE) : null,
      STATUS: clone.STATUS || 'IN_PROGRESS',
      VIOLATIONS: Number(clone.VIOLATIONS || 0),
      PROGRESS: Number(clone.PROGRESS || 0),
      ANSWERS_JSON: typeof clone.ANSWERS_JSON === 'object' ? JSON.stringify(clone.ANSWERS_JSON) : String(clone.ANSWERS_JSON || '{}'),
      ESSAY_SCORES_JSON: typeof clone.ESSAY_SCORES_JSON === 'object' ? JSON.stringify(clone.ESSAY_SCORES_JSON) : String(clone.ESSAY_SCORES_JSON || '{}'),
      LAST_ACTIVITY: clone.LAST_ACTIVITY || new Date().toISOString()
    };
  }

  // Khusus Tabel LMS_QUESTIONS
  if (table === SUPABASE_TABLES.QUESTIONS) {
    return {
      ID: clone.ID,
      EXAM_ID: clone.EXAM_ID,
      ASSESSMENT_TYPE_ID: clone.ASSESSMENT_TYPE_ID || null,
      TYPE: clone.TYPE || 'MCQ',
      QUESTION: clone.QUESTION || '',
      OPTION_A: clone.OPTION_A || '',
      OPTION_B: clone.OPTION_B || '',
      OPTION_C: clone.OPTION_C || '',
      OPTION_D: clone.OPTION_D || '',
      OPTION_E: clone.OPTION_E || '',
      ANSWER: clone.ANSWER || '',
      POINTS: Number(clone.POINTS || 1),
      EXTRA_DATA: clone.EXTRA_DATA || null
    };
  }

  // Khusus Tabel LMS_EXAMS
  if (table === SUPABASE_TABLES.EXAMS) {
    return {
      ID: clone.ID,
      TITLE: clone.TITLE || '',
      SUBJECT_ID: clone.SUBJECT_ID || '',
      CLASS_ID: clone.CLASS_ID || '',
      ASSESSMENT_TYPE_ID: clone.ASSESSMENT_TYPE_ID || null,
      EXAM_DATE: clone.EXAM_DATE || '',
      START_TIME: clone.START_TIME || '',
      DURATION_MIN: Number(clone.DURATION_MIN || 60),
      STATUS: clone.STATUS || 'SCHEDULED',
      RANDOMIZE: Boolean(clone.RANDOMIZE),
      MAX_VIOLATIONS: Number(clone.MAX_VIOLATIONS || 3),
      CREATED_BY: clone.CREATED_BY || 'USR-ADMIN',
      CREATED_AT: clone.CREATED_AT || new Date().toISOString()
    };
  }

  // Khusus Tabel LMS_USERS
  if (table === SUPABASE_TABLES.USERS) {
    return {
      ID: clone.ID,
      USERNAME: String(clone.USERNAME || '').trim().toLowerCase(),
      PASSWORD_HASH: clone.PASSWORD_HASH || '123456',
      NAME: clone.NAME || '',
      EMAIL: clone.EMAIL || null,
      ROLE: clone.ROLE || 'STUDENT',
      CLASS_ID: clone.CLASS_ID || null,
      TEACHER_CODE: clone.TEACHER_CODE || null,
      ACTIVE: clone.ACTIVE !== undefined ? Boolean(clone.ACTIVE) : true,
      CREATED_AT: clone.CREATED_AT || new Date().toISOString()
    };
  }

  // Khusus Tabel LMS_CLASSES
  if (table === SUPABASE_TABLES.CLASSES) {
    return {
      ID: clone.ID,
      NAME: clone.NAME,
      LEVEL: clone.LEVEL || 'X',
      HOMEROOM: clone.HOMEROOM || '',
      ACTIVE: clone.ACTIVE !== undefined ? Boolean(clone.ACTIVE) : true
    };
  }

  // Khusus Tabel LMS_SUBJECTS
  if (table === SUPABASE_TABLES.SUBJECTS) {
    return {
      ID: clone.ID,
      CODE: clone.CODE || '',
      NAME: clone.NAME,
      LEVEL: clone.LEVEL || 'X',
      GROUP: clone.GROUP || '',
      TEACHER_ID: clone.TEACHER_ID || '',
      TEACHER_CODE: clone.TEACHER_CODE || null,
      KKM: Number(clone.KKM || 75),
      HOURS_PER_WEEK: Number(clone.HOURS_PER_WEEK || 2),
      ACTIVE: clone.ACTIVE !== undefined ? Boolean(clone.ACTIVE) : true
    };
  }

  // Khusus Tabel LMS_ASSESSMENT_TYPES
  if (table === SUPABASE_TABLES.ASSESSMENT_TYPES) {
    return {
      ID: clone.ID,
      CODE: clone.CODE,
      NAME: clone.NAME,
      DESCRIPTION: clone.DESCRIPTION || '',
      ICON: clone.ICON || '',
      ACTIVE: clone.ACTIVE !== undefined ? Boolean(clone.ACTIVE) : true
    };
  }

  return clone;
}

/**
 * Utilitas untuk memecah array ke chunk dengan ukuran tertentu
 */
function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Eksekusi One-Click Migration dari LocalStorage ke Supabase
 */
export async function executeOneClickMigration(
  options: {
    selectedTables?: string[];
    batchSize?: number;
    skipEmpty?: boolean;
  } = {},
  onProgress?: MigrationProgressCallback
): Promise<MigrationProgress> {
  const startTime = Date.now();
  const batchSize = options.batchSize || 50;
  const selectedTables = options.selectedTables || MIGRATION_SCHEMA_ORDER.map(i => i.table);

  const logs: MigrationProgressLog[] = [];
  const addLog = (level: MigrationProgressLog['level'], message: string, details?: string) => {
    const logItem: MigrationProgressLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      level,
      message,
      details
    };
    logs.push(logItem);
  };

  const notify = (state: Partial<MigrationProgress>) => {
    if (!onProgress) return;
    const progress: MigrationProgress = {
      status: state.status || 'MIGRATING',
      currentEntityIndex: state.currentEntityIndex || 0,
      totalEntities: MIGRATION_SCHEMA_ORDER.length,
      currentEntityName: state.currentEntityName || '',
      currentEntityTable: state.currentEntityTable || '',
      itemsProcessed: state.itemsProcessed || 0,
      totalItemsInEntity: state.totalItemsInEntity || 0,
      percentage: state.percentage || 0,
      logs: [...logs],
      startTime,
      elapsedMs: Date.now() - startTime,
      ...state
    };
    onProgress(progress);
  };

  addLog('info', 'Memulai inisialisasi skrip migrasi data satu kali (One-Click Migration)...');
  notify({ status: 'ANALYZING', percentage: 5 });

  // 1. Verifikasi koneksi Supabase
  if (!isSupabaseConfigured) {
    const errMsg = 'Koneksi Supabase belum aktif. Pastikan variabel VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY telah dikonfigurasi.';
    addLog('error', errMsg);
    const failState: MigrationProgress = {
      status: 'FAILED',
      currentEntityIndex: 0,
      totalEntities: MIGRATION_SCHEMA_ORDER.length,
      currentEntityName: '',
      currentEntityTable: '',
      itemsProcessed: 0,
      totalItemsInEntity: 0,
      percentage: 0,
      logs: [...logs],
      startTime,
      endTime: Date.now(),
      elapsedMs: Date.now() - startTime
    };
    notify(failState);
    throw new Error(errMsg);
  }

  addLog('success', 'Koneksi klien Supabase terverifikasi.');

  // 2. Filter entitas yang akan dimigrasi sesuai urutan dependency
  const targetEntities = MIGRATION_SCHEMA_ORDER.filter(item => selectedTables.includes(item.table));
  const totalSteps = targetEntities.length;
  let totalRecordsMigrated = 0;
  let successTables = 0;
  let failedTables = 0;
  const tableResults: Record<string, { count: number; success: boolean; error?: string }> = {};

  // 3. Iterasi setiap entitas sesuai urutan
  for (let idx = 0; idx < targetEntities.length; idx++) {
    const item = targetEntities[idx];
    const currentStep = idx + 1;
    const storageKey = STORAGE_KEYS[item.key];
    const rawData = getLocalDataByKey(storageKey, null);

    let rowsToMigrate: any[] = [];
    if (Array.isArray(rawData)) {
      rowsToMigrate = rawData;
    } else if (rawData && typeof rawData === 'object') {
      rowsToMigrate = [rawData];
    }

    const stepBasePct = Math.round(((idx) / totalSteps) * 90) + 5;
    notify({
      status: 'MIGRATING',
      currentEntityIndex: currentStep,
      totalEntities: totalSteps,
      currentEntityName: item.name,
      currentEntityTable: item.table,
      itemsProcessed: 0,
      totalItemsInEntity: rowsToMigrate.length,
      percentage: stepBasePct
    });

    if (rowsToMigrate.length === 0) {
      addLog('info', `[${currentStep}/${totalSteps}] ${item.name} (${item.table}): Tidak ada data lokal (kosong), dilewati.`);
      tableResults[item.table] = { count: 0, success: true };
      successTables++;
      continue;
    }

    addLog('info', `[${currentStep}/${totalSteps}] Memigrasi ${rowsToMigrate.length} data untuk ${item.name} (${item.table})...`);

    // Format data dan sanitasi
    const sanitizedRows = rowsToMigrate.map(r => sanitizeRecordForSupabase(item.table, r));
    const chunks = chunkArray(sanitizedRows, batchSize);

    let tableMigratedCount = 0;
    let tableHasError = false;
    let lastErrorMessage = '';

    for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
      const chunk = chunks[cIdx];
      try {
        const { error } = await supabase
          .from(item.table)
          .upsert(chunk, { onConflict: item.primaryKey });

        if (error) {
          tableHasError = true;
          lastErrorMessage = error.message;
          addLog('error', `Gagal menyimpan batch ${cIdx + 1}/${chunks.length} pada ${item.table}: ${error.message}`);
          break;
        } else {
          tableMigratedCount += chunk.length;
          const chunkPct = stepBasePct + Math.round(((cIdx + 1) / chunks.length) * (85 / totalSteps));
          notify({
            itemsProcessed: tableMigratedCount,
            totalItemsInEntity: rowsToMigrate.length,
            percentage: Math.min(95, chunkPct)
          });
        }
      } catch (err: any) {
        tableHasError = true;
        lastErrorMessage = err.message || 'Kesalahan jaringan/database';
        addLog('error', `Exception pada batch ${cIdx + 1}/${chunks.length} ${item.table}: ${lastErrorMessage}`);
        break;
      }
    }

    if (tableHasError) {
      failedTables++;
      tableResults[item.table] = { count: tableMigratedCount, success: false, error: lastErrorMessage };
      addLog('warning', `Sebagian atau seluruh migrasi tabel ${item.table} gagal: ${lastErrorMessage}`);
    } else {
      successTables++;
      totalRecordsMigrated += tableMigratedCount;
      tableResults[item.table] = { count: tableMigratedCount, success: true };
      addLog('success', `Berhasil memigrasikan ${tableMigratedCount} baris ke tabel ${item.table}.`);
    }
  }

  const endTime = Date.now();
  const elapsedMs = endTime - startTime;

  addLog('success', `Proses migrasi selesai dalam ${(elapsedMs / 1000).toFixed(2)} detik. Total ${totalRecordsMigrated} baris data berhasil disinkronkan ke Supabase.`);

  const finalProgress: MigrationProgress = {
    status: failedTables === 0 ? 'COMPLETED' : 'COMPLETED',
    currentEntityIndex: totalSteps,
    totalEntities: totalSteps,
    currentEntityName: 'Selesai',
    currentEntityTable: '',
    itemsProcessed: totalRecordsMigrated,
    totalItemsInEntity: totalRecordsMigrated,
    percentage: 100,
    logs: [...logs],
    startTime,
    endTime,
    elapsedMs,
    summary: {
      totalRecordsMigrated,
      successTables,
      failedTables,
      tableResults
    }
  };

  notify(finalProgress);

  // Trigger event untuk refresh komponen lain
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('cbt:datachange', { detail: { key: 'MIGRATION_COMPLETED', timestamp: Date.now() } }));
    } catch {}
  }

  return finalProgress;
}

/**
 * Mengunduh seluruh data LocalStorage sebagai file cadangan JSON (JSON Backup)
 */
export function exportAllLocalStorageToJson(): {
  filename: string;
  sizeBytes: number;
  totalRecords: number;
} {
  const snapshot = getFullLocalStorageSnapshot();
  const localCounts = countLocalEntities();
  const totalRecords = Object.values(localCounts).reduce((acc, curr) => acc + curr, 0);

  const exportPayload = {
    metadata: {
      appName: 'CBT MAS MUHAMMADIYAH CIKARAMAS',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      recordCounts: localCounts,
      totalRecords
    },
    tables: snapshot
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const filename = `backup_cbt_mas_muhammadiyah_${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    filename,
    sizeBytes: blob.size,
    totalRecords
  };
}

/**
 * Mengimpor / memulihkan file cadangan JSON ke LocalStorage
 */
export function importJsonBackupToLocalStorage(jsonContent: string): {
  success: boolean;
  restoredTables: string[];
  totalRecordsRestored: number;
} {
  try {
    const parsed = JSON.parse(jsonContent);
    const tables = parsed.tables || parsed;

    let restoredCount = 0;
    const restoredTables: string[] = [];

    for (const item of MIGRATION_SCHEMA_ORDER) {
      const tableData = tables[item.table];
      if (tableData !== undefined && tableData !== null) {
        const storageKey = STORAGE_KEYS[item.key];
        safeStorageSet(storageKey, JSON.stringify(tableData));
        restoredTables.push(item.table);
        if (Array.isArray(tableData)) {
          restoredCount += tableData.length;
        } else if (tableData && typeof tableData === 'object') {
          restoredCount += 1;
        }
      }
    }

    if (tables['lms_timetable_rows']) {
      safeStorageSet('lms_timetable_rows', JSON.stringify(tables['lms_timetable_rows']));
    }
    if (tables['lms_kokulikuler_data']) {
      safeStorageSet('lms_kokulikuler_data', JSON.stringify(tables['lms_kokulikuler_data']));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cbt:datachange', { detail: { key: 'IMPORT_RESTORED', timestamp: Date.now() } }));
      window.dispatchEvent(new CustomEvent('LMS_TIMETABLE_CHANGED'));
    }

    return {
      success: true,
      restoredTables,
      totalRecordsRestored: restoredCount
    };
  } catch (err: any) {
    throw new Error(`Format file cadangan JSON tidak valid: ${err.message}`);
  }
}
