import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Users,
  BookOpen,
  Printer,
  RefreshCw,
  Edit3,
  X,
  Info,
  Layers,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  FileSpreadsheet,
  ExternalLink,
  Briefcase,
  Settings
} from 'lucide-react';
import { TimetableDay, TimetableSlot, User } from '../types';
import {
  MA_CIKARAMAS_CLASSES,
  MA_CIKARAMAS_TEACHERS,
  MA_CIKARAMAS_SUBJECTS,
  MA_CIKARAMAS_KOKULIKULER,
  MA_CIKARAMAS_SATURDAY_DAY,
  MA_CIKARAMAS_TIMETABLE_6DAYS,
  lookupSubjectByCode,
  lookupTeacherByCode,
  getTeacherLetterFromCode,
  checkTimetableConflicts,
  validateSlotTeacherAntiClash
} from '../data/curriculumData';
import {
  getTimetable,
  saveTimetable,
  resetTimetable,
  updateTimetableSlot,
  getSchoolSettings
} from '../services/lmsStorage';
import { TimetablePrintModal } from './TimetablePrintModal';
import { MasterTimetableDocument } from './MasterTimetableDocument';
import { TeacherWorkloadTable } from './TeacherWorkloadTable';
import { TimetableFlexibleSetup } from './TimetableFlexibleSetup';

interface TimetableViewProps {
  token: string;
  currentUser: User;
  onShowToast?: (msg: string) => void;
}

export const TimetableView: React.FC<TimetableViewProps> = ({
  token,
  currentUser,
  onShowToast
}) => {
  const [timetable, setTimetable] = useState<TimetableDay[]>(() => getTimetable(token));
  const [selectedDay, setSelectedDay] = useState<string>('SENIN');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'master' | 'matrix' | 'byClass' | 'byTeacher' | 'codes' | 'kokulikuler' | 'workload' | 'setup'>('master');
  const [workDays, setWorkDays] = useState<5 | 6>(5);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const schoolSettings = useMemo(() => getSchoolSettings(), []);

  // Compute active timetable based on 5 or 6 working days
  const activeTimetable = useMemo(() => {
    if (workDays === 6) {
      const hasSabtu = timetable.some(d => d.day.toUpperCase() === 'SABTU');
      if (hasSabtu) return timetable;
      return [...timetable, MA_CIKARAMAS_SATURDAY_DAY];
    } else {
      return timetable.filter(d => d.day.toUpperCase() !== 'SABTU');
    }
  }, [timetable, workDays]);

  // Sync state when timetable changes in database or another component
  useEffect(() => {
    const handleSync = () => {
      setTimetable(getTimetable(token));
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('LMS_TIMETABLE_CHANGED', handleSync);
      return () => {
        window.removeEventListener('LMS_TIMETABLE_CHANGED', handleSync);
      };
    }
  }, [token]);

  // Edit Slot Modal state
  const [editingSlot, setEditingSlot] = useState<{
    dayKey: string;
    periodNumber: number;
    className: string;
    currentCode: string;
    time: string;
  } | null>(null);
  const [slotCodeInput, setSlotCodeInput] = useState('');
  const [slotClashWarning, setSlotClashWarning] = useState<string | null>(null);

  // Detail Inspector Modal
  const [inspectingSlot, setInspectingSlot] = useState<{
    dayLabel: string;
    period: number;
    time: string;
    className: string;
    code: string;
  } | null>(null);

  const canEdit = currentUser.ROLE === 'ADMIN';

  // Conflict Report
  const conflictReport = useMemo(() => {
    return checkTimetableConflicts(timetable);
  }, [timetable]);

  const currentDayData = useMemo(() => {
    return activeTimetable.find(d => d.day.toUpperCase() === selectedDay.toUpperCase()) || activeTimetable[0];
  }, [activeTimetable, selectedDay]);

  const classList = MA_CIKARAMAS_CLASSES.map(c => c.name);

  // Real-time slot validation in edit modal
  const handleSlotCodeChange = (newCode: string) => {
    setSlotCodeInput(newCode);
    if (!editingSlot) return;

    const check = validateSlotTeacherAntiClash(
      timetable,
      editingSlot.dayKey,
      editingSlot.periodNumber,
      editingSlot.className,
      newCode
    );

    if (!check.isValid && check.conflictWith) {
      setSlotClashWarning(
        `PERINGATAN BENTROK: Guru ${check.conflictWith.teacherName} (Mapel: ${check.conflictWith.subjectCode}) sudah dijadwalkan di kelas ${check.conflictWith.className} pada jam ini!`
      );
    } else {
      setSlotClashWarning(null);
    }
  };

  const handleSaveSlot = () => {
    if (!editingSlot) return;
    try {
      const res = updateTimetableSlot(
        token,
        editingSlot.dayKey,
        editingSlot.periodNumber,
        editingSlot.className,
        slotCodeInput
      );
      setTimetable([...res.timetable]);
      setEditingSlot(null);
      if (res.clashCheck && !res.clashCheck.isValid && res.clashCheck.conflictWith) {
        onShowToast?.(`Peringatan: Jadwal disimpan namun terdapat bentrok guru.`);
      } else {
        onShowToast?.(`Jadwal jam ke-${editingSlot.periodNumber} kelas ${editingSlot.className} berhasil diperbarui (Anti-Bentrok Terjaga).`);
      }
    } catch (err: any) {
      onShowToast?.(err.message || 'Gagal menyimpan slot jadwal.');
    }
  };

  const handleReset = () => {
    if (typeof window !== 'undefined' && window.confirm('Kembalikan jadwal ke jadwal resmi master MA Muhammadiyah Cikaramas?')) {
      const res = resetTimetable(token);
      setTimetable([...res.timetable]);
      onShowToast?.('Jadwal resmi berhasil dipulihkan.');
    }
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#DEE2E6] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#E7F0FF] text-[#0052CC] font-bold text-xs">
              JADWAL TATAP MUKA TP 2026/2027
            </span>
            <span className="px-2 py-0.5 rounded bg-[#E6F4EA] text-[#137333] font-semibold text-xs flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Anti-Bentrok Aktif
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1C1E] mt-1 tracking-tight">
            Jadwal Pelajaran MA Muhammadiyah Cikaramas
          </h1>
          <p className="text-xs sm:text-sm text-[#6C757D] mt-0.5">
            Integrasi Kode Guru (Huruf A–T) & Kode Mapel (Angka Sesuai Kurikulum Madrasah Merdeka).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('workload')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-colors ${
              activeTab === 'workload'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
            }`}
            title="Buka Tabel Pembagian Tugas Mengajar & Tugas Tambahan (BKG)"
          >
            <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
            <span>SK Pembagian Tugas</span>
          </button>

          {currentUser.ROLE === 'ADMIN' && (
            <button
              type="button"
              onClick={() => setActiveTab('setup')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-colors ${
                activeTab === 'setup'
                  ? 'bg-[#0052CC] text-white'
                  : 'bg-blue-50 text-[#0052CC] border border-blue-200 hover:bg-blue-100'
              }`}
              title="Setting fleksibel formasi guru, kelas dan kode sandi"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Setting Fleksibel (4 Langkah)</span>
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#DEE2E6] text-xs font-semibold text-[#495057] hover:bg-[#F8F9FA] transition-colors"
              title="Kembalikan ke jadwal master resmi"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Master
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Jadwal
          </button>
        </div>
      </div>

      {/* Anti-Bentrok Health Bar */}
      <div
        className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          conflictReport.hasConflict
            ? 'bg-[#FEF7E0] border-[#FEEFC3] text-[#B06000]'
            : 'bg-[#E6F4EA] border-[#CEEAD6] text-[#137333]'
        }`}
      >
        <div className="flex items-center gap-3">
          {conflictReport.hasConflict ? (
            <AlertTriangle className="w-5 h-5 shrink-0 text-[#B06000]" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-[#137333]" />
          )}
          <div>
            <div className="font-bold text-xs sm:text-sm">
              {conflictReport.hasConflict
                ? `Terdeteksi ${conflictReport.totalConflicts} Konflik Bentrok Jadwal Guru`
                : 'Status Jadwal: 100% Bebas Bentrok (Anti-Collision Verified)'}
            </div>
            <p className="text-[11px] opacity-90">
              {conflictReport.hasConflict
                ? 'Ada guru yang terdaftar mengajar di lebih dari satu kelas pada jam yang sama.'
                : 'Seluruh penugasan guru di 7 rombel kelas diverifikasi terpisah dan tidak ada jam tabrakan.'}
            </p>
          </div>
        </div>

        {conflictReport.hasConflict && (
          <div className="text-xs bg-white/80 px-3 py-1.5 rounded font-mono text-red-700">
            {conflictReport.conflicts.map((c, i) => (
              <span key={i} className="block">
                {c.day} Jam {c.period}: Guru {c.teacherCode} ({c.teacherName}) di kelas {c.classes.join(' & ')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#DEE2E6] overflow-x-auto gap-2 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('master')}
          className={`pb-3 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'master'
              ? 'border-[#0052CC] text-[#0052CC]'
              : 'border-transparent text-[#6C757D] hover:text-[#1A1C1E]'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Dokumen Master (Sesuai Gambar Asli)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`pb-3 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'matrix'
              ? 'border-[#0052CC] text-[#0052CC]'
              : 'border-transparent text-[#6C757D] hover:text-[#1A1C1E]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Jadwal Harian (Per Hari)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('byClass')}
          className={`pb-3 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'byClass'
              ? 'border-[#0052CC] text-[#0052CC]'
              : 'border-transparent text-[#6C757D] hover:text-[#1A1C1E]'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Jadwal Per Rombel Kelas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('byTeacher')}
          className={`pb-3 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'byTeacher'
              ? 'border-[#0052CC] text-[#0052CC]'
              : 'border-transparent text-[#6C757D] hover:text-[#1A1C1E]'
          }`}
        >
          <Users className="w-4 h-4" />
          Jadwal Mengajar Per Guru
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('codes')}
          className={`pb-3 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'codes'
              ? 'border-[#0052CC] text-[#0052CC]'
              : 'border-transparent text-[#6C757D] hover:text-[#1A1C1E]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Kamus Kode Guru & Mapel
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('workload')}
          className={`pb-3 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'workload'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-[#6C757D] hover:text-[#1A1C1E]'
          }`}
        >
          <Briefcase className="w-4 h-4 text-emerald-600" />
          <span>Tabel Pembagian Tugas (BKG)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
            Resmi
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('setup')}
          className={`pb-3 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'setup'
              ? 'border-[#0052CC] text-[#0052CC] font-bold'
              : 'border-transparent text-[#6C757D] hover:text-[#1A1C1E]'
          }`}
        >
          <Layers className="w-4 h-4 text-[#0052CC]" />
          <span>Setting Fleksibel (4 Langkah)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-100 text-[#0052CC]">
            Fleksibel
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('kokulikuler')}
          className={`pb-3 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'kokulikuler'
              ? 'border-[#0052CC] text-[#0052CC]'
              : 'border-transparent text-[#6C757D] hover:text-[#1A1C1E]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Program Kokulikuler (P5/P2RA)
        </button>
      </div>

      {/* TAB 0: Dokumen Master (Format Memanjang Sesuai Gambar Asli & 1 Lembar Pas A4 Landscape) */}
      {activeTab === 'master' && (
        <div className="space-y-4">
          {/* Action Bar Dokumen Master */}
          <div className="bg-white p-4 rounded-lg border border-[#DEE2E6] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  FORMAT ASLI DOKUMEN RESMI (MEMANJANG)
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                  PAS 1 LEMBAR A4 LANDSCAPE
                </span>
              </div>
              <h2 className="text-base font-bold text-[#1A1C1E] mt-1">
                Jadwal Pelajaran Tatap Muka TP {schoolSettings.SCHOOL_YEAR}
              </h2>
              <p className="text-xs text-gray-500">
                Format memanjang dua baris horizontal bertingkat sesuai dokumen asli: Senin (Persiapan Upacara &amp; Upacara), Selasa &amp; Rabu (Do'a/Tadarus), Kamis (Senam), Jum'at (Do'a, Tadarus, Tausyiah &amp; Sholat Jum'at).
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Toggle Opsi 5 Hari Kerja vs 6 Hari Kerja */}
              <div className="flex items-center gap-1 bg-[#F1F3F5] p-1 rounded-md border border-[#CED4DA]">
                <span className="text-[11px] font-semibold text-gray-700 px-1.5">Sistem Kerja:</span>
                <button
                  type="button"
                  onClick={() => setWorkDays(5)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    workDays === 5
                      ? 'bg-[#0052CC] text-white shadow-xs'
                      : 'text-gray-700 hover:text-black hover:bg-gray-200'
                  }`}
                >
                  5 Hari (Senin - Jum'at)
                </button>
                <button
                  type="button"
                  onClick={() => setWorkDays(6)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    workDays === 6
                      ? 'bg-[#0052CC] text-white shadow-xs'
                      : 'text-gray-700 hover:text-black hover:bg-gray-200'
                  }`}
                >
                  6 Hari (Senin - Sabtu)
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak 1 Lembar A4 Landscape</span>
              </button>
            </div>
          </div>

          {/* Master Document Paper View */}
          <div className="bg-slate-100 p-3 sm:p-5 rounded-lg border border-[#CED4DA] overflow-x-auto shadow-inner flex justify-center">
            <div className="bg-white shadow-md rounded-xs max-w-[1300px] w-full">
              <MasterTimetableDocument
                timetable={activeTimetable}
                workDays={workDays}
                settings={schoolSettings}
                fontSize="6.5pt"
                isPrintMode={false}
                token={token}
                onTimetableUpdated={(newT) => {
                  setTimetable([...newT]);
                }}
                onShowToast={onShowToast}
                onSlotClick={(dayLabel, period, time, className, code) => {
                  setInspectingSlot({
                    dayLabel,
                    period,
                    time,
                    className,
                    code
                  });
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Matriks Jadwal Harian */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {/* Day Selector Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {activeTimetable.map(d => (
              <button
                key={d.day}
                type="button"
                onClick={() => setSelectedDay(d.day)}
                className={`px-4 py-2 rounded-md font-bold text-xs tracking-wider uppercase transition-all shadow-xs ${
                  selectedDay === d.day
                    ? 'bg-[#0052CC] text-white'
                    : 'bg-white text-[#495057] border border-[#DEE2E6] hover:bg-[#F8F9FA]'
                }`}
              >
                {d.dayLabel}
              </button>
            ))}
          </div>

          {/* Pre Activity Notice */}
          {currentDayData.preActivity && (
            <div className="px-4 py-2.5 rounded-md bg-[#F1F3F5] border border-[#DEE2E6] text-xs font-semibold text-[#495057] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0052CC]" />
              <span>Kegiatan Awal: <b>{currentDayData.preActivity}</b></span>
            </div>
          )}

          {/* Timetable Table */}
          <div className="bg-white rounded-lg border border-[#DEE2E6] overflow-x-auto shadow-xs">
            <table className="w-full text-xs text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-[#0052CC] text-white uppercase text-[11px] font-bold">
                  <th className="py-3 px-3 w-16 text-center border-r border-blue-400">Jam Ke</th>
                  <th className="py-3 px-3 w-32 text-center border-r border-blue-400">Waktu</th>
                  {classList.map(cls => (
                    <th key={cls} className="py-3 px-3 text-center border-r border-blue-400 last:border-r-0">
                      {cls}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DEE2E6]">
                {currentDayData.slots.map((slot, sIdx) => {
                  if (slot.isBreak) {
                    return (
                      <tr key={`break-${sIdx}`} className="bg-[#FFF9E6] text-[#B06000] font-bold">
                        <td className="py-2.5 px-3 text-center border-r border-[#DEE2E6]">-</td>
                        <td className="py-2.5 px-3 text-center border-r border-[#DEE2E6] font-mono text-[11px]">
                          {slot.time}
                        </td>
                        <td colSpan={classList.length} className="py-2.5 px-4 text-center tracking-wider text-xs">
                          ☕ {slot.activityName || 'Istirahat'}
                        </td>
                      </tr>
                    );
                  }

                  if (slot.isSpecial) {
                    return (
                      <tr key={`special-${sIdx}`} className="bg-[#E7F0FF] text-[#0052CC] font-bold">
                        <td className="py-2.5 px-3 text-center border-r border-[#DEE2E6]">{slot.period}</td>
                        <td className="py-2.5 px-3 text-center border-r border-[#DEE2E6] font-mono text-[11px]">
                          {slot.time}
                        </td>
                        <td colSpan={classList.length} className="py-2.5 px-4 text-center tracking-wider text-xs">
                          🇮🇩 {slot.activityName}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={`period-${slot.period}`} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-[#1A1C1E] border-r border-[#DEE2E6] bg-[#F8F9FA]/60">
                        {slot.period}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[11px] text-[#495057] border-r border-[#DEE2E6]">
                        {slot.time}
                      </td>
                      {classList.map(cls => {
                        const code = slot.subjectCodes?.[cls] || '-';
                        const subjectObj = lookupSubjectByCode(code);
                        const teacherLetter = getTeacherLetterFromCode(code);
                        const teacherObj = lookupTeacherByCode(teacherLetter);

                        return (
                          <td
                            key={cls}
                            className="py-2 px-2 text-center border-r border-[#DEE2E6] last:border-r-0 cursor-pointer group"
                            onClick={() => {
                              setInspectingSlot({
                                dayLabel: currentDayData.dayLabel,
                                period: slot.period,
                                time: slot.time,
                                className: cls,
                                code
                              });
                            }}
                          >
                            <div className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-[#E7F0FF] border border-transparent hover:border-[#B3D1FF] transition-all">
                              <span className="font-extrabold text-sm text-[#0052CC] group-hover:scale-105 transition-transform">
                                {code}
                              </span>
                              {subjectObj && (
                                <span className="text-[10px] text-[#6C757D] truncate max-w-[85px] leading-tight mt-0.5">
                                  {subjectObj.name}
                                </span>
                              )}
                              {teacherObj && (
                                <span className="text-[9px] text-[#495057] truncate max-w-[85px] font-medium mt-0.5">
                                  {teacherObj.name.split(',')[0]}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Post Activity Notice */}
          {currentDayData.postActivity && (
            <div className="px-4 py-2.5 rounded-md bg-[#F1F3F5] border border-[#DEE2E6] text-xs font-semibold text-[#495057] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0052CC]" />
              <span>Kegiatan Akhir: <b>{currentDayData.postActivity}</b></span>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Jadwal Per Rombel Kelas */}
      {activeTab === 'byClass' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#495057]">Pilih Rombel Kelas:</span>
            {classList.map(cls => (
              <button
                key={cls}
                type="button"
                onClick={() => setSelectedClassFilter(cls)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  selectedClassFilter === cls
                    ? 'bg-[#0052CC] text-white'
                    : 'bg-white border border-[#DEE2E6] text-[#495057] hover:bg-[#F8F9FA]'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {timetable.map(d => (
              <div key={d.day} className="bg-white rounded-lg border border-[#DEE2E6] p-4 shadow-xs space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-[#DEE2E6]">
                  <h3 className="font-bold text-sm text-[#1A1C1E]">{d.dayLabel}</h3>
                  <span className="px-2 py-0.5 rounded bg-[#E7F0FF] text-[#0052CC] text-[10px] font-bold">
                    {selectedClassFilter === 'ALL' ? 'X.1' : selectedClassFilter}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {d.slots
                    .filter(s => !s.isBreak)
                    .map(slot => {
                      const targetClass = selectedClassFilter === 'ALL' ? 'X.1' : selectedClassFilter;
                      const code = slot.subjectCodes?.[targetClass] || '-';
                      const sub = lookupSubjectByCode(code);
                      const teacher = lookupTeacherByCode(getTeacherLetterFromCode(code));

                      return (
                        <div
                          key={slot.period}
                          className="flex items-start justify-between p-2 rounded bg-[#F8F9FA] border border-[#DEE2E6]"
                        >
                          <div>
                            <div className="font-bold text-[#1A1C1E] flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded bg-[#0052CC] text-white text-[10px] grid place-items-center font-mono">
                                {slot.period}
                              </span>
                              <span>{sub?.name || code}</span>
                            </div>
                            <div className="text-[10px] text-[#6C757D] mt-0.5 pl-6">
                              {teacher ? teacher.name : 'Guru pengampu'}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-extrabold text-[#0052CC] text-xs">
                              {code}
                            </span>
                            <div className="text-[9px] text-[#6C757D] font-mono mt-0.5">
                              {slot.time}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Jadwal Mengajar Per Guru */}
      {activeTab === 'byTeacher' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[#495057] shrink-0">Pilih Guru Pengampu:</span>
            <select
              value={selectedTeacherFilter}
              onChange={e => setSelectedTeacherFilter(e.target.value)}
              className="px-3 py-2 rounded-md border border-[#DEE2E6] text-xs bg-white text-[#1A1C1E] focus:outline-hidden focus:border-[#0052CC]"
            >
              <option value="ALL">Semua Guru (20 Pengajar)</option>
              {MA_CIKARAMAS_TEACHERS.map(t => (
                <option key={t.code} value={t.code}>
                  Kode {t.code} — {t.name} ({(t.subjectsSummary || []).join(', ')})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MA_CIKARAMAS_TEACHERS.filter(
              t => selectedTeacherFilter === 'ALL' || t.code === selectedTeacherFilter
            ).map(teacher => {
              // Gather all slots where this teacher is assigned
              const teachingSlots: { day: string; period: number; time: string; className: string; code: string }[] = [];

              timetable.forEach(d => {
                d.slots.forEach(s => {
                  if (s.isBreak || !s.subjectCodes) return;
                  Object.entries(s.subjectCodes).forEach(([cls, code]) => {
                    if (getTeacherLetterFromCode(code) === teacher.code) {
                      teachingSlots.push({
                        day: d.dayLabel,
                        period: s.period,
                        time: s.time,
                        className: cls,
                        code
                      });
                    }
                  });
                });
              });

              return (
                <div
                  key={teacher.code}
                  className="bg-white rounded-lg border border-[#DEE2E6] p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-[#0052CC] text-white text-xs font-bold grid place-items-center font-mono">
                          {teacher.code}
                        </span>
                        <h4 className="font-bold text-xs sm:text-sm text-[#1A1C1E]">{teacher.name}</h4>
                      </div>
                      <p className="text-[11px] text-[#6C757D] mt-1 pl-8">
                        Mapel: {(teacher.subjectsSummary || []).join(' • ')}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#E7F0FF] text-[#0052CC] font-mono text-[10px] font-bold">
                      {teachingSlots.length} Jam
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs max-h-48 overflow-y-auto pr-1">
                    {teachingSlots.length === 0 ? (
                      <p className="text-[11px] text-[#ADB5BD] italic">Tidak ada jam tatap muka terjadwal.</p>
                    ) : (
                      teachingSlots.map((ts, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-1.5 rounded bg-[#F8F9FA] text-[11px]"
                        >
                          <span className="font-semibold text-[#1A1C1E]">
                            {ts.day}, Jam {ts.period}
                          </span>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-white border border-[#DEE2E6] text-[#0052CC] font-bold">
                              {ts.className}
                            </span>
                            <span className="text-[#495057] font-bold">({ts.code})</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: Kamus Kode Guru & Mapel */}
      {activeTab === 'codes' && (
        <div className="space-y-4">
          {/* Panduan Alur Pengaturan (Cara Kerja Kode Guru vs Mapel vs Jadwal) */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 sm:p-5 text-[#1A1C1E] shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-blue-200/80">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-[#0052CC] text-white shadow-xs">
                  <BookOpen className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-[#0052CC]">
                    Panduan Alur Setting: Hubungan Kode Guru, Kode Mapel, dan Jadwal
                  </h3>
                  <p className="text-xs text-[#495057] mt-0.5">
                    Kenapa di jadwal kodenya berbentuk <b>A, B, C1, H2, T3</b>? Berikut alur kerja paling mudah untuk mengaturnya:
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-blue-100 text-[#0052CC] text-xs font-bold self-start md:self-auto">
                Sistem Kode MA Muhammadiyah Cikaramas
              </span>
            </div>

            {/* 4 Langkah Alur Kerja */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 text-xs">
              <div className="bg-white p-3 rounded-md border border-blue-100 shadow-2xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#0052CC] font-bold">
                  <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs">1</span>
                  <span>Set Kode Guru (A–T)</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Tentukan 20 guru dan beri kode <b>HURUF</b> (misal: <b>A</b> = Ai Sukaesih, <b>B</b> = Andri, <b>C</b> = Deni, ... <b>T</b> = Ipid).
                </p>
              </div>

              <div className="bg-white p-3 rounded-md border border-blue-100 shadow-2xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#0052CC] font-bold">
                  <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs">2</span>
                  <span>Set Mapel Tiap Guru</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Jika guru ajar 1 mapel, kodenya cukup hurufnya (misal: <b>A</b> = B. Indo). Jika lebih dari 1 mapel, otomatis diberi angka: <b>C1</b> (MTK), <b>C2</b> (B.Inggris), <b>C3</b> (SB).
                </p>
              </div>

              <div className="bg-white p-3 rounded-md border border-blue-100 shadow-2xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#0052CC] font-bold">
                  <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs">3</span>
                  <span>Pastikan 7 Rombel</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Pastikan 7 kelas sudah siap: <b>X.1, X.2, X.3</b> (Fase E), <b>XI.1, XI.2</b> (Fase F), serta <b>XII.1, XII.2</b> (Fase F).
                </p>
              </div>

              <div className="bg-white p-3 rounded-md border border-blue-100 shadow-2xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#0052CC] font-bold">
                  <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs">4</span>
                  <span>Plotting di Jadwal</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Tinggal masukkan kode sandi (misal <b>H2</b> atau <b>T3</b>). Sistem langsung cek <b>Anti-Bentrok</b> agar guru tidak bentrok mengajar di dua kelas sekaligus.
                </p>
              </div>
            </div>

            {/* Quick Actions to Flexible Setup & Workload Table */}
            <div className="mt-3 pt-3 border-t border-blue-200/70 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <span className="text-slate-600 text-[11px]">
                💡 Ingin menambah/mengubah formasi guru atau kelas untuk semester baru? Gunakan wizard fleksibel:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('setup')}
                  className="px-3 py-1.5 rounded-lg bg-[#0052CC] text-white font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Buka Setting Fleksibel (4 Langkah)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('workload')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Buka Tabel Pembagian Tugas</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Table Kode Guru */}
          <div className="bg-white rounded-lg border border-[#DEE2E6] p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#1A1C1E] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0052CC]" />
                Kode Guru (Huruf A s.d. T)
              </h3>
              <span className="text-xs text-[#6C757D]">{MA_CIKARAMAS_TEACHERS.length} Tenaga Pendidik</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8F9FA] text-[#495057] uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-2 text-center w-10">No</th>
                    <th className="py-2 px-2 text-center w-14">Kode</th>
                    <th className="py-2 px-3">Nama Lengkap & Gelar</th>
                    <th className="py-2 px-3">Mata Pelajaran</th>
                    <th className="py-2 px-2 text-center">Sub-Kode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DEE2E6]">
                  {MA_CIKARAMAS_TEACHERS.map(t => (
                    <tr key={t.code} className="hover:bg-[#F8F9FA]">
                      <td className="py-2 px-2 text-center text-[#6C757D]">{t.no}</td>
                      <td className="py-2 px-2 text-center font-bold font-mono text-[#0052CC] text-sm">
                        {t.code}
                      </td>
                      <td className="py-2 px-3 font-semibold text-[#1A1C1E]">
                        {t.name}
                        {t.note && <div className="text-[10px] text-[#6C757D] font-normal">{t.note}</div>}
                      </td>
                      <td className="py-2 px-3 text-[#495057]">{(t.subjectsSummary || []).join(', ')}</td>
                      <td className="py-2 px-2 text-center font-mono text-[11px] text-[#0052CC]">
                        {(t.derivedCodes || []).join(', ') || t.code}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table Kode Mapel */}
          <div className="bg-white rounded-lg border border-[#DEE2E6] p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#1A1C1E] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#0052CC]" />
                Kode Mapel (Kurikulum Madrasah Merdeka)
              </h3>
              <span className="text-xs text-[#6C757D]">{MA_CIKARAMAS_SUBJECTS.length} Mata Pelajaran</span>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8F9FA] text-[#495057] uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="py-2 px-2 text-center w-14">Kode</th>
                    <th className="py-2 px-3">Nama Mata Pelajaran</th>
                    <th className="py-2 px-3">Kelompok Kurikulum</th>
                    <th className="py-2 px-2 text-center w-12">Guru</th>
                    <th className="py-2 px-2 text-center w-12">Jam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DEE2E6]">
                  {MA_CIKARAMAS_SUBJECTS.map(s => (
                    <tr key={s.code} className="hover:bg-[#F8F9FA]">
                      <td className="py-2 px-2 text-center font-bold font-mono text-[#0052CC] text-sm">
                        {s.code}
                      </td>
                      <td className="py-2 px-3 font-semibold text-[#1A1C1E]">{s.name}</td>
                      <td className="py-2 px-3 text-[11px] text-[#6C757D]">{s.group}</td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-[#1A1C1E]">
                        {s.teacherCode}
                      </td>
                      <td className="py-2 px-2 text-center text-[#495057]">{s.hours} JP</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* TAB 5: Program Kokulikuler (P5/P2RA) */}
      {activeTab === 'kokulikuler' && (
        <div className="space-y-4">
          <div className="bg-[#E7F0FF] p-4 rounded-lg border border-[#B3D1FF] text-xs text-[#0052CC]">
            <b>Tentang Kokulikuler MA Muhammadiyah Cikaramas:</b> Projek Penguatan Profil Pelajar Pancasila & Profil Pelajar Rahmatan Lil Alamin (P5-PPRA) terjadwal terpadu (Kode <b>KO</b>) dengan pembagian koordinator per jenjang kelas.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Kelas X */}
            <div className="bg-white rounded-lg border border-[#DEE2E6] p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#DEE2E6]">
                <h4 className="font-bold text-sm text-[#1A1C1E]">Kelas X (Fase E)</h4>
                <span className="px-2 py-0.5 rounded bg-[#E7F0FF] text-[#0052CC] text-[10px] font-bold">
                  Rombel: X.1, X.2, X.3
                </span>
              </div>
              <div className="space-y-3">
                {MA_CIKARAMAS_KOKULIKULER.kelas10.map((item, i) => (
                  <div key={i} className="p-3 rounded bg-[#F8F9FA] border border-[#DEE2E6] space-y-1">
                    <div className="font-bold text-xs text-[#1A1C1E]">{item.title}</div>
                    <div className="text-[11px] text-[#0052CC] font-semibold">Koordinator: {item.coordinator}</div>
                    <div className="text-[10px] text-[#6C757D]">Hari Pelaksanaan: {item.day}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Kelas XI */}
            <div className="bg-white rounded-lg border border-[#DEE2E6] p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#DEE2E6]">
                <h4 className="font-bold text-sm text-[#1A1C1E]">Kelas XI (Fase F)</h4>
                <span className="px-2 py-0.5 rounded bg-[#E7F0FF] text-[#0052CC] text-[10px] font-bold">
                  Rombel: XI.1, XI.2
                </span>
              </div>
              <div className="space-y-3">
                {MA_CIKARAMAS_KOKULIKULER.kelas11.map((item, i) => (
                  <div key={i} className="p-3 rounded bg-[#F8F9FA] border border-[#DEE2E6] space-y-1">
                    <div className="font-bold text-xs text-[#1A1C1E]">{item.title}</div>
                    <div className="text-[11px] text-[#0052CC] font-semibold">Koordinator: {item.coordinator}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Kelas XII */}
            <div className="bg-white rounded-lg border border-[#DEE2E6] p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#DEE2E6]">
                <h4 className="font-bold text-sm text-[#1A1C1E]">Kelas XII (Fase F)</h4>
                <span className="px-2 py-0.5 rounded bg-[#E7F0FF] text-[#0052CC] text-[10px] font-bold">
                  Rombel: XII.1, XII.2
                </span>
              </div>
              <div className="space-y-3">
                {MA_CIKARAMAS_KOKULIKULER.kelas12.map((item, i) => (
                  <div key={i} className="p-3 rounded bg-[#F8F9FA] border border-[#DEE2E6] space-y-1">
                    <div className="font-bold text-xs text-[#1A1C1E]">{item.title}</div>
                    <div className="text-[11px] text-[#0052CC] font-semibold">Koordinator: {item.coordinator}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Tabel Pembagian Tugas Mengajar & Tugas Tambahan (BKG) */}
      {activeTab === 'workload' && (
        <TeacherWorkloadTable
          token={token}
          userRole={currentUser.ROLE}
          onRefreshTimetable={() => setTimetable(getTimetable(token))}
        />
      )}

      {/* TAB 6: Setting Fleksibel Formasi Guru, Kelas & Kode Sandi */}
      {activeTab === 'setup' && (
        <TimetableFlexibleSetup
          token={token}
          userRole={currentUser.ROLE}
          onNavigateToTab={(tab: string) => {
            if (tab === 'workload') setActiveTab('workload');
            else if (tab === 'master') setActiveTab('master');
            else if (tab === 'matrix') setActiveTab('matrix');
          }}
          onRefreshData={() => {
            setTimetable(getTimetable(token));
          }}
        />
      )}

      {/* INSPECT SLOT MODAL */}
      {inspectingSlot && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl border border-[#DEE2E6]">
            <div className="flex items-center justify-between pb-3 border-b border-[#DEE2E6]">
              <div>
                <span className="px-2 py-0.5 rounded bg-[#E7F0FF] text-[#0052CC] text-[10px] font-bold">
                  {inspectingSlot.dayLabel} • Jam Ke-{inspectingSlot.period}
                </span>
                <h3 className="font-bold text-base text-[#1A1C1E] mt-1">
                  Rombel {inspectingSlot.className}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingSlot(null)}
                className="text-[#6C757D] hover:text-[#1A1C1E] p-1 rounded hover:bg-[#F8F9FA]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-md bg-[#F8F9FA] border border-[#DEE2E6]">
                <span className="text-[#6C757D]">Kode Mapel:</span>
                <span className="font-mono font-extrabold text-lg text-[#0052CC]">
                  {inspectingSlot.code}
                </span>
              </div>

              {(() => {
                const sub = lookupSubjectByCode(inspectingSlot.code);
                const teacherLetter = getTeacherLetterFromCode(inspectingSlot.code);
                const teacher = lookupTeacherByCode(teacherLetter);

                return (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded bg-[#F8F9FA] border border-[#DEE2E6]">
                      <div className="text-[10px] text-[#6C757D] uppercase font-bold">Mata Pelajaran</div>
                      <div className="font-bold text-sm text-[#1A1C1E] mt-0.5">{sub?.name || '-'}</div>
                      <div className="text-[11px] text-[#0052CC] mt-0.5">{sub?.group || '-'}</div>
                    </div>

                    <div className="p-2.5 rounded bg-[#F8F9FA] border border-[#DEE2E6]">
                      <div className="text-[10px] text-[#6C757D] uppercase font-bold">Guru Pengampu</div>
                      <div className="font-bold text-sm text-[#1A1C1E] mt-0.5">
                        {teacher ? `Kode [${teacher.code}] ${teacher.name}` : '-'}
                      </div>
                      {teacher?.note && (
                        <div className="text-[10px] text-[#6C757D] mt-0.5">{teacher.note}</div>
                      )}
                    </div>

                    <div className="flex justify-between text-[#6C757D] text-[11px] pt-1">
                      <span>Waktu Tatap Muka: <b>{inspectingSlot.time}</b></span>
                      <span>Durasi: <b>35 Menit</b></span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DEE2E6]">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSlot({
                      dayKey: inspectingSlot.dayLabel.toUpperCase(),
                      periodNumber: inspectingSlot.period,
                      className: inspectingSlot.className,
                      currentCode: inspectingSlot.code,
                      time: inspectingSlot.time
                    });
                    setSlotCodeInput(inspectingSlot.code);
                    setSlotClashWarning(null);
                    setInspectingSlot(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0052CC] text-white text-xs font-semibold hover:bg-[#0047B3]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Ubah Slot Jadwal
                </button>
              )}
              <button
                type="button"
                onClick={() => setInspectingSlot(null)}
                className="px-3 py-1.5 rounded-md border border-[#DEE2E6] text-xs font-semibold text-[#495057] hover:bg-[#F8F9FA]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SLOT MODAL WITH LIVE ANTI-CLASH VALIDATION */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl border border-[#DEE2E6]">
            <div className="flex items-center justify-between pb-3 border-b border-[#DEE2E6]">
              <div>
                <span className="px-2 py-0.5 rounded bg-[#E7F0FF] text-[#0052CC] text-[10px] font-bold">
                  Edit Slot Jadwal
                </span>
                <h3 className="font-bold text-base text-[#1A1C1E] mt-1">
                  {editingSlot.dayKey} • Jam Ke-{editingSlot.periodNumber} ({editingSlot.className})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="text-[#6C757D] hover:text-[#1A1C1E] p-1 rounded hover:bg-[#F8F9FA]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#1A1C1E] mb-1">
                  Pilih Kode Mapel / Masukkan Kode:
                </label>
                <input
                  type="text"
                  value={slotCodeInput}
                  onChange={e => handleSlotCodeChange(e.target.value)}
                  placeholder="Contoh: T3, C1, H2, KO..."
                  className="w-full px-3 py-2 border rounded-md font-mono text-sm font-bold uppercase focus:outline-hidden focus:border-[#0052CC]"
                />
              </div>

              {/* Quick Select Buttons from Subjects */}
              <div>
                <label className="block text-[11px] text-[#6C757D] mb-1">Pilihan Cepat Kode Mapel:</label>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-2 bg-[#F8F9FA] rounded border border-[#DEE2E6]">
                  {MA_CIKARAMAS_SUBJECTS.map(s => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => handleSlotCodeChange(s.code)}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-colors ${
                        slotCodeInput === s.code
                          ? 'bg-[#0052CC] text-white'
                          : 'bg-white border border-[#DEE2E6] text-[#495057] hover:bg-[#E7F0FF]'
                      }`}
                    >
                      {s.code} ({s.teacherCode})
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleSlotCodeChange('KO')}
                    className="px-2 py-1 rounded text-[11px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300"
                  >
                    KO (Kokulikuler)
                  </button>
                </div>
              </div>

              {/* Live Clash Warning Alert */}
              {slotClashWarning && (
                <div className="p-3 rounded-md bg-[#FEF7E0] border border-[#FEEFC3] text-[#B06000] text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#B06000]" />
                  <span>{slotClashWarning}</span>
                </div>
              )}

              {/* Preview Info */}
              {(() => {
                const sub = lookupSubjectByCode(slotCodeInput);
                const teacherLetter = getTeacherLetterFromCode(slotCodeInput);
                const teacher = lookupTeacherByCode(teacherLetter);

                if (!sub && !teacher) return null;

                return (
                  <div className="p-2.5 rounded bg-[#E6F4EA] border border-[#CEEAD6] text-[#137333] text-xs space-y-1">
                    <div className="font-bold">{sub?.name || 'Mata Pelajaran'}</div>
                    <div className="text-[11px]">
                      Guru: <b>{teacher?.name || '-'}</b> (Kode {teacherLetter})
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DEE2E6]">
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="px-3 py-1.5 rounded-md border border-[#DEE2E6] text-xs font-semibold text-[#495057] hover:bg-[#F8F9FA]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveSlot}
                className="px-4 py-1.5 rounded-md bg-[#0052CC] text-white text-xs font-semibold hover:bg-[#0047B3]"
              >
                Simpan Jadwal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cetak Jadwal Pelajaran Resmi */}
      <TimetablePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        timetable={activeTimetable}
        settings={schoolSettings}
        initialWorkDays={workDays}
        onShowToast={onShowToast}
      />
    </div>
  );
};

export default TimetableView;

