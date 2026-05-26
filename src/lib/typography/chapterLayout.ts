import {
  bookChapterTitleClass,
  bookProseClass,
  chapterBodyClass,
  chapterOpenerPageClass,
  chapterOpenerSplashClass,
} from "@/lib/typography/bookStyles";
import { wrapImagesInHtml } from "@/lib/typography/imageLayout";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 장 표지 section — 편집기·EPUB 동일 */
export function buildChapterOpenerHtml(title: string) {
  const safeTitle = escapeHtml(title.trim() || "제목 없음");

  return `<section class="${chapterOpenerPageClass}"><h1 class="${bookChapterTitleClass}">${safeTitle}</h1><div class="${chapterOpenerSplashClass}" aria-hidden="true"></div></section>`;
}

/** EPUB spine — 장 표지 전용 페이지 */
export function buildChapterOpenerPageHtml(title: string) {
  return `<div class="${bookProseClass}">${buildChapterOpenerHtml(title)}</div>`;
}

/** EPUB spine — 본문 전용 페이지 */
export function buildChapterBodyPageHtml(contentHtml: string) {
  const body = wrapImagesInHtml(contentHtml?.trim() || "<p></p>");

  return `<div class="${bookProseClass}"><section class="${chapterBodyClass}">${body}</section></div>`;
}

/** 미리보기/테스트 — 한 파일에 표지+본문 */
export function buildChapterEpubHtml(title: string, contentHtml: string) {
  return `<div class="${bookProseClass}">${buildChapterOpenerHtml(title)}<section class="${chapterBodyClass}">${wrapImagesInHtml(contentHtml?.trim() || "<p></p>")}</section></div>`;
}
