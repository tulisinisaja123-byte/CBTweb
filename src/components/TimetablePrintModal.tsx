import React, { useState, useRef, useMemo } from 'react';
import {
  Printer,
  X,
  ExternalLink,
  Download,
  Calendar,
  Layers,
  FileCheck,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { TimetableDay, SchoolSettings } from '../types';
import {
  MA_CIKARAMAS_SATURDAY_DAY,
  MA_CIKARAMAS_TIMETABLE_6DAYS
} from '../data/curriculumData';
import { MasterTimetableDocument } from './MasterTimetableDocument';

interface TimetablePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  timetable: TimetableDay[];
  settings?: SchoolSettings;
  initialWorkDays?: 5 | 6;
  onShowToast?: (msg: string) => void;
}

export const TimetablePrintModal: React.FC<TimetablePrintModalProps> = ({
  isOpen,
  onClose,
  timetable,
  settings,
  initialWorkDays = 5,
  onShowToast
}) => {
  const [workDays, setWorkDays] = useState<5 | 6>(initialWorkDays);
  const [paperSize, setPaperSize] = useState<'A4' | 'F4'>('A4');
  const [fontSize, setFontSize] = useState<'6pt' | '6.5pt' | '7pt' | '7.5pt'>('6.5pt');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Active timetable data adjusted for 5 or 6 days
  const activeTimetable = useMemo(() => {
    if (workDays === 6) {
      const hasSabtu = timetable.some(d => d.day.toUpperCase() === 'SABTU');
      if (hasSabtu) return timetable;
      return [...timetable, MA_CIKARAMAS_SATURDAY_DAY];
    } else {
      return timetable.filter(d => d.day.toUpperCase() !== 'SABTU');
    }
  }, [timetable, workDays]);

  if (!isOpen) return null;

  const schoolName = settings?.SCHOOL_NAME || 'MA MUHAMMADIYAH CIKARAMAS';
  const academicYear = settings?.SCHOOL_YEAR || '2026/2027';

  // Build standalone clean HTML for print iframe, new tab, and download
  const generateCleanPrintHtml = () => {
    const printContent = printAreaRef.current ? printAreaRef.current.innerHTML : '';
    const sizeRule =
      paperSize === 'F4'
        ? '330mm 215mm'
        : '297mm 210mm'; // A4 Landscape exact dimensions

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Jadwal Pelajaran Tatap Muka (${workDays} Hari Kerja) - ${schoolName}</title>
  <style>
    @page {
      size: ${sizeRule};
      margin: 4mm 5mm 4mm 5mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: Arial, Helvetica, sans-serif;
      font-size: ${fontSize};
      line-height: 1.15;
    }
    .no-print {
      display: none !important;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      border: 1.5px solid #000000;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #000000;
      padding: 1px 1.5px;
      vertical-align: middle;
      color: #000000;
    }
    th {
      background-color: #f2f2f2 !important;
      font-weight: bold;
    }
    .master-document-root {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      page-break-inside: avoid;
    }
    /* Sticky Top Bar for New Tab Preview */
    .sticky-bar {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      background: #0f172a;
      color: #ffffff;
      padding: 8px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .btn-action-print {
      background: #00875a;
      color: white;
      border: none;
      padding: 7px 18px;
      border-radius: 4px;
      font-weight: bold;
      cursor: pointer;
      font-size: 12px;
    }
    .btn-action-close {
      background: #475569;
      color: white;
      border: none;
      padding: 7px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      margin-left: 8px;
    }
    @media print {
      .sticky-bar { display: none !important; }
      body { margin: 0 !important; padding: 0 !important; }
    }
  </style>
</head>
<body>
  <div class="sticky-bar no-print">
    <div>
      <b>Jadwal Pelajaran Tatap Muka - MA Muhammadiyah Cikaramas</b>
      <span style="opacity:0.8; margin-left:12px; font-size:11px;">
        (Format Memanjang 1 Lembar Pas ${paperSize} Landscape - ${workDays} Hari Kerja)
      </span>
    </div>
    <div>
      <button class="btn-action-print" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
      <button class="btn-action-close" onclick="window.close()">Tutup Tab</button>
    </div>
  </div>
  <div style="padding: 2mm 3mm;">
    ${printContent}
  </div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 400);
    });
  </script>
</body>
</html>`;
  };

  // Print via isolated hidden iframe
  const handlePrintIframe = () => {
    onShowToast?.('Mempersiapkan lembar cetak...');
    try {
      let iframe = document.getElementById('timetable-print-iframe') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'timetable-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.top = '-9999px';
        iframe.style.left = '-9999px';
        iframe.style.width = '1200px';
        iframe.style.height = '900px';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
      }

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(generateCleanPrintHtml());
        iframeDoc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (err) {
            console.warn('Iframe print error, fallback to new tab:', err);
            handleOpenInNewTab();
          }
        }, 500);
        return;
      }
    } catch (err) {
      console.warn('Iframe setup error, fallback to new tab:', err);
      handleOpenInNewTab();
    }
  };

  // Open in new tab
  const handleOpenInNewTab = () => {
    onShowToast?.('Membuka lembar cetak di tab baru...');
    const html = generateCleanPrintHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const newTab = window.open(url, '_blank');
    if (!newTab) {
      const fallbackWin = window.open('', '_blank');
      if (fallbackWin) {
        fallbackWin.document.open();
        fallbackWin.document.write(html);
        fallbackWin.document.close();
      } else {
        onShowToast?.('Browser memblokir popup window. Silakan izinkan popup atau unduh dokumen HTML.');
      }
    }
  };

  // Download standalone HTML
  const handleDownloadHtml = () => {
    const html = generateCleanPrintHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Jadwal_Pelajaran_1Lembar_A4_Landscape_${workDays}Hari_${academicYear.replace('/', '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast?.('File HTML cetak 1 lembar A4 berhasil diunduh.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs">
      <div className="bg-[#1E293B] rounded-lg max-w-[98vw] w-[1380px] max-h-[96vh] flex flex-col shadow-2xl border border-slate-700 overflow-hidden text-white">
        {/* Header Modal */}
        <div className="px-5 py-3 bg-[#0F172A] border-b border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded bg-blue-600 text-white shadow-xs">
              <Printer className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-bold text-sm sm:text-base leading-tight flex items-center gap-2">
                <span>Cetak Dokumen Resmi: Jadwal Pelajaran Format Memanjang</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-emerald-600/80 text-white">
                  1 Lembar Pas A4 Landscape
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Sesuai fisik dokumen master asli: Dua baris bertingkat (Senin-Rabu di atas + Kamis-Jum'at di bawah), berdampingan dengan Tabel Guru (A-T), Kokulikuler &amp; Tanda Tangan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Pengaturan Format Cetak */}
        <div className="px-5 py-2.5 bg-[#1E293B] border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 text-slate-200">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Opsi 5 Hari vs 6 Hari Kerja */}
            <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded border border-slate-600">
              <span className="text-slate-300 font-semibold px-1">Sistem Kerja:</span>
              <button
                type="button"
                onClick={() => setWorkDays(5)}
                className={`px-2.5 py-1 rounded font-bold text-xs transition-colors ${
                  workDays === 5
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                5 Hari (Senin - Jum'at)
              </button>
              <button
                type="button"
                onClick={() => setWorkDays(6)}
                className={`px-2.5 py-1 rounded font-bold text-xs transition-colors ${
                  workDays === 6
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                6 Hari (Senin - Sabtu)
              </button>
            </div>

            {/* Ukuran Kertas */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-300">Kertas:</span>
              <select
                value={paperSize}
                onChange={e => setPaperSize(e.target.value as any)}
                className="px-2 py-1 rounded border border-slate-600 bg-slate-800 text-white font-medium text-xs focus:ring-1 focus:ring-blue-500"
              >
                <option value="A4">A4 Landscape (297 x 210 mm) - Rekomendasi 1 Lembar Pas</option>
                <option value="F4">F4 / Folio Landscape (330 x 215 mm)</option>
              </select>
            </div>

            {/* Ukuran Font */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-300">Ukuran Font:</span>
              <select
                value={fontSize}
                onChange={e => setFontSize(e.target.value as any)}
                className="px-2 py-1 rounded border border-slate-600 bg-slate-800 text-white font-medium text-xs focus:ring-1 focus:ring-blue-500"
              >
                <option value="6.5pt">6.5pt (Standar Pas 1 Lembar A4)</option>
                <option value="6pt">6pt (Sangat Ringkas)</option>
                <option value="7pt">7pt (Sedang)</option>
                <option value="7.5pt">7.5pt (Besar / Khusus F4)</option>
              </select>
            </div>

            {/* Zoom Preview Controls */}
            <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded border border-slate-600">
              <span className="text-[11px] text-slate-400 mr-1">Zoom:</span>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(prev - 10, 60))}
                className="p-0.5 hover:bg-slate-700 rounded text-slate-300"
                title="Perkecil Zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] w-10 text-center">{zoomLevel}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(prev + 10, 140))}
                className="p-0.5 hover:bg-slate-700 rounded text-slate-300"
                title="Perbesar Zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className="text-[10px] px-1 py-0.5 bg-slate-700 rounded hover:bg-slate-600 ml-1"
              >
                100%
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-400 bg-blue-900/40 text-blue-300 hover:bg-blue-800/60 font-semibold text-xs transition-colors"
              title="Buka di tab baru (bebas batas iframe)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka di Tab Baru</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
              title="Unduh file HTML mandiri siap cetak"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh HTML</span>
            </button>
            <button
              type="button"
              onClick={handlePrintIframe}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Sekarang</span>
            </button>
          </div>
        </div>

        {/* Modal Body: Interactive Print Preview matching exact paper layout */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-[#334155] flex justify-center items-start">
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out'
            }}
          >
            {/* Paper Sheet Preview container representing actual A4 Landscape ratio */}
            <div
              className="bg-white text-black shadow-2xl p-4 sm:p-5 border border-slate-300 transition-all rounded-xs"
              style={{
                width: '1150px',
                minHeight: '790px',
                margin: '0 auto'
              }}
            >
              <div ref={printAreaRef}>
                <MasterTimetableDocument
                  timetable={activeTimetable}
                  workDays={workDays}
                  settings={settings}
                  fontSize={fontSize}
                  isPrintMode={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 bg-[#0F172A] border-t border-slate-700 flex items-center justify-between text-xs shrink-0 text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Format Memanjang: Senin (Persiapan Upacara &amp; Upacara), Selasa &amp; Rabu (Do'a &amp; Tadarus), Kamis (Senam Bersama), Jum'at (Do'a, Tadarus, Tausyiah &amp; Sholat Jum'at).
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-md border border-slate-600 hover:bg-slate-800 font-semibold text-slate-300 transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrintIframe}
              className="inline-flex items-center gap-1.5 px-5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
