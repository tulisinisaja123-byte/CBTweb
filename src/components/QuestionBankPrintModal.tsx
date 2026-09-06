import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  X,
  FileText,
  CheckCircle2,
  CheckSquare,
  HelpCircle,
  Clock,
  Calendar,
  Layers,
  Settings2,
  Eye,
  EyeOff,
  Download,
  FileDown,
  Columns,
  Type,
  Maximize2,
  Building,
  UserCheck,
  Sparkles,
  ExternalLink,
  Loader2,
  Check
} from 'lucide-react';
import { SchoolSettings } from '../types';
import { RichContentRenderer } from './RichContentRenderer';
import { parseMatchingDetails, parseMatchingAnswer } from '../utils/matchingHelper';
import { downloadExamPaperDocx, downloadExamPaperDoc, ExamDocxExportOptions } from '../utils/wordTemplates';
import { formatDocumentSemester } from '../utils/printHelper';

interface QuestionBankPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageInfo: {
    ID: string;
    TITLE: string;
    SUBJECT_ID: string;
    CLASS_ID: string;
    ASSESSMENT_TYPE_ID?: string;
    questions: any[];
    questionCount: number;
    totalPoints: number;
  };
  questions: any[];
  settings?: SchoolSettings;
  subjectName: string;
  className: string;
  assessmentTypeName: string;
}

export const QuestionBankPrintModal: React.FC<QuestionBankPrintModalProps> = ({
  isOpen,
  onClose,
  packageInfo,
  questions = [],
  settings,
  subjectName,
  className: targetClassName,
  assessmentTypeName
}) => {
  // --- TATA LETAK & KUSTOMISASI DOKUMEN ---
  const [institutionType, setInstitutionType] = useState<'KEMENAG' | 'DINAS' | 'YAYASAN'>('KEMENAG');
  const [showKop, setShowKop] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);
  const [groupByType, setGroupByType] = useState(true);
  const [twoColumns, setTwoColumns] = useState(false);
  const [paperSize, setPaperSize] = useState<'A4' | 'F4'>('A4');
  const [fontSize, setFontSize] = useState<'10pt' | '11pt' | '12pt'>('11pt');
  const [lineSpacing, setLineSpacing] = useState<'tight' | 'normal' | 'relaxed'>('normal');
  const [mcqOptionLayout, setMcqOptionLayout] = useState<'auto' | 'vertical' | 'two-column'>('auto');

  // --- KUNCI & LEMBAR JAWABAN ---
  const [keyMode, setKeyMode] = useState<'none' | 'inline' | 'separate'>('none');
  const [showStudentSheet, setShowStudentSheet] = useState(false);

  // --- IDENTITAS & METADATA UJIAN ---
  const [allocatedTime, setAllocatedTime] = useState<number>(90);
  const [examDate, setExamDate] = useState<string>(() => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  });
  const [academicYear, setAcademicYear] = useState<string>(settings?.SCHOOL_YEAR || '2026/2027');
  const [academicSemester, setAcademicSemester] = useState<string>(settings?.SEMESTER || '1 (Ganjil)');
  const [docCode, setDocCode] = useState<string>(() => {
    const cleanSub = (subjectName || 'MAPEL').substring(0, 4).toUpperCase();
    const cleanCls = (targetClassName || 'KLS').replace(/\s+/g, '').toUpperCase();
    return `NS/${cleanSub}/${cleanCls}/${new Date().getFullYear()}`;
  });

  // Sync settings when props update
  useEffect(() => {
    if (settings) {
      if (settings.SCHOOL_YEAR) setAcademicYear(settings.SCHOOL_YEAR);
      if (settings.SEMESTER) setAcademicSemester(settings.SEMESTER);
    }
  }, [settings]);

  // --- PEJABAT PENGESAHAN ---
  const [principalTitle, setPrincipalTitle] = useState<string>(settings?.PRINCIPAL_TITLE || 'Kepala Madrasah');
  const [principalName, setPrincipalName] = useState<string>(settings?.PRINCIPAL_NAME || 'Ai Sukaesih, S.Pd');
  const [principalNip, setPrincipalNip] = useState<string>(
    settings?.PRINCIPAL_NIP
      ? (settings.PRINCIPAL_NIP.startsWith('NBM') || settings.PRINCIPAL_NIP.startsWith('NIP')
        ? settings.PRINCIPAL_NIP
        : `NBM. ${settings.PRINCIPAL_NIP}`)
      : 'NBM. 1281201'
  );
  const [teacherName, setTeacherName] = useState<string>('Guru Pengampu Mata Pelajaran');
  const [teacherNip, setTeacherNip] = useState<string>('19820715 200801 2 011');
  const [cityLocation, setCityLocation] = useState<string>(settings?.SCHOOL_CITY || 'Kabupaten Sumedang');

  // --- DATA SEKOLAH ---
  const schoolName = settings?.SCHOOL_NAME || 'MA MUHAMMADIYAH CIKARAMAS';
  const schoolAddress = settings?.SCHOOL_ADDRESS || 'Jl. Cikaramas No. 1, Desa Cikaramas, Kec. Tanjungmedar';
  const schoolCity = settings?.SCHOOL_CITY || 'Kabupaten Sumedang';
  const schoolPhone = settings?.SCHOOL_PHONE || '(0261) 0000000';

  // --- STATUS & TOAST NOTIFIKASI ---
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // --- PEMBUATAN DOKUMEN HTML BERSIH UNTUK CETAK ---
  const getCleanDocumentHtml = () => {
    const element = document.getElementById('printable-exam-document');
    if (!element) return '';

    const fontPt = fontSize === '10pt' ? '10pt' : fontSize === '12pt' ? '12pt' : '11pt';
    const lineHeightVal = lineSpacing === 'tight' ? '1.25' : lineSpacing === 'relaxed' ? '1.6' : '1.38';

    // Salin stylesheet aplikasi host agar seluruh utilitas (Tailwind) tetap utuh
    const hostStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    return `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="utf-8">
        <title>${packageInfo.TITLE || 'Naskah Soal Ujian'} - Dokumen Cetak</title>
        ${hostStyles}
        <style>
          @page {
            size: ${paperSize === 'F4' ? '215mm 330mm' : 'A4 portrait'};
            margin: 12mm 15mm 15mm 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: 'Times New Roman', Times, 'Liberation Serif', serif;
            font-size: ${fontPt};
            line-height: ${lineHeightVal};
          }
          p {
            margin: 0 0 6px 0;
          }
          .rich-content p {
            margin: 0 !important;
            display: inline !important;
          }
          .rich-content {
            display: inline-block !important;
          }
          .no-print {
            display: none !important;
          }
          /* Utilitas Flexbox Eksplisit untuk Mesin Cetak / Browser */
          .flex { display: flex !important; }
          .flex-row { flex-direction: row !important; }
          .flex-col { flex-direction: column !important; }
          .flex-1 { flex: 1 1 0% !important; min-width: 0 !important; }
          .shrink-0 { flex-shrink: 0 !important; }
          .items-start { align-items: flex-start !important; }
          .items-center { align-items: center !important; }
          .justify-between { justify-content: space-between !important; }
          .justify-center { justify-content: center !important; }
          .flex-wrap { flex-wrap: wrap !important; }
          .gap-1 { gap: 4px !important; }
          .gap-1\\.5 { gap: 6px !important; }
          .gap-2 { gap: 8px !important; }
          .gap-3 { gap: 12px !important; }
          .gap-4 { gap: 16px !important; }
          .gap-6 { gap: 24px !important; }
          .space-y-1 > * + * { margin-top: 4px !important; }
          .space-y-2 > * + * { margin-top: 8px !important; }
          .space-y-4 > * + * { margin-top: 16px !important; }
          .space-y-6 > * + * { margin-top: 24px !important; }
          .columns-2, .md\\:columns-2 {
            column-count: 2 !important;
            column-gap: 24px !important;
          }
          .w-4 { width: 16px !important; }
          .w-5 { width: 20px !important; }
          .w-6 { width: 24px !important; }
          .w-12 { width: 48px !important; }
          .w-16 { width: 64px !important; }
          .w-20 { width: 80px !important; }
          .w-24 { width: 96px !important; }
          .w-32 { width: 128px !important; }
          .w-36 { width: 144px !important; }
          .w-48 { width: 192px !important; }
          .w-full { width: 100% !important; }
          .w-1\\/2 { width: 50% !important; }
          /* Border Tabel dan Format Cetak */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          th, td {
            color: #000000 !important;
          }
          .border { border: 1px solid #000000 !important; }
          .border-2 { border: 2px solid #000000 !important; }
          .border-t { border-top: 1px solid #000000 !important; }
          .border-t-2 { border-top: 2px solid #000000 !important; }
          .border-b { border-bottom: 1px solid #000000 !important; }
          .border-b-2 { border-bottom: 2px solid #000000 !important; }
          .border-r { border-right: 1px solid #000000 !important; }
          .border-l { border-left: 1px solid #000000 !important; }
          .border-black { border-color: #000000 !important; }
          .border-dashed { border-style: dashed !important; }
          .border-double { border-style: double !important; }
          .border-collapse { border-collapse: collapse !important; }
          .bg-white { background-color: #ffffff !important; }
          .bg-gray-50, .bg-\\[\\#F8F9FA\\] { background-color: #f8f9fa !important; }
          .bg-gray-100, .bg-\\[\\#F1F3F5\\] { background-color: #f1f3f5 !important; }
          .bg-\\[\\#EAECEF\\] { background-color: #eaecef !important; }
          .font-bold { font-weight: 700 !important; }
          .font-medium { font-weight: 500 !important; }
          .font-semibold { font-weight: 600 !important; }
          .font-mono { font-family: Courier, monospace !important; }
          .italic { font-style: italic !important; }
          .underline { text-decoration: underline !important; }
          .uppercase { text-transform: uppercase !important; }
          .text-center { text-align: center !important; }
          .text-right { text-align: right !important; }
          .text-black { color: #000000 !important; }
          .p-1 { padding: 4px !important; }
          .p-2 { padding: 8px !important; }
          .p-2\\.5 { padding: 10px !important; }
          .p-3 { padding: 12px !important; }
          .p-4 { padding: 16px !important; }
          .py-1 { padding-top: 4px !important; padding-bottom: 4px !important; }
          .py-1\\.5 { padding-top: 6px !important; padding-bottom: 6px !important; }
          .py-2 { padding-top: 8px !important; padding-bottom: 8px !important; }
          .px-2 { padding-left: 8px !important; padding-right: 8px !important; }
          .px-2\\.5 { padding-left: 10px !important; padding-right: 10px !important; }
          .px-3 { padding-left: 12px !important; padding-right: 12px !important; }
          .px-4 { padding-left: 16px !important; padding-right: 16px !important; }
          .mb-1 { margin-bottom: 4px !important; }
          .mb-2 { margin-bottom: 8px !important; }
          .mb-4 { margin-bottom: 16px !important; }
          .mb-5 { margin-bottom: 20px !important; }
          .mb-6 { margin-bottom: 24px !important; }
          .mt-2 { margin-top: 8px !important; }
          .mt-4 { margin-top: 16px !important; }
          .mt-8 { margin-top: 32px !important; }
          .mt-12 { margin-top: 48px !important; }
          .break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .break-before-page {
            break-before: page !important;
            page-break-before: always !important;
          }
          /* Toolbar Mengambang Halaman Cetak Tab Baru */
          .standalone-bar {
            position: sticky;
            top: 0;
            left: 0;
            right: 0;
            background: #1A1C1E;
            color: #ffffff;
            padding: 12px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            z-index: 99999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          .btn-action-print {
            background: #00875A;
            color: white;
            border: none;
            padding: 9px 20px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }
          .btn-action-close {
            background: #495057;
            color: white;
            border: none;
            padding: 9px 16px;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
            margin-left: 8px;
          }
          @media print {
            .standalone-bar {
              display: none !important;
            }
            .print-document-wrap {
              padding: 0 !important;
              margin: 0 !important;
              max-width: 100% !important;
              width: 100% !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="standalone-bar no-print">
          <div>
            <span style="font-weight: bold; font-size: 14px;">🖨️ Naskah Soal Siap Cetak: ${packageInfo.TITLE || subjectName}</span>
            <span style="font-size: 12px; color: #ADB5BD; margin-left: 12px;">(${questions.length} Butir Soal • Kertas ${paperSize})</span>
          </div>
          <div>
            <button class="btn-action-print" onclick="window.print()">
              <span>🖨️ Cetak / Simpan PDF Sekarang</span>
            </button>
            <button class="btn-action-close" onclick="window.close()">Tutup Tab</button>
          </div>
        </div>
        <div class="print-document-wrap" style="padding: 24px 36px; background: #ffffff; max-width: 900px; margin: 0 auto;">
          ${element.innerHTML}
        </div>
        <script>
          window.addEventListener('load', function() {
            setTimeout(function() {
              window.print();
            }, 600);
          });
        </script>
      </body>
      </html>
    `;
  };

  // --- FUNGSI CETAK DENGAN DUKUNGAN IFRAME ISOLASI & FALLBACK ---
  const handlePrint = () => {
    const element = document.getElementById('printable-exam-document');
    if (!element) {
      showToast('Gagal memuat dokumen cetak.');
      return;
    }

    showToast('Membuka kotak dialog cetak / simpan PDF...');

    try {
      // Buat iframe tersembunyi untuk mengisolasi stylesheet agar tidak bocor dari UI modal
      const iframe = document.createElement('iframe');
      iframe.id = 'print-engine-iframe';
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '1000px';
      iframe.style.height = '1400px';
      iframe.style.border = '0';
      iframe.setAttribute('title', 'Cetak Naskah Ujian');
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(getCleanDocumentHtml());
        iframeDoc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (printErr) {
            console.warn('Iframe print dicegah browser, fallback ke window.print():', printErr);
            window.print();
          } finally {
            setTimeout(() => {
              try {
                if (document.body.contains(iframe)) {
                  document.body.removeChild(iframe);
                }
              } catch (e) {}
            }, 3000);
          }
        }, 500);
        return;
      }
    } catch (err) {
      console.warn('Gagal menggunakan iframe print, langsung memicu window.print():', err);
    }

    // Fallback langsung ke window.print()
    window.print();
  };

  // --- FUNGSI BUKA DI TAB BARU (DIJAMIN 100% BEBAS MASALAH IFRAME) ---
  const handleOpenPrintTab = () => {
    const htmlContent = getCleanDocumentHtml();
    if (!htmlContent) return;

    showToast('Membuka dokumen naskah soal di tab baru...');
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  // --- DATA OPSI EKSPOR KE WORD ---
  const getExportOptions = (): ExamDocxExportOptions => ({
    packageInfo,
    questions,
    settings,
    subjectName,
    className: targetClassName,
    assessmentTypeName,
    academicYear,
    academicSemester,
    allocatedTime,
    examDate,
    docCode,
    institutionType,
    showKop,
    showInstructions,
    showSignatures,
    groupByType,
    keyMode,
    paperSize,
    principalTitle,
    principalName,
    principalNip,
    teacherName,
    teacherNip,
    cityLocation,
    includeAnswerSheet: showStudentSheet
  });

  // --- FUNGSI UNDUH MICROSOFT WORD NATIVE (.DOCX) ---
  const handleExportDocx = async () => {
    try {
      setIsExportingDocx(true);
      showToast('Menyusun dokumen Microsoft Word (.docx) berstandar resmi...');
      await downloadExamPaperDocx(getExportOptions());
      showToast('Berhasil mengunduh dokumen Word (.docx)!');
    } catch (err) {
      console.error('Gagal menyusun .docx, mengalihkan ke format .doc:', err);
      showToast('Mengalihkan ke format Word .doc...');
      downloadExamPaperDoc(getExportOptions());
    } finally {
      setIsExportingDocx(false);
    }
  };

  // --- FUNGSI UNDUH MICROSOFT WORD ALTERNATIF (.DOC) ---
  const handleExportDoc = () => {
    showToast('Mengunduh dokumen naskah soal format Word (.doc)...');
    downloadExamPaperDoc(getExportOptions());
  };

  // --- KELOMPOKKAN SOAL BERDASARKAN TIPE ---
  const sections = useMemo(() => {
    if (!groupByType) {
      return [
        {
          code: 'ALL',
          title: 'SOAL UJIAN',
          instruction: 'Jawablah setiap butir soal berikut dengan teliti dan benar.',
          items: questions.map((q, idx) => ({ ...q, originalIndex: idx + 1 }))
        }
      ];
    }

    const mcq = questions
      .map((q, idx) => ({ ...q, originalIndex: idx + 1 }))
      .filter(q => q.TYPE === 'MCQ' || !q.TYPE);
    const complexMcq = questions
      .map((q, idx) => ({ ...q, originalIndex: idx + 1 }))
      .filter(q => q.TYPE === 'COMPLEX_MCQ');
    const matching = questions
      .map((q, idx) => ({ ...q, originalIndex: idx + 1 }))
      .filter(q => q.TYPE === 'MATCHING');
    const trueFalse = questions
      .map((q, idx) => ({ ...q, originalIndex: idx + 1 }))
      .filter(q => q.TYPE === 'TRUE_FALSE');
    const shortAnswer = questions
      .map((q, idx) => ({ ...q, originalIndex: idx + 1 }))
      .filter(q => q.TYPE === 'SHORT_ANSWER');
    const essay = questions
      .map((q, idx) => ({ ...q, originalIndex: idx + 1 }))
      .filter(q => q.TYPE === 'ESSAY');

    const result = [];
    let sectionIdx = 1;
    const toRoman = (num: number) => ['I', 'II', 'III', 'IV', 'V', 'VI'][num - 1] || `${num}`;

    if (mcq.length > 0) {
      result.push({
        code: 'MCQ',
        roman: toRoman(sectionIdx++),
        title: 'PILIHAN GANDA (PILIHAN TUNGGAL)',
        instruction: 'Pilihlah salah satu jawaban yang paling tepat dengan menyilang atau menghitamkan huruf A, B, C, D, atau E pada lembar jawaban yang tersedia!',
        items: mcq
      });
    }

    if (complexMcq.length > 0) {
      result.push({
        code: 'COMPLEX_MCQ',
        roman: toRoman(sectionIdx++),
        title: 'PILIHAN GANDA KOMPLEKS (LEBIH DARI SATU JAWABAN BENAR)',
        instruction: 'Pilihlah seluruh jawaban yang benar dengan memberi tanda centang (✓) pada kotak di samping huruf pilihan yang disediakan!',
        items: complexMcq
      });
    }

    if (matching.length > 0) {
      result.push({
        code: 'MATCHING',
        roman: toRoman(sectionIdx++),
        title: 'MENJODOHKAN (MEMASANGKAN PERNYATAAN DENGAN JAWABAN)',
        instruction: 'Pasangkanlah setiap butir pernyataan pada Kolom A dengan pilihan respon atau jawaban yang paling tepat pada Kolom B!',
        items: matching
      });
    }

    if (trueFalse.length > 0) {
      result.push({
        code: 'TRUE_FALSE',
        roman: toRoman(sectionIdx++),
        title: 'BENAR ATAU SALAH (TRUE / FALSE)',
        instruction: 'Tentukan apakah setiap pernyataan di bawah ini bernilai BENAR (B) atau SALAH (S) dengan memberi tanda silang (X) pada opsi yang tepat!',
        items: trueFalse
      });
    }

    if (shortAnswer.length > 0) {
      result.push({
        code: 'SHORT_ANSWER',
        roman: toRoman(sectionIdx++),
        title: 'ISIAN SINGKAT',
        instruction: 'Isilah titik-titik di bawah ini dengan jawaban yang singkat, padat, tepat, dan jelas!',
        items: shortAnswer
      });
    }

    if (essay.length > 0) {
      result.push({
        code: 'ESSAY',
        roman: toRoman(sectionIdx++),
        title: 'URAIAN / ESAI',
        instruction: 'Jawablah pertanyaan-pertanyaan berikut ini dengan uraian yang jelas, lengkap, runtut, dan terperinci!',
        items: essay
      });
    }

    return result;
  }, [questions, groupByType]);

  // Total Bobot Keseluruhan
  const totalMaxPoints = useMemo(() => {
    return (questions || []).reduce((sum, q) => sum + (Number(q.POINTS) || 10), 0);
  }, [questions]);

  // Style CSS Dinamis untuk Font & Spasi
  const dynamicFontClass = fontSize === '10pt' ? 'text-[10pt]' : fontSize === '12pt' ? 'text-[12pt]' : 'text-[11pt]';
  const dynamicLineSpacing = lineSpacing === 'tight' ? 'leading-tight' : lineSpacing === 'relaxed' ? 'leading-relaxed' : 'leading-normal';

  if (!isOpen) return null;

  return (
    <div className="print-modal-backdrop fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col overflow-hidden">
      {/* 1. TOP TOOLBAR (DISEMBUNYIKAN SAAT CETAK) */}
      <div className="no-print bg-[#1A1C1E] text-white px-4 sm:px-6 py-3 border-b border-[#343A40] flex items-center justify-between gap-4 flex-shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0052CC] flex items-center justify-center text-white shadow-xs">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
              <span>Naskah Ujian & Cetak PDF Resmi</span>
              <span className="text-[10px] bg-[#137333] text-white px-2 py-0.5 rounded-full font-medium uppercase">
                Standar A4 / F4
              </span>
            </h2>
            <p className="text-[11px] text-[#ADB5BD]">
              {subjectName} • {targetClassName} • {questions.length} Butir Soal • Skor Maksimal {totalMaxPoints}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Tombol Unduh Word .docx */}
          <button
            type="button"
            onClick={handleExportDocx}
            disabled={isExportingDocx}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2B579A] hover:bg-[#1E3E6D] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Unduh format dokumen Word (.docx) berstandar resmi lengkap dengan tabel dan kop"
          >
            {isExportingDocx ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Unduh Word (.docx)</span>
          </button>

          {/* Tombol Unduh Word .doc Alternatif */}
          <button
            type="button"
            onClick={handleExportDoc}
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-[#CED4DA] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            title="Unduh versi format dokumen Word .doc (format alternatif)"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>.doc</span>
          </button>

          {/* Tombol Cetak / Simpan PDF Langsung */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#137333] hover:bg-[#0E5827] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="Buka dialog cetak browser atau simpan sebagai PDF beresolusi tinggi"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF</span>
          </button>

          {/* Tombol Buka Tab Baru (Cetak Eksternal) */}
          <button
            type="button"
            onClick={handleOpenPrintTab}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0052CC] hover:bg-[#0747A6] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Buka naskah soal di tab browser terpisah untuk cetak / simpan PDF bebas kendala iframe"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Buka Tab Cetak</span>
          </button>

          {/* Tombol Tutup */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-[#CED4DA] hover:text-white transition-colors cursor-pointer"
            title="Tutup Pratinjau"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toast Notifikasi Progres */}
      {toastMessage && (
        <div className="no-print bg-[#0052CC] text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FFF000]" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white text-xs ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. CONFIGURATION BAR LENGKAP (DISEMBUNYIKAN SAAT CETAK) */}
      <div className="no-print bg-white border-b border-[#DEE2E6] px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap text-xs shadow-xs">
        {/* Kelompok Opsi Tata Letak */}
        <div className="flex items-center gap-3.5 flex-wrap">
          {/* Format Kolom */}
          <div className="flex items-center gap-1 bg-[#F1F3F5] p-1 rounded-md">
            <button
              type="button"
              onClick={() => setTwoColumns(false)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                !twoColumns ? 'bg-white text-[#0052CC] shadow-xs' : 'text-[#495057] hover:text-[#1A1C1E]'
              }`}
            >
              1 Kolom (Leluasa)
            </button>
            <button
              type="button"
              onClick={() => setTwoColumns(true)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                twoColumns ? 'bg-white text-[#0052CC] shadow-xs' : 'text-[#495057] hover:text-[#1A1C1E]'
              }`}
            >
              2 Kolom (Hemat Kertas)
            </button>
          </div>

          {/* Grouping Toggle */}
          <label className="flex items-center gap-1.5 font-medium text-[#1A1C1E] cursor-pointer" title="Kelompokkan soal: Bagian I Pilihan Ganda, Bagian II Menjodohkan, dst.">
            <input
              type="checkbox"
              checked={groupByType}
              onChange={e => setGroupByType(e.target.checked)}
              className="rounded text-[#0052CC] focus:ring-[#0052CC]"
            />
            <span className="font-semibold text-[#0052CC]">Kelompokkan per Bagian / Tipe</span>
          </label>

          {/* Toggle Kop Surat */}
          <label className="flex items-center gap-1.5 font-medium text-[#1A1C1E] cursor-pointer">
            <input
              type="checkbox"
              checked={showKop}
              onChange={e => setShowKop(e.target.checked)}
              className="rounded text-[#0052CC] focus:ring-[#0052CC]"
            />
            <span>Kop Surat</span>
          </label>

          {/* Toggle Petunjuk Umum */}
          <label className="flex items-center gap-1.5 font-medium text-[#1A1C1E] cursor-pointer">
            <input
              type="checkbox"
              checked={showInstructions}
              onChange={e => setShowInstructions(e.target.checked)}
              className="rounded text-[#0052CC] focus:ring-[#0052CC]"
            />
            <span>Petunjuk Umum</span>
          </label>

          {/* Toggle Titik Mangsa & Tanda Tangan */}
          <label className="flex items-center gap-1.5 font-medium text-[#1A1C1E] cursor-pointer">
            <input
              type="checkbox"
              checked={showSignatures}
              onChange={e => setShowSignatures(e.target.checked)}
              className="rounded text-[#0052CC] focus:ring-[#0052CC]"
            />
            <span>Tanda Tangan Pengesahan</span>
          </label>

          {/* Opsi Kunci Jawaban */}
          <div className="flex items-center gap-1.5 border-l border-[#CED4DA] pl-3">
            <span className="text-[#6C757D] font-medium">Kunci:</span>
            <select
              value={keyMode}
              onChange={e => setKeyMode(e.target.value as any)}
              className="px-2 py-1 border border-[#CED4DA] rounded text-xs bg-white font-medium text-[#1A1C1E]"
            >
              <option value="none">Tanpa Kunci (Naskah Siswa)</option>
              <option value="separate">Halaman Kunci & Penskoran (Guru)</option>
              <option value="inline">Disorot di Soal (Telaah Soal)</option>
            </select>
          </div>

          {/* Toggle Lembar Jawaban Siswa */}
          <label className="flex items-center gap-1.5 font-medium text-[#1A1C1E] cursor-pointer border-l border-[#CED4DA] pl-3">
            <input
              type="checkbox"
              checked={showStudentSheet}
              onChange={e => setShowStudentSheet(e.target.checked)}
              className="rounded text-[#0052CC] focus:ring-[#0052CC]"
            />
            <span className={showStudentSheet ? 'text-[#0052CC] font-bold' : ''}>
              + Lembar Jawab Siswa (LJK)
            </span>
          </label>
        </div>

        {/* Pengaturan Tipografi & Dokumen */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Ukuran Huruf */}
          <div className="flex items-center gap-1">
            <span className="text-[#6C757D]">Font:</span>
            <select
              value={fontSize}
              onChange={e => setFontSize(e.target.value as any)}
              className="px-2 py-1 border border-[#CED4DA] rounded text-xs bg-white"
            >
              <option value="10pt">10pt (Padat)</option>
              <option value="11pt">11pt (Standar)</option>
              <option value="12pt">12pt (Besar)</option>
            </select>
          </div>

          {/* Ukuran Kertas */}
          <div className="flex items-center gap-1">
            <span className="text-[#6C757D]">Kertas:</span>
            <select
              value={paperSize}
              onChange={e => setPaperSize(e.target.value as any)}
              className="px-2 py-1 border border-[#CED4DA] rounded text-xs bg-white font-bold"
            >
              <option value="A4">A4 (210 x 297 mm)</option>
              <option value="F4">F4 / Folio (215 x 330 mm)</option>
            </select>
          </div>

          {/* Durasi Waktu */}
          <div className="flex items-center gap-1">
            <span className="text-[#6C757D]">Waktu:</span>
            <input
              type="number"
              value={allocatedTime}
              onChange={e => setAllocatedTime(Number(e.target.value))}
              className="w-14 px-2 py-0.5 border border-[#CED4DA] rounded text-xs text-center font-bold"
            />
            <span className="text-[#6C757D]">Mnt</span>
          </div>
        </div>
      </div>

      {/* 3. MAIN PRINTABLE DOCUMENT AREA */}
      <div className="print-modal-body flex-1 overflow-y-auto bg-[#525659] p-4 sm:p-8">
        {/* The Paper Sheet (Formal Indonesian Exam Standard) */}
        <div
          id="printable-exam-document"
          className={`printable-sheet bg-white text-black shadow-2xl p-8 sm:p-12 w-full max-w-4xl mx-auto mb-16 h-auto ${dynamicFontClass} ${dynamicLineSpacing}`}
          style={{
            fontFamily: '"Times New Roman", Times, "Liberation Serif", serif',
            color: '#000000',
            backgroundColor: '#ffffff'
          }}
        >
          {/* ========================================================= */}
          {/* 1. KOP SURAT RESMI SEKOLAH / MADRASAH                   */}
          {/* ========================================================= */}
          {showKop && (
            <div className="mb-4 pb-2 border-b-2 border-black border-double text-center">
              <table className="w-full border-collapse" style={{ border: 'none', width: '100%' }}>
                <tbody>
                  <tr style={{ border: 'none' }}>
                    {/* Logo Kiri (Kemenag / Garuda / Sekolah) */}
                    <td className="w-20 align-middle text-center p-0" style={{ border: 'none', width: '80px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <div
                        className="w-16 h-16 mx-auto flex items-center justify-center border-2 border-black rounded-full text-[10px] font-bold"
                        style={{
                          width: '64px',
                          height: '64px',
                          margin: '0 auto',
                          border: '2px solid #000000',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '10px'
                        }}
                      >
                        {institutionType === 'KEMENAG' ? 'KEMENAG' : 'LOGO'}
                      </div>
                    </td>

                    {/* Teks Identitas Lembaga */}
                    <td className="align-middle text-center px-2 py-0" style={{ border: 'none', textAlign: 'center', verticalAlign: 'middle', padding: '0 8px' }}>
                      <div className="text-xs sm:text-sm font-bold tracking-wider uppercase" style={{ fontWeight: 'bold' }}>
                        {institutionType === 'KEMENAG'
                          ? 'KEMENTERIAN AGAMA REPUBLIK INDONESIA'
                          : institutionType === 'DINAS'
                          ? 'PEMERINTAH DAERAH PROVINSI / KABUPATEN'
                          : 'YAYASAN PENDIDIKAN DAN SOSIAL'}
                      </div>
                      <div className="text-xs sm:text-sm font-bold tracking-wider uppercase text-gray-800" style={{ fontWeight: 'bold' }}>
                        {institutionType === 'KEMENAG'
                          ? 'KANTOR KEMENTERIAN AGAMA KABUPATEN / KOTA'
                          : institutionType === 'DINAS'
                          ? 'DINAS PENDIDIKAN DAN KEBUDAYAAN'
                          : 'SATUAN PENDIDIKAN TERAKREDITASI'}
                      </div>
                      <h1 className="text-base sm:text-xl font-bold uppercase tracking-wide my-0.5" style={{ fontWeight: 'bold', margin: '2px 0' }}>
                        {schoolName}
                      </h1>
                      <div className="text-[10pt] leading-tight text-gray-900">
                        {schoolAddress} • {schoolCity}
                      </div>
                      <div className="text-[9pt] leading-tight text-gray-800">
                        Telepon: {schoolPhone} • Website / Email Resmi Madrasah / Sekolah
                      </div>
                    </td>

                    {/* Logo Kanan (Opsional Logo Sekolah) */}
                    <td className="w-20 align-middle text-center p-0" style={{ border: 'none', width: '80px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <div
                        className="w-16 h-16 mx-auto flex items-center justify-center border border-dashed border-black rounded-md text-[9px] font-bold text-gray-700"
                        style={{
                          width: '64px',
                          height: '64px',
                          margin: '0 auto',
                          border: '1px dashed #000000',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '9px'
                        }}
                      >
                        KODE: {targetClassName}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Garis Ganda Resmi Kop Surat */}
              <div className="pt-2" style={{ paddingTop: '8px' }}>
                <div style={{ borderTop: '2.5px solid #000000', width: '100%' }} />
                <div style={{ borderTop: '1px solid #000000', width: '100%', marginTop: '2px' }} />
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. JUDUL NASKAH SOAL & TAHUN AJARAN                      */}
          {/* ========================================================= */}
          <div className="text-center mb-4" style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider underline" style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
              NASKAH SOAL {assessmentTypeName || 'PENILAIAN / ASESMEN AKHIR'}
            </h2>
            <div className="text-xs sm:text-[11pt] font-semibold mt-0.5" style={{ fontWeight: 600, marginTop: '2px' }}>
              TAHUN PELAJARAN {academicYear} — SEMESTER {formatDocumentSemester(academicSemester)}
            </div>
          </div>

          {/* ========================================================= */}
          {/* 3. TABEL IDENTITAS PELAKSANAAN UJIAN                      */}
          {/* ========================================================= */}
          <div className="mb-4 border-2 border-black bg-white" style={{ border: '2px solid #000000', marginBottom: '16px', backgroundColor: '#ffffff' }}>
            <table className="w-full text-xs sm:text-[11pt] border-collapse bg-white text-black" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff', color: '#000000' }}>
              <tbody>
                <tr className="border-b border-black" style={{ borderBottom: '1px solid #000000' }}>
                  <td className="w-36 py-1 px-2.5 font-bold bg-[#F1F3F5] text-black border-r border-black" style={{ width: '140px', padding: '4px 10px', fontWeight: 'bold', backgroundColor: '#F1F3F5', color: '#000000', borderRight: '1px solid #000000', borderBottom: '1px solid #000000' }}>
                    Mata Pelajaran
                  </td>
                  <td className="py-1 px-2.5 font-bold border-r border-black bg-white text-black" style={{ padding: '4px 10px', fontWeight: 'bold', borderRight: '1px solid #000000', borderBottom: '1px solid #000000', backgroundColor: '#ffffff', color: '#000000' }}>
                    : {subjectName}
                  </td>
                  <td className="w-32 py-1 px-2.5 font-bold bg-[#F1F3F5] text-black border-r border-black" style={{ width: '130px', padding: '4px 10px', fontWeight: 'bold', backgroundColor: '#F1F3F5', color: '#000000', borderRight: '1px solid #000000', borderBottom: '1px solid #000000' }}>
                    Hari / Tanggal
                  </td>
                  <td className="py-1 px-2.5 bg-white text-black" style={{ padding: '4px 10px', borderBottom: '1px solid #000000', backgroundColor: '#ffffff', color: '#000000' }}>
                    : {examDate}
                  </td>
                </tr>
                <tr className="border-b border-black" style={{ borderBottom: '1px solid #000000' }}>
                  <td className="w-36 py-1 px-2.5 font-bold bg-[#F1F3F5] text-black border-r border-black" style={{ width: '140px', padding: '4px 10px', fontWeight: 'bold', backgroundColor: '#F1F3F5', color: '#000000', borderRight: '1px solid #000000', borderBottom: '1px solid #000000' }}>
                    Tingkat / Kelas
                  </td>
                  <td className="py-1 px-2.5 border-r border-black bg-white text-black" style={{ padding: '4px 10px', borderRight: '1px solid #000000', borderBottom: '1px solid #000000', backgroundColor: '#ffffff', color: '#000000' }}>
                    : {targetClassName}
                  </td>
                  <td className="w-32 py-1 px-2.5 font-bold bg-[#F1F3F5] text-black border-r border-black" style={{ width: '130px', padding: '4px 10px', fontWeight: 'bold', backgroundColor: '#F1F3F5', color: '#000000', borderRight: '1px solid #000000', borderBottom: '1px solid #000000' }}>
                    Alokasi Waktu
                  </td>
                  <td className="py-1 px-2.5 bg-white text-black" style={{ padding: '4px 10px', borderBottom: '1px solid #000000', backgroundColor: '#ffffff', color: '#000000' }}>
                    : {allocatedTime} Menit
                  </td>
                </tr>
                <tr>
                  <td className="w-36 py-1 px-2.5 font-bold bg-[#F1F3F5] text-black border-r border-black" style={{ width: '140px', padding: '4px 10px', fontWeight: 'bold', backgroundColor: '#F1F3F5', color: '#000000', borderRight: '1px solid #000000' }}>
                    Bentuk Soal
                  </td>
                  <td className="py-1 px-2.5 border-r border-black bg-white text-black" style={{ padding: '4px 10px', borderRight: '1px solid #000000', backgroundColor: '#ffffff', color: '#000000' }}>
                    : {questions.length} Butir Soal ({sections.map(s => s.title.split(' ')[0]).join(', ')})
                  </td>
                  <td className="w-32 py-1 px-2.5 font-bold bg-[#F1F3F5] text-black border-r border-black" style={{ width: '130px', padding: '4px 10px', fontWeight: 'bold', backgroundColor: '#F1F3F5', color: '#000000', borderRight: '1px solid #000000' }}>
                    Kode Naskah
                  </td>
                  <td className="py-1 px-2.5 font-mono font-bold bg-white text-black" style={{ padding: '4px 10px', fontFamily: 'monospace', fontWeight: 'bold', backgroundColor: '#ffffff', color: '#000000' }}>
                    : {docCode}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ========================================================= */}
          {/* 4. PETUNJUK UMUM STANDAR UJIAN NASIONAL                   */}
          {/* ========================================================= */}
          {showInstructions && (
            <div className="p-3 border border-black mb-5 bg-[#F8F9FA] text-black text-[10pt] leading-relaxed break-inside-avoid" style={{ border: '1px solid #000000', marginBottom: '20px', padding: '12px', backgroundColor: '#F8F9FA' }}>
              <div className="font-bold underline mb-1" style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>PETUNJUK UMUM:</div>
              <ol className="list-decimal list-inside space-y-0.5 text-gray-900" style={{ margin: 0, paddingLeft: '8px' }}>
                <li>Awali dengan membaca basmalah atau berdoa sebelum mulai mengerjakan naskah soal.</li>
                <li>Tulislah nama, nomor peserta, dan kelas pada lembar jawaban yang telah disediakan panitia.</li>
                <li>Periksa dan bacalah butir-butir soal dengan cermat dan seksama sebelum Anda menjawabnya.</li>
                <li>Dahulukan menjawab soal-soal yang Anda anggap mudah baru kemudian soal yang lebih sulit.</li>
                <li>Laporkan kepada pengawas ruang jika terdapat tulisan yang tidak jelas, rusak, atau jumlah halaman kurang.</li>
                <li>Periksalah kembali seluruh pekerjaan Anda sebelum diserahkan kepada pengawas ujian.</li>
              </ol>
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. BUTIR-BUTIR SOAL TERSUSUN SESUAI STANDAR RESMI        */}
          {/* ========================================================= */}
          <div className="space-y-6">
            {sections.map(section => (
              <div key={section.code} className="space-y-4">
                {/* Header Bagian / Section */}
                {groupByType && (
                  <div className="border-b-2 border-black pb-1 pt-2 break-inside-avoid" style={{ borderBottom: '2px solid #000000', paddingBottom: '4px', paddingTop: '8px' }}>
                    <div className="font-bold uppercase text-xs sm:text-[11pt] tracking-wide flex items-center justify-between" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      <span>
                        BAGIAN {section.roman}. {section.title}
                      </span>
                      <span className="text-[10pt] font-semibold text-gray-700" style={{ fontWeight: 600 }}>
                        ({section.items.length} Soal)
                      </span>
                    </div>
                    <p className="text-[10pt] italic text-gray-800 mt-0.5" style={{ fontStyle: 'italic', margin: '2px 0 0 0' }}>
                      {section.instruction}
                    </p>
                  </div>
                )}

                {/* Kontainer Butir Soal (1 Kolom atau 2 Kolom) */}
                <div
                  className={
                    twoColumns
                      ? 'columns-1 md:columns-2 gap-6 space-y-4'
                      : 'space-y-4'
                  }
                >
                  {section.items.map(q => {
                    const qNum = q.originalIndex;

                    return (
                      <div
                        key={q.ID || qNum}
                        className={`break-inside-avoid text-xs sm:text-[11pt] leading-relaxed ${
                          twoColumns ? 'mb-4 pb-3 border-b border-gray-300' : 'pb-2'
                        }`}
                        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                      >
                        {/* Nomor & Teks Pertanyaan */}
                        <div className="flex items-start gap-2" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span className="font-bold shrink-0 w-6 text-right" style={{ flexShrink: 0, width: '24px', textAlign: 'right', fontWeight: 'bold' }}>
                            {qNum}.
                          </span>
                          <div className="flex-1 space-y-2" style={{ flex: '1 1 0%', minWidth: 0 }}>
                            {/* Soal / Prompt */}
                            <div className="font-medium text-black">
                              {q.TYPE === 'MATCHING' ? (
                                (() => {
                                  const details = parseMatchingDetails(q.QUESTION, q, q.EXTRA_DATA, q.ANSWER);
                                  return (
                                    <RichContentRenderer content={details.prompt || q.QUESTION} />
                                  );
                                })()
                              ) : (
                                <RichContentRenderer content={q.QUESTION} />
                              )}
                            </div>

                            {/* --- TYPE: PILIHAN GANDA (MCQ) & PG KOMPLEKS --- */}
                            {(q.TYPE === 'MCQ' || q.TYPE === 'COMPLEX_MCQ' || !q.TYPE) && (
                              <div className="space-y-1 pt-1 pl-1" style={{ paddingTop: '4px', paddingLeft: '4px' }}>
                                {['A', 'B', 'C', 'D', 'E'].map(opt => {
                                  const optKey = `OPTION_${opt}`;
                                  const optText = q[optKey];
                                  if (!optText) return null;

                                  const isCorrect = String(q.ANSWER || '')
                                    .split(/[,;\s]+/)
                                    .map(s => s.trim().toUpperCase())
                                    .includes(opt);

                                  return (
                                    <div
                                      key={opt}
                                      className={`flex items-start gap-2 text-xs sm:text-[11pt] ${
                                        keyMode === 'inline' && isCorrect
                                          ? 'font-bold underline text-black'
                                          : ''
                                      }`}
                                      style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '4px' }}
                                    >
                                      <span className="font-bold shrink-0 w-5" style={{ flexShrink: 0, width: '20px', fontWeight: 'bold' }}>
                                        {opt}.
                                      </span>
                                      <div className="flex-1" style={{ flex: '1 1 0%', minWidth: 0 }}>
                                        <RichContentRenderer content={optText} inline />
                                        {keyMode === 'inline' && isCorrect && (
                                          <span className="ml-2 font-mono text-[9pt] font-bold text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded border border-emerald-400" style={{ marginLeft: '8px', fontFamily: 'monospace', fontSize: '9pt', fontWeight: 'bold' }}>
                                            [Kunci]
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* --- TYPE: MENJODOHKAN (MATCHING) FORMAT TABEL RESMI BERBINGKAI --- */}
                            {q.TYPE === 'MATCHING' && (() => {
                              const details = parseMatchingDetails(q.QUESTION, q, q.EXTRA_DATA, q.ANSWER);
                              const maxRows = Math.max(details.leftItems.length, details.rightItems.length);

                              return (
                                <div className="space-y-2 pt-1">
                                  <div className="border border-black overflow-hidden bg-white" style={{ border: '1px solid #000000', backgroundColor: '#ffffff' }}>
                                    <table className="w-full text-[10pt] border-collapse bg-white text-black" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff', color: '#000000' }}>
                                      <thead>
                                        <tr className="bg-[#EAECEF] text-black border-b border-black font-bold text-center" style={{ backgroundColor: '#EAECEF', color: '#000000', borderBottom: '1px solid #000000', fontWeight: 'bold', textAlign: 'center' }}>
                                          <th className="py-1.5 px-2.5 border-r border-black w-1/2" style={{ borderRight: '1px solid #000000', padding: '6px 10px', width: '50%' }}>
                                            Kolom A (Pernyataan / Premis)
                                          </th>
                                          <th className="py-1.5 px-2.5 w-1/2" style={{ padding: '6px 10px', width: '50%' }}>
                                            Kolom B (Pilihan Respon / Pasangan)
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {Array.from({ length: maxRows }).map((_, rIdx) => {
                                          const leftItem = details.leftItems[rIdx];
                                          const rightItem = details.rightItems[rIdx];

                                          return (
                                            <tr key={rIdx} className="border-b border-black last:border-0 bg-white text-black" style={{ borderBottom: '1px solid #000000', backgroundColor: '#ffffff', color: '#000000' }}>
                                              {/* Kolom Kiri */}
                                              <td className="py-1.5 px-2.5 border-r border-black align-top bg-white text-black" style={{ borderRight: '1px solid #000000', padding: '6px 10px', verticalAlign: 'top', backgroundColor: '#ffffff', color: '#000000' }}>
                                                {leftItem ? (
                                                  <div className="flex items-start gap-1.5" style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                                    <span className="font-bold shrink-0" style={{ fontWeight: 'bold', flexShrink: 0 }}>{leftItem.key}.</span>
                                                    <div className="flex-1">
                                                      <RichContentRenderer content={leftItem.text} inline />
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <span className="text-gray-400">-</span>
                                                )}
                                              </td>
                                              {/* Kolom Kanan */}
                                              <td className="py-1.5 px-2.5 align-top bg-white text-black" style={{ padding: '6px 10px', verticalAlign: 'top', backgroundColor: '#ffffff', color: '#000000' }}>
                                                {rightItem ? (
                                                  <div className="flex items-start gap-1.5" style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                                    <span className="font-bold shrink-0" style={{ fontWeight: 'bold', flexShrink: 0 }}>{rightItem.key}.</span>
                                                    <div className="flex-1">
                                                      <RichContentRenderer content={rightItem.text} inline />
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <span className="text-gray-400">-</span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Lembar Isian Pasangan Jawaban Siswa */}
                                  <div className="p-2.5 border border-black bg-[#F8F9FA] text-black text-[10pt] flex items-center gap-3 flex-wrap" style={{ border: '1px solid #000000', backgroundColor: '#F8F9FA', color: '#000000', padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    <span className="font-bold" style={{ fontWeight: 'bold' }}>Pasangan Jawaban:</span>
                                    {details.leftItems.map(left => (
                                      <span key={left.key} className="font-mono font-medium" style={{ fontFamily: 'monospace', fontWeight: 500 }}>
                                        {left.key} - [ &nbsp;&nbsp;&nbsp;&nbsp; ]
                                      </span>
                                    ))}
                                    {keyMode === 'inline' && (
                                      <span className="ml-auto font-mono text-[9pt] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-400" style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: '9pt', fontWeight: 'bold', color: '#065f46', backgroundColor: '#d1fae5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #34d399' }}>
                                        Kunci: {q.ANSWER || '-'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* --- TYPE: BENAR ATAU SALAH (TRUE_FALSE) --- */}
                            {q.TYPE === 'TRUE_FALSE' && (
                              <div className="pt-1 pl-2 flex items-center gap-6 text-[10pt]" style={{ display: 'flex', alignItems: 'center', gap: '24px', paddingTop: '4px', paddingLeft: '8px' }}>
                                <label className="flex items-center gap-2 font-bold cursor-pointer" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                                  <span className="inline-block w-4 h-4 border border-black rounded-xs text-center leading-none bg-white" style={{ display: 'inline-block', width: '16px', height: '16px', border: '1px solid #000000', backgroundColor: '#ffffff' }} />
                                  <span>[ &nbsp; ] &nbsp; BENAR (B)</span>
                                </label>
                                <label className="flex items-center gap-2 font-bold cursor-pointer" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                                  <span className="inline-block w-4 h-4 border border-black rounded-xs text-center leading-none bg-white" style={{ display: 'inline-block', width: '16px', height: '16px', border: '1px solid #000000', backgroundColor: '#ffffff' }} />
                                  <span>[ &nbsp; ] &nbsp; SALAH (S)</span>
                                </label>
                                {keyMode === 'inline' && (
                                  <span className="font-mono text-[9pt] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-400" style={{ fontFamily: 'monospace', fontSize: '9pt', fontWeight: 'bold', color: '#065f46', backgroundColor: '#d1fae5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #34d399' }}>
                                    Kunci: {q.ANSWER}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* --- TYPE: ISIAN SINGKAT (SHORT_ANSWER) --- */}
                            {q.TYPE === 'SHORT_ANSWER' && (
                              <div className="pt-2 pl-1 space-y-1">
                                <div className="text-[10pt]">
                                  Jawaban: ........................................................................................................................................................
                                </div>
                                {keyMode === 'inline' && (
                                  <div className="font-mono text-[9pt] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-400 inline-block">
                                    Kunci Jawaban: {q.ANSWER}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* --- TYPE: URAIAN / ESAI (ESSAY) --- */}
                            {q.TYPE === 'ESSAY' && (
                              <div className="pt-2 pl-1 space-y-2">
                                <div className="border border-dashed border-black bg-white rounded p-3 h-28 text-[9pt] text-gray-500 flex items-center justify-center">
                                  (Ruang lembar untuk menuliskan jawaban uraian secara terperinci)
                                </div>
                                {keyMode === 'inline' && q.ANSWER && (
                                  <div className="text-[10pt] bg-emerald-50 p-2.5 rounded border border-emerald-400 text-emerald-950">
                                    <b>Rubrik Penskoran / Kunci Uraian:</b> {q.ANSWER}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* ========================================================= */}
          {/* 6. TITIK MANGSA & TANDA TANGAN PENGESAHAN RESMI          */}
          {/* ========================================================= */}
          {showSignatures && (
            <div className="mt-8 pt-4 border-t border-black break-inside-avoid">
              <table className="w-full text-xs sm:text-[11pt] border-collapse" style={{ border: 'none' }}>
                <tbody>
                  <tr style={{ border: 'none' }}>
                    <td className="w-1/2 align-top text-center p-2" style={{ border: 'none' }}>
                      <div>Mengetahui,</div>
                      <div className="font-bold">{principalTitle}</div>
                      <div className="h-20" />
                      <div className="font-bold underline">{principalName}</div>
                      <div>{principalNip}</div>
                    </td>
                    <td className="w-1/2 align-top text-center p-2" style={{ border: 'none' }}>
                      <div>{cityLocation}, {examDate.split(',')[1] || examDate}</div>
                      <div className="font-bold">Guru Pengampu Mata Pelajaran</div>
                      <div className="h-20" />
                      <div className="font-bold underline">{teacherName}</div>
                      <div>NIP. {teacherNip}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* ========================================================= */}
          {/* 7. LAMPIRAN KUNCI JAWABAN & PEDOMAN PENSKORAN            */}
          {/* ========================================================= */}
          {keyMode === 'separate' && (
            <div className="mt-12 pt-8 border-t-2 border-black border-dashed break-before-page">
              <div className="text-center mb-6">
                <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider underline">
                  PEDOMAN PENSKORAN & KUNCI JAWABAN
                </h3>
                <div className="text-xs sm:text-[10pt] text-gray-700 mt-1">
                  {subjectName} • {targetClassName} • {assessmentTypeName} — Tahun Pelajaran {academicYear}
                </div>
              </div>

              {/* Tabel Rincian Kunci */}
              <div className="border border-black overflow-hidden text-xs sm:text-[10pt] mb-6 bg-white">
                <table className="w-full border-collapse bg-white text-black">
                  <thead>
                    <tr className="bg-[#F1F3F5] text-black border-b border-black font-bold text-center">
                      <th className="py-2 px-2 border-r border-black w-12">No.</th>
                      <th className="py-2 px-3 border-r border-black w-24">Tipe Soal</th>
                      <th className="py-2 px-4 border-r border-black w-48">Kunci Jawaban</th>
                      <th className="py-2 px-2 border-r border-black w-16">Bobot</th>
                      <th className="py-2 px-4">Rubrik Penskoran / Catatan Pembahasan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q, idx) => (
                      <tr key={q.ID || idx} className="border-b border-black last:border-0 bg-white text-black">
                        <td className="py-1.5 px-2 border-r border-black text-center font-bold bg-white text-black">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-3 border-r border-black text-center bg-white text-black">
                          {q.TYPE === 'ESSAY'
                            ? 'Uraian'
                            : q.TYPE === 'MATCHING'
                            ? 'Menjodohkan'
                            : q.TYPE === 'TRUE_FALSE'
                            ? 'Benar/Salah'
                            : q.TYPE === 'COMPLEX_MCQ'
                            ? 'PG Kompleks'
                            : q.TYPE === 'SHORT_ANSWER'
                            ? 'Isian'
                            : 'Pilihan Ganda'}
                        </td>
                        <td className="py-1.5 px-4 border-r border-black font-mono font-bold text-[#0052CC] bg-white">
                          {q.ANSWER || '(Belum diset)'}
                        </td>
                        <td className="py-1.5 px-2 border-r border-black text-center font-bold bg-white text-black">
                          {q.POINTS || 10}
                        </td>
                        <td className="py-1.5 px-4 text-gray-800 italic bg-white">
                          {q.EXPLANATION || '-'}
                        </td>
                      </tr>
                    ))}
                    {/* Baris Total */}
                    <tr className="bg-[#F1F3F5] text-black font-bold border-t-2 border-black">
                      <td colSpan={3} className="py-2 px-4 text-right border-r border-black">
                        TOTAL BOBOT MAKSIMAL:
                      </td>
                      <td className="py-2 px-2 text-center border-r border-black">
                        {totalMaxPoints}
                      </td>
                      <td className="py-2 px-4 text-gray-700">
                        Skor Maksimal = 100 (atau sesuai konversi rumus)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Rumus Konversi Nilai Akhir */}
              <div className="p-3 border border-black bg-[#F8F9FA] text-black text-[10pt] leading-relaxed break-inside-avoid">
                <div className="font-bold underline mb-1">RUMUS KONVERSI PENILAIAN:</div>
                <div className="font-mono text-[11pt] font-bold text-center py-1">
                  Nilai Akhir = (Total Skor Perolehan Siswa / {totalMaxPoints}) × 100
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 8. LEMBAR JAWABAN SISWA (LJK CETAK STANDAR A4)          */}
          {/* ========================================================= */}
          {showStudentSheet && (
            <div className="mt-12 pt-8 border-t-2 border-black border-dashed break-before-page">
              <div className="text-center mb-5">
                <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider underline">
                  LEMBAR JAWABAN SISWA (LJK)
                </h3>
                <div className="text-xs sm:text-[10pt] text-gray-700">
                  {assessmentTypeName} • Tahun Pelajaran {academicYear}
                </div>
              </div>

              {/* Identitas Siswa & Nilai */}
              <div className="border border-black p-3 mb-5 text-xs sm:text-[10pt] grid grid-cols-2 gap-4 bg-white text-black">
                <table className="w-full" style={{ border: 'none' }}>
                  <tbody>
                    <tr style={{ border: 'none' }}>
                      <td className="w-28 font-bold py-1" style={{ border: 'none' }}>Nama Lengkap</td>
                      <td className="py-1" style={{ border: 'none' }}>: ..............................................................</td>
                    </tr>
                    <tr style={{ border: 'none' }}>
                      <td className="font-bold py-1" style={{ border: 'none' }}>Nomor Peserta / NIS</td>
                      <td className="py-1" style={{ border: 'none' }}>: ..............................................................</td>
                    </tr>
                    <tr style={{ border: 'none' }}>
                      <td className="font-bold py-1" style={{ border: 'none' }}>Kelas / Rombel</td>
                      <td className="py-1" style={{ border: 'none' }}>: {targetClassName}</td>
                    </tr>
                  </tbody>
                </table>
                <table className="w-full" style={{ border: 'none' }}>
                  <tbody>
                    <tr style={{ border: 'none' }}>
                      <td className="w-28 font-bold py-1" style={{ border: 'none' }}>Mata Pelajaran</td>
                      <td className="py-1" style={{ border: 'none' }}>: {subjectName}</td>
                    </tr>
                    <tr style={{ border: 'none' }}>
                      <td className="font-bold py-1" style={{ border: 'none' }}>Hari, Tanggal</td>
                      <td className="py-1" style={{ border: 'none' }}>: {examDate}</td>
                    </tr>
                    <tr style={{ border: 'none' }}>
                      <td className="font-bold py-1" style={{ border: 'none' }}>Tanda Tangan</td>
                      <td className="py-1" style={{ border: 'none' }}>: ..............................................................</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Kotak Bulatan Jawaban A-B-C-D-E */}
              <div className="space-y-4 text-xs sm:text-[10pt]">
                <div className="font-bold uppercase tracking-wide border-b border-black pb-1">
                  A. Pilihan Ganda / Pilihan Ganda Kompleks:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {questions.slice(0, 40).map((_, idx) => (
                    <div
                      key={idx}
                      className="p-1.5 border border-black bg-white flex items-center justify-between text-[10pt]"
                    >
                      <span className="font-bold w-6">{idx + 1}.</span>
                      <div className="flex items-center gap-1 font-bold font-mono">
                        {['A', 'B', 'C', 'D', 'E'].map(l => (
                          <span
                            key={l}
                            className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[8pt] bg-white"
                          >
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Lembar Menjodohkan / Isian / Uraian */}
                <div className="pt-4 font-bold uppercase tracking-wide border-b border-black pb-1">
                  B. Lembar Jawaban Menjodohkan / Isian Singkat / Uraian:
                </div>
                <div className="border border-black bg-white p-4 min-h-[160px] text-[10pt] text-gray-500">
                  (Tuliskan jawaban pasangan menjodohkan atau uraian secara jelas pada ruang ini)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
