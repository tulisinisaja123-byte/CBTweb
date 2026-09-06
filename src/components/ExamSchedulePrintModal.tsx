import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Printer,
  X,
  Calendar,
  Layers,
  Filter,
  CheckCircle2,
  ExternalLink,
  Download,
  Building2,
  Sliders,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import { Exam, ClassItem, Subject, AssessmentType, SchoolSettings } from '../types';
import { calculateEndTime, getSchoolSettings as getLocalSchoolSettings } from '../services/lmsStorage';
import { DEFAULT_SETTINGS } from '../data/initialData';
import { printElementReliable } from '../utils/printHelper';
import { MaCikaramasLogoSvg, MuhammadiyahLogoSvg } from './OfficialLogos';
import { OfficialKopSurat } from './OfficialKopSurat';

interface ExamSchedulePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: Exam[];
  classes: ClassItem[];
  subjects: Subject[];
  assessmentTypes: AssessmentType[];
  settings?: SchoolSettings | null;
  onShowToast?: (msg: string) => void;
}

// Clean and normalize semester string (avoiding 'SEMESTER SEMESTER 1 & 2')
export function getCleanSemester(raw?: string): string {
  if (!raw) return 'GANJIL';
  let s = raw.trim();
  // Strip redundant leading "semester" case-insensitively
  s = s.replace(/^semester\s+/i, '').trim();
  if (!s) return 'GANJIL';
  // If stored as "1 (Ganjil)" or "1", normalize cleanly
  if (s.toLowerCase().includes('ganjil') || s === '1') {
    return '1 (GANJIL)';
  }
  if (s.toLowerCase().includes('genap') || s === '2') {
    return '2 (GENAP)';
  }
  return s.toUpperCase();
}

// Format safe Indonesian Date
function formatIndonesianDate(dateStr?: string): string {
  if (!dateStr || dateStr === 'Tanpa Tanggal') return 'Tanpa Tanggal';
  try {
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

// Format compact date: Hari di atas, DD/MM/YYYY di bawah untuk menghemat ruang tabel
function formatCompactDate(dateStr?: string): { dayName: string; dateNum: string } {
  if (!dateStr || dateStr === 'Tanpa Tanggal') return { dayName: 'Hari', dateNum: '-' };
  try {
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        const dayName = d.toLocaleDateString('id-ID', { weekday: 'long' });
        const dd = String(day).padStart(2, '0');
        const mm = String(month + 1).padStart(2, '0');
        return { dayName, dateNum: `${dd}/${mm}/${year}` };
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'long' });
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return { dayName, dateNum: `${dd}/${mm}/${yyyy}` };
    }
    return { dayName: dateStr, dateNum: '' };
  } catch {
    return { dayName: dateStr, dateNum: '' };
  }
}

export const ExamSchedulePrintModal: React.FC<ExamSchedulePrintModalProps> = ({
  isOpen,
  onClose,
  exams = [],
  classes = [],
  subjects = [],
  assessmentTypes = [],
  settings,
  onShowToast
}) => {
  const activeSettings = useMemo(() => {
    return {
      ...DEFAULT_SETTINGS,
      ...getLocalSchoolSettings(),
      ...(settings || {})
    };
  }, [settings]);

  const [paperSize, setPaperSize] = useState<'A4' | 'F4'>('A4');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [includeKop, setIncludeKop] = useState<boolean>(true);
  const [includeLogo, setIncludeLogo] = useState<boolean>(true);
  const [includeSignature, setIncludeSignature] = useState<boolean>(true);

  // Lookups
  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.ID, s.NAME])), [subjects]);
  const assessmentMap = useMemo(() => new Map(assessmentTypes.map(a => [a.ID, a.NAME])), [assessmentTypes]);

  // Judul dinamis otomatis berdasarkan jenis asesmen yang dipilih & pengaturan madrasah
  const dynamicAssessmentTitle = useMemo(() => {
    const rawSem = activeSettings.SEMESTER || '1 (Ganjil)';
    let semWord = 'Ganjil';
    if (rawSem.toLowerCase().includes('genap') || rawSem === '2') {
      semWord = 'Genap';
    } else if (rawSem.toLowerCase().includes('ganjil') || rawSem === '1') {
      semWord = 'Ganjil';
    } else {
      semWord = rawSem.replace(/^semester\s+/i, '').trim();
    }

    const sy = activeSettings.SCHOOL_YEAR || '2026/2027';

    let asmName = '';
    if (selectedAssessmentId !== 'ALL') {
      asmName = assessmentMap.get(selectedAssessmentId) || '';
    }
    if (!asmName) {
      // Jika filter ALL tapi semua exam punya jenis asesmen yang sama
      const asmIds = Array.from(new Set(exams.map(e => e.ASSESSMENT_TYPE_ID).filter(Boolean)));
      if (asmIds.length === 1 && assessmentMap.get(asmIds[0])) {
        asmName = assessmentMap.get(asmIds[0]) || '';
      }
    }
    if (!asmName) {
      asmName = activeSettings.DEFAULT_ASSESSMENT_NAME || activeSettings.ASSESSMENT_TITLE || 'Sumatif Akhir Semester (SAS)';
    }

    // Bersihkan kode di dalam kurung jika ada (misal "Sumatif Akhir Semester (SAS)" -> "Sumatif Akhir Semester")
    const cleanAsm = asmName.replace(/\s*\([A-Z0-9]+\)\s*$/i, '').trim();

    return `JADWAL PELAKSANAAN ${cleanAsm.toUpperCase()} ${semWord.toUpperCase()} TAHUN PELAJARAN ${sy}`;
  }, [selectedAssessmentId, assessmentMap, exams, activeSettings]);

  const [documentTitle, setDocumentTitle] = useState<string>(dynamicAssessmentTitle);

  // Sinkronkan judul setiap kali filter jenis asesmen berubah
  useEffect(() => {
    setDocumentTitle(dynamicAssessmentTitle);
  }, [dynamicAssessmentTitle]);

  // Titimangsa otomatis menggunakan Kabupaten dari pengaturan
  const defaultKabupaten = useMemo(() => {
    const rawCity = activeSettings.SCHOOL_CITY?.trim() || '';
    if (!rawCity) return 'Kabupaten Sumedang';
    if (rawCity.toLowerCase().startsWith('kab')) return rawCity;
    return `Kabupaten ${rawCity}`;
  }, [activeSettings.SCHOOL_CITY]);

  const [titimangsaLocation, setTitimangsaLocation] = useState<string>(defaultKabupaten);

  useEffect(() => {
    setTitimangsaLocation(defaultKabupaten);
  }, [defaultKabupaten]);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Registered classes (sesuai jumlah kelas yang terdaftar di data kelas)
  const registeredClasses = useMemo(() => {
    return classes.filter(c => c.ID !== 'ALL' && c.ACTIVE !== false);
  }, [classes]);

  // Unique dates in exams
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    exams.forEach(e => {
      if (e.EXAM_DATE) set.add(e.EXAM_DATE);
    });
    return Array.from(set).sort();
  }, [exams]);

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      if (selectedAssessmentId !== 'ALL' && e.ASSESSMENT_TYPE_ID !== selectedAssessmentId) return false;
      if (selectedDate !== 'ALL' && e.EXAM_DATE !== selectedDate) return false;
      return true;
    });
  }, [exams, selectedAssessmentId, selectedDate]);

  // Group exams by Date and Time Slot for the dynamic multi-class matrix
  const scheduleTimeSlots = useMemo(() => {
    interface TimeSlotGroup {
      key: string;
      date: string;
      startTime: string;
      endTime: string;
      durationMin: number;
      session: string;
      room: string;
      assessmentName: string;
      classSubjects: { [classId: string]: string[] };
      supervisors: string[];
    }

    const slotMap = new Map<string, TimeSlotGroup>();

    filteredExams.forEach(ex => {
      const date = ex.EXAM_DATE || 'Tanpa Tanggal';
      const startTime = ex.START_TIME || '07:30';
      const durationMin = ex.DURATION_MIN || 90;
      const endTime = ex.END_TIME || calculateEndTime(startTime, durationMin);
      const slotKey = `${date}___${startTime}___${endTime}`;

      if (!slotMap.has(slotKey)) {
        slotMap.set(slotKey, {
          key: slotKey,
          date,
          startTime,
          endTime,
          durationMin,
          session: ex.SESSION || '',
          room: ex.ROOM || '',
          assessmentName: ex.ASSESSMENT_TYPE_ID ? (assessmentMap.get(ex.ASSESSMENT_TYPE_ID) || ex.ASSESSMENT_TYPE_ID) : '',
          classSubjects: {},
          supervisors: []
        });
      }

      const slot = slotMap.get(slotKey)!;

      if (ex.SUPERVISOR && !slot.supervisors.includes(ex.SUPERVISOR)) {
        slot.supervisors.push(ex.SUPERVISOR);
      }

      const subName = (ex as any).SUBJECT_NAME || subjectMap.get(ex.SUBJECT_ID) || ex.SUBJECT_ID || 'Mata Pelajaran';

      let targetClassIds: string[] = [];
      if (ex.CLASS_ID === 'ALL' || !ex.CLASS_ID) {
        targetClassIds = registeredClasses.map(c => c.ID);
      } else {
        targetClassIds = [ex.CLASS_ID];
      }

      targetClassIds.forEach(cId => {
        if (!slot.classSubjects[cId]) {
          slot.classSubjects[cId] = [];
        }
        if (!slot.classSubjects[cId].includes(subName)) {
          slot.classSubjects[cId].push(subName);
        }
      });
    });

    return Array.from(slotMap.values()).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
  }, [filteredExams, subjectMap, assessmentMap, registeredClasses]);

  if (!isOpen) return null;

  const schoolName = activeSettings.SCHOOL_NAME || 'MADRASAH ALIYAH MUHAMMADIYAH CIKARAMAS';
  const schoolAddress = activeSettings.SCHOOL_ADDRESS || 'Jl. Raya Cikaramas - Wado No. 12, Sumedang, Jawa Barat';
  const schoolPhone = activeSettings.SCHOOL_PHONE || '(0261) 882190';
  const schoolEmail = activeSettings.SCHOOL_EMAIL || 'info@masmuhammadiyahcikaramas.sch.id';
  const schoolYear = activeSettings.SCHOOL_YEAR || '2026/2027';
  const semesterClean = getCleanSemester(activeSettings.SEMESTER);
  const headmasterName = activeSettings.PRINCIPAL_NAME || 'Ai Sukaesih, S.Pd';
  const headmasterNip = activeSettings.PRINCIPAL_NIP || '1281201';

  // Handler cetak handal yang selalu berfungsi di iframe maupun tab baru
  const handlePrint = () => {
    if (!printAreaRef.current) return;
    const ok = printElementReliable(printAreaRef.current, {
      title: documentTitle,
      paperSize,
      orientation
    });
    if (ok && onShowToast) {
      onShowToast('Jendela cetak dokumen berhasil dibuka.');
    }
  };

  const handleExportCsv = () => {
    const headers = ['NO', 'HARI_TANGGAL', 'WAKTU', 'DURASI', ...registeredClasses.map(c => `KELAS_${c.NAME}`), 'KETERANGAN'];
    const rows: string[][] = [headers];

    scheduleTimeSlots.forEach((slot, idx) => {
      const dateFormatted = formatIndonesianDate(slot.date);
      const timeStr = `${slot.startTime} - ${slot.endTime} WIB`;
      const durStr = `${slot.durationMin} Menit`;
      const classMapel = registeredClasses.map(c => (slot.classSubjects[c.ID] || []).join(' / ') || '-');
      const note = [slot.session ? `Sesi ${slot.session}` : '', slot.room ? `Ruang ${slot.room}` : '', slot.supervisors.length > 0 ? `Pengawas: ${slot.supervisors.join(', ')}` : ''].filter(Boolean).join(' | ') || '-';

      rows.push([
        String(idx + 1),
        `"${dateFormatted}"`,
        `"${timeStr}"`,
        `"${durStr}"`,
        ...classMapel.map(m => `"${m}"`),
        `"${note}"`
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Jadwal_Ujian_${schoolName.replace(/\s+/g, '_')}_${schoolYear.replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('Jadwal berhasil diekspor ke format CSV.');
  };

  return (
    <div id="examSchedulePrintModal" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-7xl max-h-[96vh] flex flex-col overflow-hidden">
        
        {/* HEADER TOOLBAR */}
        <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 grid place-items-center text-white shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Cetak Jadwal Pelaksanaan Ujian Resmi
              </h2>
              <p className="text-xs text-emerald-300">
                Format Matriks: No, Hari/Tanggal, Waktu, Durasi, Kolom Seluruh Rombel, Keterangan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Unduh data tabel dalam format CSV/Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ekspor CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md transition-colors cursor-pointer"
              title="Cetak dokumen resmi atau simpan sebagai PDF"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Cetak / Simpan PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Tutup dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTROLS & FILTER BAR */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Filter Jenis Asesmen */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Jenis Asesmen</label>
            <select
              value={selectedAssessmentId}
              onChange={e => setSelectedAssessmentId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white font-medium text-slate-800"
            >
              <option value="ALL">Semua Jenis Asesmen</option>
              {assessmentTypes.map(a => (
                <option key={a.ID} value={a.ID}>{a.NAME}</option>
              ))}
            </select>
          </div>

          {/* Filter Tanggal */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Tanggal Pelaksanaan</label>
            <select
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white font-medium text-slate-800"
            >
              <option value="ALL">Semua Tanggal ({availableDates.length} Hari)</option>
              {availableDates.map(d => (
                <option key={d} value={d}>{formatIndonesianDate(d)}</option>
              ))}
            </select>
          </div>

          {/* Ukuran Kertas */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Ukuran Kertas</label>
            <select
              value={paperSize}
              onChange={e => setPaperSize(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white font-medium text-slate-800"
            >
              <option value="A4">A4 (210 x 297 mm)</option>
              <option value="F4">F4 / Folio (215 x 330 mm)</option>
            </select>
          </div>

          {/* Orientasi Kertas */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Orientasi</label>
            <select
              value={orientation}
              onChange={e => setOrientation(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white font-medium text-slate-800"
            >
              <option value="landscape">Mendatar (Landscape - Disarankan)</option>
              <option value="portrait">Tegak (Portrait)</option>
            </select>
          </div>

          {/* Titimangsa Kota / Kabupaten */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Titimangsa (Kabupaten)</label>
            <input
              type="text"
              value={titimangsaLocation}
              onChange={e => setTitimangsaLocation(e.target.value)}
              placeholder="Contoh: Kabupaten Sumedang"
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white font-medium text-slate-800"
            />
          </div>

          {/* Toggle Kop, Logo & Tanda Tangan */}
          <div className="flex flex-col justify-end space-y-1">
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeKop}
                  onChange={e => setIncludeKop(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium text-slate-700 text-[11px]">Kop</span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none" title="Sertakan logo resmi pada kop">
                <input
                  type="checkbox"
                  checked={includeLogo}
                  disabled={!includeKop}
                  onChange={e => setIncludeLogo(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 disabled:opacity-40"
                />
                <span className="font-medium text-slate-700 text-[11px]">Logo</span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSignature}
                  onChange={e => setIncludeSignature(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium text-slate-700 text-[11px]">Pengesahan</span>
              </label>
            </div>

            {/* Input Ubah Judul */}
            <input
              type="text"
              value={documentTitle}
              onChange={e => setDocumentTitle(e.target.value)}
              title="Ubah judul dokumen cetak jika diperlukan"
              className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 bg-white font-medium text-slate-700"
              placeholder="Judul Dokumen"
            />
          </div>
        </div>

        {/* PRINTABLE DOCUMENT PREVIEW AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 flex justify-center">
          <div
            ref={printAreaRef}
            className="printable-sheet bg-white text-black p-6 sm:p-8 shadow-md rounded border border-slate-300 w-full max-w-[1100px] space-y-3 font-serif"
            style={{
              minHeight: orientation === 'landscape' ? '210mm' : '297mm'
            }}
          >
            
            {/* KOP SURAT MADRASAH RESMI (TANPA LOGO KEMENAG KANAN) */}
            {includeKop && (
              <OfficialKopSurat
                settings={activeSettings}
                showLogo={includeLogo}
                idSuffix="jadwal-kelas"
                className="mb-2"
              />
            )}

            {/* DOCUMENT TITLE & SUBTITLE */}
            <div className="text-center space-y-0.5 py-1">
              <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider underline font-serif">
                {documentTitle}
              </h3>
              {!documentTitle.toUpperCase().includes('TAHUN PELAJARAN') ? (
                <div className="text-[10.5px] font-semibold text-slate-800 font-serif">
                  TAHUN PELAJARAN {schoolYear} • SEMESTER {semesterClean}
                </div>
              ) : (
                <div className="text-[10.5px] font-semibold text-slate-800 font-serif">
                  SEMESTER {semesterClean} • KELAS X, XI, & XII
                </div>
              )}
            </div>

            {/* THE COMPACT & READABLE MASTER SCHEDULE TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-[10.5px] border border-black border-collapse font-serif table-fixed">
                <thead>
                  {/* Header Baris 1 */}
                  <tr className="bg-slate-100 border-b border-black font-bold text-center">
                    <th rowSpan={2} className="p-1 border border-black w-8 text-center text-[10px]">NO</th>
                    <th rowSpan={2} className="p-1 border border-black w-24 text-center text-[10px]">HARI, TANGGAL</th>
                    <th rowSpan={2} className="p-1 border border-black w-20 text-center text-[10px]">WAKTU</th>
                    <th rowSpan={2} className="p-1 border border-black w-14 text-center text-[10px]">DURASI</th>
                    <th colSpan={registeredClasses.length} className="p-1 border border-black text-center bg-slate-200 text-[10.5px]">
                      MATA PELAJARAN DIUJI BERDASARKAN KELAS / ROMBEL ({registeredClasses.length} KELAS)
                    </th>
                    <th rowSpan={2} className="p-1 border border-black w-24 text-center text-[10px]">KETERANGAN</th>
                  </tr>

                  {/* Header Baris 2: Sub-kolom kelas terdaftar */}
                  <tr className="bg-slate-50 border-b border-black font-bold text-center text-[10px]">
                    {registeredClasses.map(cls => (
                      <th key={cls.ID} className="p-1 border border-black text-center overflow-hidden">
                        <div className="truncate font-bold text-slate-900">{cls.NAME}</div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {scheduleTimeSlots.length > 0 ? (
                    scheduleTimeSlots.map((slot, idx) => {
                      const { dayName, dateNum } = formatCompactDate(slot.date);
                      return (
                        <tr key={slot.key} className="break-inside-avoid hover:bg-slate-50">
                          {/* 1. NO */}
                          <td className="p-1 border border-black text-center font-bold text-[10px]">
                            {idx + 1}
                          </td>

                          {/* 2. HARI & TANGGAL (COMPACT 2 LINES UNTUK MENGHEMAT RUANG) */}
                          <td className="p-1 border border-black text-center font-semibold text-[10px] leading-tight">
                            <div className="font-bold text-slate-900">{dayName}</div>
                            <div className="text-[9px] text-slate-600">{dateNum}</div>
                          </td>

                          {/* 3. WAKTU */}
                          <td className="p-1 border border-black text-center font-mono text-[10px] leading-tight font-semibold">
                            <div>{slot.startTime}</div>
                            <div className="text-[9px] text-slate-500">s/d</div>
                            <div>{slot.endTime}</div>
                          </td>

                          {/* 4. DURASI */}
                          <td className="p-1 border border-black text-center text-[10px]">
                            {slot.durationMin} mnt
                          </td>

                          {/* 5. MATA PELAJARAN SETIAP KELAS TERDAFTAR (DIOPTIMALKAN KETERBACAANNYA) */}
                          {registeredClasses.map(cls => {
                            const subs = slot.classSubjects[cls.ID] || [];
                            return (
                              <td key={cls.ID} className="p-1.5 border border-black text-center align-middle">
                                {subs.length > 0 ? (
                                  <div className="space-y-0.5">
                                    {subs.map((sub, sIdx) => (
                                      <div
                                        key={sIdx}
                                        className="font-bold text-[10.5px] leading-snug text-slate-900 break-words"
                                      >
                                        {sub}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-300 font-sans text-[11px]">-</span>
                                )}
                              </td>
                            );
                          })}

                          {/* 6. KETERANGAN */}
                          <td className="p-1 border border-black text-center text-[9px] leading-tight text-slate-700">
                            {slot.session && <div className="font-semibold text-slate-900">{slot.session}</div>}
                            {slot.room && <div>R. {slot.room}</div>}
                            {slot.supervisors.length > 0 && (
                              <div className="text-[8.5px] text-slate-500 mt-0.5 line-clamp-2">
                                Pgw: {slot.supervisors.join(', ')}
                              </div>
                            )}
                            {!slot.session && !slot.room && slot.supervisors.length === 0 && (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={4 + registeredClasses.length + 1}
                        className="p-6 text-center text-slate-500 font-sans text-xs italic"
                      >
                        Tidak ada data jadwal ujian yang cocok dengan filter yang dipilih.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* LEMBAR PENGESAHAN DENGAN TITIMANGSA KABUPATEN (SIDE-BY-SIDE KIRI & KANAN) */}
            {includeSignature && (
              <div
                className="pt-3 text-xs break-inside-avoid"
                style={{
                  pageBreakInside: 'avoid',
                  breakInside: 'avoid',
                  marginTop: '12px',
                  width: '100%'
                }}
              >
                <div
                  className="flex justify-between items-start px-6"
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    width: '100%',
                    paddingLeft: '24px',
                    paddingRight: '24px'
                  }}
                >
                  {/* Pihak 1: Mengetahui Kepala Madrasah (Sisi Kiri) */}
                  <div
                    className="w-64 text-center flex flex-col justify-between h-28"
                    style={{
                      width: '240px',
                      maxWidth: '45%',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '110px'
                    }}
                  >
                    <div>
                      <div className="font-medium" style={{ fontSize: '10pt' }}>Mengetahui,</div>
                      <div className="font-bold" style={{ fontSize: '10.5pt', fontWeight: 'bold' }}>{activeSettings.PRINCIPAL_TITLE || 'Kepala Madrasah'}</div>
                    </div>
                    <div className="mt-auto" style={{ marginTop: 'auto' }}>
                      <div className="font-bold underline uppercase text-black" style={{ fontSize: '10.5pt', fontWeight: 'bold', textDecoration: 'underline' }}>
                        {headmasterName}
                      </div>
                      <div className="font-mono text-[10px] text-slate-800" style={{ fontSize: '9pt', fontFamily: 'monospace' }}>
                        NBM/NIP. {headmasterNip}
                      </div>
                    </div>
                  </div>

                  {/* Pihak 2: Titimangsa Kabupaten & Ketua Panitia (Sisi Kanan) */}
                  <div
                    className="w-64 text-center flex flex-col justify-between h-28"
                    style={{
                      width: '240px',
                      maxWidth: '45%',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '110px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '10pt' }}>
                        {titimangsaLocation}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <div className="font-bold" style={{ fontSize: '10.5pt', fontWeight: 'bold' }}>Ketua Panitia Asesmen</div>
                    </div>
                    <div className="mt-auto" style={{ marginTop: 'auto' }}>
                      <div className="font-bold underline uppercase text-black" style={{ fontSize: '10.5pt', fontWeight: 'bold', textDecoration: 'underline' }}>
                        {activeSettings.COMMITTEE_CHAIR_NAME || 'Ketua Panitia Ujian'}
                      </div>
                      <div className="font-mono text-[10px] text-slate-800" style={{ fontSize: '9pt', fontFamily: 'monospace' }}>
                        NBM/NIP. {activeSettings.COMMITTEE_CHAIR_NIP || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* FOOTER BAR */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Total Sesi: {scheduleTimeSlots.length} Baris</span>
            <span>•</span>
            <span>Rombel Terdaftar: {registeredClasses.length} Kelas</span>
            <span>•</span>
            <span className="text-emerald-700 font-medium">Titimangsa: {titimangsaLocation}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              <span>Cetak Jadwal Sekarang</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
