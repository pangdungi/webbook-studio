"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookCoverEditor } from "@/components/editor/BookCoverEditor";
import { BookEditor, type BookEditorHandle } from "@/components/editor/BookEditor";
import { ChapterSidebar } from "@/components/editor/ChapterSidebar";
import {
  normalizeBookCoverStyle,
  type BookCoverStyle,
} from "@/lib/books/coverStyle";
import { DevicePreviewModal } from "@/components/reader/DevicePreviewModal";
import type { Book, Chapter } from "@/lib/types/database";
import type { BookHeadingFonts } from "@/lib/typography/headingFonts";
import {
  HEADING_FONT_OPTIONS,
  headingFontCssVariables,
  normalizeBookHeadingFonts,
  type HeadingFontRole,
} from "@/lib/typography/headingFonts";
import { useEditorSessionLock } from "@/components/editor/useEditorSessionLock";

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
    ...normalizeBookCoverStyle(initialBook),
    heading_fonts: normalizeBookHeadingFonts(initialBook.heading_fonts),
  }));
  const [editorPanel, setEditorPanel] = useState<"book-cover" | "chapter">(
    "chapter",
  );
  const [chapters, setChapters] = useState(initialChapters);
  const [activeChapterId, setActiveChapterId] = useState(
    initialChapters[0]?.id ?? "",
  );
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveState, setSaveState] = useState<
    "saved" | "pending" | "saving" | "error"
  >("saved");
  const [manualSaving, setManualSaving] = useState(false);

  const editorRef = useRef<BookEditorHandle>(null);
  const chaptersRef = useRef(chapters);
  chaptersRef.current = chapters;

  const { status: lockStatus, retry: retryLock } = useEditorSessionLock(bookId);

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
      title?: string,
    ) => {
      const body = JSON.stringify({
        content_json: contentJson,
        content_html: contentHtml,
        ...(title !== undefined ? { title } : {}),
      });

      const attempt = async () => {
        const res = await fetch(`/api/chapters/${chapterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            typeof data.error === "string" ? data.error : "저장에 실패했습니다.",
          );
        }
      };

      try {
        await attempt();
      } catch {
        await attempt();
      }
    },
    [],
  );

  const saveAll = useCallback(async () => {
    if (manualSaving) return;

    setManualSaving(true);
    setSaveState("saving");

    try {
      let chaptersToSave = [...chaptersRef.current];

      const flushed = await editorRef.current?.flushPendingSave();
      if (flushed) {
        chaptersToSave = chaptersToSave.map((c) =>
          c.id === flushed.chapterId
            ? {
                ...c,
                content_json: flushed.contentJson,
                content_html: flushed.contentHtml,
              }
            : c,
        );
      }

      await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: book.title,
          heading_fonts: book.heading_fonts,
          cover_bg_color: book.cover_bg_color,
          cover_title_color: book.cover_title_color,
        }),
      }).then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            typeof data.error === "string" ? data.error : "책 정보 저장 실패",
          );
        }
      });

      await Promise.all(
        chaptersToSave.map((c) =>
          saveChapter(
            c.id,
            c.content_json,
            c.content_html ?? "",
            c.title,
          ),
        ),
      );

      setChapters(chaptersToSave);
      setSaveState("saved");
    } catch {
      setSaveState("error");
      alert("저장에 실패했습니다. 네트워크를 확인한 뒤 다시 「전체 저장」을 눌러 주세요.");
    } finally {
      setManualSaving(false);
    }
  }, [
    book.title,
    book.heading_fonts,
    book.cover_bg_color,
    book.cover_title_color,
    bookId,
    manualSaving,
    saveChapter,
  ]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveAll();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveAll]);

  useEffect(() => {
    const warnOnLeave = (event: BeforeUnloadEvent) => {
      if (saveState === "pending" || saveState === "saving" || saveState === "error") {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", warnOnLeave);
    return () => window.removeEventListener("beforeunload", warnOnLeave);
  }, [saveState]);

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

  const updateCoverStyle = useCallback(
    async (patch: Partial<BookCoverStyle>) => {
      const next = normalizeBookCoverStyle({ ...book, ...patch });
      setBook((b) => ({ ...b, ...next }));
      await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    },
    [book, bookId],
  );

  const selectChapter = useCallback((id: string) => {
    setEditorPanel("chapter");
    setActiveChapterId(id);
  }, []);

  const selectBookCover = useCallback(() => {
    setEditorPanel("book-cover");
  }, []);

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
    const title = (data.book?.title ?? book.title).trim() || "제목 없음";
    setMessage(
      `「${title}」 출판 완료! 독자 링크는 그대로이며 내용만 갱신됩니다.\n${data.readerUrl ?? ""}`,
    );
  };

  useEffect(() => {
    if (!activeChapterId && chapters[0]) {
      setActiveChapterId(chapters[0].id);
    }
  }, [chapters, activeChapterId]);

  if (lockStatus === "checking") {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-stone-50 text-sm text-stone-500">
        편집기 연결 확인 중…
      </div>
    );
  }

  if (lockStatus === "blocked") {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center bg-stone-50 px-6 text-center">
        <h1 className="text-xl font-semibold text-stone-900">
          이 책은 이미 다른 탭에서 열려 있습니다
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-600">
          한 번에 하나의 편집 창만 사용할 수 있습니다.
          <br />
          다른 탭을 <strong>닫은 뒤</strong> 아래 「다시 열기」를 누르세요.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={retryLock}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white"
          >
            다시 열기
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700"
          >
            목록으로
          </button>
        </div>
      </div>
    );
  }

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
        <span
          className={`hidden text-xs sm:inline ${
            saveState === "error"
              ? "font-medium text-red-600"
              : saveState === "saved"
                ? "text-stone-400"
                : "text-stone-500"
          }`}
          aria-live="polite"
        >
          {saveState === "saved" && "저장됨"}
          {saveState === "pending" && "저장 대기…"}
          {saveState === "saving" && "저장 중…"}
          {saveState === "error" && "저장 실패 — 다시 시도해 주세요"}
        </span>
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={manualSaving || publishing}
          title="모든 챕터·설정을 서버에 저장 (⌘S / Ctrl+S)"
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {manualSaving ? "저장 중…" : "전체 저장"}
        </button>
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
          bookCoverActive={editorPanel === "book-cover"}
          onSelectBookCover={selectBookCover}
          onSelect={selectChapter}
          onAdd={addChapter}
          onDelete={deleteChapter}
          onRename={renameChapter}
          onReorder={reorderChapters}
        />
        {editorPanel === "book-cover" ? (
          <BookCoverEditor
            title={book.title}
            subtitle={book.subtitle}
            cover={{
              cover_bg_color: book.cover_bg_color,
              cover_title_color: book.cover_title_color,
            }}
            onCoverChange={(patch) => void updateCoverStyle(patch)}
          />
        ) : activeChapter ? (
          <BookEditor
            ref={editorRef}
            key={activeChapter.id}
            chapterId={activeChapter.id}
            chapterTitle={activeChapter.title}
            bookId={bookId}
            initialContent={activeChapter.content_json}
            initialContentHtml={activeChapter.content_html}
            onContentChange={updateChapterContent}
            onSave={saveChapter}
            onSaveState={setSaveState}
          />
        ) : null}
      </div>
    </div>
  );
}
