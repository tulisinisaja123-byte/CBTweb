import { QuestionType } from '../types';
import { ParsedQuestionItem } from '../components/QuestionImportPreview';
import { normalizeQuestionType, KNOWN_QUESTION_TYPE_NAMES } from './wordParser';
import {
  parseMatchingDetails,
  parseMatchingAnswer,
  formatMatchingAnswer,
  buildMatchingExtraData
} from './matchingHelper';

/**
 * Parses and normalizes raw JSON rows extracted from Excel (.xlsx, .xls, .csv) into ParsedQuestionItem
 */
export function parseExcelQuestionRows(
  jsonRows: any[],
  defaultExamId: string
): ParsedQuestionItem[] {
  if (!Array.isArray(jsonRows) || jsonRows.length === 0) {
    return [];
  }

  return jsonRows
    .filter(row => {
      if (!row || typeof row !== 'object') return false;
      const values = Object.values(row)
        .map(v => String(v ?? '').trim())
        .filter(Boolean);
      // Ignore empty rows or pure instruction header rows
      return values.length > 0;
    })
    .map((raw: any, index: number) => {
      const rawEntries = Object.entries(raw).filter(
        ([_, v]) => v !== undefined && v !== null && String(v).trim() !== ''
      );

      // Clean key retriever (ignores case, spaces, underscores, symbols)
      const getVal = (...keys: string[]): string => {
        for (const k of keys) {
          const cleanTarget = k.toUpperCase().replace(/[^A-Z0-9]/g, '');

          // 1. Exact match against clean key
          for (const [rawKey, rawVal] of rawEntries) {
            const cleanRaw = rawKey.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (cleanRaw === cleanTarget) {
              return String(rawVal).trim();
            }
          }

          // 2. Contains match (only if cleanTarget is long enough to avoid false positives)
          if (cleanTarget.length >= 4) {
            for (const [rawKey, rawVal] of rawEntries) {
              const cleanRaw = rawKey.toUpperCase().replace(/[^A-Z0-9]/g, '');
              if (cleanRaw.includes(cleanTarget)) {
                return String(rawVal).trim();
              }
            }
          }
        }
        return '';
      };

      // 1. Question Type
      const rawType = getVal(
        'TIPE_SOAL',
        'TIPESOAL',
        'JENIS_SOAL',
        'JENISSOAL',
        'TIPE',
        'JENIS',
        'TYPE',
        'BENTUK_SOAL',
        'BENTUKSOAL',
        'KATEGORI'
      ) || 'MCQ';
      const finalType = normalizeQuestionType(rawType);

      // 2. Question Text (Strictly ignore Type, Key, Options, Points, and ID columns!)
      let question = '';
      for (const [rawKey, rawVal] of rawEntries) {
        const cleanRaw = rawKey.toUpperCase().replace(/[^A-Z0-9]/g, '');
        // Excluded headers
        if (
          cleanRaw.includes('TIPE') ||
          cleanRaw.includes('JENIS') ||
          cleanRaw.includes('TYPE') ||
          cleanRaw.includes('BENTUK') ||
          cleanRaw.includes('KUNCI') ||
          cleanRaw.includes('JAWAB') ||
          cleanRaw.includes('OPSI') ||
          cleanRaw.includes('PILIHAN') ||
          cleanRaw.includes('OPTION') ||
          cleanRaw.includes('BOBOT') ||
          cleanRaw.includes('POIN') ||
          cleanRaw.includes('POINT') ||
          cleanRaw.includes('SCORE') ||
          cleanRaw.includes('NILAI') ||
          cleanRaw === 'NO' ||
          cleanRaw === 'NOMOR' ||
          cleanRaw === 'ID' ||
          cleanRaw === 'IDUJIAN' ||
          cleanRaw === 'EXAMID'
        ) {
          continue;
        }

        if (
          cleanRaw.includes('PERTANYAAN') ||
          cleanRaw.includes('TANYA') ||
          cleanRaw.includes('QUESTION') ||
          cleanRaw.includes('TEKSSOAL') ||
          cleanRaw.includes('NASKAH') ||
          cleanRaw.includes('ISISOAL') ||
          cleanRaw.includes('TEKS') ||
          cleanRaw === 'SOAL'
        ) {
          question = String(rawVal).trim();
          break;
        }
      }

      // Fallback if not found through explicit clean match
      if (!question) {
        question = getVal('PERTANYAAN', 'TEKS_SOAL', 'QUESTION', 'NASKAH_SOAL', 'ISI_SOAL', 'SOAL');
      }

      // FAIL-SAFE SELF-CORRECTION:
      // If question happens to be ONLY a question type name (e.g. 'PG', 'MCQ', 'Pilihan Ganda', etc.)
      const qUpper = question.trim().toUpperCase();
      const qUpperClean = qUpper.replace(/[^A-Z0-9]/g, '');
      const knownCleans = KNOWN_QUESTION_TYPE_NAMES.map(k => k.replace(/[^A-Z0-9]/g, ''));
      const looksLikeType =
        (KNOWN_QUESTION_TYPE_NAMES.includes(qUpper) || knownCleans.includes(qUpperClean)) &&
        qUpper.split(/\s+/).length <= 3 &&
        !qUpper.includes(':') &&
        !qUpper.includes('?') &&
        !qUpper.includes('1.') &&
        !qUpper.includes('BERIKUT');

      if (looksLikeType) {
        // Search for any column in raw that has actual longer question text
        for (const [_, rawVal] of rawEntries) {
          const str = String(rawVal).trim();
          if (str.length > question.length && str.length > 10 && !KNOWN_QUESTION_TYPE_NAMES.includes(str.toUpperCase())) {
            question = str;
            break;
          }
        }
      }

      const optA = getVal('OPSI_A', 'OPSIA', 'PILIHAN_A', 'PILIHANA', 'OPTION_A', 'OPTIONA', 'A');
      const optB = getVal('OPSI_B', 'OPSIB', 'PILIHAN_B', 'PILIHANB', 'OPTION_B', 'OPTIONB', 'B');
      const optC = getVal('OPSI_C', 'OPSIC', 'PILIHAN_C', 'PILIHANC', 'OPTION_C', 'OPTIONC', 'C');
      const optD = getVal('OPSI_D', 'OPSID', 'PILIHAN_D', 'PILIHAND', 'OPTION_D', 'OPTIOND', 'D');
      const optE = getVal('OPSI_E', 'OPSIE', 'PILIHAN_E', 'PILIHANE', 'OPTION_E', 'OPTIONE', 'E');

      let answer = getVal(
        'KUNCI_JAWABAN',
        'KUNCIJAWABAN',
        'KUNCI',
        'JAWABAN',
        'ANSWER',
        'KEY',
        'KUNCI_SOAL',
        'KUNCISOAL'
      );
      const rawPoints = getVal('BOBOT_POIN', 'BOBOTPOIN', 'BOBOT', 'POIN', 'POINTS', 'NILAI', 'SKOR');
      const points = parseInt(rawPoints, 10) || 10;
      const examId =
        getVal('ID_UJIAN', 'IDUJIAN', 'KODE_UJIAN', 'KODEUJIAN', 'UJIAN_ID', 'EXAM_ID', 'EXAMID', 'UJIAN') || defaultExamId;

      // Normalization of answers
      if (finalType === 'TRUE_FALSE') {
        const u = answer.toUpperCase();
        if (u === 'B' || u === 'BENAR' || u === 'TRUE' || u === 'T' || u === '1') {
          answer = 'BENAR';
        } else if (u === 'S' || u === 'SALAH' || u === 'FALSE' || u === 'F' || u === '0') {
          answer = 'SALAH';
        }
      } else if (finalType === 'MCQ') {
        const m = answer.match(/^([A-E])/i);
        if (m) {
          answer = m[1].toUpperCase();
        } else {
          answer = answer.toUpperCase();
        }
      } else if (finalType === 'COMPLEX_MCQ') {
        const parts = answer
          .split(/[,;\s]+/)
          .map(p => p.trim().toUpperCase())
          .filter(p => /^[A-E]$/.test(p));
        if (parts.length > 0) {
          answer = Array.from(new Set(parts)).sort().join(', ');
        }
      } else if (finalType === 'MATCHING') {
        const pairs = parseMatchingAnswer(answer);
        if (Object.keys(pairs).length > 0) {
          answer = formatMatchingAnswer(pairs);
        }
      }

      // Detection of validation warnings
      const warnings: string[] = [];
      if (!question) {
        warnings.push('Teks pertanyaan belum terisi');
      }
      if (finalType !== 'ESSAY' && !answer) {
        warnings.push('Kunci jawaban belum terisi');
      }
      if (finalType === 'MCQ' && (!optA || !optB)) {
        warnings.push('Pilihan A & B wajib diisi untuk Pilihan Ganda');
      }

      let extraData: string | undefined = undefined;
      if (finalType === 'MATCHING') {
        const details = parseMatchingDetails(
          question,
          { A: optA, B: optB, C: optC, D: optD, E: optE },
          undefined,
          answer
        );
        extraData = buildMatchingExtraData(details.prompt, details.leftItems, details.rightItems);
      }

      return {
        ID: `SOAL-${Date.now().toString(36)}-${index + 1}`,
        EXAM_ID: examId,
        TYPE: finalType,
        QUESTION: question,
        OPTION_A: optA,
        OPTION_B: optB,
        OPTION_C: optC,
        OPTION_D: optD,
        OPTION_E: optE,
        ANSWER: answer,
        POINTS: points,
        EXTRA_DATA: extraData,
        warnings
      };
    });
}
