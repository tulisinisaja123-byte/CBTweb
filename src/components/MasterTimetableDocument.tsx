import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TimetableDay, SchoolSettings, TeacherMasterItem } from '../types';
import {
  MA_CIKARAMAS_CLASSES,
  MA_CIKARAMAS_TEACHERS,
  MA_CIKARAMAS_KOKULIKULER,
  lookupSubjectByCode,
  lookupTeacherByCode,
  getTeacherLetterFromCode,
  deriveCodesForTeacher,
  MA_CIKARAMAS_TIMETABLE,
  MA_CIKARAMAS_TIMETABLE_6DAYS,
  MA_CIKARAMAS_SUBJECTS,
  validateSlotTeacherAntiClash,
  checkTimetableConflicts
} from '../data/curriculumData';
import {
  getTimetable,
  saveTimetable,
  resetTimetable,
  updateTimetableSlot,
  updateTimetableActivity,
  toggleTimetableSpecialSlot,
  updateTimetableRowTime,
  getTimetableRows,
  saveTimetableRows,
  getKokulikulerData,
  saveKokulikulerData,
  KokulikulerItem,
  getTeacherRoster,
  syncTeacherAssignmentsFromTimetable,
  safeStorageGet,
  getSchoolSettings,
  saveSettings
} from '../services/lmsStorage';
import {
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  Save,
  X,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Info,
  ChevronRight,
  Layers,
  Settings2,
  Columns,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calendar
} from 'lucide-react';

export interface SynchronizedRow {
  index: number;
  periodLabel: string;
  time: string;
  type: 'pre' | 'lesson' | 'break' | 'post';
  name?: string;
  seninText?: string;
  selasaText?: string;
  rabuText?: string;
  kamisText?: string;
  jumatText?: string;
  sabtuText?: string;
}

export const SYNCHRONIZED_ROWS_DEFAULT: SynchronizedRow[] = [
  {
    index: 0,
    periodLabel: '-',
    time: '06.45 - 07.10',
    type: 'pre',
    seninText: 'Persiapan Upacara',
    selasaText: "Do'a / Tadarus Bersama",
    rabuText: "Do'a / Tadarus Bersama",
    kamisText: 'Senam Bersama',
    jumatText: "Do'a / Tadarus Bersama",
    sabtuText: "Do'a / Tadarus Bersama"
  },
  {
    index: 1,
    periodLabel: '1',
    time: '07.10 - 07.45',
    type: 'lesson',
    seninText: 'Upacara Bendera',
    jumatText: 'Tausyiah / Pengajian Bersama'
  },
  {
    index: 2,
    periodLabel: '2',
    time: '07.45 - 08.20',
    type: 'lesson'
  },
  {
    index: 3,
    periodLabel: '3',
    time: '08.20 - 08.55',
    type: 'lesson'
  },
  {
    index: 4,
    periodLabel: '4',
    time: '08.55 - 09.30',
    type: 'lesson'
  },
  {
    index: 5,
    periodLabel: '-',
    time: '09.30 - 09.55',
    type: 'break',
    name: 'Istirahat'
  },
  {
    index: 6,
    periodLabel: '5',
    time: '09.55 - 10.30',
    type: 'lesson'
  },
  {
    index: 7,
    periodLabel: '6',
    time: '10.30 - 11.05',
    type: 'lesson'
  },
  {
    index: 8,
    periodLabel: '7',
    time: '11.05 - 11.40',
    type: 'lesson'
  },
  {
    index: 9,
    periodLabel: '8',
    time: '11.40 - 12.15',
    type: 'lesson',
    jumatText: "Sholat Jum'at & Keputrian"
  },
  {
    index: 10,
    periodLabel: '-',
    time: '12.15 - 12.40',
    type: 'break',
    name: 'Istirahat Siang & Sholat Dzuhur',
    jumatText: "Sholat Jum'at & Keputrian"
  },
  {
    index: 11,
    periodLabel: '9',
    time: '12.40 - 13.15',
    type: 'lesson'
  },
  {
    index: 12,
    periodLabel: '10',
    time: '13.15 - 13.50',
    type: 'lesson'
  },
  {
    index: 13,
    periodLabel: '11',
    time: '13.50 - 14.25',
    type: 'lesson',
    jumatText: '-',
    sabtuText: 'Evaluasi Pekanan / Kokulikuler'
  },
  {
    index: 14,
    periodLabel: '-',
    time: '14.25 - 15.00',
    type: 'post',
    seninText: 'Ekstrakulikuler',
    selasaText: 'Ekstrakulikuler',
    rabuText: 'Ekstrakulikuler',
    kamisText: 'Ekstrakulikuler',
    jumatText: 'Kepanduan HW / Pramuka',
    sabtuText: 'HW / Ekstrakulikuler Pilihan'
  }
];

export interface MasterTimetableDocumentProps {
  timetable: TimetableDay[];
  workDays?: 5 | 6;
  settings?: SchoolSettings;
  fontSize?: '6pt' | '6.5pt' | '7pt' | '7.5pt' | '8pt';
  isPrintMode?: boolean;
  onSlotClick?: (dayLabel: string, period: number, time: string, className: string, code: string) => void;
  token?: string;
  onTimetableUpdated?: (newTimetable: TimetableDay[]) => void;
  onShowToast?: (message: string) => void;
}

export const MasterTimetableDocument: React.FC<MasterTimetableDocumentProps> = ({
  timetable,
  workDays = 5,
  settings,
  fontSize = '6.5pt',
  isPrintMode = false,
  onSlotClick,
  token = '',
  onTimetableUpdated,
  onShowToast
}) => {
  // Resolve active token
  const activeToken = token || safeStorageGet('lms_token') || '';

  // Local state for rows to allow editing times and labels
  const [rows, setRows] = useState<SynchronizedRow[]>(() => {
    const stored = getTimetableRows();
    if (stored && stored.length > 0) return stored;
    return SYNCHRONIZED_ROWS_DEFAULT;
  });

  // State: Teachers roster from database
  const [teachers, setTeachers] = useState<TeacherMasterItem[]>(() => getTeacherRoster(activeToken));

  // State: Kokulikuler data from database
  const [kokulikulerData, setKokulikulerData] = useState<KokulikulerItem[]>(() => getKokulikulerData());

  // State: Fast editing mode
  const [isEditModeActive, setIsEditModeActive] = useState(true);

  // Status notification inside master table
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Modals for editing
  // 1. Edit Subject Slot
  const [slotEditModal, setSlotEditModal] = useState<{
    isOpen: boolean;
    dayKey: string;
    dayLabel: string;
    periodNumber: number;
    time: string;
    className: string;
    currentCode: string;
    rowIndex: number;
  } | null>(null);
  const [slotCodeInput, setSlotCodeInput] = useState('');
  const [slotClashWarning, setSlotClashWarning] = useState<string | null>(null);

  // 2. Edit Time Modal
  const [timeEditModal, setTimeEditModal] = useState<{
    isOpen: boolean;
    rowIndex: number;
    currentTime: string;
    periodLabel: string;
  } | null>(null);
  const [timeInput, setTimeInput] = useState('');

  // 3. Edit Jam Modal
  const [jamEditModal, setJamEditModal] = useState<{
    isOpen: boolean;
    rowIndex: number;
    currentPeriodLabel: string;
  } | null>(null);
  const [jamInput, setJamInput] = useState('');

  // 4. Edit Activity (Pre, Break, Post, Special)
  const [activityEditModal, setActivityEditModal] = useState<{
    isOpen: boolean;
    dayKey: string;
    dayLabel: string;
    type: 'pre' | 'break' | 'post' | 'special';
    title: string;
    text: string;
    periodNumber?: number;
    time?: string;
    isSpecial?: boolean;
  } | null>(null);
  const [activityTextInput, setActivityTextInput] = useState('');

  // 5. Edit Kokulikuler Modal
  const [isKokulikulerModalOpen, setIsKokulikulerModalOpen] = useState(false);
  const [kokulikulerEditing, setKokulikulerEditing] = useState<KokulikulerItem[]>([]);

  // 6. Edit Principal / Header Settings Modal
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
  const [principalTitleInput, setPrincipalTitleInput] = useState(settings?.PRINCIPAL_TITLE || 'Kepala Madrasah');
  const [principalNameInput, setPrincipalNameInput] = useState(settings?.PRINCIPAL_NAME || 'AI SUKAESIH, S.Pd');
  const [principalNbmInput, setPrincipalNbmInput] = useState(settings?.PRINCIPAL_NIP || '1281201');
  const [schoolYearInput, setSchoolYearInput] = useState(settings?.SCHOOL_YEAR || '2026/2027');
  const [establishedDateInput, setEstablishedDateInput] = useState('14 Juli 2026');

  // Sync with settings prop changes
  useEffect(() => {
    if (settings) {
      if (settings.PRINCIPAL_TITLE) setPrincipalTitleInput(settings.PRINCIPAL_TITLE);
      if (settings.PRINCIPAL_NAME) setPrincipalNameInput(settings.PRINCIPAL_NAME);
      if (settings.PRINCIPAL_NIP) setPrincipalNbmInput(settings.PRINCIPAL_NIP);
      if (settings.SCHOOL_YEAR) setSchoolYearInput(settings.SCHOOL_YEAR);
    }
  }, [settings]);

  // Classes list
  const classList = useMemo(() => MA_CIKARAMAS_CLASSES.map(c => c.name), []);
  const schoolName = settings?.SCHOOL_NAME || 'MA MUHAMMADIYAH CIKARAMAS';
  const academicYear = schoolYearInput;
  const principalTitle = principalTitleInput;
  const principalName = principalNameInput;
  const principalNbm = principalNbmInput;

  // Listen for storage changes
  useEffect(() => {
    const handleSync = () => {
      setTeachers(getTeacherRoster(activeToken));
      setKokulikulerData(getKokulikulerData());
      const storedRows = getTimetableRows();
      if (storedRows && storedRows.length > 0) setRows(storedRows);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('LMS_TIMETABLE_CHANGED', handleSync);
      window.addEventListener('LMS_TEACHER_DATA_CHANGED', handleSync);
      return () => {
        window.removeEventListener('LMS_TIMETABLE_CHANGED', handleSync);
        window.removeEventListener('LMS_TEACHER_DATA_CHANGED', handleSync);
      };
    }
  }, [activeToken]);

  // Flash save notification
  const triggerSaveNotification = (msg: string) => {
    setSaveStatus(msg);
    onShowToast?.(msg);
    setTimeout(() => {
      setSaveStatus(null);
    }, 3500);
  };

  // Find day objects safely
  const getDay = (key: string) => timetable.find(d => d.day.toUpperCase() === key.toUpperCase());
  const seninDay = getDay('SENIN');
  const selasaDay = getDay('SELASA');
  const rabuDay = getDay('RABU');
  const kamisDay = getDay('KAMIS');
  const jumatDay = getDay('JUMAT');
  const sabtuDay = getDay('SABTU');

  // Helper to extract code from day slots by period or time
  const getCode = (dayObj: TimetableDay | undefined, row: SynchronizedRow, className: string): string => {
    if (!dayObj) return '-';
    // Match by period or time
    const slot = dayObj.slots.find(s => {
      if (row.type === 'lesson' && !s.isBreak && !s.isSpecial) {
        return String(s.period) === row.periodLabel;
      }
      return s.time === row.time;
    });
    if (!slot || !slot.subjectCodes) return '-';
    return slot.subjectCodes[className] || '-';
  };

  // Compute live teacher hours map from active timetable
  const teacherHoursMap = useMemo(() => {
    const map: Record<string, number> = {};
    timetable.forEach(day => {
      day.slots.forEach(slot => {
        if (!slot.isBreak && !slot.isSpecial && slot.subjectCodes) {
          Object.values(slot.subjectCodes).forEach(code => {
            if (code && code !== '-' && code !== 'UPACARA' && code !== 'TAUSYIAH') {
              const letter = getTeacherLetterFromCode(code);
              if (letter) {
                map[letter] = (map[letter] || 0) + 1;
              }
            }
          });
        }
      });
    });
    return map;
  }, [timetable]);

  // Quick chips for codes
  const availableSubjectCodes = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach(t => {
      const derived = deriveCodesForTeacher(t.code, t.subjectsSummary?.length || 1);
      derived.forEach(c => set.add(c));
    });
    set.add('KO'); // Kokulikuler
    return Array.from(set).sort();
  }, [teachers]);

  // --------------------------------------------------------------------------
  // HANDLERS: Slot Editing
  // --------------------------------------------------------------------------
  const openSlotEditModal = (dayKey: string, dayLabel: string, periodNumber: number, time: string, className: string, currentCode: string, rowIndex: number) => {
    if (isPrintMode) return;
    setSlotEditModal({
      isOpen: true,
      dayKey,
      dayLabel,
      periodNumber,
      time,
      className,
      currentCode: currentCode === '-' ? '' : currentCode,
      rowIndex
    });
    setSlotCodeInput(currentCode === '-' ? '' : currentCode);

    // Initial check clash
    const check = validateSlotTeacherAntiClash(timetable, dayKey, periodNumber, className, currentCode);
    if (!check.isValid && check.conflictWith) {
      setSlotClashWarning(
        `PERINGATAN BENTROK: Guru ${check.conflictWith.teacherName} (${check.conflictWith.subjectCode}) sudah mengajar di kelas ${check.conflictWith.className} pada jam ini!`
      );
    } else {
      setSlotClashWarning(null);
    }
  };

  const handleSlotCodeChange = (code: string) => {
    const clean = code.toUpperCase();
    setSlotCodeInput(clean);
    if (!slotEditModal) return;

    const check = validateSlotTeacherAntiClash(timetable, slotEditModal.dayKey, slotEditModal.periodNumber, slotEditModal.className, clean);
    if (!check.isValid && check.conflictWith) {
      setSlotClashWarning(
        `PERINGATAN BENTROK: Guru ${check.conflictWith.teacherName} (${check.conflictWith.subjectCode}) sudah mengajar di kelas ${check.conflictWith.className} pada jam ini!`
      );
    } else {
      setSlotClashWarning(null);
    }
  };

  const handleSaveSlot = (andNext = false) => {
    if (!slotEditModal) return;
    try {
      const cleanCode = slotCodeInput.trim().toUpperCase() || '-';
      const res = updateTimetableSlot(
        activeToken,
        slotEditModal.dayKey,
        slotEditModal.periodNumber,
        slotEditModal.className,
        cleanCode
      );

      onTimetableUpdated?.(res.timetable);
      triggerSaveNotification(`Tersimpan ke database: ${slotEditModal.dayLabel} Jam ${slotEditModal.periodNumber} ${slotEditModal.className} = ${cleanCode}`);

      if (andNext) {
        // Move to next class in row
        const currentClassIdx = classList.indexOf(slotEditModal.className);
        if (currentClassIdx >= 0 && currentClassIdx < classList.length - 1) {
          const nextClass = classList[currentClassIdx + 1];
          const targetDay = res.timetable.find(d => d.day.toUpperCase() === slotEditModal.dayKey.toUpperCase());
          const slot = targetDay?.slots.find(s => s.period === slotEditModal.periodNumber);
          const nextCode = slot?.subjectCodes?.[nextClass] || '';

          openSlotEditModal(
            slotEditModal.dayKey,
            slotEditModal.dayLabel,
            slotEditModal.periodNumber,
            slotEditModal.time,
            nextClass,
            nextCode,
            slotEditModal.rowIndex
          );
          return;
        }
      }

      setSlotEditModal(null);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan slot');
    }
  };

  // --------------------------------------------------------------------------
  // HANDLERS: Time Editing
  // --------------------------------------------------------------------------
  const openTimeEditModal = (rowIndex: number, currentTime: string, periodLabel: string) => {
    if (isPrintMode) return;
    setTimeEditModal({
      isOpen: true,
      rowIndex,
      currentTime,
      periodLabel
    });
    setTimeInput(currentTime);
  };

  const handleSaveTime = () => {
    if (!timeEditModal) return;
    try {
      const cleanTime = timeInput.trim();
      if (!cleanTime) {
        alert('Format waktu tidak boleh kosong.');
        return;
      }
      const res = updateTimetableRowTime(activeToken, timeEditModal.rowIndex, cleanTime, timeEditModal.periodLabel);
      if (res.rows) {
        setRows([...res.rows]);
      }
      onTimetableUpdated?.(res.timetable);
      triggerSaveNotification(`Waktu baris diperbarui ke "${cleanTime}" dan disinkronkan ke seluruh hari.`);
      setTimeEditModal(null);
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui waktu baris');
    }
  };

  // --------------------------------------------------------------------------
  // HANDLERS: Activity Editing (Pre, Break, Post, Special)
  // --------------------------------------------------------------------------
  const openActivityEditModal = (
    dayKey: string,
    dayLabel: string,
    type: 'pre' | 'break' | 'post' | 'special',
    title: string,
    currentText: string,
    periodNumber?: number,
    time?: string,
    isSpecial?: boolean
  ) => {
    if (isPrintMode) return;
    setActivityEditModal({
      isOpen: true,
      dayKey,
      dayLabel,
      type,
      title,
      text: currentText,
      periodNumber,
      time,
      isSpecial: isSpecial ?? true
    });
    setActivityTextInput(currentText);
  };

  const handleSaveActivity = () => {
    if (!activityEditModal) return;
    try {
      const cleanText = activityTextInput.trim();
      const res = updateTimetableActivity(
        activeToken,
        activityEditModal.dayKey,
        activityEditModal.type,
        cleanText,
        activityEditModal.periodNumber,
        activityEditModal.time
      );

      // Also update in rows if applicable
      const updatedRows = [...rows];
      const targetRow = updatedRows.find(r => {
        if (activityEditModal.type === 'pre') return r.type === 'pre';
        if (activityEditModal.type === 'post') return r.type === 'post';
        if (activityEditModal.type === 'break') return r.time === activityEditModal.time;
        return false;
      });

      if (targetRow) {
        const key = activityEditModal.dayKey.toLowerCase();
        if (key === 'senin') targetRow.seninText = cleanText;
        else if (key === 'selasa') targetRow.selasaText = cleanText;
        else if (key === 'rabu') targetRow.rabuText = cleanText;
        else if (key === 'kamis') targetRow.kamisText = cleanText;
        else if (key === 'jumat') targetRow.jumatText = cleanText;
        else if (key === 'sabtu') targetRow.sabtuText = cleanText;
        if (activityEditModal.type === 'break') targetRow.name = cleanText;
        saveTimetableRows(activeToken, updatedRows);
        setRows(updatedRows);
      }

      onTimetableUpdated?.(res.timetable);
      triggerSaveNotification(`Kegiatan ${activityEditModal.dayLabel} diperbarui: "${cleanText}"`);
      setActivityEditModal(null);
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui kegiatan');
    }
  };

  // Toggle between Special unified colSpan vs Individual class columns
  const handleToggleSpecialColspan = () => {
    if (!activityEditModal || activityEditModal.periodNumber === undefined) return;
    try {
      const newSpecialState = !activityEditModal.isSpecial;
      const res = toggleTimetableSpecialSlot(
        activeToken,
        activityEditModal.dayKey,
        activityEditModal.periodNumber,
        newSpecialState,
        activityTextInput.trim()
      );
      onTimetableUpdated?.(res.timetable);
      triggerSaveNotification(
        newSpecialState
          ? `Diubah ke kegiatan bersama (Colspan satu baris)`
          : `Dipecah menjadi kolom per-kelas (Setiap kelas X.1 s/d XII.2 dapat diisi mapel)`
      );
      setActivityEditModal(null);
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah mode baris');
    }
  };

  // --------------------------------------------------------------------------
  // HANDLERS: Reset & Sync
  // --------------------------------------------------------------------------
  const handleResetToDefault = () => {
    let confirmed = true;
    try {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        confirmed = window.confirm('Kembalikan jadwal dan tabel ke jadwal master resmi MA Muhammadiyah Cikaramas?');
      }
    } catch {
      confirmed = true;
    }
    if (confirmed) {
      const res = resetTimetable(activeToken, workDays);
      setRows(SYNCHRONIZED_ROWS_DEFAULT);
      saveTimetableRows(activeToken, SYNCHRONIZED_ROWS_DEFAULT);
      onTimetableUpdated?.(res.timetable);
      triggerSaveNotification('Jadwal master resmi berhasil dipulihkan!');
    }
  };

  const handleSyncWorkloads = () => {
    try {
      syncTeacherAssignmentsFromTimetable(activeToken);
      triggerSaveNotification('Beban jam mengajar dan SK guru berhasil disinkronkan otomatis!');
    } catch (err: any) {
      triggerSaveNotification('Kendala: ' + (err.message || 'Gagal menyinkronkan beban guru'));
    }
  };

  // --------------------------------------------------------------------------
  // Resolved info for current slot being edited
  // --------------------------------------------------------------------------
  const resolvedSlotInfo = useMemo(() => {
    if (!slotCodeInput) return null;
    const sub = lookupSubjectByCode(slotCodeInput);
    const teacherLetter = getTeacherLetterFromCode(slotCodeInput);
    const teacher = lookupTeacherByCode(teacherLetter);
    return { sub, teacher, teacherLetter };
  }, [slotCodeInput]);

  return (
    <div
      className={`master-document-root text-black bg-white select-none ${isPrintMode ? 'w-full' : 'p-3 sm:p-5 shadow-lg border border-gray-300 rounded-sm'}`}
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize,
        lineHeight: 1.2
      }}
    >
      {/* ACTION & SYNC TOOLBAR (Hidden in Print Mode) */}
      {!isPrintMode && (
        <div className="mb-3 p-2.5 bg-slate-50 border border-slate-200 rounded-md flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 text-xs text-slate-700">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Tersinkronisasi Database
            </span>
            <button
              type="button"
              onClick={() => setIsEditModeActive(!isEditModeActive)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-bold transition-all ${
                isEditModeActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {isEditModeActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              <span>Mode Edit Langsung: {isEditModeActive ? 'AKTIF' : 'NON-AKTIF'}</span>
            </button>
            <span className="text-[11px] text-gray-500 hidden lg:inline">
              💡 Klik kotak manapun: Jam, Waktu, Kegiatan, atau Mapel Kelas untuk mengedit langsung!
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {saveStatus && (
              <span className="text-emerald-700 font-semibold text-xs animate-pulse bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ✅ {saveStatus}
              </span>
            )}
            <button
              type="button"
              onClick={handleSyncWorkloads}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 font-bold text-slate-700 transition-colors text-[11px]"
              title="Perbarui perhitungan jam mengajar guru otomatis"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Sinkronkan Beban Guru</span>
            </button>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-slate-600 hover:text-rose-700 font-bold transition-colors text-[11px]"
              title="Reset ke format resmi MA Muhammadiyah Cikaramas"
            >
              <Trash2 className="w-3 h-3 text-rose-500" />
              <span>Reset Default</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. KOP DOKUMEN RESMI SESUAI GAMBAR ASLI */}
      <div
        className="text-center mb-1 pb-1 border-b border-black cursor-pointer hover:bg-slate-50/80 transition-colors relative group"
        onClick={() => !isPrintMode && setIsHeaderModalOpen(true)}
        title={!isPrintMode ? "Klik untuk mengedit Kepala Madrasah, NBM, Tahun Ajaran" : undefined}
      >
        {!isPrintMode && (
          <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 text-blue-700 text-[9px] px-1.5 py-0.5 rounded border border-blue-200 font-semibold flex items-center gap-1">
            <Edit2 className="w-2.5 h-2.5" /> Edit Kop
          </div>
        )}
        <h1 className="font-extrabold uppercase tracking-wider text-[11pt] sm:text-[13pt] leading-tight m-0">
          JADWAL PELAJARAN TATAP MUKA
        </h1>
        <h2 className="font-extrabold uppercase text-[10pt] sm:text-[11pt] leading-tight m-0 mt-0.5">
          {schoolName}
        </h2>
        <h3 className="font-bold uppercase text-[8.5pt] sm:text-[9.5pt] leading-tight m-0 mt-0.5">
          SEMESTER 1 &amp; 2 TAHUN PELAJARAN {academicYear}
          <span className="ml-2 font-normal lowercase text-[7pt] text-gray-700">
            ({workDays} Hari Kerja)
          </span>
        </h3>
      </div>

      {/* 2. TIER ATAS (SENIN, SELASA, RABU) + DAFTAR GURU A-T (1-20) */}
      <div className="flex flex-row items-start gap-1.5 w-full mb-2">
        {/* TABEL JADWAL TIER ATAS (SENIN, SELASA, RABU) */}
        <div className="flex-1 overflow-x-auto">
          <table
            className="w-full border-collapse border border-black text-center"
            style={{ fontSize }}
          >
            <thead>
              {/* Header Baris 1: Hari */}
              <tr className="bg-gray-100 font-extrabold uppercase">
                <th
                  rowSpan={2}
                  className="border border-black px-1 py-0.5 w-[28px] text-center align-middle font-bold"
                >
                  JAM
                </th>
                <th
                  rowSpan={2}
                  className="border border-black px-1 py-0.5 w-[68px] text-center align-middle font-bold whitespace-nowrap"
                >
                  WAKTU
                </th>
                <th
                  colSpan={classList.length}
                  className="border border-black px-1 py-0.5 bg-gray-200 text-center font-black tracking-wider"
                >
                  SENIN
                </th>
                <th
                  colSpan={classList.length}
                  className="border border-black px-1 py-0.5 bg-gray-200 text-center font-black tracking-wider"
                >
                  SELASA
                </th>
                <th
                  colSpan={classList.length}
                  className="border border-black px-1 py-0.5 bg-gray-200 text-center font-black tracking-wider"
                >
                  RABU
                </th>
              </tr>
              {/* Header Baris 2: Nama-Nama Kelas (X.1 s.d XII.2) */}
              <tr className="bg-gray-100 font-extrabold">
                {/* Senin classes */}
                {classList.map(cls => (
                  <th
                    key={`senin-${cls}`}
                    className="border border-black px-0.5 py-0.5 text-center font-bold min-w-[20px]"
                  >
                    {cls}
                  </th>
                ))}
                {/* Selasa classes */}
                {classList.map(cls => (
                  <th
                    key={`selasa-${cls}`}
                    className="border border-black px-0.5 py-0.5 text-center font-bold min-w-[20px]"
                  >
                    {cls}
                  </th>
                ))}
                {/* Rabu classes */}
                {classList.map(cls => (
                  <th
                    key={`rabu-${cls}`}
                    className="border border-black px-0.5 py-0.5 text-center font-bold min-w-[20px]"
                  >
                    {cls}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => {
                const isBreak = row.type === 'break';
                const isPre = row.type === 'pre';
                const isPost = row.type === 'post';

                // Check special activities for each day on this row
                const seninSpecial = seninDay?.slots.find(s => s.period === Number(row.periodLabel) || s.time === row.time);
                const isSeninColspan = row.periodLabel === '1'
                  ? (seninSpecial?.isSpecial ?? true)
                  : Boolean(seninSpecial?.isSpecial);

                // ROW 0: PRE-ACTIVITY (06.45 - 07.10)
                if (isPre) {
                  const seninPre = seninDay?.preActivity || row.seninText || 'Persiapan Upacara';
                  const selasaPre = selasaDay?.preActivity || row.selasaText || "Do'a / Tadarus Bersama";
                  const rabuPre = rabuDay?.preActivity || row.rabuText || "Do'a / Tadarus Bersama";

                  return (
                    <tr key="top-pre" className="bg-gray-50 border-b border-black font-semibold">
                      <td
                        className="border border-black px-0.5 py-0.5 font-bold text-center cursor-pointer hover:bg-amber-100"
                        onClick={() => openTimeEditModal(rIdx, row.time, row.periodLabel)}
                        title="Klik untuk ubah label jam"
                      >
                        {row.periodLabel}
                      </td>
                      <td
                        className="border border-black px-0.5 py-0.5 font-mono text-[6pt] whitespace-nowrap text-center cursor-pointer hover:bg-amber-100"
                        onClick={() => openTimeEditModal(rIdx, row.time, row.periodLabel)}
                        title="Klik untuk ubah waktu"
                      >
                        {row.time}
                      </td>
                      <td
                        colSpan={classList.length}
                        className="border border-black px-1 py-0.5 bg-yellow-50/70 font-bold text-[6pt] uppercase tracking-wide text-center cursor-pointer hover:bg-yellow-200/80"
                        onClick={() => openActivityEditModal('SENIN', 'Senin', 'pre', 'Kegiatan Awal Senin', seninPre)}
                        title="Klik untuk ubah Kegiatan Awal Senin"
                      >
                        {seninPre}
                      </td>
                      <td
                        colSpan={classList.length}
                        className="border border-black px-1 py-0.5 bg-green-50/70 font-bold text-[6pt] uppercase tracking-wide text-center cursor-pointer hover:bg-green-200/80"
                        onClick={() => openActivityEditModal('SELASA', 'Selasa', 'pre', 'Kegiatan Awal Selasa', selasaPre)}
                        title="Klik untuk ubah Kegiatan Awal Selasa"
                      >
                        {selasaPre}
                      </td>
                      <td
                        colSpan={classList.length}
                        className="border border-black px-1 py-0.5 bg-green-50/70 font-bold text-[6pt] uppercase tracking-wide text-center cursor-pointer hover:bg-green-200/80"
                        onClick={() => openActivityEditModal('RABU', 'Rabu', 'pre', 'Kegiatan Awal Rabu', rabuPre)}
                        title="Klik untuk ubah Kegiatan Awal Rabu"
                      >
                        {rabuPre}
                      </td>
                    </tr>
                  );
                }

                // ROW ISTIRAHAT (09.30 - 09.55 & 12.15 - 12.40)
                if (isBreak) {
                  const breakTitle = row.name || 'ISTIRAHAT';
                  return (
                    <tr key={`top-break-${row.index}`} className="bg-gray-100 border-b border-black font-bold">
                      <td
                        className="border border-black px-0.5 py-0.5 text-center cursor-pointer hover:bg-amber-100"
                        onClick={() => openTimeEditModal(rIdx, row.time, row.periodLabel)}
                        title="Klik untuk ubah waktu istirahat"
                      >
                        -
                      </td>
                      <td
                        className="border border-black px-0.5 py-0.5 font-mono text-[6pt] whitespace-nowrap text-center cursor-pointer hover:bg-amber-100"
                        onClick={() => openTimeEditModal(rIdx, row.time, row.periodLabel)}
                        title="Klik untuk ubah waktu istirahat"
                      >
                        {row.time}
                      </td>
                      <td
                        colSpan={classList.length}
                        className="border border-black px-1 py-0.5 bg-gray-100 font-extrabold text-[6pt] uppercase tracking-wider text-center cursor-pointer hover:bg-amber-200"
                        onClick={() => openActivityEditModal('SENIN', 'Senin', 'break', 'Waktu Istirahat', breakTitle, undefined, row.time)}
                        title="Klik untuk ubah label istirahat"
                      >
                        ☕ {breakTitle}
                      </td>
                      <td
                        colSpan={classList.length}
                        className="border border-black px-1 py-0.5 bg-gray-100 font-extrabold text-[6pt] uppercase tracking-wider text-center cursor-pointer hover:bg-amber-200"
                        onClick={() => openActivityEditModal('SELASA', 'Selasa', 'break', 'Waktu Istirahat', breakTitle, undefined, row.time)}
                        title="Klik untuk ubah label istirahat"
                      >
                        ☕ {breakTitle}
                      </td>
                      <td
                        colSpan={classList.length}
                        className="border border-black px-1 py-0.5 bg-gray-100 font-extrabold text-[6pt] uppercase tracking-wider text-center cursor-pointer hover:bg-amber-200"
                        onClick={() => openActivityEditModal('RABU', 'Rabu', 'break', 'Waktu Istirahat', breakTitle, undefined, row.time)}
                        title="Klik untuk ubah label istirahat"
                      >
                        ☕ {breakTitle}
                      </td>
                    </tr>
                  );
                }

                // ROW POST-ACTIVITY (14.25 - 15.00: EKSTRAKULIKULER)
                if (isPost) {
                  const seninPost = seninDay?.postActivity || row.seninText || 'Ekstrakulikuler';
                  const selasaPost = selasaDay?.postActivity || row.selasaText || 'Ekstrakulikuler';
                  const rabuPost = rabuDay?.postActivity || row.rabuText || 'Ekstrakulikuler';

                  return (
                    <tr key="top-post" className="bg-gray-50 border-b border-black font-semibold">
                      <td
                        className="border border-black px-0.5 py-0.5 font-bold text-center cursor-pointer hover:bg-amber-100"
                        onClick={() => openTimeEditModal(rIdx, row.time, row.periodLabel)}
                      >
                        -
                      </td>
                      <td
                        className="border border-black px-0.5 py-0.5 font-mono text-[6pt] whitespace-nowrap text-center cursor-pointer hover:bg-amber-100"
                        onClick={() => openTimeEditModal(rIdx, row.time, row.periodLabel)}
                      >
                        {row.time}
                      </td>
                      <td
                        colSpan={classList.length}
                        className="border border-black px-1 py-0.5 bg-blue-50/70 font-bold text-[6pt] uppercase tracking-wider text-center cursor-pointer hover:bg-blue-200"
                        onClick={() => openActivityEditModal('SENIN', 'Senin', 'post', 'Kegiatan Akhir Senin', seninPost)}
                        title="Klik untuk ubah kegiatan akhir Senin"
                      >
                        {seninPost}
                      </td>
                      <td
                        colSpan={classList.length}
                        className="border border-black px-1 py-0.5 bg-blue-50/70 font-bold text-[6pt] uppercase tracking-wider text-center cursor-pointer hover:bg-blue-200"
                        onClick={() => openActivityEditModal('SELASA', 'Selasa', 'post', 'Kegiatan Akhir Selasa', selasaPost)}
                        title="Klik untuk ubah kegiatan akhir Selasa"
                      >
                        {selasaPost}
                      </td>
                      <td
                        colSpan={classList.length}
                        className="border border-black px-1 py-0.5 bg-blue-50/70 font-bold text-[6pt] uppercase tracking-wider text-center cursor-pointer hover:bg-blue-200"
                        onClick={() => openActivityEditModal('RABU', 'Rabu', 'post', 'Kegiatan Akhir Rabu', rabuPost)}
                        title="Klik untuk ubah kegiatan akhir Rabu"
                      >
                        {rabuPost}
                      </td>
                    </tr>
                  );
                }

                // LESSON ROWS (JAM 1 S/D 11)
                const pNum = Number(row.periodLabel);

                return (
                  <tr key={`top-lesson-${row.index}`} className="border-b border-black">
                    {/* JAM Column - Clickable */}
                    <td
                      className="border border-black px-0.5 py-0.5 font-bold text-center cursor-pointer hover:bg-amber-100 transition-colors"
                      onClick={() => openTimeEditModal(rIdx, row.time, row.periodLabel)}
                      title="Klik untuk ubah waktu & nomor jam"
                    >
                      {row.periodLabel}
                    </td>

                    {/* WAKTU Column - Clickable */}
                    <td
                      className="border border-black px-0.5 py-0.5 font-mono text-[6pt] whitespace-nowrap text-center cursor-pointer hover:bg-amber-100 transition-colors"
                      onClick={() => openTimeEditModal(rIdx, row.time, row.periodLabel)}
                      title="Klik untuk ubah rentang waktu"
                    >
                      {row.time}
                    </td>

                    {/* SENIN: Either Special colSpan (e.g. UPACARA) or individual class columns */}
                    {isSeninColspan ? (
                      <td
                        colSpan={classList.length}
                        className="border border-black px-1 py-0.5 bg-blue-50 font-extrabold text-[6.5pt] uppercase tracking-wider text-center cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() =>
                          openActivityEditModal(
                            'SENIN',
                            'Senin',
                            'special',
                            `Senin Jam Ke-${pNum}`,
                            seninSpecial?.activityName || 'UPACARA BENDERA',
                            pNum,
                            row.time,
                            true
                          )
                        }
                        title="Klik untuk edit / ubah menjadi jam per kelas"
                      >
                        🇮🇩 {seninSpecial?.activityName || 'UPACARA'}
                      </td>
                    ) : (
                      classList.map(cls => {
                        const code = getCode(seninDay, row, cls);
                        return (
                          <td
                            key={`senin-${cls}-${row.index}`}
                            className={`border border-black px-0.5 py-0.5 font-mono font-extrabold text-center cursor-pointer transition-colors ${
                              code === 'KO'
                                ? 'bg-amber-100/70 text-amber-900'
                                : 'hover:bg-yellow-200 hover:text-black'
                            }`}
                            onClick={() => {
                              onSlotClick?.('Senin', pNum, row.time, cls, code);
                              openSlotEditModal('SENIN', 'Senin', pNum, row.time, cls, code, rIdx);
                            }}
                            title={`Senin Jam ${pNum} Kelas ${cls}: ${code} (Klik untuk edit)`}
                          >
                            {code}
                          </td>
                        );
                      })
                    )}

                    {/* SELASA: Classes X.1 s/d XII.2 */}
                    {classList.map(cls => {
                      const code = getCode(selasaDay, row, cls);
                      return (
                        <td
                          key={`selasa-${cls}-${row.index}`}
                          className={`border border-black px-0.5 py-0.5 font-mono font-extrabold text-center cursor-pointer transition-colors ${
                            code === 'KO'
                              ? 'bg-amber-100/70 text-amber-900'
                              : 'hover:bg-yellow-200 hover:text-black'
                          }`}
                          onClick={() => {
                            onSlotClick?.('Selasa', pNum, row.time, cls, code);
                            openSlotEditModal('SELASA', 'Selasa', pNum, row.time, cls, code, rIdx);
                          }}
                          title={`Selasa Jam ${pNum} Kelas ${cls}: ${code} (Klik untuk edit)`}
                        >
                          {code}
                        </td>
                      );
                    })}

                    {/* RABU: Classes X.1 s/d XII.2 */}
                    {classList.map(cls => {
                      const code = getCode(rabuDay, row, cls);
                      return (
                        <td
                          key={`rabu-${cls}-${row.index}`}
                          className={`border border-black px-0.5 py-0.5 font-mono font-extrabold text-center cursor-pointer transition-colors ${
                            code === 'KO'
                              ? 'bg-amber-100/70 text-amber-900'
                              : 'hover:bg-yellow-200 hover:text-black'
                          }`}
                          onClick={() => {
                            onSlotClick?.('Rabu', pNum, row.time, cls, code);
                            openSlotEditModal('RABU', 'Rabu', pNum, row.time, cls, code, rIdx);
                          }}
                          title={`Rabu Jam ${pNum} Kelas ${cls}: ${code} (Klik untuk edit)`}
                        >
                          {code}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* TABEL GURU A - T (1 - 20) DI SEBELAH KANAN TIER ATAS (SESUAI GAMBAR ASLI) */}
        <div className="w-[285px] shrink-0">
          <table
            className="w-full border-collapse border border-black text-left"
            style={{ fontSize: '5.5pt', lineHeight: 1.15 }}
          >
            <thead>
              <tr className="bg-gray-100 font-extrabold uppercase border-b border-black text-center">
                <th className="border border-black p-0.5 w-4 text-center font-bold">No</th>
                <th className="border border-black p-0.5 text-left font-bold">Nama Guru</th>
                <th className="border border-black p-0.5 w-5 text-center font-bold">Kd</th>
                <th className="border border-black p-0.5 text-left font-bold">Mata Pelajaran</th>
                <th className="border border-black p-0.5 w-6 text-center font-bold" title="Jumlah jam mengajar otomatis dari jadwal">Jam</th>
              </tr>
            </thead>
            <tbody>
              {teachers.slice(0, 20).map(t => {
                const totalHours = teacherHoursMap[t.code] || 0;
                return (
                  <tr
                    key={t.code}
                    className="border-b border-black hover:bg-blue-50/60 cursor-pointer transition-colors"
                    onClick={() => {
                      if (!isPrintMode) {
                        triggerSaveNotification(`Guru ${t.code}: ${t.name} (${(t.subjectsSummary || []).join(', ')} — Total: ${totalHours} Jam)`);
                      }
                    }}
                    title={`Klik untuk info guru ${t.name}`}
                  >
                    <td className="border border-black p-0.5 text-center">{t.no}</td>
                    <td className="border border-black p-0.5 font-medium truncate max-w-[100px]">
                      {t.name}
                    </td>
                    <td className="border border-black p-0.5 text-center font-mono font-black bg-gray-50">
                      {t.code}
                    </td>
                    <td className="border border-black p-0.5 truncate max-w-[95px]">
                      {(t.subjectsSummary || []).join(', ')}
                    </td>
                    <td className={`border border-black p-0.5 text-center font-mono font-extrabold ${totalHours >= 24 ? 'text-emerald-800 bg-emerald-50/70' : 'text-slate-800'}`}>
                      {totalHours}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. TIER BAWAH (KAMIS, JUM'AT, & OPTIONAL SABTU) + KOKULIKULER + PENGESAHAN */}
      <div className="flex flex-row items-start gap-1.5 w-full">
        {/* TABEL JADWAL TIER BAWAH (KAMIS, JUM'AT, [+ SABTU]) */}
        <div className={workDays === 6 ? 'flex-1 overflow-x-auto' : 'w-[68%] overflow-x-auto'}>
          <table
            className="w-full border-collapse border border-black text-center"
            style={{ fontSize }}
          >
            <thead>
              {/* Header Baris 1: Hari */}
              <tr className="bg-gray-100 font-extrabold uppercase">
                <th
                  rowSpan={2}
                  className="border border-black px-1 py-0.5 w-[28px] text-center align-middle font-bold"
                >
                  JAM
                </th>
                <th
                  rowSpan={2}
                  className="border border-black px-1 py-0.5 w-[68px] text-center align-middle font-bold whitespace-nowrap"
                >
                  WAKTU
                </th>
                <th
                  colSpan={classList.length}
                  className="border border-black px-1 py-0.5 bg-gray-200 text-center font-black tracking-wider"
                >
                  KAMIS
                </th>
                <th
                  colSpan={classList.length}
                  className="border border-black px-1 py-0.5 bg-gray-200 text-center font-black tracking-wider"
                >
                  JUM'AT
                </th>
                {workDays === 6 && (
                  <th
                    colSpan={classList.length}
                    className="border border-black px-1 py-0.5 bg-gray-200 text-center font-black tracking-wider"
                  >
                    SABTU
                  </th>
                )}
              </tr>
              {/* Header Baris 2: Nama-Nama Kelas */}
              <tr className="bg-gray-100 font-extrabold">
                {/* Kamis classes */}
                {classList.map(cls => (
                  <th
                    key={`kamis-${cls}`}
                    className="border border-black px-0.5 py-0.5 text-center font-bold min-w-[20px]"
                  >
                    {cls}
                  </th>
                ))}
                {/* Jum'at classes */}
                {classList.map(cls => (
                  <th
                    key={`jumat-${cls}`}
                    className="border border-black px-0.5 py-0.5 text-center font-bold min-w-[20px]"
                  >
                    {cls}
                  </th>
                ))}
                {/* Sabtu classes (if 6 days) */}
                {workDays === 6 &&
                  classList.map(cls => (
                    <th
                      key={`sabtu-${cls}`}
                      className="border border-black px-0.5 py-0.5 text-center font-bold min-w-[20px]"
                    >
                      {cls}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => {
                const isBreak = row.type === 'break';
                const isPre = row.type === 'pre';
                const isPost = row.type === 'post';

                // ROW 0: PRE-ACTIVITY
                if (isPre) {
                  const kamisPre = kamisDay?.preActivity || row.kamisText || 'Senam Bersama';
                  const jumatPre = jumatDay?.preActivity || row.jumatText || "Do'a / Tadarus Bersama";
                  const sabtuPre = sabtuDay?.preActivity || row.sabtuText || "Do'a / Tadarus Bersama";

                  return (
                    <tr key="bottom-pre" className="bg-gray-50 border-b border-black font-semibold">
                      <td
                        className="border border-black px-0.5 py-0.5 font-bold text-center cursor-pointer hover:bg-amber-100"
                        onClick={() => openTimeEditModal(rIdx, row.time, row.periodLabel)}
                      >
                        -
                      </td>
                      <td
                        className="border border-black px-0.5 py-0.5 font-mono text-[6pt] whitespace-nowrap text-center cursor-pointer hover:bg-amber-100"
                        onClick={() => openTimeEditModal(rIdx, row.time, row.periodLabel)}
                      >
                        {row.time}
                      </td>
                      <td
                        colSpan={classList.length}
                        className="border border-black px-1 py-0.5 bg-orange-50/80 font-bold text-[6pt] uppercase tracking-wide text-center cursor-pointer hover:bg-orange-200"
                        onClick={() => openActivityEditModal('KAMIS', 'Kamis', 'pre', 'Kegiatan Awal Kamis', kamisPre)}
                        title="Klik untuk edit"
                      >
                        {kamisPre}
                      </td>
                      <td
                        colSpan={classList.length}
                        className="border border-black px-1 py-0.5 bg-green-50/70 font-bold text-[6pt] uppercase tracking-wide text-center cursor-pointer hover:bg-green-200"
                        onClick={() => openActivityEditModal('JUMAT', "Jum'at", 'pre', "Kegiatan Awal Jum'at", jumatPre)}
                        title="Klik untuk edit"
                      >
                        {jumatPre}
                      </td>
                      {workDays === 6 && (
                        <td
                          colSpan={classList.length}
                          className="border border-black px-1 py-0.5 bg-green-50/70 font-bold text-[6pt] uppercase tracking-wide text-center cursor-pointer hover:bg-green-200"
                          onClick={() => openActivityEditModal('SABTU', 'Sabtu', 'pre', 'Kegiatan Awal Sabtu', sabtuPre)}
                          title="Klik untuk edit"
                        >
                          {sabtuPre}
                        </td>
                      )}
                    </tr>
                  );
                }

                // ROW ISTIRAHAT
                if (isBreak) {
                  const breakName = row.name || 'ISTIRAHAT';
                  return (
                    <tr key={`bottom-break-${row.index}`} className="bg-gray-100 border-b border-black font-bold">
                      <td
                        className="border border-black px-0.5 py-0.5 text-center cursor-pointer hover:bg-amber-100"
                        onClick={() => openTimeEditModal(rIdx, row.time, row.periodLabel)}
                      >
                        -
                      </td>
                      <td
                        className="border border-black px-0.5 py-0.5 font-mono text-[6pt] whitespace-nowrap text-center cursor-pointer hover:bg-amber-100"
                        onClick={() => openTimeEditModal(rIdx, row.time, row.periodLabel)}
                      >
                        {row.time}
                      </td>
                      <td
                        colSpan={classList.length}
                        className="border border-black px-1 py-0.5 bg-gray-100 font-extrabold text-[6pt] uppercase tracking-wider text-center cursor-pointer hover:bg-amber-200"
                        onClick={() => openActivityEditModal('KAMIS', 'Kamis', 'break', 'Istirahat Kamis', breakName, undefined, row.time)}
                      >
                        ☕ {breakName}
                      </td>
                      <td
                        colSpan={classList.length}
                        className="border border-black px-1 py-0.5 bg-gray-100 font-extrabold text-[6pt] uppercase tracking-wider text-center cursor-pointer hover:bg-amber-200"
                        onClick={() => openActivityEditModal('JUMAT', "Jum'at", 'break', "Istirahat / Sholat Jum'at", row.index === 10 ? "SHOLAT JUM'AT" : breakName, undefined, row.time)}
                      >
                        {row.index === 10 ? "🕌 SHOLAT JUM'AT" : `☕ ${breakName}`}
                      </td>
                      {workDays === 6 && (
                        <td
                          colSpan={classList.length}
                          className="border border-black px-1 py-0.5 bg-gray-100 font-extrabold text-[6pt] uppercase tracking-wider text-center cursor-pointer hover:bg-amber-200"
                          onClick={() => openActivityEditModal('SABTU', 'Sabtu', 'break', 'Istirahat Sabtu', breakName, undefined, row.time)}
                        >
                          ☕ {breakName}
                        </td>
                      )}
                    </tr>
                  );
                }

                // ROW POST-ACTIVITY (14.25 - 15.00)
                if (isPost) {
                  const kamisPost = kamisDay?.postActivity || row.kamisText || 'Ekstrakulikuler';
                  const jumatPost = jumatDay?.postActivity || row.jumatText || 'Pramuka / HW';
                  const sabtuPost = sabtuDay?.postActivity || row.sabtuText || 'HW / Ekskul Pilihan';

                  return (
                    <tr key="bottom-post" className="bg-gray-50 border-b border-black font-semibold">
                      <td
                        className="border border-black px-0.5 py-0.5 font-bold text-center cursor-pointer hover:bg-amber-100"
                        onClick={() => openTimeEditModal(rIdx, row.time, row.periodLabel)}
                      >
                        -
                      </td>
                      <td
                        className="border border-black px-0.5 py-0.5 font-mono text-[6pt] whitespace-nowrap text-center cursor-pointer hover:bg-amber-100"
                        onClick={() => openTimeEditModal(rIdx, row.time, row.periodLabel)}
                      >
                        {row.time}
                      </td>
                      <td
                        colSpan={classList.length}
                        className="border border-black px-1 py-0.5 bg-blue-50/70 font-bold text-[6pt] uppercase tracking-wider text-center cursor-pointer hover:bg-blue-200"
                        onClick={() => openActivityEditModal('KAMIS', 'Kamis', 'post', 'Kegiatan Akhir Kamis', kamisPost)}
                      >
                        {kamisPost}
                      </td>
                      <td
                        colSpan={classList.length}
                        className="border border-black px-1 py-0.5 bg-green-50/70 font-bold text-[6pt] uppercase tracking-wider text-center cursor-pointer hover:bg-green-200"
                        onClick={() => openActivityEditModal('JUMAT', "Jum'at", 'post', "Kegiatan Akhir Jum'at", jumatPost)}
                      >
                        {jumatPost}
                      </td>
                      {workDays === 6 && (
                        <td
                          colSpan={classList.length}
                          className="border border-black px-1 py-0.5 bg-blue-50/70 font-bold text-[6pt] uppercase tracking-wider text-center cursor-pointer hover:bg-blue-200"
                          onClick={() => openActivityEditModal('SABTU', 'Sabtu', 'post', 'Kegiatan Akhir Sabtu', sabtuPost)}
                        >
                          {sabtuPost}
                        </td>
                      )}
                    </tr>
                  );
                }

                // LESSON ROWS (KAMIS, JUM'AT, SABTU)
                const pNum = Number(row.periodLabel);

                // Jum'at special slots
                const jumatSpecial1 = jumatDay?.slots.find(s => s.period === 1);
                const isJumatTausyiah = row.periodLabel === '1' && (jumatSpecial1?.isSpecial ?? true);

                const jumatSpecial8 = jumatDay?.slots.find(s => s.period === 8);
                const isJumatSholat = row.periodLabel === '8' && (jumatSpecial8?.isSpecial ?? true);

                const jumatSpecial11 = jumatDay?.slots.find(s => s.period === 11);
                const isJumatJam11Kosong = row.periodLabel === '11' && (jumatSpecial11?.isSpecial ?? true);

                return (
                  <tr key={`bottom-lesson-${row.index}`} className="border-b border-black">
                    {/* JAM Column */}
                    <td
                      className="border border-black px-0.5 py-0.5 font-bold text-center cursor-pointer hover:bg-amber-100 transition-colors"
                      onClick={() => openTimeEditModal(rIdx, row.time, row.periodLabel)}
                      title="Klik untuk ubah nomor jam & waktu"
                    >
                      {row.periodLabel}
                    </td>

                    {/* WAKTU Column */}
                    <td
                      className="border border-black px-0.5 py-0.5 font-mono text-[6pt] whitespace-nowrap text-center cursor-pointer hover:bg-amber-100 transition-colors"
                      onClick={() => openTimeEditModal(rIdx, row.time, row.periodLabel)}
                      title="Klik untuk ubah rentang waktu"
                    >
                      {row.time}
                    </td>

                    {/* KAMIS Classes X.1 s/d XII.2 */}
                    {classList.map(cls => {
                      const code = getCode(kamisDay, row, cls);
                      return (
                        <td
                          key={`kamis-${cls}-${row.index}`}
                          className={`border border-black px-0.5 py-0.5 font-mono font-extrabold text-center cursor-pointer transition-colors ${
                            code === 'KO'
                              ? 'bg-amber-100/70 text-amber-900'
                              : 'hover:bg-yellow-200 hover:text-black'
                          }`}
                          onClick={() => {
                            onSlotClick?.('Kamis', pNum, row.time, cls, code);
                            openSlotEditModal('KAMIS', 'Kamis', pNum, row.time, cls, code, rIdx);
                          }}
                          title={`Kamis Jam ${pNum} Kelas ${cls}: ${code} (Klik untuk edit)`}
                        >
                          {code}
                        </td>
                      );
                    })}

                    {/* JUM'AT: Tausyiah / Sholat / Jam 11 Kosong / Regular Classes */}
                    {isJumatTausyiah ? (
                      <td
                        colSpan={classList.length}
                        className="border border-black px-1 py-0.5 bg-green-50 font-extrabold text-[6.5pt] uppercase tracking-wider text-center cursor-pointer hover:bg-green-200 transition-colors"
                        onClick={() =>
                          openActivityEditModal(
                            'JUMAT',
                            "Jum'at",
                            'special',
                            "Jum'at Jam Ke-1",
                            jumatSpecial1?.activityName || 'TAUSYIAH',
                            1,
                            row.time,
                            true
                          )
                        }
                        title="Klik untuk edit / ubah menjadi jam per kelas"
                      >
                        📖 {jumatSpecial1?.activityName || 'TAUSYIAH'}
                      </td>
                    ) : isJumatSholat ? (
                      <td
                        colSpan={classList.length}
                        className="border border-black px-1 py-0.5 bg-emerald-50 font-extrabold text-[6pt] uppercase tracking-wider text-center cursor-pointer hover:bg-emerald-200 transition-colors"
                        onClick={() =>
                          openActivityEditModal(
                            'JUMAT',
                            "Jum'at",
                            'special',
                            "Jum'at Jam Ke-8",
                            jumatSpecial8?.activityName || "SHOLAT JUM'AT & KEPUTRIAN",
                            8,
                            row.time,
                            true
                          )
                        }
                        title="Klik untuk edit / ubah menjadi jam per kelas"
                      >
                        🕌 {jumatSpecial8?.activityName || "SHOLAT JUM'AT & KEPUTRIAN"}
                      </td>
                    ) : isJumatJam11Kosong ? (
                      <td
                        colSpan={classList.length}
                        className="border border-black px-1 py-0.5 bg-gray-50 text-[6pt] font-mono text-center text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() =>
                          openActivityEditModal(
                            'JUMAT',
                            "Jum'at",
                            'special',
                            "Jum'at Jam Ke-11",
                            jumatSpecial11?.activityName || 'PULANG / MANDIRI',
                            11,
                            row.time,
                            true
                          )
                        }
                        title="Klik untuk ubah menjadi jam pelajaran per kelas"
                      >
                        - (Pulang Mandiri)
                      </td>
                    ) : (
                      classList.map(cls => {
                        const code = getCode(jumatDay, row, cls);
                        return (
                          <td
                            key={`jumat-${cls}-${row.index}`}
                            className={`border border-black px-0.5 py-0.5 font-mono font-extrabold text-center cursor-pointer transition-colors ${
                              code === 'KO'
                                ? 'bg-amber-100/70 text-amber-900'
                                : 'hover:bg-yellow-200 hover:text-black'
                            }`}
                            onClick={() => {
                              onSlotClick?.("Jum'at", pNum, row.time, cls, code);
                              openSlotEditModal('JUMAT', "Jum'at", pNum, row.time, cls, code, rIdx);
                            }}
                            title={`Jum'at Jam ${pNum} Kelas ${cls}: ${code} (Klik untuk edit)`}
                          >
                            {code}
                          </td>
                        );
                      })
                    )}

                    {/* SABTU (Jika 6 Hari Kerja) */}
                    {workDays === 6 &&
                      classList.map(cls => {
                        const code = getCode(sabtuDay, row, cls);
                        return (
                          <td
                            key={`sabtu-${cls}-${row.index}`}
                            className={`border border-black px-0.5 py-0.5 font-mono font-extrabold text-center cursor-pointer transition-colors ${
                              code === 'KO'
                                ? 'bg-amber-100/70 text-amber-900'
                                : 'hover:bg-yellow-200 hover:text-black'
                            }`}
                            onClick={() => {
                              onSlotClick?.('Sabtu', pNum, row.time, cls, code);
                              openSlotEditModal('SABTU', 'Sabtu', pNum, row.time, cls, code, rIdx);
                            }}
                            title={`Sabtu Jam ${pNum} Kelas ${cls}: ${code} (Klik untuk edit)`}
                          >
                            {code}
                          </td>
                        );
                      })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* KOKULIKULER + TANDA TANGAN KEPALA MADRASAH DI SEBELAH KANAN TIER BAWAH (SESUAI GAMBAR) */}
        <div className={workDays === 6 ? 'w-[285px] shrink-0 flex flex-col gap-1.5' : 'flex-1 flex flex-row gap-2'}>
          {/* KOKULIKULER SEMESTER 1 BOX - Clickable to Edit */}
          <div
            className={`border border-black p-1.5 bg-white cursor-pointer hover:bg-slate-50 transition-colors ${workDays === 6 ? 'w-full' : 'flex-1'}`}
            style={{ fontSize: '5.5pt', lineHeight: 1.25 }}
            onClick={() => {
              if (!isPrintMode) {
                setKokulikulerEditing(JSON.parse(JSON.stringify(kokulikulerData)));
                setIsKokulikulerModalOpen(true);
              }
            }}
            title={!isPrintMode ? "Klik untuk mengedit data kegiatan kokulikuler" : undefined}
          >
            <div className="flex items-center justify-between border-b border-black pb-0.5 mb-1">
              <span className="font-extrabold uppercase text-[6.5pt]">
                Kokulikuler Semester 1:
              </span>
              {!isPrintMode && <Edit2 className="w-2.5 h-2.5 text-blue-600" />}
            </div>
            <div className="space-y-1">
              {kokulikulerData.map((k) => (
                <div key={k.classLevel}>
                  <b className="font-bold">{k.title}</b>
                  <div className="pl-1 text-gray-800">
                    {k.projects.map((proj, pIdx) => (
                      <React.Fragment key={pIdx}>
                        {pIdx + 1}. {proj.name}
                        {proj.coordinator && (
                          <>
                            <br />
                            <span className="italic text-gray-600">
                              Koord: {proj.coordinator} {proj.schedule ? proj.schedule : ''}
                            </span>
                          </>
                        )}
                        {pIdx < k.projects.length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pt-0.5 border-t border-gray-300 text-[5pt] text-gray-600">
                * Kode <b>KO</b> menandakan jam Kokulikuler Terpadu
              </div>
            </div>
          </div>

          {/* TANDA TANGAN & PENGESAHAN KEPALA MADRASAH - Clickable to Edit */}
          <div
            className={`border border-black p-1.5 bg-white text-center flex flex-col justify-between cursor-pointer hover:bg-slate-50 transition-colors ${workDays === 6 ? 'w-full' : 'w-[145px] shrink-0'}`}
            style={{ fontSize: '6pt', minHeight: '140px' }}
            onClick={() => !isPrintMode && setIsHeaderModalOpen(true)}
            title={!isPrintMode ? "Klik untuk mengedit Kepala Madrasah dan Tanggal Pengesahan" : undefined}
          >
            <div>
              <div className="text-[5.5pt] text-gray-700 leading-tight">
                Ditetapkan di : Cikaramas
                <br />
                Pada Tanggal : {establishedDateInput}
              </div>
              <div className="font-bold uppercase mt-1 text-[6.5pt]">
                {principalTitleInput},
              </div>
            </div>

            {/* Area Stempel dan Tanda Tangan */}
            <div className="relative my-2 h-10 flex items-center justify-center">
              {/* Lingkaran Simbol Stempel Resmi Muhammadiyah */}
              <div className="w-11 h-11 rounded-full border border-blue-600/50 flex items-center justify-center text-[4.5pt] text-blue-700/60 rotate-[-12deg] uppercase font-bold tracking-tighter select-none pointer-events-none">
                MA MUH CIKARAMAS
              </div>
            </div>

            <div>
              <div className="font-extrabold uppercase underline text-[6.5pt]">
                {principalName}
              </div>
              <div className="font-mono text-[5.5pt] text-gray-800 mt-0.5">
                {principalNbm.startsWith('NBM') || principalNbm.startsWith('NIP') ? principalNbm : `NBM. ${principalNbm}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT KODE MATA PELAJARAN PER KELAS */}
      {/* ========================================================================= */}
      {slotEditModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-300 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-200" />
                <div>
                  <h3 className="font-bold text-sm leading-tight">
                    Edit Jadwal: {slotEditModal.dayLabel} — Jam Ke-{slotEditModal.periodNumber} ({slotEditModal.time})
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    Kelas: <span className="font-extrabold text-white">{slotEditModal.className}</span> | Tersimpan Langsung ke Database
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSlotEditModal(null)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Input Kode */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Masukkan Kode Guru / Mapel (Contoh: H2, T3, J1, KO, atau -):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={slotCodeInput}
                    onChange={(e) => handleSlotCodeChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveSlot(false);
                      }
                    }}
                    placeholder="Contoh: H2, T3, F1, KO, -"
                    className="flex-1 px-3 py-2 border-2 border-blue-500 rounded-md font-mono text-base font-extrabold uppercase text-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleSlotCodeChange('-')}
                    className="px-3 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 font-semibold"
                    title="Kosongkan slot"
                  >
                    Kosongkan (-)
                  </button>
                </div>
              </div>

              {/* Clash Alert Warning */}
              {slotClashWarning && (
                <div className="p-3 rounded-md bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-[11px] font-medium leading-relaxed">
                    {slotClashWarning}
                  </span>
                </div>
              )}

              {/* Resolved Preview */}
              <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Deteksi Otomatis Kurikulum Merdeka:
                </div>
                {resolvedSlotInfo?.sub || resolvedSlotInfo?.teacher ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-700">Mata Pelajaran:</span>
                      <span className="font-extrabold text-blue-700">
                        {resolvedSlotInfo.sub?.name || 'Mata Pelajaran Umum'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-700">Guru Pengampu:</span>
                      <span className="font-semibold text-gray-900">
                        {resolvedSlotInfo.teacher?.name || `Guru Kode ${resolvedSlotInfo.teacherLetter || '-'}`}
                      </span>
                    </div>
                  </div>
                ) : slotCodeInput === 'KO' ? (
                  <div className="text-amber-800 font-bold">
                    🌟 Jam Terpadu Kokulikuler Semester 1 (P5 / Rahmatan Lil Alamin)
                  </div>
                ) : (
                  <div className="text-gray-500 italic">
                    Masukkan kode mapel di atas atau pilih dari daftar cepat di bawah.
                  </div>
                )}
              </div>

              {/* Quick Select Chips */}
              <div>
                <div className="text-[11px] font-bold text-gray-600 mb-1.5 flex items-center justify-between">
                  <span>Pilih Cepat Kode Guru &amp; Mapel:</span>
                  <span className="text-[10px] text-gray-400 font-normal">Klik untuk langsung mengisi</span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-1 border border-gray-200 rounded-md bg-white">
                  {availableSubjectCodes.map(code => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleSlotCodeChange(code)}
                      className={`px-2 py-1 rounded text-xs font-mono font-bold transition-all ${
                        slotCodeInput === code
                          ? 'bg-blue-600 text-white shadow-xs scale-105'
                          : 'bg-slate-100 hover:bg-blue-100 text-slate-800'
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSlotEditModal(null)}
                className="px-3 py-1.5 rounded text-gray-600 hover:bg-gray-200 font-semibold"
              >
                Batal
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveSlot(true)}
                  className="px-3 py-1.5 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold inline-flex items-center gap-1"
                  title="Simpan slot ini dan lanjut edit kelas berikutnya"
                >
                  <span>Simpan &amp; Kelas Lanjut</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSlot(false)}
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan ke Database</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT WAKTU BARIS JADWAL */}
      {/* ========================================================================= */}
      {timeEditModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-300 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-blue-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Edit Waktu Pelajaran (Baris {timeEditModal.rowIndex + 1})</h3>
              <button type="button" onClick={() => setTimeEditModal(null)} className="text-white hover:opacity-80">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <p className="text-gray-600">
                Mengubah waktu pada baris ini akan otomatis menyinkronkan waktu seluruh kelas dan seluruh hari pada baris ini ke database.
              </p>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Rentang Waktu (Format: JJ.MM - JJ.MM):</label>
                <input
                  type="text"
                  autoFocus
                  value={timeInput}
                  onChange={(e) => setTimeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveTime();
                    }
                  }}
                  className="w-full px-3 py-2 border-2 border-blue-500 rounded font-mono text-base font-bold focus:outline-hidden"
                  placeholder="Contoh: 07.10 - 07.45"
                />
              </div>
            </div>
            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTimeEditModal(null)}
                className="px-3 py-1.5 rounded text-gray-600 hover:bg-gray-200 font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveTime}
                className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold inline-flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Waktu Baris</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT KEGIATAN KHUSUS / AWAL / ISTIRAHAT / AKHIR */}
      {/* ========================================================================= */}
      {activityEditModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-300 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{activityEditModal.title}</h3>
                <p className="text-[11px] text-blue-200">Hari: {activityEditModal.dayLabel}</p>
              </div>
              <button type="button" onClick={() => setActivityEditModal(null)} className="text-white hover:opacity-80">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Nama / Teks Kegiatan:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={activityTextInput}
                  onChange={(e) => setActivityTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveActivity();
                    }
                  }}
                  className="w-full px-3 py-2 border-2 border-blue-500 rounded font-bold text-sm focus:outline-hidden"
                  placeholder="Contoh: UPACARA BENDERA / TAUSYIAH / ISTIRAHAT"
                />
              </div>

              {/* Special row toggle (e.g. Upacara or Tausyiah) */}
              {activityEditModal.type === 'special' && (
                <div className="p-3 rounded-md bg-amber-50 border border-amber-200 space-y-2">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <Columns className="w-4 h-4 text-amber-700" />
                    <span>Format Tampilan Kolom:</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Saat ini slot ini ditampilkan sebagai <b>kegiatan bersama (satu baris penuh memanjang / Colspan)</b>.
                    Anda dapat memecahnya menjadi <b>7 kolom pelajaran terpisah</b> (X.1 s/d XII.2) jika ingin mengisi mata pelajaran per kelas.
                  </p>
                  <button
                    type="button"
                    onClick={handleToggleSpecialColspan}
                    className="w-full py-2 px-3 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Columns className="w-4 h-4" />
                    <span>Pecah Jadi Kolom Pelajaran Per Kelas (X.1 s/d XII.2)</span>
                  </button>
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActivityEditModal(null)}
                className="px-3 py-1.5 rounded text-gray-600 hover:bg-gray-200 font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveActivity}
                className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold inline-flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan ke Database</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT KOKULIKULER SEMESTER 1 */}
      {/* ========================================================================= */}
      {isKokulikulerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-300 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 bg-blue-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Edit Data Kegiatan Kokulikuler Semester 1</h3>
              <button type="button" onClick={() => setIsKokulikulerModalOpen(false)} className="text-white hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {kokulikulerEditing.map((item, cIdx) => (
                <div key={item.classLevel} className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                  <h4 className="font-bold text-blue-700">{item.title}</h4>
                  {item.projects.map((proj, pIdx) => (
                    <div key={pIdx} className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-600">Nama Proyek/Kegiatan:</label>
                        <input
                          type="text"
                          value={proj.name}
                          onChange={(e) => {
                            const updated = [...kokulikulerEditing];
                            updated[cIdx].projects[pIdx].name = e.target.value;
                            setKokulikulerEditing(updated);
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-hidden font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-600">Koordinator &amp; Jadwal:</label>
                        <input
                          type="text"
                          value={`${proj.coordinator}${proj.schedule ? ` (${proj.schedule})` : ''}`}
                          onChange={(e) => {
                            const updated = [...kokulikulerEditing];
                            updated[cIdx].projects[pIdx].coordinator = e.target.value;
                            setKokulikulerEditing(updated);
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-hidden font-medium"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsKokulikulerModalOpen(false)}
                className="px-3 py-1.5 rounded text-gray-600 hover:bg-gray-200 font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  saveKokulikulerData(activeToken, kokulikulerEditing);
                  setKokulikulerData([...kokulikulerEditing]);
                  triggerSaveNotification('Data kokulikuler berhasil disimpan ke database!');
                  setIsKokulikulerModalOpen(false);
                }}
                className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold inline-flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Kokulikuler</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: EDIT KEPALA MADRASAH & PENGESAHAN */}
      {/* ========================================================================= */}
      {isHeaderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-300 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-blue-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Edit Pengesahan &amp; Kop Dokumen</h3>
              <button type="button" onClick={() => setIsHeaderModalOpen(false)} className="text-white hover:opacity-80">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Jabatan Pimpinan:</label>
                <select
                  value={principalTitleInput}
                  onChange={(e) => setPrincipalTitleInput(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded font-semibold bg-white focus:outline-hidden"
                >
                  <option value="Kepala Madrasah">Kepala Madrasah (MA / MTs / MI)</option>
                  <option value="Kepala Sekolah">Kepala Sekolah (SMA / SMK / SMP)</option>
                  <option value="Plt. Kepala Madrasah">Plt. Kepala Madrasah</option>
                  <option value="Plt. Kepala Sekolah">Plt. Kepala Sekolah</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nama Kepala &amp; Gelar:</label>
                <input
                  type="text"
                  value={principalNameInput}
                  onChange={(e) => setPrincipalNameInput(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded font-semibold focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nomor Baku Muhammadiyah (NBM) / NIP:</label>
                <input
                  type="text"
                  value={principalNbmInput}
                  onChange={(e) => setPrincipalNbmInput(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Tahun Pelajaran:</label>
                <input
                  type="text"
                  value={schoolYearInput}
                  onChange={(e) => setSchoolYearInput(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Tanggal Pengesahan Dokumen:</label>
                <input
                  type="text"
                  value={establishedDateInput}
                  onChange={(e) => setEstablishedDateInput(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-hidden"
                />
              </div>
            </div>

            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsHeaderModalOpen(false)}
                className="px-3 py-1.5 rounded text-gray-600 hover:bg-gray-200 font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    saveSettings(activeToken, {
                      PRINCIPAL_TITLE: principalTitleInput,
                      PRINCIPAL_NAME: principalNameInput,
                      PRINCIPAL_NIP: principalNbmInput,
                      SCHOOL_YEAR: schoolYearInput
                    });
                  } catch {}
                  triggerSaveNotification('Pengesahan dokumen berhasil diperbarui!');
                  setIsHeaderModalOpen(false);
                }}
                className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold inline-flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Pengesahan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
