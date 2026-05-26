import { columnImageWrapperCss } from "@/lib/typography/imageLayout";

/** 책 본문 타이포 계층 — 편집기·EPUB·리더 공통 기준
 *
 * 한국 소설·에세이 전자책 관례 (교보문고·KDP·국내 EPUB 가이드 참고):
 * - 본문: 양쪽 정렬 + 첫 줄 들여쓰기 1em + 마지막 줄 왼쪽 정렬
 * - 제목·인용: 왼쪽 정렬, 들여쓰기 없음
 * - 줄간격: 1.75~1.8
 * - em 단위 사용 (화면 크기 대응)
 */

export const typographyGuide = {
  chapter: "왼쪽 목차 (1장, 2장…) — 책의 큰 단락",
  h1: "대제목 — 챕터 안의 큰 주제",
  h2: "중제목 — 대제목 아래 소주제",
  h3: "소제목 — 더 잘게 나눈 항목",
  p: "본문 — 양쪽 정렬 + 들여쓰기 (한국 소설형)",
} as const;

/** 본문 p — 좁은 화면은 왼쪽 정렬, 넓을 때만 양쪽 정렬 */
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

/**
 * 본문 반응형 정렬 — container query로 읽기 영역 너비 기준
 * (viewport가 아닌 iframe·편집기 실제 너비 → 미리보기·모바일에서도 정확)
 *
 * 32em 미만: 왼쪽 정렬 (양쪽정렬 시 단어 간격 늘림 방지)
 * 32em 이상: 양쪽 정렬 + 마지막 줄 왼쪽 (한국 소설·에세이 PC/태블릿 관례)
 */
export const responsiveBodyTextCss = `
  html {
    container-type: inline-size;
    container-name: page;
  }
  p.book-body-p,
  p {
    text-align: left;
    text-indent: 1em;
    word-break: keep-all;
    overflow-wrap: anywhere;
    word-spacing: normal;
    letter-spacing: 0;
    text-wrap: pretty;
    max-width: 100%;
  }
  @container page (min-width: 32em) {
    p.book-body-p,
    p {
      text-align: justify;
      text-align-last: left;
      text-justify: inter-word;
    }
  }
  h1 + p, h2 + p, h3 + p, hr + p, blockquote + p {
    text-indent: 0;
  }
`;

export const readerThemeStyles = {
  body: {
    "font-family": '"Noto Serif KR", "Apple SD Gothic Neo", serif',
    "font-size": "100%",
    "line-height": "1.75",
    color: "#1c1917",
    padding: "0",
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
    ${writingModeCss}
    * { box-sizing: border-box; }
    body {
      font-family: "Noto Serif KR", "Apple SD Gothic Neo", serif;
      font-size: 100%;
      line-height: 1.75;
      color: #1c1917;
      padding: 1rem 0.875rem;
      margin: 0;
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
      -webkit-text-size-adjust: 100%;
    }
    html {
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
    }
    h1, h2, h3, h4, h5, h6 {
      text-align: left;
      text-indent: 0;
      font-weight: 700;
      word-break: keep-all;
    }
    h1 {
      font-size: 1.45em;
      line-height: 1.4;
      margin: 1.75em 0 0.65em;
      color: #0c0a09;
    }
    h2 {
      font-size: 1.2em;
      font-weight: 600;
      line-height: 1.45;
      margin: 1.35em 0 0.45em;
    }
    h3 {
      font-size: 1.05em;
      font-weight: 600;
      line-height: 1.5;
      margin: 1.1em 0 0.35em;
    }
    p.book-body-p,
    p {
      font-size: 1em;
      font-weight: 400;
      line-height: 1.75;
      margin: 0;
    }
    ${responsiveBodyTextCss}
    ${columnImageWrapperCss}
    img {
      max-width: 100% !important;
      width: auto !important;
      height: auto !important;
      display: block;
      margin: 1.25em auto;
      break-inside: avoid;
      -webkit-column-break-inside: avoid;
      page-break-inside: avoid;
    }
    .webbook-img-wrap img {
      display: inline-block !important;
      margin: 0 !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
    blockquote {
      font-size: 0.95em;
      text-align: left;
      text-indent: 0;
      border-left: 2px solid #d6d3d1;
      padding: 0 0 0 0.85em;
      margin: 0.85em 0;
      color: #44403c;
    }
    blockquote p {
      text-align: left;
      text-indent: 0;
      margin: 0.35em 0;
    }
    hr {
      border: none;
      border-top: 1px solid #e7e5e4;
      margin: 1.75em 0;
    }
    strong, b { font-weight: 700; }
    .epub-author, .epub-link { display: none; }
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

export function readerInjectCss(
  writingMode: "horizontal-tb" | "vertical-rl",
  viewMode: "scroll" | "paginated" = "scroll",
) {
  const modeCss =
    writingMode === "vertical-rl"
      ? `body { writing-mode: vertical-rl; text-orientation: mixed; }`
      : "";
  const scrollImageCss = `
    img {
      display: block !important;
      margin-top: 1.25em !important;
      margin-bottom: 1.25em !important;
    }
    ${readerImageAlignCss}
  `;
  const paginatedImageCss = columnImageWrapperCss;
  return `
    ${modeCss}
    html, body {
      margin: 0 !important;
      padding: 1rem 0.875rem !important;
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: hidden !important;
      box-sizing: border-box !important;
      -webkit-text-size-adjust: 100% !important;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
    }
    html {
      container-type: inline-size !important;
      container-name: page !important;
    }
    img {
      max-width: 100% !important;
      width: auto !important;
      height: auto !important;
    }
    ${viewMode === "paginated" ? paginatedImageCss : scrollImageCss}
    p, p.book-body-p {
      line-height: 1.75 !important;
      letter-spacing: 0 !important;
      word-spacing: normal !important;
      margin: 0 !important;
      max-width: 100% !important;
      text-align: left !important;
      text-indent: 1em !important;
      word-break: keep-all;
      overflow-wrap: anywhere !important;
      text-wrap: pretty;
    }
    @container page (min-width: 32em) {
      p, p.book-body-p {
        text-align: justify !important;
        text-align-last: left !important;
        text-justify: inter-word !important;
      }
    }
    h1, h2, h3, h4, h5, h6 {
      text-align: left !important;
      text-indent: 0 !important;
    }
    blockquote, blockquote p {
      text-align: left !important;
      text-indent: 0 !important;
    }
    h1 + p, h2 + p, h3 + p, hr + p, blockquote + p {
      text-indent: 0 !important;
    }
  `;
}
