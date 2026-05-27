import { bookBodyFontFamily } from "@/lib/typography/bookStyles";

/** A4 기준 — 210×297mm, 편집·EPUB·리더 동일 페이지 크기 */
export const BOOK_PAGE_REF_WIDTH = "42rem";
export const BOOK_PAGE_ASPECT = "297 / 210";
export const BOOK_PAGE_WIDTH_VAR = "--book-page-w";
export const BOOK_PAGE_HEIGHT_VAR = "--book-page-h";

export const bookPageClass = "book-page";
export const bookPageBodyClass = "book-page__body";
export const bookPageShellClass = "book-page-shell";
export const bookPageCoverClass = "book-page--cover";
export const bookPageBookCoverClass = "book-page--book-cover";
export const bookBookTitleClass = "book-book-title";
export const bookPageContentClass = "book-page--content";
export const bookPageQuoteClass = "book-page--quote";
export const bookChapterTitleClass = "book-chapter-title";
export const bookQuotePageClass = "book-quote-page";
export const bookQuoteTextClass = "book-quote-text";
export const bookQuoteSourceClass = "book-quote-source";

function pageBoxCss(p: string, important = false) {
  const i = important ? " !important" : "";

  return `
    ${p}.${bookPageClass} {
      box-sizing: border-box${i};
      width: min(100%, var(${BOOK_PAGE_WIDTH_VAR}, 672px))${i};
      height: var(${BOOK_PAGE_HEIGHT_VAR}, 950px)${i};
      min-height: var(${BOOK_PAGE_HEIGHT_VAR}, 950px)${i};
      max-height: var(${BOOK_PAGE_HEIGHT_VAR}, 950px)${i};
      margin: 0 auto${i};
      padding: 2.5rem 2rem${i};
      background-color: #ffffff${i};
      font-family: ${bookBodyFontFamily}${i};
      font-size: 100%${i};
      line-height: 1.75${i};
      color: #1c1917${i};
      overflow: hidden${i};
      position: relative${i};
      flex-shrink: 0${i};
    }
    ${p}.${bookPageBodyClass} {
      box-sizing: border-box${i};
      height: 100%${i};
      max-height: 100%${i};
      overflow-x: hidden${i};
      overflow-y: auto${i};
      -webkit-overflow-scrolling: touch${i};
    }
    ${p}.${bookPageCoverClass} {
      background-color: #f5f5f4${i};
      display: flex${i};
      flex-direction: column${i};
      align-items: flex-start${i};
      justify-content: flex-start${i};
      padding-top: 3rem${i};
    }
    ${p}.${bookPageCoverClass} .${bookPageBodyClass} {
      overflow: hidden${i};
    }
    ${p}.${bookPageCoverClass} h1.${bookChapterTitleClass} {
      display: inline-block${i};
      box-sizing: border-box${i};
      max-width: 100%${i};
      margin: 0${i};
      padding: 1.1em 1.75em${i};
      border: 2px solid #1c1917${i};
      font-family: var(--wbs-font-chapter, ${bookBodyFontFamily})${i};
      font-size: 1.55em${i};
      font-weight: 700${i};
      line-height: 1.45${i};
      text-align: left${i};
      white-space: pre-line${i};
      overflow-wrap: anywhere${i};
      word-break: keep-all${i};
      color: #0c0a09${i};
    }
    ${p}.${bookPageBookCoverClass} {
      display: flex${i};
      flex-direction: column${i};
      align-items: stretch${i};
      justify-content: flex-start${i};
      background-color: var(--book-cover-bg, #2d4a6f)${i};
      padding: 5.5rem 2rem 2.5rem 3rem${i};
    }
    ${p}.${bookPageBookCoverClass} .${bookPageBodyClass} {
      overflow: hidden${i};
    }
    ${p}.${bookPageBookCoverClass} h1.${bookBookTitleClass} {
      margin: 0${i};
      max-width: 100%${i};
      font-family: var(--wbs-font-chapter, ${bookBodyFontFamily})${i};
      font-size: clamp(1.75rem, 6vw, 2.75rem)${i};
      font-weight: 700${i};
      line-height: 1.25${i};
      letter-spacing: -0.02em${i};
      text-align: left${i};
      white-space: pre-line${i};
      overflow-wrap: anywhere${i};
      word-break: keep-all${i};
      color: var(--book-cover-title-color, #ffffff)${i};
    }
    ${p}.${bookPageBookCoverClass} .book-book-subtitle {
      margin: 1.25rem 0 0${i};
      max-width: 100%${i};
      font-size: 1.05rem${i};
      line-height: 1.5${i};
      color: var(--book-cover-title-color, #ffffff)${i};
      opacity: 0.85${i};
      white-space: pre-line${i};
      overflow-wrap: anywhere${i};
      word-break: keep-all${i};
    }
    ${quotePageCss(p, i)}
  `;
}

function quotePageCss(p: string, i: string) {
  return `
    ${p}.${bookPageQuoteClass} {
      background-color: #ffffff${i};
    }
    ${p}.${bookPageQuoteClass} .${bookPageBodyClass} {
      display: flex${i};
      flex-direction: column${i};
      justify-content: center${i};
      align-items: flex-end${i};
      overflow: hidden${i};
    }
    ${p} .${bookQuotePageClass} {
      box-sizing: border-box${i};
      width: 100%${i};
      max-width: 85%${i};
      text-align: right${i};
    }
    ${p} .${bookQuoteTextClass} {
      margin: 0 0 1.25em${i};
      padding: 0${i};
      border: none${i};
      font-size: 1.05em${i};
      line-height: 1.65${i};
      font-style: italic${i};
      color: #292524${i};
      white-space: pre-line${i};
      overflow-wrap: anywhere${i};
      word-break: keep-all${i};
    }
    ${p} .${bookQuoteSourceClass} {
      margin: 0${i};
      font-size: 0.9em${i};
      line-height: 1.5${i};
      color: #78716c${i};
      white-space: pre-line${i};
      overflow-wrap: anywhere${i};
      word-break: keep-all${i};
    }
  `;
}

export function bookPageCanvasCss(scope = "") {
  const p = scope ? `${scope} ` : "";

  return `
    ${p}.${bookPageShellClass} {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
      box-sizing: border-box;
      width: 100%;
      max-width: ${BOOK_PAGE_REF_WIDTH};
      margin: 0 auto;
    }
    ${pageBoxCss(p)}
  `;
}

/** EPUB·리더 */
export function bookPageReaderCss(important = false) {
  const i = important ? " !important" : "";

  return `
    ${bookPageCanvasCss()}
    ${pageBoxCss("", important)}
    .${bookPageClass} {
      page-break-after: always${i};
      break-after: page${i};
      -webkit-column-break-after: always${i};
    }
    body {
      margin: 0${i};
      padding: 1rem${i};
      background-color: #fafaf9${i};
    }
    @media (min-width: 640px) {
      body { padding: 1.5rem${i}; }
    }
  `;
}

export function bookPageEditorShellCss() {
  return `
    .book-page-editor-scroll {
      flex: 1;
      overflow-y: auto;
      background-color: #fafaf9;
      padding: 1.5rem;
    }
    .book-page-editor-scroll .${bookPageClass} {
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.08), 0 6px 20px rgb(0 0 0 / 0.06);
      border-radius: 2px;
    }
    .book-page--content .ProseMirror {
      min-height: 100%;
      outline: none;
    }
    .book-page--quote textarea {
      display: block;
      width: 100%;
      resize: none;
      border: none;
      background: transparent;
      outline: none;
      font-family: inherit;
    }
    .book-page--quote textarea.book-quote-text {
      min-height: 3.5em;
    }
    .book-page--quote textarea.book-quote-text::placeholder,
    .book-page--quote textarea.book-quote-source::placeholder {
      color: #d6d3d1;
    }
    .book-page--quote textarea.book-quote-source {
      min-height: 1.5em;
    }
  `;
}

/** shell 기준으로 모든 페이지 동일 너비·높이 (A4 비율) */
export function syncBookPageMetrics(shell: HTMLElement) {
  const w = shell.clientWidth;
  if (w <= 0) return;
  const h = Math.round(w * (297 / 210));
  shell.style.setProperty(BOOK_PAGE_WIDTH_VAR, `${w}px`);
  shell.style.setProperty(BOOK_PAGE_HEIGHT_VAR, `${h}px`);
}
