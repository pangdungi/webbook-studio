"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookCoverEditor } from "@/components/editor/BookCoverEditor";
import { BookEditor, type BookEditorHandle } from "@/components/editor/BookEditor";
import { ChapterSidebar } from "@/components/editor/ChapterSidebar";
import { ReaderAnalysisPanel } from "@/components/editor/ReaderAnalysisPanel";
import {
  normalizeBookCoverStyle,
  type BookCoverStyle,
} from "@/lib/books/coverStyle";
import { normalizeBookReaderFields } from "@/lib/books/readerFields";
import { buildChapterSample } from "@/lib/readerAnalysis/sampleText";
import { normalizeReaderAnalysisReport } from "@/lib/readerAnalysis/normalize";
import type { ReaderAnalysisReport } from "@/lib/readerAnalysis/types";
import type { Book, Chapter } from "@/lib/types/database";
import type { BookHeadingFonts } from "@/lib/typography/headingFonts";
import {
  HEADING_FONT_OPTIONS,
  headingFontCssVariables,
  normalizeBookHeadingFonts,
  type HeadingFontRole,
} from "@/lib/typography/headingFonts";
import { parseChapterContent } from "@/lib/pages/content";
import {
  chaptersWithChangedPages,
  movePageByDrag,
} from "@/lib/pages/moveChapterPage";
import {
  clearChapterDraft,
  draftContentDiffers,
  readChapterDraft,
} from "@/lib/editor/chapterDraftBackup";
import {
  isChapterSaveConflict,
  parseChapterPatchResponse,
} from "@/lib/editor/chapterSave";
import {
  chaptersFromSnapshot,
  type BookVersionSnapshot,
} from "@/lib/books/bookVersionSnapshot";
import { BookVersionsPanel, createAutoBookVersionIfChanged } from "@/components/editor/BookVersionsPanel";
import { getEditorEnvironmentLabel } from "@/lib/editor/editorEnvironment";
import { useEditorSessionLock } from "@/components/editor/useEditorSessionLock";

function defaultPageIdForChapter(chapter: Chapter): string | undefined {
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
    ...normalizeBookReaderFields(initialBook),
  }));
  const [editorPanel, setEditorPanel] = useState<"book-cover" | "chapter">(
    "chapter",
  );
  const [chapters, setChapters] = useState(initialChapters);
  const [activeChapterId, setActiveChapterId] = useState(
    initialChapters[0]?.id ?? "",
  );
  const [activePageByChapter, setActivePageByChapter] = useState<
    Record<string, string>
  >({});
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const initialReader = normalizeBookReaderFields(initialBook);
  const [readerPitch, setReaderPitch] = useState(() => initialReader.reader_pitch);
  const [readerReport, setReaderReport] = useState<ReaderAnalysisReport | null>(
    () => initialReader.reader_analysis,
  );
  const [readerPanelOpen, setReaderPanelOpen] = useState(false);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState<string | null>(null);
  const [readerProvider, setReaderProvider] = useState<string | null>(null);
  const [readerIncludeSample, setReaderIncludeSample] = useState(true);
  const [saveState, setSaveState] = useState<
    "saved" | "pending" | "saving" | "error"
  >("saved");
  const [manualSaving, setManualSaving] = useState(false);
  const [chapterEditorKey, setChapterEditorKey] = useState(0);
  const [pageMoveError, setPageMoveError] = useState<string | null>(null);
  const [versionsPanelOpen, setVersionsPanelOpen] = useState(false);
  const [versionPreview, setVersionPreview] = useState<{
    snapshot: BookVersionSnapshot;
    label: string;
  } | null>(null);

  const editorRef = useRef<BookEditorHandle>(null);
  const chaptersRef = useRef(chapters);
  chaptersRef.current = chapters;
  const activePageByChapterRef = useRef(activePageByChapter);
  activePageByChapterRef.current = activePageByChapter;
  const chapterBaselineRef = useRef<Record<string, string>>({});
  const dirtyChapterIdsRef = useRef(new Set<string>());
  const [savePaused, setSavePaused] = useState(false);
  const [staleBanner, setStaleBanner] = useState<string | null>(null);
  const [envLabel, setEnvLabel] = useState<string | null>(null);

  useEffect(() => {
    const baseline: Record<string, string> = {};
    for (const c of initialChapters) baseline[c.id] = c.updated_at;
    chapterBaselineRef.current = baseline;
  }, [initialChapters]);

  useEffect(() => {
    setEnvLabel(getEditorEnvironmentLabel());
  }, []);

  const { status: lockStatus, retry: retryLock } = useEditorSessionLock(bookId);

  const markChapterDirty = useCallback((chapterId: string) => {
    dirtyChapterIdsRef.current.add(chapterId);
  }, []);

  const applySavedChapter = useCallback((chapter: Chapter) => {
    chapterBaselineRef.current[chapter.id] = chapter.updated_at;
    dirtyChapterIdsRef.current.delete(chapter.id);
    setChapters((prev) => {
      const next = prev.map((c) => (c.id === chapter.id ? chapter : c));
      chaptersRef.current = next;
      return next;
    });
  }, []);

  const handleStaleConflict = useCallback((detail?: string) => {
    setStaleBanner(
      detail ??
        "다른 곳(배포 사이트·다른 탭 등)에서 더 최근에 저장된 내용이 있어, 이 화면은 서버에 올리지 않습니다.",
    );
    setSaveState("error");
  }, []);

  const displayChapters = useMemo(() => {
    if (!versionPreview) return chapters;
    return chaptersFromSnapshot(bookId, versionPreview.snapshot, chapters);
  }, [bookId, chapters, versionPreview]);

  const displayBook = useMemo(() => {
    if (!versionPreview) return book;
    const s = versionPreview.snapshot.book;
    return {
      ...book,
      title: s.title,
      subtitle: s.subtitle,
      cover_bg_color: s.cover_bg_color,
      cover_title_color: s.cover_title_color,
      heading_fonts: s.heading_fonts,
      reader_pitch: s.reader_pitch,
      reader_analysis: s.reader_analysis,
    };
  }, [book, versionPreview]);

  const activeChapter = displayChapters.find((c) => c.id === activeChapterId);
  const editorFrozen = !!versionPreview || savePaused;

  const updateChapterContent = useCallback(
    (
      chapterId: string,
      contentJson: Record<string, unknown>,
      contentHtml: string,
    ) => {
      markChapterDirty(chapterId);
      setChapters((prev) =>
        prev.map((c) =>
          c.id === chapterId
            ? { ...c, content_json: contentJson, content_html: contentHtml }
            : c,
        ),
      );
    },
    [markChapterDirty],
  );

  const reloadChaptersFromServer = useCallback(async () => {
    const res = await fetch(`/api/books/${bookId}/chapters`, { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as {
      chapters?: Chapter[];
      error?: string;
    };
    if (!res.ok || !data.chapters) {
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : "서버에서 최신 내용을 불러오지 못했습니다.",
      );
    }
    for (const c of data.chapters) {
      chapterBaselineRef.current[c.id] = c.updated_at;
    }
    dirtyChapterIdsRef.current.clear();
    chaptersRef.current = data.chapters;
    setChapters(data.chapters);
    setSavePaused(false);
    setStaleBanner(null);
    setChapterEditorKey((k) => k + 1);
    setSaveState("saved");
    setMessage("서버의 최신 내용을 불러왔습니다.");
  }, [bookId]);

  const saveChapter = useCallback(
    async (
      chapterId: string,
      contentJson: Record<string, unknown>,
      contentHtml: string,
      title?: string,
    ) => {
      if (savePaused) {
        throw new Error(
          "다른 곳에서 더 최근에 저장된 내용이 있어 서버에 올리지 않았습니다.",
        );
      }

      const ifUpdatedAt = chapterBaselineRef.current[chapterId];
      if (!ifUpdatedAt) {
        throw new Error("장 버전 정보가 없습니다. 페이지를 새로고침해 주세요.");
      }

      const body = JSON.stringify({
        content_json: contentJson,
        content_html: contentHtml,
        if_updated_at: ifUpdatedAt,
        ...(title !== undefined ? { title } : {}),
      });

      const attempt = async () => {
        const res = await fetch(`/api/chapters/${chapterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
        return parseChapterPatchResponse(res);
      };

      let lastError: unknown;
      for (let i = 0; i < 3; i++) {
        try {
          const saved = await attempt();
          applySavedChapter(saved);
          clearChapterDraft(bookId, chapterId);
          return;
        } catch (err) {
          lastError = err;
          if (isChapterSaveConflict(err)) {
            handleStaleConflict(err.message);
            throw err;
          }
          if (i < 2) {
            await new Promise((r) => setTimeout(r, 500 * (i + 1)));
          }
        }
      }
      throw lastError;
    },
    [applySavedChapter, bookId, handleStaleConflict, savePaused],
  );

  const applyFlushedChapter = useCallback(
    (flushed: {
      chapterId: string;
      contentJson: Record<string, unknown>;
      contentHtml: string;
    }) => {
      setChapters((prev) => {
        const next = prev.map((c) =>
          c.id === flushed.chapterId
            ? {
                ...c,
                content_json: flushed.contentJson,
                content_html: flushed.contentHtml,
              }
            : c,
        );
        chaptersRef.current = next;
        return next;
      });
    },
    [],
  );

  const flushActiveChapter = useCallback(async (): Promise<boolean> => {
    if (editorPanel !== "chapter" || !editorRef.current) return true;
    const flushed = await editorRef.current.flushPendingSave();
    if (flushed) applyFlushedChapter(flushed);
    return flushed.saved;
  }, [editorPanel, applyFlushedChapter]);

  const saveAll = useCallback(async (): Promise<boolean> => {
    if (manualSaving) return false;

    setManualSaving(true);
    setSaveState("saving");
    setMessage("");

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
        applyFlushedChapter(flushed);
        if (!flushed.saved) {
          throw new Error(
            "현재 장 자동 저장에 실패했습니다. 「전체 저장」을 다시 눌러 주세요.",
          );
        }
      }

      const idsToSave = new Set(dirtyChapterIdsRef.current);
      if (flushed) idsToSave.add(flushed.chapterId);

      for (const id of idsToSave) {
        const c = chaptersToSave.find((ch) => ch.id === id);
        if (!c) continue;
        try {
          await saveChapter(
            c.id,
            c.content_json,
            c.content_html ?? "",
            c.title,
          );
        } catch (err) {
          if (isChapterSaveConflict(err)) throw err;
          const detail =
            err instanceof Error ? err.message : "장 저장에 실패했습니다.";
          throw new Error(`「${c.title}」 저장 실패: ${detail}`);
        }
      }

      const normalizedReport = readerReport
        ? normalizeReaderAnalysisReport(readerReport)
        : null;

      const bookRes = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: book.title,
          heading_fonts: book.heading_fonts,
          cover_bg_color: book.cover_bg_color,
          cover_title_color: book.cover_title_color,
          reader_pitch: readerPitch,
          ...(normalizedReport ? { reader_analysis: normalizedReport } : {}),
        }),
      });

      if (!bookRes.ok) {
        const data = await bookRes.json().catch(() => ({}));
        let errMsg =
          typeof data.error === "string" ? data.error : "책 정보 저장 실패";
        if (/column|does not exist|reader_|cover_|heading_fonts/i.test(errMsg)) {
          errMsg = `${errMsg}\n\nSupabase SQL Editor에서 supabase/migrations/ 아래 마이그레이션 파일을 아직 안 돌렸을 수 있습니다.`;
        }
        if (bookRes.status === 401) {
          errMsg = "로그인이 만료되었습니다. 다시 로그인한 뒤 저장해 주세요.";
        }
        throw new Error(errMsg);
      }

      setChapters(chaptersToSave);
      setSaveState("saved");
      setMessage("");
      try {
        await createAutoBookVersionIfChanged(bookId, book, chaptersToSave);
      } catch {
        /* 버전 저장 실패해도 본 저장은 성공 */
      }
      return true;
    } catch (err) {
      setSaveState("error");
      const detail =
        err instanceof Error ? err.message : "저장에 실패했습니다.";
      setMessage(detail);
      alert(`저장에 실패했습니다.\n\n${detail}`);
      return false;
    } finally {
      setManualSaving(false);
    }
  }, [
    applyFlushedChapter,
    book.title,
    book.heading_fonts,
    book.cover_bg_color,
    book.cover_title_color,
    readerPitch,
    readerReport,
    bookId,
    manualSaving,
    saveChapter,
  ]);

  const saveReaderPitch = useCallback(
    async (pitch: string) => {
      const res = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reader_pitch: pitch }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "책 요약 저장에 실패했습니다.",
        );
      }
      const data = await res.json();
      const normalized = normalizeBookReaderFields(data.book);
      setBook((b) => ({ ...b, reader_pitch: normalized.reader_pitch }));
      setReaderPitch(normalized.reader_pitch);
    },
    [bookId],
  );

  const saveReaderData = useCallback(
    async (pitch: string, report: ReaderAnalysisReport) => {
      const res = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reader_pitch: pitch,
          reader_analysis: report,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "독자 분석 저장에 실패했습니다.",
        );
      }
      const data = await res.json();
      const normalized = normalizeBookReaderFields(data.book);
      setBook((b) => ({ ...b, ...normalized }));
      setReaderPitch(normalized.reader_pitch);
      setReaderReport(normalized.reader_analysis);
    },
    [bookId],
  );

  const runReaderAnalysis = useCallback(async () => {
    if (!readerPitch.trim()) {
      setReaderError("책 내용 요약을 입력해 주세요.");
      return;
    }

    setReaderLoading(true);
    setReaderError(null);
    setReaderProvider(null);

    try {
      const sampleText = readerIncludeSample
        ? buildChapterSample(chaptersRef.current)
        : undefined;

      const res = await fetch("/api/reader-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pitch: readerPitch,
          bookTitle: book.title,
          sampleText: sampleText || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "독자 분석에 실패했습니다.",
        );
      }

      const report = data.report as ReaderAnalysisReport;
      await saveReaderData(readerPitch, report);
      setReaderReport(report);
      setReaderProvider(data.provider ?? null);
      setReaderPanelOpen(true);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "독자 분석에 실패했습니다.";
      setReaderError(
        msg.includes("저장")
          ? `${msg} (화면에만 보일 수 있음 — 「전체 저장」 또는 다시 분석해 주세요.)`
          : msg,
      );
    } finally {
      setReaderLoading(false);
    }
  }, [book.title, readerPitch, readerIncludeSample, saveReaderData]);

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
      chapterBaselineRef.current[data.chapter.id] = data.chapter.updated_at;
      setChapters((prev) => [...prev, data.chapter]);
      setActiveChapterId(data.chapter.id);
    }
  };

  const renameChapter = async (id: string, title: string) => {
    if (savePaused) {
      window.alert(
        "다른 곳에서 더 최근에 저장된 내용이 있어 이름 변경을 서버에 반영할 수 없습니다.",
      );
      return;
    }
    const ifUpdatedAt = chapterBaselineRef.current[id];
    setChapters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c)),
    );
    markChapterDirty(id);
    try {
      const res = await fetch(`/api/chapters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, if_updated_at: ifUpdatedAt }),
      });
      const saved = await parseChapterPatchResponse(res);
      applySavedChapter(saved);
    } catch (err) {
      if (isChapterSaveConflict(err)) {
        handleStaleConflict(err.message);
        return;
      }
      setMessage("장 제목 저장에 실패했습니다.");
    }
  };

  const reorderChapters = async (ids: string[]) => {
    if (editorPanel === "chapter") {
      const ok = await blockIfUnsaved();
      if (!ok) return;
    }

    const prev = chaptersRef.current;
    const reordered = ids
      .map((id) => prev.find((c) => c.id === id))
      .filter(Boolean) as Chapter[];
    if (reordered.length !== prev.length) return;

    setChapters(reordered);
    chaptersRef.current = reordered;

    try {
      const res = await fetch(`/api/books/${bookId}/chapters`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: ids }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "장 순서 저장에 실패했습니다.",
        );
      }
      setSaveState("saved");
      setMessage("");
    } catch (err) {
      setChapters(prev);
      chaptersRef.current = prev;
      setSaveState("error");
      setMessage(
        err instanceof Error ? err.message : "장 순서 저장에 실패했습니다.",
      );
    }
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

  const stashActiveChapter = useCallback(async (): Promise<boolean> => {
    return flushActiveChapter();
  }, [flushActiveChapter]);

  const blockIfUnsaved = useCallback(async (): Promise<boolean> => {
    await stashActiveChapter();
    return true;
  }, [stashActiveChapter]);

  const applyPageMove = useCallback(
    async (nextChapters: Chapter[]) => {
      const prev = chaptersRef.current;
      const affected = chaptersWithChangedPages(prev, nextChapters);

      let nextChapterId = activeChapterId;
      const trackedPageId = activePageByChapterRef.current[activeChapterId];
      if (trackedPageId) {
        for (const ch of nextChapters) {
          const parsed = parseChapterContent(
            ch.content_json,
            ch.title,
            ch.content_html,
          );
          if (parsed.pages.some((p) => p.id === trackedPageId)) {
            nextChapterId = ch.id;
            break;
          }
        }
      }

      setChapters(nextChapters);
      setChapterEditorKey((k) => k + 1);
      setPageMoveError(null);
      setActiveChapterId(nextChapterId);
      if (trackedPageId) {
        setActivePageByChapter((p) => ({
          ...p,
          [nextChapterId]: trackedPageId,
        }));
        if (nextChapterId === activeChapterId) {
          requestAnimationFrame(() => {
            editorRef.current?.selectPage(trackedPageId);
          });
        }
      }

      try {
        for (const id of affected) markChapterDirty(id);
        await Promise.all(
          affected.map((id) => {
            const ch = nextChapters.find((c) => c.id === id);
            if (!ch) return Promise.resolve();
            return saveChapter(id, ch.content_json, ch.content_html);
          }),
        );
        setSaveState("saved");
        setMessage("");
      } catch {
        setSaveState("error");
        setMessage("페이지 순서 저장에 실패했습니다.");
      }
    },
    [activeChapterId, markChapterDirty, saveChapter],
  );

  const movePageByDragOrder = useCallback(
    async (activePageId: string, overKey: string) => {
      if (editorPanel === "chapter") {
        const ok = await blockIfUnsaved();
        if (!ok) return;
      }

      const prev = chaptersRef.current;
      const result = movePageByDrag(prev, activePageId, overKey);
      if ("error" in result) {
        setPageMoveError(result.error);
        return;
      }

      await applyPageMove(result.chapters);
    },
    [applyPageMove, blockIfUnsaved, editorPanel],
  );

  const selectChapter = useCallback(
    async (id: string) => {
      if (id !== activeChapterId && editorPanel === "chapter") {
        const ok = await blockIfUnsaved();
        if (!ok) return;
      }
      setEditorPanel("chapter");
      setActiveChapterId(id);
      const ch = chaptersRef.current.find((c) => c.id === id);
      const pageId = ch ? defaultPageIdForChapter(ch) : undefined;
      if (pageId) {
        setActivePageByChapter((prev) => ({ ...prev, [id]: pageId }));
        if (id === activeChapterId) {
          editorRef.current?.selectPage(pageId);
        }
      }
    },
    [activeChapterId, blockIfUnsaved, editorPanel],
  );

  const selectChapterPage = useCallback(
    async (chapterId: string, pageId: string) => {
      if (chapterId !== activeChapterId && editorPanel === "chapter") {
        const ok = await blockIfUnsaved();
        if (!ok) return;
      }
      setEditorPanel("chapter");
      setActiveChapterId(chapterId);
      setActivePageByChapter((prev) => ({ ...prev, [chapterId]: pageId }));
      if (chapterId === activeChapterId) {
        editorRef.current?.selectPage(pageId);
      }
    },
    [activeChapterId, blockIfUnsaved, editorPanel],
  );

  const deleteChapter = useCallback(
    async (id: string) => {
      const target = chaptersRef.current.find((c) => c.id === id);
      if (!target) return;

      const label = target.title.trim() || "제목 없음";
      if (
        !window.confirm(
          `「${label}」 장을 삭제할까요?\n\n표지·본문·명언이 모두 지워지며 되돌릴 수 없습니다.`,
        )
      ) {
        return;
      }

      if (editorPanel === "chapter" && activeChapterId === id) {
        const ok = await blockIfUnsaved();
        if (!ok) return;
      }

      const res = await fetch(`/api/chapters/${id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        window.alert(
          typeof data.error === "string"
            ? data.error
            : "장 삭제에 실패했습니다.",
        );
        return;
      }

      const next = chaptersRef.current.filter((c) => c.id !== id);
      setChapters(next);
      setActivePageByChapter((prev) => {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      });
      setChapterEditorKey((k) => k + 1);
      clearChapterDraft(bookId, id);

      if (activeChapterId === id) {
        const fallback = next[0];
        if (fallback) {
          selectChapter(fallback.id);
        } else {
          setEditorPanel("book-cover");
        }
      }
    },
    [activeChapterId, blockIfUnsaved, bookId, editorPanel, selectChapter],
  );

  const selectBookCover = useCallback(async () => {
    if (editorPanel === "chapter") {
      const ok = await blockIfUnsaved();
      if (!ok) return;
    }
    setEditorPanel("book-cover");
  }, [blockIfUnsaved, editorPanel]);

  const activeChapterDraft = useMemo(() => {
    if (!activeChapter) return null;
    const draft = readChapterDraft(bookId, activeChapter.id);
    if (!draft) return null;
    if (!draftContentDiffers(draft, activeChapter.content_json)) return null;
    return draft;
  }, [activeChapter, bookId]);

  const restoreActiveChapterDraft = useCallback(() => {
    if (!activeChapter || !activeChapterDraft) return;

    if (
      !window.confirm(
        "지금 보고 있는 「이 장」만 브라우저 백업으로 바꿉니다.\n\n다른 장·책 표지는 건드리지 않습니다. 계속할까요?",
      )
    ) {
      return;
    }

    setChapters((prev) =>
      prev.map((c) =>
        c.id === activeChapter.id
          ? {
              ...c,
              content_json: activeChapterDraft.contentJson,
              content_html: activeChapterDraft.contentHtml,
            }
          : c,
      ),
    );
    setChapterEditorKey((k) => k + 1);
    markChapterDirty(activeChapter.id);
    setMessage(
      "이 장만 백업에서 불러왔습니다. 내용 확인 후 「전체 저장」으로 서버에 반영하세요.",
    );
    setSaveState("pending");
  }, [activeChapter, activeChapterDraft, markChapterDirty]);

  const publish = async () => {
    setPublishing(true);
    setMessage("");
    const saved = await saveAll();
    if (!saved) {
      setPublishing(false);
      setMessage("저장에 실패해 출판을 중단했습니다. 「전체 저장」 후 다시 출판해 주세요.");
      return;
    }
    const res = await fetch(`/api/publish/${bookId}`, { method: "POST" });
    const data = await res.json();
    setPublishing(false);

    if (data.error) {
      setMessage(data.error);
      return;
    }

    setBook(data.book);
    const title = (data.book?.title ?? book.title).trim() || "제목 없음";
    const pdfLine = data.pdfReady
      ? "PDF도 생성되었습니다. 상단 「PDF 받기」로 내려받을 수 있습니다."
      : data.pdfError
        ? `PDF 생성 실패(웹·EPUB 출판은 완료): ${data.pdfError}`
        : "";
    setMessage(
      [
        `「${title}」 출판 완료! 독자 링크는 그대로이며 내용만 갱신됩니다.`,
        data.readerUrl ?? "",
        pdfLine,
      ]
        .filter(Boolean)
        .join("\n"),
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
      {envLabel ? (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950">
          {envLabel}
        </div>
      ) : null}
      {staleBanner ? (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          <p>{staleBanner}</p>
          <p className="mt-1 text-xs text-red-800/90">
            이 탭의 글은 서버에 올라가지 않습니다. 배포 사이트에서 저장한 내용을 유지하려면 아래를
            누르세요.
          </p>
          <button
            type="button"
            onClick={() => {
              void reloadChaptersFromServer().catch((err) => {
                const detail =
                  err instanceof Error
                    ? err.message
                    : "서버에서 최신 내용을 불러오지 못했습니다.";
                window.alert(detail);
              });
            }}
            className="mt-2 rounded-lg bg-red-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-950"
          >
            서버 최신 내용 불러오기
          </button>
        </div>
      ) : null}
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
        {activeChapterDraft && editorPanel === "chapter" ? (
          <button
            type="button"
            onClick={restoreActiveChapterDraft}
            title="서버와 다른 이 장의 브라우저 백업만 편집 화면에 불러옵니다"
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100"
          >
            이 장 백업 불러오기
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={manualSaving || publishing || savePaused}
          title={
            savePaused
              ? "다른 곳에서 더 최근에 저장되어 전체 저장이 막혀 있습니다"
              : "수정한 장·설정만 서버에 저장 (⌘S / Ctrl+S)"
          }
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {manualSaving ? "저장 중…" : "전체 저장"}
        </button>
        <button
          type="button"
          onClick={() => {
            setVersionsPanelOpen((o) => !o);
            if (!versionsPanelOpen) setReaderPanelOpen(false);
          }}
          aria-pressed={versionsPanelOpen}
          className={`rounded-lg border px-4 py-2 text-sm font-medium ${
            versionsPanelOpen
              ? "border-sky-400 bg-sky-100 text-sky-950"
              : "border-sky-200 bg-sky-50 text-sky-950 hover:bg-sky-100"
          }`}
        >
          버전
        </button>
        <button
          type="button"
          onClick={() => setReaderPanelOpen((open) => !open)}
          title="타겟 독자 분석 패널 열기/닫기"
          aria-pressed={readerPanelOpen}
          className={`rounded-lg border px-4 py-2 text-sm font-medium ${
            readerPanelOpen
              ? "border-violet-400 bg-violet-100 text-violet-950"
              : "border-violet-300 bg-violet-50 text-violet-950 hover:bg-violet-100"
          }`}
        >
          독자
        </button>
        <a
          href={`/admin/books/${bookId}/preview`}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={chapters.length === 0}
          title={
            chapters.length === 0
              ? "챕터를 추가한 뒤 미리볼 수 있습니다"
              : "독자 화면을 새 탭에서 열기 (저장된 내용 기준)"
          }
          className={`rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 ${
            chapters.length === 0
              ? "pointer-events-none opacity-40"
              : "hover:bg-stone-50"
          }`}
        >
          독자 미리보기
        </a>
        <a
          href={`/api/books/${bookId}/pdf`}
          download
          title={
            chapters.length === 0
              ? "챕터를 추가한 뒤 PDF를 받을 수 있습니다"
              : book.status === "published"
                ? "출판된 PDF 내려받기"
                : "현재 저장본 기준 PDF 미리보기"
          }
          className={`rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 ${
            chapters.length === 0
              ? "pointer-events-none opacity-40"
              : "hover:bg-stone-50"
          }`}
        >
          PDF 받기
        </a>
        <button
          type="button"
          onClick={publish}
          disabled={publishing}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {publishing ? "출판 중..." : "출판"}
        </button>
      </header>

      {versionPreview ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-950">
          <span>
            버전 「{versionPreview.label}」 보기 중 (읽기 전용 — 저장되지 않음)
          </span>
          <button
            type="button"
            onClick={() => setVersionPreview(null)}
            className="rounded-lg bg-sky-900 px-3 py-1 text-xs font-medium text-white"
          >
            현재 편집본으로 돌아가기
          </button>
        </div>
      ) : null}

      {message && (
        <div
          className={`whitespace-pre-wrap px-4 py-2 text-sm ${
            saveState === "error"
              ? "bg-red-50 text-red-800"
              : "bg-green-50 text-green-800"
          }`}
        >
          {message}
        </div>
      )}

      <div
        className="flex min-h-0 flex-1"
        style={headingFontCssVariables(displayBook.heading_fonts)}
      >
        <ChapterSidebar
          chapters={displayChapters}
          activeId={activeChapterId}
          activePageId={activePageByChapter[activeChapterId] ?? null}
          bookCoverActive={editorPanel === "book-cover"}
          onSelectBookCover={selectBookCover}
          onSelect={selectChapter}
          onSelectPage={selectChapterPage}
          onAdd={addChapter}
          onRename={renameChapter}
          onDelete={(id) => void deleteChapter(id)}
          onReorder={reorderChapters}
          onPageDragEnd={(pageId, overId) =>
            void movePageByDragOrder(pageId, overId)
          }
          onPageMoveError={setPageMoveError}
          moveError={pageMoveError}
          onClearMoveError={() => setPageMoveError(null)}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {editorPanel === "book-cover" ? (
            <BookCoverEditor
              title={displayBook.title}
              subtitle={displayBook.subtitle}
              cover={{
                cover_bg_color: displayBook.cover_bg_color,
                cover_title_color: displayBook.cover_title_color,
              }}
              onCoverChange={(patch) => void updateCoverStyle(patch)}
            />
          ) : activeChapter ? (
            <BookEditor
              ref={editorRef}
              key={`${activeChapter.id}-${chapterEditorKey}`}
              chapterId={activeChapter.id}
              chapterTitle={activeChapter.title}
              bookId={bookId}
              initialContent={activeChapter.content_json}
              initialContentHtml={activeChapter.content_html}
              initialPageId={activePageByChapter[activeChapter.id]}
              onContentChange={updateChapterContent}
              onSave={saveChapter}
              savePaused={editorFrozen}
              onSaveState={setSaveState}
              onSaveError={(msg) => setMessage(msg)}
              onActivePageChange={(pageId) => {
                setActivePageByChapter((prev) => ({
                  ...prev,
                  [activeChapter.id]: pageId,
                }));
              }}
            />
          ) : null}
        </div>
        {versionsPanelOpen && (
          <BookVersionsPanel
            bookId={bookId}
            book={book}
            chapters={chapters}
            onPreview={(snapshot, label) => {
              setVersionPreview({ snapshot, label });
              setVersionsPanelOpen(false);
            }}
            onRestored={(nextBook, nextChapters) => {
              setVersionPreview(null);
              setBook((b) => ({
                ...b,
                ...nextBook,
                ...normalizeBookCoverStyle(nextBook),
                heading_fonts: normalizeBookHeadingFonts(nextBook.heading_fonts),
                ...normalizeBookReaderFields(nextBook),
              }));
              setReaderPitch(
                normalizeBookReaderFields(nextBook).reader_pitch,
              );
              setReaderReport(
                normalizeBookReaderFields(nextBook).reader_analysis,
              );
              for (const c of nextChapters) {
                chapterBaselineRef.current[c.id] = c.updated_at;
              }
              dirtyChapterIdsRef.current.clear();
              setSavePaused(false);
              setStaleBanner(null);
              chaptersRef.current = nextChapters;
              setChapters(nextChapters);
              setChapterEditorKey((k) => k + 1);
              setMessage("버전을 복원했습니다. 내용을 확인한 뒤 저장하세요.");
              setSaveState("pending");
            }}
            onClose={() => setVersionsPanelOpen(false)}
          />
        )}
        {readerPanelOpen && (
          <ReaderAnalysisPanel
            pitch={readerPitch}
            onPitchChange={setReaderPitch}
            onPitchBlur={() => {
              void saveReaderPitch(readerPitch).catch(() => {
                setReaderError("책 요약 저장에 실패했습니다. 「전체 저장」을 눌러 주세요.");
              });
            }}
            report={readerReport}
            loading={readerLoading}
            error={readerError}
            provider={readerProvider}
            includeSample={readerIncludeSample}
            onIncludeSampleChange={setReaderIncludeSample}
            onAnalyze={() => void runReaderAnalysis()}
          />
        )}
      </div>
    </div>
  );
}
