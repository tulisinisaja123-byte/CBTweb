import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import {
  HelpCircle,
  Download,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Filter,
  Search,
  BookOpen,
  GraduationCap,
  Layers,
  ChevronRight,
  Info,
  RotateCcw,
  Check,
  X,
  TrendingUp,
  FileSpreadsheet,
  Award
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Attempt, Exam, Question, User, ClassItem } from '../types';
import {
  calculateItemAnalysis,
  ExamPsychometricSummary,
  QuestionAnalysisResult,
  DistractorStats
} from '../utils/itemAnalysis';

interface ItemAnalysisViewProps {
  exams: Exam[];
  questions: Question[];
  attempts: Attempt[];
  classes: ClassItem[];
  users: User[];
  defaultExamId?: string;
  token?: string;
  onSimulateAttempts?: (examId: string) => Promise<void>;
  onRefresh?: () => void;
}

type ViewChartMode = 'quadrant' | 'comparison' | 'distribution';

export const ItemAnalysisView: React.FC<ItemAnalysisViewProps> = ({
  exams = [],
  questions = [],
  attempts = [],
  classes = [],
  users = [],
  defaultExamId,
  token,
  onSimulateAttempts,
  onRefresh
}) => {
  // Selected Exam
  const [selectedExamId, setSelectedExamId] = useState<string>(() => {
    if (defaultExamId && defaultExamId !== 'ALL') return defaultExamId;
    // Default to the first exam that has questions or attempts
    const examWithData = exams.find(e => questions.some(q => q.EXAM_ID === e.ID || q.BANK_ID === e.ID));
    return examWithData ? examWithData.ID : exams[0]?.ID || '';
  });

  // Selected Class Filter
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');

  // Chart Visual Mode
  const [chartMode, setChartMode] = useState<ViewChartMode>('quadrant');

  // Filter for questions table
  const [tableFilter, setTableFilter] = useState<'ALL' | 'DITERIMA' | 'REVISI' | 'DITOLAK'>('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | 'SUKAR' | 'SEDANG' | 'MUDAH'>('ALL');
  const [searchQuestion, setSearchQuestion] = useState<string>('');

  // Selected Question for Detail Drawer/Modal
  const [selectedQuestionModal, setSelectedQuestionModal] = useState<QuestionAnalysisResult | null>(null);

  // Psychometric Standard Info Accordion Toggle
  const [showGuidelines, setShowGuidelines] = useState<boolean>(false);

  // Simulation loading state
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Maps
  const classesMap = useMemo(() => Object.fromEntries(classes.map(c => [c.ID, c.NAME])), [classes]);
  const usersMap = useMemo(() => Object.fromEntries(users.map(u => [u.ID, u])), [users]);
  const currentExam = useMemo(() => exams.find(e => e.ID === selectedExamId), [exams, selectedExamId]);

  // Filtered Questions for the selected exam
  const examQuestions = useMemo(() => {
    if (!selectedExamId) return [];
    return questions.filter(
      q => q.EXAM_ID === selectedExamId || q.BANK_ID === selectedExamId
    );
  }, [questions, selectedExamId]);

  // Filtered attempts for the selected exam and class
  const examAttempts = useMemo(() => {
    if (!selectedExamId) return [];
    let list = attempts.filter(a => a.EXAM_ID === selectedExamId);

    if (selectedClassId !== 'ALL') {
      list = list.filter(a => {
        const student = usersMap[a.USER_ID];
        const cId = student?.CLASS_ID;
        return cId === selectedClassId || classesMap[cId || ''] === classesMap[selectedClassId];
      });
    }

    return list;
  }, [attempts, selectedExamId, selectedClassId, usersMap, classesMap]);

  // Run Psychometric Calculation Engine
  const analysisSummary: ExamPsychometricSummary | null = useMemo(() => {
    if (examQuestions.length === 0) return null;
    return calculateItemAnalysis(examQuestions, examAttempts, currentExam);
  }, [examQuestions, examAttempts, currentExam]);

  // Filtered items for the table
  const filteredItems = useMemo(() => {
    if (!analysisSummary) return [];
    return analysisSummary.items.filter(item => {
      if (tableFilter !== 'ALL' && item.recommendation !== tableFilter) return false;
      if (difficultyFilter !== 'ALL' && item.difficultyCategory !== difficultyFilter) return false;
      if (searchQuestion.trim()) {
        const q = searchQuestion.toLowerCase().trim();
        const numStr = `soal ${item.questionNumber}`.toLowerCase();
        const textStr = item.questionText.toLowerCase();
        if (!numStr.includes(q) && !textStr.includes(q)) return false;
      }
      return true;
    });
  }, [analysisSummary, tableFilter, difficultyFilter, searchQuestion]);

  // Handle Simulation Data
  const handleSimulate = async () => {
    if (!selectedExamId) return;
    setIsSimulating(true);
    try {
      if (onSimulateAttempts) {
        await onSimulateAttempts(selectedExamId);
      }
      if (onRefresh) onRefresh();
    } finally {
      setIsSimulating(false);
    }
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (!analysisSummary) return;

    // Sheet 1: Rangkuman Ujian
    const summaryData = [
      { Parameter: 'Nama Ujian / Bank Soal', Nilai: currentExam?.TITLE || selectedExamId },
      { Parameter: 'ID Ujian', Nilai: selectedExamId },
      { Parameter: 'Jumlah Butir Soal', Nilai: examQuestions.length },
      { Parameter: 'Total Peserta Ujian (N)', Nilai: analysisSummary.totalStudents },
      { Parameter: 'Jumlah Kelompok Atas (KA)', Nilai: analysisSummary.upperCount },
      { Parameter: 'Jumlah Kelompok Bawah (KB)', Nilai: analysisSummary.lowerCount },
      { Parameter: 'Rata-Rata Nilai Siswa', Nilai: analysisSummary.averageScore },
      { Parameter: 'Nilai Tertinggi', Nilai: analysisSummary.highestScore },
      { Parameter: 'Nilai Terendah', Nilai: analysisSummary.lowestScore },
      { Parameter: 'Standar Deviasi (SD)', Nilai: analysisSummary.scoreStdDev },
      { Parameter: 'Rerata Tingkat Kesukaran (P)', Nilai: analysisSummary.averageDifficulty },
      { Parameter: 'Rerata Daya Pembeda (D)', Nilai: analysisSummary.averageDiscrimination },
      { Parameter: 'Indeks Reliabilitas Tes (KR-20)', Nilai: `${analysisSummary.reliabilityKR20} (${analysisSummary.reliabilityCategory})` },
      { Parameter: 'Soal Diterima', Nilai: analysisSummary.recommendationCounts.diterima },
      { Parameter: 'Soal Perlu Revisi', Nilai: analysisSummary.recommendationCounts.revisi },
      { Parameter: 'Soal Ditolak / Dibuang', Nilai: analysisSummary.recommendationCounts.ditolak }
    ];

    // Sheet 2: Tabel Analisis Butir Soal
    const itemsData = analysisSummary.items.map(it => ({
      NO: it.questionNumber,
      ID_SOAL: it.questionId,
      TIPE: it.questionType,
      KUNCI: it.answerKey,
      TINGKAT_KESUKARAN_P: it.difficultyIndex,
      KATEGORI_KESUKARAN: it.difficultyCategory,
      DAYA_PEMBEDA_D: it.discriminationIndex,
      KATEGORI_PEMBEDA: it.discriminationCategory,
      BENAR_KELOMPOK_ATAS_BA: it.correctUpper,
      BENAR_KELOMPOK_BAWAH_BB: it.correctLower,
      PROP_ATAS_PA: it.proportionUpper,
      PROP_BAWAH_PB: it.proportionLower,
      STATUS_REKOMENDASI: it.recommendation,
      CATATAN_EVALUASI: it.recommendationReason,
      TEKS_SOAL: it.questionText.replace(/<[^>]*>?/gm, '')
    }));

    // Sheet 3: Rincian Opsi Distraktor
    const distractorData: any[] = [];
    analysisSummary.items.forEach(it => {
      it.distractors.forEach(d => {
        distractorData.push({
          NO_SOAL: it.questionNumber,
          OPSI: d.option,
          IS_KUNCI: d.isCorrect ? 'KUNCI JAWABAN' : 'PENGECOH',
          TOTAL_PEMILIH: d.totalCount,
          PERSENTASE: `${d.percentage}%`,
          PEMILIH_ATAS: d.upperCount,
          PEMILIH_BAWAH: d.lowerCount,
          STATUS_DISTRAKTOR: d.status,
          ANALISIS: d.notes,
          TEKS_OPSI: (d.text || '').replace(/<[^>]*>?/gm, '')
        });
      });
    });

    const workbook = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsItems = XLSX.utils.json_to_sheet(itemsData);
    const wsDist = XLSX.utils.json_to_sheet(distractorData);

    XLSX.utils.book_append_sheet(workbook, wsSummary, 'RINGKASAN_PSIKOMETRI');
    XLSX.utils.book_append_sheet(workbook, wsItems, 'ANALISIS_BUTIR_SOAL');
    XLSX.utils.book_append_sheet(workbook, wsDist, 'EVALUASI_DISTRAKTOR');

    const cleanTitle = (currentExam?.TITLE || 'UJIAN').replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `ANALISIS_BUTIR_SOAL_${cleanTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Trigger Print View
  const handlePrint = () => {
    window.print();
  };

  // Data for Charts
  const quadrantData = useMemo(() => {
    if (!analysisSummary) return [];
    return analysisSummary.items.map(it => ({
      name: `Soal ${it.questionNumber}`,
      questionNumber: it.questionNumber,
      questionId: it.questionId,
      p: it.difficultyIndex,
      d: it.discriminationIndex,
      category: it.recommendation,
      rawItem: it
    }));
  }, [analysisSummary]);

  const barComparisonData = useMemo(() => {
    if (!analysisSummary) return [];
    return analysisSummary.items.map(it => ({
      no: `S${it.questionNumber}`,
      questionNumber: it.questionNumber,
      p: it.difficultyIndex,
      d: it.discriminationIndex,
      recommendation: it.recommendation,
      rawItem: it
    }));
  }, [analysisSummary]);

  // Donut data for distributions
  const pieDifficultyData = useMemo(() => {
    if (!analysisSummary) return [];
    const { sukar, sedang, mudah } = analysisSummary.difficultyCounts;
    return [
      { name: 'Sukar (P < 0.30)', value: sukar, color: '#DC2626' },
      { name: 'Sedang (0.30 - 0.70)', value: sedang, color: '#059669' },
      { name: 'Mudah (P > 0.70)', value: mudah, color: '#2563EB' }
    ].filter(d => d.value > 0);
  }, [analysisSummary]);

  const pieDiscriminationData = useMemo(() => {
    if (!analysisSummary) return [];
    const { sangatBaik, baik, cukup, buruk } = analysisSummary.discriminationCounts;
    return [
      { name: 'Sangat Baik (D >= 0.40)', value: sangatBaik, color: '#059669' },
      { name: 'Baik (0.30 - 0.39)', value: baik, color: '#0284C7' },
      { name: 'Cukup (0.20 - 0.29)', value: cukup, color: '#D97706' },
      { name: 'Buruk (D < 0.20)', value: buruk, color: '#DC2626' }
    ].filter(d => d.value > 0);
  }, [analysisSummary]);

  const pieRecommendationData = useMemo(() => {
    if (!analysisSummary) return [];
    const { diterima, revisi, ditolak } = analysisSummary.recommendationCounts;
    return [
      { name: 'Diterima (Unggul)', value: diterima, color: '#059669' },
      { name: 'Perlu Revisi', value: revisi, color: '#D97706' },
      { name: 'Ditolak / Dibuang', value: ditolak, color: '#DC2626' }
    ].filter(d => d.value > 0);
  }, [analysisSummary]);

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions Toolbar */}
      <div className="bg-white border border-[#DEE2E6] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Exam & Class Selectors */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#0052CC]" />
                <span>Pilih Ujian / Bank Soal:</span>
              </label>
              <select
                value={selectedExamId}
                onChange={e => setSelectedExamId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white text-slate-800 shadow-2xs"
              >
                {exams.map(ex => (
                  <option key={ex.ID} value={ex.ID}>
                    {ex.TITLE} ({ex.ID})
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-48">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                <span>Filter Kelas Peserta:</span>
              </label>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white text-slate-800 shadow-2xs"
              >
                <option value="ALL">Semua Kelas</option>
                {classes.map(c => (
                  <option key={c.ID} value={c.ID}>
                    Kelas {c.NAME}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end lg:self-center">
            {analysisSummary && analysisSummary.totalStudents === 0 && onSimulateAttempts && (
              <button
                type="button"
                onClick={handleSimulate}
                disabled={isSimulating}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
                title="Isi sampel jawaban otomatis untuk menguji grafik analisis butir soal"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                <span>{isSimulating ? 'Membuat Simulasi...' : 'Simulasi Responden'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!analysisSummary || examQuestions.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#DEE2E6] text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              title="Unduh laporan analisis butir soal lengkap ke Microsoft Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!analysisSummary || examQuestions.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0052CC] text-white hover:bg-[#0047B3] font-semibold text-xs transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              title="Cetak format laporan resmi evaluasi butir soal"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>

        {/* Quick status bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Bank Soal Terdeteksi:</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
              {examQuestions.length} Butir Soal
            </span>
            <span>•</span>
            <span className="font-semibold text-slate-700">Peserta Selesai:</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              {analysisSummary?.totalStudents || 0} Siswa
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowGuidelines(!showGuidelines)}
            className="text-[11px] font-semibold text-[#0052CC] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showGuidelines ? 'Sembunyikan Panduan Psikometri' : 'Lihat Standar Rumus & Kriteria (P & D)'}</span>
          </button>
        </div>
      </div>

      {/* Psychometric Reference Guidelines Drawer / Box */}
      {showGuidelines && (
        <div className="bg-gradient-to-r from-blue-50/70 via-slate-50 to-indigo-50/50 border border-blue-200 rounded-2xl p-5 text-xs text-slate-700 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <h4 className="font-bold text-sm text-slate-900">Pedoman Standar Analisis Kualitas Butir Soal (Puspendik / Depdiknas)</h4>
            </div>
            <button
              type="button"
              onClick={() => setShowGuidelines(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {/* Box 1: Tingkat Kesukaran */}
            <div className="bg-white/80 p-3.5 rounded-xl border border-blue-100 space-y-2">
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>1. Tingkat Kesukaran (P)</span>
                <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">P = B / N</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Proporsi siswa yang menjawab benar terhadap total peserta.
              </p>
              <ul className="text-[11px] space-y-1 font-medium">
                <li className="flex items-center justify-between text-rose-700">
                  <span>P &lt; 0.30</span>
                  <span className="font-bold">Sukar (Sulit)</span>
                </li>
                <li className="flex items-center justify-between text-emerald-700">
                  <span>0.30 &le; P &le; 0.70</span>
                  <span className="font-bold">Sedang (Ideal)</span>
                </li>
                <li className="flex items-center justify-between text-blue-700">
                  <span>P &gt; 0.70</span>
                  <span className="font-bold">Mudah</span>
                </li>
              </ul>
            </div>

            {/* Box 2: Daya Pembeda */}
            <div className="bg-white/80 p-3.5 rounded-xl border border-blue-100 space-y-2">
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>2. Daya Pembeda (D)</span>
                <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">D = PA - PB</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Kemampuan soal membedakan siswa kelompok atas (KA) vs kelompok bawah (KB).
              </p>
              <ul className="text-[11px] space-y-1 font-medium">
                <li className="flex items-center justify-between text-emerald-700">
                  <span>D &ge; 0.40</span>
                  <span className="font-bold">Sangat Baik</span>
                </li>
                <li className="flex items-center justify-between text-sky-700">
                  <span>0.30 &le; D &lt; 0.40</span>
                  <span className="font-bold">Baik</span>
                </li>
                <li className="flex items-center justify-between text-amber-700">
                  <span>0.20 &le; D &lt; 0.30</span>
                  <span className="font-bold">Cukup (Perlu Revisi)</span>
                </li>
                <li className="flex items-center justify-between text-rose-700">
                  <span>D &lt; 0.20 / Negatif</span>
                  <span className="font-bold">Jelek / Dibuang</span>
                </li>
              </ul>
            </div>

            {/* Box 3: Reliabilitas & Rekomendasi */}
            <div className="bg-white/80 p-3.5 rounded-xl border border-blue-100 space-y-2">
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>3. Status Rekomendasi Butir</span>
                <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Evaluasi Guru</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Rekomendasi otomatis berdasarkan keselarasan indeks P dan D:
              </p>
              <ul className="text-[11px] space-y-1 font-medium">
                <li className="text-emerald-800">
                  <b>Diterima:</b> P sedang (0.30 - 0.70) dan D baik (&ge; 0.30).
                </li>
                <li className="text-amber-800">
                  <b>Revisi:</b> P terlalu sukar/mudah atau D cukup (0.20 - 0.29).
                </li>
                <li className="text-rose-800">
                  <b>Ditolak:</b> D &lt; 0.20 atau negatif (kunci jawaban keliru / soal ambigu).
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Psychometric KPI Summary Cards */}
      {analysisSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Soal */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Jumlah Soal</span>
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1">{analysisSummary.items.length} <span className="text-xs font-normal text-slate-500">butir</span></div>
          </div>

          {/* Rerata P (Kesukaran) */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span>Rerata P (Kesukaran)</span>
            </div>
            <div className="text-xl font-bold font-mono text-indigo-600 mt-1">
              {analysisSummary.averageDifficulty}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {analysisSummary.averageDifficulty >= 0.3 && analysisSummary.averageDifficulty <= 0.7
                ? 'Kategori: Sedang (Ideal)'
                : analysisSummary.averageDifficulty > 0.7
                ? 'Kategori: Cenderung Mudah'
                : 'Kategori: Cenderung Sukar'}
            </div>
          </div>

          {/* Rerata D (Daya Pembeda) */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              <span>Rerata D (Pembeda)</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
              {analysisSummary.averageDiscrimination}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {analysisSummary.averageDiscrimination >= 0.3
                ? 'Kategori: Daya Pembeda Baik'
                : analysisSummary.averageDiscrimination >= 0.2
                ? 'Kategori: Cukup / Revisi'
                : 'Kategori: Perlu Dibenahi'}
            </div>
          </div>

          {/* Reliabilitas KR-20 */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Reliabilitas (KR-20)</span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {analysisSummary.reliabilityKR20}
            </div>
            <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">
              {analysisSummary.reliabilityCategory}
            </div>
          </div>

          {/* Soal Diterima */}
          <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
            <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Soal Diterima</span>
            </div>
            <div className="text-xl font-bold text-emerald-700 mt-1">
              {analysisSummary.recommendationCounts.diterima}{' '}
              <span className="text-xs font-normal text-emerald-600">
                ({analysisSummary.items.length > 0 ? Math.round((analysisSummary.recommendationCounts.diterima / analysisSummary.items.length) * 100) : 0}%)
              </span>
            </div>
            <div className="text-[10px] text-emerald-700 mt-0.5">Kualitas Bermutu</div>
          </div>

          {/* Soal Perlu Revisi / Ditolak */}
          <div className="bg-white p-3.5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
            <div className="text-[11px] font-semibold text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Revisi / Ditolak</span>
            </div>
            <div className="text-xl font-bold text-amber-800 mt-1">
              {analysisSummary.recommendationCounts.revisi + analysisSummary.recommendationCounts.ditolak}{' '}
              <span className="text-xs font-normal text-amber-700">
                ({analysisSummary.items.length > 0 ? Math.round(((analysisSummary.recommendationCounts.revisi + analysisSummary.recommendationCounts.ditolak) / analysisSummary.items.length) * 100) : 0}%)
              </span>
            </div>
            <div className="text-[10px] text-amber-700 mt-0.5">
              Revisi: {analysisSummary.recommendationCounts.revisi} • Ditolak: {analysisSummary.recommendationCounts.ditolak}
            </div>
          </div>
        </div>
      )}

      {/* Visual Charts Container */}
      <div className="bg-white border border-[#DEE2E6] rounded-2xl p-5 shadow-2xs space-y-5">
        {/* Chart View Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-[#1A1C1E] flex items-center gap-2">
              <span>Visualisasi Analisis Butir Soal</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-[#0052CC]">
                Grafik Interaktif
              </span>
            </h3>
            <p className="text-xs text-[#6C757D] mt-0.5">
              Klik pada titik atau batang grafik untuk melihat rincian butir soal, kunci jawaban, dan efektivitas distraktor.
            </p>
          </div>

          {/* Chart Mode Switcher */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setChartMode('quadrant')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                chartMode === 'quadrant'
                  ? 'bg-white text-[#0052CC] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Matriks Kuadran (P vs D)
            </button>
            <button
              type="button"
              onClick={() => setChartMode('comparison')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                chartMode === 'comparison'
                  ? 'bg-white text-[#0052CC] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Batang Komparasi per Soal
            </button>
            <button
              type="button"
              onClick={() => setChartMode('distribution')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                chartMode === 'distribution'
                  ? 'bg-white text-[#0052CC] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Distribusi Kategori
            </button>
          </div>
        </div>

        {/* Chart Content Display */}
        {examQuestions.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Layers className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-700">Belum ada butir soal pada ujian yang dipilih.</p>
            <p className="text-xs text-slate-500">Pilih ujian lain yang memiliki bank soal atau buat soal terlebih dahulu.</p>
          </div>
        ) : analysisSummary && analysisSummary.totalStudents === 0 ? (
          <div className="py-14 text-center text-slate-500 space-y-3 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            <AlertTriangle className="w-8 h-8 mx-auto text-amber-500" />
            <div className="max-w-md mx-auto space-y-1">
              <p className="font-bold text-slate-800 text-sm">Belum Ada Data Responden Siswa</p>
              <p className="text-xs text-slate-500">
                Ujian ini belum memiliki rekaman pengerjaan siswa untuk dikalkulasi. Anda dapat melakukan simulasi respon siswa untuk menguji coba visualisasi grafik psikometri.
              </p>
            </div>
            {onSimulateAttempts && (
              <button
                type="button"
                onClick={handleSimulate}
                disabled={isSimulating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0052CC] text-white hover:bg-[#0047B3] font-semibold text-xs cursor-pointer shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSimulating ? 'Sedang Mensimulasikan...' : 'Buat 12 Simulasi Respon Siswa'}</span>
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* 1. Matriks Kuadran P vs D (Scatter Plot) */}
            {chartMode === 'quadrant' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-700">Legenda Titik:</span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                      Diterima (Unggul)
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                      Perlu Revisi
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>
                      Ditolak
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Area Kuadran Hijau Ideal: <b>0.30 &le; P &le; 0.70</b> & <b>D &ge; 0.30</b>
                  </div>
                </div>

                <div className="h-[360px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{ top: 20, right: 30, bottom: 25, left: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis
                        type="number"
                        dataKey="p"
                        name="Tingkat Kesukaran (P)"
                        domain={[0, 1]}
                        ticks={[0, 0.2, 0.3, 0.5, 0.7, 0.8, 1.0]}
                        label={{
                          value: 'Tingkat Kesukaran P (0 = Sangat Sukar, 1 = Sangat Mudah)',
                          position: 'insideBottom',
                          offset: -15,
                          fontSize: 11,
                          fill: '#64748B'
                        }}
                      />
                      <YAxis
                        type="number"
                        dataKey="d"
                        name="Daya Pembeda (D)"
                        domain={[-0.3, 1.0]}
                        ticks={[-0.2, 0, 0.2, 0.3, 0.4, 0.6, 0.8, 1.0]}
                        label={{
                          value: 'Daya Pembeda D (-0.2 s/d +1.0)',
                          angle: -90,
                          position: 'insideLeft',
                          offset: 0,
                          fontSize: 11,
                          fill: '#64748B'
                        }}
                      />
                      <ZAxis range={[90, 90]} />
                      {/* Reference lines */}
                      <ReferenceLine x={0.3} stroke="#059669" strokeDasharray="4 4" label={{ value: 'Batas Sukar', fill: '#059669', fontSize: 10 }} />
                      <ReferenceLine x={0.7} stroke="#059669" strokeDasharray="4 4" label={{ value: 'Batas Mudah', fill: '#059669', fontSize: 10 }} />
                      <ReferenceLine y={0.3} stroke="#0284C7" strokeDasharray="4 4" label={{ value: 'Daya Pembeda Baik (0.30)', fill: '#0284C7', fontSize: 10 }} />
                      <ReferenceLine y={0.2} stroke="#DC2626" strokeDasharray="4 4" label={{ value: 'Ambang Ditolak (0.20)', fill: '#DC2626', fontSize: 10 }} />

                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const item = data.rawItem;
                            return (
                              <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-xs space-y-1.5 max-w-xs z-50">
                                <div className="font-bold text-slate-900 flex items-center justify-between gap-2 border-b pb-1">
                                  <span>Nomor Soal {data.questionNumber}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      data.category === 'DITERIMA'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : data.category === 'REVISI'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {data.category}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-600 line-clamp-2">
                                  {item.questionText.replace(/<[^>]*>?/gm, '')}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                                  <div>
                                    <span className="text-slate-400">Kesukaran (P):</span>{' '}
                                    <b className="font-mono text-slate-800">{data.p}</b> ({item.difficultyCategory})
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Pembeda (D):</span>{' '}
                                    <b className="font-mono text-slate-800">{data.d}</b> ({item.discriminationCategory})
                                  </div>
                                </div>
                                <div className="text-[10px] text-blue-600 font-semibold pt-1">
                                  Klik titik untuk melihat rincian opsi & distraktor &rarr;
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter
                        data={quadrantData}
                        onClick={(entry: any) => {
                          if (entry && (entry.rawItem || entry.payload?.rawItem)) {
                            setSelectedQuestionModal(entry.rawItem || entry.payload?.rawItem);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        {quadrantData.map((entry, index) => {
                          const color =
                            entry.category === 'DITERIMA'
                              ? '#059669'
                              : entry.category === 'REVISI'
                              ? '#D97706'
                              : '#DC2626';
                          return <Cell key={`cell-${index}`} fill={color} stroke="#FFFFFF" strokeWidth={2} />;
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 2. Grafik Batang Komparasi per Soal (Dual Bar Chart) */}
            {chartMode === 'comparison' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 font-semibold text-indigo-700">
                      <span className="w-3 h-3 rounded bg-indigo-500 inline-block"></span>
                      Tingkat Kesukaran (P)
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                      <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
                      Daya Pembeda (D)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Nilai P dan D diplot bersisian per nomor butir soal
                  </div>
                </div>

                <div className="h-[360px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barComparisonData}
                      margin={{ top: 20, right: 20, bottom: 25, left: 0 }}
                      onClick={(e: any) => {
                        if (e && e.activePayload && e.activePayload[0]) {
                          setSelectedQuestionModal(e.activePayload[0].payload.rawItem);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="no" fontSize={11} stroke="#64748B" />
                      <YAxis domain={[-0.3, 1.0]} fontSize={11} stroke="#64748B" />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const item = data.rawItem;
                            return (
                              <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-xs space-y-1.5 max-w-xs z-50">
                                <div className="font-bold text-slate-900 border-b pb-1 flex justify-between">
                                  <span>Soal Nomor {data.questionNumber}</span>
                                  <span className="font-mono text-blue-600 font-normal">Kunci: {item.answerKey}</span>
                                </div>
                                <div className="space-y-1 text-[11px]">
                                  <div className="flex justify-between text-indigo-700">
                                    <span>Tingkat Kesukaran (P):</span>
                                    <b className="font-mono">{data.p} ({item.difficultyCategory})</b>
                                  </div>
                                  <div className="flex justify-between text-emerald-700">
                                    <span>Daya Pembeda (D):</span>
                                    <b className="font-mono">{data.d} ({item.discriminationCategory})</b>
                                  </div>
                                  <div className="flex justify-between text-slate-700 pt-1 border-t">
                                    <span>Rekomendasi:</span>
                                    <b className="font-semibold text-slate-900">{item.recommendation}</b>
                                  </div>
                                </div>
                                <div className="text-[10px] text-blue-600 pt-1">
                                  Klik batang untuk rincian distraktor &rarr;
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <ReferenceLine y={0.5} stroke="#6366F1" strokeDasharray="3 3" label={{ value: 'P Ideal (0.50)', fill: '#6366F1', fontSize: 10 }} />
                      <ReferenceLine y={0.3} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'D Standar (0.30)', fill: '#10B981', fontSize: 10 }} />
                      <Bar dataKey="p" name="Tingkat Kesukaran (P)" fill="#6366F1" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                      <Bar dataKey="d" name="Daya Pembeda (D)" fill="#10B981" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 3. Grafik Distribusi Kategori (Donut Charts) */}
            {chartMode === 'distribution' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Donut 1: Tingkat Kesukaran */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-2">
                  <h4 className="font-bold text-xs text-slate-800">Distribusi Tingkat Kesukaran</h4>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieDifficultyData}
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieDifficultyData.map((entry, index) => (
                            <Cell key={`diff-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 text-[10px]">
                    {pieDifficultyData.map((d, i) => (
                      <span key={i} className="flex items-center gap-1 font-medium">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: d.color }}></span>
                        {d.name}: <b>{d.value}</b>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Donut 2: Daya Pembeda */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-2">
                  <h4 className="font-bold text-xs text-slate-800">Distribusi Daya Pembeda</h4>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieDiscriminationData}
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieDiscriminationData.map((entry, index) => (
                            <Cell key={`disc-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 text-[10px]">
                    {pieDiscriminationData.map((d, i) => (
                      <span key={i} className="flex items-center gap-1 font-medium">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: d.color }}></span>
                        {d.name}: <b>{d.value}</b>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Donut 3: Rekomendasi */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-2">
                  <h4 className="font-bold text-xs text-slate-800">Rekomendasi Kelayakan Soal</h4>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieRecommendationData}
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieRecommendationData.map((entry, index) => (
                            <Cell key={`rec-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 text-[10px]">
                    {pieRecommendationData.map((d, i) => (
                      <span key={i} className="flex items-center gap-1 font-medium">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: d.color }}></span>
                        {d.name}: <b>{d.value}</b>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detailed Item Analysis Table */}
      <div className="bg-white border border-[#DEE2E6] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Table Filters & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filter Rekomendasi:</span>
            </span>
            {(['ALL', 'DITERIMA', 'REVISI', 'DITOLAK'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setTableFilter(f)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  tableFilter === f
                    ? f === 'DITERIMA'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : f === 'REVISI'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : f === 'DITOLAK'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-[#0052CC] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f === 'ALL' ? 'Semua Butir' : f === 'DITERIMA' ? 'Diterima' : f === 'REVISI' ? 'Perlu Revisi' : 'Ditolak'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nomor atau bunyi soal..."
                value={searchQuestion}
                onChange={e => setSearchQuestion(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] bg-white text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8F9FA] text-[#6C757D] uppercase text-[11px] font-bold tracking-wider border-b border-[#DEE2E6]">
              <tr>
                <th className="px-3.5 py-3 text-center w-12">No</th>
                <th className="px-4 py-3">Teks Butir Soal</th>
                <th className="px-3 py-3 text-center w-20">Kunci</th>
                <th className="px-3 py-3 text-center">Tingkat Kesukaran (P)</th>
                <th className="px-3 py-3 text-center">Daya Pembeda (D)</th>
                <th className="px-3 py-3 text-center">Benar (KA vs KB)</th>
                <th className="px-3 py-3 text-center">Status Rekomendasi</th>
                <th className="px-3.5 py-3 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DEE2E6]">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => {
                  const isAccepted = item.recommendation === 'DITERIMA';
                  const isRevision = item.recommendation === 'REVISI';
                  const isRejected = item.recommendation === 'DITOLAK';

                  return (
                    <tr key={item.questionId} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="px-3.5 py-3 text-center font-bold font-mono text-slate-600">
                        {item.questionNumber}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-[#1A1C1E] line-clamp-2 max-w-md">
                          {item.questionText.replace(/<[^>]*>?/gm, '')}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {item.questionId} • Tipe: {item.questionType}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-bold text-xs border border-blue-200">
                          {item.answerKey}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <div className="font-mono font-bold text-xs text-slate-900">{item.difficultyIndex}</div>
                        <span
                          className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                            item.difficultyCategory === 'SEDANG'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.difficultyCategory === 'MUDAH'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.difficultyCategory}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <div className="font-mono font-bold text-xs text-slate-900">{item.discriminationIndex}</div>
                        <span
                          className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                            item.discriminationCategory === 'SANGAT_BAIK'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.discriminationCategory === 'BAIK'
                              ? 'bg-sky-100 text-sky-800'
                              : item.discriminationCategory === 'CUKUP'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.discriminationCategory}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-center font-mono text-[11px] text-slate-600">
                        <span className="font-semibold text-emerald-700">{item.correctUpper}</span>
                        <span className="text-slate-400"> / </span>
                        <span className="font-semibold text-slate-600">{item.correctLower}</span>
                        <div className="text-[9px] text-slate-400">KA: {item.totalUpper} | KB: {item.totalLower}</div>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isAccepted
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isRevision
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {isAccepted ? (
                            <Check className="w-3 h-3" />
                          ) : isRevision ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          <span>{item.recommendation}</span>
                        </span>
                      </td>

                      <td className="px-3.5 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedQuestionModal(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer shadow-2xs"
                        >
                          <span>Rincian</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                    Tidak ada butir soal yang sesuai dengan kriteria filter saat ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Question Detail & Distractor Modal */}
      {selectedQuestionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#E7F0FF] text-[#0052CC] font-bold text-xs font-mono">
                    Nomor Soal {selectedQuestionModal.questionNumber}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      selectedQuestionModal.recommendation === 'DITERIMA'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedQuestionModal.recommendation === 'REVISI'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    Rekomendasi: {selectedQuestionModal.recommendation}
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-900 mt-1">Evaluasi Psikometri & Analisis Distraktor</h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedQuestionModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Question Text */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-2">
              <div className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">Teks Naskah Soal:</div>
              <p className="text-sm font-medium leading-relaxed">{selectedQuestionModal.questionText}</p>
              <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                <span>Kunci Jawaban Resmi: <b className="text-blue-700 font-mono text-xs">{selectedQuestionModal.answerKey}</b></span>
                <span>•</span>
                <span>Bobot Soal: <b className="text-slate-700">{selectedQuestionModal.points} Poin</b></span>
                <span>•</span>
                <span>Tipe: <b className="text-slate-700">{selectedQuestionModal.questionType}</b></span>
              </div>
            </div>

            {/* Score Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium">Tingkat Kesukaran (P)</span>
                <div className="text-base font-bold font-mono text-slate-900 mt-0.5">{selectedQuestionModal.difficultyIndex}</div>
                <div className="text-[10px] font-semibold text-indigo-700">{selectedQuestionModal.difficultyCategory}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium">Daya Pembeda (D)</span>
                <div className="text-base font-bold font-mono text-slate-900 mt-0.5">{selectedQuestionModal.discriminationIndex}</div>
                <div className="text-[10px] font-semibold text-emerald-700">{selectedQuestionModal.discriminationCategory}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium">Benar Kelompok Atas</span>
                <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                  {selectedQuestionModal.correctUpper} / {selectedQuestionModal.totalUpper}
                </div>
                <div className="text-[10px] text-slate-500">Proporsi PA: {selectedQuestionModal.proportionUpper}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium">Benar Kelompok Bawah</span>
                <div className="text-base font-bold font-mono text-rose-700 mt-0.5">
                  {selectedQuestionModal.correctLower} / {selectedQuestionModal.totalLower}
                </div>
                <div className="text-[10px] text-slate-500">Proporsi PB: {selectedQuestionModal.proportionLower}</div>
              </div>
            </div>

            {/* Distractor Analysis Breakdown */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                  <span>Pola Pemilihan Opsi Jawaban (Analisis Distraktor)</span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  Total Dijawab: <b>{selectedQuestionModal.totalAnswered} Siswa</b>
                </span>
              </div>

              <div className="space-y-2">
                {selectedQuestionModal.distractors.map(d => {
                  const isKey = d.isCorrect;
                  return (
                    <div
                      key={d.option}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        isKey
                          ? 'bg-emerald-50/70 border-emerald-300'
                          : d.status === 'MENYESATKAN'
                          ? 'bg-rose-50/60 border-rose-300'
                          : d.status === 'TIDAK_DIPILIH'
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs font-mono ${
                              isKey
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {d.option}
                          </span>
                          <span className="font-semibold text-slate-800">
                            {d.text || `Pilihan Jawaban ${d.option}`}
                          </span>
                          {isKey && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              KUNCI JAWABAN
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-slate-900 font-mono">{d.totalCount} Siswa</span>
                          <span className="text-[11px] text-slate-500 ml-1">({d.percentage}%)</span>
                        </div>
                      </div>

                      {/* Progress Bar for Option Selection */}
                      <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isKey ? 'bg-emerald-500' : d.status === 'MENYESATKAN' ? 'bg-rose-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(d.percentage, 2))}%` }}
                        ></div>
                      </div>

                      {/* Distractor Status & Notes */}
                      <div className="flex items-center justify-between text-[11px] pt-0.5">
                        <span className="text-slate-500">
                          Dipilih: KA: <b>{d.upperCount}</b> siswa | KB: <b>{d.lowerCount}</b> siswa
                        </span>
                        <span
                          className={`font-semibold ${
                            isKey
                              ? 'text-emerald-700'
                              : d.status === 'EFEKTIF'
                              ? 'text-blue-700'
                              : d.status === 'MENYESATKAN'
                              ? 'text-rose-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {d.notes}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recommendation Advice Box */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-1">
              <div className="font-bold text-blue-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#0052CC]" />
                <span>Rekomendasi Tindak Lanjut Guru:</span>
              </div>
              <p className="text-blue-900 leading-relaxed">{selectedQuestionModal.recommendationReason}</p>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedQuestionModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemAnalysisView;
