import { normalizeBookCoverStyle } from "@/lib/books/coverStyle";
import { parseChapterContent } from "@/lib/pages/content";
import { getPageTocLabel } from "@/lib/pages/pageTitle";
import type { Book, Chapter } from "@/lib/types/database";
import {
  buildBookCoverEpubHtml,
  buildPageEpubHtml,
} from "@/lib/typography/pageLayout";

export type ReaderTocEntry = {
  label: string;
  /** 스크롤 앵커 id */
  href: string;
  /** 0 = 표지·장, 1 = 장 안 페이지(부제목·본문·명언) */
  depth?: 0 | 1;
};

export type ReaderTocGroup = {
  head: ReaderTocEntry;
  pages: ReaderTocEntry[];
};

/** 평면 목차 → 장(표지) 단위 그룹 */
export function groupReaderToc(entries: ReaderTocEntry[]): ReaderTocGroup[] {
  const groups: ReaderTocGroup[] = [];

  for (const item of entries) {
    if (item.depth === 1) {
      const last = groups[groups.length - 1];
      if (last) last.pages.push(item);
      else groups.push({ head: item, pages: [] });
      continue;
    }
    groups.push({ head: item, pages: [] });
  }

  return groups;
}

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
  coverImageUrl?: string | null,
): { bodyHtml: string; toc: ReaderTocEntry[]; pages: ReaderScrollPage[] } {
  const coverStyle = normalizeBookCoverStyle(book);
  const toc: ReaderTocEntry[] = [];
  const parts: string[] = [];
  const pages: ReaderScrollPage[] = [];

  const coverId = "wbs-book-cover";
  const coverHtml = buildBookCoverEpubHtml(
    book.title,
    book.subtitle,
    coverStyle,
    coverImageUrl,
  );
  pages.push({ id: coverId, html: coverHtml });
  parts.push(wrapAnchor(coverId, coverHtml));
  toc.push({ label: "표지", href: coverId, depth: 0 });

  for (const chapter of chapters) {
    const parsed = parseChapterContent(
      chapter.content_json,
      chapter.title,
      chapter.content_html,
    );

    let contentPageIndex = 0;

    for (const page of parsed.pages) {
      const pageHtml = buildPageEpubHtml(page, chapter.title);
      const pageAnchor = anchorId(chapter.id, page.id);
      parts.push(wrapAnchor(pageAnchor, pageHtml));
      pages.push({
        id: pageAnchor,
        html: pageHtml,
      });

      if (page.kind === "chapter-cover") {
        toc.push({
          label: chapter.title.trim() || "장",
          href: pageAnchor,
          depth: 0,
        });
      } else if (page.kind === "content") {
        toc.push({
          label: getPageTocLabel(page, contentPageIndex++),
          href: pageAnchor,
          depth: 1,
        });
      }
    }
  }

  return { bodyHtml: parts.join("\n"), toc, pages };
}
