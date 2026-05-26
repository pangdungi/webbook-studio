import {
  bookChapterTitleClass,
  bookPageBodyClass,
  bookPageClass,
  bookPageContentClass,
  bookPageCoverClass,
  bookPageQuoteClass,
  bookPageShellClass,
  bookQuotePageClass,
  bookQuoteSourceClass,
  bookQuoteTextClass,
} from "@/lib/pages/bookPageCss";
import type { BookPage } from "@/lib/pages/types";
import { wrapImagesInHtml } from "@/lib/typography/imageLayout";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** EPUB spine — 페이지 1파일 = 1 spine 항목 */
export function buildPageEpubHtml(
  page: BookPage,
  chapterTitle: string,
): string {
  if (page.kind === "chapter-cover") {
    const safeTitle = escapeHtml(chapterTitle.trim() || "제목 없음");
    return `<div class="${bookPageShellClass}"><article class="${bookPageClass} ${bookPageCoverClass}"><div class="${bookPageBodyClass}"><h1 class="${bookChapterTitleClass}">${safeTitle}</h1></div></article></div>`;
  }

  if (page.kind === "quote") {
    const body =
      page.content_html?.trim() ||
      `<div class="${bookQuotePageClass}"><blockquote class="${bookQuoteTextClass}"></blockquote><p class="${bookQuoteSourceClass}"></p></div>`;
    return `<div class="${bookPageShellClass}"><article class="${bookPageClass} ${bookPageQuoteClass}"><div class="${bookPageBodyClass}">${body}</div></article></div>`;
  }

  const body = wrapImagesInHtml(page.content_html?.trim() || "<p class=\"book-body-p\"></p>");
  return `<div class="${bookPageShellClass}"><article class="${bookPageClass} ${bookPageContentClass}"><div class="${bookPageBodyClass}">${body}</div></article></div>`;
}
