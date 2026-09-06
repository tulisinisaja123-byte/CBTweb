import katex from 'katex';

/**
 * Checks if the string contains candidate math indicators:
 * LaTeX macros, delimiters ($, $$, \(, \[, [math]), or common math symbols.
 */
export function hasMathIndicators(text: string): boolean {
  if (!text) return false;
  return (
    text.includes('$') ||
    text.includes('\\(') ||
    text.includes('\\[') ||
    text.includes('[math') ||
    text.includes('[latex') ||
    text.includes('^') ||
    text.includes('√') ||
    text.includes('∑') ||
    text.includes('∫') ||
    text.includes('±') ||
    /\\(?:frac|sqrt|sum|int|pm|times|div|cdot|leq|geq|neq|approx|alpha|beta|gamma|theta|pi|lambda|sigma|omega|Delta|infty|lim|sin|cos|tan|log|ln|vec|hat|bar|text|mathbf|mathrm)\b/.test(text)
  );
}

/**
 * Unescapes HTML entities for KaTeX consumption
 */
function cleanLatexSource(latex: string): string {
  let clean = latex
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();

  // If escaped with double backslashes for commands, normalize \\\\sqrt -> \sqrt
  clean = clean.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
  return clean;
}

/**
 * Renders a single LaTeX expression using KaTeX.
 * Gracefully falls back to styled typography if KaTeX errors.
 */
export function renderSingleLatex(latex: string, displayMode = false): string {
  const clean = cleanLatexSource(latex);
  if (!clean) return '';

  try {
    return katex.renderToString(clean, {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml'
    });
  } catch {
    return `<span class="katex-fallback font-serif italic text-[#1A1C1E] px-0.5">${clean}</span>`;
  }
}

/**
 * Tests if the content inside $...$ looks like an actual math expression
 * rather than accidental currency (e.g. "$100" or "$ 50").
 */
function isProbableMath(content: string): boolean {
  if (!content) return false;
  const trimmed = content.trim();

  // Pure digits or currency amounts like "100" or "50,000" are not math
  if (/^\d+(?:[.,]\d+)?$/.test(trimmed)) {
    return false;
  }

  // Contains LaTeX macro
  if (/\\(?:[a-zA-Z]+|[,\.;])/.test(trimmed)) {
    return true;
  }

  // Contains math operators or superscripts/subscripts
  if (/[\^_\=+\-\/\*<>~±×÷≤≥≠≈∈∉⊂∪∩√°]/.test(trimmed)) {
    return true;
  }

  // Typical math variable expressions (e.g., "x", "f(x)", "2x", "a + b", "x_1")
  if (/^[a-zA-Z](?:\([a-zA-Z0-9,\s]+\))?$/.test(trimmed)) {
    return true;
  }
  if (/^\d*[a-zA-Z](?:\s*[\+\-\=\<\>]\s*\d*[a-zA-Z0-9])*$/.test(trimmed)) {
    return true;
  }

  // If it has spaces with regular multi-word sentence text without operators, reject
  if (/\b(?:dan|atau|adalah|yang|dari|pada|ke|di|dengan|untuk)\b/i.test(trimmed)) {
    return false;
  }

  return true;
}

/**
 * Processes text content (outside HTML tags) to replace math expressions with KaTeX HTML.
 */
export function processMathInText(text: string): string {
  if (!text) return '';

  let result = text;

  // 1. Block delimiters: $$ ... $$
  result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_match, eq) => {
    return renderSingleLatex(eq, true);
  });

  // 2. Block delimiters: \[ ... \]
  result = result.replace(/\\\[([\s\S]+?)\\\]/g, (_match, eq) => {
    return renderSingleLatex(eq, true);
  });

  // 3. LaTeX environments: \begin{equation} ... \end{equation}, \begin{align} ...
  result = result.replace(/(\\begin\{(?:equation|align|matrix|pmatrix|bmatrix|cases|aligned)\*?\}[\s\S]+?\\end\{(?:equation|align|matrix|pmatrix|bmatrix|cases|aligned)\*?\})/g, (_match, eq) => {
    return renderSingleLatex(eq, true);
  });

  // 4. Bracket tags: [math-block] ... [/math-block]
  result = result.replace(/\[math-block\]([\s\S]+?)\[\/math-block\]/gi, (_match, eq) => {
    return renderSingleLatex(eq, true);
  });

  // 5. Inline delimiters: \( ... \)
  result = result.replace(/\\\(([\s\S]+?)\\\)/g, (_match, eq) => {
    return renderSingleLatex(eq, false);
  });

  // 6. Bracket tags: [math] ... [/math] or [latex] ... [/latex]
  result = result.replace(/\[(?:math|latex)\]([\s\S]+?)\[\/(?:math|latex)\]/gi, (_match, eq) => {
    return renderSingleLatex(eq, false);
  });

  // 7. Inline delimiters: $ ... $ (safe against escaped \$ and currency, supports spaces and multiline)
  result = result.replace(/(^|[^\\])\$([^\$]+?)\$/g, (match, prefix, rawEq) => {
    const eq = rawEq.trim();
    if (eq && isProbableMath(eq)) {
      return `${prefix}${renderSingleLatex(eq, false)}`;
    }
    return match;
  });

  // 8. Standalone raw LaTeX or algebraic expressions without delimiters
  // e.g. "\sqrt{12} \sum_{2}^{n}", "\frac{1}{2}", "3\sqrt{2}", "x^2 + 5x + 6 = 0"
  if (!result.includes('class="katex"')) {
    const trimmed = result.trim();
    if (
      /\\(?:frac|sqrt|pm|times|div|cdot|leq|geq|neq|approx|alpha|beta|gamma|theta|pi|lambda|sigma|omega|Delta|infty|int|sum|prod|lim|sin|cos|tan|log|ln)\b/.test(trimmed)
    ) {
      result = renderSingleLatex(trimmed, false);
    } else if (
      /[\^_]/.test(trimmed) &&
      /^[a-zA-Z0-9\(\)]+(?:\s*[\^_\+\-\*\/\=]\s*[a-zA-Z0-9\(\)]+)+$/.test(trimmed) &&
      !/\b(?:dan|atau|adalah|yang|dari|pada|ke|di)\b/i.test(trimmed)
    ) {
      result = renderSingleLatex(trimmed, false);
    }
  }

  return result;
}

/**
 * Parses and renders LaTeX equations in an HTML string or plain text.
 * Preserves existing HTML tags (like <img>, <br>, <b>, <p>) while converting
 * math expressions into KaTeX HTML elements.
 */
export function renderLatexInHtml(html: string): string {
  if (!html) return '';

  if (!hasMathIndicators(html)) {
    return html;
  }

  // Tokenize by HTML tags: e.g. ["Hello ", "<b>", "world $x^2$", "</b>"]
  const tokens = html.split(/(<[^>]+>)/g);
  for (let i = 0; i < tokens.length; i++) {
    // Process only text nodes outside tags
    if (tokens[i] && !tokens[i].startsWith('<')) {
      tokens[i] = processMathInText(tokens[i]);
    }
  }

  return tokens.join('');
}
