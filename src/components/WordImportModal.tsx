import React, { useState, useRef } from 'react';
import { FileText, Upload, CheckCircle2, AlertTriangle, Download, X, HelpCircle, BookOpen } from 'lucide-react';
import { Exam, Subject, ClassItem } from '../types';
import { parseQuestionsFromWord } from '../utils/wordParser';
import { downloadQuestionsWordTemplate } from '../utils/wordTemplates';
import { QuestionImportPreview, ParsedQuestionItem } from './QuestionImportPreview';

interface WordImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: Exam[];
  subjects?: Subject[];
  classes?: ClassItem[];
  defaultExamId?: string;
  onImportQuestions: (questions: any[], targetExamId: string) => Promise<{ imported: number; skipped: number }>;
}

export const WordImportModal: React.FC<WordImportModalProps> = ({
  isOpen,
  onClose,
  exams,
  subjects = [],
  classes = [],
  defaultExamId,
  onImportQuestions
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(defaultExamId || exams[0]?.ID || '');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState<boolean>(false);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestionItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showFormatGuide, setShowFormatGuide] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const subjectMap = Object.fromEntries(subjects.map(s => [s.ID, s.NAME]));
  const classMap = Object.fromEntries(classes.map(c => [c.ID, c.NAME]));

  const handleFileProcess = async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.docx')) {
      setErrorMsg('Format file harus berekstensi Microsoft Word (.docx).');
      return;
    }

    setFile(selectedFile);
    setErrorMsg('');
    setParsing(true);

    try {
      const results = await parseQuestionsFromWord(selectedFile, selectedExamId);
      if (results.length === 0) {
        setErrorMsg('Tidak ditemukan butir soal yang valid dalam dokumen ini. Pastikan dokumen memiliki format tabel naskah soal atau penomoran 1. Pertanyaan, Opsi A-E, dan Kunci: X.');
        setParsedQuestions([]);
      } else {
        const enriched: ParsedQuestionItem[] = results.map(q => {
          const warnings: string[] = [];
          if (!q.QUESTION) warnings.push('Teks pertanyaan belum terisi');
          if (q.TYPE !== 'ESSAY' && !q.ANSWER) warnings.push('Kunci jawaban belum terisi');
          if (q.TYPE === 'MCQ' && (!q.OPTION_A || !q.OPTION_B)) warnings.push('Pilihan A & B wajib diisi untuk PG');
          return {
            ...q,
            warnings
          };
        });
        setParsedQuestions(enriched);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memproses file Word. Pastikan file tidak rusak dan berekstensi .docx.');
      setParsedQuestions([]);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedExamId) {
      setErrorMsg('Silakan pilih target ujian terlebih dahulu.');
      return;
    }
    if (parsedQuestions.length === 0) {
      setErrorMsg('Belum ada soal yang siap diimpor.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const prepared = parsedQuestions.map(q => ({
        ...q,
        EXAM_ID: selectedExamId
      }));

      await onImportQuestions(prepared, selectedExamId);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan soal ke database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetExam = exams.find(e => e.ID === selectedExamId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div
        className={`bg-white rounded-xl shadow-2xl ${
          parsedQuestions.length > 0 ? 'max-w-5xl' : 'max-w-3xl'
        } w-full border border-[#CED4DA] overflow-hidden my-6 transition-all`}
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-[#0052CC] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Import Soal dari Microsoft Word (.docx)
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/20 text-white">
                  Bank Soal
                </span>
              </h2>
              <p className="text-xs text-blue-100">
                Unggah naskah soal Word format tabel atau penomoran standar Kurikulum
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {parsedQuestions.length > 0 && !parsing ? (
            <QuestionImportPreview
              fileName={file?.name || 'Naskah_Soal.docx'}
              fileSize={file?.size}
              fileType="WORD"
              questions={parsedQuestions}
              exams={exams}
              selectedExamId={selectedExamId}
              onSelectedExamChange={newId => {
                setSelectedExamId(newId);
                setParsedQuestions(prev => prev.map(q => ({ ...q, EXAM_ID: newId })));
              }}
              onConfirmImport={handleConfirmImport}
              onResetFile={() => {
                setFile(null);
                setParsedQuestions([]);
                setErrorMsg('');
              }}
              onCancel={onClose}
              isSubmitting={isSubmitting}
            />
          ) : (
            <>
              {/* Target Exam Selection */}
              <div className="bg-[#F8F9FA] p-4 rounded-lg border border-[#DEE2E6] space-y-2">
                <label className="text-xs font-bold text-[#1A1C1E] flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#0052CC]" />
                  Pilih Target Ujian / Mata Pelajaran *
                </label>
                <select
                  value={selectedExamId}
                  onChange={e => setSelectedExamId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#CED4DA] rounded-md text-xs font-medium text-[#1A1C1E] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                >
                  {exams.length === 0 && <option value="">Belum ada data ujian aktif</option>}
                  {exams.map(ex => {
                    const subjName = subjectMap[ex.SUBJECT_ID] || ex.SUBJECT_ID;
                    const clsName = classMap[ex.CLASS_ID] || ex.CLASS_ID;
                    return (
                      <option key={ex.ID} value={ex.ID}>
                        {ex.TITLE} — [{subjName}] (Kelas: {clsName || 'Semua'})
                      </option>
                    );
                  })}
                </select>
                {targetExam && (
                  <div className="text-[11px] text-[#5E6C84] flex items-center gap-2">
                    <span>Mapel: <strong className="text-[#1A1C1E]">{subjectMap[targetExam.SUBJECT_ID] || '-'}</strong></span>
                    <span>•</span>
                    <span>Kelas: <strong className="text-[#1A1C1E]">{classMap[targetExam.CLASS_ID] || 'Semua'}</strong></span>
                    <span>•</span>
                    <span>Durasi: <strong className="text-[#1A1C1E]">{targetExam.DURATION_MIN} Menit</strong></span>
                  </div>
                )}
              </div>

              {/* Template Download & Format Guide Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-[#EBF3FC] border border-[#B3D4FF] text-xs">
                <div className="flex items-center gap-2 text-[#0052CC]">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="font-medium">Belum memiliki naskah format Word?</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadQuestionsWordTemplate()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0052CC] text-white hover:bg-[#0047B3] font-medium transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Template Word (.docx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFormatGuide(!showFormatGuide)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-white text-[#0052CC] border border-[#B3D4FF] hover:bg-blue-50 font-medium transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showFormatGuide ? 'Tutup Panduan' : 'Panduan Format'}</span>
                  </button>
                </div>
              </div>

              {/* Format Guide Collapsible */}
              {showFormatGuide && (
                <div className="p-4 rounded-lg bg-white border border-[#CED4DA] text-xs space-y-3 shadow-xs">
                  <div className="font-bold text-[#1A1C1E] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#137333]" />
                    Sistem Mendukung 2 Format Penulisan Microsoft Word:
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="p-3 bg-[#F8F9FA] rounded border border-[#E9ECEF] space-y-1.5 font-mono text-[11px]">
                      <span className="font-sans font-bold text-[#0052CC] block">Format 1: Tabel Resmi (Template)</span>
                      <div className="text-[#495057]">
                        Tabel dengan kolom: <strong>Tipe | Soal | Opsi A-E | Kunci | Bobot</strong>.
                      </div>
                      <div className="text-[10px] text-[#6C757D]">
                        Gunakan tombol "Unduh Template Word (.docx)" di atas untuk template siap pakai.
                      </div>
                    </div>
                    <div className="p-3 bg-[#F8F9FA] rounded border border-[#E9ECEF] space-y-1.5 font-mono text-[11px]">
                      <span className="font-sans font-bold text-[#0052CC] block">Format 2: Teks Penomoran Standar</span>
                      <div className="text-[#212529] whitespace-pre-line leading-relaxed">
                        1. Apa ibu kota Indonesia?<br />
                        A. Bandung<br />
                        B. Jakarta<br />
                        C. Surabaya<br />
                        D. Medan<br />
                        Kunci: B<br />
                        Bobot: 10
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Drag & Drop File Zone */}
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#0052CC] bg-[#EBF3FC]'
                    : file
                    ? 'border-[#34A853] bg-[#E6F4EA]/30'
                    : 'border-[#CED4DA] hover:border-[#0052CC] hover:bg-[#F8F9FA]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                />

                <div className="flex flex-col items-center justify-center space-y-2">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      file ? 'bg-[#E6F4EA] text-[#137333]' : 'bg-[#EBF3FC] text-[#0052CC]'
                    }`}
                  >
                    {file ? <CheckCircle2 className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                  </div>

                  {file ? (
                    <div>
                      <p className="text-sm font-bold text-[#1A1C1E]">{file.name}</p>
                      <p className="text-xs text-[#5E6C84]">
                        {(file.size / 1024).toFixed(1)} KB • Klik atau seret file lain untuk mengganti
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-[#1A1C1E]">
                        Klik untuk memilih naskah soal Word (.docx) atau seret file ke sini
                      </p>
                      <p className="text-[11px] text-[#6C757D]">Hanya mendukung file .docx resmi</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3.5 rounded-lg bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF] text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Parsing State */}
              {parsing && (
                <div className="p-4 rounded-lg bg-[#F8F9FA] border border-[#DEE2E6] text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-[#0052CC] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-medium text-[#495057]">Menganalisis dan memproses butir soal Word...</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer only on upload screen */}
        {parsedQuestions.length === 0 && (
          <div className="px-6 py-4 bg-[#F8F9FA] border-t border-[#DEE2E6] flex items-center justify-between">
            <div className="text-xs text-[#5E6C84]">
              <span>Pilih file Word untuk memulai import dan melihat pratinjau</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-[#CED4DA] bg-white text-[#1A1C1E] text-xs font-medium hover:bg-[#F1F3F5] transition-colors"
            >
              Batal
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
