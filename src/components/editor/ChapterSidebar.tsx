"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
import { useEffect, useState, type ReactNode } from "react";
import type { Chapter } from "@/lib/types/database";

type Props = {
  chapters: Chapter[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onReorder: (ids: string[]) => void;
};

function ChapterRow({
  chapter,
  active,
  onSelect,
  onDelete,
  onRename,
  dragHandle,
}: {
  chapter: Chapter;
  active: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  dragHandle?: ReactNode;
}) {
  return (
    <div
      className={`group flex items-center gap-1 rounded-lg px-2 py-2 ${
        active ? "bg-stone-900 text-white" : "hover:bg-stone-100"
      }`}
    >
      {dragHandle ?? (
        <span className="cursor-default px-1 text-xs opacity-50">⋮⋮</span>
      )}
      <input
        value={chapter.title}
        onChange={(e) => onRename(chapter.id, e.target.value)}
        onFocus={() => onSelect(chapter.id)}
        className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${
          active ? "text-white placeholder:text-stone-400" : ""
        }`}
      />
      <button
        type="button"
        onClick={() => onDelete(chapter.id)}
        className={`hidden px-1 text-xs group-hover:block ${
          active ? "text-stone-300 hover:text-white" : "text-stone-400 hover:text-red-600"
        }`}
      >
        ✕
      </button>
    </div>
  );
}

function SortableChapter({
  chapter,
  active,
  onSelect,
  onDelete,
  onRename,
}: {
  chapter: Chapter;
  active: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ChapterRow
        chapter={chapter}
        active={active}
        onSelect={onSelect}
        onDelete={onDelete}
        onRename={onRename}
        dragHandle={
          <button
            type="button"
            className="cursor-grab px-1 text-xs opacity-50"
            {...attributes}
            {...listeners}
          >
            ⋮⋮
          </button>
        }
      />
    </div>
  );
}

export function ChapterSidebar({
  chapters,
  activeId,
  onSelect,
  onAdd,
  onDelete,
  onRename,
  onReorder,
}: Props) {
  const [dndReady, setDndReady] = useState(false);

  useEffect(() => {
    setDndReady(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = chapters.findIndex((c) => c.id === active.id);
    const newIndex = chapters.findIndex((c) => c.id === over.id);
    const reordered = [...chapters];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    onReorder(reordered.map((c) => c.id));
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-stone-200 bg-white">
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-stone-900">목차</h2>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg bg-stone-900 px-2 py-1 text-xs font-medium text-white"
        >
          + 추가
        </button>
      </div>
      {dndReady ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={chapters.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <nav className="flex-1 space-y-1 overflow-y-auto p-2">
              {chapters.map((chapter) => (
                <SortableChapter
                  key={chapter.id}
                  chapter={chapter}
                  active={chapter.id === activeId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onRename={onRename}
                />
              ))}
            </nav>
          </SortableContext>
        </DndContext>
      ) : (
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {chapters.map((chapter) => (
            <ChapterRow
              key={chapter.id}
              chapter={chapter}
              active={chapter.id === activeId}
              onSelect={onSelect}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
        </nav>
      )}
    </aside>
  );
}
