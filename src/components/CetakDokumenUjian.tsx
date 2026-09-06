import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Printer,
  CreditCard,
  FileText,
  ClipboardList,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Users,
  UserCheck,
  UserX,
  AlertCircle,
  Building2,
  Sliders,
  Sparkles,
  QrCode as QrIcon,
  ChevronRight,
  ShieldCheck,
  Check,
  FileCheck2,
  FileSpreadsheet,
  Edit3,
  Image as ImageIcon
} from 'lucide-react';
import { Exam, PrintData, ClassItem, AssessmentType, SchoolSettings, User } from '../types';
import { getPrintData, getStudentCardsPrintData, getClasses, getAssessmentTypes, matchClassFlexible, getSchoolSettings as getLocalSchoolSettings } from '../services/lmsStorage';
import { DEFAULT_SETTINGS } from '../data/initialData';
import { printElementReliable } from '../utils/printHelper';
import { MaCikaramasLogoSvg, MuhammadiyahLogoSvg } from './OfficialLogos';
import { OfficialKopSurat } from './OfficialKopSurat';

// =========================================================================
// VECTOR SVG DUMMY QR CODE GENERATOR (VECTOR SHARP IN PRINT)
// =========================================================================
export const SvgQrCode: React.FC<{ value: string; size?: number; className?: string }> = ({
  value,
  size = 54,
  className = ''
}) => {
  // Deterministic 21x21 matrix generation based on string hash
  const matrix = useMemo(() => {
    const size = 21;
    const grid: boolean[][] = Array(size).fill(false).map(() => Array(size).fill(false));

    // Simple deterministic PRNG from string
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }

    const prng = (seed: number) => {
      let s = seed;
      return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
    };
    const random = prng(Math.abs(hash) + 12345);

    // Draw 7x7 Finder Pattern Helper
    const drawFinder = (startX: number, startY: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 || // Outer 7x7 border
            (r >= 2 && r <= 4 && c >= 2 && c <= 4) // Inner 3x3 box
          ) {
            grid[startY + r][startX + c] = true;
          }
        }
      }
    };

    // Draw 3 Corner Finder Patterns
    drawFinder(0, 0); // Top-left
    drawFinder(size - 7, 0); // Top-right
    drawFinder(0, size - 7); // Bottom-left

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Alignment pattern near bottom-right (center at 16, 16 for version 1-2)
    const ax = 14;
    const ay = 14;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
          grid[ay + r][ax + c] = true;
        }
      }
    }

    // Fill data areas
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const inFinderTL = r < 8 && c < 8;
        const inFinderTR = r < 8 && c >= size - 8;
        const inFinderBL = r >= size - 8 && c < 8;
        const inAlignment = Math.abs(r - ay) <= 2 && Math.abs(c - ax) <= 2;
        const inTiming = r === 6 || c === 6;

        if (!inFinderTL && !inFinderTR && !inFinderBL && !inAlignment && !inTiming) {
          grid[r][c] = random() > 0.48;
        }
      }
    }

    return grid;
  }, [value]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 21 21"
      className={`shrink-0 ${className}`}
      style={{ shapeRendering: 'crispEdges' }}
      aria-label={`QR Code ${value}`}
    >
      <rect width="21" height="21" fill="#FFFFFF" />
      {matrix.map((row, r) =>
        row.map((cell, c) => (cell ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#000000" /> : null))
      )}
    </svg>
  );
};

// =========================================================================
// VECTOR SVG DUMMY BARCODE GENERATOR (CODE 128 LOOKALIKE)
// =========================================================================
export const SvgBarcode: React.FC<{
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
}> = ({ value, width = 120, height = 30, showText = true, className = '' }) => {
  const bars = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }

    const pattern: number[] = [2, 1, 2, 1]; // Start guard
    const seed = Math.abs(hash);
    for (let i = 0; i < value.length; i++) {
      const charCode = value.charCodeAt(i) + seed;
      pattern.push(((charCode >> 1) % 3) + 1);
      pattern.push(((charCode >> 3) % 2) + 1);
      pattern.push(((charCode >> 2) % 3) + 1);
      pattern.push(((charCode >> 4) % 2) + 1);
    }
    pattern.push(2, 1, 1, 2, 3); // Stop guard
    return pattern;
  }, [value]);

  const totalUnits = bars.reduce((a, b) => a + b, 0);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${totalUnits} 30`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ shapeRendering: 'crispEdges' }}
      >
        <rect width={totalUnits} height="30" fill="#FFFFFF" />
        {(() => {
          let currentX = 0;
          return bars.map((bWidth, idx) => {
            const isBlack = idx % 2 === 0;
            const rect = isBlack ? (
              <rect key={idx} x={currentX} y="0" width={bWidth} height="30" fill="#000000" />
            ) : null;
            currentX += bWidth;
            return rect;
          });
        })()}
      </svg>
      {showText && (
        <span className="font-mono text-[9px] text-black tracking-widest font-semibold mt-0.5 select-none">
          *{value}*
        </span>
      )}
    </div>
  );
};

// =========================================================================
// TIME & DATE FORMATTING UTILITIES FOR EXAM DOCUMENTS
// =========================================================================
export function calculateEndTime(startTimeStr?: string, durationMin?: number): string {
  const start = (startTimeStr || '07:30').trim();
  const duration = typeof durationMin === 'number' && durationMin > 0 ? durationMin : 90;
  const parts = start.split(':');
  if (parts.length >= 2) {
    const startHour = parseInt(parts[0], 10);
    const startMinute = parseInt(parts[1], 10);
    if (!isNaN(startHour) && !isNaN(startMinute)) {
      const totalStartMin = startHour * 60 + startMinute;
      const totalEndMin = totalStartMin + duration;
      const endHour = Math.floor(totalEndMin / 60) % 24;
      const endMinute = totalEndMin % 60;
      return `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
    }
  }
  return '09:00';
}

export function formatExamTimeRange(startTimeStr?: string, durationMin?: number): string {
  const start = (startTimeStr || '07:30').trim();
  const duration = typeof durationMin === 'number' && durationMin > 0 ? durationMin : 90;
  const end = calculateEndTime(start, duration);
  return `${start} - ${end} WIB (${duration} Menit)`;
}

export function formatCleanSemester(raw?: string): string {
  if (!raw) return 'Semester Ganjil';
  let s = raw.trim();
  // Strip redundant leading "semester" case-insensitively
  s = s.replace(/^semester\s+/i, '').trim();
  if (!s) return 'Semester Ganjil';
  if (s === '1' || s.toLowerCase().includes('ganjil')) {
    return 'Semester Ganjil';
  }
  if (s === '2' || s.toLowerCase().includes('genap')) {
    return 'Semester Genap';
  }
  return `Semester ${s}`;
}

// =========================================================================
// PROPS INTERFACE
// =========================================================================
export interface CetakDokumenUjianProps {
  token: string;
  exams: Exam[];
  users?: User[];
  classes?: ClassItem[];
  subjects?: any[];
  assessmentTypes?: AssessmentType[];
  settings?: SchoolSettings;
  defaultDocType?: 'cards' | 'minutes' | 'attendance';
  currentUser?: User;
}

export const CetakDokumenUjian: React.FC<CetakDokumenUjianProps> = ({
  token,
  exams,
  users: propUsers,
  classes: propClasses,
  subjects: propSubjects,
  assessmentTypes: propAssessmentTypes,
  settings: propSettings,
  defaultDocType = 'cards',
  currentUser
}) => {
  const isStudent = currentUser?.ROLE === 'STUDENT';

  // Navigation / Active Document Tab
  const [docType, setDocType] = useState<'cards' | 'minutes' | 'attendance'>(isStudent ? 'cards' : defaultDocType);

  // Filters State
  const [selectedExamId, setSelectedExamId] = useState<string>(exams?.[0]?.ID || '');
  const [selectedClassId, setSelectedClassId] = useState<string>(isStudent && currentUser?.CLASS_ID ? currentUser.CLASS_ID : 'ALL');
  const [selectedAssessmentTypeId, setSelectedAssessmentTypeId] = useState<string>('ALL');
  const [selectedRoom, setSelectedRoom] = useState<string>('ALL');
  const [selectedSession, setSelectedSession] = useState<string>('ALL');

  // Card Grid Layout Configuration: 4 Cards (2x2) or 6 Cards (2x3) or Full with Schedule
  const [cardGridMode, setCardGridMode] = useState<'GRID_4' | 'GRID_6' | 'WITH_SCHEDULE'>('GRID_4');
  const [includeLogo, setIncludeLogo] = useState<boolean>(true);
  const printableRef = useRef<HTMLDivElement>(null);

  // Active School Settings loaded directly from storage or props
  const [activeSettings, setActiveSettings] = useState<SchoolSettings>(() => {
    return propSettings || getLocalSchoolSettings();
  });

  useEffect(() => {
    if (propSettings) {
      setActiveSettings(propSettings);
    } else {
      const current = getLocalSchoolSettings();
      if (current) {
        setActiveSettings(current);
      }
    }
  }, [propSettings]);

  // Loaded Data State
  const [printData, setPrintData] = useState<PrintData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Classes and Assessment Types Lookup
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [assessmentTypesList, setAssessmentTypesList] = useState<AssessmentType[]>([]);

  // State for Berita Acara customized fields
  const [beritaAcaraData, setBeritaAcaraData] = useState({
    pengawas1: 'Ai Sukaesih, S.Pd',
    pengawas1Nbm: 'NBM. 1281201',
    pengawas2: 'Deni Kurniawan R., S.Pd',
    pengawas2Nbm: 'NBM. 1281203',
    proktor: 'Asep Saepuloh, S.Kom',
    proktorNbm: 'NBM. 1281209',
    jumlahHadir: 0,
    jumlahTidakHadir: 0,
    pesertaAbsen: [] as { nisn: string; nama: string; alasan: string }[],
    catatanKhusus: 'Ujian Asesmen Berbasis Komputer (CBT) berlangsung dengan tertib, aman, dan lancar tanpa kendala teknis jaringan.'
  });

  // Load classes & assessment types
  useEffect(() => {
    if (propClasses && propClasses.length > 0) {
      setClassesList(propClasses);
    } else {
      try {
        const cls = getClasses(token);
        setClassesList(cls);
      } catch (err) {
        console.error('Failed to load classes', err);
      }
    }
    if (propAssessmentTypes && propAssessmentTypes.length > 0) {
      setAssessmentTypesList(propAssessmentTypes);
    } else {
      try {
        const at = getAssessmentTypes();
        setAssessmentTypesList(at);
      } catch (err) {
        console.error('Failed to load assessment types', err);
      }
    }
  }, [token, propClasses, propAssessmentTypes]);

  // Sync selected exam id if exams change
  useEffect(() => {
    if (!selectedExamId && exams.length > 0) {
      setSelectedExamId(exams[0].ID);
    }
  }, [exams, selectedExamId]);

  // Generate Print Data Function
  const handleGenerateData = () => {
    setErrorMessage('');
    try {
      const options = {
        classId: selectedClassId,
        assessmentTypeId: selectedAssessmentTypeId,
        examId: selectedExamId,
        overrideUsers: propUsers,
        overrideClasses: classesList.length > 0 ? classesList : propClasses,
        overrideSubjects: propSubjects,
        overrideSettings: activeSettings || propSettings,
        overrideExams: exams
      };

      if (docType === 'cards') {
        const data = getStudentCardsPrintData(token, options);
        setPrintData(data);
      } else {
        const examIdToUse = selectedExamId || exams[0]?.ID || 'EXAM-ALL';
        const data = getPrintData(token, docType, examIdToUse, options);
        setPrintData(data);

        // Auto-initialize Berita Acara attendance count
        if (data.students) {
          setBeritaAcaraData(prev => ({
            ...prev,
            jumlahHadir: data.students.length,
            jumlahTidakHadir: 0,
            pengawas1: data.exam?.SUPERVISOR || prev.pengawas1
          }));
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyiapkan data cetak dokumen.');
    }
  };

  // Re-generate data automatically whenever filters, props, active settings or docType changes
  useEffect(() => {
    handleGenerateData();
  }, [exams, propUsers, propClasses, propSubjects, propSettings, activeSettings, docType, selectedExamId, selectedClassId, selectedAssessmentTypeId, classesList]);

  // Reliable print handler (supports iframe sandbox and direct print)
  const handlePrint = () => {
    if (printableRef.current) {
      const docTitle = docType === 'cards'
        ? `Kartu_Peserta_${schoolSettings.SCHOOL_NAME || 'CBT'}`
        : docType === 'minutes'
        ? `Berita_Acara_${schoolSettings.SCHOOL_NAME || 'CBT'}`
        : `Daftar_Hadir_${schoolSettings.SCHOOL_NAME || 'CBT'}`;

      const ok = printElementReliable(printableRef.current, {
        title: docTitle,
        paperSize: 'A4',
        orientation: 'portrait'
      });
      if (ok) return;
    }
    try {
      window.print();
    } catch (err) {
      console.warn('Gagal memanggil dialog cetak browser:', err);
    }
  };

  // Class lookup map for robust class resolution
  const classMap = useMemo(() => {
    const map = new Map<string, string>();
    classesList.forEach(c => {
      if (c.ID) map.set(c.ID, c.NAME || c.ID);
      if (c.NAME) map.set(c.NAME, c.ID);
    });
    return map;
  }, [classesList]);

  // Current selected class name label
  const currentSelectedClassName = useMemo(() => {
    if (selectedClassId === 'ALL') return '';
    const found = classesList.find(c => c.ID === selectedClassId || c.NAME === selectedClassId);
    return found ? (found.NAME.startsWith('Kelas ') ? found.NAME : `Kelas ${found.NAME}`) : selectedClassId;
  }, [selectedClassId, classesList]);

  // Filter students based on room / session if selected
  const filteredStudents = useMemo(() => {
    if (!printData?.students) return [];
    let list = printData.students;

    // Jika user adalah siswa, tampilkan khusus kartu peserta milik dirinya sendiri
    if (isStudent && currentUser) {
      const myCard = list.filter(st =>
        st.ID === currentUser.ID ||
        (st.USERNAME && currentUser.USERNAME && st.USERNAME.toLowerCase() === currentUser.USERNAME.toLowerCase())
      );
      if (myCard.length > 0) return myCard;
      return [currentUser];
    }

    // Filter by class if specific class selected
    if (selectedClassId !== 'ALL') {
      const classFiltered = list.filter(st => matchClassFlexible(st.CLASS_ID, selectedClassId, classMap));
      if (classFiltered.length > 0) list = classFiltered;
    }

    if (selectedRoom !== 'ALL' && printData.studentSchedules) {
      const roomFiltered = list.filter(st => {
        const sch = printData.studentSchedules?.[st.ID] || [];
        return sch.some(s => (s.ROOM || 'Ruang 01') === selectedRoom);
      });
      if (roomFiltered.length > 0) list = roomFiltered;
    }

    if (selectedSession !== 'ALL' && printData.studentSchedules) {
      const sessionFiltered = list.filter(st => {
        const sch = printData.studentSchedules?.[st.ID] || [];
        return sch.some(s => (s.SESSION || 'Sesi 1') === selectedSession);
      });
      if (sessionFiltered.length > 0) list = sessionFiltered;
    }

    return list;
  }, [printData, selectedClassId, selectedRoom, selectedSession, classMap]);

  // Available Rooms and Sessions in loaded data
  const availableRooms = useMemo(() => {
    const rooms = new Set<string>();
    if (printData?.allExams) {
      printData.allExams.forEach(e => {
        if (e.ROOM) rooms.add(e.ROOM);
      });
    }
    if (rooms.size === 0) {
      rooms.add('Ruang 01');
      rooms.add('Ruang 02');
      rooms.add('Lab Komputer');
    }
    return Array.from(rooms);
  }, [printData]);

  const availableSessions = useMemo(() => {
    const sessions = new Set<string>();
    if (printData?.allExams) {
      printData.allExams.forEach(e => {
        if (e.SESSION) sessions.add(e.SESSION);
      });
    }
    if (sessions.size === 0) {
      sessions.add('Sesi 1');
      sessions.add('Sesi 2');
      sessions.add('Sesi 3');
    }
    return Array.from(sessions);
  }, [printData]);

  // School Settings: dynamically resolved from active settings, printData, or defaults
  const schoolSettings: SchoolSettings = useMemo(() => {
    const base = getLocalSchoolSettings();
    return {
      ...DEFAULT_SETTINGS,
      ...base,
      ...(activeSettings || {}),
      ...(printData?.settings || {}),
      ...(propSettings || {})
    };
  }, [activeSettings, printData?.settings, propSettings]);

  // Active School Year strictly resolved from settings (guaranteed non-empty)
  const schoolYear = schoolSettings.SCHOOL_YEAR || activeSettings?.SCHOOL_YEAR || DEFAULT_SETTINGS.SCHOOL_YEAR || '2026/2027';

  // Clean, professional semester label without duplicated "Semester SEMESTER"
  const cleanSemesterLabel = useMemo(() => {
    return formatCleanSemester(schoolSettings.SEMESTER);
  }, [schoolSettings.SEMESTER]);

  // Derive clean assessment title from assessment types or exam info (Never output "Bank Soal")
  const assessmentTitle = useMemo(() => {
    // 1. From selected filter if not ALL
    if (selectedAssessmentTypeId && selectedAssessmentTypeId !== 'ALL') {
      const found = assessmentTypesList.find(
        at => at.ID === selectedAssessmentTypeId || at.CODE === selectedAssessmentTypeId
      );
      if (found?.NAME) return found.NAME;
    }
    // 2. From exam's assessment type
    const examAtId = printData?.exam?.ASSESSMENT_TYPE_ID;
    if (examAtId) {
      const found = assessmentTypesList.find(
        at => at.ID === examAtId || at.CODE === examAtId || at.NAME?.toLowerCase() === examAtId.toLowerCase()
      );
      if (found?.NAME) return found.NAME;
    }
    // 3. Fallback to clean exam title if not starting with "Bank Soal"
    const rawTitle = printData?.exam?.TITLE;
    if (rawTitle && !rawTitle.toLowerCase().includes('bank soal')) {
      return rawTitle;
    }
    return schoolSettings.DEFAULT_ASSESSMENT_NAME || schoolSettings.ASSESSMENT_TITLE || 'Sumatif Akhir Semester (SAS)';
  }, [selectedAssessmentTypeId, printData?.exam, assessmentTypesList, schoolSettings]);

  // Group students by class/rombel for separated presentation and printing
  const studentsByClass = useMemo(() => {
    const groups: { classId: string; className: string; students: User[] }[] = [];
    const map = new Map<string, User[]>();

    filteredStudents.forEach(st => {
      const rawClassId = st.CLASS_ID || 'UNASSIGNED';
      const cName =
        (st as any).CLASS_NAME ||
        classMap.get(st.CLASS_ID || '') ||
        (st.CLASS_ID ? (st.CLASS_ID.startsWith('KLS-') ? st.CLASS_ID.replace(/^KLS-/i, '') : st.CLASS_ID) : 'Kelas Lain');
      const normalizedClassName = cName.startsWith('Kelas ') ? cName : `Kelas ${cName}`;
      const key = `${rawClassId}___${normalizedClassName}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(st);
    });

    const sortedKeys = Array.from(map.keys()).sort((a, b) => {
      const nameA = a.split('___')[1] || a;
      const nameB = b.split('___')[1] || b;
      return nameA.localeCompare(nameB, 'id-ID', { numeric: true });
    });

    sortedKeys.forEach(key => {
      const [cId, cName] = key.split('___');
      const groupStudents = map.get(key)!;
      // Sort students alphabetically by name within each class
      groupStudents.sort((a, b) => (a.NAME || '').localeCompare(b.NAME || '', 'id-ID'));
      groups.push({
        classId: cId,
        className: cName,
        students: groupStudents
      });
    });

    return groups;
  }, [filteredStudents, classMap]);

  // Chunk students into groups of 4 or 6 for clean A4 multi-page printing
  const studentPages = useMemo(() => {
    const chunkSize = cardGridMode === 'GRID_6' ? 6 : cardGridMode === 'GRID_4' ? 4 : 2;
    const pages: { pageIndex: number; className: string; students: User[] }[] = [];

    if (selectedClassId === 'ALL') {
      let globalPage = 1;
      studentsByClass.forEach(group => {
        for (let i = 0; i < group.students.length; i += chunkSize) {
          pages.push({
            pageIndex: globalPage++,
            className: group.className,
            students: group.students.slice(i, i + chunkSize)
          });
        }
      });
      return pages;
    }

    for (let i = 0; i < filteredStudents.length; i += chunkSize) {
      pages.push({
        pageIndex: Math.floor(i / chunkSize) + 1,
        className: currentSelectedClassName || 'Kelas',
        students: filteredStudents.slice(i, i + chunkSize)
      });
    }
    return pages;
  }, [filteredStudents, studentsByClass, cardGridMode, selectedClassId, currentSelectedClassName]);

  // Auto-sync attendance counts when total filtered students count changes
  useEffect(() => {
    if (filteredStudents.length > 0) {
      setBeritaAcaraData(prev => {
        if (prev.jumlahHadir + prev.jumlahTidakHadir !== filteredStudents.length) {
          return {
            ...prev,
            jumlahHadir: filteredStudents.length,
            jumlahTidakHadir: 0
          };
        }
        return prev;
      });
    } else {
      setBeritaAcaraData(prev => ({
        ...prev,
        jumlahHadir: 0,
        jumlahTidakHadir: 0
      }));
    }
  }, [filteredStudents.length]);

  // When user edits "Jumlah Hadir", automatically update "Tidak Hadir" = Total - Hadir
  const handleHadirChange = (valStr: string) => {
    const total = filteredStudents.length;
    const hadir = Math.max(0, Math.min(total, parseInt(valStr, 10) || 0));
    const tidakHadir = Math.max(0, total - hadir);
    setBeritaAcaraData(prev => ({
      ...prev,
      jumlahHadir: hadir,
      jumlahTidakHadir: tidakHadir
    }));
  };

  // When user edits "Tidak Hadir" (e.g. types 5), automatically reduce "Jumlah Hadir" = Total - Tidak Hadir
  const handleTidakHadirChange = (valStr: string) => {
    const total = filteredStudents.length;
    const tidakHadir = Math.max(0, Math.min(total, parseInt(valStr, 10) || 0));
    const hadir = Math.max(0, total - tidakHadir);
    setBeritaAcaraData(prev => ({
      ...prev,
      jumlahHadir: hadir,
      jumlahTidakHadir: tidakHadir
    }));
  };

  return (
    <div className="space-y-6 font-sans">
      {/* ========================================================================= */}
      {/* CONTROLS & FILTER TOOLBAR (HIDDEN DURING BROWSER PRINT)                   */}
      {/* ========================================================================= */}
      <div className="no-print space-y-4">
        {/* Page Title & Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E9ECEF]">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                CBT
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Cetak Dokumen Ujian CBT
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              MAS MUHAMMADIYAH CIKARAMAS • Fasilitas cetak resmi Kartu Peserta (Grid 4–6), Berita Acara, & Daftar Hadir Ujian.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!printData || filteredStudents.length === 0}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Navigation Tabs for Document Type */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setDocType('cards');
              setPrintData(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              docType === 'cards'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-300'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>{isStudent ? 'Kartu Peserta Ujian Saya' : 'Kartu Peserta Ujian (Grid 4–6)'}</span>
          </button>

          {!isStudent && (
            <>
              <button
                type="button"
                onClick={() => {
                  setDocType('minutes');
                  setPrintData(null);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  docType === 'minutes'
                    ? 'bg-white text-emerald-800 shadow-xs border border-slate-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Berita Acara Pelaksanaan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDocType('attendance');
                  setPrintData(null);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  docType === 'attendance'
                    ? 'bg-white text-emerald-800 shadow-xs border border-slate-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                <span>Daftar Hadir Siswa</span>
              </button>
            </>
          )}
        </div>

        {/* Filter Configuration Card */}
        <div className="bg-white border border-[#DEE2E6] rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filter Rombel / Kelas */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#495057] uppercase tracking-wider block">
                Pilih Rombel / Kelas
              </label>
              <select
                value={selectedClassId}
                onChange={e => {
                  setSelectedClassId(e.target.value);
                  setPrintData(null);
                }}
                className="w-full px-3 py-2 text-xs border border-[#CED4DA] rounded-lg bg-white text-[#1A1C1E] outline-none focus:border-emerald-600"
              >
                <option value="ALL">Semua Kelas (Massal)</option>
                {classesList.map(c => (
                  <option key={c.ID} value={c.ID}>
                    Kelas {c.NAME}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Paket Ujian (Untuk Berita Acara & Daftar Hadir) */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#495057] uppercase tracking-wider block">
                Pilih Jadwal Ujian
              </label>
              <select
                value={selectedExamId}
                onChange={e => {
                  setSelectedExamId(e.target.value);
                  setPrintData(null);
                }}
                className="w-full px-3 py-2 text-xs border border-[#CED4DA] rounded-lg bg-white text-[#1A1C1E] outline-none focus:border-emerald-600"
              >
                {exams.map(e => (
                  <option key={e.ID} value={e.ID}>
                    {e.TITLE} ({e.EXAM_DATE || 'Tanpa Tanggal'})
                  </option>
                ))}
              </select>
            </div>

            {/* Layout Grid Kartu (Jika docType === 'cards') */}
            {docType === 'cards' ? (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#495057] uppercase tracking-wider block">
                  Tata Letak Grid Halaman
                </label>
                <select
                  value={cardGridMode}
                  onChange={e => setCardGridMode(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-[#CED4DA] rounded-lg bg-white text-[#1A1C1E] font-semibold outline-none focus:border-emerald-600"
                >
                  <option value="GRID_4">Grid 4 Kartu / Halaman A4 (2x2 - Rekomendasi)</option>
                  <option value="GRID_6">Grid 6 Kartu / Halaman A4 (2x3 - Hemat Kertas)</option>
                  <option value="WITH_SCHEDULE">Format Lengkap (+ Tabel Jadwal Siswa)</option>
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#495057] uppercase tracking-wider block">
                  Filter Ruang Ujian
                </label>
                <select
                  value={selectedRoom}
                  onChange={e => setSelectedRoom(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CED4DA] rounded-lg bg-white text-[#1A1C1E] outline-none focus:border-emerald-600"
                >
                  <option value="ALL">Semua Ruang</option>
                  {availableRooms.map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter Sesi Ujian */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#495057] uppercase tracking-wider block">
                Filter Sesi Ujian
              </label>
              <select
                value={selectedSession}
                onChange={e => setSelectedSession(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#CED4DA] rounded-lg bg-white text-[#1A1C1E] outline-none focus:border-emerald-600"
              >
                <option value="ALL">Semua Sesi</option>
                {availableSessions.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E9ECEF]">
            <div className="text-xs text-slate-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>
                Total Terbaca: <b>{filteredStudents.length} Peserta Ujian</b> •
                {docType === 'cards' && (
                  <span className="ml-1">
                    Estimasi Lembar A4: <b>{studentPages.length} Halaman</b> ({cardGridMode === 'GRID_6' ? '6 kartu/hal' : cardGridMode === 'GRID_4' ? '4 kartu/hal' : '2 kartu/hal'})
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs select-none" title="Sertakan logo resmi pada kop">
                <input
                  type="checkbox"
                  checked={includeLogo}
                  onChange={e => setIncludeLogo(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold text-slate-700">Sertakan Logo di Kop</span>
              </label>

              <button
                type="button"
                onClick={handleGenerateData}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Muat Ulang Data
              </button>
            </div>
          </div>
        </div>

        {/* Additional Edit Form for Berita Acara (only shown when minutes tab is active) */}
        {docType === 'minutes' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
              <Edit3 className="w-4 h-4" />
              <span>Pengaturan & Penandatangan Berita Acara Ujian</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-semibold text-[#1A1C1E] block mb-1">Nama Pengawas 1:</label>
                <input
                  type="text"
                  value={beritaAcaraData.pengawas1}
                  onChange={e => setBeritaAcaraData(prev => ({ ...prev, pengawas1: e.target.value }))}
                  className="w-full px-2.5 py-1.5 bg-white border border-[#CED4DA] rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-[#1A1C1E] block mb-1">NIP/NBM Pengawas 1:</label>
                <input
                  type="text"
                  value={beritaAcaraData.pengawas1Nbm}
                  onChange={e => setBeritaAcaraData(prev => ({ ...prev, pengawas1Nbm: e.target.value }))}
                  className="w-full px-2.5 py-1.5 bg-white border border-[#CED4DA] rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-[#1A1C1E] block mb-1">Nama Proktor CBT:</label>
                <input
                  type="text"
                  value={beritaAcaraData.proktor}
                  onChange={e => setBeritaAcaraData(prev => ({ ...prev, proktor: e.target.value }))}
                  className="w-full px-2.5 py-1.5 bg-white border border-[#CED4DA] rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="font-semibold text-[#1A1C1E] block mb-1">
                  Catatan Khusus Pelaksanaan Ujian:
                </label>
                <input
                  type="text"
                  value={beritaAcaraData.catatanKhusus}
                  onChange={e => setBeritaAcaraData(prev => ({ ...prev, catatanKhusus: e.target.value }))}
                  className="w-full px-2.5 py-1.5 bg-white border border-[#CED4DA] rounded-lg"
                  placeholder="Contoh: Ujian berjalan tertib dan lancar..."
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#1A1C1E]">
                    Kehadiran Peserta (Total: <span className="text-emerald-800 font-extrabold">{filteredStudents.length} Siswa</span>):
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-emerald-800 block mb-1">Jumlah Hadir:</label>
                    <input
                      type="number"
                      min={0}
                      max={filteredStudents.length}
                      value={beritaAcaraData.jumlahHadir}
                      onChange={e => handleHadirChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg font-bold text-emerald-800 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-rose-800 block mb-1">Tidak Hadir:</label>
                    <input
                      type="number"
                      min={0}
                      max={filteredStudents.length}
                      value={beritaAcaraData.jumlahTidakHadir}
                      onChange={e => handleTidakHadirChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-rose-300 rounded-lg font-bold text-rose-800 focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PRINTABLE DOCUMENT CONTAINER                                              */}
      {/* ========================================================================= */}
      {printData ? (
        <div
          ref={printableRef}
          className="printable-sheet bg-white max-w-4xl mx-auto shadow-sm border border-[#DEE2E6] rounded-2xl p-3 sm:p-6 md:p-10 text-black leading-normal overflow-x-auto"
          style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
        >
          {/* ===================================================================== */}
          {/* 1. TATA LETAK KARTU PESERTA UJIAN (GRID 4-6 KARTU PER HALAMAN A4)     */}
          {/* ===================================================================== */}
          {docType === 'cards' && (
            <div className="space-y-8">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-xl">
                  Tidak ada data siswa yang cocok dengan filter yang dipilih.
                </div>
              ) : (
                studentPages.map((pageItem, pageIdx) => (
                  <div
                    key={pageIdx}
                    className={`print-page-chunk ${
                      pageIdx < studentPages.length - 1 ? 'break-after-page' : ''
                    }`}
                  >
                    {/* Page Header Indicator (Screen view only) */}
                    <div className="no-print pb-2 mb-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 font-semibold">
                      <span className="font-bold text-emerald-800">
                        Lembar Halaman Cetak #{pageItem.pageIndex} ({pageItem.className})
                      </span>
                      <span>{pageItem.students.length} Kartu Siswa di Halaman Ini</span>
                    </div>

                    {/* Student Cards Grid Layout */}
                    <div
                      className={
                        cardGridMode === 'GRID_6'
                          ? 'grid grid-cols-1 sm:grid-cols-2 print-card-grid-6 gap-3 sm:gap-4'
                          : cardGridMode === 'GRID_4'
                          ? 'grid grid-cols-1 sm:grid-cols-2 print-card-grid-4 gap-4'
                          : 'space-y-6'
                      }
                    >
                      {pageItem.students.map((st, cardIdx) => {
                        const schedules = printData.studentSchedules?.[st.ID] || [];
                        const primaryRoom = schedules[0]?.ROOM || 'Ruang 01';
                        const primarySession = schedules[0]?.SESSION || 'Sesi 1';
                        const nisn = st.NISN || st.NIS || st.USERNAME || `2026${String(cardIdx + 1).padStart(4, '0')}`;
                        const className = (st as any).CLASS_NAME || classMap.get(st.CLASS_ID || '') || (st.CLASS_ID ? `Kelas ${st.CLASS_ID.replace(/^KLS-/i, '')}` : 'Semua Kelas');
                        const classCode = (classMap.get(st.CLASS_ID || '') || st.CLASS_ID || 'X').replace(/^kelas\s*/i, '').replace(/^kls-/i, '').replace(/[^a-zA-Z0-9]/g, '');
                        const noPeserta = `04-${classCode || 'X'}-${String(cardIdx + 1).padStart(3, '0')}`;
                        const passwordDisplay = (st.PASSWORD_HASH && !st.PASSWORD_HASH.startsWith('$2') && !st.PASSWORD_HASH.includes('pbkdf2')) ? st.PASSWORD_HASH : 'Siswa123!';

                        return (
                          <div
                            key={st.ID}
                            className={`border-2 border-black rounded-lg bg-white break-inside-avoid flex flex-col justify-between relative ${
                              cardGridMode === 'GRID_6' ? 'p-3 text-[10px]' : 'p-4 text-xs'
                            }`}
                            style={{
                              breakInside: 'avoid',
                              pageBreakInside: 'avoid',
                              printColorAdjust: 'exact',
                              WebkitPrintColorAdjust: 'exact'
                            }}
                          >
                            {/* KOP KARTU PESERTA */}
                            <div className="border-b-2 border-black pb-2 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2" style={{ flex: '1 1 0%', minWidth: 0 }}>
                                {includeLogo ? (
                                  <div
                                    className="shrink-0 flex items-center justify-center"
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      minWidth: '36px',
                                      maxWidth: '36px',
                                      flexShrink: 0,
                                      marginRight: '8px'
                                    }}
                                  >
                                    {schoolSettings.LOGO_URL === 'MUHAMMADIYAH_STANDARD' ? (
                                      <MuhammadiyahLogoSvg size={34} className="w-9 h-9" />
                                    ) : schoolSettings.LOGO_URL && schoolSettings.LOGO_URL !== '/logo-ma-cikaramas.svg' ? (
                                      <img
                                        src={schoolSettings.LOGO_URL}
                                        alt="Logo"
                                        className="max-h-9 max-w-9 object-contain"
                                        style={{ maxHeight: '34px', maxWidth: '34px', objectFit: 'contain', display: 'block' }}
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <MaCikaramasLogoSvg
                                        size={34}
                                        className="w-9 h-9"
                                        idSuffix={`card-${st.ID || cardIdx}`}
                                      />
                                    )}
                                  </div>
                                ) : null}
                                <div className="leading-tight" style={{ flex: '1 1 0%', minWidth: 0 }}>
                                  <div className="text-[8px] uppercase font-bold text-slate-700 truncate">
                                    {schoolSettings.KOP_HEADER_1 || 'MAJELIS PENDIDIKAN DASAR DAN MENENGAH'}
                                  </div>
                                  <div className="text-[11px] sm:text-xs font-black uppercase text-black tracking-tight font-serif truncate">
                                    {schoolSettings.SCHOOL_NAME || 'MA. MUHAMMADIYAH CIKARAMAS'}
                                  </div>
                                  <div className="text-[8.5px] font-bold text-emerald-800 font-serif truncate">
                                    KARTU PESERTA {assessmentTitle.toUpperCase()} • TP {schoolYear} - {cleanSemesterLabel}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0" style={{ flexShrink: 0 }}>
                                <span className="font-mono font-bold text-[9.5px] px-1.5 py-0.5 rounded border border-black bg-slate-100 block whitespace-nowrap">
                                  {noPeserta}
                                </span>
                              </div>
                            </div>

                            {/* DATA SISWA & FOTO & QR CODE */}
                            <div className="py-2.5 flex items-start justify-between gap-2 sm:gap-3">
                              {/* Rincian Identitas */}
                              <div className="flex-1 min-w-0 space-y-1">
                                <table className="w-full text-left leading-snug">
                                  <tbody>
                                    <tr>
                                      <td className="w-20 text-slate-700 font-semibold py-0.5 shrink-0">Nama Siswa</td>
                                      <td className="font-bold text-black uppercase py-0.5 break-words">: {st.NAME}</td>
                                    </tr>
                                    <tr>
                                      <td className="text-slate-700 font-semibold py-0.5 shrink-0">NISN / NIS</td>
                                      <td className="font-mono font-bold py-0.5 break-all">: {nisn}</td>
                                    </tr>
                                    <tr>
                                      <td className="text-slate-700 font-semibold py-0.5 shrink-0">Username CBT</td>
                                      <td className="font-mono font-bold text-black py-0.5 break-all">: {st.USERNAME}</td>
                                    </tr>
                                    <tr>
                                      <td className="text-slate-700 font-semibold py-0.5 shrink-0">Password CBT</td>
                                      <td className="font-mono font-bold text-black py-0.5 break-all">: {passwordDisplay}</td>
                                    </tr>
                                    <tr>
                                      <td className="text-slate-700 font-semibold py-0.5 shrink-0">Kelas / Rombel</td>
                                      <td className="font-bold py-0.5 break-words">: {className}</td>
                                    </tr>
                                    <tr>
                                      <td className="text-slate-700 font-semibold py-0.5 shrink-0">Ruang & Sesi</td>
                                      <td className="font-bold py-0.5 text-[#0052CC] break-words">
                                        : {primaryRoom} / {primarySession}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              {/* Foto Placeholder 3x4 + QR Code */}
                              <div className="flex flex-col items-center gap-1.5 shrink-0">
                                <div
                                  className={`border border-black rounded flex flex-col items-center justify-center bg-slate-50 font-bold text-slate-400 ${
                                    cardGridMode === 'GRID_6' ? 'w-14 h-18 text-[9px]' : 'w-16 h-20 text-[10px]'
                                  }`}
                                >
                                  <span>FOTO</span>
                                  <span>3 x 4</span>
                                </div>
                                <SvgQrCode value={`CBT-MASC-${st.ID}-${nisn}`} size={cardGridMode === 'GRID_6' ? 44 : 50} />
                              </div>
                            </div>

                            {/* TABEL JADWAL JIKA MODE WITH_SCHEDULE */}
                            {cardGridMode === 'WITH_SCHEDULE' && schedules.length > 0 && (
                              <div className="py-2 border-t border-black">
                                <div className="text-[10px] font-bold uppercase mb-1">Jadwal Ujian Siswa:</div>
                                <table className="w-full text-[10px] border border-black border-collapse">
                                  <thead>
                                    <tr className="bg-slate-100 border-b border-black">
                                      <th className="p-1 border-r border-black text-left">Mata Pelajaran</th>
                                      <th className="p-1 border-r border-black text-center">Tanggal</th>
                                      <th className="p-1 border-r border-black text-center">Waktu</th>
                                      <th className="p-1 text-center">Ruang/Sesi</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {schedules.slice(0, 8).map((sc, scIdx) => (
                                      <tr key={scIdx} className="border-b border-black last:border-0">
                                        <td className="p-1 border-r border-black font-medium">{sc.SUBJECT_NAME}</td>
                                        <td className="p-1 border-r border-black text-center font-mono">{sc.FORMATTED_DATE || sc.EXAM_DATE || '-'}</td>
                                        <td className="p-1 border-r border-black text-center font-mono">{sc.START_TIME || '07:30'} - {calculateEndTime(sc.START_TIME, sc.DURATION_MIN)}</td>
                                        <td className="p-1 text-center">{sc.ROOM || 'R.01'} / {sc.SESSION || 'S.1'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* BARCODE & SIGNATURE FOOTER */}
                            <div className="border-t border-black pt-1.5 mt-auto">
                              <div className="flex items-end justify-between gap-1.5">
                                {/* Barcode Horizontal */}
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <SvgBarcode value={nisn} width={cardGridMode === 'GRID_6' ? 95 : 120} height={18} showText />
                                </div>

                                {/* Tanda Tangan Kepala Madrasah */}
                                <div className="w-28 sm:w-32 text-center text-[8.5px] leading-tight shrink-0 flex flex-col justify-between h-20">
                                  <div>
                                    <div className="truncate">
                                      {(schoolSettings.SCHOOL_CITY || 'Sumedang').replace(/^Kabupaten\s+/i, 'Kab. ')}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                    <div className="font-semibold">{schoolSettings.PRINCIPAL_TITLE || 'Kepala Madrasah'},</div>
                                  </div>
                                  <div className="mt-auto">
                                    <div className="font-bold underline text-black truncate">
                                      {schoolSettings.PRINCIPAL_NAME || 'Ai Sukaesih, S.Pd'}
                                    </div>
                                    <div className="font-mono text-[7.5px] text-slate-700">
                                      NBM. {schoolSettings.PRINCIPAL_NIP || '1281201'}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="text-[7.5px] text-slate-500 italic mt-1 border-t border-dashed border-slate-300 pt-0.5 text-center">
                                *Wajib dibawa saat asesmen & jaga kerahasiaan password akun CBT Anda.
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* 2. BERITA ACARA PELAKSANAAN UJIAN                                     */}
          {/* ===================================================================== */}
          {docType === 'minutes' && (
            <div className="space-y-6 text-black text-xs leading-relaxed">
              {/* KOP RESMI MADRASAH SESUAI FORMAT RESMI (TANPA LOGO KEMENAG KANAN) */}
              <OfficialKopSurat
                settings={schoolSettings}
                showLogo={includeLogo}
                idSuffix="ba"
              />

              {/* JUDUL BERITA ACARA */}
              <div className="text-center space-y-1 pt-1">
                <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wide underline text-black">
                  BERITA ACARA PELAKSANAAN {assessmentTitle.toUpperCase()}
                </h3>
                <div className="text-[11px] font-semibold text-slate-800">
                  Tahun Pelajaran {schoolYear} - {cleanSemesterLabel}
                </div>
              </div>

              {/* PERNYATAAN PEMBUKA */}
              <p className="text-justify indent-8 leading-relaxed">
                Pada hari ini, <b>{new Date().toLocaleDateString('id-ID', { weekday: 'long' })}</b>, tanggal{' '}
                <b>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</b>, bertempat di{' '}
                <b>{schoolSettings.SCHOOL_NAME || 'MAS Muhammadiyah Cikaramas'}</b>, telah diselenggarakan pelaksanaan ujian CBT dengan rincian data sebagai berikut:
              </p>

              {/* TABEL RINCIAN MATA PELAJARAN & PELAKSANAAN */}
              <div className="border border-black rounded overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="w-48 p-2 font-semibold bg-slate-100 border-r border-black">Mata Pelajaran</td>
                      <td className="p-2 font-bold text-black uppercase">
                        {printData.exam?.SUBJECT_NAME || 'Mata Pelajaran CBT'}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-2 font-semibold bg-slate-100 border-r border-black">Jenis Penilaian / Ujian</td>
                      <td className="p-2 font-bold text-black">{assessmentTitle}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-2 font-semibold bg-slate-100 border-r border-black">Kelas / Rombel</td>
                      <td className="p-2 font-semibold">
                        {selectedClassId === 'ALL'
                          ? `Semua Kelas (${studentsByClass.map(g => g.className).join(', ') || 'Semua Rombel'})`
                          : (currentSelectedClassName || printData.exam?.CLASS_NAME || 'Semua Kelas')}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-2 font-semibold bg-slate-100 border-r border-black">Hari & Tanggal Ujian</td>
                      <td className="p-2 font-mono">
                        {printData.exam?.FORMATTED_DATE || new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-2 font-semibold bg-slate-100 border-r border-black">Waktu & Durasi</td>
                      <td className="p-2 font-mono font-bold">
                        {formatExamTimeRange(printData.exam?.START_TIME, printData.exam?.DURATION_MIN)}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-2 font-semibold bg-slate-100 border-r border-black">Ruang & Sesi</td>
                      <td className="p-2 font-bold text-black">
                        {printData.exam?.ROOM || (selectedRoom === 'ALL' ? 'Ruang 01 / Lab Komputer' : selectedRoom)} •{' '}
                        {printData.exam?.SESSION || (selectedSession === 'ALL' ? 'Sesi 1' : selectedSession)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* TABEL STATISTIK KEHADIRAN PESERTA */}
              <div className="space-y-2">
                <div className="font-bold uppercase text-[11px] text-black">
                  I. Rincian Kehadiran Peserta Ujian:
                </div>
                <table className="w-full text-xs border border-black border-collapse text-center">
                  <thead>
                    <tr className="bg-slate-100 border-b border-black font-bold">
                      <th className="p-2 border-r border-black w-12">No</th>
                      <th className="p-2 border-r border-black text-left">Keterangan Kehadiran</th>
                      <th className="p-2 border-r border-black w-32">Jumlah Peserta</th>
                      <th className="p-2">Persentase</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black">
                    <tr>
                      <td className="p-2 border-r border-black font-mono">1</td>
                      <td className="p-2 border-r border-black text-left font-semibold">Jumlah Peserta Terdaftar (Seharusnya Hadir)</td>
                      <td className="p-2 border-r border-black font-bold font-mono">{filteredStudents.length} Siswa</td>
                      <td className="p-2 font-mono font-bold">100%</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-black font-mono">2</td>
                      <td className="p-2 border-r border-black text-left text-emerald-800 font-semibold">Jumlah Peserta Hadir</td>
                      <td className="p-2 border-r border-black font-mono font-bold text-emerald-800">
                        {beritaAcaraData.jumlahHadir} Siswa
                      </td>
                      <td className="p-2 font-mono font-bold text-emerald-800">
                        {filteredStudents.length > 0
                          ? Math.round((beritaAcaraData.jumlahHadir / filteredStudents.length) * 100)
                          : 0}%
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-black font-mono">3</td>
                      <td className="p-2 border-r border-black text-left text-rose-800 font-semibold">Jumlah Peserta Tidak Hadir</td>
                      <td className="p-2 border-r border-black font-mono font-bold text-rose-800">
                        {beritaAcaraData.jumlahTidakHadir} Siswa
                      </td>
                      <td className="p-2 font-mono font-bold text-rose-800">
                        {filteredStudents.length > 0
                          ? Math.round((beritaAcaraData.jumlahTidakHadir / filteredStudents.length) * 100)
                          : 0}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* TABEL RINCIAN PER KELAS JIKA SEMUA KELAS DIPILIH */}
              {selectedClassId === 'ALL' && studentsByClass.length > 1 && (
                <div className="space-y-2">
                  <div className="font-bold uppercase text-[11px] text-black">
                    II. Rincian Jumlah Peserta per Kelas / Rombel:
                  </div>
                  <table className="w-full text-xs border border-black border-collapse text-center">
                    <thead>
                      <tr className="bg-slate-100 border-b border-black font-bold">
                        <th className="p-2 border-r border-black w-12">No</th>
                        <th className="p-2 border-r border-black text-left">Nama Kelas / Rombel</th>
                        <th className="p-2 border-r border-black w-32">Jumlah Siswa</th>
                        <th className="p-2 text-left">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                      {studentsByClass.map((grp, idx) => (
                        <tr key={grp.classId}>
                          <td className="p-2 border-r border-black font-mono">{idx + 1}</td>
                          <td className="p-2 border-r border-black text-left font-bold text-black">
                            {grp.className}
                          </td>
                          <td className="p-2 border-r border-black font-mono font-bold">
                            {grp.students.length} Siswa
                          </td>
                          <td className="p-2 text-left text-slate-600">
                            Terdaftar aktif pada jadwal ujian ini
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* CATATAN KHUSUS PELAKSANAAN */}
              <div className="space-y-1">
                <div className="font-bold uppercase text-[11px] text-black">
                  {selectedClassId === 'ALL' && studentsByClass.length > 1 ? 'III' : 'II'}. Catatan Khusus Pelaksanaan Ujian:
                </div>
                <div className="p-3 border border-black rounded min-h-[50px] bg-slate-50 italic text-[11px] leading-relaxed">
                  {beritaAcaraData.catatanKhusus || 'Ujian berlangsung lancar tanpa kendala teknis berarti.'}
                </div>
              </div>

              {/* PERNYATAAN PENUTUP */}
              <p className="text-justify">
                Demikian Berita Acara ini dibuat dengan sebenarnya dan ditandatangani oleh Pengawas Ruang serta Proktor untuk dapat dipergunakan sebagaimana mestinya.
              </p>

              {/* KOLOM TANDA TANGAN PENGAWAS & KEPALA MADRASAH */}
              <div className="pt-6 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                {/* Titimangsa Tempat & Tanggal Dokumen */}
                <div className="flex justify-end text-xs mb-3">
                  <div className="w-1/3 text-center">
                    {(schoolSettings.SCHOOL_CITY || 'Sumedang').replace(/^Kabupaten\s+/i, '')}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 text-center text-xs">
                  {/* Mengetahui Kepala Madrasah */}
                  <div className="flex flex-col justify-between h-36">
                    <div>
                      <div className="font-medium">Mengetahui,</div>
                      <div className="font-bold">{schoolSettings.PRINCIPAL_TITLE || 'Kepala Madrasah'}</div>
                    </div>
                    <div className="mt-auto">
                      <div className="font-bold underline text-black uppercase">
                        {schoolSettings.PRINCIPAL_NAME || 'Ai Sukaesih, S.Pd'}
                      </div>
                      <div className="font-mono text-[11px] text-slate-800">
                        NBM. {schoolSettings.PRINCIPAL_NIP || '1281201'}
                      </div>
                    </div>
                  </div>

                  {/* Proktor CBT */}
                  <div className="flex flex-col justify-between h-36">
                    <div>
                      <div className="font-bold">Proktor CBT,</div>
                      <div className="text-[11px] text-slate-700">{schoolSettings.SCHOOL_NAME || 'MAS Muhammadiyah Cikaramas'}</div>
                    </div>
                    <div className="mt-auto">
                      <div className="font-bold underline text-black uppercase">
                        {beritaAcaraData.proktor || 'Asep Saepuloh, S.Kom'}
                      </div>
                      <div className="font-mono text-[11px] text-slate-800">
                        {beritaAcaraData.proktorNbm ? (beritaAcaraData.proktorNbm.startsWith('NBM') ? beritaAcaraData.proktorNbm : `NBM. ${beritaAcaraData.proktorNbm}`) : 'NBM. 1281209'}
                      </div>
                    </div>
                  </div>

                  {/* Pengawas Ruang */}
                  <div className="flex flex-col justify-between h-36">
                    <div>
                      <div className="font-bold">Pengawas Ruang,</div>
                      <div className="text-[11px] text-slate-700">Ruang Asesmen CBT</div>
                    </div>
                    <div className="mt-auto">
                      <div className="font-bold underline text-black uppercase">
                        {beritaAcaraData.pengawas1 || printData.exam?.SUPERVISOR || 'Ai Sukaesih, S.Pd'}
                      </div>
                      <div className="font-mono text-[11px] text-slate-800">
                        {beritaAcaraData.pengawas1Nbm ? (beritaAcaraData.pengawas1Nbm.startsWith('NBM') ? beritaAcaraData.pengawas1Nbm : `NBM. ${beritaAcaraData.pengawas1Nbm}`) : 'NBM. 1281201'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* 3. DAFTAR HADIR PESERTA UJIAN (PER KELAS / ROMBEL)                    */}
          {/* ===================================================================== */}
          {docType === 'attendance' && (
            <div className="space-y-10 text-black text-xs">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-xl">
                  Tidak ada data siswa yang cocok dengan filter yang dipilih.
                </div>
              ) : (
                studentsByClass.map((classGroup, groupIdx) => (
                  <div
                    key={classGroup.classId}
                    className={`space-y-6 ${
                      groupIdx < studentsByClass.length - 1 ? 'break-after-page' : ''
                    }`}
                  >
                    {/* Screen View Indicator */}
                    {studentsByClass.length > 1 && (
                      <div className="no-print pb-1 mb-2 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 font-semibold">
                        <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold">
                          Bagian #{groupIdx + 1}: {classGroup.className}
                        </span>
                        <span>{classGroup.students.length} Siswa Terdaftar</span>
                      </div>
                    )}

                    {/* KOP DAFTAR HADIR SESUAI FORMAT RESMI (TANPA LOGO KEMENAG KANAN) */}
                    <OfficialKopSurat
                      settings={schoolSettings}
                      showLogo={includeLogo}
                      idSuffix={`dh-${groupIdx}`}
                      compact
                    />

                    {/* JUDUL DAFTAR HADIR PESERTA */}
                    <div className="text-center space-y-0.5 py-1">
                      <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wide underline font-serif text-black">
                        DAFTAR HADIR PESERTA {assessmentTitle.toUpperCase()}
                      </h3>
                      <div className="text-[11px] font-semibold text-slate-800 font-serif">
                        TAHUN PELAJARAN {schoolYear} - {cleanSemesterLabel.toUpperCase()}
                      </div>
                    </div>

                    {/* DATA HEADER UJIAN */}
                    <div className="grid grid-cols-2 gap-4 text-xs border border-black p-3 rounded bg-slate-50">
                      <div className="space-y-1">
                        <div>Mata Pelajaran: <b className="uppercase">{printData.exam?.SUBJECT_NAME || 'Mata Pelajaran'}</b></div>
                        <div>Jenis Penilaian: <b className="text-black">{assessmentTitle}</b></div>
                        <div>Ruang & Sesi: <b>{printData.exam?.ROOM || (selectedRoom === 'ALL' ? 'Ruang 01 / Lab Komputer' : selectedRoom)} / {printData.exam?.SESSION || (selectedSession === 'ALL' ? 'Sesi 1' : selectedSession)}</b></div>
                      </div>
                      <div className="space-y-1">
                        <div>Kelas / Rombel: <b className="text-black">{classGroup.className}</b> (Total: <b>{classGroup.students.length} Siswa</b>)</div>
                        <div>Hari, Tanggal: <b>{printData.exam?.FORMATTED_DATE || new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b></div>
                        <div>Waktu & Durasi: <b className="font-mono">{formatExamTimeRange(printData.exam?.START_TIME, printData.exam?.DURATION_MIN)}</b></div>
                      </div>
                    </div>

                    {/* TABEL TANDA TANGAN HADIR ZIG-ZAG */}
                    <table className="w-full text-xs border border-black border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-black font-bold text-center">
                          <th className="p-2 border-r border-black w-10">No</th>
                          <th className="p-2 border-r border-black w-28 text-left">NISN / NIS</th>
                          <th className="p-2 border-r border-black text-left">Nama Lengkap Peserta</th>
                          <th className="p-2 border-r border-black w-24">Kelas</th>
                          <th className="p-2 text-center w-48">Tanda Tangan Peserta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black">
                        {classGroup.students.map((st, i) => {
                          const nisn = st.NISN || st.NIS || st.USERNAME;
                          return (
                            <tr key={st.ID} className="break-inside-avoid">
                              <td className="p-2 border-r border-black text-center font-mono">{i + 1}</td>
                              <td className="p-2 border-r border-black font-mono font-semibold">{nisn}</td>
                              <td className="p-2 border-r border-black font-bold uppercase">{st.NAME}</td>
                              <td className="p-2 border-r border-black text-center font-medium">
                                {classGroup.className.replace(/^Kelas\s+/i, '')}
                              </td>
                              <td className="p-2 text-left font-mono text-[11px]">
                                {i % 2 === 0 ? `${i + 1}. ..................` : `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${i + 1}. ..................`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* TANDA TANGAN RESMI DAFTAR HADIR */}
                    <div className="pt-6 break-inside-avoid text-xs" style={{ pageBreakInside: 'avoid' }}>
                      <div className="flex justify-between items-start px-2">
                        {/* Kiri: Mengetahui Kepala Madrasah */}
                        <div className="w-64 text-center flex flex-col justify-between h-36">
                          <div>
                            <div className="font-medium">Mengetahui,</div>
                            <div className="font-bold">{schoolSettings.PRINCIPAL_TITLE || 'Kepala Madrasah'}</div>
                          </div>
                          <div className="mt-auto">
                            <div className="font-bold underline text-black uppercase">
                              {schoolSettings.PRINCIPAL_NAME || 'Ai Sukaesih, S.Pd'}
                            </div>
                            <div className="font-mono text-[11px] text-slate-800">
                              NBM. {schoolSettings.PRINCIPAL_NIP || '1281201'}
                            </div>
                          </div>
                        </div>

                        {/* Kanan: Titimangsa & Pengawas Ruang */}
                        <div className="w-64 text-center flex flex-col justify-between h-36">
                          <div>
                            <div>
                              {(schoolSettings.SCHOOL_CITY || 'Sumedang').replace(/^Kabupaten\s+/i, '')}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                            <div className="font-bold">Pengawas Ruang,</div>
                          </div>
                          <div className="mt-auto">
                            <div className="font-bold underline text-black uppercase">
                              {beritaAcaraData.pengawas1 || printData.exam?.SUPERVISOR || 'Ai Sukaesih, S.Pd'}
                            </div>
                            <div className="font-mono text-[11px] text-slate-800">
                              {beritaAcaraData.pengawas1Nbm ? (beritaAcaraData.pengawas1Nbm.startsWith('NBM') ? beritaAcaraData.pengawas1Nbm : `NBM. ${beritaAcaraData.pengawas1Nbm}`) : 'NBM. 1281201'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 italic mt-4 pt-1 border-t border-dotted border-slate-300 text-center">
                        * Lembar daftar hadir resmi untuk verifikasi kehadiran peserta ujian kelas {classGroup.className}.
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 text-center text-[#6C757D] bg-white border border-[#DEE2E6] rounded-2xl">
          Sedang menyiapkan data pratinjau dokumen cetak...
        </div>
      )}
    </div>
  );
};

export default CetakDokumenUjian;

