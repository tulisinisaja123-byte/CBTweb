import React, { useState, useMemo, useEffect } from 'react';
import {
  Briefcase,
  Printer,
  Download,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Search,
  BookOpen,
  Users,
  Clock,
  Award,
  Filter,
  X,
  Save,
  Check,
  FileSpreadsheet,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { TeacherAssignmentRow, TimetableDay, SchoolSettings } from '../types';
import {
  getTeacherAssignments,
  saveTeacherAssignments,
  syncTeacherAssignmentsFromTimetable,
  getTimetable,
  getSchoolSettings,
  getClasses
} from '../services/lmsStorage';

interface TeacherWorkloadTableProps {
  token: string;
  userRole: string;
  onRefreshTimetable?: () => void;
  onDataChanged?: () => void;
}

export const TeacherWorkloadTable: React.FC<TeacherWorkloadTableProps> = ({
  token,
  userRole,
  onRefreshTimetable,
  onDataChanged
}) => {
  const [assignments, setAssignments] = useState<TeacherAssignmentRow[]>(() => getTeacherAssignments(token));
  const [schoolSettings] = useState<SchoolSettings>(() => getSchoolSettings());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCertification, setFilterCertification] = useState<'ALL' | 'MEETS' | 'NOT_MEETS'>('ALL');
  const [viewMode, setViewMode] = useState<'SUBJECT_DETAIL' | 'TEACHER_SUMMARY'>('TEACHER_SUMMARY');
  const [classHoursDisplay, setClassHoursDisplay] = useState<'SEPARATED' | 'COMBINED'>('SEPARATED');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // Print modal state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printFormat, setPrintFormat] = useState<'DETAIL' | 'REKAP_GURU'>('REKAP_GURU');

  // Edit / Add modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Partial<TeacherAssignmentRow> | null>(null);

  // Auto-sync listener: whenever Setting Fleksibel or other components update teacher data
  useEffect(() => {
    const handleDataChange = () => {
      setAssignments(getTeacherAssignments(token));
    };
    window.addEventListener('LMS_TEACHER_DATA_CHANGED', handleDataChange);
    return () => {
      window.removeEventListener('LMS_TEACHER_DATA_CHANGED', handleDataChange);
    };
  }, [token]);

  // Retrieve active class names
  const activeClasses = useMemo(() => {
    try {
      const cls = getClasses(token);
      if (cls && cls.length > 0) {
        return cls.filter(c => c.ACTIVE).map(c => c.NAME);
      }
    } catch {}
    return ['X.1', 'X.2', 'X.3', 'XI.1', 'XI.2', 'XII.1', 'XII.2'];
  }, [token]);

  // Handler: Sync with active timetable
  const handleSyncFromTimetable = () => {
    setIsSyncing(true);
    try {
      const res = syncTeacherAssignmentsFromTimetable(token);
      setAssignments(res.assignments);
      setSyncSuccessMessage('Berhasil menyinkronkan jam tatap muka dari jadwal pelajaran terkini!');
      setTimeout(() => setSyncSuccessMessage(null), 4000);
      if (onRefreshTimetable) onRefreshTimetable();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      setSyncSuccessMessage('Kendala: ' + (err.message || 'Gagal menyinkronkan data.'));
      setTimeout(() => setSyncSuccessMessage(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handler: Quick toggle linieritas mapel
  const handleToggleLinear = (rowId: string) => {
    const updated = assignments.map(a => {
      if (a.id === rowId) {
        const nextIsLinear = a.isLinear === false ? true : false;
        return {
          ...a,
          isLinear: nextIsLinear
        };
      }
      return a;
    });
    setAssignments(updated);
    saveTeacherAssignments(token, updated);
    if (onDataChanged) onDataChanged();
  };

  // Filtered rows for Subject Detail View
  const filteredRows = useMemo(() => {
    return assignments.filter(row => {
      const matchSearch =
        row.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.teacherCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.fullCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.additionalDuty && row.additionalDuty.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      if (filterCertification === 'MEETS') {
        return row.meetsCertification;
      }
      if (filterCertification === 'NOT_MEETS') {
        return !row.meetsCertification;
      }
      return true;
    });
  }, [assignments, searchTerm, filterCertification]);

  // Grouped by Teacher Summary View (Menghitung Total Mengajar & Jam Linier)
  const teacherSummary = useMemo(() => {
    const teacherMap: Record<
      string,
      {
        teacherNo: number;
        teacherCode: string;
        teacherName: string;
        nipNbm: string;
        rankGolongan: string;
        subjects: string[];
        codes: string[];
        detailedSubjects: {
          id: string;
          subjectName: string;
          fullCode: string;
          isLinear: boolean;
          hours: number;
          classHours: Record<string, number>;
        }[];
        classHours: Record<string, number>;
        linearTeachingHours: number;
        nonLinearTeachingHours: number;
        totalTeachingHours: number;
        additionalDuty: string;
        additionalDutyHours: number;
        totalWorkloadHours: number;
        meetsCertification: boolean;
      }
    > = {};

    assignments.forEach(row => {
      const key = row.teacherCode;
      if (!teacherMap[key]) {
        teacherMap[key] = {
          teacherNo: row.teacherNo,
          teacherCode: row.teacherCode,
          teacherName: row.teacherName,
          nipNbm: row.nipNbm,
          rankGolongan: row.rankGolongan,
          subjects: [],
          codes: [],
          detailedSubjects: [],
          classHours: {},
          linearTeachingHours: 0,
          nonLinearTeachingHours: 0,
          totalTeachingHours: 0,
          additionalDuty: row.additionalDuty !== '-' ? row.additionalDuty : '',
          additionalDutyHours: row.additionalDutyHours || 0,
          totalWorkloadHours: 0,
          meetsCertification: false
        };
      }

      const isLin = row.isLinear !== false;
      teacherMap[key].detailedSubjects.push({
        id: row.id,
        subjectName: row.subjectName,
        fullCode: row.fullCode,
        isLinear: isLin,
        hours: row.totalTeachingHours,
        classHours: row.classHours || {}
      });

      if (!teacherMap[key].subjects.includes(row.subjectName)) {
        teacherMap[key].subjects.push(row.subjectName);
      }
      if (!teacherMap[key].codes.includes(row.fullCode)) {
        teacherMap[key].codes.push(row.fullCode);
      }

      activeClasses.forEach(cls => {
        const h = row.classHours?.[cls] || 0;
        teacherMap[key].classHours[cls] = (teacherMap[key].classHours[cls] || 0) + h;
      });

      teacherMap[key].totalTeachingHours += row.totalTeachingHours;
      if (isLin) {
        teacherMap[key].linearTeachingHours += row.totalTeachingHours;
      } else {
        teacherMap[key].nonLinearTeachingHours += row.totalTeachingHours;
      }
    });

    return Object.values(teacherMap)
      .map(t => {
        const total = t.totalTeachingHours + t.additionalDutyHours;
        return {
          ...t,
          totalWorkloadHours: total,
          meetsCertification: total >= 24
        };
      })
      .sort((a, b) => a.teacherNo - b.teacherNo)
      .filter(t => {
        const matchSearch =
          t.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.teacherCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.subjects.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
          t.additionalDuty.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchSearch) return false;
        if (filterCertification === 'MEETS') return t.meetsCertification;
        if (filterCertification === 'NOT_MEETS') return !t.meetsCertification;
        return true;
      });
  }, [assignments, activeClasses, searchTerm, filterCertification]);

  // Summary Metrics
  const stats = useMemo(() => {
    const uniqueTeachers = new Set(assignments.map(a => a.teacherCode)).size;
    let totalJTM = 0;
    let totalLinearJTM = 0;
    let totalNonLinearJTM = 0;
    let totalTugasTambahan = 0;

    // To prevent double-counting additional duties, group by teacher first
    const dutiesByTeacher: Record<string, number> = {};
    assignments.forEach(a => {
      totalJTM += a.totalTeachingHours;
      if (a.isLinear !== false) {
        totalLinearJTM += a.totalTeachingHours;
      } else {
        totalNonLinearJTM += a.totalTeachingHours;
      }
      if (a.additionalDutyHours && !dutiesByTeacher[a.teacherCode]) {
        dutiesByTeacher[a.teacherCode] = a.additionalDutyHours;
      }
    });

    Object.values(dutiesByTeacher).forEach(h => {
      totalTugasTambahan += h;
    });

    const meetsCount = teacherSummary.filter(t => t.meetsCertification).length;
    const notMeetsCount = teacherSummary.length - meetsCount;

    return {
      totalTeachers: uniqueTeachers,
      totalJTM,
      totalLinearJTM,
      totalNonLinearJTM,
      totalTugasTambahan,
      totalCumulativeHours: totalJTM + totalTugasTambahan,
      meetsCount,
      notMeetsCount
    };
  }, [assignments, teacherSummary]);

  // Handler: Save Row (Edit or Add)
  const handleSaveRow = () => {
    if (!editingRow || !editingRow.teacherName || !editingRow.subjectName) {
      alert('Mohon isi nama guru dan nama mata pelajaran.');
      return;
    }

    let updatedList: TeacherAssignmentRow[];
    const classHours = editingRow.classHours || {};
    let totalTeaching = 0;
    activeClasses.forEach(cls => {
      totalTeaching += Number(classHours[cls] || 0);
    });

    const addHours = Number(editingRow.additionalDutyHours || 0);
    const totalWorkload = totalTeaching + addHours;

    const rowToSave: TeacherAssignmentRow = {
      id: editingRow.id || `ASSIGN-${Date.now()}`,
      teacherNo: editingRow.teacherNo || assignments.length + 1,
      teacherCode: (editingRow.teacherCode || 'A').toUpperCase(),
      teacherName: editingRow.teacherName,
      nipNbm: editingRow.nipNbm || '-',
      rankGolongan: editingRow.rankGolongan || 'GTY',
      subjectName: editingRow.subjectName,
      fullCode: (editingRow.fullCode || editingRow.teacherCode || 'A').toUpperCase(),
      classHours,
      totalTeachingHours: totalTeaching,
      isLinear: editingRow.isLinear !== false,
      additionalDuty: editingRow.additionalDuty || '-',
      additionalDutyHours: addHours,
      totalWorkloadHours: totalWorkload,
      meetsCertification: totalWorkload >= 24,
      notes: editingRow.notes || (totalWorkload >= 24 ? 'Memenuhi Beban TPG' : 'Kurang dari 24 Jam')
    };

    if (editingRow.id) {
      updatedList = assignments.map(a => (a.id === editingRow.id ? rowToSave : a));
    } else {
      updatedList = [...assignments, rowToSave];
    }

    setAssignments(updatedList);
    saveTeacherAssignments(token, updatedList);
    setIsModalOpen(false);
    setEditingRow(null);
    if (onDataChanged) onDataChanged();
  };

  // Handler: Delete Row
  const handleDeleteRow = (id: string) => {
    let confirmed = true;
    try {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        confirmed = window.confirm('Yakin ingin menghapus baris pembagian tugas ini?');
      }
    } catch {
      confirmed = true;
    }
    if (!confirmed) return;
    const updated = assignments.filter(a => a.id !== id);
    setAssignments(updated);
    saveTeacherAssignments(token, updated);
    if (onDataChanged) onDataChanged();
  };

  // Handler: Export CSV
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Nama Guru',
      'NIP/NBM',
      'Golongan',
      'Kode Guru',
      'Mata Pelajaran',
      'Kode Mapel',
      ...activeClasses,
      'Jumlah JTM',
      'Tugas Tambahan',
      'Jam Tugas Tambahan',
      'Total Beban Kerja',
      'Kelayakan Sertifikasi'
    ];

    const rows = assignments.map((r, idx) => [
      idx + 1,
      `"${r.teacherName}"`,
      `"${r.nipNbm}"`,
      `"${r.rankGolongan}"`,
      r.teacherCode,
      `"${r.subjectName}"`,
      r.fullCode,
      ...activeClasses.map(cls => r.classHours?.[cls] || 0),
      r.totalTeachingHours,
      `"${r.additionalDuty || '-'}"`,
      r.additionalDutyHours || 0,
      r.totalWorkloadHours,
      r.meetsCertification ? 'Memenuhi (>=24 Jam)' : 'Kurang (<24 Jam)'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SK_Pembagian_Tugas_MA_Cikaramas_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* HEADER CARD */}
      <div className="bg-white border border-[#DEE2E6] rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs">
                <Briefcase className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#1A1C1E]">
                  Tabel Pembagian Tugas Mengajar & Tugas Tambahan (BKG)
                </h2>
                <p className="text-xs text-[#495057]">
                  Lampiran Keputusan Kepala MA Muhammadiyah Cikaramas — Tahun Pelajaran {schoolSettings.SCHOOL_YEAR || '2026/2027'}
                </p>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSyncFromTimetable}
              disabled={isSyncing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-50 text-[#0052CC] border border-blue-200 hover:bg-blue-100 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Hitung ulang jumlah jam tiap kelas langsung dari jadwal aktif"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menghitung...' : 'Sinkronkan dari Jadwal'}</span>
            </button>

            {userRole === 'ADMIN' && (
              <button
                onClick={() => {
                  setEditingRow({
                    teacherNo: assignments.length + 1,
                    teacherCode: 'A',
                    teacherName: '',
                    nipNbm: '',
                    rankGolongan: 'GTY',
                    subjectName: '',
                    fullCode: '',
                    classHours: {},
                    additionalDuty: '-',
                    additionalDutyHours: 0
                  });
                  setIsModalOpen(true);
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#0052CC] text-white hover:bg-blue-700 flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Tugas</span>
              </button>
            )}

            <button
              onClick={() => setShowPrintModal(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak SK (Landscape)</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>

        {/* NOTIFICATION BANNER */}
        {syncSuccessMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncSuccessMessage}</span>
          </div>
        )}

        {/* STATS TILES */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/70">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Users className="w-3.5 h-3.5" />
              <span>Total Guru</span>
            </div>
            <p className="text-lg font-bold text-slate-900 mt-1">{stats.totalTeachers} Orang</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{assignments.length} penugasan mapel</p>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200/70">
            <div className="flex items-center gap-1.5 text-[#0052CC] font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Total JTM (Semua Mapel)</span>
            </div>
            <p className="text-lg font-bold text-[#0052CC] mt-1">{stats.totalJTM} Jam / Minggu</p>
            <p className="text-[10px] text-blue-600 mt-0.5">Akumulasi tatap muka</p>
          </div>

          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200/70">
            <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>JTM Mapel Linier</span>
            </div>
            <p className="text-lg font-bold text-emerald-800 mt-1">{stats.totalLinearJTM} Jam</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">Non-Linier: {stats.totalNonLinearJTM} Jam</p>
          </div>

          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200/70">
            <div className="flex items-center gap-1.5 text-amber-700 font-medium">
              <Award className="w-3.5 h-3.5" />
              <span>Tugas Tambahan & Total</span>
            </div>
            <p className="text-lg font-bold text-amber-900 mt-1">{stats.totalTugasTambahan} Jam</p>
            <p className="text-[10px] text-amber-700 mt-0.5">Total Beban: {stats.totalCumulativeHours} Jam</p>
          </div>

          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200/70 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 text-indigo-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Kelayakan TPG (≥24 Jam)</span>
            </div>
            <p className="text-lg font-bold text-indigo-950 mt-1">{stats.meetsCount} Memenuhi</p>
            <p className="text-[10px] text-rose-600 mt-0.5">{stats.notMeetsCount} guru kurang jam</p>
          </div>
        </div>
      </div>

      {/* CONTROLS & FILTER BAR */}
      <div className="bg-white border border-[#DEE2E6] rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              onClick={() => setViewMode('TEACHER_SUMMARY')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                viewMode === 'TEACHER_SUMMARY'
                  ? 'bg-white text-[#0052CC] shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ringkasan Per Guru ({stats.totalTeachers}) — Linier & Total
            </button>
            <button
              onClick={() => setViewMode('SUBJECT_DETAIL')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                viewMode === 'SUBJECT_DETAIL'
                  ? 'bg-white text-[#0052CC] shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Detail Per Mapel ({assignments.length})
            </button>
          </div>

          {/* Filter Kelayakan Sertifikasi */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterCertification}
              onChange={e => setFilterCertification(e.target.value as any)}
              className="bg-transparent border-none text-xs text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Guru</option>
              <option value="MEETS">Hanya Memenuhi TPG (≥24 Jam)</option>
              <option value="NOT_MEETS">Hanya Kurang Jam (&lt;24 Jam)</option>
            </select>
          </div>

          {/* Sebaran Jam Kelas: Terinci vs Digabung */}
          {viewMode === 'TEACHER_SUMMARY' && (
            <div className="inline-flex rounded-lg border border-amber-200 p-0.5 bg-amber-50/60 items-center">
              <span className="text-[10.5px] font-semibold text-amber-900 px-2">Sebaran Kolom Kelas:</span>
              <button
                onClick={() => setClassHoursDisplay('SEPARATED')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  classHoursDisplay === 'SEPARATED'
                    ? 'bg-white text-amber-900 shadow-2xs font-bold'
                    : 'text-amber-800 hover:text-amber-950'
                }`}
                title="Tampilkan sebaran jam per mapel (tidak langsung dijumlahkan)"
              >
                Terpisah Per Mapel
              </button>
              <button
                onClick={() => setClassHoursDisplay('COMBINED')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  classHoursDisplay === 'COMBINED'
                    ? 'bg-white text-amber-900 shadow-2xs font-bold'
                    : 'text-amber-800 hover:text-amber-950'
                }`}
                title="Tampilkan jumlah jam langsung digabung per kelas"
              >
                Digabung (Total)
              </button>
            </div>
          )}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama guru, mapel, kode..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#0052CC]"
          />
        </div>
      </div>

      {/* TABLE VIEW: DETAIL PER MAPEL */}
      {viewMode === 'SUBJECT_DETAIL' ? (
        <div className="bg-white border border-[#DEE2E6] rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-230px)] overflow-y-auto relative">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-20 shadow-xs">
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800">
                  <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-3 font-semibold text-center border-r border-slate-200 w-10">No</th>
                  <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-3 font-semibold border-r border-slate-200 min-w-[170px]">Nama Guru & NIP/NBM</th>
                  <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-2 font-semibold border-r border-slate-200 text-center w-16">Gol.</th>
                  <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-2 font-semibold border-r border-slate-200 text-center w-14">Kode Guru</th>
                  <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-3 font-semibold border-r border-slate-200 min-w-[150px]">Mata Pelajaran Diampu</th>
                  <th className="sticky top-0 z-20 bg-blue-100/90 text-[#0052CC] py-2.5 px-2 font-semibold border-r border-slate-200 text-center w-16">Kode Mapel</th>
                  <th className="sticky top-0 z-20 bg-emerald-100/90 text-emerald-950 py-2.5 px-2 font-semibold border-r border-slate-200 text-center w-24">Linieritas</th>

                  {/* Dynamic Class Columns */}
                  {activeClasses.map(cls => (
                    <th
                      key={cls}
                      className="sticky top-0 z-20 py-2.5 px-2 font-semibold border-r border-slate-200 text-center w-12 bg-amber-100 text-amber-950"
                      title={`Jam di Kelas ${cls}`}
                    >
                      {cls}
                    </th>
                  ))}

                  <th className="sticky top-0 z-20 py-2.5 px-2.5 font-bold border-r border-slate-200 text-center w-16 bg-blue-100 text-[#0052CC]">
                    JTM
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-3 font-semibold border-r border-slate-200 min-w-[130px]">Tugas Tambahan</th>
                  <th className="sticky top-0 z-20 py-2.5 px-2 font-semibold border-r border-slate-200 text-center w-12 bg-amber-100 text-amber-950">
                    Jam
                  </th>
                  <th className="sticky top-0 z-20 py-2.5 px-2.5 font-bold border-r border-slate-200 text-center w-16 bg-emerald-100 text-emerald-950">
                    Total
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-2.5 font-semibold border-r border-slate-200 text-center w-28">Status</th>
                  {userRole === 'ADMIN' && (
                    <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-2 font-semibold text-center w-16">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[#1A1C1E]">
                {filteredRows.map((row, idx) => {
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center border-r border-slate-100 text-slate-500 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100">
                        <div className="font-semibold text-slate-900">{row.teacherName}</div>
                        <div className="text-[10px] text-slate-500">{row.nipNbm}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center border-r border-slate-100 text-slate-600 text-[11px]">
                        {row.rankGolongan}
                      </td>
                      <td className="py-2.5 px-2 text-center border-r border-slate-100 font-bold font-mono text-[#0052CC]">
                        {row.teacherCode}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-800">
                        {row.subjectName}
                      </td>
                      <td className="py-2.5 px-2 text-center border-r border-slate-100 font-bold font-mono bg-blue-50/30 text-[#0052CC]">
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-[#0052CC] border border-blue-200">
                          {row.fullCode}
                        </span>
                      </td>

                      {/* Linieritas Toggle Badge */}
                      <td className="py-2.5 px-2 text-center border-r border-slate-100">
                        {userRole === 'ADMIN' ? (
                          <button
                            onClick={() => handleToggleLinear(row.id)}
                            title="Klik untuk mengubah status linieritas mapel ini"
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                              row.isLinear !== false
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {row.isLinear !== false ? '✓ Linier' : 'Non-Linier'}
                          </button>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              row.isLinear !== false
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            {row.isLinear !== false ? 'Linier' : 'Non-Linier'}
                          </span>
                        )}
                      </td>

                      {/* Class Hours */}
                      {activeClasses.map(cls => {
                        const h = row.classHours?.[cls] || 0;
                        return (
                          <td
                            key={cls}
                            className={`py-2.5 px-2 text-center border-r border-slate-100 font-mono ${
                              h > 0 ? 'font-bold text-slate-900 bg-amber-50/20' : 'text-slate-300'
                            }`}
                          >
                            {h > 0 ? h : '-'}
                          </td>
                        );
                      })}

                      {/* Total JTM */}
                      <td className="py-2.5 px-2 text-center border-r border-slate-100 font-bold font-mono bg-blue-50/40 text-[#0052CC]">
                        {row.totalTeachingHours}
                      </td>

                      {/* Additional Duty */}
                      <td className="py-2.5 px-3 border-r border-slate-100 text-slate-700 text-[11px]">
                        {row.additionalDuty && row.additionalDuty !== '-' ? (
                          <span className="font-medium text-amber-900">{row.additionalDuty}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Additional Duty Hours */}
                      <td className="py-2.5 px-2 text-center border-r border-slate-100 font-mono text-amber-900 font-semibold bg-amber-50/30">
                        {row.additionalDutyHours || 0}
                      </td>

                      {/* Total Workload Hours */}
                      <td className="py-2.5 px-2 text-center border-r border-slate-100 font-bold font-mono bg-emerald-50/40 text-emerald-900">
                        {row.totalWorkloadHours}
                      </td>

                      {/* Meets Certification */}
                      <td className="py-2.5 px-2 text-center border-r border-slate-100">
                        {row.meetsCertification ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3" />
                            <span>≥24 Jam</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            <span>Kurang</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      {userRole === 'ADMIN' && (
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setEditingRow(row);
                                setIsModalOpen(true);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                              title="Edit Baris"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRow(row.id)}
                              className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                              title="Hapus Baris"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={11 + activeClasses.length} className="py-8 text-center text-slate-400">
                      Tidak ada data pembagian tugas yang cocok dengan pencarian/filter.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* TOTAL SUMMARY FOOTER */}
              <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={7} className="py-2.5 px-3 text-right border-r border-slate-200">
                    JUMLAH TOTAL JAM TATAP MUKA (JTM):
                  </td>
                  {activeClasses.map(cls => {
                    const sumCls = filteredRows.reduce((acc, curr) => acc + (curr.classHours?.[cls] || 0), 0);
                    return (
                      <td key={cls} className="py-2.5 px-2 text-center border-r border-slate-200 font-mono">
                        {sumCls}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-2 text-center border-r border-slate-200 font-mono text-[#0052CC]">
                    {filteredRows.reduce((acc, curr) => acc + curr.totalTeachingHours, 0)}
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-200 text-right">Total Tugas Tambahan:</td>
                  <td className="py-2.5 px-2 text-center border-r border-slate-200 font-mono text-amber-900">
                    {filteredRows.reduce((acc, curr) => acc + (curr.additionalDutyHours || 0), 0)}
                  </td>
                  <td className="py-2.5 px-2 text-center border-r border-slate-200 font-mono text-emerald-900">
                    {filteredRows.reduce((acc, curr) => acc + curr.totalWorkloadHours, 0)}
                  </td>
                  <td colSpan={userRole === 'ADMIN' ? 2 : 1}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        /* TABLE VIEW: RINGKASAN PER GURU (TOTAL MENGAJAR SEMUA MAPEL & JUMLAH MAPEL LINIER) */
        <div className="bg-white border border-[#DEE2E6] rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-230px)] overflow-y-auto relative">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-20 shadow-xs">
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800">
                  <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-3 font-semibold text-center border-r border-slate-200 w-10">No</th>
                  <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-3 font-semibold border-r border-slate-200 min-w-[180px]">Nama Guru & NIP/NBM</th>
                  <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-2 font-semibold border-r border-slate-200 text-center w-14">Kode</th>
                  <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-3 font-semibold border-r border-slate-200 min-w-[220px]">
                    Rincian Mapel & Linieritas
                  </th>

                  {/* Dynamic Class Columns */}
                  {activeClasses.map(cls => (
                    <th
                      key={cls}
                      className="sticky top-0 z-20 py-2.5 px-2 font-semibold border-r border-slate-200 text-center w-11 bg-amber-100 text-amber-950"
                      title={classHoursDisplay === 'SEPARATED' ? `Jam per Mapel di ${cls}` : `Total Jam di ${cls}`}
                    >
                      {cls}
                    </th>
                  ))}

                  {/* 1. JUMLAH MENGAJAR MAPEL LINIER */}
                  <th className="sticky top-0 z-20 py-2.5 px-2.5 font-bold border-r border-slate-200 text-center w-20 bg-emerald-100 text-emerald-950" title="Jumlah jam tatap muka untuk mapel linier (syarat sertifikasi TPG)">
                    JTM Linier
                  </th>

                  {/* 2. JUMLAH MENGAJAR MAPEL NON-LINIER */}
                  <th className="sticky top-0 z-20 py-2.5 px-2 font-semibold border-r border-slate-200 text-center w-16 bg-slate-200 text-slate-800" title="Jumlah jam tatap muka untuk mapel non-linier / tambahan">
                    Non-Linier
                  </th>

                  {/* 3. TOTAL JUMLAH MENGAJAR SEMUA MAPEL */}
                  <th className="sticky top-0 z-20 py-2.5 px-2.5 font-bold border-r border-slate-200 text-center w-24 bg-blue-100 text-[#0052CC]" title="Total keseluruhan jam mengajar semua mata pelajaran">
                    Total Mengajar (Semua Mapel)
                  </th>

                  <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-3 font-semibold border-r border-slate-200 min-w-[130px]">Tugas Tambahan</th>
                  <th className="sticky top-0 z-20 py-2.5 px-2 font-semibold border-r border-slate-200 text-center w-14 bg-amber-100 text-amber-950">
                    Jam Tambahan
                  </th>
                  <th className="sticky top-0 z-20 py-2.5 px-2.5 font-bold border-r border-slate-200 text-center w-20 bg-emerald-100 text-emerald-950" title="Total Beban Kerja = Total Mengajar + Jam Tugas Tambahan">
                    Total Beban
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-2.5 font-semibold text-center w-28">Status TPG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[#1A1C1E]">
                {teacherSummary.map((t, idx) => (
                  <tr key={t.teacherCode} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center border-r border-slate-100 text-slate-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100">
                      <div className="font-semibold text-slate-900">{t.teacherName}</div>
                      <div className="text-[10px] text-slate-500">{t.nipNbm} • {t.rankGolongan}</div>
                    </td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-100 font-bold font-mono text-[#0052CC]">
                      {t.teacherCode}
                    </td>

                    {/* Rincian Mapel & Status Linier */}
                    <td className="py-2 px-3 border-r border-slate-100 space-y-1">
                      {t.detailedSubjects.map(sub => (
                        <div key={sub.id} className="flex items-center justify-between gap-1.5 text-[11px] min-h-[26px]">
                          <div className="flex items-center gap-1 truncate">
                            <span className="font-mono font-bold text-[#0052CC] bg-blue-50 px-1 rounded">
                              {sub.fullCode}
                            </span>
                            <span className="truncate">{sub.subjectName}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-mono text-slate-600 font-semibold">{sub.hours} JP</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                sub.isLinear
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {sub.isLinear ? 'Linier' : 'Non-Linier'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </td>

                    {/* Class Hours - Sesuai Permintaan User: Sebaran jam per kelas jangan langsung dijumlahkan */}
                    {activeClasses.map(cls => {
                      const totalClsHours = t.classHours?.[cls] || 0;
                      if (classHoursDisplay === 'COMBINED') {
                        return (
                          <td
                            key={cls}
                            className={`py-2.5 px-2 text-center border-r border-slate-100 font-mono ${
                              totalClsHours > 0 ? 'font-bold text-slate-900 bg-amber-50/20' : 'text-slate-300'
                            }`}
                          >
                            {totalClsHours > 0 ? totalClsHours : '-'}
                          </td>
                        );
                      }

                      // Mode TERPISAH PER MAPEL
                      return (
                        <td
                          key={cls}
                          className={`py-2 px-1 text-center border-r border-slate-100 font-mono align-top ${
                            totalClsHours > 0 ? 'bg-amber-50/15' : ''
                          }`}
                        >
                          <div className="space-y-1">
                            {t.detailedSubjects.map(sub => {
                              const subH = sub.classHours?.[cls] || 0;
                              return (
                                <div
                                  key={sub.id}
                                  className="flex items-center justify-center min-h-[26px] text-[11px]"
                                  title={`${t.teacherName} • ${sub.fullCode} (${sub.subjectName}) di kelas ${cls}: ${subH} JP`}
                                >
                                  {subH > 0 ? (
                                    <span
                                      className={`px-1.5 py-0.5 rounded font-bold text-xs ${
                                        sub.isLinear
                                          ? 'bg-amber-100/90 text-amber-950 shadow-2xs'
                                          : 'bg-blue-100/90 text-blue-950 shadow-2xs'
                                      }`}
                                    >
                                      {subH}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 text-xs">-</span>
                                  )}
                                </div>
                              );
                            })}
                            {t.detailedSubjects.length > 1 && (
                              <div
                                className="border-t border-slate-200/90 pt-0.5 mt-0.5 text-center text-[10px] font-bold"
                                title={`Total jam di kelas ${cls}: ${totalClsHours} JP`}
                              >
                                {totalClsHours > 0 ? (
                                  <span className="text-slate-700 bg-slate-100/90 px-1 py-0.2 rounded font-mono">
                                    Σ {totalClsHours}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* 1. JTM MAPEL LINIER */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-100 font-bold font-mono bg-emerald-50/40 text-emerald-800 text-sm">
                      {t.linearTeachingHours} Jam
                    </td>

                    {/* 2. JTM NON-LINIER */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-100 font-mono text-slate-600">
                      {t.nonLinearTeachingHours > 0 ? `${t.nonLinearTeachingHours} Jam` : '-'}
                    </td>

                    {/* 3. TOTAL MENGAJAR (SEMUA MAPEL) */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-100 font-bold font-mono bg-blue-50/40 text-[#0052CC] text-sm">
                      {t.totalTeachingHours} Jam
                    </td>

                    {/* Tugas Tambahan */}
                    <td className="py-2.5 px-3 border-r border-slate-100 text-slate-700 text-[11px]">
                      {t.additionalDuty || '-'}
                    </td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-100 font-mono text-amber-900 font-semibold bg-amber-50/30">
                      {t.additionalDutyHours || 0}
                    </td>

                    {/* Total Beban Kerja Kumulatif */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-100 font-bold font-mono bg-emerald-50/50 text-emerald-900 text-sm">
                      {t.totalWorkloadHours} Jam
                    </td>

                    {/* Status TPG */}
                    <td className="py-2.5 px-2 text-center">
                      {t.meetsCertification ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <Check className="w-3 h-3" />
                          <span>≥24 Jam (OK)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <span>{t.totalWorkloadHours} Jam (Kurang)</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* FOOTER TOTAL GURU */}
              <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="py-2.5 px-3 text-right border-r border-slate-200">
                    REKAPITULASI TOTAL:
                  </td>
                  {activeClasses.map(cls => {
                    const sumCls = teacherSummary.reduce((acc, curr) => acc + (curr.classHours?.[cls] || 0), 0);
                    return (
                      <td key={cls} className="py-2.5 px-2 text-center border-r border-slate-200 font-mono">
                        {sumCls}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-2 text-center border-r border-slate-200 font-mono text-emerald-800 text-xs">
                    {teacherSummary.reduce((acc, curr) => acc + curr.linearTeachingHours, 0)} Jam
                  </td>
                  <td className="py-2.5 px-2 text-center border-r border-slate-200 font-mono text-slate-700 text-xs">
                    {teacherSummary.reduce((acc, curr) => acc + curr.nonLinearTeachingHours, 0)} Jam
                  </td>
                  <td className="py-2.5 px-2 text-center border-r border-slate-200 font-mono text-[#0052CC] text-xs">
                    {teacherSummary.reduce((acc, curr) => acc + curr.totalTeachingHours, 0)} Jam
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-200 text-right">-</td>
                  <td className="py-2.5 px-2 text-center border-r border-slate-200 font-mono text-amber-900 text-xs">
                    {stats.totalTugasTambahan}
                  </td>
                  <td className="py-2.5 px-2 text-center border-r border-slate-200 font-mono text-emerald-900 text-xs">
                    {stats.totalCumulativeHours} Jam
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* EDIT / ADD MODAL */}
      {isModalOpen && editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-sm text-[#1A1C1E]">
                {editingRow.id ? 'Edit Data Pembagian Tugas Mengajar' : 'Tambah Pembagian Tugas Baru'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingRow(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nama Guru *</label>
                  <input
                    type="text"
                    value={editingRow.teacherName || ''}
                    onChange={e => setEditingRow({ ...editingRow, teacherName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    placeholder="Contoh: Ai Sukaesih, S.Pd"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kode Huruf Guru (A-Z) *</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={editingRow.teacherCode || ''}
                    onChange={e => setEditingRow({ ...editingRow, teacherCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase"
                    placeholder="Contoh: A, B, C..."
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">NIP / NBM</label>
                  <input
                    type="text"
                    value={editingRow.nipNbm || ''}
                    onChange={e => setEditingRow({ ...editingRow, nipNbm: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    placeholder="Contoh: NBM. 1281201"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Pangkat / Golongan</label>
                  <input
                    type="text"
                    value={editingRow.rankGolongan || ''}
                    onChange={e => setEditingRow({ ...editingRow, rankGolongan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    placeholder="Contoh: GTY / Penata Muda (III.b)"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mata Pelajaran *</label>
                  <input
                    type="text"
                    value={editingRow.subjectName || ''}
                    onChange={e => setEditingRow({ ...editingRow, subjectName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    placeholder="Contoh: Bahasa Indonesia"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kode Sandi Lengkap *</label>
                  <input
                    type="text"
                    value={editingRow.fullCode || ''}
                    onChange={e => setEditingRow({ ...editingRow, fullCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase"
                    placeholder="Contoh: A atau C1"
                  />
                </div>
              </div>

              {/* Rincian Jam Per Kelas */}
              <div className="border-t border-slate-200 pt-3">
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Rincian Jam Tatap Muka (JTM) per Kelas
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {activeClasses.map(cls => (
                    <div key={cls} className="bg-slate-50 p-2 rounded-md border border-slate-200 text-center">
                      <span className="block text-[11px] font-bold text-slate-600 mb-1">{cls}</span>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={editingRow.classHours?.[cls] ?? 0}
                        onChange={e => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          setEditingRow({
                            ...editingRow,
                            classHours: {
                              ...(editingRow.classHours || {}),
                              [cls]: val
                            }
                          });
                        }}
                        className="w-full px-1 py-1 text-center font-mono font-bold bg-white border border-slate-300 rounded text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Tugas Tambahan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200 pt-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tugas Tambahan</label>
                  <input
                    type="text"
                    value={editingRow.additionalDuty || ''}
                    onChange={e => setEditingRow({ ...editingRow, additionalDuty: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    placeholder="Contoh: Waka Kurikulum / Wali Kelas"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Ekuivalensi Jam Tugas Tambahan</label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={editingRow.additionalDutyHours ?? 0}
                    onChange={e =>
                      setEditingRow({
                        ...editingRow,
                        additionalDutyHours: Math.max(0, parseInt(e.target.value) || 0)
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingRow(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleSaveRow}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0052CC] hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL (LANDSCAPE A4 / F4) */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-300 animate-scaleUp">
            {/* Top Modal Controls */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-100 no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#0052CC]" />
                <h3 className="font-bold text-sm text-[#1A1C1E]">
                  Pratinjau Cetak: SK Pembagian Tugas Mengajar & Beban Kerja Guru
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 text-xs font-bold rounded-md bg-[#0052CC] text-white hover:bg-blue-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Sekarang (Print)</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-8 overflow-y-auto bg-white text-black font-serif text-[11px] leading-snug print:p-0 print:m-0">
              {/* KOP SURAT MADRASAH */}
              <div className="text-center border-b-2 border-black pb-3 mb-4">
                <h4 className="text-xs uppercase tracking-wider font-semibold">PIMPINAN CABANG MUHAMMADIYAH TANJUNGMEDAR</h4>
                <h3 className="text-sm sm:text-base font-bold uppercase tracking-wide">MAJELIS PENDIDIKAN DASAR DAN MENENGAH</h3>
                <h2 className="text-base sm:text-lg font-extrabold uppercase text-blue-900 tracking-normal">
                  MADRASAH ALIYAH MUHAMMADIYAH CIKARAMAS
                </h2>
                <p className="text-[10px] text-gray-700 italic">
                  Alamat: Jl. Cikaramas No. 1 Desa Cikaramas Kec. Tanjungmedar Kab. Sumedang 45354
                </p>
              </div>

              {/* JUDUL DOKUMEN */}
              <div className="text-center mb-4">
                <p className="font-bold uppercase underline text-xs">
                  LAMPIRAN KEPUTUSAN KEPALA MADRASAH ALIYAH MUHAMMADIYAH CIKARAMAS
                </p>
                <p className="text-[10px]">
                  NOMOR : 045 / KEP / MAM.CKR / VII / 2026
                </p>
                <p className="font-bold uppercase text-[11px] mt-1">
                  TENTANG PEMBAGIAN TUGAS GURU DALAM PROSES BELAJAR MENGAJAR DAN TUGAS TAMBAHAN
                </p>
                <p className="font-semibold text-[10px]">
                  SEMESTER GANJIL & GENAP TAHUN PELAJARAN 2026/2027
                </p>
              </div>

              {/* TABEL PEMBAGIAN TUGAS (OFFICIAL BLACK BORDER) */}
              <table className="w-full border-collapse border border-black text-[10px]">
                <thead>
                  <tr className="bg-gray-100 text-center font-bold">
                    <th rowSpan={2} className="border border-black py-1 px-1 w-6">No</th>
                    <th rowSpan={2} className="border border-black py-1 px-2 text-left min-w-[140px]">Nama Guru & NIP/NBM</th>
                    <th rowSpan={2} className="border border-black py-1 px-1 w-10">Gol</th>
                    <th rowSpan={2} className="border border-black py-1 px-1 w-8">Kode</th>
                    <th rowSpan={2} className="border border-black py-1 px-2 text-left min-w-[120px]">Mata Pelajaran Diampu</th>
                    <th rowSpan={2} className="border border-black py-1 px-1 w-10">Sandi</th>
                    <th colSpan={activeClasses.length} className="border border-black py-0.5">
                      Jumlah Jam Tatap Muka di Kelas
                    </th>
                    <th rowSpan={2} className="border border-black py-1 px-1 w-10">JTM</th>
                    <th rowSpan={2} className="border border-black py-1 px-2 text-left min-w-[100px]">Tugas Tambahan</th>
                    <th rowSpan={2} className="border border-black py-1 px-1 w-8">Jam</th>
                    <th rowSpan={2} className="border border-black py-1 px-1 w-10">Total Jam</th>
                    <th rowSpan={2} className="border border-black py-1 px-1 w-16">Keterangan</th>
                  </tr>
                  <tr className="bg-gray-100 text-center font-bold">
                    {activeClasses.map(cls => (
                      <th key={cls} className="border border-black py-0.5 px-1 w-7">{cls}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="border border-black py-1 px-1 text-center">{idx + 1}</td>
                      <td className="border border-black py-1 px-2">
                        <div className="font-bold">{row.teacherName}</div>
                        <div className="text-[8.5px] text-gray-600">{row.nipNbm}</div>
                      </td>
                      <td className="border border-black py-1 px-1 text-center">{row.rankGolongan}</td>
                      <td className="border border-black py-1 px-1 text-center font-bold font-mono">{row.teacherCode}</td>
                      <td className="border border-black py-1 px-2">{row.subjectName}</td>
                      <td className="border border-black py-1 px-1 text-center font-bold font-mono">{row.fullCode}</td>
                      {activeClasses.map(cls => (
                        <td key={cls} className="border border-black py-1 px-1 text-center font-mono">
                          {row.classHours?.[cls] || '-'}
                        </td>
                      ))}
                      <td className="border border-black py-1 px-1 text-center font-bold font-mono">
                        {row.totalTeachingHours}
                      </td>
                      <td className="border border-black py-1 px-2">{row.additionalDuty || '-'}</td>
                      <td className="border border-black py-1 px-1 text-center font-mono">
                        {row.additionalDutyHours || 0}
                      </td>
                      <td className="border border-black py-1 px-1 text-center font-bold font-mono">
                        {row.totalWorkloadHours}
                      </td>
                      <td className="border border-black py-1 px-1 text-center text-[9px]">
                        {row.meetsCertification ? 'Memenuhi' : 'Kurang'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold text-center">
                    <td colSpan={6} className="border border-black py-1 px-2 text-right">JUMLAH TOTAL:</td>
                    {activeClasses.map(cls => {
                      const total = assignments.reduce((acc, curr) => acc + (curr.classHours?.[cls] || 0), 0);
                      return (
                        <td key={cls} className="border border-black py-1 px-1 font-mono">{total}</td>
                      );
                    })}
                    <td className="border border-black py-1 px-1 font-mono">
                      {assignments.reduce((acc, curr) => acc + curr.totalTeachingHours, 0)}
                    </td>
                    <td className="border border-black py-1 px-2 text-right">-</td>
                    <td className="border border-black py-1 px-1 font-mono">
                      {assignments.reduce((acc, curr) => acc + (curr.additionalDutyHours || 0), 0)}
                    </td>
                    <td className="border border-black py-1 px-1 font-mono">
                      {assignments.reduce((acc, curr) => acc + curr.totalWorkloadHours, 0)}
                    </td>
                    <td className="border border-black py-1 px-1">-</td>
                  </tr>
                </tfoot>
              </table>

              {/* TANDA TANGAN KEPALA MADRASAH */}
              <div className="flex justify-between items-start mt-6 pt-2 text-[10px]">
                <div>
                  <p className="font-semibold">Catatan:</p>
                  <p>1. Beban kerja guru sekurang-kurangnya 24 jam tatap muka per minggu.</p>
                  <p>2. Diberlakukan sejak tanggal ditetapkan.</p>
                </div>
                <div className="text-center min-w-[200px]">
                  <p>Ditetapkan di : Cikaramas</p>
                  <p>Pada Tanggal : 13 Juli 2026</p>
                  <p className="font-bold mt-1">Kepala MA Muhammadiyah Cikaramas,</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline text-xs">AI SUKAESIH, S.Pd</p>
                  <p>NBM. 1281201</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
