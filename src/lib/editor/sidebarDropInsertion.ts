import type { ClientRect } from "@dnd-kit/core";
import {
  parseChapterDragId,
  parseChapterDropZoneId,
  parsePageDragId,
  resolveSidebarOverChapterId,
} from "@/lib/pages/moveChapterPage";

export type InsertPosition = "before" | "after";

export type SidebarDropInsertion =
  | {
      kind: "page";
      chapterId: string;
      pageId: string;
      position: InsertPosition;
    }
  | {
      kind: "chapter";
      chapterId: string;
      position: InsertPosition;
    };

export function insertPositionFromPointer(
  pointerY: number,
  rect: ClientRect,
): InsertPosition {
  const mid = rect.top + rect.height / 2;
  return pointerY < mid ? "before" : "after";
}

export function resolveSidebarDropInsertion(
  overId: string,
  overRect: ClientRect,
  pointerY: number,
  dragKind: "chapter" | "page",
  firstPageByChapter: Map<string, string>,
  lastPageByChapter: Map<string, string>,
): SidebarDropInsertion | null {
  const position = insertPositionFromPointer(pointerY, overRect);
  const overPage = parsePageDragId(overId);

  if (dragKind === "page") {
    if (overPage) {
      return {
        kind: "page",
        chapterId: overPage.chapterId,
        pageId: overPage.pageId,
        position,
      };
    }

    const chapterId = resolveSidebarOverChapterId(overId);
    if (!chapterId) return null;

    if (position === "before") {
      const firstPageId = firstPageByChapter.get(chapterId);
      if (firstPageId) {
        return { kind: "page", chapterId, pageId: firstPageId, position: "before" };
      }
      return { kind: "chapter", chapterId, position: "before" };
    }

    const lastPageId = lastPageByChapter.get(chapterId);
    if (lastPageId) {
      return { kind: "page", chapterId, pageId: lastPageId, position: "after" };
    }
    return { kind: "chapter", chapterId, position: "after" };
  }

  const chapterId =
    parseChapterDragId(overId) ??
    parseChapterDropZoneId(overId) ??
    overPage?.chapterId ??
    null;
  if (!chapterId) return null;

  return { kind: "chapter", chapterId, position };
}

export function insertionToPageMoveArgs(insertion: SidebarDropInsertion): {
  overId: string;
  insertPosition: InsertPosition;
} {
  if (insertion.kind === "page") {
    return {
      overId: `page:${insertion.chapterId}:${insertion.pageId}`,
      insertPosition: insertion.position,
    };
  }
  return {
    overId: `chapter-drop:${insertion.chapterId}`,
    insertPosition: insertion.position,
  };
}

export function reorderChapterIds(
  chapterIds: string[],
  activeChapterId: string,
  targetChapterId: string,
  position: InsertPosition,
): string[] {
  const next = chapterIds.filter((id) => id !== activeChapterId);
  let toIdx = next.indexOf(targetChapterId);
  if (toIdx < 0) return chapterIds;
  if (position === "after") toIdx += 1;
  next.splice(toIdx, 0, activeChapterId);
  return next;
}
