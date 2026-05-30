import type { ReaderViewMode } from "@/lib/reader/viewMode";
import type { BookHeadingFonts } from "@/lib/typography/headingFonts";
import { bookFontFaceCss } from "@/lib/typography/headingFonts";
import {
  bookPageBodyClass,
  bookPageClass,
  bookPageContentClass,
  bookPageQuoteClass,
  bookPageShellClass,
  bookPageShellFlowClass,
  bookPageShellSplashClass,
} from "@/lib/pages/bookPageCss";
import { readerPaginateMeasureCss } from "@/lib/reader/paginateFlowPages";
import { readerScrollFullBleedCss } from "@/lib/reader/readerScrollFullBleedCss";
import { readerHtmlScrollInjectCss } from "@/lib/typography/bookStyles";

export const READER_SLIDE_W_VAR = "--reader-slide-w";

/** HTML 리더 — 스크롤(세로 웹페이지) / 페이지(한 화면에 한 장) */
export function readerScrollSurfaceCss(
  writingMode: "horizontal-tb" | "vertical-rl",
  headingFonts: BookHeadingFonts,
  viewMode: ReaderViewMode,
  protectContent = false,
) {
  const i = " !important";
  const paginated = viewMode === "paginated";

  const modeLayout = paginated
    ? `
    .reader-scroll-viewport--paginated {
      overflow-x: hidden${i};
      overflow-y: hidden${i};
      touch-action: manipulation${i};
      background-color: #fafaf9${i};
    }
    .reader-scroll-surface--paginated {
      flex-direction: row${i};
      flex-wrap: nowrap${i};
      align-items: stretch${i};
      width: max-content${i};
      max-width: none${i};
      margin: 0${i};
      min-height: 100%${i};
      height: 100%${i};
      will-change: transform${i};
    }
    .reader-scroll-viewport--paginated .reader-scroll-anchor {
      flex: 0 0 var(${READER_SLIDE_W_VAR}, 100%)${i};
      width: var(${READER_SLIDE_W_VAR}, 100%)${i};
      min-width: var(${READER_SLIDE_W_VAR}, 100%)${i};
      max-width: var(${READER_SLIDE_W_VAR}, 100%)${i};
      height: 100%${i};
      box-sizing: border-box${i};
      overflow: hidden${i};
    }
    .reader-scroll-viewport--paginated .${bookPageShellClass} {
      height: 100%${i};
      min-height: 100%${i};
      align-items: stretch${i};
      justify-content: stretch${i};
    }
    .reader-scroll-viewport--paginated .${bookPageShellSplashClass} .${bookPageClass} {
      height: 100%${i};
      min-height: 100%${i};
      max-height: 100%${i};
    }
    .reader-scroll-viewport--paginated .${bookPageShellClass},
    .reader-scroll-viewport--paginated .${bookPageClass} {
      width: 100%${i};
      max-width: 100%${i};
      margin-left: 0${i};
      margin-right: 0${i};
    }
    .reader-scroll-viewport--paginated .${bookPageShellFlowClass} .${bookPageClass}.${bookPageContentClass},
    .reader-scroll-viewport--paginated .${bookPageShellFlowClass} .${bookPageClass}.${bookPageContentClass} .${bookPageBodyClass},
    .reader-scroll-viewport--paginated .${bookPageShellFlowClass} .${bookPageClass}.${bookPageQuoteClass},
    .reader-scroll-viewport--paginated .${bookPageShellFlowClass} .${bookPageClass}.${bookPageQuoteClass} .${bookPageBodyClass} {
      height: 100%${i};
      max-height: 100%${i};
      overflow: hidden${i};
    }
    .reader-scroll-viewport--paginated .${bookPageShellFlowClass} .${bookPageClass}.${bookPageQuoteClass} .${bookPageBodyClass} {
      overflow-y: auto${i};
      overflow-x: hidden${i};
    }
    .reader-scroll-viewport--paginated .${bookPageShellFlowClass} .${bookPageBodyClass} img {
      max-width: 100%${i};
      width: auto${i};
      height: auto${i};
      max-height: calc(var(--wbs-reader-vh, 100dvh) - 7rem)${i};
      object-fit: contain${i};
    }
  `
    : `
    .reader-scroll-viewport--scroll {
      overflow-x: hidden${i};
      overflow-y: auto${i};
      overflow-anchor: none${i};
      touch-action: pan-y${i};
      background-color: #ffffff${i};
    }
    .reader-scroll-surface--scroll {
      flex-direction: column${i};
      width: 100%${i};
      max-width: none${i};
      margin: 0${i};
      min-height: min-content${i};
      height: auto${i};
    }
    .reader-scroll-surface--scroll .reader-scroll-anchor {
      flex-shrink: 0${i};
      scroll-margin-top: 0${i};
    }
    .reader-scroll-surface--scroll .${bookPageShellFlowClass} {
      margin-bottom: 0${i};
    }
    .reader-scroll-surface--scroll .${bookPageShellFlowClass} .${bookPageClass}.${bookPageContentClass} {
      height: auto${i};
      min-height: 12rem${i};
      max-height: none${i};
      overflow: visible${i};
    }
    .reader-scroll-surface--scroll .${bookPageShellFlowClass} .${bookPageClass}.${bookPageContentClass} .${bookPageBodyClass} {
      height: auto${i};
      max-height: none${i};
      overflow: visible${i};
    }
  `;

  return `
    ${bookFontFaceCss(headingFonts)}
    ${readerPaginateMeasureCss()}
    .reader-scroll-viewport {
      position: absolute${i};
      inset: 0${i};
      box-sizing: border-box${i};
      width: 100%${i};
      height: 100%${i};
      min-height: 0${i};
      max-height: 100%${i};
      -webkit-overflow-scrolling: touch${i};
      overscroll-behavior: auto${i};
      background-color: #ffffff${i};
      scrollbar-width: none${i};
      -ms-overflow-style: none${i};
    }
    .reader-scroll-viewport::-webkit-scrollbar {
      display: none${i};
      width: 0${i};
      height: 0${i};
    }
    .reader-scroll-surface {
      box-sizing: border-box${i};
      display: flex${i};
      padding: 0${i};
      overflow: visible${i};
    }
    ${modeLayout}
    ${readerHtmlScrollInjectCss(writingMode, headingFonts, protectContent, viewMode)}
    ${viewMode === "scroll" ? readerScrollFullBleedCss() : ""}
  `;
}
