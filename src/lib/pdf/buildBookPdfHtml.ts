import { normalizeBookCoverStyle } from "@/lib/books/coverStyle";
import { parseChapterContent } from "@/lib/pages/content";
import {
  bookPageClass,
  bookPageContentClass,
  bookPageShellClass,
} from "@/lib/pages/bookPageCss";
import type { Book, Chapter, WritingMode } from "@/lib/types/database";
import {
  buildBookCoverEpubHtml,
  buildPageEpubHtml,
} from "@/lib/typography/pageLayout";
import { bookPdfTypographyCss } from "@/lib/pdf/bookPdfTypography";
import {
  bookTypographyFontFaceCss,
  bodyFontFamily,
  normalizeBookBodyFont,
  type BookBodyFont,
} from "@/lib/typography/bodyFonts";
import {
  headingFontFamily,
  normalizeBookHeadingFonts,
  type BookHeadingFonts,
} from "@/lib/typography/headingFonts";

function writingModeCss(mode: WritingMode) {
  if (mode === "vertical-rl") {
    return `body { writing-mode: vertical-rl; text-orientation: mixed; }`;
  }
  return "";
}

function bookPdfPrintCss() {
  return `
    @page {
      size: A4;
      margin: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #fafaf9;
    }
    .${bookPageShellClass} {
      page-break-after: always;
      break-after: page;
      display: block !important;
      width: 210mm !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      gap: 0 !important;
    }
    .${bookPageShellClass}:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .${bookPageClass} {
      width: 210mm !important;
      height: 297mm !important;
      min-height: 297mm !important;
      max-height: 297mm !important;
      margin: 0 !important;
      box-shadow: none !important;
      overflow: hidden !important;
    }
  `;
}

function collectPageHtml(
  book: Pick<
    Book,
    "title" | "subtitle" | "cover_bg_color" | "cover_title_color"
  >,
  chapters: Pick<Chapter, "title" | "content_json" | "content_html">[],
  coverImageUrl?: string | null,
): string {
  const coverStyle = normalizeBookCoverStyle(book);
  const parts: string[] = [
    buildBookCoverEpubHtml(
      book.title,
      book.subtitle,
      coverStyle,
      coverImageUrl,
    ),
  ];

  for (const chapter of chapters) {
    const parsed = parseChapterContent(
      chapter.content_json,
      chapter.title,
      chapter.content_html,
    );
    for (const page of parsed.pages) {
      parts.push(buildPageEpubHtml(page, chapter.title));
    }
  }

  return parts.join("\n");
}

export function buildBookPdfHtml(
  book: Pick<
    Book,
    | "title"
    | "subtitle"
    | "writing_mode"
    | "cover_bg_color"
    | "cover_title_color"
    | "heading_fonts"
    | "body_font"
  >,
  chapters: Pick<Chapter, "title" | "content_json" | "content_html">[],
  coverImageUrl?: string | null,
): string {
  const headingFonts: BookHeadingFonts = normalizeBookHeadingFonts(
    book.heading_fonts,
  );
  const bodyFont: BookBodyFont = normalizeBookBodyFont(book.body_font);
  const bodyInner = collectPageHtml(book, chapters, coverImageUrl);
  const printCss = bookPdfPrintCss();
  const pdfType = bookPdfTypographyCss();
  const headingVars = `
    :root {
      --wbs-font-body: ${bodyFontFamily(bodyFont)};
      --wbs-font-chapter: ${headingFontFamily(headingFonts.chapterTitle)};
      --wbs-font-h2: ${headingFontFamily(headingFonts.heading2)};
      --wbs-font-h3: ${headingFontFamily(headingFonts.heading3)};
    }
    .${bookPageContentClass} h1 { font-family: var(--wbs-font-chapter, ${headingFontFamily("serif")}); }
    .${bookPageContentClass} h2 { font-family: var(--wbs-font-h2, ${headingFontFamily("serif")}); }
    .${bookPageContentClass} h3 { font-family: var(--wbs-font-h3, ${headingFontFamily("serif")}); }
  `;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(book.title)}</title>
  <style>
    ${bookTypographyFontFaceCss(headingFonts, bodyFont)}
    ${headingVars}
    ${writingModeCss(book.writing_mode)}
    ${printCss}
    ${pdfType}
  </style>
</head>
<body>
  ${bodyInner}
</body>
</html>`;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
