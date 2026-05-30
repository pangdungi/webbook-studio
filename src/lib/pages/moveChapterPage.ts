import {
  chapterContentToJson,
  parseChapterContent,
} from "@/lib/pages/content";
import type { BookPage } from "@/lib/pages/types";
import type { Chapter } from "@/lib/types/database";

export type FlatPageRef = { chapterId: string; pageId: string };

export const pageDragId = (chapterId: string, pageId: string) =>
  `page:${chapterId}:${pageId}`;

export const chapterDragId = (chapterId: string) => `chapter:${chapterId}`;

export function parsePageDragId(
  id: string | number,
): { chapterId: string; pageId: string } | null {
  const s = String(id);
  if (!s.startsWith("page:")) return null;
  const rest = s.slice(5);
  const sep = rest.indexOf(":");
  if (sep < 0) return null;
  return { chapterId: rest.slice(0, sep), pageId: rest.slice(sep + 1) };
}

export function parseChapterDragId(id: string | number): string | null {
  const s = String(id);
  return s.startsWith("chapter:") ? s.slice(8) : null;
}

export function chapterMovablePages(pages: BookPage[]): BookPage[] {
  return pages.filter((p) => p.kind !== "chapter-cover");
}

function chapterPages(ch: Chapter): BookPage[] {
  return parseChapterContent(
    ch.content_json,
    ch.title,
    ch.content_html,
  ).pages;
}

export function buildFlatPageList(chapters: Chapter[]): FlatPageRef[] {
  const flat: FlatPageRef[] = [];
  for (const ch of chapters) {
    for (const p of chapterMovablePages(chapterPages(ch))) {
      flat.push({ chapterId: ch.id, pageId: p.id });
    }
  }
  return flat;
}

function insertIndexForChapter(
  flat: FlatPageRef[],
  chapterOrder: string[],
  chapterId: string,
): number {
  const inChapter = flat.findIndex((f) => f.chapterId === chapterId);
  if (inChapter >= 0) return inChapter;

  const pos = chapterOrder.indexOf(chapterId);
  for (let i = pos + 1; i < chapterOrder.length; i++) {
    const j = flat.findIndex((f) => f.chapterId === chapterOrder[i]);
    if (j >= 0) return j;
  }
  return flat.length;
}

export function findPageInChapters(
  chapters: Chapter[],
  pageId: string,
): { chapter: Chapter; page: BookPage } | null {
  for (const chapter of chapters) {
    const page = chapterPages(chapter).find((p) => p.id === pageId);
    if (page) return { chapter, page };
  }
  return null;
}

export function validatePageMove(
  chapters: Chapter[],
  pageId: string,
  fromChapterId: string,
  toChapterId: string,
): string | null {
  const found = findPageInChapters(chapters, pageId);
  if (!found) return "페이지를 찾을 수 없습니다.";
  if (found.page.kind === "chapter-cover") {
    return "장 표지는 이동할 수 없습니다.";
  }
  return null;
}

export function rebuildChaptersFromFlat(
  chapters: Chapter[],
  flat: FlatPageRef[],
): Chapter[] {
  const pageById = new Map<string, BookPage>();
  for (const ch of chapters) {
    for (const p of chapterPages(ch)) {
      pageById.set(p.id, p);
    }
  }

  return chapters.map((ch) => {
    const existing = chapterPages(ch);
    const cover = existing.find((p) => p.kind === "chapter-cover");
    const ordered = flat
      .filter((f) => f.chapterId === ch.id)
      .map((f) => pageById.get(f.pageId))
      .filter((p): p is BookPage => !!p);
    const pages = cover ? [cover, ...ordered] : ordered;
    const json = chapterContentToJson(pages);
    return {
      ...ch,
      content_json: json as unknown as Record<string, unknown>,
      content_html: "",
    };
  });
}

/** 목차 드래그 — 같은 장 순서 변경·다른 장으로 이동 */
export function movePageByDrag(
  chapters: Chapter[],
  activePageId: string,
  overId: string | number,
): { chapters: Chapter[] } | { error: string } {
  const flat = buildFlatPageList(chapters);
  const fromIdx = flat.findIndex((f) => f.pageId === activePageId);
  if (fromIdx < 0) return { error: "페이지를 찾을 수 없습니다." };

  const [moved] = flat.splice(fromIdx, 1);
  const fromChapterId = moved.chapterId;

  const overChapterId = parseChapterDragId(overId);
  const overPage = parsePageDragId(overId);

  let toChapterId: string;
  let toIdx: number;

  if (overPage) {
    toChapterId = overPage.chapterId;
    toIdx = flat.findIndex((f) => f.pageId === overPage.pageId);
    if (toIdx < 0) toIdx = flat.length;
  } else if (overChapterId) {
    toChapterId = overChapterId;
    toIdx = insertIndexForChapter(
      flat,
      chapters.map((c) => c.id),
      toChapterId,
    );
  } else {
    return { error: "이동할 위치를 찾을 수 없습니다." };
  }

  const validation = validatePageMove(
    chapters,
    activePageId,
    fromChapterId,
    toChapterId,
  );
  if (validation) return { error: validation };

  moved.chapterId = toChapterId;
  flat.splice(toIdx, 0, moved);

  return { chapters: rebuildChaptersFromFlat(chapters, flat) };
}

function chapterPageOrderKey(ch: Chapter): string {
  return chapterPages(ch)
    .map((p) => p.id)
    .join(",");
}

export function chaptersWithChangedPages(
  before: Chapter[],
  after: Chapter[],
): string[] {
  const ids: string[] = [];
  for (const ch of after) {
    const prev = before.find((c) => c.id === ch.id);
    if (!prev) {
      ids.push(ch.id);
      continue;
    }
    if (chapterPageOrderKey(prev) !== chapterPageOrderKey(ch)) {
      ids.push(ch.id);
    }
  }
  return ids;
}
