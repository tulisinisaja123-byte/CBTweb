import React, { useState, useMemo } from 'react';
import {
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Layers,
  Search,
  Eye,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Award,
  ListFilter
} from 'lucide-react';
import { Exam, QuestionType } from '../types';
import { parseMatchingDetails } from '../utils/matchingHelper';

export interface ParsedQuestionItem {
  ID?: string;
  EXAM_ID?: string;
  ASSESSMENT_TYPE_ID?: string;
  TYPE: QuestionType;
  QUESTION: string;
  OPTION_A?: string;
  OPTION_B?: string;
  OPTION_C?: string;
  OPTION_D?: string;
  OPTION_E?: string;
  ANSWER: string;
  POINTS: number;
  EXTRA_DATA?: string;
  warnings?: string[];
}

interface QuestionImportPreviewProps {
  fileName: string;
  fileSize?: number;
  fileType?: 'WORD' | 'EXCEL' | 'CSV';
  questions: ParsedQuestionItem[];
  exams: Exam[];
  selectedExamId: string;
  onSelectedExamChange: (examId: string) => void;
  onConfirmImport: () => Promise<void>;
  onResetFile: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const QuestionImportPreview: React.FC<QuestionImportPreviewProps> = ({
  fileName,
  fileSize = 0,
  fileType = 'EXCEL',
  questions,
  exams,
  selectedExamId,
  onSelectedExamChange,
  onConfirmImport,
  onResetFile,
  onCancel,
  isSubmitting = false
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [inspectedQuestion, setInspectedQuestion] = useState<ParsedQuestionItem | null>(null);

  // Target exam details
  const targetExam = useMemo(() => {
    return exams.find(e => e.ID === selectedExamId) || exams[0];
  }, [exams, selectedExamId]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = questions.length;
    const totalPoints = questions.reduce((acc, q) => acc + (Number(q.POINTS) || 10), 0);
    const mcq = questions.filter(q => q.TYPE === 'MCQ').length;
    const complex = questions.filter(q => q.TYPE === 'COMPLEX_MCQ').length;
    const tf = questions.filter(q => q.TYPE === 'TRUE_FALSE').length;
    const matching = questions.filter(q => q.TYPE === 'MATCHING').length;
    const short = questions.filter(q => q.TYPE === 'SHORT_ANSWER').length;
    const essay = questions.filter(q => q.TYPE === 'ESSAY').length;
    const warningCount = questions.filter(q => q.warnings && q.warnings.length > 0).length;

    return {
      total,
      totalPoints,
      mcq,
      complex,
      tf,
      matching,
      short,
      essay,
      warningCount,
      validCount: total - warningCount
    };
  }, [questions]);

  // Filtered preview items
  const filteredQuestions = useMemo(() => {
    return questions.filter((q, index) => {
      // Type filter
      if (filterType === 'WARNINGS') {
        if (!q.warnings || q.warnings.length === 0) return false;
      } else if (filterType !== 'ALL' && q.TYPE !== filterType) {
        return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const noMatch = String(index + 1).includes(query);
        const qMatch = q.QUESTION.toLowerCase().includes(query);
        const ansMatch = q.ANSWER.toLowerCase().includes(query);
        const optMatch = [q.OPTION_A, q.OPTION_B, q.OPTION_C, q.OPTION_D, q.OPTION_E]
          .filter(Boolean)
          .some(opt => String(opt).toLowerCase().includes(query));
        return noMatch || qMatch || ansMatch || optMatch;
      }

      return true;
    });
  }, [questions, filterType, searchTerm]);

  // Helper for question type badge styling
  const getTypeBadge = (type: QuestionType) => {
    switch (type) {
      case 'MCQ':
        return {
          label: 'Pilihan Ganda',
          shortLabel: 'PG',
          className: 'bg-[#EBF3FC] text-[#0052CC] border-[#B3D4FF]'
        };
      case 'COMPLEX_MCQ':
        return {
          label: 'PG Kompleks',
          shortLabel: 'PG Kompleks',
          className: 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]'
        };
      case 'TRUE_FALSE':
        return {
          label: 'Benar / Salah',
          shortLabel: 'B / S',
          className: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
        };
      case 'MATCHING':
        return {
          label: 'Menjodohkan',
          shortLabel: 'Jodohkan',
          className: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
        };
      case 'SHORT_ANSWER':
        return {
          label: 'Isian Singkat',
          shortLabel: 'Isian',
          className: 'bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]'
        };
      case 'ESSAY':
        return {
          label: 'Uraian / Esai',
          shortLabel: 'Esai',
          className: 'bg-[#FEF7E0] text-[#B06000] border-[#FEEFC3]'
        };
      default:
        return {
          label: type,
          shortLabel: type,
          className: 'bg-[#F1F3F5] text-[#495057] border-[#DEE2E6]'
        };
    }
  };

  // Helper to determine if an option key is part of the answer
  const isOptionSelected = (optLetter: string, answer: string, type: QuestionType): boolean => {
    if (!answer) return false;
    const cleanLetter = optLetter.toUpperCase().trim();
    if (type === 'MCQ') {
      return answer.trim().toUpperCase().startsWith(cleanLetter);
    }
    if (type === 'COMPLEX_MCQ') {
      const parts = answer.split(/[,;\s]+/).map(p => p.trim().toUpperCase());
      return parts.includes(cleanLetter);
    }
    return false;
  };

  return (
    <div className="space-y-4 text-[#1A1C1E]">
      {/* Top Banner: File Information & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#F8F9FA] rounded-lg border border-[#DEE2E6]">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              fileType === 'WORD'
                ? 'bg-[#0052CC]/10 text-[#0052CC] border border-[#0052CC]/20'
                : 'bg-[#137333]/10 text-[#137333] border border-[#137333]/20'
            }`}
          >
            {fileType === 'WORD' ? (
              <FileText className="w-5 h-5" />
            ) : (
              <FileSpreadsheet className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#1A1C1E] break-all">{fileName}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  fileType === 'WORD'
                    ? 'bg-[#EBF3FC] text-[#0052CC] border border-[#B3D4FF]'
                    : 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]'
                }`}
              >
                {fileType === 'WORD' ? 'Word .docx' : 'Excel / CSV'}
              </span>
            </div>
            <p className="text-xs text-[#5E6C84]">
              {fileSize > 0 ? `${(fileSize / 1024).toFixed(1)} KB • ` : ''}
              Terbaca <strong className="text-[#1A1C1E]">{questions.length} butir soal</strong> siap diproses
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetFile}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-[#CED4DA] text-xs font-semibold text-[#495057] hover:bg-[#F1F3F5] transition-colors shadow-2xs self-start sm:self-auto"
          title="Ganti atau pilih file lain"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Ganti File</span>
        </button>
      </div>

      {/* Target Exam Selector Box */}
      <div className="p-3.5 bg-[#EBF3FC] rounded-lg border border-[#B3D4FF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#0052CC] shrink-0" />
          <div>
            <div className="text-xs font-bold text-[#0052CC]">Target Ujian / Mata Pelajaran</div>
            <div className="text-[11px] text-[#495057]">
              Pilih jadwal ujian tujuan penyimpanan bank soal ini:
            </div>
          </div>
        </div>
        <div className="sm:w-80">
          <select
            value={selectedExamId}
            onChange={e => onSelectedExamChange(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-[#B3D4FF] rounded-md text-xs font-semibold text-[#1A1C1E] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
          >
            {exams.length === 0 && <option value="">Belum ada jadwal ujian aktif</option>}
            {exams.map(ex => (
              <option key={ex.ID} value={ex.ID}>
                {ex.TITLE} ({ex.ID})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistical Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#DEE2E6] flex items-center gap-2.5 shadow-2xs">
          <div className="w-8 h-8 rounded-md bg-[#EBF3FC] text-[#0052CC] flex items-center justify-center shrink-0 font-bold text-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-[#5E6C84]">Total Butir Soal</div>
            <div className="text-base font-bold text-[#1A1C1E]">{stats.total} Soal</div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#DEE2E6] flex items-center gap-2.5 shadow-2xs">
          <div className="w-8 h-8 rounded-md bg-[#FEF7E0] text-[#B06000] flex items-center justify-center shrink-0 font-bold text-xs">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-[#5E6C84]">Total Bobot Poin</div>
            <div className="text-base font-bold text-[#1A1C1E]">{stats.totalPoints} Poin</div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#DEE2E6] flex items-center gap-2.5 shadow-2xs">
          <div
            className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 font-bold text-xs ${
              stats.warningCount === 0
                ? 'bg-[#E6F4EA] text-[#137333]'
                : 'bg-[#FCE8E6] text-[#C5221F]'
            }`}
          >
            {stats.warningCount === 0 ? (
              <ShieldCheck className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="text-[11px] text-[#5E6C84]">Validitas Data</div>
            <div
              className={`text-xs font-bold ${
                stats.warningCount === 0 ? 'text-[#137333]' : 'text-[#C5221F]'
              }`}
            >
              {stats.warningCount === 0 ? (
                '100% Siap Simpan'
              ) : (
                `${stats.warningCount} Perlu Dicek`
              )}
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#DEE2E6] flex items-center gap-2.5 shadow-2xs">
          <div className="w-8 h-8 rounded-md bg-[#F1F3F5] text-[#495057] flex items-center justify-center shrink-0 font-bold text-xs">
            <ListFilter className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-[#5E6C84]">Variasi Tipe Soal</div>
            <div className="text-xs font-bold text-[#1A1C1E] truncate">
              {stats.mcq > 0 && `${stats.mcq} PG `}
              {stats.complex > 0 && `${stats.complex} PG Komp `}
              {stats.tf > 0 && `${stats.tf} B/S `}
              {stats.matching > 0 && `${stats.matching} Jodoh `}
              {stats.short > 0 && `${stats.short} Isian `}
              {stats.essay > 0 && `${stats.essay} Esai`}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-1">
        {/* Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              filterType === 'ALL'
                ? 'bg-[#0052CC] text-white shadow-2xs'
                : 'bg-[#F1F3F5] text-[#495057] hover:bg-[#E9ECEF]'
            }`}
          >
            Semua ({stats.total})
          </button>
          {stats.mcq > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('MCQ')}
              className={`px-2 py-1 rounded-md font-semibold transition-colors ${
                filterType === 'MCQ'
                  ? 'bg-[#0052CC] text-white shadow-2xs'
                  : 'bg-[#EBF3FC] text-[#0052CC] hover:bg-blue-100'
              }`}
            >
              PG ({stats.mcq})
            </button>
          )}
          {stats.complex > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('COMPLEX_MCQ')}
              className={`px-2 py-1 rounded-md font-semibold transition-colors ${
                filterType === 'COMPLEX_MCQ'
                  ? 'bg-[#7E22CE] text-white shadow-2xs'
                  : 'bg-[#F3E8FF] text-[#7E22CE] hover:bg-purple-100'
              }`}
            >
              PG Komp ({stats.complex})
            </button>
          )}
          {stats.tf > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('TRUE_FALSE')}
              className={`px-2 py-1 rounded-md font-semibold transition-colors ${
                filterType === 'TRUE_FALSE'
                  ? 'bg-[#047857] text-white shadow-2xs'
                  : 'bg-[#ECFDF5] text-[#047857] hover:bg-emerald-100'
              }`}
            >
              B / S ({stats.tf})
            </button>
          )}
          {stats.matching > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('MATCHING')}
              className={`px-2 py-1 rounded-md font-semibold transition-colors ${
                filterType === 'MATCHING'
                  ? 'bg-[#1D4ED8] text-white shadow-2xs'
                  : 'bg-[#EFF6FF] text-[#1D4ED8] hover:bg-blue-100'
              }`}
            >
              Menjodohkan ({stats.matching})
            </button>
          )}
          {stats.short > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('SHORT_ANSWER')}
              className={`px-2 py-1 rounded-md font-semibold transition-colors ${
                filterType === 'SHORT_ANSWER'
                  ? 'bg-[#C2410C] text-white shadow-2xs'
                  : 'bg-[#FFF7ED] text-[#C2410C] hover:bg-orange-100'
              }`}
            >
              Isian ({stats.short})
            </button>
          )}
          {stats.essay > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('ESSAY')}
              className={`px-2 py-1 rounded-md font-semibold transition-colors ${
                filterType === 'ESSAY'
                  ? 'bg-[#B06000] text-white shadow-2xs'
                  : 'bg-[#FEF7E0] text-[#B06000] hover:bg-amber-100'
              }`}
            >
              Esai ({stats.essay})
            </button>
          )}
          {stats.warningCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('WARNINGS')}
              className={`px-2 py-1 rounded-md font-semibold transition-colors inline-flex items-center gap-1 ${
                filterType === 'WARNINGS'
                  ? 'bg-[#C5221F] text-white shadow-2xs'
                  : 'bg-[#FCE8E6] text-[#C5221F] hover:bg-red-100'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Perlu Cek ({stats.warningCount})</span>
            </button>
          )}
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-[#6C757D] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari teks soal atau kunci..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#CED4DA] rounded-md text-[#1A1C1E] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6C757D] hover:text-[#1A1C1E]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Interactive Preview Table */}
      <div className="border border-[#DEE2E6] rounded-lg overflow-hidden bg-white shadow-2xs">
        <div className="max-h-[380px] overflow-y-auto overflow-x-auto divide-y divide-[#E9ECEF]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8F9FA] sticky top-0 z-10 text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-[#DEE2E6]">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">No.</th>
                <th className="py-2.5 px-3 w-28">Tipe Soal</th>
                <th className="py-2.5 px-3 min-w-[240px]">Teks Pertanyaan</th>
                <th className="py-2.5 px-3 min-w-[200px]">Pilihan Jawaban (A - E)</th>
                <th className="py-2.5 px-3 w-32 text-center">Kunci Jawaban</th>
                <th className="py-2.5 px-3 w-16 text-center">Poin</th>
                <th className="py-2.5 px-3 w-24 text-center">Status</th>
                <th className="py-2.5 px-3 w-14 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9ECEF] text-[#1A1C1E]">
              {filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#6C757D]">
                    <div className="space-y-1">
                      <p className="font-semibold text-xs">Tidak ada butir soal yang sesuai filter pencarian</p>
                      <p className="text-[11px]">Coba ganti kata kunci atau pilih tab filter lain di atas.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((q, idx) => {
                  const badge = getTypeBadge(q.TYPE);
                  const hasWarning = q.warnings && q.warnings.length > 0;
                  const originalIndex = questions.indexOf(q) + 1;

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-[#F8F9FA] transition-colors ${
                        hasWarning ? 'bg-[#FFF9F9]' : ''
                      }`}
                    >
                      {/* No. */}
                      <td className="py-3 px-3 text-center font-bold text-[#495057]">
                        {originalIndex}
                      </td>

                      {/* Question Type */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${badge.className}`}
                        >
                          {badge.shortLabel}
                        </span>
                      </td>

                      {/* Question Text */}
                      <td className="py-3 px-3 align-top">
                        <div className="space-y-1 max-w-md">
                          <div
                            className="font-medium line-clamp-3 text-[#1A1C1E] leading-relaxed break-words"
                            dangerouslySetInnerHTML={{ __html: q.QUESTION }}
                          />
                          {hasWarning && (
                            <div className="flex items-center gap-1 text-[10px] text-[#C5221F] font-semibold">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              <span>{q.warnings?.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Options A - E */}
                      <td className="py-3 px-3 align-top">
                        {q.TYPE === 'MCQ' || q.TYPE === 'COMPLEX_MCQ' ? (
                          <div className="space-y-1 text-[11px]">
                            {q.OPTION_A && (
                              <div
                                className={`flex items-start gap-1 rounded px-1.5 py-0.5 ${
                                  isOptionSelected('A', q.ANSWER, q.TYPE)
                                    ? 'bg-[#E6F4EA] text-[#137333] font-bold border border-[#CEEAD6]'
                                    : 'text-[#495057]'
                                }`}
                              >
                                <span className="font-semibold shrink-0">A.</span>
                                <span className="truncate">{q.OPTION_A}</span>
                                {isOptionSelected('A', q.ANSWER, q.TYPE) && (
                                  <Check className="w-3 h-3 ml-auto text-[#137333] shrink-0" />
                                )}
                              </div>
                            )}
                            {q.OPTION_B && (
                              <div
                                className={`flex items-start gap-1 rounded px-1.5 py-0.5 ${
                                  isOptionSelected('B', q.ANSWER, q.TYPE)
                                    ? 'bg-[#E6F4EA] text-[#137333] font-bold border border-[#CEEAD6]'
                                    : 'text-[#495057]'
                                }`}
                              >
                                <span className="font-semibold shrink-0">B.</span>
                                <span className="truncate">{q.OPTION_B}</span>
                                {isOptionSelected('B', q.ANSWER, q.TYPE) && (
                                  <Check className="w-3 h-3 ml-auto text-[#137333] shrink-0" />
                                )}
                              </div>
                            )}
                            {q.OPTION_C && (
                              <div
                                className={`flex items-start gap-1 rounded px-1.5 py-0.5 ${
                                  isOptionSelected('C', q.ANSWER, q.TYPE)
                                    ? 'bg-[#E6F4EA] text-[#137333] font-bold border border-[#CEEAD6]'
                                    : 'text-[#495057]'
                                }`}
                              >
                                <span className="font-semibold shrink-0">C.</span>
                                <span className="truncate">{q.OPTION_C}</span>
                                {isOptionSelected('C', q.ANSWER, q.TYPE) && (
                                  <Check className="w-3 h-3 ml-auto text-[#137333] shrink-0" />
                                )}
                              </div>
                            )}
                            {q.OPTION_D && (
                              <div
                                className={`flex items-start gap-1 rounded px-1.5 py-0.5 ${
                                  isOptionSelected('D', q.ANSWER, q.TYPE)
                                    ? 'bg-[#E6F4EA] text-[#137333] font-bold border border-[#CEEAD6]'
                                    : 'text-[#495057]'
                                }`}
                              >
                                <span className="font-semibold shrink-0">D.</span>
                                <span className="truncate">{q.OPTION_D}</span>
                                {isOptionSelected('D', q.ANSWER, q.TYPE) && (
                                  <Check className="w-3 h-3 ml-auto text-[#137333] shrink-0" />
                                )}
                              </div>
                            )}
                            {q.OPTION_E && (
                              <div
                                className={`flex items-start gap-1 rounded px-1.5 py-0.5 ${
                                  isOptionSelected('E', q.ANSWER, q.TYPE)
                                    ? 'bg-[#E6F4EA] text-[#137333] font-bold border border-[#CEEAD6]'
                                    : 'text-[#495057]'
                                }`}
                              >
                                <span className="font-semibold shrink-0">E.</span>
                                <span className="truncate">{q.OPTION_E}</span>
                                {isOptionSelected('E', q.ANSWER, q.TYPE) && (
                                  <Check className="w-3 h-3 ml-auto text-[#137333] shrink-0" />
                                )}
                              </div>
                            )}
                          </div>
                        ) : q.TYPE === 'TRUE_FALSE' ? (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span
                              className={`px-2 py-0.5 rounded font-bold border ${
                                q.ANSWER.toUpperCase().includes('BENAR')
                                  ? 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
                                  : 'bg-[#F1F3F5] text-[#6C757D] border-[#DEE2E6]'
                              }`}
                            >
                              Benar
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded font-bold border ${
                                q.ANSWER.toUpperCase().includes('SALAH')
                                  ? 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
                                  : 'bg-[#F1F3F5] text-[#6C757D] border-[#DEE2E6]'
                              }`}
                            >
                              Salah
                            </span>
                          </div>
                        ) : q.TYPE === 'MATCHING' ? (
                          (() => {
                            const details = parseMatchingDetails(
                              q.QUESTION,
                              { A: q.OPTION_A, B: q.OPTION_B, C: q.OPTION_C, D: q.OPTION_D, E: q.OPTION_E },
                              q.EXTRA_DATA,
                              q.ANSWER
                            );
                            return (
                              <div className="text-[11px] space-y-1.5 max-w-sm">
                                <div className="space-y-1 bg-[#F8F9FA] p-2 rounded border border-[#DEE2E6]">
                                  {details.leftItems.slice(0, 4).map(item => {
                                    const pairedKey = details.correctPairs[item.key];
                                    const pairedRight = details.rightItems.find(r => r.key === pairedKey);
                                    return (
                                      <div key={item.key} className="flex items-center gap-1.5 text-[10px] leading-tight">
                                        <span className="px-1.5 py-0.5 rounded bg-[#E8F0FE] text-[#1967D2] font-bold shrink-0">
                                          {item.key}. {item.text}
                                        </span>
                                        <span className="text-[#6C757D] font-bold shrink-0">➔</span>
                                        <span className={`px-1.5 py-0.5 rounded font-bold truncate max-w-[150px] ${pairedKey ? 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]' : 'bg-[#F1F3F4] text-[#70757A]'}`}>
                                          {pairedKey ? `${pairedKey}. ${pairedRight ? pairedRight.text : ''}` : '(Belum ada)'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                  {details.leftItems.length > 4 && (
                                    <div className="text-[9px] text-[#6C757D] italic pt-0.5">
                                      + {details.leftItems.length - 4} item lainnya...
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()
                        ) : q.TYPE === 'SHORT_ANSWER' ? (
                          <div className="text-[11px] text-[#495057] italic">
                            Jawaban isian singkat diketik langsung oleh siswa.
                          </div>
                        ) : (
                          <div className="text-[11px] text-[#495057] italic">
                            Jawaban esai dikoreksi manual oleh guru melalui menu Koreksi.
                          </div>
                        )}
                      </td>

                      {/* Answer Key */}
                      <td className="py-3 px-3 text-center align-top">
                        {q.ANSWER ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#E6F4EA] text-[#137333] font-bold border border-[#CEEAD6] text-xs shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#137333]" />
                            <span>{q.ANSWER}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3] text-[10px] font-semibold">
                            Manual / Kosong
                          </span>
                        )}
                      </td>

                      {/* Points */}
                      <td className="py-3 px-3 text-center font-bold text-[#1A1C1E] align-top">
                        {q.POINTS || 10}
                      </td>

                      {/* Validity Status */}
                      <td className="py-3 px-3 text-center align-top">
                        {hasWarning ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF] text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Perlu Cek</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] text-[10px] font-bold">
                            <Check className="w-3 h-3" />
                            <span>Valid</span>
                          </span>
                        )}
                      </td>

                      {/* Action: Inspect */}
                      <td className="py-3 px-3 text-center align-top">
                        <button
                          type="button"
                          onClick={() => setInspectedQuestion(q)}
                          className="p-1 rounded text-[#0052CC] hover:bg-[#EBF3FC] transition-colors"
                          title="Lihat Pratinjau Tampilan Siswa"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Footer Controls */}
      <div className="pt-3 border-t border-[#DEE2E6] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-[#5E6C84]">
          Menampilkan <strong className="text-[#1A1C1E]">{filteredQuestions.length}</strong> dari{' '}
          <strong className="text-[#1A1C1E]">{questions.length}</strong> butir soal terdeteksi
          {targetExam && (
            <span>
              {' '}
              • Target: <strong className="text-[#0052CC]">{targetExam.TITLE}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md border border-[#CED4DA] bg-white text-[#495057] text-xs font-semibold hover:bg-[#F1F3F5] transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={questions.length === 0 || isSubmitting || !selectedExamId}
            onClick={onConfirmImport}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2 rounded-md text-xs font-bold text-white shadow-xs transition-colors ${
              questions.length === 0 || isSubmitting || !selectedExamId
                ? 'bg-[#A6C8FF] cursor-not-allowed'
                : 'bg-[#0052CC] hover:bg-[#0047B3]'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Menyimpan ke Database...</span>
              </>
            ) : (
              <>
                <span>Simpan {questions.length} Soal ke Database</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Student Simulator Modal for Question Inspection */}
      {inspectedQuestion && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-[#CED4DA] overflow-hidden">
            <div className="px-5 py-3.5 bg-[#0052CC] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-white" />
                <h3 className="font-bold text-sm text-white">Simulasi Tampilan Siswa (CBT)</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedQuestion(null)}
                className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[#DEE2E6]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#0052CC]">
                    Soal No. {questions.indexOf(inspectedQuestion) + 1}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      getTypeBadge(inspectedQuestion.TYPE).className
                    }`}
                  >
                    {getTypeBadge(inspectedQuestion.TYPE).label}
                  </span>
                </div>
                <span className="font-bold text-[#137333] bg-[#E6F4EA] px-2 py-0.5 rounded border border-[#CEEAD6]">
                  Bobot: {inspectedQuestion.POINTS} Poin
                </span>
              </div>

              {/* Question Body */}
              <div
                className="text-sm font-medium text-[#1A1C1E] leading-relaxed break-words"
                dangerouslySetInnerHTML={{ __html: inspectedQuestion.QUESTION }}
              />

              {/* Options */}
              {(inspectedQuestion.TYPE === 'MCQ' || inspectedQuestion.TYPE === 'COMPLEX_MCQ') && (
                <div className="space-y-2 pt-2">
                  {[
                    { key: 'A', text: inspectedQuestion.OPTION_A },
                    { key: 'B', text: inspectedQuestion.OPTION_B },
                    { key: 'C', text: inspectedQuestion.OPTION_C },
                    { key: 'D', text: inspectedQuestion.OPTION_D },
                    { key: 'E', text: inspectedQuestion.OPTION_E }
                  ]
                    .filter(opt => Boolean(opt.text))
                    .map(opt => {
                      const isCorrect = isOptionSelected(
                        opt.key,
                        inspectedQuestion.ANSWER,
                        inspectedQuestion.TYPE
                      );
                      return (
                        <div
                          key={opt.key}
                          className={`flex items-start gap-3 p-2.5 rounded-lg border text-xs transition-colors ${
                            isCorrect
                              ? 'bg-[#E6F4EA] border-[#34A853] text-[#137333] font-bold'
                              : 'bg-[#F8F9FA] border-[#DEE2E6] text-[#1A1C1E]'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                              isCorrect
                                ? 'bg-[#34A853] text-white'
                                : 'bg-white border border-[#CED4DA] text-[#495057]'
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="pt-0.5 flex-1">{opt.text}</span>
                          {isCorrect && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-[#137333] border border-[#34A853] shrink-0">
                              KUNCI BENAR
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Matching Simulator Preview */}
              {inspectedQuestion.TYPE === 'MATCHING' && (() => {
                const details = parseMatchingDetails(
                  inspectedQuestion.QUESTION,
                  {
                    A: inspectedQuestion.OPTION_A,
                    B: inspectedQuestion.OPTION_B,
                    C: inspectedQuestion.OPTION_C,
                    D: inspectedQuestion.OPTION_D,
                    E: inspectedQuestion.OPTION_E
                  },
                  inspectedQuestion.EXTRA_DATA,
                  inspectedQuestion.ANSWER
                );
                return (
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-bold text-[#1A1C1E] flex items-center justify-between">
                      <span>Struktur Pasangan Menjodohkan:</span>
                      <span className="text-[11px] text-[#0052CC] font-semibold bg-[#E7F0FF] px-2 py-0.5 rounded">
                        {details.leftItems.length} Premis Kiri ✕ {details.rightItems.length} Pilihan Kanan
                      </span>
                    </div>

                    <div className="space-y-2">
                      {details.leftItems.map((item, idx) => {
                        const matchedKey = details.correctPairs[item.key];
                        const matchedRight = details.rightItems.find(r => r.key === matchedKey);
                        return (
                          <div
                            key={item.key}
                            className="p-3 rounded-lg border border-[#DEE2E6] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5 flex-1">
                              <span className="w-6 h-6 rounded-full bg-[#E8F0FE] text-[#0052CC] font-bold text-xs inline-flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-medium text-[#1A1C1E]">{item.text}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-[#6C757D] font-bold">➔ Kunci:</span>
                              <div className="px-2.5 py-1 rounded-md text-xs font-bold border border-[#34A853] bg-[#E6F4EA] text-[#137333] flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-[#34A853] text-white text-[10px] inline-flex items-center justify-center font-bold">
                                  {matchedKey || '?'}
                                </span>
                                <span className="max-w-[180px] truncate">{matchedRight ? matchedRight.text : `Opsi ${matchedKey || '-'}`}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Answer Key & Teacher Verification Note */}
              <div className="p-3 bg-[#F8F9FA] rounded-lg border border-[#DEE2E6] text-xs space-y-1">
                <div className="font-bold text-[#1A1C1E] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#137333]" />
                  <span>Kunci Jawaban Resmi:</span>
                  <span className="font-bold text-[#137333] bg-[#E6F4EA] px-2 py-0.5 rounded border border-[#CEEAD6]">
                    {inspectedQuestion.ANSWER || 'Belum diisi'}
                  </span>
                </div>
                {inspectedQuestion.warnings && inspectedQuestion.warnings.length > 0 && (
                  <div className="text-[11px] text-[#C5221F] pt-1">
                    Peringatan: {inspectedQuestion.warnings.join(', ')}
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-3 bg-[#F8F9FA] border-t border-[#DEE2E6] flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedQuestion(null)}
                className="px-4 py-1.5 rounded-md bg-[#0052CC] text-white text-xs font-bold hover:bg-[#0047B3]"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
