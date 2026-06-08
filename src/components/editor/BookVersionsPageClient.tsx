"use client";

import { useMemo, useState } from "react";
import { BookEditor } from "@/components/editor/BookEditor";
import { BookVersionsPanel } from "@/components/editor/BookVersionsPanel";
import { ChapterSidebar } from "@/components/editor/ChapterSidebar";
import {
  chaptersFromSnapshot,
  type BookVersionSnapshot,
} from "@/lib/books/bookVersionSnapshot";
import { parseChapterContent } from "@/lib/pages/content";
import { headingFontCssVariables } from "@/lib/typography/headingFonts";
import type { Book, Chapter } from "@/lib/types/database";

type Props = {
  bookId: string;
  initialBook: Book;
  initialChapters: Chapter[];
};

function defaultPageId(chapter: Chapter): string | undefined {
  const parsed = parseChapterContent(
    chapter.content_json,
    chapter.title,
    chapter.content_html,
  );
  return (
    parsed.pages.find((p) => p.kind === "chapter-cover")?.id ??
    parsed.pages.find((p) => p.kind === "content")?.id ??
    parsed.pages[0]?.id
  );
}

export function BookVersionsPageClient({
  bookId,
  initialBook,
  initialChapters,
}: Props) {
  const [book] = useState(initialBook);
  const [chapters] = useState(initialChapters);
  const [activeChapterId, setActiveChapterId] = useState(
    initialChapters[0]?.id ?? "",
  );
  const [versionPreview, setVersionPreview] = useState<{
    snapshot: BookVersionSnapshot;
    label: string;
  } | null>(null);

  const displayChapters = useMemo(() => {
    if (!versionPreview) return chapters;
    return chaptersFromSnapshot(bookId, versionPreview.snapshot, chapters);
  }, [bookId, chapters, versionPreview]);

  const displayBook = useMemo(() => {
    if (!versionPreview) return book;
    const s = versionPreview.snapshot.book;
    return { ...book, ...s };
  }, [book, versionPreview]);

  const activeChapter = displayChapters.find((c) => c.id === activeChapterId);

  return (
    <div className="flex min-h-0 flex-1">
      <BookVersionsPanel
        bookId={bookId}
        book={book}
        chapters={chapters}
        onPreview={(snapshot, label) => {
          setVersionPreview({ snapshot, label });
          const first = chaptersFromSnapshot(bookId, snapshot, chapters)[0];
          if (first) setActiveChapterId(first.id);
        }}
        onRestored={() => {
          window.location.href = `/admin/books/${bookId}/edit`;
        }}
        onClose={() => {
          window.location.href = "/";
        }}
      />
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        style={headingFontCssVariables(displayBook.heading_fonts)}
      >
        {versionPreview ? (
          <div className="border-b border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-950">
            「{versionPreview.label}」 보기 중 (읽기 전용)
            <button
              type="button"
              onClick={() => setVersionPreview(null)}
              className="ml-3 rounded bg-sky-900 px-2 py-0.5 text-xs text-white"
            >
              닫기
            </button>
          </div>
        ) : (
          <div className="border-b border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600">
            왼쪽에서 버전을 선택한 뒤 「보기」를 누르세요.
          </div>
        )}
        <div className="flex min-h-0 flex-1">
          <ChapterSidebar
            chapters={displayChapters}
            activeId={activeChapterId}
            activePageId={
              activeChapter ? defaultPageId(activeChapter) ?? null : null
            }
            bookCoverActive={false}
            onSelectBookCover={() => {}}
            onOpenChapter={setActiveChapterId}
            onSelectPage={() => {}}
            onTogglePageDone={() => {}}
            onPageMemoChange={() => {}}
            onAdd={() => {}}
            onDelete={() => {}}
            onReorder={() => {}}
            onPageDragEnd={() => {}}
            onPageMoveError={() => {}}
            moveError={null}
            onClearMoveError={() => {}}
          />
          {activeChapter && versionPreview ? (
            <BookEditor
              key={`preview-${activeChapter.id}-${versionPreview.label}`}
              chapterId={activeChapter.id}
              chapterTitle={activeChapter.title}
              bookId={bookId}
              initialContent={activeChapter.content_json}
              initialContentHtml={activeChapter.content_html}
              initialPageId={defaultPageId(activeChapter)}
              onContentChange={() => {}}
              onSave={async () => {}}
              savePaused
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-stone-400">
              버전을 선택해 주세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
