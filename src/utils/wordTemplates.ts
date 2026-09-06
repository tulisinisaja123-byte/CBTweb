import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  PageBreak
} from 'docx';
import { SchoolSettings } from '../types';
import { parseMatchingDetails } from './matchingHelper';
import { formatDocumentSemester } from './printHelper';

export const QUESTION_TYPES_INFO = [
  {
    type: 'PG',
    label: 'Pilihan Ganda (PG)',
    desc: 'Siswa memilih 1 jawaban benar dari pilihan opsi A, B, C, D, atau E.',
    keyExample: 'A (atau B, C, D, E)'
  },
  {
    type: 'PG_KOMPLEKS',
    label: 'Pilihan Ganda Kompleks',
    desc: 'Siswa dapat memilih lebih dari satu jawaban yang benar (centang beberapa opsi).',
    keyExample: 'A, C, D'
  },
  {
    type: 'BENAR_SALAH',
    label: 'Benar / Salah (B/S)',
    desc: 'Siswa menentukan apakah pernyataan soal bernilai Benar atau Salah.',
    keyExample: 'BENAR (atau SALAH)'
  },
  {
    type: 'MENJODOHKAN',
    label: 'Menjodohkan / Mencocokkan',
    desc: 'Memasangkan premis kolom kiri dengan pasangan jawaban kolom kanan.',
    keyExample: '1-C; 2-A; 3-B'
  },
  {
    type: 'ISIAN_SINGKAT',
    label: 'Isian Singkat',
    desc: 'Siswa mengetik kata kunci atau angka jawaban yang dicocokkan otomatis oleh sistem.',
    keyExample: 'Mitokondria'
  },
  {
    type: 'ESAI',
    label: 'Uraian / Esai',
    desc: 'Siswa menuliskan uraian mendalam yang dikoreksi manual oleh guru melalui menu Koreksi.',
    keyExample: 'Pedoman penskoran guru'
  }
];

/**
 * Generates and downloads an official Microsoft Word (.docx) question template
 * with rich examples: Arabic text, Math formulas, Images/Diagrams, and Chemistry.
 */
export async function downloadQuestionsWordTemplate(settings?: SchoolSettings) {
  const schoolName = settings?.SCHOOL_NAME || 'MAS MUHAMMADIYAH CIKARAMAS';
  const schoolYear = settings?.SCHOOL_YEAR || '2026/2027';
  const curriculum = settings?.CURRICULUM === 'K13' ? 'Kurikulum 2013 Revisi (K13)' : 'Kurikulum Merdeka (Fase E & F)';

  const cellBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'D0D5DD' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D0D5DD' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'D0D5DD' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'D0D5DD' }
  };

  const headerShading = {
    type: ShadingType.CLEAR,
    fill: '0052CC',
    color: 'auto'
  };

  const zebraShading = {
    type: ShadingType.CLEAR,
    fill: 'F9FAFB',
    color: 'auto'
  };

  const highlightShading = {
    type: ShadingType.CLEAR,
    fill: 'F0F7FF',
    color: 'auto'
  };

  // Helper for table header cells
  const makeHeaderCell = (text: string, widthPercent: number) =>
    new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: headerShading,
      borders: cellBorder,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text,
              bold: true,
              color: 'FFFFFF',
              size: 20 // 10pt
            })
          ]
        })
      ]
    });

  // Helper for regular data cells
  const makeCell = (
    text: string,
    widthPercent: number,
    opts: {
      bold?: boolean;
      align?: (typeof AlignmentType)[keyof typeof AlignmentType];
      zebra?: boolean;
      highlight?: boolean;
      italic?: boolean;
      color?: string;
    } = {}
  ) => {
    // Split by newlines so each newline becomes its own paragraph
    const lines = (text || '-').split('\n');
    const paragraphs = lines.map(
      (line, lineIdx) =>
        new Paragraph({
          alignment: opts.align || AlignmentType.LEFT,
          spacing: { after: lineIdx === lines.length - 1 ? 0 : 60 },
          children: [
            new TextRun({
              text: line || ' ',
              bold: Boolean(opts.bold),
              italics: Boolean(opts.italic),
              color: opts.color || '1A1C1E',
              size: 19 // 9.5pt
            })
          ]
        })
    );

    return new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      borders: cellBorder,
      shading: opts.highlight ? highlightShading : opts.zebra ? zebraShading : undefined,
      children: paragraphs
    });
  };

  // Comprehensive example rows featuring Arabic, Formulas, Images, and diverse types
  const exampleRows = [
    {
      no: '1',
      type: 'PG',
      category: 'Bahasa / Umum',
      question: 'Manakah dari kalimat berikut yang menggunakan tanda baca dan ejaan bahasa Indonesia yang baku sesuai Pedoman Umum Ejaan Bahasa Indonesia (PUEBI)?',
      options: 'A. Ibu membeli: jeruk, apel, dan mangga di pasar.\nB. Kami semua hadir, kecuali Budi yang sedang sakit.\nC. Dimana kamu meletakkan buku matematika itu?\nD. Pertandingan sepakbola itu dimenangkan oleh regu A.\nE. Walaupun hujan lebat tetapi mereka tetap berangkat.',
      answer: 'B',
      points: '10'
    },
    {
      no: '2',
      type: 'PG',
      category: 'Huruf Arab & Agama',
      question: 'Perhatikan kutipan ayat suci Al-Qur\'an (QS. Al-Baqarah: 2) berikut ini:\n\nذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ\n\nArti dari lafadz "هُدًى لِّلْمُتَّقِينَ" pada ayat di atas adalah ...',
      options: 'A. Petunjuk bagi orang-orang yang bertakwa\nB. Penerang bagi mereka yang beriman dan beramal saleh\nC. Berita gembira bagi seluruh alam semesta\nD. Peringatan keras bagi orang-orang yang zalim\nE. Pedoman hukum bagi para nabi dan rasul',
      answer: 'A',
      points: '10'
    },
    {
      no: '3',
      type: 'PG',
      category: 'Rumus Matematika',
      question: 'Diberikan persamaan kuadrat f(x) = 2x² - 8x + 6 = 0.\nDengan menggunakan rumus kuadrat x = (-b ± √(b² - 4ac)) / (2a), nilai akar-akar x₁ dan x₂ yang memenuhi persamaan tersebut adalah ...',
      options: 'A. x₁ = 3 dan x₂ = 1\nB. x₁ = -3 dan x₂ = -1\nC. x₁ = 2 dan x₂ = 4\nD. x₁ = 1/2 dan x₂ = 3\nE. x₁ = -1 dan x₂ = 3',
      answer: 'A',
      points: '10'
    },
    {
      no: '4',
      type: 'PG',
      category: 'Reaksi Kimia / Sains',
      question: 'Perhatikan persamaan reaksi redoks berikut ini:\nMnO₄⁻ + 8H⁺ + 5Fe²⁺ → Mn²⁺ + 5Fe³⁺ + 4H₂O\nSpesi kimia yang bertindak sebagai reduktor (mengalami peristiwa oksidasi) pada reaksi tersebut adalah ...',
      options: 'A. Fe²⁺\nB. MnO₄⁻\nC. H⁺\nD. Mn²⁺\nE. H₂O',
      answer: 'A',
      points: '10'
    },
    {
      no: '5',
      type: 'PG',
      category: 'Soal Bergambar',
      question: '[GAMBAR: Sisipkan/Paste Gambar Diagram Sel atau Grafik di Sini]\nPerhatikan gambar organel sel di samping! Organel sel bermembran ganda yang memiliki lipatan krista dan berfungsi sebagai tempat respirasi seluler penghasil molekul energi ATP adalah ...\n\n*(Catatan: Anda dapat langsung menyisipkan (Insert Picture) atau menempelkan gambar naskah soal langsung ke dalam tabel ini)*',
      options: 'A. Mitokondria\nB. Ribosom\nC. Retikulum Endoplasma Kasar\nD. Badan Golgi\nE. Lisosom',
      answer: 'A',
      points: '10'
    },
    {
      no: '6',
      type: 'PG_KOMPLEKS',
      category: 'PG Kompleks',
      question: 'Manakah dari pernyataan berikut yang BENAR mengenai ciri-ciri reaksi fotosintesis pada tumbuhan hijau? (Pilihlah semua jawaban yang benar)',
      options: 'A. Memerlukan energi cahaya matahari dan klorofil\nB. Mengubah karbondioksida (CO2) dan air (H2O) menjadi glukosa\nC. Berlangsung optimal pada malam hari tanpa cahaya\nD. Menghasilkan gas oksigen (O2) sebagai produk sampingan\nE. Menghasilkan gas metana (CH4)',
      answer: 'A, B, D',
      points: '15'
    },
    {
      no: '7',
      type: 'BENAR_SALAH',
      category: 'Benar / Salah',
      question: 'Pernyataan: "Paus biru dan lumba-lumba adalah hewan mamalia berdarah panas (homoiterm) yang bernapas menggunakan organ paru-paru, bukan insang."',
      options: 'Opsi: BENAR atau SALAH',
      answer: 'BENAR',
      points: '10'
    },
    {
      no: '8',
      type: 'MENJODOHKAN',
      category: 'Menjodohkan',
      question: 'Jodohkan instrumen pengukur cuaca berikut dengan parameter yang diukur:\n1. Barometer\n2. Anemometer\n3. Higrometer',
      options: 'A. Pengukur kelembaban relatif udara\nB. Pengukur tekanan atmosfer udara\nC. Pengukur kecepatan aliran angin',
      answer: '1-B; 2-C; 3-A',
      points: '15'
    },
    {
      no: '9',
      type: 'ISIAN_SINGKAT',
      category: 'Isian Singkat',
      question: 'Ibu kota negara Jepang yang juga menjadi salah satu kota metropolitan terpadat di benua Asia adalah ...',
      options: '- (Ketik kata kunci jawaban singkat pada kolom Kunci Jawaban)',
      answer: 'Tokyo',
      points: '10'
    },
    {
      no: '10',
      type: 'ESAI',
      category: 'Uraian / Esai',
      question: 'Jelaskan bunyi Hukum Kekekalan Energi (Hukum I Termodinamika) dan berikan minimal 2 (dua) contoh konversi bentuk energi yang terjadi dalam teknologi pembangkit listrik ramah lingkungan!',
      options: '- (Siswa mengetik uraian lengkap, penilaian oleh guru melalui menu Koreksi)',
      answer: 'Energi tidak dapat diciptakan atau dimusnahkan. Contoh: PLTS mengubah energi foton cahaya menjadi listrik; PLTA mengubah energi potensial air menjadi mekanik lalu listrik.',
      points: '20'
    }
  ];

  // Official worksheet table with 6 representative examples followed by blank rows
  const officialTableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        makeHeaderCell('NO', 5),
        makeHeaderCell('TIPE SOAL', 14),
        makeHeaderCell('TEKS SOAL / PERTANYAAN\n(Bisa Teks, Arab, Rumus, & Gambar)', 33),
        makeHeaderCell('OPSI / PILIHAN A - E', 26),
        makeHeaderCell('KUNCI JAWABAN', 14),
        makeHeaderCell('POIN', 8)
      ]
    })
  ];

  // 6 representative editable examples (one for each type)
  const officialExamples = [
    {
      no: '1',
      type: 'PG',
      question: 'Hasil dari perhitungan matematika 25 × 14 - 150 adalah ...',
      options: 'A. 150\nB. 200\nC. 250\nD. 300\nE. 350',
      answer: 'B',
      points: '10'
    },
    {
      no: '2',
      type: 'PG_KOMPLEKS',
      question: 'Pernyataan mana sajakah yang BENAR mengenai proses fotosintesis tumbuhan? (Pilihan Ganda Kompleks)',
      options: 'A. Memerlukan energi cahaya matahari\nB. Menghasilkan gas oksigen (O2)\nC. Berlangsung saat malam gelap gulita\nD. Memerlukan karbondioksida (CO2) dan air\nE. Menghasilkan gas karbon monoksida',
      answer: 'A, B, D',
      points: '15'
    },
    {
      no: '3',
      type: 'BENAR_SALAH',
      question: 'Paus dan lumba-lumba merupakan mamalia laut yang bernapas menggunakan paru-paru.',
      options: 'A. Benar\nB. Salah',
      answer: 'BENAR',
      points: '10'
    },
    {
      no: '4',
      type: 'MENJODOHKAN',
      question: 'Jodohkan alat ukur berikut dengan fungsinya yang tepat:\n1. Barometer\n2. Anemometer\n3. Higrometer',
      options: 'A. Kelembaban udara\nB. Tekanan udara\nC. Kecepatan angin',
      answer: '1-B; 2-C; 3-A',
      points: '15'
    },
    {
      no: '5',
      type: 'ISIAN_SINGKAT',
      question: 'Ibu kota negara Jepang yang merupakan pusat pemerintahan adalah ...',
      options: '- (Jawaban isian singkat tidak memerlukan opsi)',
      answer: 'Tokyo',
      points: '10'
    },
    {
      no: '6',
      type: 'ESAI',
      question: 'Jelaskan perbedaan mendasar antara peredaran darah besar (sirkulasi sistemik) dan peredaran darah kecil (sirkulasi pulmonal) pada manusia!',
      options: '- (Jawaban esai/uraian dikoreksi manual oleh guru)',
      answer: 'Sirkulasi sistemik mengalirkan darah dari jantung ke seluruh tubuh dan kembali ke jantung, sedangkan sirkulasi pulmonal mengalirkan darah dari jantung ke paru-paru dan kembali ke jantung.',
      points: '20'
    }
  ];

  officialExamples.forEach((r, idx) => {
    const isZebra = idx % 2 === 1;
    officialTableRows.push(
      new TableRow({
        children: [
          makeCell(r.no, 5, { align: AlignmentType.CENTER, zebra: isZebra, bold: true }),
          makeCell(r.type, 14, { zebra: isZebra, bold: true, color: '0052CC' }),
          makeCell(r.question, 33, { zebra: isZebra }),
          makeCell(r.options, 26, { zebra: isZebra }),
          makeCell(r.answer, 14, { zebra: isZebra, bold: true, align: AlignmentType.CENTER, color: '137333' }),
          makeCell(r.points, 8, { zebra: isZebra, align: AlignmentType.CENTER })
        ]
      })
    );
  });

  // Ready-to-fill rows for the teacher
  for (let i = 7; i <= 20; i++) {
    const isZebra = i % 2 === 0;
    officialTableRows.push(
      new TableRow({
        children: [
          makeCell(String(i), 5, { align: AlignmentType.CENTER, zebra: isZebra, bold: true }),
          makeCell('PG', 14, { zebra: isZebra, bold: true }),
          makeCell('', 33, { zebra: isZebra }),
          makeCell('A. \nB. \nC. \nD. \nE. ', 26, { zebra: isZebra }),
          makeCell('', 14, { zebra: isZebra, align: AlignmentType.CENTER, bold: true }),
          makeCell('10', 8, { zebra: isZebra, align: AlignmentType.CENTER })
        ]
      })
    );
  }

  // Build the complete docx document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header / Kop Sekolah
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: schoolName.toUpperCase(),
                bold: true,
                size: 26,
                color: '1A1C1E'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'SISTEM UJIAN SEKOLAH BERBASIS KOMPUTER (CBT LMS)',
                bold: true,
                size: 22,
                color: '0052CC'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `TEMPLATE RESMI IMPORT BANK SOAL WORD (.DOCX) • ${curriculum.toUpperCase()} • T.A. ${schoolYear}`,
                size: 19,
                bold: true,
                color: '495057'
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '_________________________________________________________________________________',
                color: '0052CC'
              })
            ]
          }),

          new Paragraph({ text: '' }),

          // Section A: Panduan Fitur & Dukungan Soal
          new Paragraph({
            children: [
              new TextRun({
                text: 'A. PANDUAN PENULISAN SOAL (GAMBAR, HURUF ARAB, RUMUS, & TIPE SOAL)',
                bold: true,
                size: 22,
                color: '0052CC'
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Sistem CBT secara cerdas mengekstrak soal dari file Microsoft Word (.docx). Berikut panduan lengkapnya:',
                size: 20
              })
            ]
          }),

          // 1. Gambar
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: '1. Soal Bergambar (Diagram, Grafik, Peta, Struktur Sel): ', bold: true, color: '1A1C1E' }),
              new TextRun({
                text: 'Bapak/Ibu guru dapat LANGSUNG MENEMPEL (Paste) atau MENYISIPKAN GAMBAR (Insert > Pictures) langsung ke dalam sel naskah soal Word atau di atas pertanyaan. Sistem otomatis mengekstrak gambar base64 ke dalam aplikasi ujian siswa.'
              })
            ]
          }),

          // 2. Huruf Arab
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: '2. Huruf Arab & Ayat Al-Qur\'an (PAI / Bahasa Arab): ', bold: true, color: '1A1C1E' }),
              new TextRun({
                text: 'Teks bahasa Arab dan ayat suci Al-Qur\'an lengkap dengan harakat/tanda baca dapat dituliskan atau disalin langsung. Sistem mendukung format Unicode UTF-8 Arab penuh dengan tampilan yang rapi di layar ujian siswa.'
              })
            ]
          }),

          // 3. Rumus Matematika & Sains
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: '3. Rumus Matematika & Sains: ', bold: true, color: '1A1C1E' }),
              new TextRun({
                text: 'Mendukung penulisan pangkat (x², y³), indeks/subskrip (x₁, H₂O), lambang akar (√x), pecahan (a/b), lambang integral (∫), limit, reaksi kimia (MnO₄⁻), dan simbol Yunani (α, β, π, θ). Anda juga dapat menyisipkan tangkapan layar rumus yang rumit sebagai gambar.'
              })
            ]
          }),

          // 4. Ragam 6 Tipe Soal
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: '4. Ragam 6 Tipe Soal: ', bold: true, color: '1A1C1E' }),
              new TextRun({
                text: 'Mendukung Pilihan Ganda (PG), PG Kompleks (banyak jawaban benar), Benar/Salah, Menjodohkan (format "1-B; 2-C; 3-A"), Isian Singkat, dan Uraian/Esai.'
              })
            ]
          }),

          new Paragraph({ text: '' }),

          // Section B: Lembar Kerja Tabel Naskah Soal Resmi
          new Paragraph({
            children: [
              new TextRun({
                text: 'B. TABEL NASKAH SOAL UJIAN (LEMBAR KERJA SIAP DIISI OLEH GURU)',
                bold: true,
                size: 22,
                color: '0052CC'
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Bapak/Ibu guru silakan langsung mengetikkan atau menempelkan soal Anda pada tabel di bawah ini. Nomor 1-6 memuat contoh format untuk masing-masing tipe soal (dapat diubah/diganti). Nomor 7-20 siap untuk diisi naskah soal berikutnya. Setelah selesai, simpan file (.docx) dan unggah ke aplikasi CBT.',
                size: 19,
                color: '495057'
              })
            ]
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: officialTableRows
          }),

          new Paragraph({ text: '' }),

          // Section C: Format Alternatif Paragraf Bebas
          new Paragraph({
            children: [
              new TextRun({
                text: 'C. ALTERNATIF: FORMAT PENOMORAN TEKS BIASA (TANPA TABEL)',
                bold: true,
                size: 22,
                color: '0052CC'
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Selain menggunakan format tabel resmi di atas, sistem juga dapat membaca naskah soal bernomor biasa seperti contoh berikut:',
                size: 19,
                color: '495057'
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '1. Perhatikan kutipan ayat berikut: ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ\nArti dari lafadz yang bergaris bawah adalah ...\nA. Petunjuk bagi orang yang bertakwa\nB. Peringatan bagi orang yang ingkar\nC. Berita gembira bagi kaum beriman\nD. Cahaya keselamatan\nE. Rahmat bagi semesta alam\nKunci: A\nBobot: 10\n\n2. Diketahui fungsi f(x) = 2x² - 8x + 6 = 0. Akar-akar penyelesaian persamaan tersebut adalah ...\nA. x₁ = 3 dan x₂ = 1\nB. x₁ = -3 dan x₂ = -1\nC. x₁ = 2 dan x₂ = 4\nD. x₁ = 1/2 dan x₂ = 3\nE. x₁ = -1 dan x₂ = 3\nKunci: A\nBobot: 10',
                size: 18,
                color: '1A1C1E',
                italics: true
              })
            ]
          }),

          new Paragraph({ text: '' }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `Dibuat otomatis oleh Sistem CBT LMS • Dokumen Template Resmi • ${new Date().toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}`,
                size: 16,
                italics: true,
                color: '6C757D'
              })
            ]
          })
        ]
      }
    ]
  });

  // Pack and trigger download
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Template_Soal_CBT_${settings?.CURRICULUM === 'K13' ? 'K13' : 'Kurikulum_Merdeka'}_${new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ExamDocxExportOptions {
  packageInfo: { TITLE?: string };
  questions: any[];
  settings?: SchoolSettings;
  subjectName?: string;
  className?: string;
  assessmentTypeName?: string;
  academicYear?: string;
  academicSemester?: string;
  allocatedTime?: number;
  examDate?: string;
  docCode?: string;
  institutionType?: 'KEMENAG' | 'DINAS' | 'YAYASAN';
  showKop?: boolean;
  showInstructions?: boolean;
  showSignatures?: boolean;
  groupByType?: boolean;
  keyMode?: 'none' | 'inline' | 'separate';
  paperSize?: 'A4' | 'F4';
  principalTitle?: string;
  principalName?: string;
  principalNip?: string;
  teacherName?: string;
  teacherNip?: string;
  cityLocation?: string;
  includeAnswerSheet?: boolean;
}

function cleanHtmlText(html: any = ''): string {
  if (!html) return '';
  const str = typeof html === 'string' ? html : String(html || '');
  return str
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Generates an authentic Microsoft Word (.docx) document for the complete exam paper.
 * Produces real native Word tables, proper paragraph formatting, exact page sizes, and zero styling glitches.
 */
export async function downloadExamPaperDocx(opts: ExamDocxExportOptions) {
  const isF4 = opts.paperSize === 'F4';
  const fontName = 'Times New Roman';
  const mainFontSize = 21; // ~10.5pt
  const subFontSize = 19; // ~9.5pt

  const borderThin = {
    top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 1, color: '000000' }
  };

  const borderNone = {
    top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    right: { style: BorderStyle.NONE, size: 0, color: 'auto' }
  };

  const children: (Paragraph | Table)[] = [];

  // 1. KOP SURAT
  if (opts.showKop !== false) {
    const orgTitle =
      opts.institutionType === 'KEMENAG'
        ? 'KEMENTERIAN AGAMA REPUBLIK INDONESIA'
        : opts.institutionType === 'DINAS'
        ? 'PEMERINTAH DAERAH PROVINSI / KABUPATEN / KOTA'
        : 'YAYASAN PENDIDIKAN DAN SOSIAL';

    const subOrgTitle =
      opts.institutionType === 'KEMENAG'
        ? 'KANTOR KEMENTERIAN AGAMA KABUPATEN / KOTA'
        : 'DINAS PENDIDIKAN DAN KEBUDAYAAN';

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [new TextRun({ text: orgTitle, bold: true, size: 19, font: fontName })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [new TextRun({ text: subOrgTitle, bold: true, size: 19, font: fontName })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: (opts.settings?.SCHOOL_NAME || 'MADRASAH ALIYAH / SEKOLAH INDONESIA').toUpperCase(),
            bold: true,
            size: 26, // 13pt
            font: fontName
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: `${opts.settings?.ADDRESS || 'Jl. Pendidikan No. 01'} • NSM/NPSN: ${opts.settings?.NPSN || '12345678'} • Telp: ${opts.settings?.PHONE || '(021) 123456'}`,
            size: 17,
            font: fontName,
            color: '333333'
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        border: {
          bottom: { style: BorderStyle.DOUBLE, size: 12, color: '000000', space: 6 }
        },
        children: [
          new TextRun({
            text: `Website: ${opts.settings?.WEBSITE || 'www.sekolah.sch.id'} • Email: ${opts.settings?.EMAIL || 'info@sekolah.sch.id'}`,
            size: 16,
            font: fontName,
            color: '444444'
          })
        ]
      })
    );
  }

  // 2. JUDUL NASKAH SOAL
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 30 },
      children: [
        new TextRun({
          text: `NASKAH SOAL ${opts.assessmentTypeName ? opts.assessmentTypeName.toUpperCase() : 'PENILAIAN AKHIR SEMESTER'}`,
          bold: true,
          size: 24,
          font: fontName,
          underline: {}
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: `TAHUN PELAJARAN ${opts.academicYear || '2026/2027'} — SEMESTER ${formatDocumentSemester(opts.academicSemester)}`,
          bold: true,
          size: 20,
          font: fontName
        })
      ]
    })
  );

  // 3. TABEL METADATA UJIAN (MATA PELAJARAN, KELAS, WAKTU, DLL)
  const metaRows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: borderThin,
          shading: { type: ShadingType.CLEAR, fill: 'F4F5F7', color: 'auto' },
          children: [new Paragraph({ children: [new TextRun({ text: 'Mata Pelajaran', bold: true, size: subFontSize, font: fontName })] })]
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          borders: borderThin,
          children: [new Paragraph({ children: [new TextRun({ text: opts.subjectName || '-', size: subFontSize, font: fontName })] })]
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          borders: borderThin,
          shading: { type: ShadingType.CLEAR, fill: 'F4F5F7', color: 'auto' },
          children: [new Paragraph({ children: [new TextRun({ text: 'Hari / Tanggal', bold: true, size: subFontSize, font: fontName })] })]
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: borderThin,
          children: [new Paragraph({ children: [new TextRun({ text: opts.examDate || '-', size: subFontSize, font: fontName })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: borderThin,
          shading: { type: ShadingType.CLEAR, fill: 'F4F5F7', color: 'auto' },
          children: [new Paragraph({ children: [new TextRun({ text: 'Kelas / Fase', bold: true, size: subFontSize, font: fontName })] })]
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          borders: borderThin,
          children: [new Paragraph({ children: [new TextRun({ text: opts.className || '-', size: subFontSize, font: fontName })] })]
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          borders: borderThin,
          shading: { type: ShadingType.CLEAR, fill: 'F4F5F7', color: 'auto' },
          children: [new Paragraph({ children: [new TextRun({ text: 'Alokasi Waktu', bold: true, size: subFontSize, font: fontName })] })]
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: borderThin,
          children: [new Paragraph({ children: [new TextRun({ text: `${opts.allocatedTime || 90} Menit`, size: subFontSize, font: fontName })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: borderThin,
          shading: { type: ShadingType.CLEAR, fill: 'F4F5F7', color: 'auto' },
          children: [new Paragraph({ children: [new TextRun({ text: 'Bentuk Soal', bold: true, size: subFontSize, font: fontName })] })]
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          borders: borderThin,
          children: [new Paragraph({ children: [new TextRun({ text: `Total: ${(opts.questions || []).length} Butir Soal`, size: subFontSize, font: fontName })] })]
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          borders: borderThin,
          shading: { type: ShadingType.CLEAR, fill: 'F4F5F7', color: 'auto' },
          children: [new Paragraph({ children: [new TextRun({ text: 'Kode Dokumen', bold: true, size: subFontSize, font: fontName })] })]
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: borderThin,
          children: [new Paragraph({ children: [new TextRun({ text: opts.docCode || 'NS-01', size: subFontSize, font: fontName })] })]
        })
      ]
    })
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: metaRows
    }),
    new Paragraph({ spacing: { after: 120 }, text: '' })
  );

  // 4. PETUNJUK UMUM
  if (opts.showInstructions !== false) {
    const instParagraphs = [
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: 'PETUNJUK UMUM:', bold: true, size: 18, font: fontName })]
      }),
      new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({ text: '1. Berdoalah sebelum mulai mengerjakan soal ujian.', size: 17, font: fontName })]
      }),
      new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({ text: '2. Tuliskan identitas Anda pada lembar jawaban yang telah disediakan.', size: 17, font: fontName })]
      }),
      new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({ text: '3. Periksa dan bacalah setiap butir soal dengan teliti sebelum menjawabnya.', size: 17, font: fontName })]
      }),
      new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({ text: '4. Dahulukan menjawab butir-butir soal yang Anda anggap paling mudah.', size: 17, font: fontName })]
      }),
      new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({ text: '5. Laporkan kepada pengawas jika terdapat tulisan yang rusak, buram, atau kurang jelas.', size: 17, font: fontName })]
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: '6. Periksa kembali seluruh hasil jawaban Anda sebelum diserahkan kepada pengawas.', size: 17, font: fontName })]
      })
    ];

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: borderThin,
                shading: { type: ShadingType.CLEAR, fill: 'FAFAFA', color: 'auto' },
                children: instParagraphs
              })
            ]
          })
        ]
      }),
      new Paragraph({ spacing: { after: 140 }, text: '' })
    );
  }

  // 5. SECTIONS & BUTIR-BUTIR SOAL
  const allQuestions = (opts.questions || []).map((q, idx) => ({
    ...q,
    originalIndex: idx + 1
  }));

  const SECTION_CONFIGS = [
    { code: 'MCQ', roman: 'I', title: 'PILIHAN GANDA', instruction: 'Pilihlah salah satu jawaban yang paling tepat dengan memberi tanda silang (X) pada huruf A, B, C, D, atau E di lembar jawaban!' },
    { code: 'COMPLEX_MCQ', roman: 'II', title: 'PILIHAN GANDA KOMPLEKS', instruction: 'Pilihlah seluruh jawaban yang benar dengan memberi tanda centang (✓) pada kotak huruf pilihan yang disediakan (bisa lebih dari satu jawaban)!' },
    { code: 'MATCHING', roman: 'III', title: 'MENJODOHKAN', instruction: 'Pasangkanlah setiap pernyataan/premis di Kolom A dengan pilihan respon/pasangan yang tepat di Kolom B!' },
    { code: 'TRUE_FALSE', roman: 'IV', title: 'BENAR ATAU SALAH', instruction: 'Nyatakan apakah setiap pernyataan di bawah ini bernilai Benar (B) atau Salah (S)!' },
    { code: 'SHORT_ANSWER', roman: 'V', title: 'ISIAN SINGKAT', instruction: 'Jawablah pertanyaan berikut dengan singkat, tepat, dan jelas pada lembar jawaban!' },
    { code: 'ESSAY', roman: 'VI', title: 'URAIAN / ESAI', instruction: 'Jawablah pertanyaan-pertanyaan berikut dengan uraian lengkap, terstruktur, dan jelas!' }
  ];

  const sections = opts.groupByType !== false
    ? SECTION_CONFIGS.map(cfg => {
        const items = allQuestions.filter(q => {
          if (cfg.code === 'MCQ') return q.TYPE === 'MCQ' || !q.TYPE;
          return q.TYPE === cfg.code;
        });
        return { ...cfg, items };
      }).filter(s => s.items.length > 0)
    : [{ code: 'ALL', roman: '', title: 'DAFTAR BUTIR SOAL UJIAN', instruction: 'Kerjakan soal-soal di bawah ini dengan tertib dan teliti!', items: allQuestions }];

  sections.forEach((section, sIdx) => {
    // Section Header
    if (opts.groupByType !== false) {
      children.push(
        new Paragraph({
          spacing: { before: sIdx === 0 ? 40 : 160, after: 30 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 3 } },
          children: [
            new TextRun({
              text: `BAGIAN ${section.roman}. ${section.title} (${section.items.length} Soal)`,
              bold: true,
              size: 20,
              font: fontName
            })
          ]
        }),
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: section.instruction,
              italics: true,
              size: 17,
              font: fontName,
              color: '333333'
            })
          ]
        })
      );
    }

    // Question Items
    section.items.forEach(q => {
      const qNum = q.originalIndex;
      const qCleanText = cleanHtmlText(q.QUESTION || '');

      // Question text paragraph
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [
            new TextRun({ text: `${qNum}.  `, bold: true, size: mainFontSize, font: fontName }),
            new TextRun({ text: qCleanText, size: mainFontSize, font: fontName })
          ]
        })
      );

      // Type-specific answers rendering:
      // A. MCQ & COMPLEX_MCQ
      if (q.TYPE === 'MCQ' || q.TYPE === 'COMPLEX_MCQ' || !q.TYPE) {
        ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
          const optKey = `OPTION_${opt}`;
          const optText = cleanHtmlText(q[optKey]);
          if (!optText) return;

          const isCorrect = String(q.ANSWER || '')
            .split(/[,;\s]+/)
            .map(s => s.trim().toUpperCase())
            .includes(opt);

          const runs: TextRun[] = [
            new TextRun({ text: `      ${opt}.  `, bold: true, size: subFontSize, font: fontName }),
            new TextRun({ text: optText, size: subFontSize, font: fontName })
          ];

          if (opts.keyMode === 'inline' && isCorrect) {
            runs.push(
              new TextRun({
                text: '   [KUNCI JAWABAN]',
                bold: true,
                size: 16,
                font: fontName,
                color: '0052CC'
              })
            );
          }

          children.push(
            new Paragraph({
              spacing: { after: 25 },
              children: runs
            })
          );
        });
      }

      // B. MATCHING (MENJODOHKAN)
      else if (q.TYPE === 'MATCHING') {
        const details = parseMatchingDetails(q.QUESTION || '', q, q.EXTRA_DATA, q.ANSWER);
        const maxRows = Math.max(details.leftItems.length, details.rightItems.length);

        const tableRows: TableRow[] = [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: borderThin,
                shading: { type: ShadingType.CLEAR, fill: 'EAECEF', color: 'auto' },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kolom A (Pernyataan / Premis)', bold: true, size: subFontSize, font: fontName })] })]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: borderThin,
                shading: { type: ShadingType.CLEAR, fill: 'EAECEF', color: 'auto' },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kolom B (Pilihan Respon / Pasangan)', bold: true, size: subFontSize, font: fontName })] })]
              })
            ]
          })
        ];

        for (let rIdx = 0; rIdx < maxRows; rIdx++) {
          const left = details.leftItems[rIdx];
          const right = details.rightItems[rIdx];

          tableRows.push(
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: borderThin,
                  shading: { type: ShadingType.CLEAR, fill: 'FFFFFF', color: 'auto' },
                  children: [
                    new Paragraph({
                      spacing: { after: 20 },
                      children: left
                        ? [new TextRun({ text: `${left.label}. `, bold: true, size: subFontSize, font: fontName }), new TextRun({ text: cleanHtmlText(left.text), size: subFontSize, font: fontName })]
                        : [new TextRun({ text: '-', size: subFontSize, font: fontName })]
                    })
                  ]
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: borderThin,
                  shading: { type: ShadingType.CLEAR, fill: 'FFFFFF', color: 'auto' },
                  children: [
                    new Paragraph({
                      spacing: { after: 20 },
                      children: right
                        ? [new TextRun({ text: `${right.label}. `, bold: true, size: subFontSize, font: fontName }), new TextRun({ text: cleanHtmlText(right.text), size: subFontSize, font: fontName })]
                        : [new TextRun({ text: '-', size: subFontSize, font: fontName })]
                    })
                  ]
                })
              ]
            })
          );
        }

        children.push(
          new Table({
            width: { size: 95, type: WidthType.PERCENTAGE },
            rows: tableRows
          }),
          new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [
              new TextRun({ text: '      Pasangan Jawaban:  ', bold: true, size: subFontSize, font: fontName }),
              new TextRun({
                text: details.leftItems.map(l => `${l.label} - [   ]`).join('     '),
                font: fontName,
                size: subFontSize
              }),
              ...(opts.keyMode === 'inline' && q.ANSWER
                ? [new TextRun({ text: `    (Kunci: ${q.ANSWER})`, bold: true, color: '0052CC', size: 16, font: fontName })]
                : [])
            ]
          })
        );
      }

      // C. TRUE / FALSE
      else if (q.TYPE === 'TRUE_FALSE') {
        const isBenar = String(q.ANSWER || '').toUpperCase().includes('BENAR');
        children.push(
          new Paragraph({
            spacing: { after: 30 },
            children: [
              new TextRun({ text: '      (   ) BENAR (B)          (   ) SALAH (S)', bold: true, size: subFontSize, font: fontName }),
              ...(opts.keyMode === 'inline'
                ? [new TextRun({ text: `     [Kunci: ${isBenar ? 'BENAR' : 'SALAH'}]`, bold: true, color: '0052CC', size: 16, font: fontName })]
                : [])
            ]
          })
        );
      }

      // D. SHORT ANSWER (ISIAN SINGKAT)
      else if (q.TYPE === 'SHORT_ANSWER') {
        children.push(
          new Paragraph({
            spacing: { after: 30 },
            children: [
              new TextRun({ text: '      Jawaban: ........................................................................................................................', size: subFontSize, font: fontName }),
              ...(opts.keyMode === 'inline' && q.ANSWER
                ? [new TextRun({ text: `\n      [Kunci Isian: ${q.ANSWER}]`, bold: true, color: '0052CC', size: 16, font: fontName })]
                : [])
            ]
          })
        );
      }

      // E. ESSAY (URAIAN)
      else if (q.TYPE === 'ESSAY') {
        children.push(
          new Table({
            width: { size: 95, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: borderThin,
                    shading: { type: ShadingType.CLEAR, fill: 'FFFFFF', color: 'auto' },
                    children: [
                      new Paragraph({
                        spacing: { after: 400 }, // Generous blank space for writing answer
                        children: [
                          new TextRun({
                            text: '(Ruang Jawaban Uraian / Catatan Perhitungan Siswa)',
                            italics: true,
                            size: 16,
                            font: fontName,
                            color: '888888'
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        );

        if (opts.keyMode === 'inline' && q.ANSWER) {
          children.push(
            new Paragraph({
              spacing: { before: 20, after: 40 },
              children: [
                new TextRun({ text: `      [Rubrik Penskoran / Kunci Uraian: ${q.ANSWER}]`, bold: true, color: '0052CC', size: 16, font: fontName })
              ]
            })
          );
        }
      }
    });
  });

  // 6. TITIK MANGSA & TANDA TANGAN RESMI
  if (opts.showSignatures !== false) {
    const signatureTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: borderNone,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Mengetahui,', size: subFontSize, font: fontName })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: opts.principalTitle || opts.settings?.PRINCIPAL_TITLE || 'Kepala Madrasah', bold: true, size: subFontSize, font: fontName })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, text: '' }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: opts.principalName || opts.settings?.PRINCIPAL_NAME || 'Ai Sukaesih, S.Pd', bold: true, underline: {}, size: subFontSize, font: fontName })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (opts.principalNip || opts.settings?.PRINCIPAL_NIP || '1281201').startsWith('NBM') || (opts.principalNip || opts.settings?.PRINCIPAL_NIP || '1281201').startsWith('NIP') ? (opts.principalNip || opts.settings?.PRINCIPAL_NIP || '1281201') : `NBM. ${opts.principalNip || opts.settings?.PRINCIPAL_NIP || '1281201'}`, size: 17, font: fontName })] })
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: borderNone,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${opts.cityLocation || 'Sumedang'}, ${opts.examDate || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, size: subFontSize, font: fontName })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Guru Pengampu Mata Pelajaran', bold: true, size: subFontSize, font: fontName })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, text: '' }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: opts.teacherName || 'Ipid Abdul Hapid, S.Pd.', bold: true, underline: {}, size: subFontSize, font: fontName })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `NIP. ${opts.teacherNip || '19820412 200801 2 015'}`, size: 17, font: fontName })] })
              ]
            })
          ]
        })
      ]
    });

    children.push(
      new Paragraph({ spacing: { before: 160 }, text: '' }),
      signatureTable
    );
  }

  // 7. KUNCI JAWABAN TERPISAH (SEPARATE KEY)
  if (opts.keyMode === 'separate') {
    children.push(
      new Paragraph({
        children: [new PageBreak()]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text: 'KUNCI JAWABAN & PEDOMAN PENSKORAN RESMI',
            bold: true,
            size: 24,
            font: fontName,
            underline: {}
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: `Mata Pelajaran: ${opts.subjectName || '-'} | Kelas: ${opts.className || '-'} | Tahun: ${opts.academicYear || '2026/2027'}`,
            bold: true,
            size: 19,
            font: fontName
          })
        ]
      })
    );

    const keyTableRows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, borders: borderThin, shading: { type: ShadingType.CLEAR, fill: 'DCE6F1', color: 'auto' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, size: 18, font: fontName })] })] }),
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: borderThin, shading: { type: ShadingType.CLEAR, fill: 'DCE6F1', color: 'auto' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tipe Soal', bold: true, size: 18, font: fontName })] })] }),
          new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, borders: borderThin, shading: { type: ShadingType.CLEAR, fill: 'DCE6F1', color: 'auto' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kunci Jawaban / Pembahasan', bold: true, size: 18, font: fontName })] })] }),
          new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, borders: borderThin, shading: { type: ShadingType.CLEAR, fill: 'DCE6F1', color: 'auto' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Bobot Poin', bold: true, size: 18, font: fontName })] })] })
        ]
      })
    ];

    allQuestions.forEach((q, idx) => {
      keyTableRows.push(
        new TableRow({
          children: [
            new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, borders: borderThin, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), size: 18, font: fontName })] })] }),
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: borderThin, children: [new Paragraph({ children: [new TextRun({ text: q.TYPE || 'MCQ', size: 18, font: fontName })] })] }),
            new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, borders: borderThin, children: [new Paragraph({ children: [new TextRun({ text: String(q.ANSWER || '-'), bold: true, size: 18, font: fontName })] })] }),
            new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, borders: borderThin, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(q.POINTS || 10), size: 18, font: fontName })] })] })
          ]
        })
      );
    });

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: keyTableRows
      })
    );
  }

  // CREATE DOCUMENT
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              // F4: 21.5cm x 33cm; A4: 21cm x 29.7cm (1 inch = 1440 dxa)
              width: isF4 ? 12189 : 11906,
              height: isF4 ? 18709 : 16838
            },
            margin: {
              top: 1134, // ~2cm
              bottom: 1134,
              left: 1134,
              right: 1134
            }
          }
        },
        children
      }
    ]
  });

  // Pack to binary blob and trigger download
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `Naskah_Soal_${(opts.subjectName || 'Mapel').replace(/\s+/g, '_')}_${(opts.className || 'Kelas').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a clean, HTML-based Word (.doc) document
 * with bulletproof table layout and zero Tailwind or CSS-variable issues.
 */
export function downloadExamPaperDoc(opts: ExamDocxExportOptions) {
  const isF4 = opts.paperSize === 'F4';
  const allQuestions = (opts.questions || []).map((q, idx) => ({
    ...q,
    originalIndex: idx + 1
  }));

  const SECTION_CONFIGS = [
    { code: 'MCQ', roman: 'I', title: 'PILIHAN GANDA', instruction: 'Pilihlah salah satu jawaban yang paling tepat dengan memberi tanda silang (X) pada huruf A, B, C, D, atau E di lembar jawaban!' },
    { code: 'COMPLEX_MCQ', roman: 'II', title: 'PILIHAN GANDA KOMPLEKS', instruction: 'Pilihlah seluruh jawaban yang benar dengan memberi tanda centang (✓) pada kotak huruf pilihan yang disediakan!' },
    { code: 'MATCHING', roman: 'III', title: 'MENJODOHKAN', instruction: 'Pasangkanlah setiap pernyataan/premis di Kolom A dengan pilihan respon/pasangan yang tepat di Kolom B!' },
    { code: 'TRUE_FALSE', roman: 'IV', title: 'BENAR ATAU SALAH', instruction: 'Nyatakan apakah setiap pernyataan di bawah ini bernilai Benar (B) atau Salah (S)!' },
    { code: 'SHORT_ANSWER', roman: 'V', title: 'ISIAN SINGKAT', instruction: 'Jawablah pertanyaan berikut dengan singkat, tepat, dan jelas pada lembar jawaban!' },
    { code: 'ESSAY', roman: 'VI', title: 'URAIAN / ESAI', instruction: 'Jawablah pertanyaan-pertanyaan berikut dengan uraian lengkap dan jelas!' }
  ];

  const sections = opts.groupByType !== false
    ? SECTION_CONFIGS.map(cfg => {
        const items = allQuestions.filter(q => {
          if (cfg.code === 'MCQ') return q.TYPE === 'MCQ' || !q.TYPE;
          return q.TYPE === cfg.code;
        });
        return { ...cfg, items };
      }).filter(s => s.items.length > 0)
    : [{ code: 'ALL', roman: '', title: 'DAFTAR BUTIR SOAL UJIAN', instruction: 'Kerjakan soal-soal di bawah ini dengan tertib dan teliti!', items: allQuestions }];

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${opts.packageInfo.TITLE || 'Naskah Soal Ujian'}</title>
      <style>
        @page {
          size: ${isF4 ? '21.5cm 33.0cm' : '21.0cm 29.7cm'};
          margin: 1.5cm 1.5cm 1.5cm 1.5cm;
        }
        body {
          font-family: 'Times New Roman', serif;
          font-size: 11pt;
          line-height: 1.35;
          color: #000000;
          background-color: #ffffff;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          background-color: #ffffff;
          color: #000000;
        }
        th, td {
          padding: 4px 6px;
          color: #000000;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .border-box { border: 1px solid #000000; }
        .border-none { border: none !important; }
        .page-break { page-break-before: always; }
      </style>
    </head>
    <body style="background-color: #ffffff; color: #000000;">
      <!-- KOP SURAT -->
      ${opts.showKop !== false ? `
      <table class="border-none" style="margin-bottom: 8px; border: none;">
        <tr>
          <td class="text-center" style="border: none; padding-bottom: 8px;">
            <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase;">
              ${opts.institutionType === 'KEMENAG' ? 'KEMENTERIAN AGAMA REPUBLIK INDONESIA' : 'DINAS PENDIDIKAN DAN KEBUDAYAAN'}
            </div>
            <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase;">
              ${opts.settings?.SCHOOL_NAME || 'MADRASAH ALIYAH / SEKOLAH INDONESIA'}
            </div>
            <div style="font-size: 8.5pt; color: #333333;">
              ${opts.settings?.ADDRESS || 'Jl. Pendidikan No. 01'} • NSM/NPSN: ${opts.settings?.NPSN || '12345678'} • Telp: ${opts.settings?.PHONE || '(021) 123456'}
            </div>
            <div style="font-size: 8pt; color: #444444;">
              Website: ${opts.settings?.WEBSITE || 'www.sekolah.sch.id'} • Email: ${opts.settings?.EMAIL || 'info@sekolah.sch.id'}
            </div>
          </td>
        </tr>
      </table>
      <div style="border-top: 3px double #000000; margin-bottom: 12px;"></div>
      ` : ''}

      <!-- JUDUL NASKAH -->
      <div class="text-center" style="margin-bottom: 14px;">
        <div style="font-size: 12.5pt; font-weight: bold; text-decoration: underline; text-transform: uppercase;">
          NASKAH SOAL ${opts.assessmentTypeName ? opts.assessmentTypeName.toUpperCase() : 'PENILAIAN AKHIR SEMESTER'}
        </div>
        <div style="font-size: 10.5pt; font-weight: bold; margin-top: 2px;">
          TAHUN PELAJARAN ${opts.academicYear || '2026/2027'} — SEMESTER ${formatDocumentSemester(opts.academicSemester)}
        </div>
      </div>

      <!-- METADATA TABLE -->
      <table style="border: 1px solid #000000; margin-bottom: 14px; font-size: 10pt;">
        <tr>
          <td style="width: 25%; font-weight: bold; border: 1px solid #000000; background-color: #f4f5f7;">Mata Pelajaran</td>
          <td style="width: 30%; border: 1px solid #000000;">: ${opts.subjectName || '-'}</td>
          <td style="width: 20%; font-weight: bold; border: 1px solid #000000; background-color: #f4f5f7;">Hari / Tanggal</td>
          <td style="width: 25%; border: 1px solid #000000;">: ${opts.examDate || '-'}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: 1px solid #000000; background-color: #f4f5f7;">Kelas / Fase</td>
          <td style="border: 1px solid #000000;">: ${opts.className || '-'}</td>
          <td style="font-weight: bold; border: 1px solid #000000; background-color: #f4f5f7;">Alokasi Waktu</td>
          <td style="border: 1px solid #000000;">: ${opts.allocatedTime || 90} Menit</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: 1px solid #000000; background-color: #f4f5f7;">Bentuk Soal</td>
          <td style="border: 1px solid #000000;">: Total ${(opts.questions || []).length} Butir Soal</td>
          <td style="font-weight: bold; border: 1px solid #000000; background-color: #f4f5f7;">Kode Dokumen</td>
          <td style="border: 1px solid #000000;">: ${opts.docCode || 'NS-01'}</td>
        </tr>
      </table>

      <!-- PETUNJUK UMUM -->
      ${opts.showInstructions !== false ? `
      <div style="border: 1px solid #000000; background-color: #fafafa; padding: 6px 10px; margin-bottom: 14px; font-size: 9.5pt;">
        <div style="font-weight: bold; margin-bottom: 3px;">PETUNJUK UMUM:</div>
        <div>1. Berdoalah sebelum mulai mengerjakan soal ujian.</div>
        <div>2. Tuliskan identitas Anda pada lembar jawaban yang telah disediakan.</div>
        <div>3. Periksa dan bacalah setiap butir soal dengan teliti sebelum menjawabnya.</div>
        <div>4. Dahulukan menjawab butir-butir soal yang Anda anggap paling mudah.</div>
        <div>5. Laporkan kepada pengawas jika terdapat tulisan yang kurang jelas, buram, atau rusak.</div>
        <div>6. Periksa kembali seluruh hasil jawaban Anda sebelum diserahkan kepada pengawas ujian.</div>
      </div>
      ` : ''}

      <!-- BUTIR SOAL -->
      ${sections.map(section => `
        ${opts.groupByType !== false ? `
        <div style="border-bottom: 2px solid #000000; padding-bottom: 2px; margin-top: 14px; margin-bottom: 6px;">
          <span style="font-weight: bold; font-size: 10.5pt; text-transform: uppercase;">
            BAGIAN ${section.roman}. ${section.title} (${section.items.length} Soal)
          </span>
        </div>
        <div style="font-size: 9.5pt; font-style: italic; color: #333333; margin-bottom: 10px;">
          ${section.instruction}
        </div>
        ` : ''}

        ${section.items.map(q => {
          const qClean = cleanHtmlText(q.QUESTION || '');
          let optionsHtml = '';

          if (q.TYPE === 'MCQ' || q.TYPE === 'COMPLEX_MCQ' || !q.TYPE) {
            optionsHtml = `
              <table style="width: 100%; border: none; margin-top: 3px; font-size: 10pt;">
                ${['A', 'B', 'C', 'D', 'E'].map(opt => {
                  const optText = cleanHtmlText(q[`OPTION_${opt}`]);
                  if (!optText) return '';
                  const isCorrect = String(q.ANSWER || '').split(/[,;\s]+/).map(s => s.trim().toUpperCase()).includes(opt);
                  return `
                    <tr>
                      <td style="width: 22px; vertical-align: top; font-weight: bold; border: none; padding: 2px 0;">${opt}.</td>
                      <td style="vertical-align: top; border: none; padding: 2px 0;">
                        ${optText}
                        ${opts.keyMode === 'inline' && isCorrect ? `<b style="color: #0052cc; margin-left: 8px;">[KUNCI]</b>` : ''}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </table>
            `;
          } else if (q.TYPE === 'MATCHING') {
            const details = parseMatchingDetails(q.QUESTION || '', q, q.EXTRA_DATA, q.ANSWER);
            const maxRows = Math.max(details.leftItems.length, details.rightItems.length);
            optionsHtml = `
              <table style="width: 100%; border: 1px solid #000000; border-collapse: collapse; margin-top: 6px; font-size: 9.5pt;">
                <tr style="background-color: #eaecef; font-weight: bold; text-align: center;">
                  <td style="width: 50%; border: 1px solid #000000; padding: 4px;">Kolom A (Pernyataan / Premis)</td>
                  <td style="width: 50%; border: 1px solid #000000; padding: 4px;">Kolom B (Pilihan Respon / Pasangan)</td>
                </tr>
                ${Array.from({ length: maxRows }).map((_, rIdx) => {
                  const left = details.leftItems[rIdx];
                  const right = details.rightItems[rIdx];
                  return `
                    <tr>
                      <td style="width: 50%; border: 1px solid #000000; padding: 4px; vertical-align: top;">
                        ${left ? `<b>${left.label}.</b> ${cleanHtmlText(left.text)}` : '-'}
                      </td>
                      <td style="width: 50%; border: 1px solid #000000; padding: 4px; vertical-align: top;">
                        ${right ? `<b>${right.label}.</b> ${cleanHtmlText(right.text)}` : '-'}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </table>
              <div style="margin-top: 6px; font-size: 9.5pt; font-weight: bold;">
                Pasangan Jawaban: ${details.leftItems.map(l => `${l.label} - [   ]`).join('&nbsp;&nbsp;&nbsp;&nbsp;')}
                ${opts.keyMode === 'inline' && q.ANSWER ? `<span style="color: #0052cc; margin-left: 12px;">(Kunci: ${q.ANSWER})</span>` : ''}
              </div>
            `;
          } else if (q.TYPE === 'TRUE_FALSE') {
            optionsHtml = `
              <div style="margin-top: 4px; font-size: 10pt; font-weight: bold;">
                ( &nbsp; ) BENAR (B) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ( &nbsp; ) SALAH (S)
                ${opts.keyMode === 'inline' ? `<span style="color: #0052cc; margin-left: 12px;">[Kunci: ${q.ANSWER}]</span>` : ''}
              </div>
            `;
          } else if (q.TYPE === 'SHORT_ANSWER') {
            optionsHtml = `
              <div style="margin-top: 4px; font-size: 10pt;">
                Jawaban: ....................................................................................................................................
                ${opts.keyMode === 'inline' && q.ANSWER ? `<div style="color: #0052cc; font-weight: bold; margin-top: 2px;">[Kunci Isian: ${q.ANSWER}]</div>` : ''}
              </div>
            `;
          } else if (q.TYPE === 'ESSAY') {
            optionsHtml = `
              <div style="border: 1px dashed #888888; height: 90px; margin-top: 6px; padding: 6px; font-size: 8.5pt; color: #888888;">
                (Ruang Jawaban Uraian Siswa)
              </div>
              ${opts.keyMode === 'inline' && q.ANSWER ? `<div style="color: #0052cc; font-weight: bold; margin-top: 4px; font-size: 9.5pt;">[Rubrik: ${q.ANSWER}]</div>` : ''}
            `;
          }

          return `
            <table style="width: 100%; border: none; margin-bottom: 8px; font-size: 10.5pt;">
              <tr>
                <td style="width: 24px; vertical-align: top; font-weight: bold; border: none; padding: 2px 0;">${q.originalIndex}.</td>
                <td style="vertical-align: top; border: none; padding: 2px 0;">
                  <div>${qClean}</div>
                  ${optionsHtml}
                </td>
              </tr>
            </table>
          `;
        }).join('')}
      `).join('')}

      <!-- TANDA TANGAN -->
      ${opts.showSignatures !== false ? `
      <table style="width: 100%; border: none; margin-top: 28px; font-size: 10pt;">
        <tr>
          <td style="width: 50%; text-align: center; border: none; vertical-align: top;">
            <div>Mengetahui,</div>
            <div style="font-weight: bold;">${opts.principalTitle || opts.settings?.PRINCIPAL_TITLE || 'Kepala Madrasah'}</div>
            <div style="height: 50px;"></div>
            <div style="font-weight: bold; text-decoration: underline;">${opts.principalName || opts.settings?.PRINCIPAL_NAME || 'Ai Sukaesih, S.Pd'}</div>
            <div>${(opts.principalNip || opts.settings?.PRINCIPAL_NIP || '1281201').startsWith('NBM') || (opts.principalNip || opts.settings?.PRINCIPAL_NIP || '1281201').startsWith('NIP') ? (opts.principalNip || opts.settings?.PRINCIPAL_NIP || '1281201') : `NBM. ${opts.principalNip || opts.settings?.PRINCIPAL_NIP || '1281201'}`}</div>
          </td>
          <td style="width: 50%; text-align: center; border: none; vertical-align: top;">
            <div>${opts.cityLocation || 'Sumedang'}, ${opts.examDate || '...................'}</div>
            <div style="font-weight: bold;">Guru Pengampu Mata Pelajaran</div>
            <div style="height: 50px;"></div>
            <div style="font-weight: bold; text-decoration: underline;">${opts.teacherName || 'Ipid Abdul Hapid, S.Pd.'}</div>
            <div>NIP. ${opts.teacherNip || '19820412 200801 2 015'}</div>
          </td>
        </tr>
      </table>
      ` : ''}

      <!-- KUNCI TERPISAH -->
      ${opts.keyMode === 'separate' ? `
      <div class="page-break"></div>
      <div class="text-center" style="margin-bottom: 14px;">
        <div style="font-size: 12.5pt; font-weight: bold; text-decoration: underline;">
          KUNCI JAWABAN & PEDOMAN PENSKORAN RESMI
        </div>
        <div style="font-size: 10pt; font-weight: bold; margin-top: 2px;">
          Mata Pelajaran: ${opts.subjectName || '-'} | Kelas: ${opts.className || '-'}
        </div>
      </div>
      <table style="border: 1px solid #000000; font-size: 9.5pt;">
        <tr style="background-color: #dce6f1; font-weight: bold; text-align: center;">
          <td style="width: 8%; border: 1px solid #000000; padding: 4px;">No</td>
          <td style="width: 22%; border: 1px solid #000000; padding: 4px;">Tipe Soal</td>
          <td style="width: 50%; border: 1px solid #000000; padding: 4px;">Kunci Jawaban / Pembahasan</td>
          <td style="width: 20%; border: 1px solid #000000; padding: 4px;">Bobot Skor</td>
        </tr>
        ${allQuestions.map((q, idx) => `
          <tr>
            <td style="border: 1px solid #000000; text-align: center; padding: 4px;">${idx + 1}</td>
            <td style="border: 1px solid #000000; padding: 4px;">${q.TYPE || 'MCQ'}</td>
            <td style="border: 1px solid #000000; font-weight: bold; padding: 4px;">${q.ANSWER || '-'}</td>
            <td style="border: 1px solid #000000; text-align: center; padding: 4px;">${q.POINTS || 10}</td>
          </tr>
        `).join('')}
      </table>
      ` : ''}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + html], {
    type: 'application/msword;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `Naskah_Soal_${(opts.subjectName || 'Mapel').replace(/\s+/g, '_')}_${(opts.className || 'Kelas').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.doc`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
