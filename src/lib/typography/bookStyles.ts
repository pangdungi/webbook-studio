import { columnImageWrapperCss } from "@/lib/typography/imageLayout";

/** 본문 명조 — 편집기·EPUB·리더 공통 (고딕 fallback 제외) */
export const NOTO_SERIF_KR_GOOGLE_CSS =
  "https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&display=swap";

export const bookBodyFontFamily =
  '"Noto Serif KR", "Apple Myungjo", "Batang", serif';

export const bookFontFaceCss = `@import url("${NOTO_SERIF_KR_GOOGLE_CSS}");`;

/** 편집기·리더 본문 영역 — 동일 너비·여백 */
export const BOOK_PROSE_MAX_WIDTH = "42rem";
export const BOOK_PROSE_PADDING = "1rem 0.875rem";

export const bookChapterTitleClass = "book-chapter-title";
export const chapterOpenerPageClass = "chapter-opener-page";
export const chapterBodyClass = "chapter-body";

/** 장 표지 배경 — 본문(흰색)과 구분 */
export const CHAPTER_OPENER_BG = "#f5f5f4";

function chapterOpenerCss(important = false) {
  const i = important ? " !important" : "";

  return `
    .${chapterOpenerPageClass} {
      box-sizing: border-box${i};
      min-height: 70vh${i};
      display: flex${i};
      flex-direction: column${i};
      align-items: flex-start${i};
      justify-content: flex-start${i};
      text-align: left${i};
      padding: 3.5rem 1rem 2rem${i};
      background-color: ${CHAPTER_OPENER_BG}${i};
      page-break-after: always${i};
      break-after: page${i};
      -webkit-column-break-after: always${i};
    }
    .${chapterOpenerPageClass} h1.${bookChapterTitleClass} {
      display: inline-block${i};
      box-sizing: border-box${i};
      max-width: 100%${i};
      width: auto${i};
      margin: 0${i};
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
    .${chapterBodyClass} {
      padding-top: 0${i};
      background-color: #ffffff${i};
    }
  `;
}

/** EPUB iframe — Google Fonts 로드 (부모 페이지 폰트는 상속되지 않음) */
export function injectBookFonts(doc: Document) {
  if (doc.getElementById("webbook-reader-fonts")) return;
  const link = doc.createElement("link");
  link.id = "webbook-reader-fonts";
  link.rel = "stylesheet";
  link.href = NOTO_SERIF_KR_GOOGLE_CSS;
  doc.head.prepend(link);
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

function proseSurfaceCss(surfaceSelector: string, important = false) {
  const i = important ? " !important" : "";

  return `
    ${surfaceSelector} {
      font-family: ${bookBodyFontFamily}${i};
      font-size: 100%${i};
      line-height: 1.75${i};
      color: #1c1917${i};
      max-width: ${BOOK_PROSE_MAX_WIDTH}${i};
      margin-left: auto${i};
      margin-right: auto${i};
      padding: ${BOOK_PROSE_PADDING}${i};
      width: 100%${i};
      box-sizing: border-box${i};
      -webkit-text-size-adjust: 100%${i};
      overflow-x: hidden${i};
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
    .webbook-img-wrap img {
      display: inline-block !important;
      margin: 0 !important;
    }
    ${columnImageWrapperCss}
  `
    : scrollImageCss;
}

/** 편집기 — layout.tsx에서 주입 */
export function bookEditorCss() {
  return `
    .book-prose {
      container-type: inline-size;
      container-name: page;
      max-width: ${BOOK_PROSE_MAX_WIDTH};
      margin-left: auto;
      margin-right: auto;
      padding: ${BOOK_PROSE_PADDING};
      font-family: ${bookBodyFontFamily};
      font-size: 100%;
      line-height: 1.75;
      color: #1c1917;
      box-sizing: border-box;
    }
    .book-prose .ProseMirror {
      outline: none;
      min-height: 320px;
    }
    ${chapterOpenerCss()}
    .book-prose .${chapterOpenerPageClass} {
      margin: -1rem -0.875rem 0;
      border-radius: 0.75rem 0.75rem 0 0;
    }
    .${chapterBodyClass} {
      border-top: 1px solid #e7e5e4;
      padding-top: 1.25rem;
      background-color: #fff;
    }
    ${proseContentCss(".book-prose .ProseMirror")}
    ${proseContainerCss(".book-prose")}
    .book-prose .ProseMirror p.is-editor-empty:first-child::before {
      color: #a8a29e;
      content: attr(data-placeholder);
      float: left;
      height: 0;
      pointer-events: none;
    }
    .book-prose .ProseMirror img {
      max-width: 100%;
      height: auto;
      border-radius: 0.5rem;
      margin: 1.25em 0;
    }
    .book-prose .ProseMirror img[data-align="center"] {
      display: block;
      margin-left: auto;
      margin-right: auto;
    }
    .book-prose .ProseMirror img[data-align="left"] {
      display: block;
      margin-right: auto;
      margin-left: 0;
    }
    .book-prose .ProseMirror img[data-align="right"] {
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

export function epubTypographyCss(writingModeCss: string) {
  return `
    ${bookFontFaceCss}
    ${writingModeCss}
    * { box-sizing: border-box; }
    html {
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
    }
    ${proseSurfaceCss("body")}
    body {
      margin: 0;
    }
    ${proseContentCss("body")}
    ${proseContainerCss("html")}
    ${chapterOpenerCss()}
    ${proseImageCss("scroll")}
    .epub-author, .epub-link { display: none; }
  `;
}

export function readerInjectCss(
  writingMode: "horizontal-tb" | "vertical-rl",
  viewMode: "scroll" | "paginated" = "scroll",
) {
  const modeCss =
    writingMode === "vertical-rl"
      ? `body { writing-mode: vertical-rl !important; text-orientation: mixed !important; }`
      : "";

  return `
    ${modeCss}
    html {
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    ${proseSurfaceCss("body", true)}
    body {
      margin: 0 auto !important;
    }
    ${proseContainerCss("html", true)}
    ${chapterOpenerCss(true)}
    ${proseContentCss("body", true)}
    ${proseImageCss(viewMode)}
  `;
}
