// ==============================================================================
// SUPABASE REALTIME PRESENCE & BROADCAST SERVICE UNTUK LIVE MONITORING CBT
// MAS MUHAMMADIYAH CIKARAMAS
// ==============================================================================
// Menyediakan:
// 1. Channel Presence: pelacakan status online real-time, fokus layar (blur/visible),
//    progres butir soal, dan status terkunci (lockdown) dari tiap peserta ujian.
// 2. Channel Broadcast: pengiriman instan sinyal pelanggaran (violation),
//    peringatan langsung dari pengawas (teacher alert), dan submit otomatis.
// 3. Fallback Cross-Tab (BroadcastChannel) agar bekerja andal di lingkungan offline/lokal.
// ==============================================================================

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { StudentPresencePayload } from '../types';

const GLOBAL_MONITOR_CHANNEL = 'cbt_exam_monitoring_room';
const LOCAL_BROADCAST_CHANNEL_NAME = 'cbt_exam_presence_broadcast_channel';

// In-memory registry of active local presences for cross-tab sync
const localPresencesMap: Map<string, StudentPresencePayload> = new Map();

// Local BroadcastChannel instance
let localBroadcastInstance: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    localBroadcastInstance = new BroadcastChannel(LOCAL_BROADCAST_CHANNEL_NAME);
  } catch (err) {
    console.warn('BroadcastChannel not supported in this browser context:', err);
  }
}

export interface StudentPresenceInitParams {
  attemptId: string;
  userId: string;
  studentName: string;
  username: string;
  className: string;
  examId: string;
  examTitle: string;
  totalQuestions: number;
  initialProgress?: number;
  initialViolations?: number;
  maxViolations?: number;
  onTeacherAlert?: (message: string, teacherName?: string) => void;
  onForceUnlock?: () => void;
  onResetAttempt?: () => void;
}

export interface StudentExamPresenceController {
  updateProgress: (progress: number, currentQuestion: number) => Promise<void>;
  recordViolation: (reason: string, violationsCount: number, isLockedOut: boolean) => Promise<void>;
  updateFocus: (isFocused: boolean) => Promise<void>;
  reportSubmitted: () => Promise<void>;
  destroy: () => Promise<void>;
}

/**
 * Controller untuk Siswa saat mengerjakan ujian (ExamTakerView)
 * Mengirimkan data presence dan memancarkan sinyal broadcast realtime
 */
export function initStudentExamPresence(
  params: StudentPresenceInitParams
): StudentExamPresenceController {
  let isDestroyed = false;
  let currentPresence: StudentPresencePayload = {
    attemptId: params.attemptId,
    userId: params.userId,
    studentName: params.studentName,
    username: params.username,
    className: params.className,
    examId: params.examId,
    examTitle: params.examTitle,
    startedAt: new Date().toISOString(),
    progress: params.initialProgress || 0,
    currentQuestion: 1,
    totalQuestions: params.totalQuestions || 1,
    violations: params.initialViolations || 0,
    isLockedOut: (params.initialViolations || 0) >= (params.maxViolations || 3),
    isFocused: typeof document !== 'undefined' ? !document.hidden : true,
    online: true,
    lastPing: Date.now()
  };

  // 1. Simpan di presence lokal
  localPresencesMap.set(params.attemptId, currentPresence);

  // Helper broadcast lokal
  const dispatchLocal = (type: string, payload: any) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cbt:exam_realtime', {
          detail: { type, payload, timestamp: Date.now() }
        })
      );
    }
    if (localBroadcastInstance) {
      try {
        localBroadcastInstance.postMessage({ type, payload, timestamp: Date.now() });
      } catch {}
    }
  };

  // Broadcast initial presence lokal
  dispatchLocal('presence_sync', { [params.attemptId]: currentPresence });

  // 2. Inisialisasi Channel Supabase Realtime
  let channel: any = null;

  if (isSupabaseConfigured) {
    try {
      channel = supabase.channel(GLOBAL_MONITOR_CHANNEL, {
        config: {
          presence: {
            key: params.attemptId
          },
          broadcast: {
            self: false,
            ack: false
          }
        }
      });

      // Dengarkan instruksi dari pengawas (Teacher Alert & Force Unlock)
      channel.on('broadcast', { event: 'teacher_alert' }, (eventPayload: any) => {
        const p = eventPayload?.payload;
        if (p?.targetAttemptId === 'ALL' || p?.targetAttemptId === params.attemptId) {
          if (params.onTeacherAlert) {
            params.onTeacherAlert(p.message || 'Harap perhatikan ujian Anda.', p.teacherName || 'Pengawas');
          }
        }
      });

      channel.on('broadcast', { event: 'unlock_lockdown' }, (eventPayload: any) => {
        const p = eventPayload?.payload;
        if (p?.targetAttemptId === params.attemptId) {
          currentPresence.isLockedOut = false;
          currentPresence.violations = Math.max(0, currentPresence.violations - 1);
          if (params.onForceUnlock) {
            params.onForceUnlock();
          }
          channel.track({ ...currentPresence, lastPing: Date.now() });
        }
      });

      channel.on('broadcast', { event: 'reset_student_attempt' }, (eventPayload: any) => {
        const p = eventPayload?.payload;
        if (p?.targetAttemptId === params.attemptId) {
          currentPresence.isLockedOut = false;
          currentPresence.violations = 0;
          if (params.onResetAttempt) {
            params.onResetAttempt();
          } else if (params.onForceUnlock) {
            params.onForceUnlock();
          }
          channel.track({ ...currentPresence, lastPing: Date.now() });
        }
      });

      // Join channel & register presence
      channel.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED' && !isDestroyed) {
          try {
            await channel.track({
              ...currentPresence,
              lastPing: Date.now()
            });
          } catch (e) {
            console.warn('Gagal track presence Supabase:', e);
          }
        }
      });
    } catch (err) {
      console.warn('Gagal setup realtime channel siswa:', err);
    }
  }

  // Dengarkan juga pesan lokal jika pengawas berada di tab lain
  const handleLocalMessage = (event: any) => {
    const data = event.data || event.detail;
    if (!data) return;

    if (data.type === 'teacher_alert') {
      const p = data.payload;
      if (p?.targetAttemptId === 'ALL' || p?.targetAttemptId === params.attemptId) {
        if (params.onTeacherAlert) {
          params.onTeacherAlert(p.message || 'Peringatan dari Pengawas.', p.teacherName || 'Pengawas');
        }
      }
    } else if (data.type === 'unlock_lockdown') {
      const p = data.payload;
      if (p?.targetAttemptId === params.attemptId) {
        currentPresence.isLockedOut = false;
        currentPresence.violations = Math.max(0, currentPresence.violations - 1);
        if (params.onForceUnlock) {
          params.onForceUnlock();
        }
      }
    } else if (data.type === 'reset_student_attempt') {
      const p = data.payload;
      if (p?.targetAttemptId === params.attemptId) {
        currentPresence.isLockedOut = false;
        currentPresence.violations = 0;
        if (params.onResetAttempt) {
          params.onResetAttempt();
        } else if (params.onForceUnlock) {
          params.onForceUnlock();
        }
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('cbt:exam_realtime', handleLocalMessage);
  }
  if (localBroadcastInstance) {
    localBroadcastInstance.addEventListener('message', handleLocalMessage);
  }

  // Heartbeat otomatis tiap 25 detik untuk menjaga status online di presence
  const heartbeatInterval = setInterval(async () => {
    if (isDestroyed) return;
    currentPresence.lastPing = Date.now();
    currentPresence.online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    localPresencesMap.set(params.attemptId, { ...currentPresence });

    if (channel && channel.track) {
      try {
        await channel.track({ ...currentPresence });
      } catch {}
    }
  }, 25000);

  // Return Controller
  return {
    updateProgress: async (progress: number, currentQuestion: number) => {
      if (isDestroyed) return;
      currentPresence.progress = progress;
      currentPresence.currentQuestion = currentQuestion;
      currentPresence.lastPing = Date.now();
      localPresencesMap.set(params.attemptId, { ...currentPresence });

      const payload = {
        attemptId: params.attemptId,
        studentName: params.studentName,
        progress,
        currentQuestion,
        timestamp: Date.now()
      };

      dispatchLocal('student_progress', payload);

      if (channel) {
        try {
          await channel.track({ ...currentPresence });
          channel.send({
            type: 'broadcast',
            event: 'student_progress',
            payload
          });
        } catch (e) {
          console.warn('Gagal broadcast progres:', e);
        }
      }
    },

    recordViolation: async (reason: string, violationsCount: number, isLockedOut: boolean) => {
      if (isDestroyed) return;
      currentPresence.violations = violationsCount;
      currentPresence.isLockedOut = isLockedOut;
      currentPresence.lastViolationReason = reason;
      currentPresence.isFocused = false;
      currentPresence.lastPing = Date.now();
      localPresencesMap.set(params.attemptId, { ...currentPresence });

      const payload = {
        attemptId: params.attemptId,
        studentName: params.studentName,
        username: params.username,
        className: params.className,
        examTitle: params.examTitle,
        reason,
        violations: violationsCount,
        maxViolations: params.maxViolations || 3,
        isLockedOut,
        timestamp: Date.now()
      };

      dispatchLocal('student_violation', payload);

      if (channel) {
        try {
          await channel.track({ ...currentPresence });
          channel.send({
            type: 'broadcast',
            event: 'student_violation',
            payload
          });
        } catch (e) {
          console.warn('Gagal broadcast pelanggaran:', e);
        }
      }
    },

    updateFocus: async (isFocused: boolean) => {
      if (isDestroyed) return;
      currentPresence.isFocused = isFocused;
      currentPresence.lastPing = Date.now();
      localPresencesMap.set(params.attemptId, { ...currentPresence });

      const payload = {
        attemptId: params.attemptId,
        studentName: params.studentName,
        isFocused,
        timestamp: Date.now()
      };

      dispatchLocal('student_focus', payload);

      if (channel) {
        try {
          await channel.track({ ...currentPresence });
          channel.send({
            type: 'broadcast',
            event: 'student_focus',
            payload
          });
        } catch (e) {
          console.warn('Gagal broadcast focus:', e);
        }
      }
    },

    reportSubmitted: async () => {
      if (isDestroyed) return;
      currentPresence.progress = 100;
      currentPresence.online = false;
      localPresencesMap.delete(params.attemptId);

      const payload = {
        attemptId: params.attemptId,
        studentName: params.studentName,
        timestamp: Date.now()
      };

      dispatchLocal('student_submitted', payload);

      if (channel) {
        try {
          channel.send({
            type: 'broadcast',
            event: 'student_submitted',
            payload
          });
          await channel.untrack();
        } catch (e) {
          console.warn('Gagal broadcast submitted:', e);
        }
      }
    },

    destroy: async () => {
      isDestroyed = true;
      clearInterval(heartbeatInterval);
      localPresencesMap.delete(params.attemptId);

      if (typeof window !== 'undefined') {
        window.removeEventListener('cbt:exam_realtime', handleLocalMessage);
      }
      if (localBroadcastInstance) {
        localBroadcastInstance.removeEventListener('message', handleLocalMessage);
      }

      if (channel) {
        try {
          await channel.untrack();
          supabase.removeChannel(channel);
        } catch {}
      }
    }
  };
}

/**
 * Supervisor Monitoring Controller (LiveMonitoringView)
 * Berlangganan Presence & Broadcast untuk memantau seluruh peserta ujian secara real-time
 */
export interface MonitoringCallbacks {
  onPresenceSync: (presences: Record<string, StudentPresencePayload>) => void;
  onStudentViolation: (payload: any) => void;
  onStudentProgress: (payload: any) => void;
  onStudentFocus: (payload: any) => void;
  onStudentSubmitted: (payload: any) => void;
}

export interface ExamMonitoringSupervisorController {
  sendTeacherAlert: (targetAttemptId: string | 'ALL', message: string, teacherName: string) => Promise<void>;
  unlockStudentLockdown: (targetAttemptId: string) => Promise<void>;
  resetStudentAttempt: (targetAttemptId: string) => Promise<void>;
  getPresences: () => Record<string, StudentPresencePayload>;
  destroy: () => void;
}

export function subscribeToExamMonitoring(
  callbacks: MonitoringCallbacks
): ExamMonitoringSupervisorController {
  let isDestroyed = false;
  const currentPresences: Record<string, StudentPresencePayload> = {};

  // Copy local presences
  localPresencesMap.forEach((v, k) => {
    currentPresences[k] = { ...v };
  });

  const notifyPresence = () => {
    if (!isDestroyed) {
      callbacks.onPresenceSync({ ...currentPresences });
    }
  };

  // Trigger initial presence
  setTimeout(notifyPresence, 50);

  // 1. Supabase Realtime Channel
  let channel: any = null;

  if (isSupabaseConfigured) {
    try {
      channel = supabase.channel(GLOBAL_MONITOR_CHANNEL, {
        config: {
          broadcast: { ack: false }
        }
      });

      // Presence Sync Event
      channel.on('presence', { event: 'sync' }, () => {
        try {
          const state = channel.presenceState();
          Object.keys(state).forEach(key => {
            const list = state[key];
            if (Array.isArray(list) && list.length > 0) {
              const latest = list[list.length - 1] as StudentPresencePayload;
              if (latest && latest.attemptId) {
                currentPresences[latest.attemptId] = latest;
              }
            }
          });
          notifyPresence();
        } catch (e) {
          console.warn('Presence sync parse error:', e);
        }
      });

      // Presence Join Event
      channel.on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
        if (Array.isArray(newPresences)) {
          newPresences.forEach((p: StudentPresencePayload) => {
            if (p?.attemptId) {
              currentPresences[p.attemptId] = p;
            }
          });
        }
        notifyPresence();
      });

      // Presence Leave Event
      channel.on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
        if (Array.isArray(leftPresences)) {
          leftPresences.forEach((p: StudentPresencePayload) => {
            if (p?.attemptId && currentPresences[p.attemptId]) {
              currentPresences[p.attemptId].online = false;
            }
          });
        }
        notifyPresence();
      });

      // Broadcast Events
      channel.on('broadcast', { event: 'student_violation' }, ({ payload }: any) => {
        if (payload?.attemptId && currentPresences[payload.attemptId]) {
          currentPresences[payload.attemptId].violations = payload.violations;
          currentPresences[payload.attemptId].isLockedOut = payload.isLockedOut;
          currentPresences[payload.attemptId].lastViolationReason = payload.reason;
          currentPresences[payload.attemptId].isFocused = false;
        }
        callbacks.onStudentViolation(payload);
        notifyPresence();
      });

      channel.on('broadcast', { event: 'student_progress' }, ({ payload }: any) => {
        if (payload?.attemptId && currentPresences[payload.attemptId]) {
          currentPresences[payload.attemptId].progress = payload.progress;
          currentPresences[payload.attemptId].currentQuestion = payload.currentQuestion;
        }
        callbacks.onStudentProgress(payload);
        notifyPresence();
      });

      channel.on('broadcast', { event: 'student_focus' }, ({ payload }: any) => {
        if (payload?.attemptId && currentPresences[payload.attemptId]) {
          currentPresences[payload.attemptId].isFocused = payload.isFocused;
        }
        callbacks.onStudentFocus(payload);
        notifyPresence();
      });

      channel.on('broadcast', { event: 'student_submitted' }, ({ payload }: any) => {
        if (payload?.attemptId && currentPresences[payload.attemptId]) {
          currentPresences[payload.attemptId].progress = 100;
          currentPresences[payload.attemptId].online = false;
        }
        callbacks.onStudentSubmitted(payload);
        notifyPresence();
      });

      channel.subscribe();
    } catch (err) {
      console.warn('Gagal inisialisasi monitoring channel Supabase:', err);
    }
  }

  // 2. Local fallback listener (Cross-tab / Local storage)
  const handleLocalIncoming = (event: any) => {
    const data = event.data || event.detail;
    if (!data) return;

    if (data.type === 'presence_sync') {
      const pMap = data.payload;
      if (pMap && typeof pMap === 'object') {
        Object.assign(currentPresences, pMap);
        notifyPresence();
      }
    } else if (data.type === 'student_violation') {
      const payload = data.payload;
      if (payload?.attemptId && currentPresences[payload.attemptId]) {
        currentPresences[payload.attemptId].violations = payload.violations;
        currentPresences[payload.attemptId].isLockedOut = payload.isLockedOut;
        currentPresences[payload.attemptId].lastViolationReason = payload.reason;
        currentPresences[payload.attemptId].isFocused = false;
      }
      callbacks.onStudentViolation(payload);
      notifyPresence();
    } else if (data.type === 'student_progress') {
      const payload = data.payload;
      if (payload?.attemptId && currentPresences[payload.attemptId]) {
        currentPresences[payload.attemptId].progress = payload.progress;
        currentPresences[payload.attemptId].currentQuestion = payload.currentQuestion;
      }
      callbacks.onStudentProgress(payload);
      notifyPresence();
    } else if (data.type === 'student_focus') {
      const payload = data.payload;
      if (payload?.attemptId && currentPresences[payload.attemptId]) {
        currentPresences[payload.attemptId].isFocused = payload.isFocused;
      }
      callbacks.onStudentFocus(payload);
      notifyPresence();
    } else if (data.type === 'student_submitted') {
      const payload = data.payload;
      if (payload?.attemptId && currentPresences[payload.attemptId]) {
        currentPresences[payload.attemptId].progress = 100;
        currentPresences[payload.attemptId].online = false;
      }
      callbacks.onStudentSubmitted(payload);
      notifyPresence();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('cbt:exam_realtime', handleLocalIncoming);
  }
  if (localBroadcastInstance) {
    localBroadcastInstance.addEventListener('message', handleLocalIncoming);
  }

  return {
    sendTeacherAlert: async (targetAttemptId: string | 'ALL', message: string, teacherName: string) => {
      const payload = { targetAttemptId, message, teacherName, timestamp: Date.now() };

      // Local broadcast
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('cbt:exam_realtime', {
            detail: { type: 'teacher_alert', payload }
          })
        );
      }
      if (localBroadcastInstance) {
        try {
          localBroadcastInstance.postMessage({ type: 'teacher_alert', payload });
        } catch {}
      }

      // Supabase Realtime broadcast
      if (channel) {
        try {
          await channel.send({
            type: 'broadcast',
            event: 'teacher_alert',
            payload
          });
        } catch (e) {
          console.warn('Gagal kirim broadcast teguran pengawas:', e);
        }
      }
    },

    unlockStudentLockdown: async (targetAttemptId: string) => {
      const payload = { targetAttemptId, timestamp: Date.now() };

      if (currentPresences[targetAttemptId]) {
        currentPresences[targetAttemptId].isLockedOut = false;
        currentPresences[targetAttemptId].violations = Math.max(0, currentPresences[targetAttemptId].violations - 1);
        notifyPresence();
      }

      // Local broadcast
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('cbt:exam_realtime', {
            detail: { type: 'unlock_lockdown', payload }
          })
        );
      }
      if (localBroadcastInstance) {
        try {
          localBroadcastInstance.postMessage({ type: 'unlock_lockdown', payload });
        } catch {}
      }

      // Supabase Realtime broadcast
      if (channel) {
        try {
          await channel.send({
            type: 'broadcast',
            event: 'unlock_lockdown',
            payload
          });
        } catch (e) {
          console.warn('Gagal broadcast buka kunci lockdown:', e);
        }
      }
    },

    resetStudentAttempt: async (targetAttemptId: string) => {
      const payload = { targetAttemptId, timestamp: Date.now() };

      if (currentPresences[targetAttemptId]) {
        currentPresences[targetAttemptId].isLockedOut = false;
        currentPresences[targetAttemptId].violations = 0;
        notifyPresence();
      }

      // Local broadcast
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('cbt:exam_realtime', {
            detail: { type: 'reset_student_attempt', payload }
          })
        );
      }
      if (localBroadcastInstance) {
        try {
          localBroadcastInstance.postMessage({ type: 'reset_student_attempt', payload });
        } catch {}
      }

      // Supabase Realtime broadcast
      if (channel) {
        try {
          await channel.send({
            type: 'broadcast',
            event: 'reset_student_attempt',
            payload
          });
        } catch (e) {
          console.warn('Gagal broadcast reset ujian:', e);
        }
      }
    },

    getPresences: () => ({ ...currentPresences }),

    destroy: () => {
      isDestroyed = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('cbt:exam_realtime', handleLocalIncoming);
      }
      if (localBroadcastInstance) {
        localBroadcastInstance.removeEventListener('message', handleLocalIncoming);
      }
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    }
  };
}
