import {
  BOOK_PAGE_HEIGHT_VAR,
  isReaderMobileCoverLayout,
  READER_MOBILE_COVER_MEDIA,
  READER_MOBILE_COVER_SURFACE_CLASS,
  READER_SCROLL_CONTENT_MAX_WIDTH,
  READER_VIEWPORT_H_VAR,
  bookAsideFontImportCss,
  bookCoverImageClass,
  bookCoverImagePageCss,
  bookPageAsideClass,
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
import { bookBodyFontFamilyVar } from "@/lib/typography/bodyFonts";

const bookBodyFontFamily = bookBodyFontFamilyVar;

const SCROLL = ".reader-scroll-viewport--scroll";
const SURFACE = `${SCROLL} .reader-scroll-surface`;

/** 아이폰·갤럭시·아이패드 등 — 표지가 읽기 화면 한 장을 가득 채움 */
function readerMobileCoverSplashCss(scope: string) {
  const p = `${scope} `;
  const i = " !important";

  return `
    ${p}.${bookPageShellSplashClass}:has(.${bookPageBookCoverImageClass}) {
      box-sizing: border-box${i};
      width: 100vw${i};
      max-width: 100vw${i};
      margin-left: calc(50% - 50vw)${i};
      margin-right: calc(50% - 50vw)${i};
      min-height: var(${READER_VIEWPORT_H_VAR}, 100dvh)${i};
      height: var(${READER_VIEWPORT_H_VAR}, 100dvh)${i};
      max-height: var(${READER_VIEWPORT_H_VAR}, 100dvh)${i};
      padding: 0${i};
      align-items: stretch${i};
      justify-content: stretch${i};
      background-color: #ffffff${i};
    }
    ${p}.${bookPageBookCoverClass}.${bookPageBookCoverImageClass} {
      width: 100%${i};
      max-width: 100%${i};
      min-width: 0${i};
      min-height: var(${READER_VIEWPORT_H_VAR}, 100dvh)${i};
      height: var(${READER_VIEWPORT_H_VAR}, 100dvh)${i};
      max-height: var(${READER_VIEWPORT_H_VAR}, 100dvh)${i};
      margin: 0${i};
      padding: 0${i};
      display: flex${i};
      align-items: center${i};
      justify-content: center${i};
      background-color: #ffffff${i};
      overflow: hidden${i};
    }
    ${p}.${bookPageBookCoverImageClass} .${bookCoverImageClass} {
      width: 100%${i};
      height: 100%${i};
      max-width: none${i};
      max-height: none${i};
      object-fit: contain${i};
      object-position: center center${i};
      box-shadow: none${i};
      border-radius: 0${i};
    }
  `;
}

/** 스크롤 명언 페이지 — 본문 장과 동일한 한 장 크기(A4 비율), 가운데 정렬만 다름 */
function readerScrollQuotePageBoxCss() {
  const p = `${SURFACE} `;
  const i = " !important";

  return `
    ${p}.${bookPageClass}.${bookPageQuoteClass} {
      box-sizing: border-box${i};
      width: 100%${i};
      max-width: 100%${i};
      min-width: 0${i};
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

/** 스크롤 본문 장 — 읽기 열 너비 안에서 100% */
function readerScrollContentPageBoxCss() {
  const p = `${SURFACE} `;
  const i = " !important";

  return `
    ${p}.${bookPageClass}.${bookPageContentClass} {
      box-sizing: border-box${i};
      width: 100%${i};
      max-width: 100%${i};
      min-width: 0${i};
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
      max-width: 100%${i};
      min-width: 0${i};
      height: auto${i};
      max-height: none${i};
      overflow: visible${i};
    }
    ${p}.${bookPageClass}.${bookPageContentClass}.${bookPageAsideClass} {
      background-color: #ececea${i};
      font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif${i};
      color: #44403c${i};
    }
    ${p}.${bookPageClass}.${bookPageContentClass}.${bookPageAsideClass} .${bookPageBodyClass},
    ${p}.${bookPageClass}.${bookPageContentClass}.${bookPageAsideClass} .book-page-subtitle {
      font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif${i};
    }
  `;
}

/** 스크롤 모드 — 넓은 화면에서 최대 ${READER_SCROLL_CONTENT_MAX_WIDTH} 열, 양옆 여백 */
export function readerScrollFullBleedCss() {
  const i = " !important";

  return `
    ${bookAsideFontImportCss()}
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
    ${readerMobileCoverSplashCss(`${SURFACE}.${READER_MOBILE_COVER_SURFACE_CLASS}`)}
    @media ${READER_MOBILE_COVER_MEDIA} {
      ${readerMobileCoverSplashCss(SURFACE)}
    }
    ${SCROLL} {
      background-color: #fafaf9${i};
    }
    ${SURFACE} {
      width: 100%${i};
      max-width: ${READER_SCROLL_CONTENT_MAX_WIDTH}${i};
      min-width: 0${i};
      margin-left: auto${i};
      margin-right: auto${i};
      padding: 0${i};
      align-items: stretch${i};
    }
    ${SCROLL} .reader-scroll-anchor {
      width: 100%${i};
      max-width: 100%${i};
      min-width: 0${i};
      margin: 0${i};
      padding: 0${i};
      align-items: stretch${i};
    }
    ${SURFACE} .${bookPageShellClass},
    ${SURFACE} .${bookPageShellSplashClass},
    ${SURFACE} .${bookPageShellFlowClass} {
      width: 100%${i};
      max-width: 100%${i};
      min-width: 0${i};
      margin: 0${i};
      padding: 0${i};
      gap: 0${i};
      align-items: stretch${i};
    }
    ${SURFACE} .${bookPageClass}:not(.${bookPageBookCoverImageClass}),
    ${SURFACE} .${bookPageShellSplashClass} .${bookPageClass}:not(.${bookPageBookCoverImageClass}),
    ${SURFACE} .${bookPageShellFlowClass} .${bookPageClass} {
      width: 100%${i};
      max-width: 100%${i};
      min-width: 0${i};
      margin: 0${i};
    }
  `;
}

/** CSS 캐시·구버전 덮어쓰기 — 스크롤 레이아웃 직후 인라인 적용 */
export function applyScrollFullBleedLayout(root: HTMLElement, viewportWidth: number) {
  const mobileCover = isReaderMobileCoverLayout(viewportWidth);
  root.classList.toggle(READER_MOBILE_COVER_SURFACE_CLASS, mobileCover);

  const fillColumn = (el: HTMLElement) => {
    el.style.setProperty("width", "100%");
    el.style.setProperty("max-width", "100%");
    el.style.setProperty("min-width", "0");
    el.style.setProperty("margin-left", "0");
    el.style.setProperty("margin-right", "0");
  };

  root.style.setProperty("width", "100%");
  root.style.setProperty("max-width", READER_SCROLL_CONTENT_MAX_WIDTH);
  root.style.setProperty("min-width", "0");
  root.style.setProperty("margin-left", "auto");
  root.style.setProperty("margin-right", "auto");
  root.style.setProperty("align-items", "stretch");

  root.querySelectorAll<HTMLElement>(".reader-scroll-anchor").forEach(fillColumn);

  root.querySelectorAll<HTMLElement>(`.${bookPageShellClass}`).forEach((shell) => {
    fillColumn(shell);
    shell.style.setProperty("--book-page-w", "100%");
  });

  root.querySelectorAll<HTMLElement>(`.${bookPageClass}`).forEach((page) => {
    if (page.classList.contains(bookPageBookCoverImageClass)) {
      if (mobileCover) {
        fillColumn(page);
        page.style.setProperty("margin-left", "0");
        page.style.setProperty("margin-right", "0");
      } else {
        page.style.removeProperty("min-width");
        page.style.setProperty("width", "auto");
        page.style.setProperty("max-width", "100%");
        page.style.setProperty("margin-left", "auto");
        page.style.setProperty("margin-right", "auto");
      }
      return;
    }
    fillColumn(page);
  });
}
