/**
 * printHelper.ts
 * Solusi pencetakan dokumen yang handal dan tahan banting untuk aplikasi web,
 * terutama saat aplikasi berjalan di dalam iframe (AI Studio sandbox) maupun tab mandiri.
 */

export interface PrintDocumentOptions {
  title?: string;
  paperSize?: 'A4' | 'F4';
  orientation?: 'portrait' | 'landscape';
  customCss?: string;
  autoPrint?: boolean;
}

/**
 * Format ukuran kertas CSS @page
 */
export function getPageSizeCss(paperSize: 'A4' | 'F4' = 'A4', orientation: 'portrait' | 'landscape' = 'landscape'): string {
  if (orientation === 'landscape') {
    return paperSize === 'F4' ? '330mm 215mm' : '297mm 210mm';
  }
  return paperSize === 'F4' ? '215mm 330mm' : '210mm 297mm';
}

/**
 * Mengambil seluruh tag <style> dan <link rel="stylesheet"> dari aplikasi aktif
 * agar seluruh class utilitas Tailwind (flex, grid, border, text, font) terbawa ke jendela cetak.
 */
export function getDocumentStyles(): string {
  if (typeof document === 'undefined') return '';
  const styles: string[] = [];
  try {
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
      styles.push(el.outerHTML);
    });
  } catch (e) {
    console.warn('Gagal membaca style document:', e);
  }
  return styles.join('\n');
}

/**
 * Membangun dokumen HTML lengkap yang siap cetak dengan styling standar madrasah/sekolah
 */
export function buildPrintHtml(
  contentHtml: string,
  options: PrintDocumentOptions = {}
): string {
  const {
    title = 'Dokumen Resmi CBT Madrasah',
    paperSize = 'A4',
    orientation = 'landscape',
    customCss = '',
    autoPrint = true
  } = options;

  const pageSizeRule = getPageSizeCss(paperSize, orientation);
  const injectedAppStyles = getDocumentStyles();

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${injectedAppStyles}
  <style>
    @page {
      size: ${pageSizeRule};
      margin: 6mm 8mm 6mm 8mm;
    }
    * {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: 'Times New Roman', Times, serif;
      font-size: 10pt;
      line-height: 1.3;
      width: 100% !important;
    }

    /* Pembatas Ketat Logo & Gambar agar tidak membesar / merusak layout */
    img {
      max-width: 100% !important;
      height: auto;
    }
    svg:not([width]):not([style*="width"]) {
      max-width: 100% !important;
      height: auto;
    }
    img[alt="Logo Lembaga"],
    img[alt="Logo"],
    .official-kop-logo {
      max-height: 72px !important;
      max-width: 72px !important;
      width: auto !important;
      height: auto !important;
      object-fit: contain !important;
      display: block !important;
    }
    .max-h-8 { max-height: 32px !important; }
    .max-w-8 { max-width: 32px !important; }
    .max-h-9 { max-height: 36px !important; }
    .max-w-9 { max-width: 36px !important; }
    .max-h-10 { max-height: 40px !important; }
    .max-w-10 { max-width: 40px !important; }
    .max-h-12 { max-height: 48px !important; }
    .max-w-12 { max-width: 48px !important; }
    .max-h-14 { max-height: 54px !important; }
    .max-w-14 { max-width: 54px !important; }
    .max-h-16 { max-height: 64px !important; }
    .max-w-16 { max-width: 64px !important; }
    .max-h-20 { max-height: 74px !important; }
    .max-w-20 { max-width: 74px !important; }
    .object-contain { object-fit: contain !important; }

    /* Aturan Tata Letak Fleksibel (Flexbox) Mencegah Penandatangan / Kop Menumpuk Vertikal */
    .flex { display: flex !important; }
    .inline-flex { display: inline-flex !important; }
    .flex-row { flex-direction: row !important; }
    .flex-col { flex-direction: column !important; }
    .items-center { align-items: center !important; }
    .items-start { align-items: flex-start !important; }
    .items-end { align-items: flex-end !important; }
    .justify-between { justify-content: space-between !important; }
    .justify-center { justify-content: center !important; }
    .justify-end { justify-content: flex-end !important; }
    .justify-start { justify-content: flex-start !important; }
    .shrink-0 { flex-shrink: 0 !important; }
    .grow, .flex-1 { flex: 1 1 0% !important; min-width: 0 !important; }

    /* Grid */
    .grid { display: grid !important; }
    .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
    .grid-rows-2 { grid-template-rows: repeat(2, minmax(0, 1fr)) !important; }
    .grid-rows-3 { grid-template-rows: repeat(3, minmax(0, 1fr)) !important; }
    .gap-1 { gap: 4px !important; }
    .gap-1\.5, .gap-1\.5 { gap: 6px !important; }
    .gap-2 { gap: 8px !important; }
    .gap-2\.5, .gap-2\.5 { gap: 10px !important; }
    .gap-3 { gap: 12px !important; }
    .gap-4 { gap: 16px !important; }
    .gap-6 { gap: 24px !important; }

    /* Dimensi & Lebar Kolom */
    .w-full { width: 100% !important; }
    .w-8 { width: 32px !important; }
    .h-8 { height: 32px !important; }
    .w-9 { width: 36px !important; }
    .h-9 { height: 36px !important; }
    .w-10 { width: 40px !important; }
    .h-10 { height: 40px !important; }
    .w-12 { width: 48px !important; }
    .h-12 { height: 48px !important; }
    .w-14 { width: 56px !important; }
    .h-14 { height: 56px !important; }
    .h-18 { height: 72px !important; }
    .w-16 { width: 64px !important; }
    .h-16 { height: 64px !important; }
    .w-20 { width: 80px !important; }
    .h-20 { height: 80px !important; }
    .w-22 { width: 88px !important; }
    .h-22 { height: 88px !important; }
    .w-24 { width: 96px !important; }
    .h-24 { height: 96px !important; }
    .w-28 { width: 112px !important; }
    .w-32 { width: 128px !important; }
    .w-64 { width: 16rem !important; }
    .w-72 { width: 18rem !important; }
    .h-28 { height: 7rem !important; }
    .h-32 { height: 8rem !important; }
    .h-36 { height: 9rem !important; }
    .mt-auto { margin-top: auto !important; }
    .mr-1 { margin-right: 4px !important; }
    .mr-2 { margin-right: 8px !important; }
    .mr-2\.5 { margin-right: 10px !important; }
    .mr-3 { margin-right: 12px !important; }

    /* Border & Radius */
    .border { border: 1px solid #000000 !important; }
    .border-2 { border: 2px solid #000000 !important; }
    .border-b { border-bottom: 1px solid #000000 !important; }
    .border-b-2 { border-bottom: 2px solid #000000 !important; }
    .border-t { border-top: 1px solid #000000 !important; }
    .border-r { border-right: 1px solid #000000 !important; }
    .border-black { border-color: #000000 !important; }
    .rounded { border-radius: 4px !important; }
    .rounded-md { border-radius: 6px !important; }
    .rounded-lg { border-radius: 8px !important; }
    .rounded-xl { border-radius: 12px !important; }

    /* Padding */
    .p-1 { padding: 4px !important; }
    .p-1\.5 { padding: 6px !important; }
    .p-2 { padding: 8px !important; }
    .p-2\.5 { padding: 10px !important; }
    .p-3 { padding: 12px !important; }
    .p-4 { padding: 16px !important; }
    .pb-2 { padding-bottom: 8px !important; }
    .pt-1 { padding-top: 4px !important; }
    .pt-1\.5 { padding-top: 6px !important; }

    /* Tabel Standar Cetak */
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin-top: 4px;
      margin-bottom: 6px;
      font-size: 9pt;
    }
    th, td {
      border: 1px solid #000000 !important;
      padding: 3px 5px !important;
      vertical-align: middle;
    }
    th {
      background-color: #f1f3f5 !important;
      font-weight: bold;
      text-align: center;
    }
    .text-center { text-align: center !important; }
    .text-left { text-align: left !important; }
    .text-right { text-align: right !important; }
    .font-bold { font-weight: bold !important; }
    .font-semibold { font-weight: 600 !important; }
    .uppercase { text-transform: uppercase !important; }
    .underline { text-decoration: underline !important; }
    .break-inside-avoid { break-inside: avoid !important; page-break-inside: avoid !important; }
    .page-break { page-break-after: always !important; break-after: page !important; }

    /* Toolbar Kontrol saat dilihat di Tab Baru */
    .print-control-bar {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      z-index: 99999;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      font-family: system-ui, -apple-system, sans-serif;
    }
    .print-control-bar .title {
      font-size: 13px;
      font-weight: 600;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .print-control-bar .actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .print-btn {
      cursor: pointer;
      background: #056839;
      color: #ffffff;
      border: 1px solid #0d7844;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .print-btn:hover {
      background: #04522d;
    }
    .close-btn {
      cursor: pointer;
      background: #334155;
      color: #f1f5f9;
      border: 1px solid #475569;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 500;
      border-radius: 6px;
    }
    .close-btn:hover {
      background: #475569;
    }

    /* Media Print Overrides */
    @media print {
      .print-control-bar, .no-print {
        display: none !important;
      }
      body {
        padding: 0 !important;
        margin: 0 !important;
        background: #ffffff !important;
      }
      .printable-content {
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
      }
      /* Cegah wadah dokumen memaksakan dimensi tetap yang meluap ke halaman kedua */
      #printAreaSchedule, #printableDocumentArea, .printable-page, [id^="printArea"] {
        width: 100% !important;
        max-width: 100% !important;
        min-height: auto !important;
        padding: 0 !important;
        margin: 0 !important;
        border: none !important;
        box-shadow: none !important;
      }
    }

    ${customCss}
  </style>
</head>
<body>
  <div class="print-control-bar">
    <div class="title">
      <span>📄 <b>${title}</b></span>
      <span style="opacity: 0.7; font-size: 11px;">(${paperSize} • ${orientation === 'landscape' ? 'Mendatar (Landscape)' : 'Tegak (Portrait)'})</span>
    </div>
    <div class="actions">
      <button class="print-btn" onclick="window.print()">
        🖨️ Cetak Dokumen Sekarang
      </button>
      <button class="close-btn" onclick="window.close()">
        Tutup
      </button>
    </div>
  </div>

  <div class="printable-content" style="padding: 8px 12px;">
    ${contentHtml}
  </div>

  ${
    autoPrint
      ? `<script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch (e) {
          console.warn('Auto print error:', e);
        }
      }, 400);
    });
  </script>`
      : ''
  }
</body>
</html>`;
}

/**
 * Mencetak elemen DOM secara cerdas:
 * 1. Menyiapkan HTML dokumen cetak yang bersih
 * 2. Membuka di tab baru (Blob URL) agar terlepas dari batas iframe sandbox
 * 3. Memicu dialog cetak secara otomatis
 */
export function printElementReliable(
  elementOrHtml: HTMLElement | string,
  options: PrintDocumentOptions = {}
): boolean {
  try {
    const rawHtml = typeof elementOrHtml === 'string'
      ? elementOrHtml
      : elementOrHtml.innerHTML;

    if (!rawHtml || !rawHtml.trim()) {
      console.warn('printElementReliable: Konten cetak kosong.');
      return false;
    }

    const fullHtml = buildPrintHtml(rawHtml, options);

    // Gunakan Blob URL agar kompatibel di semua browser dan tidak terhambat URL length
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    // Buka jendela/tab baru
    const printWindow = window.open(blobUrl, '_blank');

    if (!printWindow) {
      // Jika popup terblokir, coba alternatif iframe tersembunyi
      console.warn('Popup cetak terhalang browser, mencoba iframe internal...');
      return printViaHiddenIframe(fullHtml);
    }

    // Bebaskan memory blob setelah beberapa waktu
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 60000);

    return true;
  } catch (err) {
    console.error('Gagal mencetak dokumen:', err);
    // Terakhir: fallback ke window.print() langsung
    try {
      window.print();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Metode alternatif cetak melalui iframe tersembunyi
 */
function printViaHiddenIframe(fullHtml: string): boolean {
  try {
    let iframe = document.getElementById('__applet_print_frame__') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = '__applet_print_frame__';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      window.print();
      return true;
    }

    doc.open();
    doc.write(fullHtml);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Iframe print failed, falling back to window.print():', e);
        window.print();
      }
    }, 500);

    return true;
  } catch (e) {
    console.error('printViaHiddenIframe error:', e);
    window.print();
    return false;
  }
}

/**
 * Normalisasi semester string untuk judul dokumen resmi cetak (uppercase).
 * Menghasilkan 'GANJIL' atau 'GENAP' sesuai standar dokumen resmi madrasah/sekolah.
 * Contoh masukan -> keluaran:
 * - '1 (Ganjil)' -> 'GANJIL'
 * - 'Ganjil' -> 'GANJIL'
 * - '1' -> 'GANJIL'
 * - 'Semester 1 (Ganjil)' -> 'GANJIL'
 * - '2 (Genap)' -> 'GENAP'
 * - 'Genap' -> 'GENAP'
 * - '2' -> 'GENAP'
 * - 'Semester 2 (Genap)' -> 'GENAP'
 */
export function formatDocumentSemester(raw?: string): string {
  if (!raw) return 'GANJIL';
  let s = String(raw).trim().replace(/^semester\s+/i, '').trim();
  if (!s) return 'GANJIL';
  if (s === '1' || s.toLowerCase().includes('ganjil')) {
    return 'GANJIL';
  }
  if (s === '2' || s.toLowerCase().includes('genap')) {
    return 'GENAP';
  }
  return s.toUpperCase();
}

/**
 * Normalisasi semester dalam format teks alami (Title Case)
 * Contoh:
 * - '1 (Ganjil)' -> 'Semester Ganjil' (jika includeSemesterPrefix=true) atau 'Ganjil'
 * - 'Ganjil' -> 'Semester Ganjil' (jika includeSemesterPrefix=true) atau 'Ganjil'
 */
export function formatCleanSemesterText(raw?: string, includeSemesterPrefix: boolean = false): string {
  if (!raw) return includeSemesterPrefix ? 'Semester Ganjil' : 'Ganjil';
  let s = String(raw).trim().replace(/^semester\s+/i, '').trim();
  let normalized = 'Ganjil';
  if (s === '2' || s.toLowerCase().includes('genap')) {
    normalized = 'Genap';
  } else if (s === '1' || s.toLowerCase().includes('ganjil')) {
    normalized = 'Ganjil';
  } else {
    normalized = s;
  }
  return includeSemesterPrefix ? `Semester ${normalized}` : normalized;
}
