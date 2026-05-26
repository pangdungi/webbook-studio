import {
  bookFontFaceCss,
  bookSerifFontFamily,
  headingFontFamily,
  type BookHeadingFonts,
  DEFAULT_BOOK_HEADING_FONTS,
} from "@/lib/typography/headingFonts";
import {
  bookPageCanvasCss,
  bookPageClass,
  bookPageContentClass,
  bookPageCoverClass,
  bookPageEditorShellCss,
  bookPageReaderCss,
  bookChapterTitleClass as bookPageChapterTitleClass,
} from "@/lib/pages/bookPageCss";
import { columnImageWrapperCss } from "@/lib/typography/imageLayout";

/** 본문 명조 — 편집기·EPUB·리더 공통 */
export const bookBodyFontFamily = bookSerifFontFamily;

export { NOTO_SERIF_KR_GOOGLE_CSS } from "@/lib/typography/headingFonts";

/** 편집기·리더 본문 영역 — 동일 너비·여백 */
export const BOOK_PROSE_MAX_WIDTH = "42rem";
export const BOOK_PROSE_PADDING = "1rem 0.875rem";

export const bookChapterTitleClass = "book-chapter-title";
export const chapterOpenerPageClass = "chapter-opener-page";
export const chapterOpenerSplashClass = "chapter-opener-splash";
export const chapterBodyClass = "chapter-body";
export const bookProseClass = "book-prose";

/** 편집기 바깥 배경과 동일 */
export const BOOK_PAGE_BG = "#fafaf9";

/** 장 표지 배경 — 본문(흰색)과 구분 */
export const CHAPTER_OPENER_BG = "#f5f5f4";

/** 리더·편집기 — iframe 안 vh 대신 JS로 주입 (vh는 긴 iframe에서 무한히 커짐) */
export const WEBBOOK_PAGE_HEIGHT_VAR = "--webbook-page-h";

export function injectPageHeight(doc: Document, heightPx: number) {
  const h = Math.max(320, Math.round(heightPx));
  doc.documentElement.style.setProperty(WEBBOOK_PAGE_HEIGHT_VAR, `${h}px`);
}

/** 장 표지 — 제목 + 고정 높이 스페이서(한 화면). min-height 대신 splash로 높이 고정 */
function chapterOpenerCss(important = false) {
  const i = important ? " !important" : "";

  return `
    .${chapterOpenerPageClass} {
      box-sizing: border-box${i};
      display: block${i};
      padding: 3rem 0 0${i};
      background-color: ${CHAPTER_OPENER_BG}${i};
      overflow: hidden${i};
      min-height: auto${i};
      height: auto${i};
      max-height: none${i};
    }
    .${chapterOpenerPageClass} h1.${bookChapterTitleClass} {
      display: inline-block${i};
      box-sizing: border-box${i};
      max-width: 100%${i};
      width: auto${i};
      margin: 0 0 0 0${i};
      padding: 1.1em 1.75em${i};
      border: 2px solid #1c1917${i};
      font-size: 1.55em${i};
      font-weight: 700${i};
      line-height: 1.45${i};
      text-align: left${i};
      text-indent: 0${i};
      white-space: pre-line${i};
      overflow-wrap: anywhere${i};
      word-break: keep-all${i};
      color: #0c0a09${i};
    }
    .${chapterOpenerSplashClass} {
      display: block${i};
      height: calc(var(${WEBBOOK_PAGE_HEIGHT_VAR}, 640px) - 11rem)${i};
      max-height: calc(var(${WEBBOOK_PAGE_HEIGHT_VAR}, 640px) - 11rem)${i};
      pointer-events: none${i};
      flex-shrink: 0${i};
    }
    .${chapterBodyClass} {
      position: relative${i};
      z-index: 1${i};
      padding-top: 0${i};
      background-color: #ffffff${i};
    }
  `;
}

/** 페이지 모드 — 장 표지 다음 열(페이지)부터 본문 */
function chapterOpenerPaginatedCss(important = false) {
  const i = important ? " !important" : "";

  return `
    .${chapterOpenerPageClass} {
      break-inside: avoid${i};
      -webkit-column-break-inside: avoid${i};
      page-break-inside: avoid${i};
      break-after: column${i};
      -webkit-column-break-after: always${i};
    }
  `;
}

/** EPUB iframe — Google Fonts 로드 (부모 페이지 폰트는 상속되지 않음) */
export function injectBookFonts(
  doc: Document,
  fonts: BookHeadingFonts = DEFAULT_BOOK_HEADING_FONTS,
) {
  const needsSans =
    fonts.chapterTitle === "sans" ||
    fonts.heading2 === "sans" ||
    fonts.heading3 === "sans";
  const families = needsSans
    ? "family=Noto+Serif+KR:wght@400;600;700&family=Noto+Sans+KR:wght@400;600;700"
    : "family=Noto+Serif+KR:wght@400;600;700";
  const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;

  let link = doc.getElementById("webbook-reader-fonts") as HTMLLinkElement | null;
  if (!link) {
    link = doc.createElement("link");
    link.id = "webbook-reader-fonts";
    link.rel = "stylesheet";
    doc.head.prepend(link);
  }
  if (link.href !== href) link.href = href;
}

export const typographyGuide = {
  chapter: "목차 + 장 표지 — 왼쪽에서 이름을 바꾸면 표지 제목도 함께 바뀝니다",
  h2: "중제목 — 장 본문 안의 큰 소주제",
  h3: "소제목 — 더 잘게 나눈 항목",
  p: "본문 — 양쪽 정렬 + 들여쓰기 (한국 소설형)",
} as const;

export const bodyParagraphStyles = {
  "font-size": "1em",
  "font-weight": "400",
  "line-height": "1.75",
  "text-align": "left",
  "text-indent": "1em",
  "word-break": "keep-all",
  "overflow-wrap": "break-word",
  "letter-spacing": "0",
  "word-spacing": "normal",
  "margin-top": "0",
  "margin-bottom": "0",
} as const;

/** 본문·제목·인용 — contentRoot 예: body, .book-prose .ProseMirror */
function proseContentCss(contentRoot: string, important = false) {
  const i = important ? " !important" : "";
  const r = contentRoot;

  return `
    ${r} h1, ${r} h1.${bookChapterTitleClass} {
      font-family: var(--wbs-font-chapter, ${bookBodyFontFamily})${i};
      font-size: 1.45em${i};
      font-weight: 700${i};
      line-height: 1.4${i};
      text-align: left${i};
      text-indent: 0${i};
      margin: 1.75em 0 0.65em${i};
      color: #0c0a09${i};
      word-break: keep-all${i};
    }
    ${r} h2 {
      font-family: var(--wbs-font-h2, ${bookBodyFontFamily})${i};
      font-size: 1.2em${i};
      font-weight: 600${i};
      line-height: 1.45${i};
      text-align: left${i};
      text-indent: 0${i};
      margin: 1.35em 0 0.45em${i};
      color: #1c1917${i};
      word-break: keep-all${i};
    }
    ${r} h3 {
      font-family: var(--wbs-font-h3, ${bookBodyFontFamily})${i};
      font-size: 1.05em${i};
      font-weight: 600${i};
      line-height: 1.5${i};
      text-align: left${i};
      text-indent: 0${i};
      margin: 1.1em 0 0.35em${i};
      color: #292524${i};
      word-break: keep-all${i};
    }
    ${r} p.book-body-p,
    ${r} p {
      font-size: 1em${i};
      font-weight: 400${i};
      line-height: 1.75${i};
      text-align: left${i};
      text-indent: 1em${i};
      word-break: keep-all${i};
      overflow-wrap: anywhere${i};
      word-spacing: normal${i};
      letter-spacing: 0${i};
      text-wrap: pretty${i};
      margin: 0${i};
      max-width: 100%${i};
      color: #1c1917${i};
    }
    ${r} h1 + p, ${r} h2 + p, ${r} h3 + p, ${r} hr + p, ${r} blockquote + p {
      text-indent: 0${i};
    }
    ${r} blockquote {
      font-size: 0.95em${i};
      font-style: normal${i};
      text-align: left${i};
      text-indent: 0${i};
      color: #44403c${i};
      border-left: 2px solid #d6d3d1${i};
      padding: 0 0 0 0.85em${i};
      margin: 0.85em 0${i};
    }
    ${r} blockquote p {
      text-align: left${i};
      text-indent: 0${i};
      margin: 0.35em 0${i};
    }
    ${r} hr {
      border: none${i};
      border-top: 1px solid #e7e5e4${i};
      margin: 1.75em 0${i};
    }
    ${r} strong, ${r} b {
      font-weight: 700${i};
    }
  `;
}

function proseContainerCss(containerSelector: string, important = false) {
  const i = important ? " !important" : "";

  return `
    ${containerSelector} {
      container-type: inline-size${i};
      container-name: page${i};
    }
    @container page (min-width: 32em) {
      ${containerSelector} p.book-body-p,
      ${containerSelector} p {
        text-align: justify${i};
        text-align-last: left${i};
        text-justify: inter-word${i};
      }
    }
  `;
}

function bookReaderPageCss(
  important = false,
  viewMode: "scroll" | "paginated" = "scroll",
) {
  const i = important ? " !important" : "";
  const paginated = viewMode === "paginated";
  const overflowX = paginated ? "visible" : "hidden";

  return `
    html {
      width: 100%${i};
      max-width: 100%${i};
      overflow-x: ${overflowX}${i};
    }
    body {
      margin: 0${i};
      padding: 1rem${i};
      background-color: ${BOOK_PAGE_BG}${i};
      box-sizing: border-box${i};
      -webkit-text-size-adjust: 100%${i};
      overflow-x: ${overflowX}${i};
    }
    @media (min-width: 640px) {
      body {
        padding: 1.5rem${i};
      }
    }
    .${bookProseClass} {
      container-type: inline-size${i};
      container-name: page${i};
      max-width: ${BOOK_PROSE_MAX_WIDTH}${i};
      margin-left: auto${i};
      margin-right: auto${i};
      padding: ${BOOK_PROSE_PADDING}${i};
      background-color: #ffffff${i};
      font-family: ${bookBodyFontFamily}${i};
      font-size: 100%${i};
      line-height: 1.75${i};
      color: #1c1917${i};
      width: 100%${i};
      box-sizing: border-box${i};
      overflow-x: ${overflowX}${i};
    }
    .${bookProseClass} .${chapterOpenerPageClass} {
      margin: -1rem -0.875rem 0${i};
    }
    .${bookProseClass} .${chapterBodyClass} {
      border-top: 1px solid #e7e5e4${i};
      padding-top: 1.25rem${i};
      background-color: #ffffff${i};
    }
  `;
}

const readerImageAlignCss = `
  img[data-align="center"] {
    display: block !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }
  img[data-align="left"] {
    display: block !important;
    margin-right: auto !important;
    margin-left: 0 !important;
  }
  img[data-align="right"] {
    display: block !important;
    margin-left: auto !important;
    margin-right: 0 !important;
  }
`;

function proseImageCss(viewMode: "scroll" | "paginated") {
  const scrollImageCss = `
    img {
      max-width: 100% !important;
      width: auto !important;
      height: auto !important;
      display: block !important;
      margin: 1.25em auto !important;
      break-inside: avoid;
      -webkit-column-break-inside: avoid;
      page-break-inside: avoid;
    }
    ${readerImageAlignCss}
  `;
  return viewMode === "paginated"
    ? `
    img {
      max-width: 100% !important;
      width: auto !important;
      height: auto !important;
      break-inside: avoid;
      -webkit-column-break-inside: avoid;
      page-break-inside: avoid;
    }
    ${columnImageWrapperCss}
    ${readerImageAlignCss}
  `
    : scrollImageCss;
}

/** 편집기 — layout.tsx에서 주입 */
export function bookEditorCss() {
  return `
    ${bookPageCanvasCss()}
    ${bookPageEditorShellCss()}
    .book-page-prose .ProseMirror {
      outline: none;
      min-height: 12rem;
    }
    ${proseContentCss(".book-page-prose .ProseMirror")}
    ${proseContainerCss(".book-page-prose")}
    .book-page-prose .ProseMirror p.is-editor-empty:first-child::before {
      color: #a8a29e;
      content: attr(data-placeholder);
      float: left;
      height: 0;
      pointer-events: none;
    }
    .book-page-prose .ProseMirror img {
      max-width: 100%;
      height: auto;
      border-radius: 0.5rem;
      margin: 1.25em 0;
    }
    .book-page-prose .ProseMirror img[data-align="center"] {
      display: block;
      margin-left: auto;
      margin-right: auto;
    }
    .book-page-prose .ProseMirror img[data-align="left"] {
      display: block;
      margin-right: auto;
      margin-left: 0;
    }
    .book-page-prose .ProseMirror img[data-align="right"] {
      display: block;
      margin-left: auto;
      margin-right: 0;
    }
  `;
}

/** epub.js themes — EPUB style.css와 동일 값 */
export const readerThemeStyles = {
  body: {
    "font-family": bookBodyFontFamily,
    "font-size": "100%",
    "line-height": "1.75",
    color: "#1c1917",
    padding: "0",
    margin: "0",
    "max-width": BOOK_PROSE_MAX_WIDTH,
    width: "100%",
  },
  h1: {
    "font-size": "1.45em",
    "font-weight": "700",
    "line-height": "1.4",
    "text-align": "left",
    "text-indent": "0",
    "margin-top": "1.75em",
    "margin-bottom": "0.65em",
    color: "#0c0a09",
  },
  h2: {
    "font-size": "1.2em",
    "font-weight": "600",
    "line-height": "1.45",
    "text-align": "left",
    "text-indent": "0",
    "margin-top": "1.35em",
    "margin-bottom": "0.45em",
    color: "#1c1917",
  },
  h3: {
    "font-size": "1.05em",
    "font-weight": "600",
    "line-height": "1.5",
    "text-align": "left",
    "text-indent": "0",
    "margin-top": "1.1em",
    "margin-bottom": "0.35em",
    color: "#292524",
  },
  p: bodyParagraphStyles,
  blockquote: {
    "font-size": "0.95em",
    "font-style": "normal",
    "text-align": "left",
    "text-indent": "0",
    color: "#44403c",
    "border-left": "2px solid #d6d3d1",
    "padding-left": "0.85em",
    "margin-top": "0.85em",
    "margin-bottom": "0.85em",
  },
};

function headingFontsExplicitCss(
  fonts: BookHeadingFonts,
  important = false,
) {
  const i = important ? " !important" : "";

  return `
    .${bookPageCoverClass} h1.${bookPageChapterTitleClass} {
      font-family: ${headingFontFamily(fonts.chapterTitle)}${i};
    }
    .${bookPageClass}.${bookPageContentClass} h2 {
      font-family: ${headingFontFamily(fonts.heading2)}${i};
    }
    .${bookPageClass}.${bookPageContentClass} h3 {
      font-family: ${headingFontFamily(fonts.heading3)}${i};
    }
  `;
}

export function epubTypographyCss(
  writingModeCss: string,
  headingFonts: BookHeadingFonts = DEFAULT_BOOK_HEADING_FONTS,
) {
  const vars = `
    :root {
      --wbs-font-chapter: ${headingFontFamily(headingFonts.chapterTitle)};
      --wbs-font-h2: ${headingFontFamily(headingFonts.heading2)};
      --wbs-font-h3: ${headingFontFamily(headingFonts.heading3)};
    }
  `;

  return `
    ${bookFontFaceCss(headingFonts)}
    ${vars}
    ${headingFontsExplicitCss(headingFonts)}
    ${writingModeCss}
    * { box-sizing: border-box; }
    ${bookPageReaderCss()}
    ${proseContentCss(`.${bookPageClass}.${bookPageContentClass}`)}
    ${proseContainerCss(`.${bookPageClass}`)}
    ${proseImageCss("scroll")}
    .epub-author, .epub-link { display: none; }
  `;
}

function readerPaginatedPageCss(important = false) {
  const i = important ? " !important" : "";
  return `
    html, body {
      overflow-x: visible${i};
    }
    .${bookPageClass} {
      break-inside: avoid${i};
      -webkit-column-break-inside: avoid${i};
      page-break-inside: avoid${i};
      break-after: auto${i};
      -webkit-column-break-after: auto${i};
      page-break-after: auto${i};
    }
  `;
}

export function readerInjectCss(
  writingMode: "horizontal-tb" | "vertical-rl",
  viewMode: "scroll" | "paginated" = "scroll",
  headingFonts: BookHeadingFonts = DEFAULT_BOOK_HEADING_FONTS,
) {
  const modeCss =
    writingMode === "vertical-rl"
      ? `body { writing-mode: vertical-rl !important; text-orientation: mixed !important; }`
      : "";

  const vars = `
    :root {
      --wbs-font-chapter: ${headingFontFamily(headingFonts.chapterTitle)} !important;
      --wbs-font-h2: ${headingFontFamily(headingFonts.heading2)} !important;
      --wbs-font-h3: ${headingFontFamily(headingFonts.heading3)} !important;
    }
  `;

  return `
    ${modeCss}
    ${vars}
    ${headingFontsExplicitCss(headingFonts, true)}
    ${bookPageReaderCss(true)}
    ${viewMode === "paginated" ? readerPaginatedPageCss(true) : ""}
    ${proseContentCss(`.${bookPageClass}.${bookPageContentClass}`, true)}
    ${proseContainerCss(`.${bookPageClass}`, true)}
    ${proseImageCss(viewMode)}
  `;
}
