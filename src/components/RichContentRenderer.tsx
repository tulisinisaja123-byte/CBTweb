import React from 'react';
import { renderLatexInHtml } from '../utils/mathRenderer';

interface RichContentRendererProps {
  content: string;
  className?: string;
  inline?: boolean;
}

/**
 * Checks if a string contains Arabic characters
 */
export function hasArabicText(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text || '');
}

/**
 * Normalizes rich text content:
 * - Unescapes encoded HTML entities (&lt;img ...)
 * - Converts raw base64 data URIs into <img> tags
 * - Converts image URLs into <img> tags
 * - Converts markdown images ![alt](url) into <img> tags
 * - Converts bbcode/bracket tags [img]url[/img] or [gambar: url] into <img> tags
 */
export function normalizeRichContent(rawText: string): string {
  if (!rawText) return '';
  let text = String(rawText).trim();

  // 1. Unescape HTML entities if encoded HTML tags are found (e.g. &lt;img, &lt;p&gt;, &lt;br)
  if (/&lt;(?:img|p|div|span|b|i|strong|em|sup|sub|br|table|tr|td|ul|ol|li)\b/i.test(text)) {
    text = text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  }

  // 2. Convert markdown images: ![alt](url) -> <img src="url" alt="alt" />
  text = text.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+|data:image\/[^)]+)\)/gi, (_match, alt, url) => {
    return `<img src="${url}" alt="${alt || 'Gambar'}" />`;
  });

  // 3. Convert bbcode / bracket tags: [img]url[/img] or [gambar: url] or [image: url]
  text = text.replace(/\[img\]\s*(https?:\/\/[^\s\]]+|data:image\/[^\s\]]+)\s*\[\/img\]/gi, (_match, url) => {
    return `<img src="${url}" alt="Gambar" />`;
  });
  text = text.replace(/\[(?:gambar|image)\s*:\s*(https?:\/\/[^\s\]]+|data:image\/[^\s\]]+)\]/gi, (_match, url) => {
    return `<img src="${url}" alt="Gambar" />`;
  });

  // 4. Standalone raw data URI: data:image/...;base64,...
  if (/^data:image\/[a-zA-Z0-9\+\-]+;base64,[A-Za-z0-9+/=]+$/i.test(text)) {
    return `<img src="${text}" alt="Gambar Opsi" />`;
  }

  // 5. Standalone image URL: e.g. https://domain.com/pic.png or Google Drive or Cloudinary
  if (
    /^(?:https?:\/\/|www\.)[^\s]+?\.(?:png|jpe?g|gif|webp|svg|bmp)(?:\?[^\s]*)?$/i.test(text) ||
    /^https?:\/\/(?:drive\.google\.com\/uc\?|lh\d+\.googleusercontent\.com\/|i\.ibb\.co\/|res\.cloudinary\.com\/)[^\s]+$/i.test(text)
  ) {
    const src = text.startsWith('www.') ? `https://${text}` : text;
    return `<img src="${src}" alt="Gambar Opsi" />`;
  }

  return text;
}

/**
 * Checks if a string contains HTML tags (like <img>, <p>, <sup>, <sub>, etc.)
 */
export function hasHtmlTags(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text || '');
}

/**
 * Renders rich text content supporting Arabic scripts, math formulas (KaTeX), and embedded images.
 */
export const RichContentRenderer: React.FC<RichContentRendererProps> = ({
  content,
  className = '',
  inline = false
}) => {
  if (!content) return null;

  const normalized = normalizeRichContent(content);
  // Render LaTeX math formulas into KaTeX HTML
  const renderedContent = renderLatexInHtml(normalized);
  const isArabic = hasArabicText(renderedContent);
  const isHtml = hasHtmlTags(renderedContent);

  const arabicStyles = isArabic
    ? 'font-serif text-right text-lg sm:text-xl leading-loose tracking-wide'
    : '';

  const mathAndImgStyles =
    '[&_.katex]:text-[#1A1C1E] [&_.katex]:inline-block [&_.katex-display]:my-1.5 [&_.katex-display]:overflow-x-auto [&_.katex-display]:py-1 [&_img]:max-w-full [&_img]:object-contain [&_img]:rounded-lg [&_img]:border [&_img]:border-[#DEE2E6] [&_img]:my-1 [&_img]:inline-block [&_sup]:font-mono [&_sub]:font-mono';

  if (isHtml) {
    if (inline) {
      return (
        <span
          dir={isArabic ? 'auto' : 'ltr'}
          className={`rich-content inline-block ${arabicStyles} ${mathAndImgStyles} ${className} [&_img]:max-h-60`}
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
      );
    }

    return (
      <div
        dir={isArabic ? 'auto' : 'ltr'}
        className={`rich-content ${arabicStyles} ${mathAndImgStyles} ${className} [&_img]:max-h-80 [&_img]:my-2.5`}
        dangerouslySetInnerHTML={{ __html: renderedContent }}
      />
    );
  }

  if (inline) {
    return (
      <span
        dir={isArabic ? 'auto' : 'ltr'}
        className={`${arabicStyles} ${className}`}
      >
        {renderedContent}
      </span>
    );
  }

  return (
    <div
      dir={isArabic ? 'auto' : 'ltr'}
      className={`whitespace-pre-wrap ${arabicStyles} ${className}`}
    >
      {renderedContent}
    </div>
  );
};
