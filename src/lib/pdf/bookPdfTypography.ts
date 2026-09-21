import {
  BOOK_EDITOR_PAGE_HEIGHT_PX,
  BOOK_EDITOR_PAGE_WIDTH_PX,
  BOOK_EDITOR_ROOT_FONT_PX,
} from "@/lib/pdf/bookPdfLayout";
import {
  bookCoverImagePageCss,
  bookPageBodyClass,
  bookPageClass,
  bookPageContentClass,
  bookPageQuoteClass,
  bookPageShellClass,
  bookPageShellFlowClass,
  bookPageShellSplashClass,
  bookSharedPageBoxCss,
} from "@/lib/pages/bookPageCss";
import { bookBodyFontFamilyVar } from "@/lib/typography/bodyFonts";
import {
  bookPageSubtitleCss,
  bookProseTypographyCss,
} from "@/lib/typography/bookStyles";
import { columnImageWrapperCss } from "@/lib/typography/imageLayout";

const bookBodyFontFamily = bookBodyFontFamilyVar;

/** 편집기 pageBox + prose 타이포 그대로 — px 고정 (calc/mm 사용 안 함) */
export function bookPdfTypographyCss() {
  const page = `.${bookPageClass}`;
  const content = `.${bookPageClass}.${bookPageContentClass}`;

  return `
    html {
      font-size: ${BOOK_EDITOR_ROOT_FONT_PX}px;
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: ${bookBodyFontFamily};
      background: #fafaf9;
    }
    .${bookPageShellClass} {
      display: block !important;
      box-sizing: border-box !important;
      width: ${BOOK_EDITOR_PAGE_WIDTH_PX}px !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      gap: 0 !important;
    }
    ${bookSharedPageBoxCss("", true)}
    ${page} {
      width: ${BOOK_EDITOR_PAGE_WIDTH_PX}px !important;
      height: ${BOOK_EDITOR_PAGE_HEIGHT_PX}px !important;
      min-height: ${BOOK_EDITOR_PAGE_HEIGHT_PX}px !important;
      max-height: ${BOOK_EDITOR_PAGE_HEIGHT_PX}px !important;
      margin: 0 !important;
      box-shadow: none !important;
      overflow: hidden !important;
    }
    .${bookPageBodyClass} {
      height: 100% !important;
      max-height: 100% !important;
      overflow: hidden !important;
    }
    .${bookPageShellFlowClass} .${bookPageBodyClass} {
      height: 100% !important;
      max-height: 100% !important;
    }
    .${bookPageShellSplashClass} .${bookPageClass} {
      height: ${BOOK_EDITOR_PAGE_HEIGHT_PX}px !important;
      min-height: ${BOOK_EDITOR_PAGE_HEIGHT_PX}px !important;
      max-height: ${BOOK_EDITOR_PAGE_HEIGHT_PX}px !important;
    }
    .${bookPageQuoteClass} {
      height: ${BOOK_EDITOR_PAGE_HEIGHT_PX}px !important;
      min-height: ${BOOK_EDITOR_PAGE_HEIGHT_PX}px !important;
      max-height: ${BOOK_EDITOR_PAGE_HEIGHT_PX}px !important;
    }
    ${bookProseTypographyCss(true)}
    ${bookPageSubtitleCss("", true)}
    ${bookCoverImagePageCss("", true)}
    ${columnImageWrapperCss}
    ${content} img {
      max-width: 100% !important;
      height: auto !important;
      border-radius: 0.5rem !important;
    }
    ${content} .book-page-subtitle + p {
      text-indent: 1em !important;
    }
  `;
}
