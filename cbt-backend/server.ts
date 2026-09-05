import express from 'express';
import cors from 'cors';
import multer from 'multer';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Memory storage untuk Multer (tanpa simpan file ke disk)
const upload = multer({ storage: multer.memoryStorage() });

// 1. Endpoint Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'CBT Backend Service Running' });
});

// 2. Parsing File Word (.docx)
app.post('/api/parse-word', upload.single('file'), async (req, res): Promise<any> => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File tidak ditemukan' });
    }

    const result = await mammoth.extractRawText({ buffer: req.file.buffer });
    const text = result.value;

    // Parsing teks sederhana berdasarkan pola "Soal:" atau penomoran
    const lines = text.split('\n').filter((l) => l.trim() !== '');
    const questions: any[] = [];
    let currentQuestion: any = null;

    lines.forEach((line) => {
      const trimmed = line.trim();
      // Deteksi Awal Soal (Contoh: "1. " atau "Soal 1:")
      if (/^\d+[\.\)]/.test(trimmed) || /^Soal\s+\d+/i.test(trimmed)) {
        if (currentQuestion) questions.push(currentQuestion);
        currentQuestion = {
          text: trimmed.replace(/^\d+[\.\)]\s*/, '').replace(/^Soal\s+\d+:\s*/i, ''),
          options: [],
          type: 'PG',
        };
      } else if (currentQuestion && /^[A-E][\.\)]/i.test(trimmed)) {
        // Deteksi Pilihan Jawaban (A. B. C. D. E.)
        const key = trimmed.charAt(0).toUpperCase();
        const label = trimmed.replace(/^[A-E][\.\)]\s*/i, '');
        currentQuestion.options.push({ key, label });
      }
    });

    if (currentQuestion) questions.push(currentQuestion);

    res.json({ success: true, count: questions.length, data: questions });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal memproses file Word', details: error.message });
  }
});

// 3. Parsing File Excel (.xlsx)
app.post('/api/parse-excel', upload.single('file'), (req, res): Promise<any> => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File tidak ditemukan' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData: any[] = XLSX.utils.sheet_to_json(sheet);

    // Format kolom Excel yang diharapkan: Soal | A | B | C | D | Kunci | Tipe
    const questions = rawData.map((row, index) => ({
      id: `q_excel_${index + 1}`,
      text: row['Soal'] || row['soal'] || '',
      type: row['Tipe'] || 'PG',
      options: [
        { key: 'A', label: String(row['A'] || row['a'] || '') },
        { key: 'B', label: String(row['B'] || row['b'] || '') },
        { key: 'C', label: String(row['C'] || row['c'] || '') },
        { key: 'D', label: String(row['D'] || row['d'] || '') },
      ].filter((opt) => opt.label !== ''),
      answerKey: row['Kunci'] || row['kunci'] || '',
    }));

    res.json({ success: true, count: questions.length, data: questions });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal memproses file Excel', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server CBT Backend aktif di port ${PORT}`);
});