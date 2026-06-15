import {
  BOOK_PAGE_HEIGHT_VAR,
  bookCoverImageClass,
  bookCoverImagePageCss,
  bookPageBodyClass,
  bookPageBookCoverClass,
  bookPageBookCoverImageClass,
  bookPageClass,
  bookPageContentClass,
  bookPageQuoteClass,
  bookPageQuoteInnerCss,
  bookPageScrollSplashPageCss,
  bookPageShellClass,
  bookPageShellFlowClass,
  bookPageShellSplashClass,
} from "@/lib/pages/bookPageCss";
import { bookBodyFontFamily } from "@/lib/typography/bookStyles";

const SCROLL = ".reader-scroll-viewport--scroll";
const SURFACE = `${SCROLL} .reader-scroll-surface`;

/** 스크롤 명언 페이지 — 본문 장과 동일한 한 장 크기(A4 비율), 가운데 정렬만 다름 */
function readerScrollQuotePageBoxCss() {
  const p = `${SURFACE} `;
  const i = " !important";

  return `
    ${p}.${bookPageClass}.${bookPageQuoteClass} {
      box-sizing: border-box${i};
      width: 100%${i};
      max-width: none${i};
      min-width: 100%${i};
      margin: 0${i};
      padding: 2.5rem clamp(1rem, 4vw, 1.5rem)${i};
      background-color: #ffffff${i};
      font-family: ${bookBodyFontFamily}${i};
      font-size: 100%${i};
      line-height: 1.75${i};
      color: #1c1917${i};
      overflow: hidden${i};
      position: relative${i};
      flex-shrink: 0${i};
      height: var(${BOOK_PAGE_HEIGHT_VAR}, 950px)${i};
      min-height: var(${BOOK_PAGE_HEIGHT_VAR}, 950px)${i};
      max-height: var(${BOOK_PAGE_HEIGHT_VAR}, 950px)${i};
    }
    ${bookPageQuoteInnerCss(SURFACE, true)}
  `;
}

/** 스크롤 본문 장 — 가로 100%, 좌우는 글 읽기용 최소 패딩만 */
function readerScrollContentPageBoxCss() {
  const p = `${SURFACE} `;
  const i = " !important";

  return `
    ${p}.${bookPageClass}.${bookPageContentClass} {
      box-sizing: border-box${i};
      width: 100%${i};
      max-width: none${i};
      min-width: 100%${i};
      margin: 0${i};
      padding: 2.5rem clamp(1rem, 4vw, 1.5rem)${i};
      background-color: #ffffff${i};
      font-family: ${bookBodyFontFamily}${i};
      font-size: 100%${i};
      line-height: 1.75${i};
      color: #1c1917${i};
      overflow: visible${i};
      position: relative${i};
      flex-shrink: 0${i};
      height: auto${i};
      min-height: 12rem${i};
      max-height: none${i};
    }
    ${p}.${bookPageClass}.${bookPageContentClass} .${bookPageBodyClass} {
      box-sizing: border-box${i};
      width: 100%${i};
      max-width: none${i};
      height: auto${i};
      max-height: none${i};
      overflow: visible${i};
    }
  `;
}

/** 스크롤 모드 — 페이지 모드와 동일하게 화면 가로 전체 */
export function readerScrollFullBleedCss() {
  const i = " !important";

  return `
    ${readerScrollContentPageBoxCss()}
    ${readerScrollQuotePageBoxCss()}
    ${bookPageScrollSplashPageCss(SURFACE, true)}
    ${bookCoverImagePageCss(SURFACE, true)}
    ${SURFACE} .${bookPageShellSplashClass}:has(.${bookPageBookCoverImageClass}) {
      align-items: center${i};
      justify-content: center${i};
      min-height: min(72vh, 34rem)${i};
      padding: 2.5rem 1.25rem${i};
      background-color: #fafaf9${i};
    }
    ${SURFACE} .${bookPageBookCoverClass}.${bookPageBookCoverImageClass} {
      width: auto${i};
      max-width: 100%${i};
      min-width: 0${i};
      margin-left: auto${i};
      margin-right: auto${i};
    }
    ${SURFACE} .${bookPageBookCoverImageClass} .${bookCoverImageClass} {
      width: auto${i};
      max-width: min(100%, 22rem)${i};
    }
    ${SCROLL} {
      background-color: #ffffff${i};
    }
    ${SURFACE},
    ${SCROLL} .reader-scroll-anchor {
      width: 100%${i};
      max-width: none${i};
      min-width: 100%${i};
      margin: 0${i};
      padding: 0${i};
      align-items: stretch${i};
    }
    ${SURFACE} .${bookPageShellClass},
    ${SURFACE} .${bookPageShellSplashClass},
    ${SURFACE} .${bookPageShellFlowClass} {
      width: 100%${i};
      max-width: none${i};
      min-width: 100%${i};
      margin: 0${i};
      padding: 0${i};
      gap: 0${i};
      align-items: stretch${i};
    }
    ${SURFACE} .${bookPageClass}:not(.${bookPageBookCoverImageClass}),
    ${SURFACE} .${bookPageShellSplashClass} .${bookPageClass}:not(.${bookPageBookCoverImageClass}),
    ${SURFACE} .${bookPageShellFlowClass} .${bookPageClass} {
      width: 100%${i};
      max-width: none${i};
      min-width: 100%${i};
      margin: 0${i};
    }
  `;
}

/** CSS 캐시·구버전 덮어쓰기 — 스크롤 레이아웃 직후 인라인 적용 */
export function applyScrollFullBleedLayout(root: HTMLElement, viewportWidth: number) {
  if (viewportWidth <= 0) return;

  const stretch = (el: HTMLElement) => {
    el.style.setProperty("width", "100%");
    el.style.setProperty("max-width", "none");
    el.style.setProperty("min-width", "100%");
    el.style.setProperty("margin", "0");
  };

  stretch(root);
  root.style.setProperty("align-items", "stretch");

  root.querySelectorAll<HTMLElement>(".reader-scroll-anchor").forEach(stretch);
  root.querySelectorAll<HTMLElement>(`.${bookPageShellClass}`).forEach((shell) => {
    stretch(shell);
    shell.style.setProperty("--book-page-w", "100%");
  });
  root.querySelectorAll<HTMLElement>(`.${bookPageClass}`).forEach((page) => {
    if (page.classList.contains(bookPageBookCoverImageClass)) {
      page.style.removeProperty("min-width");
      page.style.setProperty("width", "auto");
      page.style.setProperty("max-width", "100%");
      page.style.setProperty("margin-left", "auto");
      page.style.setProperty("margin-right", "auto");
      return;
    }
    stretch(page);
  });
}
