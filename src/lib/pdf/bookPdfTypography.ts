import {
  bookBodyContinueClass,
  bookChapterTitleClass,
  bookPageBodyClass,
  bookPageClass,
  bookPageContentClass,
  bookPageShellClass,
  bookPageShellFlowClass,
} from "@/lib/pages/bookPageCss";
import { bookBodyFontFamilyVar } from "@/lib/typography/bodyFonts";

const bookBodyFontFamily = bookBodyFontFamilyVar;

/** 편집기 16px 대비 약 3배 — PDF에서 실제로 보이는 크기 (px 고정) */
export const BOOK_PDF_BODY_PX = 48;
export const BOOK_PDF_LINE_HEIGHT = 1.7;

export function bookPdfTypographyCss() {
  const body = BOOK_PDF_BODY_PX;
  const lh = BOOK_PDF_LINE_HEIGHT;
  const page = `.${bookPageClass}`;
  const content = `.${bookPageClass}.${bookPageContentClass}`;
  const bodyRoot = `.${bookPageBodyClass}`;

  return `
    html {
      font-size: ${body}px;
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }
    body {
      font-size: ${body}px;
      font-family: ${bookBodyFontFamily};
    }
    .${bookPageShellClass} {
      display: block !important;
      width: 210mm !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    ${page} {
      box-sizing: border-box !important;
      font-family: ${bookBodyFontFamily} !important;
      font-size: ${body}px !important;
      line-height: ${lh} !important;
      padding: 12mm 10mm !important;
      width: 210mm !important;
      height: 297mm !important;
      min-height: 297mm !important;
      max-height: 297mm !important;
      margin: 0 !important;
      overflow: hidden !important;
      color: #1c1917 !important;
    }
    ${page} ${bodyRoot},
    ${page} ${bodyRoot} * {
      font-size: inherit;
    }
    ${content} h1,
    ${content} h1.${bookChapterTitleClass} {
      font-size: ${Math.round(body * 1.45)}px !important;
      line-height: 1.35 !important;
      font-weight: 700 !important;
    }
    ${content} h2 {
      font-size: ${Math.round(body * 1.2)}px !important;
      line-height: 1.35 !important;
      font-weight: 600 !important;
    }
    ${content} h3 {
      font-size: ${Math.round(body * 1.05)}px !important;
      line-height: 1.4 !important;
      font-weight: 600 !important;
    }
    ${content} p,
    ${content} p.book-body-p,
    ${content} li,
    ${page}.${bookPageContentClass} ${bodyRoot} p {
      font-size: ${body}px !important;
      line-height: ${lh} !important;
      letter-spacing: 0 !important;
      word-spacing: normal !important;
      text-indent: 1em !important;
      margin: 0 !important;
    }
    ${content} p.${bookBodyContinueClass} {
      text-indent: 0 !important;
    }
    ${content} blockquote,
    ${content} blockquote p {
      font-size: ${Math.round(body * 0.92)}px !important;
      line-height: ${lh} !important;
    }
    .${bookPageShellFlowClass} ${bodyRoot} {
      height: 100% !important;
      max-height: 100% !important;
    }
  `;
}
