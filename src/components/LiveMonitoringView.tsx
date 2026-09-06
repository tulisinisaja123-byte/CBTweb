import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Activity,
  RefreshCw,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  TrendingUp,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  Send,
  Unlock,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Bell,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw
} from 'lucide-react';
import { getLiveMonitoring, subscribeToRealtimeChanges, resetStudentAttempt } from '../services/supabaseLmsStorage';
import {
  subscribeToExamMonitoring,
  ExamMonitoringSupervisorController
} from '../services/examRealtimePresence';
import { LiveMonitoringItem, LiveIncidentLog, StudentPresencePayload, User } from '../types';

interface LiveMonitoringViewProps {
  token: string;
  currentUser?: User | null;
}

type FilterStatus = 'all' | 'online_focused' | 'blur' | 'violations' | 'lockdown' | 'offline';

export const LiveMonitoringView: React.FC<LiveMonitoringViewProps> = ({ token, currentUser }) => {
  const [monitoringRows, setMonitoringRows] = useState<LiveMonitoringItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [incidentLogs, setIncidentLogs] = useState<LiveIncidentLog[]>([]);
  const [showIncidentLogs, setShowIncidentLogs] = useState(true);

  // Supervisor Actions Modal State
  const [alertModalTarget, setAlertModalTarget] = useState<LiveMonitoringItem | null>(null);
  const [alertMessage, setAlertMessage] = useState('Harap tetap fokus pada lembar ujian dan jangan membuka tab lain.');
  const [resetModalTarget, setResetModalTarget] = useState<LiveMonitoringItem | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<LiveMonitoringItem | null>(null);
  const [toastNotification, setToastNotification] = useState<{
    id: string;
    title: string;
    message: string;
    type: 'warning' | 'danger' | 'info' | 'success';
  } | null>(null);

  const supervisorCtrlRef = useRef<ExamMonitoringSupervisorController | null>(null);
  const presencesRef = useRef<Record<string, StudentPresencePayload>>({});

  const showToast = useCallback((title: string, message: string, type: 'warning' | 'danger' | 'info' | 'success' = 'info') => {
    const id = Date.now().toString();
    setToastNotification({ id, title, message, type });
    setTimeout(() => {
      setToastNotification(prev => (prev?.id === id ? null : prev));
    }, 4500);
  }, []);

  // Merge Database Attempts with Realtime Presence
  const mergePresenceIntoRows = useCallback((
    baseRows: LiveMonitoringItem[],
    presences: Record<string, StudentPresencePayload>
  ) => {
    return baseRows.map(row => {
      const p = presences[row.id];
      if (!p) return row;

      return {
        ...row,
        online: p.online !== undefined ? p.online : true,
        isFocused: p.isFocused !== undefined ? p.isFocused : true,
        isLockedOut: p.isLockedOut !== undefined ? p.isLockedOut : row.violations >= 3,
        progress: p.progress !== undefined ? p.progress : row.progress,
        currentQuestion: p.currentQuestion || row.currentQuestion,
        totalQuestions: p.totalQuestions || row.totalQuestions,
        violations: p.violations !== undefined ? p.violations : row.violations,
        lastViolationReason: p.lastViolationReason || row.lastViolationReason,
        lastPresenceUpdate: p.lastPing || Date.now()
      };
    });
  }, []);

  // Load Baseline Data from Database
  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await getLiveMonitoring(token);

      // Merge with latest presence cache
      const merged = mergePresenceIntoRows(data, presencesRef.current);
      setMonitoringRows(merged);
      setLastRefreshed(new Date().toLocaleTimeString('id-ID'));
    } catch (err) {
      console.error('Failed to load live monitoring:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token, mergePresenceIntoRows]);

  // Setup Supabase Realtime Presence & Broadcast Subscription
  useEffect(() => {
    // 1. Initial baseline fetch
    loadData();

    // 2. Initialize Supervisor Realtime Monitoring Controller
    const ctrl = subscribeToExamMonitoring({
      onPresenceSync: (presences) => {
        presencesRef.current = presences;
        setMonitoringRows(prev => mergePresenceIntoRows(prev, presences));
      },

      onStudentViolation: (payload) => {
        const timestamp = new Date().toLocaleTimeString('id-ID');
        const logItem: LiveIncidentLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: payload.isLockedOut ? 'lockdown' : 'violation',
          studentName: payload.studentName || 'Siswa',
          className: payload.className || '-',
          examTitle: payload.examTitle || 'Ujian CBT',
          message: `${payload.reason} (Pelanggaran ${payload.violations}/${payload.maxViolations})`,
          timestamp,
          severity: payload.isLockedOut ? 'danger' : 'warning'
        };

        setIncidentLogs(prev => [logItem, ...prev.slice(0, 49)]);

        // Update target row instantly
        setMonitoringRows(prev =>
          prev.map(row => {
            if (row.id === payload.attemptId) {
              return {
                ...row,
                violations: payload.violations,
                isLockedOut: payload.isLockedOut,
                lastViolationReason: payload.reason,
                isFocused: false
              };
            }
            return row;
          })
        );

        showToast(
          payload.isLockedOut ? '🚨 Sesi Ujian Terkunci!' : '⚠️ Pelanggaran Siswa Terdeteksi!',
          `${payload.studentName} (${payload.className}): ${payload.reason}`,
          payload.isLockedOut ? 'danger' : 'warning'
        );
      },

      onStudentProgress: (payload) => {
        setMonitoringRows(prev =>
          prev.map(row => {
            if (row.id === payload.attemptId) {
              return {
                ...row,
                progress: payload.progress,
                currentQuestion: payload.currentQuestion
              };
            }
            return row;
          })
        );
      },

      onStudentFocus: (payload) => {
        setMonitoringRows(prev =>
          prev.map(row => {
            if (row.id === payload.attemptId) {
              return {
                ...row,
                isFocused: payload.isFocused
              };
            }
            return row;
          })
        );

        if (!payload.isFocused) {
          const timestamp = new Date().toLocaleTimeString('id-ID');
          setIncidentLogs(prev => [
            {
              id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type: 'blur',
              studentName: payload.studentName || 'Siswa',
              className: '-',
              examTitle: '-',
              message: 'Layar ujian terlepas (fokus berpindah ke jendela lain)',
              timestamp,
              severity: 'warning'
            },
            ...prev.slice(0, 49)
          ]);
        }
      },

      onStudentSubmitted: (payload) => {
        const timestamp = new Date().toLocaleTimeString('id-ID');
        setIncidentLogs(prev => [
          {
            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'submitted',
            studentName: payload.studentName || 'Siswa',
            className: '-',
            examTitle: '-',
            message: 'Siswa telah menyelesaikan dan mengumpulkan ujian.',
            timestamp,
            severity: 'success'
          },
          ...prev.slice(0, 49)
        ]);

        // Refresh baseline after submit
        setTimeout(() => loadData(true), 1200);
      }
    });

    supervisorCtrlRef.current = ctrl;

    // 3. Optional background sync every 30 seconds (gentle fallback, not tight 5s polling)
    const fallbackSync = setInterval(() => {
      loadData(true);
    }, 30000);

    // 4. Postgres DB Change listener
    const unsubDb = subscribeToRealtimeChanges('lms_attempts', () => {
      loadData(true);
    });

    return () => {
      clearInterval(fallbackSync);
      unsubDb();
      ctrl.destroy();
    };
  }, [loadData, mergePresenceIntoRows, showToast]);

  // Handle Send Teacher Alert
  const handleSendTeacherAlert = async () => {
    if (!alertModalTarget) return;
    try {
      const teacherName = currentUser?.NAME || 'Pengawas CBT';
      await supervisorCtrlRef.current?.sendTeacherAlert(
        alertModalTarget.id,
        alertMessage,
        teacherName
      );

      setIncidentLogs(prev => [
        {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'alert',
          studentName: alertModalTarget.student,
          className: alertModalTarget.className,
          examTitle: alertModalTarget.exam,
          message: `Pengawas mengirim teguran: "${alertMessage}"`,
          timestamp: new Date().toLocaleTimeString('id-ID'),
          severity: 'info'
        },
        ...prev.slice(0, 49)
      ]);

      showToast('Peringatan Terkirim', `Teguran telah dikirim langsung ke layar ${alertModalTarget.student}.`, 'success');
      setAlertModalTarget(null);
    } catch (err) {
      showToast('Gagal Mengirim', 'Terjadi kendala saat mengirimkan pesan.', 'danger');
    }
  };

  // Handle Unlock Student Lockdown
  const handleUnlockStudent = async (studentItem: LiveMonitoringItem) => {
    try {
      await supervisorCtrlRef.current?.unlockStudentLockdown(studentItem.id);

      setMonitoringRows(prev =>
        prev.map(row => {
          if (row.id === studentItem.id) {
            return {
              ...row,
              isLockedOut: false,
              violations: Math.max(0, row.violations - 1)
            };
          }
          return row;
        })
      );

      setIncidentLogs(prev => [
        {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'unlock',
          studentName: studentItem.student,
          className: studentItem.className,
          examTitle: studentItem.exam,
          message: 'Pengawas membuka kunci layar ujian dan mengizinkan siswa melanjutkan pengerjaan.',
          timestamp: new Date().toLocaleTimeString('id-ID'),
          severity: 'success'
        },
        ...prev.slice(0, 49)
      ]);

      showToast('Kunci Dibuka', `Akses ujian untuk ${studentItem.student} berhasil dipulihkan.`, 'success');
    } catch (err) {
      showToast('Gagal Membuka Kunci', 'Gagal memulihkan akses siswa.', 'danger');
    }
  };

  // Handle Reset Student Attempt (Jawaban TIDAK HILANG)
  const handleConfirmResetStudent = async () => {
    if (!resetModalTarget) return;
    setIsResetting(true);
    try {
      const res = await resetStudentAttempt(token, resetModalTarget.id);
      await supervisorCtrlRef.current?.resetStudentAttempt(resetModalTarget.id);

      setMonitoringRows(prev =>
        prev.map(row => {
          if (row.id === resetModalTarget.id) {
            return {
              ...row,
              isLockedOut: false,
              violations: 0
            };
          }
          return row;
        })
      );

      setIncidentLogs(prev => [
        {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'unlock',
          studentName: resetModalTarget.student,
          className: resetModalTarget.className,
          examTitle: resetModalTarget.exam,
          message: 'Pengawas me-reset status ujian siswa. Seluruh jawaban tersimpan utuh dan aman.',
          timestamp: new Date().toLocaleTimeString('id-ID'),
          severity: 'info'
        },
        ...prev.slice(0, 49)
      ]);

      showToast('Sesi Berhasil Direset', res?.message || `Sesi ${resetModalTarget.student} berhasil di-reset. Seluruh jawaban tetap utuh tersimpan.`, 'success');
      setResetModalTarget(null);
    } catch (err: any) {
      showToast('Gagal Reset', err?.message || 'Terjadi kesalahan saat me-reset sesi ujian.', 'danger');
    } finally {
      setIsResetting(false);
    }
  };

  // Filter and Search Logic
  const filteredRows = useMemo(() => {
    return monitoringRows.filter(row => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          row.student.toLowerCase().includes(q) ||
          row.username.toLowerCase().includes(q) ||
          row.className.toLowerCase().includes(q) ||
          row.exam.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 2. Status filter
      if (statusFilter === 'online_focused') {
        return row.online && (row.isFocused !== false);
      }
      if (statusFilter === 'blur') {
        return row.online && row.isFocused === false;
      }
      if (statusFilter === 'violations') {
        return row.violations > 0;
      }
      if (statusFilter === 'lockdown') {
        return Boolean(row.isLockedOut || row.violations >= 3);
      }
      if (statusFilter === 'offline') {
        return !row.online;
      }

      return true;
    });
  }, [monitoringRows, searchQuery, statusFilter]);

  // Key Stats
  const activeCount = monitoringRows.length;
  const onlineCount = monitoringRows.filter(r => r.online).length;
  const blurCount = monitoringRows.filter(r => r.online && r.isFocused === false).length;
  const lockdownCount = monitoringRows.filter(r => r.isLockedOut || r.violations >= 3).length;
  const totalViolations = monitoringRows.reduce((acc, r) => acc + r.violations, 0);
  const avgProgress = activeCount
    ? Math.round(monitoringRows.reduce((acc, r) => acc + r.progress, 0) / activeCount)
    : 0;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastNotification && (
        <div className="fixed top-20 right-6 z-50 max-w-sm w-full animate-in slide-in-from-top-4 fade-in">
          <div
            className={`p-4 rounded-xl shadow-xl border flex items-start gap-3 ${
              toastNotification.type === 'danger'
                ? 'bg-red-50 border-red-200 text-red-900'
                : toastNotification.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : toastNotification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            {toastNotification.type === 'danger' && <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
            {toastNotification.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
            {toastNotification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {toastNotification.type === 'info' && <Bell className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xs">{toastNotification.title}</div>
              <div className="text-[11px] mt-0.5 leading-relaxed opacity-90">{toastNotification.message}</div>
            </div>
            <button
              onClick={() => setToastNotification(null)}
              className="text-gray-400 hover:text-gray-700 cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1A1C1E] tracking-tight">
              Live Monitoring CBT Realtime
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>WebSocket & Presence Aktif</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#6C757D] mt-1">
            Pengawasan real-time terpusat: deteksi status online, fokus tab browser (blur/active), pelanggaran anti-cheat, dan progres butir soal secara instan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] text-[#6C757D] hidden md:block">
            Pembaruan: <b className="text-[#1A1C1E]">{lastRefreshed || '-'}</b>
          </div>
          <button
            type="button"
            onClick={() => loadData(false)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-[#DEE2E6] text-[#1A1C1E] hover:bg-[#F8F9FA] font-medium text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#0052CC] ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Menyinkronkan...' : 'Perbarui'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-white border border-[#DEE2E6] text-[#1A1C1E] flex flex-col justify-between shadow-xs">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-semibold text-[#6C757D] uppercase tracking-wider">Sedang Ujian</span>
            <div className="w-7 h-7 rounded-lg bg-[#E8F0FE] text-[#0052CC] flex items-center justify-center">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-[#1A1C1E] mt-2">{activeCount}</div>
          <span className="text-[10px] text-[#6C757D] mt-1">Peserta dalam sesi</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#DEE2E6] text-[#1A1C1E] flex flex-col justify-between shadow-xs">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-semibold text-[#6C757D] uppercase tracking-wider">Online & Terhubung</span>
            <div className="w-7 h-7 rounded-lg bg-[#E6F4EA] text-[#137333] flex items-center justify-center">
              <Wifi className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-700 mt-2">{onlineCount}</div>
          <span className="text-[10px] text-emerald-600 mt-1">Presence aktif</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#DEE2E6] text-[#1A1C1E] flex flex-col justify-between shadow-xs">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-semibold text-[#6C757D] uppercase tracking-wider">Tab Blur / Tak Fokus</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <EyeOff className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-amber-700 mt-2">{blurCount}</div>
          <span className="text-[10px] text-amber-600 mt-1">Layar tidak aktif</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#DEE2E6] text-[#1A1C1E] flex flex-col justify-between shadow-xs">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-semibold text-[#6C757D] uppercase tracking-wider">Terkunci (Lockdown)</span>
            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-700 flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-red-700 mt-2">{lockdownCount}</div>
          <span className="text-[10px] text-red-600 mt-1">Mencapai batas</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#DEE2E6] text-[#1A1C1E] flex flex-col justify-between shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-semibold text-[#6C757D] uppercase tracking-wider">Rata-Rata Progress</span>
            <div className="w-7 h-7 rounded-lg bg-[#E8F0FE] text-[#0052CC] flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-[#0052CC] mt-2">{avgProgress}%</div>
          <span className="text-[10px] text-[#6C757D] mt-1">{totalViolations} total pelanggaran</span>
        </div>
      </div>

      {/* Incident & Violation Broadcast Logs Stream */}
      <div className="bg-white border border-[#DEE2E6] rounded-xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowIncidentLogs(!showIncidentLogs)}
          className="w-full px-4 py-3 bg-[#F8F9FA] hover:bg-[#F1F3F5] border-b border-[#DEE2E6] flex items-center justify-between text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-[#1A1C1E]">
              Log Siaran Realtime (Broadcast Stream & Pelanggaran)
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#495057] border border-[#DEE2E6]">
              {incidentLogs.length} kejadian
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#6C757D]">
            <span>{showIncidentLogs ? 'Sembunyikan' : 'Tampilkan'}</span>
            {showIncidentLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showIncidentLogs && (
          <div className="p-3 max-h-48 overflow-y-auto space-y-2 divide-y divide-gray-50 bg-white">
            {incidentLogs.length > 0 ? (
              incidentLogs.map(log => (
                <div key={log.id} className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2 min-w-0">
                    {log.severity === 'danger' && <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
                    {log.severity === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                    {log.severity === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                    {log.severity === 'info' && <MessageSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
                    <div className="min-w-0">
                      <span className="font-bold text-[#1A1C1E] mr-1.5">{log.studentName}</span>
                      {log.className && log.className !== '-' && (
                        <span className="text-[10px] text-[#6C757D] mr-1.5 font-mono">[{log.className}]</span>
                      )}
                      <span className="text-[#495057]">{log.message}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-[#868E96] font-mono shrink-0">{log.timestamp}</div>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-xs text-[#868E96]">
                Belum ada insiden atau siaran pelanggaran terdeteksi selama sesi pengawasan ini.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#DEE2E6] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#ADB5BD]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari siswa, username, kelas, atau ujian..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#DEE2E6] text-xs focus:outline-none focus:ring-1 focus:ring-[#0052CC] focus:border-[#0052CC]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#1A1C1E] text-white'
                  : 'bg-[#F1F3F5] text-[#495057] hover:bg-[#E9ECEF]'
              }`}
            >
              Semua ({monitoringRows.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('online_focused')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === 'online_focused'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Online & Fokus ({monitoringRows.filter(r => r.online && r.isFocused !== false).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('blur')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === 'blur'
                  ? 'bg-amber-700 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              Tab Blur ({blurCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('violations')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === 'violations'
                  ? 'bg-red-700 text-white'
                  : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'
              }`}
            >
              Pelanggaran ({monitoringRows.filter(r => r.violations > 0).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('lockdown')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === 'lockdown'
                  ? 'bg-rose-900 text-white'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Terkunci ({lockdownCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('offline')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === 'offline'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Offline ({monitoringRows.filter(r => !r.online).length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-[#DEE2E6] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#DEE2E6] flex items-center justify-between bg-white">
          <div>
            <div className="text-xs font-bold text-[#1A1C1E]">Daftar Peserta Ujian Aktif</div>
            <div className="text-[11px] text-[#6C757D]">
              Menampilkan {filteredRows.length} dari total {monitoringRows.length} sesi ujian
            </div>
          </div>
          <div className="text-[11px] text-[#6C757D] font-mono">
            {onlineCount} Terhubung via Presence
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8F9FA] text-[#6C757D] uppercase text-[10px] font-semibold tracking-wider border-b border-[#DEE2E6]">
              <tr>
                <th className="px-5 py-3">Status Presence</th>
                <th className="px-5 py-3">Nama Siswa & NIS</th>
                <th className="px-5 py-3">Kelas</th>
                <th className="px-5 py-3">Mata Ujian</th>
                <th className="px-5 py-3">Durasi</th>
                <th className="px-5 py-3">Progress Soal</th>
                <th className="px-5 py-3 text-center">Pelanggaran</th>
                <th className="px-5 py-3 text-right">Aksi Pengawas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DEE2E6]">
              {filteredRows.length > 0 ? (
                filteredRows.map(row => {
                  const isLocked = Boolean(row.isLockedOut || row.violations >= 3);
                  const isBlurred = row.online && row.isFocused === false;

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-[#F8F9FA] transition-colors ${
                        isLocked ? 'bg-red-50/40' : isBlurred ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Presence Status */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 animate-pulse">
                            <ShieldAlert className="w-3 h-3 text-red-600" />
                            <span>Terkunci / Lockdown</span>
                          </span>
                        ) : isBlurred ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                            <EyeOff className="w-3 h-3 text-amber-600" />
                            <span>Tab Tidak Aktif (Blur)</span>
                          </span>
                        ) : row.online ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            <span>Online & Fokus</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            <WifiOff className="w-3 h-3 text-gray-400" />
                            <span>Offline</span>
                          </span>
                        )}
                      </td>

                      {/* Student Name */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-[#1A1C1E] flex items-center gap-1.5">
                          <span>{row.student}</span>
                          {row.lastViolationReason && (
                            <span
                              title={row.lastViolationReason}
                              className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"
                            />
                          )}
                        </div>
                        <div className="text-[10px] text-[#6C757D] font-mono">{row.username}</div>
                      </td>

                      {/* Class */}
                      <td className="px-5 py-3.5 font-medium text-[#1A1C1E] whitespace-nowrap">
                        {row.className}
                      </td>

                      {/* Exam */}
                      <td className="px-5 py-3.5 font-medium text-[#1A1C1E]">
                        <div className="max-w-[180px] truncate" title={row.exam}>
                          {row.exam}
                        </div>
                      </td>

                      {/* Elapsed Time */}
                      <td className="px-5 py-3.5 text-[#6C757D] whitespace-nowrap">
                        <div className="font-medium text-[#1A1C1E]">{row.elapsedMinutes} menit</div>
                        <div className="text-[10px]">
                          Mulai:{' '}
                          {new Date(row.startedAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>

                      {/* Progress */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 bg-[#E9ECEF] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isLocked ? 'bg-red-500' : 'bg-[#0052CC]'
                              }`}
                              style={{ width: `${row.progress}%` }}
                            />
                          </div>
                          <span className="font-bold text-xs text-[#0052CC]">{row.progress}%</span>
                        </div>
                        {row.currentQuestion && (
                          <div className="text-[10px] text-[#6C757D] mt-0.5">
                            Soal ke-{row.currentQuestion}
                          </div>
                        )}
                      </td>

                      {/* Violations */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-bold text-xs ${
                            row.violations >= 3
                              ? 'bg-red-100 text-red-700 border border-red-300'
                              : row.violations > 0
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'text-[#6C757D]'
                          }`}
                        >
                          {row.violations}
                        </span>
                        {row.lastViolationReason && (
                          <div
                            className="text-[9px] text-red-600 truncate max-w-[120px] mx-auto mt-0.5"
                            title={row.lastViolationReason}
                          >
                            {row.lastViolationReason}
                          </div>
                        )}
                      </td>

                      {/* Supervisor Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isLocked ? (
                            <button
                              type="button"
                              onClick={() => handleUnlockStudent(row)}
                              title="Buka Kunci Layar Siswa"
                              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Buka Kunci</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setAlertModalTarget(row);
                                setAlertMessage('Harap tetap fokus pada lembar ujian dan jangan membuka tab lain.');
                              }}
                              title="Kirim Teguran ke Layar Siswa"
                              className="px-2.5 py-1 rounded-md bg-white border border-[#DEE2E6] hover:bg-[#F8F9FA] text-[#1A1C1E] font-medium text-[11px] inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                            >
                              <Send className="w-3 h-3 text-[#0052CC]" />
                              <span>Tegur</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setResetModalTarget(row)}
                            title="Reset Sesi Ujian Siswa (Jawaban Tidak Hilang)"
                            className="px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-medium text-[11px] inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3 text-amber-600" />
                            <span>Reset</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedStudentDetail(row)}
                            className="px-2 py-1 rounded-md bg-[#F1F3F5] hover:bg-[#E9ECEF] text-[#495057] text-[11px] font-medium cursor-pointer"
                          >
                            Detail
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-[#6C757D]">
                    <div className="space-y-2">
                      <UserCheck className="w-8 h-8 text-[#ADB5BD] mx-auto opacity-70" />
                      <div className="font-bold text-sm text-[#1A1C1E]">
                        {searchQuery || statusFilter !== 'all'
                          ? 'Tidak Ada Data yang Sesuai Filter'
                          : 'Tidak Ada Ujian yang Sedang Berjalan'}
                      </div>
                      <div className="text-xs">
                        {searchQuery || statusFilter !== 'all'
                          ? 'Coba ubah kata kunci pencarian atau pilih kategori status yang lain.'
                          : 'Saat siswa login dan memulai ujian CBT, data dan sinyal real-time akan muncul di sini secara otomatis.'}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Kirim Teguran Langsung ke Layar Siswa (Broadcast Channel) */}
      {alertModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-[#DEE2E6] space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-[#DEE2E6]">
              <div>
                <h3 className="font-bold text-base text-[#1A1C1E] flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#0052CC]" />
                  <span>Kirim Peringatan Langsung</span>
                </h3>
                <p className="text-xs text-[#6C757D] mt-0.5">
                  Pesan akan langsung muncul seketika di layar peserta ujian melalui Supabase Broadcast.
                </p>
              </div>
              <button
                onClick={() => setAlertModalTarget(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs">
              <div className="font-bold text-[#1A1C1E]">{alertModalTarget.student}</div>
              <div className="text-[#6C757D]">
                {alertModalTarget.username} &bull; Kelas {alertModalTarget.className} &bull; {alertModalTarget.exam}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#495057]">Isi Pesan Peringatan Pengawas:</label>
              <textarea
                rows={3}
                value={alertMessage}
                onChange={e => setAlertMessage(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-[#DEE2E6] text-xs focus:ring-1 focus:ring-[#0052CC] focus:outline-none"
                placeholder="Tuliskan pesan peringatan atau teguran untuk siswa..."
              />
            </div>

            {/* Quick preset pills */}
            <div className="space-y-1">
              <div className="text-[10px] text-[#6C757D] font-semibold">Pilih Cepat Pesan:</div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Harap tetap fokus pada lembar ujian!',
                  'Dilarang berpindah tab atau membuka aplikasi lain!',
                  'Waktu pengerjaan tinggal sedikit, segera periksa jawaban.',
                  'Tutup aplikasi sekunder dan jangan berbicara dengan teman.'
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAlertMessage(preset)}
                    className="text-[10px] px-2 py-1 rounded bg-[#F1F3F5] hover:bg-[#E9ECEF] text-[#495057] transition-colors cursor-pointer text-left"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DEE2E6]">
              <button
                type="button"
                onClick={() => setAlertModalTarget(null)}
                className="px-4 py-2 rounded-lg bg-white border border-[#DEE2E6] hover:bg-[#F8F9FA] text-[#495057] text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSendTeacherAlert}
                className="px-4 py-2 rounded-lg bg-[#0052CC] hover:bg-[#0747A6] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirimkan ke Layar Siswa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detail Sesi Peserta */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-[#DEE2E6] space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-[#DEE2E6]">
              <div>
                <h3 className="font-bold text-base text-[#1A1C1E]">
                  Detail Sesi Ujian Siswa
                </h3>
                <p className="text-xs text-[#6C757D]">
                  Informasi telemetri pengerjaan soal dan integritas sistem
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Nama Siswa</span>
                  <div className="font-bold text-gray-900 mt-0.5">{selectedStudentDetail.student}</div>
                  <div className="text-[10px] text-gray-500 font-mono">{selectedStudentDetail.username}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Kelas</span>
                  <div className="font-bold text-gray-900 mt-0.5">{selectedStudentDetail.className}</div>
                  <div className="text-[10px] text-gray-500">{selectedStudentDetail.exam}</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status WebSocket & Presence:</span>
                  <span className={`font-bold ${selectedStudentDetail.online ? 'text-emerald-700' : 'text-gray-500'}`}>
                    {selectedStudentDetail.online ? 'Terhubung (Online)' : 'Terputus (Offline)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fokus Tab / Jendela:</span>
                  <span className={`font-bold ${selectedStudentDetail.isFocused !== false ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {selectedStudentDetail.isFocused !== false ? 'Fokus pada Layar Ujian' : 'Kehilangan Fokus (Blur)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status Lockdown:</span>
                  <span className={`font-bold ${selectedStudentDetail.isLockedOut ? 'text-red-700' : 'text-emerald-700'}`}>
                    {selectedStudentDetail.isLockedOut ? 'Terkunci (Max Violations)' : 'Aman (Aktif)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Pelanggaran:</span>
                  <span className="font-bold text-gray-900">{selectedStudentDetail.violations} kali</span>
                </div>
                {selectedStudentDetail.lastViolationReason && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-gray-500 block mb-0.5">Alasan Pelanggaran Terakhir:</span>
                    <span className="font-medium text-red-700">{selectedStudentDetail.lastViolationReason}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-500">Progres Pengerjaan:</span>
                  <span className="font-bold text-[#0052CC]">{selectedStudentDetail.progress}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Durasi Berjalan:</span>
                  <span className="font-medium text-gray-900">{selectedStudentDetail.elapsedMinutes} menit</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DEE2E6]">
              <button
                type="button"
                onClick={() => {
                  const target = selectedStudentDetail;
                  setSelectedStudentDetail(null);
                  setResetModalTarget(target);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Sesi (Jawaban Aman)</span>
              </button>
              {selectedStudentDetail.isLockedOut && (
                <button
                  type="button"
                  onClick={() => {
                    handleUnlockStudent(selectedStudentDetail);
                    setSelectedStudentDetail(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Buka Kunci Layar</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="px-4 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Reset Ujian Siswa (JAWABAN TETAP AMAN / TIDAK HILANG) */}
      {resetModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-amber-200 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-[#DEE2E6]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1A1C1E]">
                    Reset Sesi Ujian Siswa
                  </h3>
                  <p className="text-xs text-[#6C757D] mt-0.5">
                    Pulihkan status pengerjaan siswa tanpa menghapus jawaban
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResetModalTarget(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Student Info Box */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1">
              <div className="flex justify-between font-bold text-[#1A1C1E]">
                <span>{resetModalTarget.student}</span>
                <span className="text-gray-500 font-medium">{resetModalTarget.username}</span>
              </div>
              <div className="text-[#6C757D]">
                Kelas: <strong className="text-gray-800">{resetModalTarget.className}</strong> &bull; Ujian: <strong className="text-gray-800">{resetModalTarget.exam}</strong>
              </div>
              <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-600">
                <span>Progres: <strong>{resetModalTarget.progress}%</strong></span>
                <span>Pelanggaran: <strong className="text-red-600">{resetModalTarget.violations}x</strong></span>
                <span>Status: <strong className={resetModalTarget.isLockedOut ? 'text-red-600' : 'text-emerald-600'}>{resetModalTarget.isLockedOut ? 'Terkunci' : 'Aktif'}</strong></span>
              </div>
            </div>

            {/* Jaminan Jawaban Tidak Hilang */}
            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs space-y-1.5">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Jaminan: Jawaban Siswa TIDAK HILANG</span>
              </div>
              <p className="text-emerald-800 text-[11px] leading-relaxed">
                Tindakan reset ini hanya mengatur ulang status ujian ke <strong>IN_PROGRESS</strong>, mereset hitungan pelanggaran ke <strong>0</strong>, dan membuka kunci layar. Seluruh jawaban soal yang telah dipilih atau diketik oleh siswa tetap tersimpan aman di sistem.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DEE2E6]">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setResetModalTarget(null)}
                className="px-4 py-2 rounded-lg bg-white border border-[#DEE2E6] hover:bg-gray-50 text-gray-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleConfirmResetStudent}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span>{isResetting ? 'Memproses Reset...' : 'Ya, Reset Sesi Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMonitoringView;
