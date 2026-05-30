"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { parseChapterContent } from "@/lib/pages/content";
import {
  chapterDragId,
  pageDragId,
  parseChapterDragId,
  parsePageDragId,
} from "@/lib/pages/moveChapterPage";
import { getPageTocLabel } from "@/lib/pages/pageTitle";
import type { Chapter } from "@/lib/types/database";

type Props = {
  chapters: Chapter[];
  activeId: string;
  activePageId: string | null;
  bookCoverActive: boolean;
  onSelectBookCover: () => void;
  onSelect: (id: string) => void;
  onSelectPage: (chapterId: string, pageId: string) => void;
  onAdd: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onPageDragEnd: (pageId: string, overId: string) => void;
  onPageMoveError: (message: string) => void;
  moveError: string | null;
  onClearMoveError: () => void;
};

function resizeChapterTitle(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "0";
  el.style.height = `${el.scrollHeight}px`;
}

function ChapterTitleField({
  chapter,
  active,
  onSelect,
  onRename,
}: {
  chapter: Chapter;
  active: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    resizeChapterTitle(ref.current);
  }, [chapter.title]);

  return (
    <textarea
      ref={ref}
      value={chapter.title}
      rows={1}
      placeholder="장 제목"
      onChange={(e) => {
        onRename(chapter.id, e.target.value);
        resizeChapterTitle(e.target);
      }}
      onFocus={() => onSelect(chapter.id)}
      onClick={() => onSelect(chapter.id)}
      className={`w-full min-w-0 resize-none overflow-hidden border-0 bg-transparent text-[15px] leading-snug outline-none [field-sizing:content] whitespace-pre-wrap break-words placeholder:text-stone-400 ${
        active
          ? "font-semibold text-stone-900"
          : "font-medium text-stone-800"
      }`}
    />
  );
}

function SortablePageRow({
  chapterId,
  pageId,
  label,
  current,
  onSelectPage,
}: {
  chapterId: string;
  pageId: string;
  label: string;
  current: boolean;
  onSelectPage: (chapterId: string, pageId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: pageDragId(chapterId, pageId) });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
      }}
      className="flex items-start gap-0.5"
    >
      <button
        type="button"
        className="mt-1 w-5 shrink-0 cursor-grab text-xs text-stone-400 active:cursor-grabbing"
        aria-label="페이지 순서 변경"
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
            : "text-stone-600 hover:text-stone-800"
        }`}
      >
        {label}
      </button>
    </li>
  );
}

function ChapterPageList({
  chapter,
  activePageId,
  onSelectPage,
}: {
  chapter: Chapter;
  activePageId: string | null;
  onSelectPage: (chapterId: string, pageId: string) => void;
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
              current={activePageId === page.id}
              onSelectPage={onSelectPage}
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
  const { setNodeRef, isOver } = useDroppable({ id: chapterDragId(chapterId) });

  return (
    <div
      ref={setNodeRef}
      className={isOver ? "rounded-md ring-1 ring-stone-300" : undefined}
    >
      {children}
    </div>
  );
}

function ChapterRow({
  chapter,
  active,
  onChapterCover,
  onSelect,
  onRename,
  onDelete,
  dragHandle,
  activePageId,
  onSelectPage,
}: {
  chapter: Chapter;
  active: boolean;
  onChapterCover: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  dragHandle?: ReactNode;
  activePageId: string | null;
  onSelectPage: (chapterId: string, pageId: string) => void;
}) {
  return (
    <ChapterDropZone chapterId={chapter.id}>
      <div
        className={`rounded-md px-1 py-2 ${
          active ? (onChapterCover ? "bg-stone-100" : "bg-stone-50") : ""
        }`}
      >
        <div className="flex items-start gap-1.5">
          {dragHandle}
          <ChapterTitleField
            chapter={chapter}
            active={active || onChapterCover}
            onSelect={onSelect}
            onRename={onRename}
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
  onSelect: (id: string) => void;
  onSelectPage: (chapterId: string, pageId: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useSortable({
    id: chapterDragId(props.chapter.id),
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform) }}
    >
      <ChapterRow
        {...props}
        dragHandle={
          <button
            type="button"
            className="mt-1.5 w-5 shrink-0 cursor-grab text-xs text-stone-400 active:cursor-grabbing"
            aria-label="장 순서 변경"
            {...attributes}
            {...listeners}
          >
            ⋮
          </button>
        }
      />
    </div>
  );
}

export function ChapterSidebar({
  chapters,
  activeId,
  activePageId,
  bookCoverActive,
  onSelectBookCover,
  onSelect,
  onSelectPage,
  onAdd,
  onRename,
  onDelete,
  onReorder,
  onPageDragEnd,
  onPageMoveError,
  moveError,
  onClearMoveError,
}: Props) {
  const [dndReady, setDndReady] = useState(false);

  useEffect(() => {
    setDndReady(true);
  }, []);

  useEffect(() => {
    if (!moveError) return;
    const t = window.setTimeout(onClearMoveError, 4000);
    return () => window.clearTimeout(t);
  }, [moveError, onClearMoveError]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeKey = String(active.id);
      const overKey = String(over.id);
      if (activeKey === overKey) return;

      if (activeKey.startsWith("chapter:")) {
        const activeChapterId = parseChapterDragId(activeKey);
        const overChapterId = parseChapterDragId(overKey);
        if (!activeChapterId || !overChapterId) return;

        const oldIndex = chapters.findIndex((c) => c.id === activeChapterId);
        const newIndex = chapters.findIndex((c) => c.id === overChapterId);
        if (oldIndex < 0 || newIndex < 0) return;

        const reordered = [...chapters];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);
        onReorder(reordered.map((c) => c.id));
        return;
      }

      if (activeKey.startsWith("page:")) {
        const activePage = parsePageDragId(activeKey);
        if (!activePage) return;

        onPageDragEnd(activePage.pageId, overKey);
      }
    },
    [chapters, onPageDragEnd, onReorder],
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
      onSelect,
      onSelectPage,
      onRename,
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
      <div className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-stone-700">
        <span>목차</span>
        <button
          type="button"
          onClick={onAdd}
          className="text-sm text-stone-600 hover:text-stone-900"
        >
          + 장
        </button>
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={chapters.map((c) => chapterDragId(c.id))}
              strategy={verticalListSortingStrategy}
            >
              {list}
            </SortableContext>
          </DndContext>
        ) : (
          list
        )}
      </nav>

      <p className="border-t border-stone-100 px-3 py-2 text-[11px] leading-snug text-stone-400">
        ⋮ 드래그: 페이지·장 순서 변경 · 다른 장 영역에 놓으면 이동
      </p>
    </aside>
  );
}
