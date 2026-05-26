import {
  bookChapterTitleClass,
  chapterBodyClass,
  chapterOpenerPageClass,
} from "@/lib/typography/bookStyles";
import { wrapImagesInHtml } from "@/lib/typography/imageLayout";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** EPUB 챕터 — 장 표지(제목만) + 본문 */
export function buildChapterEpubHtml(title: string, contentHtml: string) {
  const safeTitle = escapeHtml(title.trim() || "제목 없음");
  const body = wrapImagesInHtml(contentHtml?.trim() || "<p></p>");

  return `<section class="${chapterOpenerPageClass}"><h1 class="${bookChapterTitleClass}">${safeTitle}</h1></section><section class="${chapterBodyClass}">${body}</section>`;
}
