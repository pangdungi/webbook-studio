import {
  closestCenter,
  pointerWithin,
  type CollisionDetection,
} from "@dnd-kit/core";

/** 장 드래그 — 장·페이지 행 모두 드롭 대상, pointer 우선 */
function chapterDragCollision(args: Parameters<CollisionDetection>[0]) {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) return pointerHits;

  const chapterTargets = args.droppableContainers.filter(({ id }) => {
    const key = String(id);
    return key.startsWith("chapter:") && !key.startsWith("chapter-drop:");
  });

  if (chapterTargets.length > 0) {
    return closestCenter({ ...args, droppableContainers: chapterTargets });
  }

  return closestCenter(args);
}

/** 페이지 드래그 — 포인터 아래 항목 우선 */
function pageDragCollision(args: Parameters<CollisionDetection>[0]) {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) return pointerHits;
  return closestCenter(args);
}

export const sidebarCollisionDetection: CollisionDetection = (args) => {
  const activeId = String(args.active.id);
  if (activeId.startsWith("chapter:")) return chapterDragCollision(args);
  if (activeId.startsWith("page:")) return pageDragCollision(args);
  return closestCenter(args);
};
