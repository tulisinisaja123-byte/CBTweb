import mammoth from 'mammoth';
import { QuestionType } from '../types';
import {
  parseMatchingDetails,
  parseMatchingAnswer,
  formatMatchingAnswer,
  buildMatchingExtraData
} from './matchingHelper';
import { preprocessDocxMath } from './docxMathProcessor';

export interface ParsedWordQuestion {
  ID?: string;
  EXAM_ID?: string;
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
}

export const KNOWN_QUESTION_TYPE_NAMES = [
  'PG',
  'PILIHAN GANDA',
  'PILIHAN_GANDA',
  'PILGAN',
  'PG_KOMPLEKS',
  'PILIHAN GANDA KOMPLEKS',
  'KOMPLEKS',
  'COMPLEX',
  'COMPLEX_MCQ',
  'BENAR_SALAH',
  'BENAR / SALAH',
  'BENAR SALAH',
  'B/S',
  'BS',
  'TRUE_FALSE',
  'TRUE / FALSE',
  'TRUE-FALSE',
  'MENJODOHKAN',
  'JODOHKAN',
  'MATCHING',
  'MENJODOH',
  'ISIAN',
  'ISIAN_SINGKAT',
  'ISIAN SINGKAT',
  'SHORT_ANSWER',
  'SHORT ANSWER',
  'ESAI',
  'URAIAN',
  'ESSAY',
  'MCQ'
];

/**
 * Normalizes user-entered question type strings into system QuestionType
 */
export function normalizeQuestionType(rawType: string): QuestionType {
  const norm = String(rawType || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  if (norm.includes('KOMPLEKS') || norm.includes('COMPLEX')) return 'COMPLEX_MCQ';
  if (norm.includes('BENAR') || norm.includes('SALAH') || norm === 'BS' || norm === 'B_S' || norm === 'TRUE_FALSE') return 'TRUE_FALSE';
  if (norm.includes('JODOH') || norm.includes('COCOK') || norm.includes('MATCH')) return 'MATCHING';
  if (norm.includes('ISIAN') || norm.includes('SINGKAT') || norm.includes('SHORT')) return 'SHORT_ANSWER';
  if (norm.includes('ESAI') || norm.includes('URAIAN') || norm.includes('ESSAY')) return 'ESSAY';
  return 'MCQ';
}

/**
 * Parses options from a combined multiline string, HTML block, or inline sequence
 * Supports "A. 150 \n B. 200", "<b>A.</b> 150", "(A) 150", "A) 150", and inline "A. 150 B. 200 C. 250"
 */
export function parseCombinedOptionsString(raw: string): {
  A: string;
  B: string;
  C: string;
  D: string;
  E: string;
} {
  const result = { A: '', B: '', C: '', D: '', E: '' };
  if (!raw || !raw.trim()) return result;

  // 1. Normalize line breaks across HTML and raw text
  const textWithBreaks = raw
    .replace(/<\/p>|<\/div>|<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .trim();

  // Split into lines
  const rawLines = textWithBreaks.split('\n').map(l => l.trim()).filter(Boolean);

  // Match: optional tags, optional [ or (, letter A-E, optional ] or ), delimiter (. : - )), optional closing tags, and text
  const linePrefixRegex = /^(?:<[^>]+>)*\s*\(?([A-Ea-e])[\.\:\-\)]\s*(?:<\/[^>]+>)*\s*(.*)$/i;

  let foundCount = 0;
  let currentLetter: 'A' | 'B' | 'C' | 'D' | 'E' | null = null;
  for (const line of rawLines) {
    const m = line.match(linePrefixRegex);
    if (m) {
      const letter = m[1].toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';
      const val = m[2].replace(/^<\/[^>]+>/, '').trim();
      currentLetter = letter;
      result[letter] = val;
      foundCount++;
    } else if (currentLetter) {
      // Continuation line (e.g. an image tag, math formula, or second line of text)
      result[currentLetter] = (result[currentLetter] ? result[currentLetter] + '\n' : '') + line;
    }
  }

  // 2. If fewer than 2 options found, test for single-line inline format:
  // e.g. "A. Opsi 1 B. Opsi 2 C. Opsi 3 D. Opsi 4 E. Opsi 5"
  if (foundCount < 2) {
    const inlineTokens = textWithBreaks.split(/(?:^|\s|<br\s*\/?>|<p>|;)\s*\(?([A-Ea-e])[\.\:\-\)]\s*/i);
    if (inlineTokens.length >= 3) {
      for (let i = 1; i < inlineTokens.length; i += 2) {
        const letter = inlineTokens[i]?.toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';
        const val = (inlineTokens[i + 1] || '').trim();
        if (letter && ['A', 'B', 'C', 'D', 'E'].includes(letter)) {
          result[letter] = val;
          foundCount++;
        }
      }
    }
  }

  // 3. Fallback: If still no letter prefixes, assign lines sequentially
  if (!result.A && rawLines.length > 0) {
    const letters: Array<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D', 'E'];
    rawLines.slice(0, 5).forEach((line, idx) => {
      result[letters[idx]] = line.trim();
    });
  }

  return result;
}

/**
 * Extracts options if they were accidentally or intentionally included inside the question text
 */
export function extractEmbeddedOptionsFromQuestion(qText: string): {
  cleanQuestion: string;
  options: { A: string; B: string; C: string; D: string; E: string };
} {
  const defaultOpts = { A: '', B: '', C: '', D: '', E: '' };
  if (!qText) return { cleanQuestion: qText, options: defaultOpts };

  // Detect where option A starts (after newline or multiple spaces)
  const firstOptMatch = qText.match(/(?:[\n\r]|<br\s*\/?>|<p>|\s{2,})\s*\(?[A|a][\.\:\-\)]\s+/);
  if (!firstOptMatch || firstOptMatch.index === undefined) {
    return { cleanQuestion: qText, options: defaultOpts };
  }

  const splitIdx = firstOptMatch.index;
  const questionPart = qText.slice(0, splitIdx).trim();
  const optionsPart = qText.slice(splitIdx).trim();

  const parsedOpts = parseCombinedOptionsString(optionsPart);
  if (parsedOpts.A && parsedOpts.B) {
    return {
      cleanQuestion: questionPart,
      options: parsedOpts
    };
  }

  return { cleanQuestion: qText, options: defaultOpts };
}

/**
 * Cleans and preserves rich cell content (images, formatting, formulas)
 */
function cleanCellContent(cell: Element): string {
  if (!cell) return '';

  const hasImages = Boolean(cell.querySelector('img'));
  const hasFormatting = Boolean(cell.querySelector('sup, sub, strong, b, em, i, u'));

  // If there are multiple paragraphs or block elements, preserve newlines between them
  const paragraphs = Array.from(cell.querySelectorAll('p, div, li'));
  if (paragraphs.length > 0) {
    const mapped = paragraphs
      .map(p => {
        let content = (hasImages || hasFormatting) ? p.innerHTML : (p.textContent || '');
        return content
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/&nbsp;/g, ' ')
          .trim();
      })
      .filter(Boolean)
      .join('\n');

    // If cell contains images but mapped string somehow lost the <img> tag, fallback to cell.innerHTML
    if (hasImages && !mapped.includes('<img')) {
      return cell.innerHTML
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&nbsp;/g, ' ')
        .trim();
    }
    return mapped;
  }

  let html = (hasImages || hasFormatting) ? cell.innerHTML : (cell.textContent || '');
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Parses questions from an uploaded Microsoft Word (.docx) file
 * Extracts embedded images into base64, preserves Arabic text, and formulas.
 */
export async function parseQuestionsFromWord(file: File, defaultExamId = ''): Promise<ParsedWordQuestion[]> {
  let arrayBuffer = await file.arrayBuffer();

  // Convert Word equations (OMML) into standard LaTeX before passing to Mammoth
  arrayBuffer = await preprocessDocxMath(arrayBuffer);

  // Convert docx to HTML with base64 inline images support
  const mammothAny = mammoth as any;
  const { value: html } = await mammothAny.convertToHtml(
    { arrayBuffer },
    {
      convertImage: mammothAny.images?.imgElement?.((image: any) => {
        return image.read('base64').then((imageBuffer: string) => {
          return {
            src: `data:${image.contentType};base64,${imageBuffer}`
          };
        });
      })
    }
  );

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const questions: ParsedWordQuestion[] = [];
  const tables = Array.from(doc.querySelectorAll('table'));

  // 1. Process any tables found in the document
  tables.forEach(table => {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length < 2) return;

    // Find header indices
    const headerRow = rows[0];
    const headers = Array.from(headerRow.querySelectorAll('th, td')).map(cell =>
      cell.textContent?.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_') || ''
    );

    // 1. Identify specific column roles
    const noIdx = headers.findIndex(h => h === 'NO' || h === 'NOMOR' || h === 'NUMBER' || h === 'NUM' || h.startsWith('NO_'));
    const typeIdx = headers.findIndex(h => h.includes('TIPE') || h.includes('JENIS') || h === 'TYPE' || h.includes('BENTUK'));
    const ansIdx = headers.findIndex(h =>
      (h.includes('KUNCI') || h.includes('JAWAB') || h === 'ANSWER' || h === 'KEY') &&
      !h.endsWith('_A') && !h.endsWith('_B') && !h.endsWith('_C') && !h.endsWith('_D') && !h.endsWith('_E')
    );
    const ptsIdx = headers.findIndex(h => h.includes('POIN') || h.includes('BOBOT') || h.includes('POINT') || h === 'SCORE' || h.includes('NILAI'));

    // Options (separate columns)
    const optAIdx = headers.findIndex(h => h === 'A' || h === 'OPSI_A' || h === 'PILIHAN_A' || h === 'OPTION_A' || h === 'PIL_A' || h === 'JAWABAN_A');
    const optBIdx = headers.findIndex(h => h === 'B' || h === 'OPSI_B' || h === 'PILIHAN_B' || h === 'OPTION_B' || h === 'PIL_B' || h === 'JAWABAN_B');
    const optCIdx = headers.findIndex(h => h === 'C' || h === 'OPSI_C' || h === 'PILIHAN_C' || h === 'OPTION_C' || h === 'PIL_C' || h === 'JAWABAN_C');
    const optDIdx = headers.findIndex(h => h === 'D' || h === 'OPSI_D' || h === 'PILIHAN_D' || h === 'OPTION_D' || h === 'PIL_D' || h === 'JAWABAN_D');
    const optEIdx = headers.findIndex(h => h === 'E' || h === 'OPSI_E' || h === 'PILIHAN_E' || h === 'OPTION_E' || h === 'PIL_E' || h === 'JAWABAN_E');
    
    // Combined options column
    const optIdx = headers.findIndex((h, idx) =>
      idx !== optAIdx && idx !== optBIdx && idx !== optCIdx && idx !== optDIdx && idx !== optEIdx &&
      (h.includes('OPSI') || h.includes('PILIHAN') || h.includes('OPTION'))
    );

    // Excluded indices that CANNOT be the question text column
    const excludedIndices = new Set(
      [noIdx, typeIdx, ansIdx, ptsIdx, optIdx, optAIdx, optBIdx, optCIdx, optDIdx, optEIdx].filter(i => i >= 0)
    );

    // Question column detection:
    // Priority 1: Headers with explicit question keywords (PERTANYAAN, TANYA, QUESTION, NASKAH, ISI_SOAL, TEKS_SOAL)
    let qIdx = headers.findIndex((h, idx) =>
      !excludedIndices.has(idx) &&
      (h.includes('PERTANYAAN') || h.includes('TANYA') || h.includes('QUESTION') || h.includes('NASKAH') || h.includes('ISI_SOAL') || h.includes('TEKS_SOAL'))
    );

    // Priority 2: Headers with TEKS or SOAL (excluding TIPE, JENIS, KUNCI, BOBOT, POIN)
    if (qIdx === -1) {
      qIdx = headers.findIndex((h, idx) =>
        !excludedIndices.has(idx) &&
        (h.includes('TEKS') || (h.includes('SOAL') && !h.includes('TIPE') && !h.includes('JENIS') && !h.includes('KUNCI') && !h.includes('BOBOT') && !h.includes('POIN')))
      );
    }

    // Priority 3: First non-excluded column
    if (qIdx === -1) {
      qIdx = headers.findIndex((_, idx) => !excludedIndices.has(idx));
    }

    // Fallback if headers are generic or missing
    const colCount = rows[0].querySelectorAll('td, th').length;
    if (qIdx === -1 && colCount >= 6) {
      // Standard: NO (0), TIPE (1), SOAL (2), OPSI (3), KUNCI (4), POIN (5)
      qIdx = 2;
    } else if (qIdx === -1 && colCount >= 5) {
      // TIPE (0), SOAL (1), OPSI (2), KUNCI (3), POIN (4)
      qIdx = 1;
    } else if (qIdx === -1 && colCount >= 4) {
      // SOAL (0), OPSI (1), KUNCI (2), POIN (3)
      qIdx = 0;
    }

    // Process data rows
    for (let i = 1; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll('td'));
      if (cells.length === 0) continue;

      const getCellText = (idx: number) => (idx >= 0 && cells[idx] ? cells[idx].textContent?.trim() || '' : '');
      const getCellRich = (idx: number) => (idx >= 0 && cells[idx] ? cleanCellContent(cells[idx]) : '');

      let qText = getCellRich(qIdx);
      let rawType = getCellText(typeIdx);

      // FAIL-SAFE SELF-CORRECTION:
      // If qText happens to be ONLY a question type label (e.g. 'PG', 'Pilihan Ganda', 'BS', etc.)
      const qTextPlain = qText.replace(/<[^>]*>/g, '').trim().toUpperCase();
      const qTextPlainClean = qTextPlain.replace(/[^A-Z0-9]/g, '');
      const knownCleans = KNOWN_QUESTION_TYPE_NAMES.map(k => k.replace(/[^A-Z0-9]/g, ''));
      const looksLikeType =
        (KNOWN_QUESTION_TYPE_NAMES.includes(qTextPlain) || knownCleans.includes(qTextPlainClean)) &&
        qTextPlain.split(/\s+/).length <= 3 &&
        !qTextPlain.includes(':') &&
        !qTextPlain.includes('?') &&
        !qTextPlain.includes('1.') &&
        !qTextPlain.includes('BERIKUT');

      if (looksLikeType) {
        if (!rawType) {
          rawType = qTextPlain;
        }
        // Search among other cells in this row for the real question text (cell with longest text)
        let bestCandidateIdx = -1;
        let maxCandidateLen = 0;
        cells.forEach((cell, cIdx) => {
          if (cIdx === qIdx || cIdx === typeIdx || cIdx === noIdx || cIdx === ansIdx || cIdx === ptsIdx) return;
          const plain = cell.textContent?.trim() || '';
          if (plain.length > maxCandidateLen && plain.length > 5) {
            maxCandidateLen = plain.length;
            bestCandidateIdx = cIdx;
          }
        });

        if (bestCandidateIdx >= 0) {
          qText = getCellRich(bestCandidateIdx);
        }
      }

      // Skip empty or placeholder rows
      if (
        !qText ||
        qText === 'Ketik pertanyaan di sini...' ||
        qText.toLowerCase().includes('ketik pertanyaan soal di sini') ||
        qText.toLowerCase().includes('contoh pengisian')
      ) {
        continue;
      }

      const qType = normalizeQuestionType(rawType);
      const rawAnswer = getCellText(ansIdx);
      const rawPoints = getCellText(ptsIdx);
      const points = parseInt(rawPoints, 10) || 10;

      let optA = '';
      let optB = '';
      let optC = '';
      let optD = '';
      let optE = '';

      // Strip redundant leading "A." / "A)" prefix if in separate option columns
      const stripLeadingOpt = (text: string, letter: string) => {
        if (!text) return '';
        return text.replace(new RegExp(`^(?:<[^>]+>)*\\s*\\(?${letter}[\\.\\:\\-\\)]\\s*(?:<\\/[^>]+>)*\\s*`, 'i'), '').trim() || text;
      };

      if (optAIdx >= 0) {
        optA = stripLeadingOpt(getCellRich(optAIdx), 'A');
        optB = stripLeadingOpt(getCellRich(optBIdx), 'B');
        optC = stripLeadingOpt(getCellRich(optCIdx), 'C');
        optD = stripLeadingOpt(getCellRich(optDIdx), 'D');
        optE = stripLeadingOpt(getCellRich(optEIdx), 'E');
      } else if (optIdx >= 0) {
        // Parse options from a single multiline or combined cell
        const parsed = parseCombinedOptionsString(getCellRich(optIdx));
        optA = parsed.A;
        optB = parsed.B;
        optC = parsed.C;
        optD = parsed.D;
        optE = parsed.E;
      }

      // If options are still not found and question is MCQ, check if options are embedded in question text
      if (!optA && (qType === 'MCQ' || qType === 'COMPLEX_MCQ')) {
        const embedded = extractEmbeddedOptionsFromQuestion(qText);
        if (embedded.options.A && embedded.options.B) {
          qText = embedded.cleanQuestion;
          optA = embedded.options.A;
          optB = embedded.options.B;
          optC = embedded.options.C;
          optD = embedded.options.D;
          optE = embedded.options.E;
        }
      }

      // If TRUE_FALSE and options are empty, provide standard options
      if (qType === 'TRUE_FALSE' && !optA && !optB) {
        optA = 'Benar';
        optB = 'Salah';
      }

      // Normalize answer according to question type
      let finalAnswer = rawAnswer.trim();
      if (qType === 'TRUE_FALSE') {
        const u = finalAnswer.toUpperCase();
        if (u === 'B' || u === 'BENAR' || u === 'TRUE' || u === 'T' || u === '1') finalAnswer = 'BENAR';
        else if (u === 'S' || u === 'SALAH' || u === 'FALSE' || u === 'F' || u === '0') finalAnswer = 'SALAH';
      } else if (qType === 'MCQ') {
        const m = finalAnswer.match(/^([A-E])/i);
        if (m) finalAnswer = m[1].toUpperCase();
        else finalAnswer = finalAnswer.toUpperCase();
      } else if (qType === 'COMPLEX_MCQ') {
        const parts = finalAnswer.split(/[,;\s]+/).map(p => p.trim().toUpperCase()).filter(p => /^[A-E]$/.test(p));
        if (parts.length > 0) {
          finalAnswer = Array.from(new Set(parts)).sort().join(', ');
        }
      } else if (qType === 'MATCHING') {
        const pairs = parseMatchingAnswer(finalAnswer);
        if (Object.keys(pairs).length > 0) {
          finalAnswer = formatMatchingAnswer(pairs);
        }
      }

      let extraData: string | undefined = undefined;
      if (qType === 'MATCHING') {
        const details = parseMatchingDetails(
          qText,
          { A: optA, B: optB, C: optC, D: optD, E: optE },
          undefined,
          finalAnswer
        );
        extraData = buildMatchingExtraData(details.prompt, details.leftItems, details.rightItems);
      }

      questions.push({
        ID: `SOAL-${Date.now().toString(36)}-${questions.length + 1}`,
        EXAM_ID: defaultExamId,
        TYPE: qType,
        QUESTION: qText,
        OPTION_A: optA,
        OPTION_B: optB,
        OPTION_C: optC,
        OPTION_D: optD,
        OPTION_E: optE,
        ANSWER: finalAnswer,
        POINTS: points,
        EXTRA_DATA: extraData
      });
    }
  });

  // 2. Fallback: If no questions found in tables, parse free-form numbered paragraphs
  if (questions.length === 0) {
    const rawBlocks = Array.from(doc.querySelectorAll('p, h1, h2, h3, h4, li'));

    interface Block {
      num: number;
      qLines: string[];
      options: Record<string, string>;
      answer: string;
      points: number;
      type?: QuestionType;
    }

    const blocks: Block[] = [];
    let currentBlock: Block | null = null;
    let lastOptLetter: 'A' | 'B' | 'C' | 'D' | 'E' | null = null;

    const questionStartRegex = /^(?:soal\s*)?(?:no\.?\s*)?(\d+)[\.\:\)]\s*(.*)$/i;
    const optionRegex = /^(?:\[|\()?([A-Ea-e])(?:\]|\))?[\.\:\-\)]\s*(.*)$/i;
    const keyRegex = /^(?:kunci(?:\s*jawaban)?|jawaban|kunci\s*soal|ans|key)[\.\:\s]+(.*)$/i;
    const pointsRegex = /^(?:bobot|poin|point|score)[\.\:\s]+(\d+)/i;
    const typeRegex = /^(?:tipe|jenis|type)[\.\:\s]+(.*)$/i;

    for (let i = 0; i < rawBlocks.length; i++) {
      const el = rawBlocks[i];
      const htmlText = cleanCellContent(el);
      const plainText = el.textContent?.trim() || '';

      // Skip document instructions or titles ONLY before any question has started
      if (!currentBlock) {
        if (
          plainText.includes('SISTEM UJIAN SEKOLAH') ||
          plainText.includes('TEMPLATE RESMI') ||
          plainText.includes('PETUNJUK UMUM') ||
          plainText.includes('MADRASAH')
        ) {
          continue;
        }
      }

      const qMatch = plainText.match(questionStartRegex);
      if (qMatch) {
        if (currentBlock && currentBlock.qLines.length > 0) {
          blocks.push(currentBlock);
        }

        let initialText = qMatch[2] ? qMatch[2].trim() : '';
        let detectedType: QuestionType | undefined = undefined;

        // Check if initialText starts with bracketed type e.g. "[PG] Pertanyaan..." or "(Pilihan Ganda) Pertanyaan..."
        const prefixTypeMatch = initialText.match(/^(?:\[|\()(PG(?:_KOMPLEKS)?|PILIHAN\s*GANDA|BENAR\s*\/?\s*SALAH|B\/S|MENJODOHKAN|ISIAN(?:\s*SINGKAT)?|ESAI|URAIAN|ESSAY)(?:\]|\))\s*[\:\-]?\s*(.*)$/i);
        if (prefixTypeMatch) {
          detectedType = normalizeQuestionType(prefixTypeMatch[1]);
          initialText = prefixTypeMatch[2]?.trim() || '';
        }

        // If initialText is solely a question type name (e.g. "1. Pilihan Ganda"), don't make it question text
        const isOnlyTypeName = KNOWN_QUESTION_TYPE_NAMES.includes(initialText.toUpperCase());
        if (isOnlyTypeName) {
          detectedType = normalizeQuestionType(initialText);
          initialText = '';
        }

        currentBlock = {
          num: parseInt(qMatch[1], 10),
          qLines: initialText ? [initialText] : [],
          options: {},
          answer: '',
          points: 10,
          type: detectedType
        };
        lastOptLetter = null;
        // If there are images in this element, include them
        if (el.querySelector('img')) {
          currentBlock.qLines.push(htmlText);
        }
        continue;
      }

      if (!currentBlock) continue;

      // Check if line contains inline multiple options (e.g. "A. Opsi 1  B. Opsi 2  C. Opsi 3")
      if (plainText.match(/\bA[\.\:\)]/i) && plainText.match(/\bB[\.\:\)]/i)) {
        const inlineOpts = parseCombinedOptionsString(htmlText || plainText);
        if (inlineOpts.A && inlineOpts.B) {
          Object.assign(currentBlock.options, inlineOpts);
          lastOptLetter = null;
          continue;
        }
      }

      const optMatch = plainText.match(optionRegex);
      if (optMatch) {
        const letter = optMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';
        let val = optMatch[2]?.trim() || '';
        if (el.querySelector('img') || el.querySelector('sup, sub, strong, b, em, i')) {
          val = htmlText.replace(/^(?:<[^>]+>)*\s*\(?[A-Ea-e](?:\]|\))?[\.\:\-\)]\s*(?:<\/[^>]+>)*\s*/i, '').trim();
        }
        currentBlock.options[letter] = val;
        lastOptLetter = letter;
        continue;
      }

      const keyMatch = plainText.match(keyRegex);
      if (keyMatch) {
        currentBlock.answer = keyMatch[1]?.trim().toUpperCase() || '';
        lastOptLetter = null;
        continue;
      }

      const ptsMatch = plainText.match(pointsRegex);
      if (ptsMatch) {
        currentBlock.points = parseInt(ptsMatch[1], 10) || 10;
        lastOptLetter = null;
        continue;
      }

      const tMatch = plainText.match(typeRegex);
      if (tMatch) {
        currentBlock.type = normalizeQuestionType(tMatch[1]);
        lastOptLetter = null;
        continue;
      }

      // If under an active option letter and an image or continuation line occurs
      if (lastOptLetter && !currentBlock.answer) {
        const hasImg = Boolean(el.querySelector('img'));
        const addition = hasImg ? htmlText : (htmlText || plainText);
        if (addition) {
          const prev = currentBlock.options[lastOptLetter] || '';
          currentBlock.options[lastOptLetter] = prev ? `${prev}\n${addition}` : addition;
        }
        continue;
      }

      // Additional question text or images
      if (Object.keys(currentBlock.options).length === 0 && !currentBlock.answer) {
        currentBlock.qLines.push(htmlText || plainText);
      }
    }

    if (currentBlock && currentBlock.qLines.length > 0) {
      blocks.push(currentBlock);
    }

    // Convert blocks to questions
    blocks.forEach((b, idx) => {
      let qText = b.qLines.join('\n').trim();
      if (!qText) return;

      // Fail-safe check on paragraph question text as well
      const qTextUpper = qText.toUpperCase();
      if (KNOWN_QUESTION_TYPE_NAMES.includes(qTextUpper)) {
        if (!b.type) b.type = normalizeQuestionType(qText);
        return;
      }

      // If options are missing from paragraph block, check if embedded in question text
      if (Object.keys(b.options).length === 0) {
        const embedded = extractEmbeddedOptionsFromQuestion(qText);
        if (embedded.options.A && embedded.options.B) {
          qText = embedded.cleanQuestion;
          b.options = embedded.options;
        }
      }

      const hasOptions = Object.keys(b.options).length > 0;
      let finalType: QuestionType = b.type || (hasOptions ? 'MCQ' : 'ESSAY');
      let finalAnswer = b.answer || (hasOptions ? 'A' : '');

      if (finalType === 'TRUE_FALSE' && !b.options['A'] && !b.options['B']) {
        b.options['A'] = 'Benar';
        b.options['B'] = 'Salah';
      }

      let extraData: string | undefined = undefined;
      if (finalType === 'MATCHING') {
        const pairs = parseMatchingAnswer(finalAnswer);
        if (Object.keys(pairs).length > 0) {
          finalAnswer = formatMatchingAnswer(pairs);
        }
        const details = parseMatchingDetails(
          qText,
          b.options,
          undefined,
          finalAnswer
        );
        extraData = buildMatchingExtraData(details.prompt, details.leftItems, details.rightItems);
      }

      questions.push({
        ID: `SOAL-WORD-${Date.now().toString(36)}-${idx + 1}`,
        EXAM_ID: defaultExamId,
        TYPE: finalType,
        QUESTION: qText,
        OPTION_A: b.options['A'] || '',
        OPTION_B: b.options['B'] || '',
        OPTION_C: b.options['C'] || '',
        OPTION_D: b.options['D'] || '',
        OPTION_E: b.options['E'] || '',
        ANSWER: finalAnswer,
        POINTS: b.points || 10,
        EXTRA_DATA: extraData
      });
    });
  }

  return questions;
}
