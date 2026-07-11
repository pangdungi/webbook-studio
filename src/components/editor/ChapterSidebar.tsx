"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PageMemoDialog } from "@/components/editor/PageMemoDialog";
import {
  insertionToPageMoveArgs,
  reorderChapterIds,
  resolveSidebarDropInsertion,
  type SidebarDropInsertion,
} from "@/lib/editor/sidebarDropInsertion";
import { sidebarCollisionDetection } from "@/lib/editor/sidebarCollisionDetection";
import { parseChapterContent } from "@/lib/pages/content";
import { chapterPageDoneStats, trackablePages } from "@/lib/pages/chapterEditorMeta";
import {
  chapterDragId,
  chapterDropZoneId,
  pageDragId,
  parseChapterDragId,
  parsePageDragId,
} from "@/lib/pages/moveChapterPage";
import { getPageTocLabel } from "@/lib/pages/pageTitle";
import type { Chapter } from "@/lib/types/database";

type SidebarDragKind = "chapter" | "page" | null;

type SidebarDnDUi = {
  dragKind: SidebarDragKind;
  insertion: SidebarDropInsertion | null;
  activePageId: string | null;
  activeChapterId: string | null;
};

const SidebarDnDUiContext = createContext<SidebarDnDUi>({
  dragKind: null,
  insertion: null,
  activePageId: null,
  activeChapterId: null,
});

type Props = {
  chapters: Chapter[];
  activeId: string;
  activePageId: string | null;
  bookCoverActive: boolean;
  onSelectBookCover: () => void;
  onOpenChapter: (id: string) => void;
  onSelectPage: (chapterId: string, pageId: string) => void;
  onTogglePageDone: (chapterId: string, pageId: string, done: boolean) => void;
  onClearAllPageDone: () => void;
  onPageMemoChange: (chapterId: string, pageId: string, memo: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onPageDragEnd: (
    pageId: string,
    overId: string,
    insertPosition: "before" | "after",
  ) => void;
  onPageMoveError: (message: string) => void;
  moveError: string | null;
  onClearMoveError: () => void;
};

function DropLine({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <li aria-hidden className="relative z-20 -my-px h-0 list-none py-0">
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center px-1">
        <div className="size-1.5 shrink-0 rounded-full bg-sky-500" />
        <div className="h-0.5 flex-1 rounded-full bg-sky-500" />
      </div>
    </li>
  );
}

function ChapterBlockDropLine({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div aria-hidden className="relative z-20 -my-px h-0 py-0">
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center">
        <div className="size-1.5 shrink-0 rounded-full bg-sky-500" />
        <div className="h-0.5 flex-1 rounded-full bg-sky-500" />
      </div>
    </div>
  );
}

function ChapterOpenButton({
  chapter,
  active,
  onChapterCover,
  onOpen,
}: {
  chapter: Chapter;
  active: boolean;
  onChapterCover: boolean;
  onOpen: (id: string) => void;
}) {
  const parsed = parseChapterContent(
    chapter.content_json,
    chapter.title,
    chapter.content_html,
  );
  const stats = chapterPageDoneStats(parsed.pages);
  const label = chapter.title.trim() || "제목 없음";

  return (
    <div className="flex min-w-0 flex-1 items-start gap-1">
      {stats.allDone ? (
        <span
          className="mt-0.5 shrink-0 text-sm font-bold text-emerald-600"
          title="이 장 페이지 검수 완료"
          aria-hidden
        >
          ✓
        </span>
      ) : stats.done > 0 ? (
        <span
          className="mt-1 shrink-0 text-[10px] tabular-nums text-stone-400"
          title={`${stats.done}/${stats.total}페이지 완료`}
        >
          {stats.done}/{stats.total}
        </span>
      ) : (
        <span className="mt-1 w-3 shrink-0" aria-hidden />
      )}
      <button
        type="button"
        onClick={() => onOpen(chapter.id)}
        className={`min-w-0 flex-1 py-0.5 text-left text-[15px] leading-snug break-words ${
          active && onChapterCover
            ? "font-semibold text-stone-900"
            : active
              ? "font-medium text-stone-800"
              : "font-medium text-stone-800 hover:text-stone-950"
        }`}
      >
        {label}
      </button>
    </div>
  );
}

function SortablePageRow({
  chapterId,
  pageId,
  label,
  current,
  done,
  hasMemo,
  onSelectPage,
  onTogglePageDone,
  onOpenMemo,
}: {
  chapterId: string;
  pageId: string;
  label: string;
  current: boolean;
  done: boolean;
  hasMemo: boolean;
  onSelectPage: (chapterId: string, pageId: string) => void;
  onTogglePageDone: (chapterId: string, pageId: string, done: boolean) => void;
  onOpenMemo: (chapterId: string, pageId: string, label: string) => void;
}) {
  const { dragKind, insertion, activePageId } = useContext(SidebarDnDUiContext);
  const dragId = pageDragId(chapterId, pageId);
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: dragId,
    disabled: dragKind === "chapter",
    animateLayoutChanges: () => false,
  });

  const showBefore =
    dragKind === "page" &&
    insertion?.kind === "page" &&
    insertion.pageId === pageId &&
    insertion.position === "before" &&
    activePageId !== pageId;

  const showAfter =
    dragKind === "page" &&
    insertion?.kind === "page" &&
    insertion.pageId === pageId &&
    insertion.position === "after" &&
    activePageId !== pageId;

  return (
    <>
      <DropLine show={showBefore} />
      <li
        ref={setNodeRef}
        style={{ opacity: isDragging ? 0.4 : 1 }}
        className="flex items-start gap-0.5"
      >
        <input
          type="checkbox"
          checked={done}
          onChange={(e) =>
            onTogglePageDone(chapterId, pageId, e.target.checked)
          }
          className="mt-1.5 size-3.5 shrink-0 accent-emerald-600"
          aria-label={`${label} 작성·검수 완료`}
          title="작성·검수 완료"
        />
        <button
          type="button"
          className="mt-0.5 flex h-8 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md border border-transparent text-sm text-stone-400 hover:border-stone-200 hover:bg-stone-100 hover:text-stone-600 active:cursor-grabbing"
          aria-label="페이지 순서 변경"
          title="페이지 순서 변경 (⋮ 잡고 드래그)"
          {...attributes}
          {...listeners}
        >
          ⋮
        </button>
        <button
          type="button"
          onClick={() => onSelectPage(chapterId, pageId)}
          className={`min-w-0 flex-1 py-1 text-left text-sm leading-snug break-words ${
            current
              ? "font-semibold text-stone-900"
              : done
                ? "text-stone-500 line-through decoration-stone-300"
                : "text-stone-600 hover:text-stone-800"
          }`}
        >
          {done ? "✓ " : null}
          {label}
        </button>
        <button
          type="button"
          onClick={() => onOpenMemo(chapterId, pageId, label)}
          className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
            hasMemo
              ? "bg-amber-50 text-amber-800 hover:bg-amber-100"
              : "text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          }`}
          title={hasMemo ? "페이지 메모 보기·수정" : "페이지 메모 추가"}
        >
          메모
        </button>
      </li>
      <DropLine show={showAfter} />
    </>
  );
}

function ChapterPageList({
  chapter,
  activePageId,
  onSelectPage,
  onTogglePageDone,
  onOpenMemo,
}: {
  chapter: Chapter;
  activePageId: string | null;
  onSelectPage: (chapterId: string, pageId: string) => void;
  onTogglePageDone: (chapterId: string, pageId: string, done: boolean) => void;
  onOpenMemo: (chapterId: string, pageId: string, label: string) => void;
}) {
  const parsed = parseChapterContent(
    chapter.content_json,
    chapter.title,
    chapter.content_html,
  );
  let contentPageIndex = 0;
  const pages = parsed.pages.filter((p) => p.kind !== "chapter-cover");
  const sortableIds = pages.map((p) => pageDragId(chapter.id, p.id));

  return (
    <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
      <ul className="mb-1 mt-1 space-y-0.5 border-l border-stone-200 pl-1">
        {pages.map((page) => {
          const label =
            page.kind === "content"
              ? getPageTocLabel(page, contentPageIndex++)
              : getPageTocLabel(page, 0);

          return (
            <SortablePageRow
              key={page.id}
              chapterId={chapter.id}
              pageId={page.id}
              label={label}
              done={!!page.editor_done}
              hasMemo={!!page.editor_memo?.trim()}
              current={activePageId === page.id}
              onSelectPage={onSelectPage}
              onTogglePageDone={onTogglePageDone}
              onOpenMemo={onOpenMemo}
            />
          );
        })}
      </ul>
    </SortableContext>
  );
}

function ChapterDropZone({
  chapterId,
  children,
}: {
  chapterId: string;
  children: ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: chapterDropZoneId(chapterId) });
  return <div ref={setNodeRef}>{children}</div>;
}

function ChapterRow({
  chapter,
  active,
  onChapterCover,
  onOpenChapter,
  onDelete,
  dragHandle,
  activePageId,
  onSelectPage,
  onTogglePageDone,
  onOpenMemo,
  isDraggingChapter,
}: {
  chapter: Chapter;
  active: boolean;
  onChapterCover: boolean;
  onOpenChapter: (id: string) => void;
  onDelete: (id: string) => void;
  dragHandle?: ReactNode;
  activePageId: string | null;
  onSelectPage: (chapterId: string, pageId: string) => void;
  onTogglePageDone: (chapterId: string, pageId: string, done: boolean) => void;
  onOpenMemo: (chapterId: string, pageId: string, label: string) => void;
  isDraggingChapter?: boolean;
}) {
  return (
    <ChapterDropZone chapterId={chapter.id}>
      <div
        className={`rounded-md px-1 py-2 ${
          active ? (onChapterCover ? "bg-stone-100" : "bg-stone-50") : ""
        } ${isDraggingChapter ? "opacity-40" : ""}`}
      >
        <div className="flex items-start gap-1.5">
          {dragHandle}
          <ChapterOpenButton
            chapter={chapter}
            active={active}
            onChapterCover={onChapterCover}
            onOpen={onOpenChapter}
          />
          {active ? (
            <button
              type="button"
              onClick={() => onDelete(chapter.id)}
              className="mt-0.5 shrink-0 rounded border border-red-200/80 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50"
            >
              장 삭제
            </button>
          ) : null}
        </div>
        <ChapterPageList
          chapter={chapter}
          activePageId={active ? activePageId : null}
          onSelectPage={onSelectPage}
          onTogglePageDone={onTogglePageDone}
          onOpenMemo={onOpenMemo}
        />
      </div>
    </ChapterDropZone>
  );
}

function SortableChapter(props: {
  chapter: Chapter;
  active: boolean;
  onChapterCover: boolean;
  activePageId: string | null;
  onOpenChapter: (id: string) => void;
  onSelectPage: (chapterId: string, pageId: string) => void;
  onTogglePageDone: (chapterId: string, pageId: string, done: boolean) => void;
  onOpenMemo: (chapterId: string, pageId: string, label: string) => void;
  onDelete: (id: string) => void;
}) {
  const { dragKind, insertion, activeChapterId } = useContext(SidebarDnDUiContext);
  const chapterId = props.chapter.id;
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: chapterDragId(chapterId),
    disabled: dragKind === "page",
    animateLayoutChanges: () => false,
  });

  const showBefore =
    dragKind === "chapter" &&
    insertion?.kind === "chapter" &&
    insertion.chapterId === chapterId &&
    insertion.position === "before" &&
    activeChapterId !== chapterId;

  const showAfter =
    dragKind === "chapter" &&
    insertion?.kind === "chapter" &&
    insertion.chapterId === chapterId &&
    insertion.position === "after" &&
    activeChapterId !== chapterId;

  return (
    <div ref={setNodeRef}>
      <ChapterBlockDropLine show={showBefore} />
      <ChapterRow
        {...props}
        isDraggingChapter={isDragging}
        dragHandle={
          <button
            type="button"
            className="mt-0.5 flex h-8 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md border border-transparent text-sm text-stone-400 hover:border-stone-200 hover:bg-stone-100 hover:text-stone-600 active:cursor-grabbing"
            aria-label="장 순서 변경"
            title="장 순서 변경 (⋮ 잡고 드래그)"
            {...attributes}
            {...listeners}
          >
            ⋮
          </button>
        }
      />
      <ChapterBlockDropLine show={showAfter} />
    </div>
  );
}

function DragOverlayChip({ label, kind }: { label: string; kind: "chapter" | "page" }) {
  return (
    <div className="flex max-w-[240px] items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-lg">
      <span className="shrink-0 text-stone-400">⋮</span>
      <span className="truncate font-medium text-stone-800">{label}</span>
      <span className="shrink-0 text-[10px] text-stone-400">
        {kind === "chapter" ? "장" : "페이지"}
      </span>
    </div>
  );
}

function buildPageBoundsMaps(chapters: Chapter[]) {
  const firstPageByChapter = new Map<string, string>();
  const lastPageByChapter = new Map<string, string>();

  for (const chapter of chapters) {
    const parsed = parseChapterContent(
      chapter.content_json,
      chapter.title,
      chapter.content_html,
    );
    const pages = parsed.pages.filter((p) => p.kind !== "chapter-cover");
    if (pages.length === 0) continue;
    firstPageByChapter.set(chapter.id, pages[0].id);
    lastPageByChapter.set(chapter.id, pages[pages.length - 1].id);
  }

  return { firstPageByChapter, lastPageByChapter };
}

export function ChapterSidebar({
  chapters,
  activeId,
  activePageId,
  bookCoverActive,
  onSelectBookCover,
  onOpenChapter,
  onSelectPage,
  onTogglePageDone,
  onClearAllPageDone,
  onPageMemoChange,
  onAdd,
  onDelete,
  onReorder,
  onPageDragEnd,
  onPageMoveError,
  moveError,
  onClearMoveError,
}: Props) {
  const [dndReady, setDndReady] = useState(false);
  const [activeDragKind, setActiveDragKind] = useState<SidebarDragKind>(null);
  const [insertion, setInsertion] = useState<SidebarDropInsertion | null>(null);
  const [activeDragPageId, setActiveDragPageId] = useState<string | null>(null);
  const [activeDragChapterId, setActiveDragChapterId] = useState<string | null>(
    null,
  );
  const [dragOverlay, setDragOverlay] = useState<{
    kind: "chapter" | "page";
    label: string;
  } | null>(null);
  const [memoDialog, setMemoDialog] = useState<{
    chapterId: string;
    pageId: string;
    label: string;
  } | null>(null);
  const [memoDraft, setMemoDraft] = useState("");

  const pointerYRef = useRef(0);
  const dragKindRef = useRef<SidebarDragKind>(null);
  const activeDragPageIdRef = useRef<string | null>(null);
  const activeDragChapterIdRef = useRef<string | null>(null);

  const { firstPageByChapter, lastPageByChapter } = useMemo(
    () => buildPageBoundsMaps(chapters),
    [chapters],
  );

  const hasAnyPageDone = useMemo(
    () =>
      chapters.some((chapter) => {
        const parsed = parseChapterContent(
          chapter.content_json,
          chapter.title,
          chapter.content_html,
        );
        return trackablePages(parsed.pages).some((p) => p.editor_done);
      }),
    [chapters],
  );

  const dndUi = useMemo<SidebarDnDUi>(
    () => ({
      dragKind: activeDragKind,
      insertion,
      activePageId: activeDragPageId,
      activeChapterId: activeDragChapterId,
    }),
    [activeDragChapterId, activeDragKind, activeDragPageId, insertion],
  );

  const openPageMemo = useCallback(
    (chapterId: string, pageId: string, label: string) => {
      const chapter = chapters.find((c) => c.id === chapterId);
      if (!chapter) return;
      const parsed = parseChapterContent(
        chapter.content_json,
        chapter.title,
        chapter.content_html,
      );
      const page = parsed.pages.find((p) => p.id === pageId);
      setMemoDraft(page?.editor_memo ?? "");
      setMemoDialog({ chapterId, pageId, label });
    },
    [chapters],
  );

  const closePageMemo = useCallback(() => {
    setMemoDialog(null);
    setMemoDraft("");
  }, []);

  const savePageMemo = useCallback(() => {
    if (!memoDialog) return;
    onPageMemoChange(memoDialog.chapterId, memoDialog.pageId, memoDraft);
    closePageMemo();
  }, [closePageMemo, memoDialog, memoDraft, onPageMemoChange]);

  const clearDragState = useCallback(() => {
    dragKindRef.current = null;
    activeDragPageIdRef.current = null;
    activeDragChapterIdRef.current = null;
    setActiveDragKind(null);
    setInsertion(null);
    setActiveDragPageId(null);
    setActiveDragChapterId(null);
    setDragOverlay(null);
  }, []);

  const computeInsertion = useCallback(
    (event: DragOverEvent | DragMoveEvent | DragEndEvent) => {
      const kind = dragKindRef.current;
      if (!kind || !event.over) {
        setInsertion(null);
        return null;
      }

      const next = resolveSidebarDropInsertion(
        String(event.over.id),
        event.over.rect,
        pointerYRef.current,
        kind,
        firstPageByChapter,
        lastPageByChapter,
      );

      if (
        next?.kind === "page" &&
        next.pageId === activeDragPageIdRef.current
      ) {
        setInsertion(null);
        return null;
      }
      if (
        next?.kind === "chapter" &&
        next.chapterId === activeDragChapterIdRef.current
      ) {
        setInsertion(null);
        return null;
      }

      setInsertion(next);
      return next;
    },
    [firstPageByChapter, lastPageByChapter],
  );

  useEffect(() => {
    setDndReady(true);
  }, []);

  useEffect(() => {
    if (!moveError) return;
    const t = window.setTimeout(onClearMoveError, 4000);
    return () => window.clearTimeout(t);
  }, [moveError, onClearMoveError]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 80, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      const ev = event.activatorEvent;
      if (ev instanceof MouseEvent) pointerYRef.current = ev.clientY;
      else if (ev instanceof TouchEvent && ev.touches[0]) {
        pointerYRef.current = ev.touches[0].clientY;
      }

      if (id.startsWith("chapter:")) {
        const chapterId = parseChapterDragId(id);
        const chapter = chapters.find((c) => c.id === chapterId);
        dragKindRef.current = "chapter";
        activeDragChapterIdRef.current = chapterId;
        setActiveDragKind("chapter");
        setActiveDragChapterId(chapterId);
        setDragOverlay({
          kind: "chapter",
          label: chapter?.title.trim() || "제목 없음",
        });
        return;
      }

      if (id.startsWith("page:")) {
        const ref = parsePageDragId(id);
        if (!ref) return;
        const chapter = chapters.find((c) => c.id === ref.chapterId);
        if (!chapter) return;
        const parsed = parseChapterContent(
          chapter.content_json,
          chapter.title,
          chapter.content_html,
        );
        let contentPageIndex = 0;
        let label = "페이지";
        for (const p of parsed.pages.filter((x) => x.kind !== "chapter-cover")) {
          const pageLabel =
            p.kind === "content"
              ? getPageTocLabel(p, contentPageIndex++)
              : getPageTocLabel(p, 0);
          if (p.id === ref.pageId) {
            label = pageLabel;
            break;
          }
        }
        dragKindRef.current = "page";
        activeDragPageIdRef.current = ref.pageId;
        setActiveDragKind("page");
        setActiveDragPageId(ref.pageId);
        setDragOverlay({ kind: "page", label });
      }
    },
    [chapters],
  );

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      pointerYRef.current += event.delta.y;
      computeInsertion(event);
    },
    [computeInsertion],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      computeInsertion(event);
    },
    [computeInsertion],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      pointerYRef.current += event.delta.y;
      const kind = dragKindRef.current;
      const finalInsertion = computeInsertion(event);
      const { active, over } = event;

      clearDragState();

      if (!over || !kind || !finalInsertion) return;

      const activeKey = String(active.id);
      const overKey = String(over.id);
      if (activeKey === overKey && finalInsertion.kind === "page") return;

      if (kind === "chapter" && activeKey.startsWith("chapter:")) {
        const activeChapterId = parseChapterDragId(activeKey);
        if (!activeChapterId || finalInsertion.kind !== "chapter") return;
        if (activeChapterId === finalInsertion.chapterId) return;

        onReorder(
          reorderChapterIds(
            chapters.map((c) => c.id),
            activeChapterId,
            finalInsertion.chapterId,
            finalInsertion.position,
          ),
        );
        return;
      }

      if (kind === "page" && activeKey.startsWith("page:")) {
        const activePage = parsePageDragId(activeKey);
        if (!activePage) return;
        const { overId, insertPosition } = insertionToPageMoveArgs(finalInsertion);
        onPageDragEnd(activePage.pageId, overId, insertPosition);
      }
    },
    [chapters, clearDragState, computeInsertion, onPageDragEnd, onReorder],
  );

  const list = chapters.map((chapter) => {
    const chapterActive = chapter.id === activeId && !bookCoverActive;
    const parsed = parseChapterContent(
      chapter.content_json,
      chapter.title,
      chapter.content_html,
    );
    const coverPageId = parsed.pages.find((p) => p.kind === "chapter-cover")?.id;
    const onChapterCover =
      chapterActive &&
      !!coverPageId &&
      (activePageId === coverPageId || !activePageId);
    const common = {
      chapter,
      active: chapterActive,
      onChapterCover,
      activePageId: chapterActive ? activePageId : null,
      onOpenChapter,
      onSelectPage,
      onTogglePageDone,
      onOpenMemo: openPageMemo,
      onDelete,
    };
    return dndReady ? (
      <SortableChapter key={chapter.id} {...common} />
    ) : (
      <ChapterRow key={chapter.id} {...common} />
    );
  });

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-stone-200 bg-white">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-stone-700">
        <span>목차</span>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClearAllPageDone}
            disabled={!hasAnyPageDone}
            className="text-xs text-stone-500 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
            title="모든 페이지 작성·검수 완료 체크 해제"
          >
            완료 해제
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="text-sm text-stone-600 hover:text-stone-900"
          >
            + 장
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onSelectBookCover}
        className={`w-full px-3 py-2 text-left text-[15px] ${
          bookCoverActive
            ? "font-semibold text-stone-900"
            : "font-medium text-stone-700 hover:text-stone-900"
        }`}
      >
        책 표지
      </button>

      <div className="mx-3 my-1 border-t border-stone-200" />

      {moveError ? (
        <p className="mx-3 mb-2 text-xs leading-snug text-red-600">{moveError}</p>
      ) : null}

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4">
        {dndReady ? (
          <SidebarDnDUiContext.Provider value={dndUi}>
            <DndContext
              sensors={sensors}
              collisionDetection={sidebarCollisionDetection}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={clearDragState}
            >
              <SortableContext
                items={chapters.map((c) => chapterDragId(c.id))}
                strategy={verticalListSortingStrategy}
              >
                {list}
              </SortableContext>
              <DragOverlay dropAnimation={null}>
                {dragOverlay ? (
                  <DragOverlayChip
                    label={dragOverlay.label}
                    kind={dragOverlay.kind}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </SidebarDnDUiContext.Provider>
        ) : (
          list
        )}
      </nav>

      <p className="border-t border-stone-100 px-3 py-2 text-[11px] leading-snug text-stone-400">
        ⋮ 드래그 · 파란 선 = 들어갈 위치(페이지 사이) · 목록은 움직이지 않습니다
      </p>

      <PageMemoDialog
        open={memoDialog !== null}
        pageLabel={memoDialog?.label ?? ""}
        value={memoDraft}
        onChange={setMemoDraft}
        onClose={closePageMemo}
        onSave={savePageMemo}
      />
    </aside>
  );
}
