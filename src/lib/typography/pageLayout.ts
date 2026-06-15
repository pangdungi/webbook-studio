import {
  normalizeBookCoverStyle,
  type BookCoverStyle,
} from "@/lib/books/coverStyle";
import {
  bookBookTitleClass,
  bookChapterTitleClass,
  bookPageBodyClass,
  bookPageBookCoverClass,
  bookPageBookCoverImageClass,
  bookCoverImageClass,
  bookPageClass,
  bookPageContentClass,
  bookPageCoverClass,
  bookPageQuoteClass,
  bookPageShellClass,
  bookPageShellFlowClass,
  bookPageShellSplashClass,
  bookQuotePageClass,
  bookQuoteSourceClass,
  bookQuoteTextClass,
} from "@/lib/pages/bookPageCss";
import { contentPageDocToHtml } from "@/lib/editor/pageContentHtml";
import {
  buildPageLeadHtml,
  splitPageContentLead,
} from "@/lib/pages/pageTitle";
import type { BookPage } from "@/lib/pages/types";
import { wrapImagesInHtml } from "@/lib/typography/imageLayout";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** EPUB — 책 표지 (첫 페이지) */
export function buildBookCoverEpubHtml(
  title: string,
  subtitle: string | null | undefined,
  cover: Partial<BookCoverStyle>,
  coverImageUrl?: string | null,
): string {
  if (coverImageUrl?.trim()) {
    const safeSrc = escapeHtml(coverImageUrl.trim());
    return `<div class="${bookPageShellClass} ${bookPageShellSplashClass}"><article class="${bookPageClass} ${bookPageBookCoverClass} ${bookPageBookCoverImageClass}"><img class="${bookCoverImageClass}" src="${safeSrc}" alt="${escapeHtml(title.trim() || "표지")}" /></article></div>`;
  }

  const { cover_bg_color, cover_title_color } = normalizeBookCoverStyle(cover);
  const safeTitle = escapeHtml(title.trim() || "제목 없음");
  const subtitleHtml = subtitle?.trim()
    ? `<p class="book-book-subtitle" style="margin:1.25rem 0 0;font-size:1.05rem;line-height:1.5;color:${cover_title_color};opacity:0.85;white-space:pre-line;text-align:left;">${escapeHtml(subtitle.trim())}</p>`
    : "";

  const articleStyle = [
    `--book-cover-bg:${cover_bg_color}`,
    `--book-cover-title-color:${cover_title_color}`,
    `background-color:${cover_bg_color}`,
    "padding:5.5rem 2rem 2.5rem 3rem",
  ].join(";");

  return `<div class="${bookPageShellClass} ${bookPageShellSplashClass}"><article class="${bookPageClass} ${bookPageBookCoverClass}" style="${articleStyle}"><div class="${bookPageBodyClass}"><h1 class="${bookBookTitleClass}" style="margin:0;font-size:2.25rem;font-weight:700;line-height:1.25;text-align:left;color:${cover_title_color};white-space:pre-line;">${safeTitle}</h1>${subtitleHtml}</div></article></div>`;
}

/** EPUB spine — 페이지 1파일 = 1 spine 항목 */
export function buildPageEpubHtml(
  page: BookPage,
  chapterTitle: string,
): string {
  if (page.kind === "chapter-cover") {
    const safeTitle = escapeHtml(chapterTitle.trim() || "제목 없음");
    return `<div class="${bookPageShellClass} ${bookPageShellSplashClass}"><article class="${bookPageClass} ${bookPageCoverClass}"><div class="${bookPageBodyClass}"><h1 class="${bookChapterTitleClass}">${safeTitle}</h1></div></article></div>`;
  }

  if (page.kind === "quote") {
    const body =
      page.content_html?.trim() ||
      `<div class="${bookQuotePageClass}"><blockquote class="${bookQuoteTextClass}"></blockquote><p class="${bookQuoteSourceClass}"></p></div>`;
    return `<div class="${bookPageShellClass} ${bookPageShellFlowClass}"><article class="${bookPageClass} ${bookPageQuoteClass}"><div class="${bookPageBodyClass}">${body}</div></article></div>`;
  }

  const { lead, bodyDoc } = splitPageContentLead(page);
  const bodyInner = wrapImagesInHtml(
    contentPageDocToHtml(bodyDoc).trim() || "<p class=\"book-body-p\"></p>",
  );
  const leadHtml = lead ? buildPageLeadHtml(lead) : "";
  return `<div class="${bookPageShellClass} ${bookPageShellFlowClass}"><article class="${bookPageClass} ${bookPageContentClass}"><div class="${bookPageBodyClass}">${leadHtml}${bodyInner}</div></article></div>`;
}
