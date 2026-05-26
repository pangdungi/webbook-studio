"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookEditor } from "@/components/editor/BookEditor";
import { ChapterSidebar } from "@/components/editor/ChapterSidebar";
import { DevicePreviewModal } from "@/components/reader/DevicePreviewModal";
import type { Book, Chapter } from "@/lib/types/database";
import type { BookHeadingFonts } from "@/lib/typography/headingFonts";
import {
  HEADING_FONT_OPTIONS,
  headingFontCssVariables,
  normalizeBookHeadingFonts,
  type HeadingFontRole,
} from "@/lib/typography/headingFonts";

type Props = {
  bookId: string;
  initialBook: Book;
  initialChapters: Chapter[];
};

export function EditorWorkspace({
  bookId,
  initialBook,
  initialChapters,
}: Props) {
  const router = useRouter();
  const [book, setBook] = useState(() => ({
    ...initialBook,
    heading_fonts: normalizeBookHeadingFonts(initialBook.heading_fonts),
  }));
  const [chapters, setChapters] = useState(initialChapters);
  const [activeChapterId, setActiveChapterId] = useState(
    initialChapters[0]?.id ?? "",
  );
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const activeChapter = chapters.find((c) => c.id === activeChapterId);

  const updateChapterContent = useCallback(
    (
      chapterId: string,
      contentJson: Record<string, unknown>,
      contentHtml: string,
    ) => {
      setChapters((prev) =>
        prev.map((c) =>
          c.id === chapterId
            ? { ...c, content_json: contentJson, content_html: contentHtml }
            : c,
        ),
      );
    },
    [],
  );

  const saveChapter = useCallback(
    async (
      chapterId: string,
      contentJson: Record<string, unknown>,
      contentHtml: string,
    ) => {
      await fetch(`/api/chapters/${chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_json: contentJson, content_html: contentHtml }),
      });
    },
    [],
  );

  const addChapter = async () => {
    const res = await fetch(`/api/books/${bookId}/chapters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (data.chapter) {
      setChapters((prev) => [...prev, data.chapter]);
      setActiveChapterId(data.chapter.id);
    }
  };

  const deleteChapter = async (id: string) => {
    const res = await fetch(`/api/chapters/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }
    const next = chapters.filter((c) => c.id !== id);
    setChapters(next);
    if (activeChapterId === id) {
      setActiveChapterId(next[0]?.id ?? "");
    }
  };

  const renameChapter = async (id: string, title: string) => {
    setChapters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c)),
    );
    await fetch(`/api/chapters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  };

  const reorderChapters = async (ids: string[]) => {
    const reordered = ids
      .map((id) => chapters.find((c) => c.id === id))
      .filter(Boolean) as Chapter[];
    setChapters(reordered);
    await fetch(`/api/books/${bookId}/chapters`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: ids }),
    });
  };

  const updateBookTitle = async (title: string) => {
    setBook((b) => ({ ...b, title }));
    await fetch(`/api/books/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  };

  const updateWritingMode = async (writing_mode: Book["writing_mode"]) => {
    setBook((b) => ({ ...b, writing_mode }));
    await fetch(`/api/books/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ writing_mode }),
    });
  };

  const updateHeadingFont = async (
    key: keyof BookHeadingFonts,
    value: HeadingFontRole,
  ) => {
    const heading_fonts = { ...book.heading_fonts, [key]: value };
    setBook((b) => ({ ...b, heading_fonts }));
    await fetch(`/api/books/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heading_fonts }),
    });
  };

  const publish = async () => {
    setPublishing(true);
    setMessage("");
    const res = await fetch(`/api/publish/${bookId}`, { method: "POST" });
    const data = await res.json();
    setPublishing(false);

    if (data.error) {
      setMessage(data.error);
      return;
    }

    setBook(data.book);
    setMessage(
      `출판 완료! 독자 링크는 그대로이며 내용만 갱신됩니다.\n${data.readerUrl}`,
    );
  };

  useEffect(() => {
    if (!activeChapterId && chapters[0]) {
      setActiveChapterId(chapters[0].id);
    }
  }, [chapters, activeChapterId]);

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="flex shrink-0 items-center gap-4 border-b border-stone-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm text-stone-500 hover:text-stone-900"
        >
          ← 목록
        </button>
        <input
          value={book.title}
          onChange={(e) => updateBookTitle(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none"
        />
        <select
          value={book.writing_mode}
          onChange={(e) =>
            updateWritingMode(e.target.value as Book["writing_mode"])
          }
          className="rounded-lg border border-stone-200 px-2 py-1 text-sm"
        >
          <option value="horizontal-tb">가로쓰기</option>
          <option value="vertical-rl">세로쓰기</option>
        </select>
        <div
          className="hidden items-center gap-2 rounded-lg border border-stone-200 px-2 py-1 text-xs text-stone-600 lg:flex"
          title="책 전체에 동일 적용 — 장·중·소제목만 변경, 본문은 명조"
        >
          <span className="shrink-0 text-stone-400">서체</span>
          <label className="flex items-center gap-1">
            <span>장</span>
            <select
              value={book.heading_fonts.chapterTitle}
              onChange={(e) =>
                updateHeadingFont(
                  "chapterTitle",
                  e.target.value as HeadingFontRole,
                )
              }
              className="rounded border border-stone-200 bg-white px-1 py-0.5"
            >
              {HEADING_FONT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span>중</span>
            <select
              value={book.heading_fonts.heading2}
              onChange={(e) =>
                updateHeadingFont("heading2", e.target.value as HeadingFontRole)
              }
              className="rounded border border-stone-200 bg-white px-1 py-0.5"
            >
              {HEADING_FONT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span>소</span>
            <select
              value={book.heading_fonts.heading3}
              onChange={(e) =>
                updateHeadingFont("heading3", e.target.value as HeadingFontRole)
              }
              className="rounded border border-stone-200 bg-white px-1 py-0.5"
            >
              {HEADING_FONT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            book.status === "published"
              ? "bg-green-100 text-green-800"
              : "bg-stone-100 text-stone-600"
          }`}
        >
          {book.status === "published" ? "출판됨" : "초안"}
        </span>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          disabled={chapters.length === 0}
          title={
            chapters.length === 0
              ? "챕터를 추가한 뒤 미리볼 수 있습니다"
              : "현재 저장된 내용 기준 독자 화면 미리보기"
          }
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          독자 미리보기
        </button>
        <button
          type="button"
          onClick={publish}
          disabled={publishing}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {publishing ? "출판 중..." : "출판"}
        </button>
      </header>

      <DevicePreviewModal
        bookId={bookId}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />

      {message && (
        <div className="whitespace-pre-wrap bg-green-50 px-4 py-2 text-sm text-green-800">
          {message}
        </div>
      )}

      <div
        className="flex min-h-0 flex-1"
        style={headingFontCssVariables(book.heading_fonts)}
      >
        <ChapterSidebar
          chapters={chapters}
          activeId={activeChapterId}
          onSelect={setActiveChapterId}
          onAdd={addChapter}
          onDelete={deleteChapter}
          onRename={renameChapter}
          onReorder={reorderChapters}
        />
        {activeChapter && (
          <BookEditor
            key={activeChapter.id}
            chapterId={activeChapter.id}
            chapterTitle={activeChapter.title}
            bookId={bookId}
            initialContent={activeChapter.content_json}
            initialContentHtml={activeChapter.content_html}
            onContentChange={updateChapterContent}
            onSave={saveChapter}
          />
        )}
      </div>
    </div>
  );
}
