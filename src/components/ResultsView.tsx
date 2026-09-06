import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Award,
  Users,
  TrendingUp,
  HelpCircle,
  BookOpen,
  GraduationCap,
  BarChart3,
  LineChart,
  Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Attempt, Exam, User, ClassItem, Question } from '../types';
import { resetStudentAttempt } from '../services/supabaseLmsStorage';
import { listEntity, simulateExamAttempts } from '../services/lmsStorage';
import { INITIAL_QUESTIONS } from '../data/initialData';
import { ItemAnalysisView } from './ItemAnalysisView';

interface ResultsViewProps {
  attempts: Attempt[];
  exams: Exam[];
  users: User[];
  classes: ClassItem[];
  currentUser: User;
  questions?: Question[];
  isStudentOnly?: boolean;
  token?: string;
  onRefresh?: () => void;
}

type SortField = 'student' | 'class' | 'exam' | 'score' | 'time' | 'violations' | 'status';
type SortOrder = 'asc' | 'desc';

export const ResultsView: React.FC<ResultsViewProps> = ({
  attempts,
  exams,
  users,
  classes,
  currentUser,
  questions,
  isStudentOnly = false,
  token = 'auth-token-demo',
  onRefresh
}) => {
  // Navigation Tabs State (Rekap Nilai vs Analisis Butir Soal)
  const [activeTab, setActiveTab] = useState<'scores' | 'itemAnalysis'>('scores');

  // Loaded Questions for psychometrics
  const [loadedQuestions, setLoadedQuestions] = useState<Question[]>(questions || []);

  useEffect(() => {
    if (questions && questions.length > 0) {
      setLoadedQuestions(questions);
      return;
    }
    try {
      const qList = listEntity(token, 'QUESTIONS');
      if (qList && qList.length > 0) {
        setLoadedQuestions(qList);
      } else {
        setLoadedQuestions(INITIAL_QUESTIONS);
      }
    } catch {
      setLoadedQuestions(INITIAL_QUESTIONS);
    }
  }, [questions, token]);

  // Filters State
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedExamId, setSelectedExamId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Reset Modal State
  const [resetModalAttempt, setResetModalAttempt] = useState<Attempt | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const usersMap = useMemo(() => Object.fromEntries((users || []).map(u => [u.ID, u])), [users]);
  const examsMap = useMemo(() => Object.fromEntries((exams || []).map(e => [e.ID, e])), [exams]);
  const classesMap = useMemo(() => Object.fromEntries((classes || []).map(c => [c.ID, c.NAME])), [classes]);

  // Toast auto-hide
  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Base displayed attempts based on role
  const userFilteredAttempts = useMemo(() => {
    if (isStudentOnly || currentUser?.ROLE === 'STUDENT') {
      return (attempts || []).filter(a => a.USER_ID === currentUser?.ID);
    }
    return attempts || [];
  }, [attempts, isStudentOnly, currentUser]);

  // Filtered attempts by class, exam, status, and search query
  const filteredAttempts = useMemo(() => {
    return userFilteredAttempts.filter(a => {
      const student = usersMap[a.USER_ID];
      const exam = examsMap[a.EXAM_ID];

      // Filter per-kelas
      if (selectedClassId !== 'ALL') {
        const studentClass = student?.CLASS_ID || '';
        if (studentClass !== selectedClassId) {
          // Flexible match for KLS-X1 vs X.1
          const studentClassName = classesMap[studentClass] || studentClass;
          const targetClassName = classesMap[selectedClassId] || selectedClassId;
          if (studentClassName !== targetClassName) return false;
        }
      }

      // Filter per-mapel / per-ujian
      if (selectedExamId !== 'ALL' && a.EXAM_ID !== selectedExamId) {
        return false;
      }

      // Filter status
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'PASSED') {
          const numScore = Number(a.SCORE);
          if (isNaN(numScore) || numScore < 75) return false;
        } else if (selectedStatus === 'REMEDIAL') {
          const numScore = Number(a.SCORE);
          if (isNaN(numScore) || numScore >= 75) return false;
        } else if (a.STATUS !== selectedStatus) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const studentName = (student?.NAME || '').toLowerCase();
        const username = (student?.USERNAME || '').toLowerCase();
        const nis = (student?.NIS || '').toLowerCase();
        const examTitle = (exam?.TITLE || a.EXAM_ID).toLowerCase();
        if (!studentName.includes(q) && !username.includes(q) && !nis.includes(q) && !examTitle.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [userFilteredAttempts, usersMap, examsMap, classesMap, selectedClassId, selectedExamId, selectedStatus, searchQuery]);

  // Sorted attempts
  const sortedAttempts = useMemo(() => {
    const list = [...filteredAttempts];
    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortField) {
        case 'student':
          valA = (usersMap[a.USER_ID]?.NAME || '').toLowerCase();
          valB = (usersMap[b.USER_ID]?.NAME || '').toLowerCase();
          break;
        case 'class':
          valA = classesMap[usersMap[a.USER_ID]?.CLASS_ID || ''] || '';
          valB = classesMap[usersMap[b.USER_ID]?.CLASS_ID || ''] || '';
          break;
        case 'exam':
          valA = (examsMap[a.EXAM_ID]?.TITLE || a.EXAM_ID).toLowerCase();
          valB = (examsMap[b.EXAM_ID]?.TITLE || b.EXAM_ID).toLowerCase();
          break;
        case 'score':
          valA = a.SCORE !== '' && !isNaN(Number(a.SCORE)) ? Number(a.SCORE) : -1;
          valB = b.SCORE !== '' && !isNaN(Number(b.SCORE)) ? Number(b.SCORE) : -1;
          break;
        case 'time':
          valA = a.SUBMITTED_AT ? new Date(a.SUBMITTED_AT).getTime() : 0;
          valB = b.SUBMITTED_AT ? new Date(b.SUBMITTED_AT).getTime() : 0;
          break;
        case 'violations':
          valA = a.VIOLATIONS || 0;
          valB = b.VIOLATIONS || 0;
          break;
        case 'status':
          valA = a.STATUS || '';
          valB = b.STATUS || '';
          break;
        default:
          valA = a.SCORE !== '' && !isNaN(Number(a.SCORE)) ? Number(a.SCORE) : -1;
          valB = b.SCORE !== '' && !isNaN(Number(b.SCORE)) ? Number(b.SCORE) : -1;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredAttempts, sortField, sortOrder, usersMap, examsMap, classesMap]);

  // Statistics Summary
  const statistics = useMemo(() => {
    const scores = sortedAttempts
      .map(a => Number(a.SCORE))
      .filter(s => !isNaN(s) && s >= 0);

    const total = sortedAttempts.length;
    const countWithScore = scores.length;
    const avg = countWithScore > 0 ? (scores.reduce((a, b) => a + b, 0) / countWithScore).toFixed(1) : '-';
    const highest = countWithScore > 0 ? Math.max(...scores) : '-';
    const lowest = countWithScore > 0 ? Math.min(...scores) : '-';
    const passedCount = scores.filter(s => s >= 75).length;
    const passedPercent = countWithScore > 0 ? Math.round((passedCount / countWithScore) * 100) : 0;

    return {
      total,
      avg,
      highest,
      lowest,
      passedCount,
      passedPercent
    };
  }, [sortedAttempts]);

  // Toggle sort order
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'score' ? 'desc' : 'asc');
    }
  };

  // Reset student attempt handler
  const handleConfirmReset = async () => {
    if (!resetModalAttempt) return;
    setIsResetting(true);
    try {
      await resetStudentAttempt(token, resetModalAttempt.ID);
      showToast('success', `Sesi ujian siswa berhasil di-reset. Kunci layar dibuka dan jawaban tetap tersimpan aman.`);
      setResetModalAttempt(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Gagal mereset sesi siswa.');
    } finally {
      setIsResetting(false);
    }
  };

  // Export to Excel with full detailed fields
  const handleExport = () => {
    const exportData = sortedAttempts.map((a, index) => {
      const u = usersMap[a.USER_ID];
      const e = examsMap[a.EXAM_ID];
      const numScore = Number(a.SCORE);
      const isPassed = !isNaN(numScore) ? (numScore >= 75 ? 'TUNTAS (>= 75)' : 'REMEDIAL (< 75)') : '-';

      return {
        PERINGKAT: index + 1,
        NAMA_SISWA: u?.NAME || '-',
        NIS: u?.NIS || u?.USERNAME || '-',
        NISN: u?.NISN || '-',
        KELAS: classesMap[u?.CLASS_ID || ''] || u?.CLASS_ID || '-',
        MATA_PELAJARAN_UJIAN: e?.TITLE || a.EXAM_ID,
        NILAI_AKHIR: a.SCORE !== '' ? a.SCORE : '-',
        NILAI_MAKSIMAL: a.MAX_SCORE || 100,
        STATUS_KKM: isPassed,
        STATUS_PENGERJAAN: a.STATUS === 'SUBMITTED' ? 'SELESAI' : a.STATUS === 'REVIEW' ? 'PERLU KOREKSI' : 'SEDANG BERLANGSUNG',
        PELANGGARAN: a.VIOLATIONS || 0,
        WAKTU_MULAI: a.STARTED_AT ? new Date(a.STARTED_AT).toLocaleString('id-ID') : '-',
        WAKTU_SELESAI: a.SUBMITTED_AT ? new Date(a.SUBMITTED_AT).toLocaleString('id-ID') : '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    const classNameLabel = selectedClassId !== 'ALL' ? (classesMap[selectedClassId] || selectedClassId) : 'SEMUA_KELAS';
    XLSX.utils.book_append_sheet(workbook, worksheet, 'REKAP NILAI');
    XLSX.writeFile(workbook, `REKAP_NILAI_${classNameLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-1 inline" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-blue-600 ml-1 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-600 ml-1 inline" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header & Export Button */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1C1E] tracking-tight flex items-center gap-2">
            <span>{isStudentOnly ? 'Hasil Ujian Saya' : 'Rekap Nilai & Hasil Ujian Siswa'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#6C757D] mt-1">
            Rekapitulasi nilai otomatis per-kelas dan per-mata pelajaran. Anda dapat mengurutkan peringkat nilai tertinggi atau mereset sesi ujian siswa yang terkunci.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={sortedAttempts.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#DEE2E6] text-[#1A1C1E] hover:bg-[#F8F9FA] font-medium text-xs transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-[#0052CC]" />
            <span>Export Rekap Excel</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs (Teacher/Admin only) */}
      {!isStudentOnly && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('scores')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'scores'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-4 h-4 text-blue-600" />
              <span>Rekap Nilai Siswa</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'scores' ? 'bg-blue-50 text-blue-700' : 'bg-slate-200 text-slate-700'
              }`}>
                {filteredAttempts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('itemAnalysis')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'itemAnalysis'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-amber-600" />
              <span>Analisis Butir Soal</span>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                Tingkat Kesukaran & Daya Pembeda
              </span>
            </button>
          </div>

          {activeTab === 'scores' && selectedExamId !== 'ALL' && (
            <button
              type="button"
              onClick={() => setActiveTab('itemAnalysis')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer w-fit"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Buka Analisis Butir Ujian Ini →</span>
            </button>
          )}
        </div>
      )}

      {/* Main Content: Either Item Analysis View or Scores Table */}
      {activeTab === 'itemAnalysis' ? (
        <ItemAnalysisView
          exams={exams}
          questions={loadedQuestions}
          attempts={attempts}
          classes={classes}
          users={users}
          defaultExamId={selectedExamId !== 'ALL' ? selectedExamId : undefined}
          token={token}
          onSimulateAttempts={async (examId) => {
            simulateExamAttempts(examId);
            if (onRefresh) onRefresh();
            showToast('success', '12 data responden simulasi berhasil dimuat untuk analisis butir soal!');
          }}
          onRefresh={onRefresh}
        />
      ) : (
        <>
          {/* Summary Statistics Card */}
          {!isStudentOnly && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Total Peserta</span>
            </div>
            <div className="text-lg font-bold text-slate-900 mt-1">{statistics.total} Siswa</div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span>Rata-Rata Nilai</span>
            </div>
            <div className="text-lg font-bold font-mono text-indigo-600 mt-1">{statistics.avg}</div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              <span>Nilai Tertinggi</span>
            </div>
            <div className="text-lg font-bold font-mono text-emerald-600 mt-1">{statistics.highest}</div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Nilai Terendah</span>
            </div>
            <div className="text-lg font-bold font-mono text-amber-600 mt-1">{statistics.lowest}</div>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tuntas KKM (&ge; 75)</span>
            </div>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {statistics.passedCount} <span className="text-xs font-normal text-slate-500">({statistics.passedPercent}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Sorting Toolbar */}
      <div className="bg-white border border-[#DEE2E6] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama siswa, NIS, atau ujian..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white text-slate-800"
            />
          </div>

          {/* Filter Per-Kelas */}
          {!isStudentOnly && (
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white text-slate-800"
              >
                <option value="ALL">Semua Kelas</option>
                {classes.map(c => (
                  <option key={c.ID} value={c.ID}>
                    Kelas {c.NAME}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filter Per-Mapel / Ujian */}
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedExamId}
              onChange={e => setSelectedExamId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white text-slate-800"
            >
              <option value="ALL">Semua Mata Pelajaran / Ujian</option>
              {exams.map(e => (
                <option key={e.ID} value={e.ID}>
                  {e.TITLE}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector Dropdown */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={e => {
                const [f, o] = e.target.value.split('-');
                setSortField(f as SortField);
                setSortOrder(o as SortOrder);
              }}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white text-slate-800 font-medium"
            >
              <option value="score-desc">Urutkan: Nilai Tertinggi (Rank 1)</option>
              <option value="score-asc">Urutkan: Nilai Terendah (Remedial)</option>
              <option value="student-asc">Urutkan: Nama Siswa (A - Z)</option>
              <option value="student-desc">Urutkan: Nama Siswa (Z - A)</option>
              <option value="class-asc">Urutkan: Kelas (Naik)</option>
              <option value="time-desc">Urutkan: Waktu Selesai Terbaru</option>
              <option value="violations-desc">Urutkan: Pelanggaran Terbanyak</option>
            </select>
          </div>
        </div>

        {/* Pill Quick Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 mr-1">Status:</span>
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'SUBMITTED', label: 'Selesai' },
              { id: 'PASSED', label: 'Tuntas KKM' },
              { id: 'REMEDIAL', label: 'Remedial' },
              { id: 'REVIEW', label: 'Perlu Koreksi' },
              { id: 'IN_PROGRESS', label: 'Sedang Berjalan' }
            ].map(pill => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSelectedStatus(pill.id)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                  selectedStatus === pill.id
                    ? 'bg-[#0052CC] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-500">
            Menampilkan <b>{sortedAttempts.length}</b> rekaman nilai
          </div>
        </div>
      </div>

      {/* Main Results Table */}
      <div className="bg-white border border-[#DEE2E6] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8F9FA] text-[#6C757D] uppercase text-[11px] font-bold tracking-wider border-b border-[#DEE2E6]">
              <tr>
                <th className="px-4 py-3.5 text-center w-12">No</th>
                {!isStudentOnly && (
                  <th
                    onClick={() => handleSort('student')}
                    className="px-5 py-3.5 cursor-pointer select-none hover:text-blue-700 transition-colors"
                  >
                    Nama Siswa & NIS {renderSortIndicator('student')}
                  </th>
                )}
                {!isStudentOnly && (
                  <th
                    onClick={() => handleSort('class')}
                    className="px-4 py-3.5 cursor-pointer select-none hover:text-blue-700 transition-colors"
                  >
                    Kelas {renderSortIndicator('class')}
                  </th>
                )}
                <th
                  onClick={() => handleSort('exam')}
                  className="px-5 py-3.5 cursor-pointer select-none hover:text-blue-700 transition-colors"
                >
                  Mata Pelajaran / Ujian {renderSortIndicator('exam')}
                </th>
                <th
                  onClick={() => handleSort('score')}
                  className="px-5 py-3.5 cursor-pointer select-none hover:text-blue-700 transition-colors text-right"
                >
                  Nilai Akhir {renderSortIndicator('score')}
                </th>
                <th
                  onClick={() => handleSort('violations')}
                  className="px-4 py-3.5 cursor-pointer select-none hover:text-blue-700 transition-colors text-center"
                >
                  Pelanggaran {renderSortIndicator('violations')}
                </th>
                <th
                  onClick={() => handleSort('time')}
                  className="px-5 py-3.5 cursor-pointer select-none hover:text-blue-700 transition-colors"
                >
                  Waktu Selesai {renderSortIndicator('time')}
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-4 py-3.5 cursor-pointer select-none hover:text-blue-700 transition-colors text-center"
                >
                  Status {renderSortIndicator('status')}
                </th>
                {!isStudentOnly && (
                  <th className="px-4 py-3.5 text-center">Aksi (Reset)</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DEE2E6]">
              {sortedAttempts.length > 0 ? (
                sortedAttempts.map((a, index) => {
                  const studentUser = usersMap[a.USER_ID];
                  const examItem = examsMap[a.EXAM_ID];
                  const numScore = Number(a.SCORE);
                  const isScoreValid = a.SCORE !== '' && !isNaN(numScore);
                  const isPassed = isScoreValid && numScore >= 75;

                  return (
                    <tr key={a.ID} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="px-4 py-3.5 text-center font-mono text-slate-500 font-semibold">
                        {index + 1}
                      </td>

                      {!isStudentOnly && (
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-[#1A1C1E]">{studentUser?.NAME || '-'}</div>
                          <div className="text-[10px] text-[#6C757D] font-mono">
                            NIS: {studentUser?.NIS || studentUser?.USERNAME || '-'}
                            {studentUser?.NISN ? ` • NISN: ${studentUser.NISN}` : ''}
                          </div>
                        </td>
                      )}

                      {!isStudentOnly && (
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200">
                            {classesMap[studentUser?.CLASS_ID || ''] || studentUser?.CLASS_ID || '-'}
                          </span>
                        </td>
                      )}

                      <td className="px-5 py-3.5 font-medium text-[#1A1C1E]">
                        <div className="font-semibold text-slate-800">{examItem?.TITLE || a.EXAM_ID}</div>
                        <div className="text-[10px] text-slate-500">
                          ID: {a.EXAM_ID}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        {a.STATUS === 'REVIEW' ? (
                          <span className="font-bold text-[#B06000] text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Perlu Koreksi
                          </span>
                        ) : isScoreValid ? (
                          <div className="inline-flex flex-col items-end">
                            <div className="font-bold font-mono text-base text-[#0052CC] flex items-center gap-1">
                              <span>{a.SCORE}</span>
                              <span className="text-[10px] text-slate-400 font-normal">/ {a.MAX_SCORE || 100}</span>
                            </div>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isPassed ? 'TUNTAS' : 'REMEDIAL'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center font-bold font-mono">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            a.VIOLATIONS > 0 ? 'bg-rose-100 text-rose-700' : 'text-slate-400'
                          }`}
                        >
                          {a.VIOLATIONS || 0}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-[#6C757D]">
                        {a.SUBMITTED_AT
                          ? new Date(a.SUBMITTED_AT).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '-'}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            a.STATUS === 'SUBMITTED'
                              ? 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
                              : a.STATUS === 'REVIEW'
                              ? 'bg-[#FEF7E0] text-[#B06000] border-[#FEEFC3]'
                              : 'bg-[#E7F0FF] text-[#0052CC] border-[#B3D1FF]'
                          }`}
                        >
                          {a.STATUS === 'SUBMITTED'
                            ? 'Selesai'
                            : a.STATUS === 'REVIEW'
                            ? 'Koreksi'
                            : 'Berjalan'}
                        </span>
                      </td>

                      {!isStudentOnly && (
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => setResetModalAttempt(a)}
                            title="Reset sesi pengerjaan ujian siswa (Kunci layar dibuka, jawaban tetap tersimpan aman)"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-[11px] transition-colors cursor-pointer shadow-2xs"
                          >
                            <RotateCcw className="w-3 h-3 text-amber-700" />
                            <span>Reset Sesi</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isStudentOnly ? 6 : 9} className="px-5 py-12 text-center text-[#6C757D]">
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-700">Belum ada hasil ujian yang sesuai dengan filter.</p>
                      <p className="text-xs text-slate-400">
                        Coba ubah pilihan kelas, mata pelajaran, atau kata kunci pencarian.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Confirmation Modal for Reset Attempt */}
      {resetModalAttempt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reset Sesi Ujian Siswa?</h3>
                <p className="text-xs text-slate-500">
                  {usersMap[resetModalAttempt.USER_ID]?.NAME} • Kelas {classesMap[usersMap[resetModalAttempt.USER_ID]?.CLASS_ID || ''] || '-'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <p className="font-semibold">Informasi Keamanan & Integritas Jawaban:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-800">
                <li>Seluruh jawaban yang telah diisi siswa <b>TETAP TERSIMPAN AMAN</b>.</li>
                <li>Jumlah pelanggaran keluar layar akan di-reset menjadi <b>0</b>.</li>
                <li>Status ujian dikembalikan ke <b>Sedang Berjalan</b> agar siswa dapat login kembali.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetModalAttempt(null)}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isResetting ? (
                  <span>Mereset...</span>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ya, Buka Kunci Siswa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsView;
