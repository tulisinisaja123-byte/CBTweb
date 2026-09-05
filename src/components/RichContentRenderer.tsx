import React from 'react';

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
 * Checks if a string contains HTML tags (like <img>, <p>, <sup>, <sub>, etc.)
 */
export function hasHtmlTags(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text || '');
}

/**
 * Renders rich text content supporting Arabic scripts, math symbols, and embedded images.
 */
export const RichContentRenderer: React.FC<RichContentRendererProps> = ({
  content,
  className = '',
  inline = false
}) => {
  if (!content) return null;

  const isArabic = hasArabicText(content);
  const isHtml = hasHtmlTags(content);

  const arabicStyles = isArabic
    ? 'font-serif text-right text-lg sm:text-xl leading-loose tracking-wide'
    : '';

  if (isHtml) {
    // Render sanitized HTML directly
    return (
      <div
        dir={isArabic ? 'auto' : 'ltr'}
        className={`rich-content ${arabicStyles} ${className} [&_img]:max-h-80 [&_img]:max-w-full [&_img]:object-contain [&_img]:rounded-lg [&_img]:border [&_img]:border-[#DEE2E6] [&_img]:my-2.5 [&_sup]:font-mono [&_sub]:font-mono`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  if (inline) {
    return (
      <span
        dir={isArabic ? 'auto' : 'ltr'}
        className={`${arabicStyles} ${className}`}
      >
        {content}
      </span>
    );
  }

  return (
    <div
      dir={isArabic ? 'auto' : 'ltr'}
      className={`whitespace-pre-wrap ${arabicStyles} ${className}`}
    >
      {content}
    </div>
  );
};
