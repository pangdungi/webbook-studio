import { normalizeBookCoverStyle } from "@/lib/books/coverStyle";
import { parseChapterContent } from "@/lib/pages/content";
import type { Book, Chapter } from "@/lib/types/database";
import {
  buildBookCoverEpubHtml,
  buildPageEpubHtml,
} from "@/lib/typography/pageLayout";

export type ReaderTocEntry = {
  label: string;
  /** 스크롤 앵커 id */
  href: string;
};

export type ReaderScrollPage = {
  id: string;
  html: string;
};

function anchorId(prefix: string, pageId: string) {
  return `wbs-${prefix}-${pageId}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function wrapAnchor(id: string, html: string) {
  return `<div id="${id}" class="reader-scroll-anchor">${html}</div>`;
}

/** 독자 스크롤 — EPUB spine 대신 한 덩어리 HTML (일반 웹페이지) */
export function buildBookScrollDocument(
  book: Pick<
    Book,
    | "title"
    | "subtitle"
    | "cover_bg_color"
    | "cover_title_color"
  >,
  chapters: Pick<Chapter, "id" | "title" | "content_json" | "content_html">[],
): { bodyHtml: string; toc: ReaderTocEntry[]; pages: ReaderScrollPage[] } {
  const coverStyle = normalizeBookCoverStyle(book);
  const toc: ReaderTocEntry[] = [];
  const parts: string[] = [];
  const pages: ReaderScrollPage[] = [];

  const coverId = "wbs-book-cover";
  const coverHtml = buildBookCoverEpubHtml(book.title, book.subtitle, coverStyle);
  pages.push({ id: coverId, html: coverHtml });
  parts.push(wrapAnchor(coverId, coverHtml));
  toc.push({ label: "표지", href: coverId });

  for (const chapter of chapters) {
    const parsed = parseChapterContent(
      chapter.content_json,
      chapter.title,
      chapter.content_html,
    );

    for (const page of parsed.pages) {
      const id = anchorId(chapter.id, page.id);
      const pageHtml = buildPageEpubHtml(page, chapter.title);
      pages.push({ id, html: pageHtml });
      parts.push(wrapAnchor(id, pageHtml));

      if (page.kind === "chapter-cover") {
        toc.push({ label: chapter.title.trim() || "장", href: id });
      }
    }
  }

  return { bodyHtml: parts.join("\n"), toc, pages };
}
