import {
  chapterContentToJson,
  parseChapterContent,
} from "@/lib/pages/content";
import type { BookPage, ChapterContentV2 } from "@/lib/pages/types";

export function getChapterContentParsed(
  chapter: Pick<
    { content_json: Record<string, unknown>; title: string; content_html: string },
    "content_json" | "title" | "content_html"
  >,
): ChapterContentV2 {
  return parseChapterContent(
    chapter.content_json,
    chapter.title,
    chapter.content_html,
  );
}

export function getPageEditorMemo(
  contentJson: Record<string, unknown>,
  pageId: string,
  chapterTitle?: string,
  contentHtml?: string,
): string {
  const parsed = parseChapterContent(contentJson, chapterTitle, contentHtml);
  return parsed.pages.find((p) => p.id === pageId)?.editor_memo ?? "";
}

/** 목차·검수용 — 표지 제외 본문·명언 페이지 */
export function trackablePages(pages: BookPage[]): BookPage[] {
  return pages.filter((p) => p.kind !== "chapter-cover");
}

export function chapterPageDoneStats(pages: BookPage[]): {
  done: number;
  total: number;
  allDone: boolean;
} {
  const trackable = trackablePages(pages);
  const done = trackable.filter((p) => p.editor_done).length;
  return {
    done,
    total: trackable.length,
    allDone: trackable.length > 0 && done === trackable.length,
  };
}

export function withPageDone(
  contentJson: Record<string, unknown>,
  pageId: string,
  done: boolean,
  chapterTitle?: string,
  contentHtml?: string,
): Record<string, unknown> {
  const parsed = parseChapterContent(contentJson, chapterTitle, contentHtml);
  const pages = parsed.pages.map((p) =>
    p.id === pageId ? { ...p, editor_done: done } : p,
  );
  return chapterContentToJson(pages) as unknown as Record<string, unknown>;
}

export function withPageMemo(
  contentJson: Record<string, unknown>,
  pageId: string,
  memo: string,
  chapterTitle?: string,
  contentHtml?: string,
): Record<string, unknown> {
  const parsed = parseChapterContent(contentJson, chapterTitle, contentHtml);
  const pages = parsed.pages.map((p) =>
    p.id === pageId ? { ...p, editor_memo: memo } : p,
  );
  return chapterContentToJson(pages) as unknown as Record<string, unknown>;
}
