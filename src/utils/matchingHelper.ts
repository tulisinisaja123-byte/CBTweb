/**
 * Utility functions for parsing, structuring, and formatting MATCHING (Menjodohkan) questions.
 */

export interface MatchingLeftItem {
  key: string; // '1', '2', '3', etc.
  label: string; // '1'
  text: string; // Clean text without leading number, e.g. 'Barometer'
  rawText: string; // Original full text, e.g. '1. Barometer'
}

export interface MatchingRightItem {
  key: string; // 'A', 'B', 'C', etc.
  label: string; // 'A'
  text: string; // Clean text without leading letter, e.g. 'Tekanan udara'
  rawText: string; // Original full text, e.g. 'A. Tekanan udara'
}

export interface MatchingDetails {
  prompt: string; // Main instruction prompt without premise items
  leftItems: MatchingLeftItem[];
  rightItems: MatchingRightItem[];
  correctPairs: Record<string, string>; // e.g. { '1': 'B', '2': 'C', '3': 'A' }
}

/**
 * Parses any matching answer string into a normalized record of pairs.
 * Supported formats:
 * - "1-B; 2-C; 3-A"
 * - "1-B, 2-C, 3-A"
 * - "1:B; 2:C; 3:A"
 * - "1=B, 2=C"
 * - "1.B, 2.C"
 * - "1 -> B, 2 -> C"
 */
export function parseMatchingAnswer(answerStr: string = ''): Record<string, string> {
  const pairs: Record<string, string> = {};
  if (!answerStr) return pairs;

  // Split by semicolons, commas, or newlines
  const parts = answerStr.split(/[;\n,]+/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Matches e.g. "1-B", "1 - B", "1:B", "1=B", "1. B", "1 -> B"
    const match = trimmed.match(/^(\d+|[A-Za-z0-9_]+)\s*(?:[-:=–—]|->|\.)\s*([A-Za-z0-9_]+)$/);
    if (match) {
      const left = match[1].trim().toUpperCase();
      const right = match[2].trim().toUpperCase();
      pairs[left] = right;
    }
  }
  return pairs;
}

/**
 * Formats a record of pairs into the standard string format: "1-B; 2-C; 3-A"
 */
export function formatMatchingAnswer(pairs: Record<string, string>): string {
  return Object.entries(pairs)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([l, r]) => `${l}-${r}`)
    .join('; ');
}

/**
 * Strips leading numbering (e.g. "1. ", "1) ", "1 - ", "(1) ")
 */
export function cleanLeftItemText(raw: string): string {
  return raw
    .replace(/^\(?[1-9]\d*[\.\)\:\-–—\s]+\s*/i, '')
    .replace(/^item\s*\d+[\.\:\-\s]*/i, '')
    .trim();
}

/**
 * Strips leading option letter (e.g. "A. ", "A) ", "A - ", "[A] ")
 */
export function cleanRightItemText(raw: string): string {
  return raw
    .replace(/^\[?([A-Ea-e])\]?[\.\)\:\-–—\s]+\s*/i, '')
    .replace(/^opsi\s*[A-Ea-e][\.\:\-\s]*/i, '')
    .trim();
}

/**
 * Comprehensive parser for matching questions:
 * Extracts prompt, left premises, right options, and pairs from text, options, and extraData.
 */
export function parseMatchingDetails(
  questionInput: any = '',
  options: Record<string, any> = {},
  extraDataStr?: string,
  answerKey: string = ''
): MatchingDetails {
  // Support passing either a question object directly or individual fields
  let questionText = '';
  if (typeof questionInput === 'string') {
    questionText = questionInput;
  } else if (questionInput && typeof questionInput === 'object') {
    questionText = questionInput.QUESTION || questionInput.question || questionInput.text || '';
    if (!options || Object.keys(options).length === 0) {
      options = questionInput.options || questionInput;
    }
    if (!extraDataStr) {
      extraDataStr = questionInput.EXTRA_DATA || questionInput.extraData;
    }
    if (!answerKey) {
      answerKey = questionInput.ANSWER || questionInput.answer || '';
    }
  } else {
    questionText = String(questionInput || '');
  }

  if (typeof questionText !== 'string') {
    questionText = String(questionText || '');
  }

  let prompt = '';
  const leftItems: MatchingLeftItem[] = [];
  const rightItems: MatchingRightItem[] = [];
  const correctPairs = parseMatchingAnswer(answerKey);

  // 1. First, check if valid extraData exists
  let parsedExtraData: any = null;
  if (extraDataStr) {
    try {
      parsedExtraData = JSON.parse(extraDataStr);
    } catch (e) {}
  }

  // 2. Extract Right Items (Options A, B, C, D, E)
  if (parsedExtraData && Array.isArray(parsedExtraData.rightItems) && parsedExtraData.rightItems.length > 0) {
    parsedExtraData.rightItems.forEach((r: any, idx: number) => {
      const defaultKey = String.fromCharCode(65 + idx);
      const text = typeof r === 'string' ? r : r.text || '';
      const key = typeof r === 'object' && r.key ? r.key.toUpperCase() : defaultKey;
      const clean = cleanRightItemText(text) || text;
      rightItems.push({
        key,
        label: key,
        text: clean,
        rawText: text.startsWith(key) ? text : `${key}. ${clean}`
      });
    });
  } else {
    // Read from standard options
    const letters = ['A', 'B', 'C', 'D', 'E'] as const;
    letters.forEach(letter => {
      const val = options[letter] || options[`OPTION_${letter}`] || '';
      if (val && val.trim()) {
        const clean = cleanRightItemText(val.trim());
        rightItems.push({
          key: letter,
          label: letter,
          text: clean || val.trim(),
          rawText: val.trim().toUpperCase().startsWith(letter) ? val.trim() : `${letter}. ${clean || val.trim()}`
        });
      }
    });
  }

  // 3. Extract Left Items (Premises 1, 2, 3...)
  if (parsedExtraData && Array.isArray(parsedExtraData.leftItems) && parsedExtraData.leftItems.length > 0) {
    parsedExtraData.leftItems.forEach((item: any, idx: number) => {
      const defaultKey = String(idx + 1);
      const text = typeof item === 'string' ? item : item.text || '';
      const key = typeof item === 'object' && item.key ? String(item.key) : defaultKey;
      const clean = cleanLeftItemText(text) || text;
      leftItems.push({
        key,
        label: key,
        text: clean,
        rawText: text.match(/^\d+/) ? text : `${key}. ${clean}`
      });
    });
    prompt = parsedExtraData.prompt || questionText;
  } else {
    // Extract left items from questionText!
    // Teachers usually write either:
    // A) Multiline paragraphs:
    //    "Jodohkan pernyataan berikut:\n1. Barometer\n2. Anemometer\n3. Higrometer"
    // B) Single line separated by numbers:
    //    "Jodohkan istilah berikut: 1. Barometer, 2. Anemometer, 3. Higrometer"
    // C) Or HTML with <br> or <p> tags
    const normalizedQ = questionText
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();

    const rawLines = normalizedQ.split('\n').map(l => l.trim()).filter(Boolean);
    const promptLines: string[] = [];
    const extractedLines: string[] = [];

    rawLines.forEach(line => {
      // Check if line starts with a number e.g. "1. ", "1) ", "1 - "
      if (/^[1-9]\d*[\.\)\:\-–—\s]/.test(line)) {
        extractedLines.push(line);
      } else {
        // Check if inline numbered items exist within this line: e.g. "...: 1. Barometer, 2. Anemometer"
        const inlineMatches = Array.from(line.matchAll(/(?:^|[,;:\s]+)([1-9]\d*[\.\)\:\-–—]\s*[^,;\n]+)/g));
        if (inlineMatches.length >= 2) {
          // It contains multiple inline premises!
          // Prefix text before the first match is prompt
          const firstMatchIndex = line.indexOf(inlineMatches[0][1]);
          if (firstMatchIndex > 0) {
            const prefix = line.substring(0, firstMatchIndex).replace(/[:,\s]+$/, '').trim();
            if (prefix) promptLines.push(prefix);
          }
          inlineMatches.forEach(m => extractedLines.push(m[1].trim()));
        } else {
          promptLines.push(line);
        }
      }
    });

    if (extractedLines.length > 0) {
      extractedLines.forEach((raw, idx) => {
        const numMatch = raw.match(/^([1-9]\d*)[\.\)\:\-–—\s]*(.*)$/);
        const key = numMatch ? numMatch[1] : String(idx + 1);
        const rawContent = numMatch ? numMatch[2].trim() : raw;
        const clean = cleanLeftItemText(rawContent) || rawContent;
        leftItems.push({
          key,
          label: key,
          text: clean,
          rawText: `${key}. ${clean}`
        });
      });
      prompt = promptLines.join('\n').trim() || 'Jodohkan item di kolom kiri dengan pilihan di kolom kanan:';
    } else {
      // If no numbered premises found in question text, check keys in answerKey (e.g. "1-B; 2-C; 3-A")
      const answerKeys = Object.keys(correctPairs);
      const count = Math.max(answerKeys.length, rightItems.length, 2);
      for (let i = 1; i <= count; i++) {
        const k = String(i);
        leftItems.push({
          key: k,
          label: k,
          text: `Pernyataan / Item ${k}`,
          rawText: `${k}. Pernyataan / Item ${k}`
        });
      }
      prompt = questionText.trim() || 'Jodohkan item di kolom kiri dengan pilihan di kolom kanan:';
    }
  }

  // Ensure prompt is clean and friendly
  if (!prompt || prompt.trim() === '') {
    prompt = 'Jodohkan item di kolom kiri dengan pilihan di kolom kanan:';
  }

  return {
    prompt,
    leftItems,
    rightItems,
    correctPairs
  };
}

/**
 * Serializes prompt, leftItems, and rightItems into JSON for Question.EXTRA_DATA
 */
export function buildMatchingExtraData(
  prompt: string,
  leftItems: (string | { key?: string; text: string; [k: string]: any })[],
  rightItems: (string | { key?: string; text: string; [k: string]: any })[]
): string {
  const cleanLeft = leftItems.map((item, idx) => {
    if (typeof item === 'string') {
      const clean = cleanLeftItemText(item) || item;
      return `${idx + 1}. ${clean}`;
    }
    return `${item.key || idx + 1}. ${item.text}`;
  });

  const cleanRight = rightItems.map((opt, idx) => {
    const letter = String.fromCharCode(65 + idx);
    if (typeof opt === 'string') {
      const clean = cleanRightItemText(opt) || opt;
      return `${letter}. ${clean}`;
    }
    return `${opt.key || letter}. ${opt.text}`;
  });

  return JSON.stringify({
    prompt: prompt.trim(),
    leftItems: cleanLeft,
    rightItems: cleanRight
  });
}
