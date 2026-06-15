import { bookBodyFontFamily } from "@/lib/typography/bookStyles";

/** A4 기준 — 210×297mm, 편집·EPUB·리더 동일 페이지 크기 */
export const BOOK_PAGE_REF_WIDTH = "42rem";
export const BOOK_PAGE_ASPECT = "297 / 210";
/** 이미지 표지 — 본문 페이지보다 작게, 책 한 권 크기 */
export const BOOK_COVER_IMAGE_MAX_WIDTH = "min(100%, 22rem)";
export const BOOK_COVER_IMAGE_MAX_HEIGHT = "min(68vh, 32rem)";
export const BOOK_PAGE_WIDTH_VAR = "--book-page-w";
export const BOOK_PAGE_HEIGHT_VAR = "--book-page-h";
/** 리더 뷰포트 — EpubViewer가 px로 주입 */
export const READER_VIEWPORT_W_VAR = "--wbs-reader-vw";
export const READER_VIEWPORT_H_VAR = "--wbs-reader-vh";

export const bookPageShellFlowClass = "book-page-shell--flow";
export const bookPageShellSplashClass = "book-page-shell--splash";

export type ReaderPageLayoutMode = "scroll" | "paginated";

export const bookPageClass = "book-page";
export const bookPageBodyClass = "book-page__body";
/** 독자 페이지 모드 — 이전 화면에서 이어지는 첫 문단(들여쓰기 없음) */
export const bookBodyContinueClass = "book-body-p--continue";
export const bookPageShellClass = "book-page-shell";
export const bookPageCoverClass = "book-page--cover";
export const bookPageBookCoverClass = "book-page--book-cover";
export const bookPageBookCoverImageClass = "book-page--book-cover-image";
export const bookCoverImageClass = "book-cover-image";
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
      overflow: hidden${i};
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
      text-align: left${i};
      color: var(--book-cover-title-color, #ffffff)${i};
      opacity: 0.85${i};
      white-space: pre-line${i};
      overflow-wrap: anywhere${i};
      word-break: keep-all${i};
    }
    ${quotePageCss(p, i)}
    ${bookCoverImagePageCss(p, important)}
  `;
}

/** 책 표지 이미지 — 가운데, 책 크기로 (전체 너비 X) */
export function bookCoverImagePageCss(scope: string, important = false) {
  const p = scope ? `${scope} ` : "";
  const i = important ? " !important" : "";

  return `
    ${p}.${bookPageBookCoverClass}.${bookPageBookCoverImageClass} {
      display: flex${i};
      flex-direction: column${i};
      align-items: center${i};
      justify-content: center${i};
      box-sizing: border-box${i};
      width: 100%${i};
      max-width: 100%${i};
      min-height: min(72vh, 34rem)${i};
      padding: 2.5rem 1.25rem${i};
      background-color: #fafaf9${i};
      overflow: visible${i};
    }
    ${p}.${bookPageBookCoverClass}.${bookPageBookCoverImageClass} .${bookCoverImageClass} {
      display: block${i};
      width: auto${i};
      max-width: ${BOOK_COVER_IMAGE_MAX_WIDTH}${i};
      height: auto${i};
      max-height: ${BOOK_COVER_IMAGE_MAX_HEIGHT}${i};
      object-fit: contain${i};
      object-position: center center${i};
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.08), 0 8px 28px rgb(0 0 0 / 0.1)${i};
      border-radius: 2px${i};
    }
  `;
}

/** 스크롤 리더 — 표지·장표지·명언 (가로 100%, pageBoxCss 본문 규칙 제외) */
export function bookPageScrollSplashPageCss(scope: string, important = false) {
  const p = scope ? `${scope} ` : "";
  const i = important ? " !important" : "";

  return `
    ${p}.${bookPageShellSplashClass} .${bookPageClass}:not(.${bookPageBookCoverImageClass}) {
      box-sizing: border-box${i};
      width: 100%${i};
      max-width: none${i};
      min-width: 100%${i};
      margin: 0${i};
      min-height: var(${BOOK_PAGE_HEIGHT_VAR}, var(${READER_VIEWPORT_H_VAR}, 100dvh))${i};
      height: var(${BOOK_PAGE_HEIGHT_VAR}, var(${READER_VIEWPORT_H_VAR}, 100dvh))${i};
      max-height: var(${BOOK_PAGE_HEIGHT_VAR}, var(${READER_VIEWPORT_H_VAR}, 100dvh))${i};
      flex-shrink: 0${i};
      overflow: hidden${i};
      position: relative${i};
      font-family: ${bookBodyFontFamily}${i};
      font-size: 100%${i};
      line-height: 1.75${i};
    }
    ${p}.${bookPageCoverClass} {
      background-color: #f5f5f4${i};
      display: flex${i};
      flex-direction: column${i};
      align-items: flex-start${i};
      justify-content: flex-start${i};
      padding: 3rem 2rem 2.5rem${i};
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
      text-align: left${i};
      color: var(--book-cover-title-color, #ffffff)${i};
      opacity: 0.85${i};
      white-space: pre-line${i};
      overflow-wrap: anywhere${i};
      word-break: keep-all${i};
    }
    ${quotePageCss(p, i)}
    ${bookCoverImagePageCss(p, important)}
    ${p}.${bookPageBookCoverClass}.${bookPageBookCoverImageClass} {
      height: auto${i};
      min-height: 0${i};
      max-height: none${i};
      overflow: visible${i};
    }
  `;
}

/** 명언 페이지 — 가운데 정렬·본문 스크롤 (페이지 박스 크기는 pageBoxCss와 동일) */
export function bookPageQuoteInnerCss(scope: string, important = false) {
  const p = scope ? `${scope} ` : "";
  const i = important ? " !important" : "";
  return quotePageCss(p, i);
}

function quotePageCss(p: string, i: string) {
  return `
    ${p}.${bookPageQuoteClass} .${bookPageBodyClass} {
      display: flex${i};
      flex-direction: column${i};
      align-items: center${i};
      height: 100%${i};
      max-height: 100%${i};
      overflow-x: hidden${i};
      overflow-y: auto${i};
      -webkit-overflow-scrolling: touch${i};
    }
    ${p} .${bookQuotePageClass} {
      box-sizing: border-box${i};
      width: 100%${i};
      max-width: 85%${i};
      margin-block: auto${i};
      flex-shrink: 0${i};
      text-align: center${i};
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

/** EPUB iframe — html/body (스크롤은 epub-container) */
function bookPageReaderScrollRootCss(important = false) {
  const i = important ? " !important" : "";

  return `
    html {
      height: auto${i};
      overflow-y: visible${i};
      scrollbar-width: none${i};
      -ms-overflow-style: none${i};
    }
    html::-webkit-scrollbar {
      display: none${i};
      width: 0${i};
      height: 0${i};
    }
    body {
      margin: 0${i};
      padding: 0${i};
      background-color: #fafaf9${i};
      min-height: 0${i};
      overflow-x: hidden${i};
      overflow-y: visible${i};
      scrollbar-width: none${i};
      -ms-overflow-style: none${i};
      display: flex${i};
      flex-direction: column${i};
      align-items: stretch${i};
    }
    body::-webkit-scrollbar {
      display: none${i};
      width: 0${i};
      height: 0${i};
    }
  `;
}

/** 스크롤 레이아웃 — HTML 한 덩어리·EPUB continuous 공통 (html/body 규칙 없음) */
export function bookPageReaderScrollLayoutCss(important = false) {
  const i = important ? " !important" : "";

  return `
    .${bookPageShellClass} {
      width: 100%${i};
      max-width: none${i};
      flex-shrink: 0${i};
      box-sizing: border-box${i};
      gap: 0${i};
    }
    .${bookPageShellFlowClass} {
      margin-bottom: 1.25rem${i};
    }
    .${bookPageShellFlowClass}:last-child {
      margin-bottom: 0${i};
    }
    .${bookPageShellClass} .${bookPageClass} {
      width: var(${BOOK_PAGE_WIDTH_VAR}, 100%)${i};
      max-width: 100%${i};
    }
    .${bookPageShellClass}:not(.${bookPageShellSplashClass}) .${bookPageClass}.${bookPageContentClass} {
      height: auto${i};
      min-height: var(${BOOK_PAGE_HEIGHT_VAR}, 12rem)${i};
      max-height: none${i};
      overflow: visible${i};
    }
    .${bookPageShellClass}:not(.${bookPageShellSplashClass}) .${bookPageClass}.${bookPageContentClass} .${bookPageBodyClass} {
      height: auto${i};
      max-height: none${i};
      overflow: visible${i};
    }
    .${bookPageShellSplashClass} .${bookPageClass}:not(.${bookPageBookCoverImageClass}) {
      width: var(${BOOK_PAGE_WIDTH_VAR}, 100%)${i};
      height: var(${BOOK_PAGE_HEIGHT_VAR}, var(${READER_VIEWPORT_H_VAR}, 100vh))${i};
      min-height: var(${BOOK_PAGE_HEIGHT_VAR}, var(${READER_VIEWPORT_H_VAR}, 100vh))${i};
      max-height: var(${BOOK_PAGE_HEIGHT_VAR}, var(${READER_VIEWPORT_H_VAR}, 100vh))${i};
    }
    .${bookPageShellSplashClass} .${bookPageCoverClass},
    .${bookPageShellSplashClass} .${bookPageBookCoverClass} {
      align-items: flex-start${i};
      justify-content: flex-start${i};
    }
    .${bookPageShellSplashClass} .${bookPageCoverClass} h1.${bookChapterTitleClass} {
      margin: 0${i};
      text-align: left${i};
    }
    .${bookPageShellSplashClass} .${bookPageBookCoverClass} h1.${bookBookTitleClass},
    .${bookPageShellSplashClass} .${bookPageBookCoverClass} .book-book-subtitle {
      text-align: left${i};
    }
    .${bookPageShellClass}:not(.${bookPageShellSplashClass}) .${bookPageClass}.${bookPageQuoteClass} {
      height: var(${BOOK_PAGE_HEIGHT_VAR}, 950px)${i};
      min-height: var(${BOOK_PAGE_HEIGHT_VAR}, 950px)${i};
      max-height: var(${BOOK_PAGE_HEIGHT_VAR}, 950px)${i};
      overflow: hidden${i};
    }
    .${bookPageShellSplashClass}:only-child {
      min-height: var(${READER_VIEWPORT_H_VAR}, 100dvh)${i};
    }
  `;
}

/** HTML 스크롤 리더 — 뷰포트 안에서만, 페이지 가로 100% (672px·auto 마진 없음) */
export function bookPageHtmlScrollLayoutCss(important = false) {
  const scope = ".reader-scroll-viewport--scroll .reader-scroll-surface";
  const i = important ? " !important" : "";

  return `
    ${scope} .${bookPageShellClass} {
      width: 100%${i};
      max-width: none${i};
      min-width: 100%${i};
      margin-left: 0${i};
      margin-right: 0${i};
      flex-shrink: 0${i};
      box-sizing: border-box${i};
      gap: 0${i};
      align-items: stretch${i};
    }
    ${scope} .${bookPageShellFlowClass} {
      margin-bottom: 1.25rem${i};
    }
    ${scope} .${bookPageShellFlowClass}:last-child {
      margin-bottom: 0${i};
    }
    ${scope} .${bookPageShellClass} .${bookPageClass} {
      width: 100%${i};
      max-width: none${i};
      min-width: 100%${i};
      margin-left: 0${i};
      margin-right: 0${i};
    }
    ${scope} .${bookPageShellClass}:not(.${bookPageShellSplashClass}) .${bookPageClass}.${bookPageContentClass} {
      height: auto${i};
      min-height: var(${BOOK_PAGE_HEIGHT_VAR}, 12rem)${i};
      max-height: none${i};
      overflow: visible${i};
    }
    ${scope} .${bookPageShellClass}:not(.${bookPageShellSplashClass}) .${bookPageClass}.${bookPageContentClass} .${bookPageBodyClass} {
      height: auto${i};
      max-height: none${i};
      overflow: visible${i};
    }
    ${scope} .${bookPageShellSplashClass} .${bookPageClass}:not(.${bookPageBookCoverImageClass}) {
      width: 100%${i};
      max-width: none${i};
      min-width: 100%${i};
      height: var(${BOOK_PAGE_HEIGHT_VAR}, var(${READER_VIEWPORT_H_VAR}, 100dvh))${i};
      min-height: var(${BOOK_PAGE_HEIGHT_VAR}, var(${READER_VIEWPORT_H_VAR}, 100dvh))${i};
      max-height: var(${BOOK_PAGE_HEIGHT_VAR}, var(${READER_VIEWPORT_H_VAR}, 100dvh))${i};
    }
    ${scope} .${bookPageShellSplashClass} .${bookPageCoverClass},
    ${scope} .${bookPageShellSplashClass} .${bookPageBookCoverClass} {
      align-items: flex-start${i};
      justify-content: flex-start${i};
    }
    ${scope} .${bookPageShellSplashClass} .${bookPageCoverClass} h1.${bookChapterTitleClass} {
      margin: 0${i};
      text-align: left${i};
    }
    ${scope} .${bookPageShellSplashClass} .${bookPageBookCoverClass} h1.${bookBookTitleClass},
    ${scope} .${bookPageShellSplashClass} .${bookPageBookCoverClass} .book-book-subtitle {
      text-align: left${i};
    }
    ${scope} .${bookPageShellClass}:not(.${bookPageShellSplashClass}) .${bookPageClass}.${bookPageQuoteClass} {
      height: var(${BOOK_PAGE_HEIGHT_VAR}, 950px)${i};
      min-height: var(${BOOK_PAGE_HEIGHT_VAR}, 950px)${i};
      max-height: var(${BOOK_PAGE_HEIGHT_VAR}, 950px)${i};
      overflow: hidden${i};
    }
    ${scope} .${bookPageShellSplashClass}:only-child {
      min-height: var(${READER_VIEWPORT_H_VAR}, 100dvh)${i};
    }
    ${bookCoverImagePageCss(scope, important)}
  `;
}

/** EPUB·리더 — 스크롤: 세로 흰 종이 + 본문 장 간격 / 장·명언·표지 = 한 화면 높이 */
export function bookPageReaderScrollCss(important = false) {
  return `${bookPageReaderScrollRootCss(important)}${bookPageReaderScrollLayoutCss(important)}`;
}

/** HTML 스크롤 리더 페이지 모드 — 뷰포트 내부만 (전역 html/body 규칙 없음) */
export function bookPageReaderPaginatedInViewportCss(important = false) {
  const scope = ".reader-scroll-viewport--paginated";
  const i = important ? " !important" : "";

  return `
    ${scope} .${bookPageShellClass} {
      width: 100%${i};
      height: 100%${i};
      max-width: none${i};
      margin: 0${i};
      display: flex${i};
      flex-direction: column${i};
      align-items: stretch${i};
      justify-content: stretch${i};
    }
    ${scope} .${bookPageShellClass} .${bookPageClass} {
      width: var(${BOOK_PAGE_WIDTH_VAR}, 100%)${i};
      height: var(${BOOK_PAGE_HEIGHT_VAR}, 100%)${i};
      min-height: var(${BOOK_PAGE_HEIGHT_VAR}, 100%)${i};
      max-height: var(${BOOK_PAGE_HEIGHT_VAR}, 100%)${i};
      margin: 0${i};
      flex: 1 1 auto${i};
    }
    ${scope} .${bookPageShellSplashClass} .${bookPageCoverClass},
    ${scope} .${bookPageShellSplashClass} .${bookPageBookCoverClass} {
      align-items: flex-start${i};
      justify-content: flex-start${i};
    }
    ${scope} .${bookPageShellSplashClass} .${bookPageCoverClass} h1.${bookChapterTitleClass},
    ${scope} .${bookPageShellSplashClass} .${bookPageBookCoverClass} h1.${bookBookTitleClass},
    ${scope} .${bookPageShellSplashClass} .${bookPageBookCoverClass} .book-book-subtitle {
      text-align: left${i};
    }
  `;
}

/** EPUB·리더 — 페이지 넘김: 가로 한 화면 = 종이 한 장(높이=뷰포트) */
export function bookPageReaderPaginatedCss(important = false) {
  const i = important ? " !important" : "";

  return `
    html, body {
      height: 100%${i};
      margin: 0${i};
      padding: 0${i};
      overflow: hidden${i};
      background-color: #fafaf9${i};
    }
    .${bookPageShellClass} {
      width: 100%${i};
      height: 100%${i};
      max-width: none${i};
      margin: 0${i};
      display: flex${i};
      flex-direction: column${i};
      align-items: stretch${i};
      justify-content: stretch${i};
    }
    .${bookPageShellClass} .${bookPageClass} {
      width: var(${BOOK_PAGE_WIDTH_VAR}, 100%)${i};
      height: var(${BOOK_PAGE_HEIGHT_VAR}, 100%)${i};
      min-height: var(${BOOK_PAGE_HEIGHT_VAR}, 100%)${i};
      max-height: var(${BOOK_PAGE_HEIGHT_VAR}, 100%)${i};
      margin: 0${i};
      flex: 1 1 auto${i};
    }
    .${bookPageShellSplashClass} .${bookPageCoverClass},
    .${bookPageShellSplashClass} .${bookPageBookCoverClass} {
      align-items: flex-start${i};
      justify-content: flex-start${i};
    }
    .${bookPageShellSplashClass} .${bookPageCoverClass} h1.${bookChapterTitleClass},
    .${bookPageShellSplashClass} .${bookPageBookCoverClass} h1.${bookBookTitleClass},
    .${bookPageShellSplashClass} .${bookPageBookCoverClass} .book-book-subtitle {
      text-align: left${i};
    }
  `;
}

/** EPUB·리더 */
export function bookPageReaderCss(important = false) {
  const i = important ? " !important" : "";

  return `
    ${bookPageCanvasCss()}
    ${pageBoxCss("", important)}
    ${bookCoverImagePageCss("", important)}
    .${bookPageClass} {
      page-break-after: always${i};
      break-after: page${i};
      -webkit-column-break-after: always${i};
    }
    body {
      margin: 0${i};
      padding: 1rem${i};
      background-color: #fafaf9${i};
      overflow-x: hidden${i};
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
    .book-page-editor-scroll .book-page-zoom-host {
      margin-left: auto;
      margin-right: auto;
    }
    .book-page-editor-scroll .book-page-zoom-host .${bookPageShellClass} {
      width: 100%;
      max-width: ${BOOK_PAGE_REF_WIDTH};
      margin-left: auto;
      margin-right: auto;
    }
    .book-page-editor-scroll .${bookPageClass} {
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.08), 0 6px 20px rgb(0 0 0 / 0.06);
      border-radius: 2px;
    }
    .book-page-editor-scroll .${bookPageClass}.${bookPageContentClass} {
      height: auto !important;
      min-height: var(${BOOK_PAGE_HEIGHT_VAR}, 950px) !important;
      max-height: none !important;
      overflow: visible !important;
    }
    .book-page-editor-scroll .${bookPageClass}.${bookPageContentClass} .${bookPageBodyClass} {
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
    }
    .book-page-editor-scroll .${bookPageClass}.${bookPageContentClass} .ProseMirror {
      min-height: calc(var(${BOOK_PAGE_HEIGHT_VAR}, 950px) - 5rem);
      outline: none;
    }
    .book-page-editor-scroll .${bookPageClass}.${bookPageContentClass} .book-page-subtitle--editor-preview {
      pointer-events: none;
      user-select: none;
      cursor: default;
      text-align: center;
      margin-left: auto;
      margin-right: auto;
    }
    .book-page-editor-scroll .${bookPageClass}.${bookPageContentClass} .book-page-subtitle--editor-preview + .book-page-prose .ProseMirror > p.book-body-p:first-child {
      text-indent: 1em;
    }
    .book-page-editor-scroll .${bookPageClass}.${bookPageContentClass} .ProseMirror > h2:first-child,
    .book-page-editor-scroll .${bookPageClass}.${bookPageContentClass} .ProseMirror > h3:first-child {
      display: block;
      width: 100%;
      max-width: 88%;
      margin: 2.25em auto 1.35em;
      padding: 0;
      text-align: center;
      text-indent: 0;
      word-break: keep-all;
    }
    .book-page--quote textarea {
      display: block;
      width: 100%;
      resize: vertical;
      border: none;
      background: transparent;
      outline: none;
      font-family: inherit;
      text-align: center;
      field-sizing: content;
    }
    .book-page--quote textarea.book-quote-text {
      min-height: 3.5em;
      font-style: italic;
      line-height: 1.65;
    }
    .book-page--quote textarea.book-quote-text::placeholder,
    .book-page--quote textarea.book-quote-source::placeholder {
      color: #d6d3d1;
    }
    .book-page--quote textarea.book-quote-source {
      min-height: 1.5em;
    }
    .book-page-editor-scroll .book-page-shell .book-page--cover {
      align-self: stretch;
      width: 100%;
    }
    .book-page-editor-scroll .${bookPageBookCoverClass}.${bookPageBookCoverImageClass} {
      min-height: min(72vh, 34rem);
    }
    .book-page-editor-scroll .book-page--cover .${bookPageBodyClass} {
      width: 100%;
      text-align: left;
    }
    .book-page-editor-scroll .book-page--cover h1.${bookChapterTitleClass} {
      display: inline-block !important;
      box-sizing: border-box !important;
      width: fit-content !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 1.1em 1.75em !important;
      border: 2px solid #1c1917 !important;
      font-size: 1.55em !important;
      font-weight: 700 !important;
      line-height: 1.45 !important;
      text-align: left !important;
      white-space: pre-line !important;
      overflow-wrap: anywhere !important;
      word-break: keep-all !important;
      color: #0c0a09 !important;
      outline: none;
    }
  `;
}

function readerViewportStyleTarget(
  root: Document | HTMLElement | null | undefined,
): HTMLElement | null {
  if (!root) return null;
  if (root instanceof HTMLElement) return root;
  if (root instanceof Document) {
    return root.documentElement ?? root.body ?? null;
  }
  return null;
}

export function syncReaderViewportVars(
  root: Document | HTMLElement | null | undefined,
  width: number,
  height: number,
) {
  const el = readerViewportStyleTarget(root);
  if (!el?.style) return;

  if (width > 0) {
    el.style.setProperty(READER_VIEWPORT_W_VAR, `${width}px`);
  }
  if (height > 0) {
    el.style.setProperty(READER_VIEWPORT_H_VAR, `${height}px`);
  }
}

function isSplashPageArticle(article: Element): boolean {
  return (
    article.classList.contains(bookPageCoverClass) ||
    article.classList.contains(bookPageBookCoverClass)
  );
}

function isBookCoverImageArticle(article: Element): boolean {
  return article.classList.contains(bookPageBookCoverImageClass);
}

function isQuotePageArticle(article: Element): boolean {
  return article.classList.contains(bookPageQuoteClass);
}

/** 편집기: shell 너비 기준 A4. 리더: scroll/paginated + 본문/스플래시 구분 */
export function syncBookPageMetrics(
  shell: HTMLElement,
  options?: {
    mode?: ReaderPageLayoutMode;
    pageWidth?: number;
    pageHeight?: number;
  },
) {
  const measuredW = shell.clientWidth;
  const w =
    options?.pageWidth && options.pageWidth > 0 ? options.pageWidth : measuredW;
  if (w <= 0) return;

  const article = shell.querySelector(`.${bookPageClass}`);
  const mode = options?.mode;
  const rootEl =
    shell.ownerDocument?.documentElement ?? shell.ownerDocument?.body ?? null;
  const readerVh = rootEl
    ? parseFloat(getComputedStyle(rootEl).getPropertyValue(READER_VIEWPORT_H_VAR))
    : 0;
  const readerVw = rootEl
    ? parseFloat(getComputedStyle(rootEl).getPropertyValue(READER_VIEWPORT_W_VAR))
    : 0;

  shell.style.setProperty(BOOK_PAGE_WIDTH_VAR, `${w}px`);

  if (!mode) {
    const h = Math.round(w * (297 / 210));
    shell.style.setProperty(BOOK_PAGE_HEIGHT_VAR, `${h}px`);
    return;
  }

  const splash = article && isSplashPageArticle(article);

  if (mode === "paginated") {
    const pw =
      options?.pageWidth && options.pageWidth > 0
        ? options.pageWidth
        : readerVw > 0
          ? readerVw
          : w;
    const ph =
      options?.pageHeight && options.pageHeight > 0
        ? options.pageHeight
        : readerVh > 0
          ? readerVh
          : shell.clientHeight;
    shell.style.setProperty(BOOK_PAGE_WIDTH_VAR, `${pw}px`);
    shell.style.setProperty(BOOK_PAGE_HEIGHT_VAR, `${ph}px`);
    return;
  }

  if (mode === "scroll") {
    shell.style.setProperty(BOOK_PAGE_WIDTH_VAR, "100%");
    const quote = article && isQuotePageArticle(article);
    if (splash) {
      if (article && isBookCoverImageArticle(article)) {
        shell.style.removeProperty(BOOK_PAGE_HEIGHT_VAR);
      } else {
        const ph =
          readerVh > 0
            ? readerVh
            : rootEl?.clientHeight && rootEl.clientHeight > 0
              ? rootEl.clientHeight
              : typeof window !== "undefined"
                ? window.innerHeight
                : 0;
        if (ph > 0) {
          shell.style.setProperty(BOOK_PAGE_HEIGHT_VAR, `${ph}px`);
        } else {
          shell.style.removeProperty(BOOK_PAGE_HEIGHT_VAR);
        }
      }
    } else if (quote && measuredW > 0) {
      shell.style.setProperty(
        BOOK_PAGE_HEIGHT_VAR,
        `${Math.round(measuredW * (297 / 210))}px`,
      );
    } else {
      shell.style.removeProperty(BOOK_PAGE_HEIGHT_VAR);
    }
    return;
  }

  if (splash && readerVh > 0) {
    shell.style.setProperty(BOOK_PAGE_HEIGHT_VAR, `${readerVh}px`);
    return;
  }

  const h = Math.round(w * (297 / 210));
  shell.style.setProperty(BOOK_PAGE_HEIGHT_VAR, `${h}px`);
}
