import React, { useState, useRef, useMemo, useCallback } from 'react';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import {
  FileText,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Download,
  X,
  HelpCircle,
  BookOpen,
  Eye,
  Code,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Save,
  Search,
  Filter,
  Layers,
  ArrowRight,
  Info,
  CheckCheck,
  FileCode2,
  Trash2,
  Edit3
} from 'lucide-react';
import { Exam, QuestionType } from '../types';
import { downloadQuestionsWordTemplate } from '../utils/wordTemplates';
import { downloadQuestionsTemplate, downloadQuestionsSingleColumnTemplate } from '../utils/excelTemplates';
import { parseQuestionsFromWord, normalizeQuestionType } from '../utils/wordParser';
import { parseExcelQuestionRows } from '../utils/excelQuestionParser';
import { RichContentRenderer } from './RichContentRenderer';

// ----------------------------------------------------
// STANDAR FORMAT JSON BANK SOAL
// ----------------------------------------------------
export interface BankSoalItemJSON {
  id?: string;
  soal: string; // Teks pertanyaan
  tipe: QuestionType; // MCQ, COMPLEX_MCQ, TRUE_FALSE, MATCHING, SHORT_ANSWER, ESSAY
  pilihan_jawaban: {
    A?: string;
    B?: string;
    C?: string;
    D?: string;
    E?: string;
    [key: string]: string | undefined;
  };
  kunci_jawaban: string; // Kunci jawaban
  bobot: number; // Bobot nilai / poin
  extra_data?: string;
  warnings?: string[];
}

export interface BankSoalImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams?: Exam[];
  selectedExamId?: string;
  onSelectedExamChange?: (examId: string) => void;
  onSaveToBankSoal?: (questions: BankSoalItemJSON[], targetExamId: string) => Promise<void> | void;
  teacherName?: string;
}

/**
 * Validasi dan berikan peringatan untuk setiap butir soal hasil konversi
 */
export function validateBankSoalItem(item: BankSoalItemJSON): string[] {
  const warnings: string[] = [];
  if (!item.soal || !item.soal.trim()) {
    warnings.push('Teks pertanyaan (soal) masih kosong.');
  }

  if (item.tipe === 'MCQ') {
    if (!item.pilihan_jawaban.A || !item.pilihan_jawaban.B) {
      warnings.push('Soal Pilihan Ganda minimal harus memiliki opsi A dan B.');
    }
    if (!item.kunci_jawaban) {
      warnings.push('Kunci jawaban belum ditentukan (A/B/C/D/E).');
    }
  } else if (item.tipe === 'COMPLEX_MCQ') {
    if (!item.pilihan_jawaban.A || !item.pilihan_jawaban.B) {
      warnings.push('Soal PG Kompleks minimal harus memiliki opsi pilihan.');
    }
    if (!item.kunci_jawaban) {
      warnings.push('Kunci jawaban kombinasi belum ditentukan (misal: A, C).');
    }
  } else if (item.tipe === 'TRUE_FALSE') {
    const k = item.kunci_jawaban.toUpperCase();
    if (k !== 'BENAR' && k !== 'SALAH' && k !== 'TRUE' && k !== 'FALSE') {
      warnings.push('Kunci jawaban Benar/Salah harus berupa "BENAR" atau "SALAH".');
    }
  } else if (item.tipe === 'MATCHING') {
    if (!item.kunci_jawaban) {
      warnings.push('Kunci pasangan menjodohkan belum diatur.');
    }
  } else if (item.tipe === 'SHORT_ANSWER') {
    if (!item.kunci_jawaban) {
      warnings.push('Kunci teks isian singkat belum terisi.');
    }
  }

  if (item.bobot <= 0) {
    warnings.push('Bobot nilai harus lebih dari 0.');
  }

  return warnings;
}

// ----------------------------------------------------
// 1. FUNGSI PARSING FILE WORD (.docx) DENGAN MAMMOTH (DELEGATED TO WORDPARSER)
// ----------------------------------------------------
export async function parseBankSoalFromWord(file: File): Promise<BankSoalItemJSON[]> {
  const wordQuestions = await parseQuestionsFromWord(file, '');
  return wordQuestions.map((q, idx) => {
    const pilihan: Record<string, string> = {};
    if (q.OPTION_A) pilihan.A = q.OPTION_A;
    if (q.OPTION_B) pilihan.B = q.OPTION_B;
    if (q.OPTION_C) pilihan.C = q.OPTION_C;
    if (q.OPTION_D) pilihan.D = q.OPTION_D;
    if (q.OPTION_E) pilihan.E = q.OPTION_E;

    const item: BankSoalItemJSON = {
      id: q.ID || `WS-${Date.now()}-${idx + 1}`,
      soal: q.QUESTION,
      tipe: q.TYPE,
      pilihan_jawaban: pilihan,
      kunci_jawaban: q.ANSWER,
      bobot: q.POINTS || 10,
      extra_data: q.EXTRA_DATA
    };
    item.warnings = validateBankSoalItem(item);
    return item;
  });
}

// ----------------------------------------------------
// 2. FUNGSI PARSING FILE EXCEL (.xlsx) DENGAN XLSX (DELEGATED TO EXCELQUESTIONPARSER)
// ----------------------------------------------------
export async function parseBankSoalFromExcel(file: File): Promise<BankSoalItemJSON[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Cari sheet bernama BANK_SOAL / SOAL, atau gunakan sheet pertama
  const targetSheetName =
    workbook.SheetNames.find(s => s.toUpperCase().includes('BANK') || s.toUpperCase().includes('SOAL')) ||
    workbook.SheetNames[0];

  const worksheet = workbook.Sheets[targetSheetName];
  if (!worksheet) return [];

  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
  const parsedRows = parseExcelQuestionRows(rawRows, '');

  return parsedRows.map((q, idx) => {
    const pilihan: Record<string, string> = {};
    if (q.OPTION_A) pilihan.A = q.OPTION_A;
    if (q.OPTION_B) pilihan.B = q.OPTION_B;
    if (q.OPTION_C) pilihan.C = q.OPTION_C;
    if (q.OPTION_D) pilihan.D = q.OPTION_D;
    if (q.OPTION_E) pilihan.E = q.OPTION_E;

    const item: BankSoalItemJSON = {
      id: q.ID || `EX-${Date.now()}-${idx + 1}`,
      soal: q.QUESTION,
      tipe: q.TYPE,
      pilihan_jawaban: pilihan,
      kunci_jawaban: q.ANSWER,
      bobot: q.POINTS || 10,
      extra_data: q.EXTRA_DATA
    };
    item.warnings = validateBankSoalItem(item);
    return item;
  });
}

// ----------------------------------------------------
// 3. KOMPONEN UTAMA IMPORT BANK SOAL GURU
// ----------------------------------------------------
export const BankSoalImportModal: React.FC<BankSoalImportModalProps> = ({
  isOpen,
  onClose,
  exams = [],
  selectedExamId,
  onSelectedExamChange,
  onSaveToBankSoal,
  teacherName = 'Guru Mata Pelajaran'
}) => {
  // State Target Ujian
  const [targetExam, setTargetExam] = useState<string>(selectedExamId || exams[0]?.ID || '');

  // File & Upload State
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [parsing, setParsing] = useState<boolean>(false);
  const [parsingStep, setParsingStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Parsed Questions State
  const [parsedItems, setParsedItems] = useState<BankSoalItemJSON[]>([]);
  const [activeTab, setActiveTab] = useState<'preview' | 'json'>('preview');
  const [copiedJSON, setCopiedJSON] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync exam id when changed from props
  React.useEffect(() => {
    if (selectedExamId) {
      setTargetExam(selectedExamId);
    } else if (exams.length > 0 && !targetExam) {
      setTargetExam(exams[0].ID);
    }
  }, [selectedExamId, exams]);

  if (!isOpen) return null;

  // Handler Proses File
  const handleProcessFile = async (uploadedFile: File) => {
    const ext = uploadedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'docx' && ext !== 'xlsx' && ext !== 'xls') {
      setErrorMsg('Format file tidak didukung. Harap unggah dokumen Word (.docx) atau Excel (.xlsx / .xls).');
      return;
    }

    setFile(uploadedFile);
    setErrorMsg('');
    setParsing(true);
    setParsingStep('Membaca struktur berkas...');

    try {
      let results: BankSoalItemJSON[] = [];

      if (ext === 'docx') {
        setParsingStep('Mengintegrasikan Mammoth & membaca naskah Word...');
        results = await parseBankSoalFromWord(uploadedFile);
      } else {
        setParsingStep('Mengintegrasikan SheetJS (XLSX) & membaca baris data...');
        results = await parseBankSoalFromExcel(uploadedFile);
      }

      setParsingStep('Memvalidasi format standar JSON bank soal...');
      await new Promise(r => setTimeout(r, 400)); // Animasi transisi halus

      if (results.length === 0) {
        setErrorMsg(
          'Tidak ditemukan butir soal yang valid dalam dokumen ini. Pastikan berkas mengikuti template resmi naskah soal.'
        );
        setParsedItems([]);
      } else {
        setParsedItems(results);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan teknis saat memproses file. Pastikan berkas tidak terenkripsi.');
      setParsedItems([]);
    } finally {
      setParsing(false);
      setParsingStep('');
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // Reset State
  const handleReset = () => {
    setFile(null);
    setParsedItems([]);
    setErrorMsg('');
    setEditingItemIndex(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Salin JSON ke Clipboard
  const handleCopyJSON = () => {
    const jsonStr = JSON.stringify(parsedItems, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedJSON(true);
    setTimeout(() => setCopiedJSON(false), 2000);
  };

  // Download JSON File
  const handleDownloadJSON = () => {
    const jsonStr = JSON.stringify(parsedItems, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bank_Soal_Standard_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Update butir soal hasil parsing saat diedit langsung
  const handleUpdateItem = (index: number, updated: Partial<BankSoalItemJSON>) => {
    setParsedItems(prev => {
      const next = [...prev];
      const merged = { ...next[index], ...updated };
      merged.warnings = validateBankSoalItem(merged);
      next[index] = merged;
      return next;
    });
  };

  // Hapus 1 butir soal dari hasil parsing
  const handleDeleteItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== index));
    if (editingItemIndex === index) setEditingItemIndex(null);
  };

  // Konfirmasi Simpan ke Bank Soal
  const handleConfirmSave = async () => {
    if (!targetExam && exams.length > 0) {
      setErrorMsg('Pilih paket ujian target terlebih dahulu.');
      return;
    }
    if (parsedItems.length === 0) {
      setErrorMsg('Tidak ada butir soal yang siap disimpan.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (onSaveToBankSoal) {
        await onSaveToBankSoal(parsedItems, targetExam);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan soal ke bank data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Statistik Soal
  const stats = useMemo(() => {
    const total = parsedItems.length;
    const totalBobot = parsedItems.reduce((acc, q) => acc + (q.bobot || 10), 0);
    const mcq = parsedItems.filter(q => q.tipe === 'MCQ').length;
    const complex = parsedItems.filter(q => q.tipe === 'COMPLEX_MCQ').length;
    const tf = parsedItems.filter(q => q.tipe === 'TRUE_FALSE').length;
    const matching = parsedItems.filter(q => q.tipe === 'MATCHING').length;
    const short = parsedItems.filter(q => q.tipe === 'SHORT_ANSWER').length;
    const essay = parsedItems.filter(q => q.tipe === 'ESSAY').length;
    const warningCount = parsedItems.filter(q => q.warnings && q.warnings.length > 0).length;

    return { total, totalBobot, mcq, complex, tf, matching, short, essay, warningCount };
  }, [parsedItems]);

  // Filter list soal
  const filteredItems = useMemo(() => {
    return parsedItems.filter((item, index) => {
      if (filterType === 'WARNINGS' && (!item.warnings || item.warnings.length === 0)) return false;
      if (filterType !== 'ALL' && filterType !== 'WARNINGS' && item.tipe !== filterType) return false;

      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchesPrompt = item.soal.toLowerCase().includes(s);
        const matchesKey = item.kunci_jawaban.toLowerCase().includes(s);
        const matchesNo = `nomor ${index + 1}`.includes(s) || `${index + 1}` === s;
        return matchesPrompt || matchesKey || matchesNo;
      }
      return true;
    });
  }, [parsedItems, filterType, searchTerm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fadeIn font-sans">
      <div
        className={`bg-white rounded-2xl shadow-2xl ${
          parsedItems.length > 0 ? 'max-w-6xl' : 'max-w-3xl'
        } w-full border border-[#CED4DA] overflow-hidden my-4 flex flex-col max-h-[92vh] transition-all`}
      >
        {/* ====================================================
            1. HEADER MODAL KHUSUS GURU
        ==================================================== */}
        <header className="px-5 sm:px-6 py-4 bg-[#0052CC] text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-2xs shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Import Bank Soal Guru CBT
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
                  MAS MUHAMMADIYAH CIKARAMAS
                </span>
              </div>
              <p className="text-xs text-blue-100 flex items-center gap-1.5 mt-0.5">
                <span>Konversi Otomatis Dokumen Word (.docx) & Excel (.xlsx) ke JSON Standar</span>
                <span>•</span>
                <span className="text-white/80 font-medium">{teacherName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* ====================================================
            2. BODY MODAL: UPLOAD ZONE ATAU PRATINJAU HASIL
        ==================================================== */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Target Exam Selector */}
          {exams.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#DEE2E6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-[#0052CC] shrink-0" />
                <div>
                  <span className="text-xs font-bold text-[#1A1C1E] block">Target Paket Ujian:</span>
                  <span className="text-[11px] text-[#6C757D]">Soal yang diimpor akan langsung dialokasikan ke paket ini.</span>
                </div>
              </div>

              <select
                value={targetExam}
                onChange={e => {
                  setTargetExam(e.target.value);
                  if (onSelectedExamChange) onSelectedExamChange(e.target.value);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#CED4DA] bg-white text-[#1A1C1E] outline-none focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/20 cursor-pointer min-w-[200px]"
              >
                {exams.map(e => (
                  <option key={e.ID} value={e.ID}>
                    {e.TITLE} ({e.ID})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Error Message Banner */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-[#FCE8E6] border border-[#F5C2C7] flex items-start gap-3 text-xs text-[#DC3545] animate-shake">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold">Gagal Memproses File:</div>
                <div className="mt-0.5 leading-relaxed">{errorMsg}</div>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg('')}
                className="text-[#DC3545] hover:opacity-75 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ----------------------------------------------------
              KONDISI A: BELUM ADA FILE / HASIL (TAMPILKAN DROPZONE)
          ---------------------------------------------------- */}
          {parsedItems.length === 0 && !parsing && (
            <div className="space-y-5">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer relative overflow-hidden ${
                  isDragging
                    ? 'border-[#0052CC] bg-[#EBF3FC] scale-[0.99] shadow-inner'
                    : 'border-[#CED4DA] bg-[#F8F9FA] hover:border-[#0052CC] hover:bg-[#F0F5FF]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.xlsx,.xls"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      handleProcessFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-[#DEE2E6] shadow-xs mx-auto flex items-center justify-center gap-1 text-[#0052CC]">
                    <FileText className="w-7 h-7 text-[#0052CC]" />
                    <FileSpreadsheet className="w-7 h-7 text-[#137333]" />
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#1A1C1E]">
                      Tarik & Letakkan Berkas Soal Anda ke Sini
                    </h3>
                    <p className="text-xs text-[#6C757D] mt-1">
                      atau <span className="text-[#0052CC] font-bold underline">klik untuk memilih berkas dari komputer</span>
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#DEE2E6] text-[11px] font-semibold text-[#495057]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Mendukung Dokumen Word (.docx) & Spreadsheet Excel (.xlsx / .xls)</span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar: Unduh Template */}
              <div className="p-4 rounded-xl bg-white border border-[#DEE2E6] shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DEE2E6] pb-3">
                  <div>
                    <span className="text-xs font-bold text-[#1A1C1E] flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-[#0052CC]" />
                      <span>Belum Punya File Format Standar?</span>
                    </span>
                    <span className="text-[11px] text-[#6C757D]">
                      Unduh contoh template naskah resmi madrasah untuk memudahkan pengisian:
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadQuestionsWordTemplate()}
                      className="px-3 py-1.5 rounded-lg bg-[#0052CC] hover:bg-[#0047B3] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Template Word (.docx)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadQuestionsTemplate(exams, targetExam)}
                      className="px-3 py-1.5 rounded-lg bg-[#137333] hover:bg-[#0E5827] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      title="Format standar dengan kolom OPSI_A, OPSI_B, OPSI_C, OPSI_D, OPSI_E terpisah"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel (Kolom Opsi A-E)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadQuestionsSingleColumnTemplate(exams, targetExam)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      title="Format praktis: semua opsi jawaban digabung dalam 1 kolom OPSI_PILIHAN"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel (1 Kolom Opsi)</span>
                    </button>
                  </div>
                </div>

                {/* Petunjuk Format Singkat */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-[#495057] pt-1">
                  <div className="p-2.5 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF] space-y-1">
                    <div className="font-bold text-[#0052CC] flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Format Microsoft Word (.docx):</span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-[#6C757D]">
                      Bisa menggunakan format tabel (No, Soal, Opsi A-E, Kunci, Bobot) atau penomoran naskah (1. Soal, A. Opsi A, B. Opsi B, Kunci: A, Bobot: 10). Rumus matematika dan gambar tersimpan otomatis.
                    </p>
                  </div>

                  <div className="p-2.5 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF] space-y-1">
                    <div className="font-bold text-[#137333] flex items-center gap-1">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Format Microsoft Excel (.xlsx):</span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-[#6C757D]">
                      Kolom: <code className="text-[#137333] font-bold">PERTANYAAN</code>, <code className="text-[#137333] font-bold">KUNCI_JAWABAN</code>, <code className="text-[#137333] font-bold">BOBOT_POIN</code>. Opsi pilihan bisa dibuat di kolom terpisah (<code className="text-[#137333] font-bold">OPSI_A s/d E</code>) atau dijadikan satu di kolom <code className="text-[#137333] font-bold">OPSI_PILIHAN</code>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------
              KONDISI B: STATUS LOADING / SEDANG PARSING
          ---------------------------------------------------- */}
          {parsing && (
            <div className="py-16 text-center space-y-4">
              <div className="w-14 h-14 rounded-full border-4 border-[#B3D1FF] border-t-[#0052CC] animate-spin mx-auto"></div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-[#1A1C1E]">
                  Sedang Memproses Berkas Soal...
                </div>
                <div className="text-xs text-[#0052CC] font-semibold animate-pulse">
                  {parsingStep}
                </div>
                <p className="text-[11px] text-[#6C757D]">
                  Berkas sedang dikonversi ke format JSON standar bank soal CBT MAS Muhammadiyah Cikaramas.
                </p>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------
              KONDISI C: HASIL PARSING & PRATINJAU INTERAKTIF
          ---------------------------------------------------- */}
          {parsedItems.length > 0 && !parsing && (
            <div className="space-y-4">
              {/* File Info & Quick Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#F0F5FF] border border-[#B3D1FF]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white border border-[#B3D1FF] flex items-center justify-center text-[#0052CC] shadow-2xs">
                    {file?.name.endsWith('.docx') ? (
                      <FileText className="w-5 h-5 text-[#0052CC]" />
                    ) : (
                      <FileSpreadsheet className="w-5 h-5 text-[#137333]" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1A1C1E] flex items-center gap-2">
                      <span>{file?.name || 'Berkas_Soal'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#0052CC] text-white">
                        {file?.name.endsWith('.docx') ? 'Word .docx' : 'Excel .xlsx'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#6C757D] mt-0.5">
                      Ukuran: {file ? (file.size / 1024).toFixed(1) + ' KB' : '-'} • Terbaca: <b>{stats.total} Butir Soal</b> • Total Bobot: <b>{stats.totalBobot} Poin</b>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-1.5 rounded-lg border border-[#CED4DA] bg-white hover:bg-[#F8F9FA] text-[#495057] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ganti File</span>
                  </button>
                </div>
              </div>

              {/* Statistics Breakdown Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
                <div className="p-2.5 bg-white rounded-lg border border-[#DEE2E6]">
                  <div className="text-[10px] text-[#6C757D] uppercase font-bold">Total Soal</div>
                  <div className="text-base font-extrabold text-[#0052CC]">{stats.total}</div>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-[#DEE2E6]">
                  <div className="text-[10px] text-[#6C757D] uppercase font-bold">PG Biasa</div>
                  <div className="text-base font-extrabold text-[#1A1C1E]">{stats.mcq}</div>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-[#DEE2E6]">
                  <div className="text-[10px] text-[#6C757D] uppercase font-bold">PG Kompleks</div>
                  <div className="text-base font-extrabold text-[#1A1C1E]">{stats.complex}</div>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-[#DEE2E6]">
                  <div className="text-[10px] text-[#6C757D] uppercase font-bold">Benar / Salah</div>
                  <div className="text-base font-extrabold text-[#1A1C1E]">{stats.tf}</div>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-[#DEE2E6]">
                  <div className="text-[10px] text-[#6C757D] uppercase font-bold">Menjodohkan</div>
                  <div className="text-base font-extrabold text-[#1A1C1E]">{stats.matching}</div>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-[#DEE2E6]">
                  <div className="text-[10px] text-[#6C757D] uppercase font-bold">Isian / Essay</div>
                  <div className="text-base font-extrabold text-[#1A1C1E]">{stats.short + stats.essay}</div>
                </div>
                <div className={`p-2.5 rounded-lg border ${stats.warningCount > 0 ? 'bg-[#FFF8E1] border-amber-300' : 'bg-white border-[#DEE2E6]'}`}>
                  <div className="text-[10px] text-[#6C757D] uppercase font-bold">Peringatan</div>
                  <div className={`text-base font-extrabold ${stats.warningCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {stats.warningCount}
                  </div>
                </div>
              </div>

              {/* Mode Switcher: Pratinjau Visual vs JSON Standar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DEE2E6] pb-2">
                <div className="flex items-center gap-1 bg-[#F1F3F5] p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === 'preview'
                        ? 'bg-white text-[#0052CC] shadow-xs'
                        : 'text-[#495057] hover:text-[#1A1C1E]'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Pratinjau Soal ({filteredItems.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('json')}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === 'json'
                        ? 'bg-white text-[#0052CC] shadow-xs'
                        : 'text-[#495057] hover:text-[#1A1C1E]'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>JSON Standar</span>
                  </button>
                </div>

                {activeTab === 'preview' && (
                  <div className="flex items-center gap-2">
                    {/* Search Field */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[#6C757D] absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Cari teks soal / nomor..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs border border-[#CED4DA] rounded-lg outline-none focus:border-[#0052CC] bg-white w-48 sm:w-56"
                      />
                    </div>

                    {/* Filter Type */}
                    <select
                      value={filterType}
                      onChange={e => setFilterType(e.target.value)}
                      className="px-2.5 py-1.5 text-xs border border-[#CED4DA] rounded-lg bg-white font-medium outline-none focus:border-[#0052CC] cursor-pointer"
                    >
                      <option value="ALL">Semua Tipe Soal</option>
                      <option value="MCQ">Pilihan Ganda (MCQ)</option>
                      <option value="COMPLEX_MCQ">PG Kompleks</option>
                      <option value="TRUE_FALSE">Benar / Salah</option>
                      <option value="MATCHING">Menjodohkan</option>
                      <option value="SHORT_ANSWER">Isian Singkat</option>
                      <option value="ESSAY">Uraian / Essay</option>
                      {stats.warningCount > 0 && <option value="WARNINGS">Ada Peringatan ({stats.warningCount})</option>}
                    </select>
                  </div>
                )}

                {activeTab === 'json' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyJSON}
                      className="px-3 py-1.5 rounded-lg border border-[#B3D1FF] bg-[#E7F0FF] hover:bg-[#D0E2FF] text-[#0052CC] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedJSON ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedJSON ? 'Tersalin!' : 'Salin JSON'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadJSON}
                      className="px-3 py-1.5 rounded-lg bg-[#137333] hover:bg-[#0E5827] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh File .json</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ----------------------------------------------------
                  TAB 1: PRATINJAU VISUAL BUTIR SOAL
              ---------------------------------------------------- */}
              {activeTab === 'preview' && (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {filteredItems.length === 0 ? (
                    <div className="p-8 text-center bg-[#F8F9FA] rounded-xl border border-[#DEE2E6] text-[#6C757D] text-xs">
                      Tidak ada butir soal yang sesuai dengan kata kunci pencarian atau filter tipe soal.
                    </div>
                  ) : (
                    filteredItems.map((item, idx) => {
                      const realIndex = parsedItems.indexOf(item);
                      const isEditing = editingItemIndex === realIndex;

                      return (
                        <div
                          key={item.id || idx}
                          className={`p-4 rounded-xl border transition-all ${
                            item.warnings && item.warnings.length > 0
                              ? 'border-amber-300 bg-[#FFFDF5]'
                              : 'border-[#DEE2E6] bg-white hover:border-[#B3D1FF]'
                          }`}
                        >
                          {/* Item Top Bar */}
                          <div className="flex items-center justify-between gap-2 border-b border-[#E9ECEF] pb-2.5 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-md bg-[#0052CC] text-white font-bold text-xs flex items-center justify-center">
                                {realIndex + 1}
                              </span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#F1F3F5] text-[#495057] border border-[#DEE2E6]">
                                {item.tipe}
                              </span>
                              <span className="text-[11px] font-bold text-[#0052CC] bg-[#E7F0FF] px-2 py-0.5 rounded border border-[#B3D1FF]">
                                Bobot: {item.bobot} Poin
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingItemIndex(isEditing ? null : realIndex)}
                                className="p-1 rounded text-[#0052CC] hover:bg-[#E7F0FF] transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1"
                                title="Edit Cepat Kunci/Bobot"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>{isEditing ? 'Selesai Edit' : 'Edit'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteItem(realIndex)}
                                className="p-1 rounded text-[#DC3545] hover:bg-red-50 transition-colors cursor-pointer text-xs"
                                title="Hapus Soal Ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Question Text */}
                          <div className="text-xs sm:text-sm font-medium text-[#1A1C1E] leading-relaxed mb-3">
                            <RichContentRenderer content={item.soal} />
                          </div>

                          {/* Options Grid (jika ada) */}
                          {Object.keys(item.pilihan_jawaban || {}).length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2.5">
                              {(['A', 'B', 'C', 'D', 'E'] as const).map(opt => {
                                const optVal = item.pilihan_jawaban[opt];
                                if (!optVal) return null;
                                const isKey = (item.kunci_jawaban || '')
                                  .toUpperCase()
                                  .split(/[,;\s]+/)
                                  .includes(opt);

                                return (
                                  <div
                                    key={opt}
                                    className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                                      isKey
                                        ? 'bg-[#E6F4EA] border-[#34A853] text-[#137333] font-bold'
                                        : 'bg-[#F8F9FA] border-[#DEE2E6] text-[#495057]'
                                    }`}
                                  >
                                    <span
                                      className={`w-5 h-5 rounded font-bold text-[11px] flex items-center justify-center shrink-0 ${
                                        isKey ? 'bg-[#137333] text-white' : 'bg-[#E9ECEF] text-[#495057]'
                                      }`}
                                    >
                                      {opt}
                                    </span>
                                    <div className="pt-0.5 flex-1">
                                      <RichContentRenderer content={optVal} inline />
                                    </div>
                                    {isKey && <Check className="w-3.5 h-3.5 text-[#137333] shrink-0 mt-0.5" />}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Key & Warnings Row */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E9ECEF] text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#495057]">Kunci Jawaban:</span>
                              <span className="font-mono font-bold px-2 py-0.5 rounded bg-[#E8F0FE] text-[#0052CC] border border-[#B3D1FF]">
                                {item.kunci_jawaban || '(Belum Terisi)'}
                              </span>
                            </div>

                            {item.warnings && item.warnings.length > 0 && (
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>{item.warnings.join(' • ')}</span>
                              </div>
                            )}
                          </div>

                          {/* Inline Edit Form when opened */}
                          {isEditing && (
                            <div className="mt-3 p-3 bg-[#F8F9FA] rounded-lg border border-[#B3D1FF] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                              <div>
                                <label className="font-bold text-[#1A1C1E] block mb-1">Tipe Soal:</label>
                                <select
                                  value={item.tipe}
                                  onChange={e =>
                                    handleUpdateItem(realIndex, { tipe: e.target.value as QuestionType })
                                  }
                                  className="w-full px-2 py-1.5 border rounded bg-white"
                                >
                                  <option value="MCQ">MCQ (Pilihan Ganda)</option>
                                  <option value="COMPLEX_MCQ">PG Kompleks</option>
                                  <option value="TRUE_FALSE">Benar / Salah</option>
                                  <option value="MATCHING">Menjodohkan</option>
                                  <option value="SHORT_ANSWER">Isian Singkat</option>
                                  <option value="ESSAY">Uraian / Essay</option>
                                </select>
                              </div>

                              <div>
                                <label className="font-bold text-[#1A1C1E] block mb-1">Kunci Jawaban:</label>
                                <input
                                  type="text"
                                  value={item.kunci_jawaban}
                                  onChange={e => handleUpdateItem(realIndex, { kunci_jawaban: e.target.value })}
                                  className="w-full px-2 py-1.5 border rounded bg-white font-mono font-bold"
                                  placeholder="Contoh: A atau A, C"
                                />
                              </div>

                              <div>
                                <label className="font-bold text-[#1A1C1E] block mb-1">Bobot Poin:</label>
                                <input
                                  type="number"
                                  value={item.bobot}
                                  onChange={e =>
                                    handleUpdateItem(realIndex, { bobot: parseInt(e.target.value, 10) || 10 })
                                  }
                                  className="w-full px-2 py-1.5 border rounded bg-white font-bold"
                                  min="1"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ----------------------------------------------------
                  TAB 2: PRATINJAU FORMAT JSON STANDAR
              ---------------------------------------------------- */}
              {activeTab === 'json' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[#6C757D]">
                    <span>Format JSON murni siap pakai untuk database dan API bank soal:</span>
                    <span className="font-mono">{parsedItems.length} objek butir soal</span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#1E1E1E] text-[#D4D4D4] font-mono text-xs max-h-[50vh] overflow-y-auto border border-[#333] shadow-inner select-text">
                    <pre className="whitespace-pre-wrap leading-relaxed">
                      {JSON.stringify(parsedItems, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ====================================================
            3. FOOTER MODAL & TOMBOL SIMPAN
        ==================================================== */}
        <footer className="px-5 sm:px-6 py-3.5 bg-[#F8F9FA] border-t border-[#DEE2E6] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#6C757D]">
            {parsedItems.length > 0 ? (
              <span>
                Siap mengimpor <b>{parsedItems.length} soal</b> ke target <b>{targetExam || 'Ujian'}</b>.
              </span>
            ) : (
              <span>CBT MAS MUHAMMADIYAH CIKARAMAS</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#CED4DA] text-[#495057] font-semibold text-xs hover:bg-white transition-colors cursor-pointer"
            >
              Batal
            </button>

            {parsedItems.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-[#0052CC] hover:bg-[#0047B3] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan ({parsedItems.length}) Soal ke Bank Soal</span>
                  </>
                )}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
