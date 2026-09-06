import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Timer,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Send,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Clock,
  ShieldAlert,
  Info,
  HelpCircle,
  Flag,
  Bookmark,
  Check,
  Eye,
  EyeOff,
  Type,
  Menu,
  X,
  RotateCcw,
  Shield,
  User as UserIcon,
  BookOpen,
  FileText,
  AlertOctagon,
  Lock,
  LogOut,
  KeyRound,
  Undo2
} from 'lucide-react';
import { User } from '../types';
import { saveExamProgress, recordViolation, submitExam, resetStudentAttempt, login as adminVerifyLogin } from '../services/supabaseLmsStorage';
import { initStudentExamPresence, StudentExamPresenceController } from '../services/examRealtimePresence';
import { RichContentRenderer } from './RichContentRenderer';
import {
  parseMatchingDetails,
  parseMatchingAnswer,
  formatMatchingAnswer
} from '../utils/matchingHelper';

export interface ExamTakerViewProps {
  token: string;
  user?: User | null;
  examData: any;
  onExitExam: () => void;
}

type TextSize = 'sm' | 'md' | 'lg';

export const ExamTakerView: React.FC<ExamTakerViewProps> = ({
  token,
  user,
  examData,
  onExitExam
}) => {
  const attemptId = examData?.attempt?.id || 'att-demo';
  const questions = useMemo(() => examData?.questions || [], [examData?.questions]);
  const maxViolations = Number(examData?.exam?.maxViolations || 3);
  const examTitle = examData?.exam?.title || 'Ujian CBT';
  const subjectName = examData?.exam?.subjectName || examData?.subject?.name || examTitle;
  const studentName = user?.NAME || examData?.student?.name || 'Siswa Peserta';
  const studentIdentity = user?.USERNAME || examData?.student?.username || 'NIS/NISN';
  const studentClass = examData?.student?.className || user?.CLASS_ID || 'Kelas';

  // Navigation & Answers State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    try {
      const backup = localStorage.getItem(`cbt_backup_answers_${attemptId}`);
      if (backup) {
        return JSON.parse(backup);
      }
    } catch {}
    return examData?.attempt?.answers || {};
  });

  // Doubts / Ragu-ragu map (questionId -> boolean)
  const [doubts, setDoubts] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(`cbt_doubts_${attemptId}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });

  // Violations & Lockdown
  const [violations, setViolations] = useState<number>(() => Number(examData?.attempt?.violations || 0));
  const [activeViolationModal, setActiveViolationModal] = useState<{
    reason: string;
    count: number;
    max: number;
  } | null>(null);

  // Timer Countdown (in seconds)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const started = new Date(examData?.attempt?.startedAt || Date.now()).getTime();
    const durationMin = Number(examData?.exam?.duration || 60);
    const totalSecs = durationMin * 60;
    const elapsed = Math.max(0, Math.floor((Date.now() - started) / 1000));
    return Math.max(0, totalSecs - elapsed);
  });
  const [showTimer, setShowTimer] = useState<boolean>(true);

  // Preferences & Modals
  const [textSize, setTextSize] = useState<TextSize>('md');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [gridFilter, setGridFilter] = useState<'all' | 'unanswered' | 'doubt'>('all');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitModalStep, setSubmitModalStep] = useState<1 | 2 | null>(null);
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);
  const [finishedResult, setFinishedResult] = useState<any | null>(null);
  const [lastSaved, setLastSaved] = useState<string>('Tersimpan otomatis');
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    text: string;
    type: 'warning' | 'error' | 'info' | 'success';
  } | null>(null);

  // Exit & Admin Reset States
  const [isCancelExitModalOpen, setIsCancelExitModalOpen] = useState<boolean>(false);
  const [isAdminResetModalOpen, setIsAdminResetModalOpen] = useState<boolean>(false);
  const [adminUsername, setAdminUsername] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [adminResetError, setAdminResetError] = useState<string>('');
  const [isAdminResetting, setIsAdminResetting] = useState<boolean>(false);

  // Realtime Supabase Presence & Broadcast Controller Ref
  const presenceCtrlRef = useRef<StudentExamPresenceController | null>(null);
  const [supervisorAlert, setSupervisorAlert] = useState<{ message: string; teacherName: string } | null>(null);

  const lastViolationTimeRef = useRef(0);
  const currentQ = questions[currentIndex] || null;

  const triggerToast = useCallback((
    title: string,
    text: string,
    type: 'warning' | 'error' | 'info' | 'success' = 'warning'
  ) => {
    setToastMessage({ title, text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Initialize Realtime Presence and Broadcast
  useEffect(() => {
    const answeredCount = Object.values(answers).filter(v => Boolean(String(v || '').trim())).length;
    const progress = Math.round((answeredCount / (questions.length || 1)) * 100);

    const ctrl = initStudentExamPresence({
      attemptId,
      userId: user?.ID || examData?.student?.id || studentIdentity,
      studentName,
      username: studentIdentity,
      className: studentClass,
      examId: examData?.exam?.id || 'EXAM',
      examTitle,
      totalQuestions: questions.length || 1,
      initialProgress: progress,
      initialViolations: violations,
      maxViolations,
      onTeacherAlert: (message, teacherName) => {
        setSupervisorAlert({ message, teacherName: teacherName || 'Pengawas CBT' });
        triggerToast('Pesan dari Pengawas', message, 'info');
      },
      onForceUnlock: () => {
        setActiveViolationModal(null);
        setSubmitting(false);
        setViolations(prev => Math.max(0, prev - 1));
        triggerToast('Akses Dipulihkan', 'Pengawas telah membuka kembali akses ujian Anda. Silakan lanjutkan.', 'success');
      },
      onResetAttempt: () => {
        setActiveViolationModal(null);
        setSubmitting(false);
        setFinishedResult(null);
        setViolations(0);
        triggerToast('Sesi Ujian Direset (Jawaban Tersimpan)', 'Pengawas telah me-reset sesi ujian Anda. Seluruh jawaban yang telah diisi tetap tersimpan utuh.', 'success');
      }
    });

    presenceCtrlRef.current = ctrl;

    const handleFocus = () => ctrl.updateFocus(true);
    const handleBlur = () => ctrl.updateFocus(false);
    const handleVis = () => ctrl.updateFocus(!document.hidden);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVis);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVis);
      ctrl.destroy();
    };
  }, [attemptId, examData, questions.length, studentName, studentIdentity, studentClass, examTitle, maxViolations, user?.ID, triggerToast]);

  // Update realtime progress when currentIndex changes
  useEffect(() => {
    const answeredCount = Object.values(answers).filter(v => Boolean(String(v || '').trim())).length;
    const progress = Math.round((answeredCount / (questions.length || 1)) * 100);
    presenceCtrlRef.current?.updateProgress(progress, currentIndex + 1);
  }, [currentIndex, answers, questions.length]);

  // Format Timer HH:MM:SS
  const formatTime = useCallback((secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, []);

  // Timer Tick
  useEffect(() => {
    if (finishedResult || submitting) return;

    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit(true, 'Waktu pengerjaan ujian telah habis!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [finishedResult, submitting]);

  // Periodic autosave to storage every 15 seconds
  useEffect(() => {
    if (finishedResult || submitting) return;

    const interval = setInterval(async () => {
      const answeredCount = Object.values(answers).filter(v => Boolean(String(v || '').trim())).length;
      const progress = Math.round((answeredCount / (questions.length || 1)) * 100);
      try {
        await saveExamProgress(token, attemptId, answers, progress, violations);
        localStorage.setItem(`cbt_backup_answers_${attemptId}`, JSON.stringify(answers));
        localStorage.setItem(`cbt_doubts_${attemptId}`, JSON.stringify(doubts));
        presenceCtrlRef.current?.updateProgress(progress, currentIndex + 1);
        setLastSaved(`Tersimpan ${new Date().toLocaleTimeString('id-ID')}`);
      } catch (err) {
        // silent fail for background periodic save
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [answers, doubts, violations, finishedResult, submitting, token, attemptId, questions.length, currentIndex]);

  // Save progress helper
  const performSave = useCallback(async (updatedAnswers: Record<string, string>, updatedDoubts?: Record<string, boolean>) => {
    const answeredCount = Object.values(updatedAnswers).filter(v => Boolean(String(v || '').trim())).length;
    const progress = Math.round((answeredCount / (questions.length || 1)) * 100);

    try {
      localStorage.setItem(`cbt_backup_answers_${attemptId}`, JSON.stringify(updatedAnswers));
      if (updatedDoubts) {
        localStorage.setItem(`cbt_doubts_${attemptId}`, JSON.stringify(updatedDoubts));
      }
      await saveExamProgress(token, attemptId, updatedAnswers, progress, violations);
      presenceCtrlRef.current?.updateProgress(progress, currentIndex + 1);
      setLastSaved(`Tersimpan ${new Date().toLocaleTimeString('id-ID')}`);
    } catch (err) {
      console.warn('Auto-save warning:', err);
    }
  }, [attemptId, token, violations, questions.length, currentIndex]);

  // Violation Handler (Anti-Cheat Lockdown)
  const handleViolationDetected = useCallback(async (reason: string) => {
    const now = Date.now();
    // Debounce violation registering by 2.5 seconds to avoid double triggers
    if (now - lastViolationTimeRef.current < 2500 || finishedResult || submitting) return;
    lastViolationTimeRef.current = now;

    const answeredCount = Object.values(answers).filter(v => Boolean(String(v || '').trim())).length;
    const progress = Math.round((answeredCount / (questions.length || 1)) * 100);

    try {
      const res = await recordViolation(token, attemptId, reason, answers, progress);
      const newViolationCount = Number(res?.violations || violations + 1);
      setViolations(newViolationCount);
      const isLockedOut = Boolean(res?.autoSubmitted || newViolationCount >= maxViolations);

      // Realtime broadcast & presence track
      presenceCtrlRef.current?.recordViolation(reason, newViolationCount, isLockedOut);

      if (res?.autoSubmitted || newViolationCount >= maxViolations) {
        setSubmitting(true);
        setActiveViolationModal(null);
        if (res?.result) {
          setFinishedResult(res.result);
        } else {
          await handleAutoSubmit(true, 'Batas maksimal pelanggaran telah tercapai.');
        }
        triggerToast('Ujian Dihentikan Otomatis', 'Batas maksimal pelanggaran aturan ujian telah tercapai.', 'error');
      } else {
        // Show prominent warning modal
        setActiveViolationModal({
          reason,
          count: newViolationCount,
          max: maxViolations
        });
        triggerToast(
          'Peringatan Pelanggaran!',
          `${reason} (Peringatan ke-${newViolationCount} dari ${maxViolations})`,
          'warning'
        );
      }
    } catch (err: any) {
      console.error('Violation recording error', err);
    }
  }, [finishedResult, submitting, answers, questions.length, token, attemptId, violations, maxViolations, triggerToast]);

  // Lockdown Event Listeners: Visibility, Blur, Fullscreen, Shortcuts, ContextMenu
  useEffect(() => {
    if (finishedResult || submitting) return;

    // 1. Detect switching tab or minimizing browser
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolationDetected('Terdeteksi meninggalkan tab atau meminimalkan browser ujian');
      }
    };

    // 2. Detect window blur (user clicking outside browser window / other apps)
    const handleWindowBlur = () => {
      handleViolationDetected('Fokus layar ujian terlepas (berpindah ke jendela/aplikasi lain)');
    };

    // 3. Detect exit fullscreen
    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isFull);
      if (!isFull && !finishedResult && !submitting) {
        // Soft notification or violation if fullscreen was requested
      }
    };

    // 4. Block Key Shortcuts (Ctrl+C, Ctrl+V, F12, etc.)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = e.key.toUpperCase();

      // Block F12 (Developer tools)
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        triggerToast('Aksi Dilarang', 'Tombol F12 (Developer Tools) dinonaktifkan selama ujian!', 'error');
        return false;
      }

      // Block Ctrl/Cmd + Shift + I/J/C (Devtools)
      if (isCtrlOrMeta && e.shiftKey && ['I', 'J', 'C', 'K'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerToast('Aksi Dilarang', 'Akses Developer Tools dilarang selama ujian berlangsung!', 'error');
        return false;
      }

      // Block Ctrl/Cmd + C (Copy), V (Paste), X (Cut), A (Select All), U (Source), S (Save), P (Print)
      if (isCtrlOrMeta && ['C', 'V', 'X', 'A', 'U', 'S', 'P'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerToast(
          'Kombinasi Tombol Dilarang',
          `Shortcut (${isCtrlOrMeta ? 'Ctrl' : 'Cmd'}+${key}) diblokir demi keamanan ujian.`,
          'warning'
        );
        return false;
      }
    };

    // 5. Block Context Menu (Right Click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerToast('Aksi Dilarang', 'Klik kanan dinonaktifkan demi integritas ujian CBT!', 'warning');
      return false;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [finishedResult, submitting, handleViolationDetected, triggerToast]);

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    try {
      if (typeof document === 'undefined') return;
      if (!document.fullscreenElement) {
        if (document.documentElement?.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Fullscreen tidak didukung pada lingkungan ini:', err);
    }
  };

  // Save answer handler
  const saveAnswer = (questionId: string, val: string) => {
    const nextAnswers = { ...answers, [questionId]: val };
    setAnswers(nextAnswers);
    performSave(nextAnswers);
  };

  // Toggle doubt (ragu-ragu)
  const toggleDoubt = (questionId: string) => {
    const nextDoubts = { ...doubts, [questionId]: !doubts[questionId] };
    setDoubts(nextDoubts);
    performSave(answers, nextDoubts);
  };

  // MCQ handler
  const handleSelectMCQ = (questionId: string, opt: string) => {
    saveAnswer(questionId, opt);
  };

  const handleClearMCQ = (questionId: string) => {
    saveAnswer(questionId, '');
  };

  // Complex MCQ handler (checkboxes)
  const handleToggleComplexMCQ = (questionId: string, opt: string) => {
    const current = (answers[questionId] || '')
      .split(/[,;\s]+/)
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    let next: string[];
    if (current.includes(opt)) {
      next = current.filter(x => x !== opt);
    } else {
      next = [...current, opt].sort();
    }
    saveAnswer(questionId, next.join(', '));
  };

  // True / False handler
  const handleSelectTrueFalse = (questionId: string, val: 'BENAR' | 'SALAH') => {
    saveAnswer(questionId, val);
  };

  // Matching handler
  const handleMatchingChange = (questionId: string, leftKey: string, rightKey: string) => {
    const currentStr = answers[questionId] || '';
    const pairs = parseMatchingAnswer(currentStr);

    if (rightKey) {
      pairs[leftKey.toUpperCase()] = rightKey.toUpperCase();
    } else {
      delete pairs[leftKey.toUpperCase()];
    }

    const nextStr = formatMatchingAnswer(pairs);
    saveAnswer(questionId, nextStr);
  };

  // Essay / Short Answer handlers
  const handleTextChange = (questionId: string, val: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: val }));
  };

  const handleTextBlur = (questionId: string) => {
    saveAnswer(questionId, answers[questionId] || '');
  };

  // Confirm and Submit Exam
  const handleConfirmFinalSubmit = async () => {
    setSubmitting(true);
    setSubmitModalStep(null);
    try {
      const result = await submitExam(token, attemptId, answers, false);
      presenceCtrlRef.current?.reportSubmitted();
      setFinishedResult(result);
      localStorage.removeItem(`cbt_doubts_${attemptId}`);
      localStorage.removeItem(`cbt_backup_answers_${attemptId}`);
    } catch (err: any) {
      setSubmitting(false);
      triggerToast('Gagal Mengirim Ujian', err.message || 'Terjadi kesalahan sistem saat mengirim jawaban.', 'error');
    }
  };

  // Auto-submit (e.g. timeout or maximum violations reached)
  const handleAutoSubmit = async (forced: boolean, reasonText?: string) => {
    setSubmitting(true);
    try {
      const result = await submitExam(token, attemptId, answers, forced);
      presenceCtrlRef.current?.reportSubmitted();
      setFinishedResult(result);
      localStorage.removeItem(`cbt_doubts_${attemptId}`);
      localStorage.removeItem(`cbt_backup_answers_${attemptId}`);
      if (reasonText) {
        triggerToast('Ujian Berakhir', reasonText, 'info');
      }
    } catch (err: any) {
      console.error('Auto submit error:', err);
    }
  };

  // Otorisasi Admin untuk Reset Sesi Siswa (Jika Tidak Sengaja Klik Selesai)
  const handleAdminResetAttempt = async () => {
    setAdminResetError('');
    if (!adminUsername.trim() || !adminPassword.trim()) {
      setAdminResetError('Silakan masukkan username dan password Administrator / Pengawas.');
      return;
    }

    setIsAdminResetting(true);
    try {
      // 1. Verifikasi kredensial Admin / Pengawas
      const authResult = await adminVerifyLogin(adminUsername.trim(), adminPassword.trim());
      if (authResult.user.ROLE !== 'ADMIN' && authResult.user.ROLE !== 'TEACHER') {
        throw new Error('Hanya akun Administrator atau Guru Pengawas yang berhak mereset sesi ujian.');
      }

      // 2. Jalankan reset sesi di storage (jawaban siswa dipertahankan secara utuh)
      await resetStudentAttempt(authResult.token, attemptId);

      // 3. Kembalikan UI ke lembar ujian aktif
      setFinishedResult(null);
      setIsAdminResetModalOpen(false);
      setAdminUsername('');
      setAdminPassword('');
      triggerToast(
        'Sesi Berhasil Di-reset',
        'Sesi ujian telah diaktifkan kembali oleh Administrator. Seluruh jawaban Anda tetap tersimpan utuh dan Anda dapat melanjutkan pengerjaan.',
        'success'
      );
    } catch (err: any) {
      setAdminResetError(err.message || 'Gagal mereset sesi ujian. Periksa username dan password Anda.');
    } finally {
      setIsAdminResetting(false);
    }
  };

  // Statistics
  const answeredCount = useMemo(() => {
    return questions.filter((q: any) => Boolean(String(answers[q.id] || '').trim())).length;
  }, [questions, answers]);

  const unansweredCount = questions.length - answeredCount;

  const doubtCount = useMemo(() => {
    return questions.filter((q: any) => Boolean(doubts[q.id])).length;
  }, [questions, doubts]);

  // Jump to first unanswered or doubt question
  const jumpToFirstProblematic = () => {
    const idx = questions.findIndex((q: any) => !answers[q.id]?.trim() || doubts[q.id]);
    if (idx !== -1) {
      setCurrentIndex(idx);
      setSubmitModalStep(null);
    }
  };

  // Filtered Question indices for navigation panel
  const displayedQuestionIndices = useMemo(() => {
    return questions
      .map((q: any, i: number) => ({ q, index: i }))
      .filter(({ q }) => {
        const isAns = Boolean(String(answers[q.id] || '').trim());
        const isDoubt = Boolean(doubts[q.id]);
        if (gridFilter === 'unanswered') return !isAns;
        if (gridFilter === 'doubt') return isDoubt;
        return true;
      });
  }, [questions, answers, doubts, gridFilter]);

  // Text size classes
  const textSizeClass = {
    sm: 'text-sm sm:text-base leading-relaxed',
    md: 'text-base sm:text-lg leading-relaxed',
    lg: 'text-lg sm:text-xl leading-loose'
  }[textSize];

  // ----------------------------------------------------
  // RESULT SCREEN AFTER SUBMISSION
  // ----------------------------------------------------
  if (finishedResult) {
    return (
      <div className="fixed inset-0 z-50 bg-[#F8F9FA] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="w-full max-w-xl bg-white border border-[#DEE2E6] rounded-xl p-6 sm:p-10 shadow-lg text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-20 h-20 rounded-full bg-[#E6F4EA] text-[#137333] mx-auto grid place-items-center shadow-xs">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0052CC] bg-[#E7F0FF] px-3 py-1 rounded-full">
              CBT MAS MUHAMMADIYAH CIKARAMAS
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1C1E] pt-2">
              Ujian Berhasil Dikirim!
            </h2>
            <p className="text-xs sm:text-sm text-[#6C757D]">
              Alhamdulillah, seluruh lembar jawaban Anda telah tersimpan secara aman di server madrasah.
            </p>
          </div>

          {/* Result Card */}
          <div className="p-6 rounded-xl bg-[#F8F9FA] border border-[#E9ECEF] text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DEE2E6]">
              <span className="text-xs font-bold text-[#495057] uppercase tracking-wider">
                Mata Pelajaran:
              </span>
              <span className="text-xs font-bold text-[#1A1C1E]">{subjectName}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-lg border border-[#DEE2E6]">
                <div className="text-[11px] text-[#6C757D]">Peserta:</div>
                <div className="font-bold text-[#1A1C1E] truncate">{studentName}</div>
                <div className="text-[10px] text-[#6C757D]">{studentClass} • {studentIdentity}</div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-[#DEE2E6]">
                <div className="text-[11px] text-[#6C757D]">Status Pelanggaran:</div>
                <div className={`font-bold ${violations > 0 ? 'text-[#DC3545]' : 'text-[#137333]'}`}>
                  {violations} kali (Maks: {maxViolations})
                </div>
                <div className="text-[10px] text-[#6C757D]">Lockdown Record</div>
              </div>
            </div>

            {/* Score Output */}
            <div className="pt-2 text-center">
              {finishedResult.needsReview ? (
                <div className="p-4 rounded-lg bg-[#FEF7E0] border border-[#FEEFC3] text-[#B06000] space-y-1">
                  <div className="text-sm font-bold flex items-center justify-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>Menunggu Pemeriksaan Soal Uraian</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#7D4400]">
                    Ujian ini memuat butir soal essay/uraian. Skor akhir akan dipublikasikan oleh guru pengampu setelah koreksi selesai.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-[#E7F0FF] border border-[#B3D1FF] text-center space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#0052CC]">
                    Perolehan Skor Otomatis
                  </div>
                  <div className="text-4xl font-extrabold font-mono text-[#0052CC]">
                    {finishedResult.score}{' '}
                    <span className="text-lg text-[#6C757D] font-normal">/ {finishedResult.maxScore}</span>
                  </div>
                  <div className="text-xs font-semibold text-[#137333]">
                    Persentase Nilai: {finishedResult.percentage}%
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={onExitExam}
              className="w-full py-3 px-6 rounded-xl bg-[#0052CC] hover:bg-[#0047B3] text-white font-bold text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Kembali ke Halaman Siswa</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Admin-only Reset Section: for accidental submit */}
            <div className="pt-2 border-t border-slate-200">
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 text-left space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <Undo2 className="w-4 h-4 text-amber-700" />
                    <span>Tidak Sengaja Menekan Selesai?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminResetError('');
                      setIsAdminResetModalOpen(true);
                    }}
                    className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Reset oleh Admin</span>
                  </button>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Hanya Administrator atau Pengawas Ruang yang dapat mengaktifkan kembali sesi ini. Seluruh jawaban Anda tetap aman dan tidak akan hilang.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Otorisasi Admin untuk Reset Sesi Siswa */}
        {isAdminResetModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 leading-tight">
                      Otorisasi Reset Admin
                    </h4>
                    <p className="text-xs text-slate-500">
                      Buka kembali lembar ujian siswa
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdminResetModalOpen(false)}
                  disabled={isAdminResetting}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                Pengawas/Admin harus memasukkan kredensial akun madrasah untuk membuka kembali sesi siswa ini. <b>Seluruh jawaban siswa tetap dipertahankan utuh.</b>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username Admin / Guru
                  </label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={e => setAdminUsername(e.target.value)}
                    placeholder="Username admin/guru"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-[#0052CC]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password Admin / Guru
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAdminResetAttempt();
                    }}
                    placeholder="Password"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-[#0052CC]"
                  />
                </div>

                {adminResetError && (
                  <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{adminResetError}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdminResetModalOpen(false)}
                  disabled={isAdminResetting}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAdminResetAttempt}
                  disabled={isAdminResetting}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isAdminResetting ? (
                    <span>Memverifikasi...</span>
                  ) : (
                    <>
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Verifikasi & Buka Kembali</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // MAIN CBT ENGINE INTERFACE
  // ----------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 bg-[#F1F3F5] flex flex-col select-none overflow-hidden font-sans">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm bg-white border border-[#DEE2E6] rounded-xl p-4 shadow-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          {toastMessage.type === 'error' && (
            <AlertOctagon className="w-5 h-5 text-[#DC3545] shrink-0 mt-0.5" />
          )}
          {toastMessage.type === 'warning' && (
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          {toastMessage.type === 'success' && (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          {toastMessage.type === 'info' && (
            <Info className="w-5 h-5 text-[#0052CC] shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            <div className="font-bold text-[#1A1C1E]">{toastMessage.title}</div>
            <div className="text-[#6C757D] mt-0.5 leading-relaxed">{toastMessage.text}</div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          1. HEADER UJIAN (Memenuhi Spesifikasi Fitur 1)
          - Nama siswa
          - Mata pelajaran & nama ujian
          - Jumlah soal
          - Timer mundur interaktif
          - Autosave indicator & Fullscreen toggle
      ---------------------------------------------------- */}
      <header className="h-16 sm:h-18 bg-[#1A1C1E] text-white flex items-center justify-between px-3 sm:px-6 border-b border-[#343A40] shrink-0 z-30 shadow-sm">
        {/* Left: Identity & Subject Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0052CC] text-white font-bold flex items-center justify-center shrink-0 text-sm shadow-xs border border-white/10">
            CBT
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white truncate max-w-[170px] sm:max-w-xs md:max-w-md">
                {subjectName}
              </h1>
              <span className="hidden md:inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-white/10 text-white/80 border border-white/10">
                {questions.length} Soal
              </span>
            </div>
            <div className="text-[11px] text-white/70 flex items-center gap-2 truncate">
              <span className="font-medium text-white/90 flex items-center gap-1">
                <UserIcon className="w-3 h-3 text-[#69A8FF]" />
                <span className="truncate max-w-[130px] sm:max-w-[180px]">{studentName}</span>
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline text-white/60">{studentClass} ({studentIdentity})</span>
            </div>
          </div>
        </div>

        {/* Right: Lockdown Monitor, Autosave, Timer, Fullscreen, Mobile Drawer Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Autosave Status Badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[11px] text-white/70" title="Status penyimpanan otomatis">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{lastSaved}</span>
          </div>

          {/* Violation / Lockdown Counter */}
          <div
            className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              violations > 0
                ? 'bg-red-500/20 text-red-200 border-red-400/40 ring-1 ring-red-400/30 animate-pulse'
                : 'bg-white/10 text-white/80 border-white/15'
            }`}
            title="Pelanggaran berpindah tab / keluar fokus layar"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-[11px]">Pelanggaran:</span>
            <span className="font-mono font-bold text-xs">{violations}/{maxViolations}</span>
          </div>

          {/* Interactive Countdown Timer */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold text-xs sm:text-sm transition-all shadow-xs ${
              remainingSeconds < 300
                ? 'bg-[#DC3545] text-white border-red-400 animate-pulse'
                : remainingSeconds < 900
                ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                : 'bg-white/10 text-white border-white/20'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0 text-white/90" />
            {showTimer ? (
              <span>{formatTime(remainingSeconds)}</span>
            ) : (
              <span className="text-[11px] font-sans font-medium text-white/70">Tersembunyi</span>
            )}

            {/* Toggle Hide/Show Timer for student calmness */}
            <button
              type="button"
              onClick={() => setShowTimer(!showTimer)}
              className="p-1 hover:bg-white/15 rounded text-white/70 hover:text-white transition-colors cursor-pointer"
              title={showTimer ? 'Sembunyikan Timer' : 'Tampilkan Timer'}
            >
              {showTimer ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden sm:flex p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh (Fullscreen)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Batalkan / Keluar Sementara Button (Anti salah klik) */}
          <button
            type="button"
            onClick={() => setIsCancelExitModalOpen(true)}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-white/10 hover:bg-rose-500/20 text-white hover:text-rose-200 border border-white/15 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Batalkan pengerjaan atau keluar sementara tanpa menyelesaikan ujian"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-300" />
            <span className="hidden md:inline">Batalkan / Keluar</span>
          </button>

          {/* Mobile Navigation Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            className="lg:hidden p-2 rounded-lg bg-[#0052CC] hover:bg-[#0047B3] text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Menu className="w-4 h-4" />
            <span className="hidden xs:inline">Soal</span>
          </button>
        </div>
      </header>

      {/* ----------------------------------------------------
          2. CBT BODY (Soal & Papan Navigasi Grid)
      ---------------------------------------------------- */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] overflow-hidden">
        {/* Main Work Area: Question 1 per screen */}
        <main className="flex-1 flex flex-col justify-between overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto w-full space-y-4">
            {/* Top Toolbar: Soal Info, Type Badge, Point, and Text Size Adjuster */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-[#DEE2E6] shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[#0052CC] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {currentIndex + 1}
                </span>
                <div>
                  <div className="text-xs font-bold text-[#1A1C1E] uppercase tracking-wider">
                    Soal Nomor {currentIndex + 1}
                  </div>
                  <div className="text-[11px] text-[#6C757D]">
                    Total {questions.length} butir soal
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Question Type Badge */}
                {currentQ && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-[#F1F3F5] text-[#495057] border border-[#DEE2E6]">
                    {currentQ.type === 'MCQ' && 'Pilihan Ganda'}
                    {currentQ.type === 'COMPLEX_MCQ' && 'PG Kompleks'}
                    {currentQ.type === 'TRUE_FALSE' && 'Benar / Salah'}
                    {currentQ.type === 'MATCHING' && 'Menjodohkan'}
                    {currentQ.type === 'SHORT_ANSWER' && 'Isian Singkat'}
                    {currentQ.type === 'ESSAY' && 'Uraian / Essay'}
                  </span>
                )}

                {/* Question Points */}
                {currentQ && (
                  <span className="text-[11px] font-bold text-[#0052CC] bg-[#E7F0FF] px-2.5 py-1 rounded-md border border-[#B3D1FF]">
                    {currentQ.points} Poin
                  </span>
                )}

                {/* Text Size Switcher (A-, A, A+) */}
                <div className="hidden sm:flex items-center rounded-lg border border-[#DEE2E6] p-0.5 bg-[#F8F9FA]">
                  <button
                    type="button"
                    onClick={() => setTextSize('sm')}
                    className={`px-2 py-0.5 text-xs font-bold rounded transition-colors cursor-pointer ${
                      textSize === 'sm' ? 'bg-white text-[#0052CC] shadow-2xs' : 'text-[#6C757D] hover:text-[#1A1C1E]'
                    }`}
                    title="Ukuran Font Kecil"
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextSize('md')}
                    className={`px-2 py-0.5 text-xs font-bold rounded transition-colors cursor-pointer ${
                      textSize === 'md' ? 'bg-white text-[#0052CC] shadow-2xs' : 'text-[#6C757D] hover:text-[#1A1C1E]'
                    }`}
                    title="Ukuran Font Sedang"
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextSize('lg')}
                    className={`px-2 py-0.5 text-xs font-bold rounded transition-colors cursor-pointer ${
                      textSize === 'lg' ? 'bg-white text-[#0052CC] shadow-2xs' : 'text-[#6C757D] hover:text-[#1A1C1E]'
                    }`}
                    title="Ukuran Font Besar"
                  >
                    A+
                  </button>
                </div>
              </div>
            </div>

            {/* Question Card Body */}
            {currentQ ? (
              <div className="bg-white border border-[#DEE2E6] rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
                {/* Question Content (Rendered with RichContentRenderer) */}
                <div className={`font-medium text-[#1A1C1E] ${textSizeClass}`}>
                  <RichContentRenderer
                    content={
                      currentQ.type === 'MATCHING'
                        ? parseMatchingDetails(currentQ.question, currentQ.options, currentQ.extraData, answers[currentQ.id]).prompt
                        : currentQ.question
                    }
                  />
                </div>

                {/* ----------------------------------------------------
                    3. PILIHAN TIPE SOAL (Memenuhi Spesifikasi Fitur 3)
                ---------------------------------------------------- */}

                {/* 3A. PILIHAN GANDA (MCQ) */}
                {currentQ.type === 'MCQ' && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#495057]">Pilih salah satu jawaban:</span>
                      {answers[currentQ.id] && (
                        <button
                          type="button"
                          onClick={() => handleClearMCQ(currentQ.id)}
                          className="text-[11px] text-[#DC3545] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Batalkan Pilihan</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {(['A', 'B', 'C', 'D', 'E'] as const).map(opt => {
                        const optText = currentQ.options[opt];
                        if (!optText) return null;
                        const isSelected = answers[currentQ.id] === opt;

                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSelectMCQ(currentQ.id, opt)}
                            className={`w-full p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#0052CC] bg-[#F0F5FF] ring-2 ring-[#0052CC]/20 shadow-xs'
                                : 'border-[#CED4DA] bg-white hover:border-[#0052CC] hover:bg-[#F8F9FA]'
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition-colors shadow-2xs ${
                                isSelected
                                  ? 'bg-[#0052CC] text-white'
                                  : 'bg-[#F1F3F5] text-[#495057] border border-[#DEE2E6]'
                              }`}
                            >
                              {opt}
                            </div>
                            <div className="text-xs sm:text-sm font-medium text-[#1A1C1E] pt-1 leading-relaxed flex-1">
                              <RichContentRenderer content={optText} inline />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3B. PILIHAN GANDA KOMPLEKS (COMPLEX_MCQ) */}
                {currentQ.type === 'COMPLEX_MCQ' && (
                  <div className="space-y-3 pt-2">
                    <div className="p-3.5 rounded-xl bg-[#F0F7FF] border border-[#B3D1FF] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#0052CC]">
                      <div className="font-medium flex items-center gap-1.5">
                        <Info className="w-4 h-4 shrink-0" />
                        <span><b>Petunjuk PG Kompleks:</b> Anda dapat memilih lebih dari satu jawaban yang benar.</span>
                      </div>
                      <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-[#B3D1FF] shrink-0">
                        Dipilih: {answers[currentQ.id] || 'Belum ada'}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {(['A', 'B', 'C', 'D', 'E'] as const).map(opt => {
                        const optText = currentQ.options[opt];
                        if (!optText) return null;

                        const selectedKeys = (answers[currentQ.id] || '')
                          .split(/[,;\s]+/)
                          .map(s => s.trim().toUpperCase())
                          .filter(Boolean);
                        const isSelected = selectedKeys.includes(opt);

                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleToggleComplexMCQ(currentQ.id, opt)}
                            className={`w-full p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#0052CC] bg-[#F0F5FF] ring-2 ring-[#0052CC]/20 shadow-xs'
                                : 'border-[#CED4DA] bg-white hover:border-[#0052CC] hover:bg-[#F8F9FA]'
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs transition-colors shadow-2xs ${
                                isSelected
                                  ? 'bg-[#0052CC] text-white'
                                  : 'border-2 border-[#CED4DA] bg-white text-[#495057]'
                              }`}
                            >
                              {isSelected ? <Check className="w-4 h-4" /> : opt}
                            </div>
                            <div className="text-xs sm:text-sm font-medium text-[#1A1C1E] pt-1 leading-relaxed flex-1">
                              <span className="font-bold text-[#0052CC] mr-1.5">{opt}.</span>
                              <RichContentRenderer content={optText} inline />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3C. BENAR / SALAH (TRUE_FALSE) */}
                {currentQ.type === 'TRUE_FALSE' && (() => {
                  let parsedExtra: any = null;
                  if (currentQ.extraData) {
                    try { parsedExtra = JSON.parse(currentQ.extraData); } catch {}
                  }
                  const isMultiStatement = parsedExtra?.mode === 'STATEMENT_EVALUATION' ||
                    (parsedExtra?.evaluations && Object.keys(parsedExtra.evaluations).length > 0);

                  if (isMultiStatement) {
                    const evalOptions = ['A', 'B', 'C', 'D', 'E'].filter(opt => !!currentQ.options?.[opt]);
                    const currentAnsMap: Record<string, string> = {};
                    (answers[currentQ.id] || '').split(/[;\n,]+/).forEach(part => {
                      const [k, v] = part.split(':').map(x => x.trim().toUpperCase());
                      if (k && v) currentAnsMap[k] = v;
                    });

                    const handleMultiTfChange = (opt: string, val: 'BENAR' | 'SALAH') => {
                      const updated = { ...currentAnsMap, [opt]: val };
                      const str = Object.entries(updated).map(([k, v]) => `${k}:${v}`).join('; ');
                      saveAnswer(currentQ.id, str);
                    };

                    return (
                      <div className="space-y-3 pt-2">
                        <div className="text-xs font-bold text-[#1A1C1E]">
                          Evaluasi setiap pernyataan berikut (Pilih Benar atau Salah):
                        </div>
                        <div className="space-y-2">
                          {evalOptions.map(opt => {
                            const optText = currentQ.options[opt];
                            const selectedVal = currentAnsMap[opt];
                            return (
                              <div
                                key={opt}
                                className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                              >
                                <div className="flex items-start gap-2 flex-1 text-xs sm:text-sm text-slate-800">
                                  <span className="font-bold text-[#0052CC] shrink-0">[{opt}]</span>
                                  <div className="leading-snug">
                                    <RichContentRenderer content={optText} inline />
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                  <button
                                    type="button"
                                    onClick={() => handleMultiTfChange(opt, 'BENAR')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                      selectedVal === 'BENAR'
                                        ? 'bg-[#137333] text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                    }`}
                                  >
                                    <span>✓ Benar</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMultiTfChange(opt, 'SALAH')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                      selectedVal === 'SALAH'
                                        ? 'bg-[#DC3545] text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                                    }`}
                                  >
                                    <span>✕ Salah</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3 pt-2">
                      <div className="text-xs font-bold text-[#1A1C1E]">
                        Tentukan kebenaran dari pernyataan di atas:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <button
                          type="button"
                          onClick={() => handleSelectTrueFalse(currentQ.id, 'BENAR')}
                          className={`p-4 rounded-xl border-2 text-center font-bold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer ${
                            answers[currentQ.id]?.toUpperCase() === 'BENAR'
                              ? 'border-[#137333] bg-[#E6F4EA] text-[#137333] shadow-xs ring-2 ring-emerald-300'
                              : 'border-[#CED4DA] bg-white text-[#495057] hover:border-[#137333] hover:bg-[#F8F9FA]'
                          }`}
                        >
                          <span className="w-7 h-7 rounded-full bg-[#137333] text-white flex items-center justify-center text-xs">✓</span>
                          <span>BENAR (TRUE)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectTrueFalse(currentQ.id, 'SALAH')}
                          className={`p-4 rounded-xl border-2 text-center font-bold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer ${
                            answers[currentQ.id]?.toUpperCase() === 'SALAH'
                              ? 'border-[#DC3545] bg-[#FCE8E6] text-[#DC3545] shadow-xs ring-2 ring-red-300'
                              : 'border-[#CED4DA] bg-white text-[#495057] hover:border-[#DC3545] hover:bg-[#F8F9FA]'
                          }`}
                        >
                          <span className="w-7 h-7 rounded-full bg-[#DC3545] text-white flex items-center justify-center text-xs">✕</span>
                          <span>SALAH (FALSE)</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* 3D. MENJODOHKAN (MATCHING) */}
                {currentQ.type === 'MATCHING' && (() => {
                  const details = parseMatchingDetails(
                    currentQ.question,
                    currentQ.options,
                    currentQ.extraData,
                    answers[currentQ.id]
                  );
                  const userPairs = parseMatchingAnswer(answers[currentQ.id] || '');

                  return (
                    <div className="space-y-4 pt-2">
                      <div className="p-3.5 rounded-xl bg-[#F0F7FF] border border-[#B3D1FF] text-xs text-[#0052CC] font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🔗</span>
                          <span>
                            <b>Petunjuk Menjodohkan:</b> Pasangkan pernyataan pada <b>Kolom Kiri</b> dengan pilihan di <b>Kolom Kanan</b>.
                          </span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white text-[#0052CC] border border-[#B3D1FF] shrink-0">
                          {Object.keys(userPairs).length} / {details.leftItems.length} Terpasang
                        </span>
                      </div>

                      {/* Right Items Legend */}
                      {details.rightItems.length > 0 && (
                        <div className="p-3.5 bg-[#F8F9FA] rounded-xl border border-[#DEE2E6] space-y-2">
                          <div className="text-[11px] font-bold text-[#495057] uppercase tracking-wider">
                            Daftar Pilihan Pasangan (Kolom Kanan):
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {details.rightItems.map(r => (
                              <div
                                key={r.key}
                                className="flex items-start gap-2 bg-white px-3 py-2 rounded-lg border border-[#E9ECEF] text-xs"
                              >
                                <span className="w-5 h-5 rounded bg-[#1A1C1E] text-white font-bold text-[10px] inline-flex items-center justify-center shrink-0">
                                  {r.key}
                                </span>
                                <div className="text-[#1A1C1E] font-medium leading-snug flex-1">
                                  <RichContentRenderer content={r.text} inline />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Left Items Selector List */}
                      <div className="space-y-2.5">
                        <div className="text-xs font-bold text-[#1A1C1E]">
                          Pernyataan & Pasangan Jawaban:
                        </div>
                        {details.leftItems.map((leftItem, idx) => {
                          const itemKey = leftItem.key;
                          const selectedRight = userPairs[itemKey] || '';
                          const matchedRightObj = details.rightItems.find(r => r.key === selectedRight);

                          return (
                            <div
                              key={itemKey}
                              className={`p-3.5 rounded-xl border transition-all ${
                                selectedRight
                                  ? 'border-[#0052CC] bg-[#F4F8FF] shadow-2xs'
                                  : 'border-[#DEE2E6] bg-white hover:border-[#CED4DA]'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-2.5 flex-1 text-xs sm:text-sm font-medium text-[#1A1C1E]">
                                  <span className="w-6 h-6 rounded-full bg-[#E8F0FE] text-[#0052CC] font-bold text-xs inline-flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <div className="leading-snug pt-0.5 flex-1">
                                    <RichContentRenderer content={leftItem.text} inline />
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs text-[#6C757D] font-bold">➔ Pasangan:</span>
                                  <select
                                    value={selectedRight}
                                    onChange={e => handleMatchingChange(currentQ.id, itemKey, e.target.value)}
                                    className={`px-3 py-2 border rounded-lg text-xs font-bold outline-none transition-colors max-w-[220px] sm:max-w-[280px] truncate cursor-pointer ${
                                      selectedRight
                                        ? 'border-[#0052CC] bg-[#E7F0FF] text-[#0052CC]'
                                        : 'border-[#CED4DA] bg-white text-[#495057]'
                                    }`}
                                  >
                                    <option value="">-- Pilih Pasangan --</option>
                                    {details.rightItems.map(r => (
                                      <option key={r.key} value={r.key}>
                                        {r.key}. {r.text.replace(/\$+/g, '')}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {matchedRightObj && (
                                <div className="mt-2.5 pt-2 border-t border-[#D0E2FF] flex items-center gap-1.5 text-[11px] text-[#0052CC] flex-wrap">
                                  <span className="font-semibold">Dipasangkan dengan:</span>
                                  <span className="px-2 py-0.5 rounded bg-white font-bold border border-[#B3D1FF] inline-flex items-center gap-1">
                                    <span>{matchedRightObj.key}.</span>
                                    <RichContentRenderer content={matchedRightObj.text} inline />
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* 3E. ISIAN SINGKAT (SHORT_ANSWER) */}
                {currentQ.type === 'SHORT_ANSWER' && (
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold text-[#1A1C1E] block">
                      Ketikkan Jawaban Singkat Anda:
                    </label>
                    <input
                      type="text"
                      value={answers[currentQ.id] || ''}
                      onChange={e => handleTextChange(currentQ.id, e.target.value)}
                      onBlur={() => handleTextBlur(currentQ.id)}
                      placeholder="Tuliskan jawaban singkat di sini..."
                      className="w-full px-4 py-3 border border-[#CED4DA] rounded-xl text-sm font-semibold outline-none focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/20 text-[#1A1C1E] bg-white shadow-2xs transition-all"
                    />
                    <div className="flex items-center gap-1.5 text-[11px] text-[#6C757D]">
                      <Info className="w-3.5 h-3.5 text-[#0052CC]" />
                      <span>Jawaban otomatis tersimpan saat Anda berpindah soal atau menekan Enter.</span>
                    </div>
                  </div>
                )}

                {/* 3F. ESSAY / URAIAN (ESSAY) */}
                {currentQ.type === 'ESSAY' && (
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold text-[#1A1C1E] block">
                      Tuliskan Lembar Jawaban Uraian Anda:
                    </label>
                    <textarea
                      rows={7}
                      value={answers[currentQ.id] || ''}
                      onChange={e => handleTextChange(currentQ.id, e.target.value)}
                      onBlur={() => handleTextBlur(currentQ.id)}
                      placeholder="Tuliskan uraian penjelasan atau langkah penyelesaian secara lengkap dan terstruktur..."
                      className="w-full p-4 border border-[#CED4DA] rounded-xl text-sm outline-none focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/20 text-[#1A1C1E] bg-white shadow-2xs transition-all"
                    />
                    <div className="flex flex-wrap justify-between items-center text-[11px] text-[#6C757D] gap-2">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Jawaban otomatis tersimpan di server.</span>
                      </span>
                      <span className="font-medium bg-[#F1F3F5] px-2.5 py-0.5 rounded-full border border-[#DEE2E6]">
                        {(answers[currentQ.id] || '').trim().split(/\s+/).filter(Boolean).length} kata
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-[#DEE2E6] rounded-xl p-12 text-center text-[#6C757D]">
                Soal tidak dapat ditemukan.
              </div>
            )}
          </div>

          {/* ----------------------------------------------------
              NAVIGASI SOAL BAWAH (Sebelumnya, Ragu-Ragu, Selanjutnya)
          ---------------------------------------------------- */}
          <div className="max-w-3xl mx-auto w-full pt-6 pb-2">
            <div className="flex items-center justify-between gap-3">
              {/* Tombol Sebelumnya */}
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                className="px-4 sm:px-5 py-2.5 rounded-xl border border-[#CED4DA] bg-white hover:bg-[#F8F9FA] text-[#495057] font-semibold text-xs flex items-center gap-2 disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden xs:inline">Sebelumnya</span>
              </button>

              {/* Tombol Ragu-Ragu (Kuning / Oranye) */}
              {currentQ && (
                <button
                  type="button"
                  onClick={() => toggleDoubt(currentQ.id)}
                  className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all cursor-pointer shadow-2xs ${
                    doubts[currentQ.id]
                      ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-300'
                      : 'bg-[#FFF8E1] text-amber-800 border-amber-300 hover:bg-[#FEF0C7]'
                  }`}
                >
                  <Flag className="w-4 h-4" />
                  <span>{doubts[currentQ.id] ? 'Tandai Yakin' : 'Ragu-Ragu'}</span>
                </button>
              )}

              {/* Tombol Selanjutnya / Selesai */}
              {currentIndex === questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setSubmitModalStep(1)}
                  className="px-5 sm:px-6 py-2.5 rounded-xl bg-[#DC3545] hover:bg-[#C82333] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <span>Selesai Ujian</span>
                  <Send className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  className="px-5 sm:px-6 py-2.5 rounded-xl bg-[#0052CC] hover:bg-[#0047B3] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <span className="hidden xs:inline">Selanjutnya</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </main>

        {/* ----------------------------------------------------
            DESKTOP SIDEBAR: PAPAN NAVIGASI GRID (Fitur 3)
        ---------------------------------------------------- */}
        <aside className="hidden lg:flex bg-white border-l border-[#DEE2E6] p-5 flex-col justify-between overflow-y-auto z-20">
          <div className="space-y-4">
            {/* Header Papan Navigasi */}
            <div className="flex items-center justify-between pb-3 border-b border-[#DEE2E6]">
              <div>
                <h3 className="text-xs font-bold text-[#1A1C1E] uppercase tracking-wider">
                  Nomor Soal
                </h3>
                <p className="text-[11px] text-[#6C757D]">
                  {answeredCount} dari {questions.length} terjawab
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#0052CC] bg-[#E7F0FF] px-2.5 py-1 rounded-md border border-[#B3D1FF]">
                {Math.round((answeredCount / (questions.length || 1)) * 100)}%
              </span>
            </div>

            {/* Quick Filter Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#F1F3F5] rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setGridFilter('all')}
                className={`py-1 rounded text-center transition-colors cursor-pointer ${
                  gridFilter === 'all' ? 'bg-white text-[#1A1C1E] shadow-2xs' : 'text-[#6C757D]'
                }`}
              >
                Semua ({questions.length})
              </button>
              <button
                type="button"
                onClick={() => setGridFilter('unanswered')}
                className={`py-1 rounded text-center transition-colors cursor-pointer ${
                  gridFilter === 'unanswered' ? 'bg-white text-[#DC3545] shadow-2xs' : 'text-[#6C757D]'
                }`}
              >
                Kosong ({unansweredCount})
              </button>
              <button
                type="button"
                onClick={() => setGridFilter('doubt')}
                className={`py-1 rounded text-center transition-colors cursor-pointer ${
                  gridFilter === 'doubt' ? 'bg-white text-amber-700 shadow-2xs' : 'text-[#6C757D]'
                }`}
              >
                Ragu ({doubtCount})
              </button>
            </div>

            {/* Status Legend (3 Warna Standar: Belum, Sudah, Ragu-ragu) */}
            <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold py-1">
              <div className="flex items-center gap-1.5 text-[#495057]">
                <span className="w-3.5 h-3.5 rounded bg-[#F8F9FA] border border-[#CED4DA]"></span>
                <span>Belum</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#0052CC]">
                <span className="w-3.5 h-3.5 rounded bg-[#0052CC]"></span>
                <span>Sudah</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-700">
                <span className="w-3.5 h-3.5 rounded bg-amber-500"></span>
                <span>Ragu-Ragu</span>
              </div>
            </div>

            {/* Question Grid Numbers */}
            <div className="grid grid-cols-5 gap-2 max-h-[46vh] overflow-y-auto pr-1">
              {displayedQuestionIndices.map(({ q, index }) => {
                const isCurrent = index === currentIndex;
                const isAns = Boolean(String(answers[q.id] || '').trim());
                const isDoubt = Boolean(doubts[q.id]);

                // Determine styling based on CBT standards
                let btnStyle = 'bg-[#F8F9FA] text-[#495057] border-[#CED4DA] hover:border-[#0052CC] hover:bg-[#E9ECEF]';
                if (isDoubt) {
                  btnStyle = 'bg-amber-500 text-white border-amber-600 shadow-2xs font-bold';
                } else if (isAns) {
                  btnStyle = 'bg-[#0052CC] text-white border-[#0052CC] shadow-2xs font-bold';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className={`h-10 rounded-xl border text-xs flex flex-col items-center justify-center relative transition-all cursor-pointer ${btnStyle} ${
                      isCurrent ? 'ring-3 ring-[#0052CC]/40 scale-105 z-10' : ''
                    }`}
                  >
                    <span>{index + 1}</span>
                    {isDoubt && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Info Box */}
            <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#DEE2E6] text-[11px] text-[#495057] space-y-1">
              <div className="font-bold text-[#1A1C1E] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#0052CC]" />
                <span>Integritas Ujian Aktif:</span>
              </div>
              <p className="leading-snug text-[#6C757D]">
                Sistem mendeteksi perpindahan tab & aplikasi. Kerjakan ujian dengan jujur.
              </p>
            </div>
          </div>

          {/* Selesai Ujian Button */}
          <div className="pt-4 border-t border-[#DEE2E6]">
            <button
              type="button"
              onClick={() => setSubmitModalStep(1)}
              className="w-full py-3 px-4 rounded-xl bg-[#DC3545] hover:bg-[#C82333] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Selesai & Kumpulkan Ujian</span>
            </button>
          </div>
        </aside>
      </div>

      {/* ----------------------------------------------------
          MOBILE DRAWER: PAPAN NAVIGASI
      ---------------------------------------------------- */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileNavOpen(false)}
          ></div>
          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#DEE2E6]">
                <h3 className="text-xs font-bold text-[#1A1C1E] uppercase tracking-wider">
                  Papan Soal Ujian
                </h3>
                <button
                  type="button"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="p-1.5 rounded-md hover:bg-[#F1F3F5] text-[#6C757D] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Info */}
              <div className="p-3 bg-[#F8F9FA] rounded-xl border border-[#DEE2E6] text-xs flex justify-between items-center">
                <span>Terjawab: <b>{answeredCount}</b> / {questions.length}</span>
                <span>Ragu: <b className="text-amber-600">{doubtCount}</b></span>
              </div>

              {/* Question Number Grid */}
              <div className="grid grid-cols-5 gap-2 max-h-[55vh] overflow-y-auto pr-1">
                {questions.map((q: any, i: number) => {
                  const isCurrent = i === currentIndex;
                  const isAns = Boolean(String(answers[q.id] || '').trim());
                  const isDoubt = Boolean(doubts[q.id]);

                  let btnStyle = 'bg-[#F8F9FA] text-[#495057] border-[#CED4DA]';
                  if (isDoubt) btnStyle = 'bg-amber-500 text-white border-amber-600 font-bold';
                  else if (isAns) btnStyle = 'bg-[#0052CC] text-white border-[#0052CC] font-bold';

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setCurrentIndex(i);
                        setIsMobileNavOpen(false);
                      }}
                      className={`h-10 rounded-xl border text-xs flex items-center justify-center transition-all cursor-pointer ${btnStyle} ${
                        isCurrent ? 'ring-3 ring-[#0052CC]/40 scale-105 font-bold' : ''
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-[#DEE2E6]">
              <button
                type="button"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  setSubmitModalStep(1);
                }}
                className="w-full py-3 rounded-xl bg-[#DC3545] hover:bg-[#C82333] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Selesai & Kumpulkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL TEGURAN LANGSUNG PENGAWAS (BROADCAST REALTIME)
      ---------------------------------------------------- */}
      {supervisorAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl border-2 border-amber-500 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 grid place-items-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                Peringatan Langsung Pengawas CBT
              </span>
              <h3 className="text-lg font-bold text-[#1A1C1E] pt-2">
                Pesan dari: {supervisorAlert.teacherName}
              </h3>
              <p className="text-xs sm:text-sm text-[#333] leading-relaxed bg-amber-50/80 p-4 rounded-xl border border-amber-200 font-medium">
                "{supervisorAlert.message}"
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSupervisorAlert(null)}
              className="w-full py-3 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Saya Mengerti & Lanjutkan Ujian
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL LOCKDOWN VIOLATION ALERT (Fitur 2)
      ---------------------------------------------------- */}
      {activeViolationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl border-2 border-red-500 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-red-100 text-[#DC3545] grid place-items-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#DC3545] bg-red-50 px-3 py-1 rounded-full border border-red-200">
                Peringatan Pelanggaran Aturan Ujian
              </span>
              <h3 className="text-xl font-bold text-[#1A1C1E] pt-2">
                Terdeteksi Pelanggaran Sistem!
              </h3>
              <p className="text-xs sm:text-sm text-[#495057] leading-relaxed">
                {activeViolationModal.reason}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FFF5F5] border border-red-200 text-xs text-left space-y-2">
              <div className="flex justify-between items-center text-red-900 font-bold">
                <span>Peringatan Pelanggaran:</span>
                <span className="text-base font-mono">
                  {activeViolationModal.count} / {activeViolationModal.max}
                </span>
              </div>
              <p className="text-[11px] text-red-700 leading-snug">
                Peringatan: Jika Anda melakukan pelanggaran hingga batas maksimal ({activeViolationModal.max} kali), sistem akan <b>otomatis mengakhiri ujian dan mengirimkan jawaban Anda apa adanya</b>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveViolationModal(null)}
              className="w-full py-3 px-6 rounded-xl bg-[#DC3545] hover:bg-[#C82333] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Saya Mengerti & Kembali Mengerjakan Ujian
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL SELESAI UJIAN: KONFIRMASI BERLAPIS (Fitur 4)
      ---------------------------------------------------- */}
      {submitModalStep !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl border border-[#DEE2E6] space-y-6">
            {/* Step 1: Summary of Answers, Doubts & Unanswered */}
            {submitModalStep === 1 && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-[#DEE2E6]">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF7E0] text-[#B06000] grid place-items-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#1A1C1E]">
                      Konfirmasi Penyelesaian Ujian
                    </h3>
                    <p className="text-xs text-[#6C757D]">
                      Tahap 1 dari 2: Verifikasi status lembar jawaban Anda
                    </p>
                  </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-3.5 rounded-xl bg-[#E7F0FF] border border-[#B3D1FF]">
                    <div className="text-xl font-bold font-mono text-[#0052CC]">{answeredCount}</div>
                    <div className="text-[11px] font-semibold text-[#0052CC] mt-0.5">Sudah Terjawab</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FFF8E1] border border-amber-300">
                    <div className="text-xl font-bold font-mono text-amber-700">{doubtCount}</div>
                    <div className="text-[11px] font-semibold text-amber-700 mt-0.5">Masih Ragu</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FCE8E6] border border-red-300">
                    <div className="text-xl font-bold font-mono text-[#DC3545]">{unansweredCount}</div>
                    <div className="text-[11px] font-semibold text-[#DC3545] mt-0.5">Belum Dijawab</div>
                  </div>
                </div>

                {/* Warning if there are unanswered or doubt questions */}
                {(unansweredCount > 0 || doubtCount > 0) && (
                  <div className="p-4 rounded-xl bg-[#FFF9E6] border border-amber-300 text-xs text-amber-900 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Perhatian Sebelum Mengirim!</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-800">
                      Masih ada <b>{unansweredCount} butir soal yang belum dijawab</b> dan{' '}
                      <b>{doubtCount} butir soal yang masih ditandai ragu-ragu</b>. Soal yang kosong tidak akan mendapatkan poin.
                    </p>
                    <button
                      type="button"
                      onClick={jumpToFirstProblematic}
                      className="text-xs font-bold text-[#0052CC] hover:underline pt-1 inline-block cursor-pointer"
                    >
                      ➔ Periksa dan Lengkapi Soal Tersebut Sekarang
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSubmitModalStep(null)}
                    className="px-4 py-2.5 rounded-xl border border-[#CED4DA] text-[#495057] font-semibold text-xs hover:bg-[#F8F9FA] transition-colors cursor-pointer"
                  >
                    Kembali Mengerjakan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAgreeTerms(false);
                      setSubmitModalStep(2);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#0052CC] hover:bg-[#0047B3] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Lanjutkan Konfirmasi</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Final Statement & Submit */}
            {submitModalStep === 2 && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-[#DEE2E6]">
                  <div className="w-10 h-10 rounded-xl bg-[#FCE8E6] text-[#DC3545] grid place-items-center shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#1A1C1E]">
                      Pernyataan Kejujuran & Pengiriman Akhir
                    </h3>
                    <p className="text-xs text-[#6C757D]">
                      Tahap 2 dari 2: Verifikasi integritas ujian siswa
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#DEE2E6] text-xs text-[#495057] space-y-2 leading-relaxed">
                  <p>
                    Setelah Anda menekan tombol <b>"Ya, Kirim Jawaban Sekarang"</b>, sesi ujian akan ditutup secara permanen dan Anda tidak dapat kembali mengubah jawaban.
                  </p>
                </div>

                {/* Integrity Checkbox */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-[#CED4DA] bg-white hover:bg-[#F8F9FA] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={e => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-[#0052CC] rounded border-[#CED4DA] focus:ring-[#0052CC] cursor-pointer"
                  />
                  <span className="text-xs font-medium text-[#1A1C1E] leading-snug">
                    Saya menyatakan telah memeriksa seluruh jawaban dengan seksama dan siap menyelesaikan ujian ini atas kesadaran penuh.
                  </span>
                </label>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setSubmitModalStep(1)}
                    className="px-4 py-2.5 rounded-xl border border-[#CED4DA] text-[#495057] font-semibold text-xs hover:bg-[#F8F9FA] transition-colors cursor-pointer"
                  >
                    Kembali ke Tahap 1
                  </button>
                  <button
                    type="button"
                    disabled={!agreeTerms || submitting}
                    onClick={handleConfirmFinalSubmit}
                    className="px-6 py-2.5 rounded-xl bg-[#DC3545] hover:bg-[#C82333] text-white font-bold text-xs shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? 'Mengirim Jawaban...' : 'Ya, Kirim Jawaban Sekarang'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Batalkan / Keluar Sementara dari Ujian (Anti salah klik) */}
      {isCancelExitModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Batalkan Pengerjaan / Keluar?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Konfirmasi keluar lembar ujian
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5 leading-relaxed">
              <p>
                Jika Anda tidak sengaja membuka ujian atau perlu keluar sementara:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700">
                <li>Seluruh jawaban yang telah Anda isi <b>tetap tersimpan aman</b>.</li>
                <li>Ujian <b>BELUM</b> diselesaikan secara final.</li>
                <li>Anda dapat melanjutkan kembali selama jadwal ujian masih dibuka.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelExitModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Lanjutkan Mengerjakan
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const answeredCount = Object.keys(answers).length;
                    const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
                    await saveExamProgress(token, attemptId, answers, progress, violations);
                  } catch {}
                  setIsCancelExitModalOpen(false);
                  onExitExam();
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Simpan & Keluar ke Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamTakerView;
