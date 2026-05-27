import {
  bookPageBodyClass,
  bookPageClass,
  bookPageContentClass,
  bookPageScrollSplashPageCss,
  bookPageShellClass,
  bookPageShellFlowClass,
  bookPageShellSplashClass,
} from "@/lib/pages/bookPageCss";
import { bookBodyFontFamily } from "@/lib/typography/bookStyles";

const SCROLL = ".reader-scroll-viewport--scroll";
const SURFACE = `${SCROLL} .reader-scroll-surface`;

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
    ${bookPageScrollSplashPageCss(SURFACE, true)}
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
    ${SURFACE} .${bookPageClass},
    ${SURFACE} .${bookPageShellSplashClass} .${bookPageClass},
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
    stretch(page);
  });
}
