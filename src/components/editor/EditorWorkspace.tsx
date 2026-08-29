"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookCoverEditor } from "@/components/editor/BookCoverEditor";
import { BookEditor, type BookEditorHandle } from "@/components/editor/BookEditor";
import { ChapterSidebar } from "@/components/editor/ChapterSidebar";
import { ChapterTitlePickDialog } from "@/components/editor/ChapterTitlePickDialog";
import { ReaderAnalysisPanel } from "@/components/editor/ReaderAnalysisPanel";
import { BookTitlePickPanel } from "@/components/editor/BookTitlePickPanel";
import { SalesPageCopyPanel } from "@/components/editor/SalesPageCopyPanel";
import {
  normalizeBookCoverStyle,
  type BookCoverStyle,
} from "@/lib/books/coverStyle";
import { normalizeBookReaderFields } from "@/lib/books/readerFields";
import { buildChapterSample } from "@/lib/readerAnalysis/sampleText";
import type { BookTitleCandidate, BookTitlePickReport } from "@/lib/bookTitlePick/types";
import type {
  ChapterTitleCandidate,
  ChapterTitlePickReport,
} from "@/lib/chapterTitlePick/types";
import type { SalesPageCopyReport } from "@/lib/salesPageCopy/types";
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
import {
  BODY_FONT_OPTIONS,
  bodyFontCssVariables,
  bookTypographyFontFaceCss,
  normalizeBookBodyFont,
  type BookBodyFont,
} from "@/lib/typography/bodyFonts";
import { parseChapterContent } from "@/lib/pages/content";
import {
  withAllPagesDone,
  withPageDone,
  withPageMemo,
} from "@/lib/pages/chapterEditorMeta";
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
  parseChapterPatchResponse,
} from "@/lib/editor/chapterSave";
import {
  chaptersFromSnapshot,
  type BookVersionSnapshot,
} from "@/lib/books/bookVersionSnapshot";
import { BookVersionsPanel, createAutoBookVersionIfChanged } from "@/components/editor/BookVersionsPanel";
import { getEditorEnvironmentLabel } from "@/lib/editor/editorEnvironment";
import { uploadBookCover } from "@/lib/editor/uploadBookCover";
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
  initialCoverImageUrl?: string | null;
};

export function EditorWorkspace({
  bookId,
  initialBook,
  initialChapters,
  initialCoverImageUrl = null,
}: Props) {
  const router = useRouter();
  const [book, setBook] = useState(() => ({
    ...initialBook,
    ...normalizeBookCoverStyle(initialBook),
    heading_fonts: normalizeBookHeadingFonts(initialBook.heading_fonts),
    body_font: normalizeBookBodyFont(initialBook.body_font),
    ...normalizeBookReaderFields(initialBook),
  }));
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(
    initialCoverImageUrl,
  );
  const [coverUploading, setCoverUploading] = useState(false);
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
  const [salesPanelOpen, setSalesPanelOpen] = useState(false);
  const [titlePickPanelOpen, setTitlePickPanelOpen] = useState(false);
  const [titlePickReport, setTitlePickReport] =
    useState<BookTitlePickReport | null>(null);
  const [titlePickLoading, setTitlePickLoading] = useState(false);
  const [titlePickError, setTitlePickError] = useState<string | null>(null);
  const [titlePickProvider, setTitlePickProvider] = useState<string | null>(
    null,
  );
  const [titlePickChaptersAnalyzed, setTitlePickChaptersAnalyzed] = useState<
    number | null
  >(null);
  const [chapterTitlePickChapterId, setChapterTitlePickChapterId] = useState<
    string | null
  >(null);
  const [chapterTitlePickReport, setChapterTitlePickReport] =
    useState<ChapterTitlePickReport | null>(null);
  const [chapterTitlePickLoading, setChapterTitlePickLoading] = useState(false);
  const [chapterTitlePickError, setChapterTitlePickError] = useState<
    string | null
  >(null);
  const [chapterTitlePickProvider, setChapterTitlePickProvider] = useState<
    string | null
  >(null);
  const [salesCopyReport, setSalesCopyReport] =
    useState<SalesPageCopyReport | null>(() => initialReader.sales_page_copy);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [salesProvider, setSalesProvider] = useState<string | null>(null);
  const [salesChaptersAnalyzed, setSalesChaptersAnalyzed] = useState<
    number | null
  >(null);
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
  const chapterSaveQueuesRef = useRef(new Map<string, Promise<void>>());
  const dirtyChapterIdsRef = useRef(new Set<string>());
  const initialPullDoneRef = useRef(false);
  const [envLabel, setEnvLabel] = useState<string | null>(null);

  useEffect(() => {
    setEnvLabel(getEditorEnvironmentLabel());
  }, []);

  const { status: lockStatus, retry: retryLock } = useEditorSessionLock(bookId);

  const markChapterDirty = useCallback((chapterId: string) => {
    dirtyChapterIdsRef.current.add(chapterId);
  }, []);

  const applySavedChapter = useCallback((chapter: Chapter) => {
    dirtyChapterIdsRef.current.delete(chapter.id);
    setChapters((prev) => {
      const next = prev.map((c) =>
        c.id === chapter.id ? { ...c, updated_at: chapter.updated_at } : c,
      );
      chaptersRef.current = next;
      return next;
    });
  }, []);

  const enqueueChapterSave = useCallback(
    (chapterId: string, task: () => Promise<void>) => {
      const queues = chapterSaveQueuesRef.current;
      const prior = queues.get(chapterId) ?? Promise.resolve();
      const next = prior.then(task, task);
      queues.set(
        chapterId,
        next.catch(() => {}),
      );
      return next;
    },
    [],
  );

  const pullChapterFromServer = useCallback(async (chapterId: string) => {
    const res = await fetch(`/api/chapters/${chapterId}`, { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as {
      chapter?: Chapter;
      error?: string;
    };
    if (!res.ok || !data.chapter) {
      throw new Error(
        typeof data.error === "string" ? data.error : "장을 불러오지 못했습니다.",
      );
    }
    return data.chapter;
  }, []);

  const pullAllChaptersFromServer = useCallback(async () => {
    const res = await fetch(`/api/books/${bookId}/chapters`, {
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      chapters?: Chapter[];
      error?: string;
    };
    if (!res.ok || !data.chapters) {
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : "서버에서 책 내용을 불러오지 못했습니다.",
      );
    }
    return data.chapters;
  }, [bookId]);

  const applyPulledChapter = useCallback(
    (chapter: Chapter, pageId?: string) => {
      dirtyChapterIdsRef.current.delete(chapter.id);
      setChapters((prev) => {
        const next = prev.map((c) => (c.id === chapter.id ? chapter : c));
        chaptersRef.current = next;
        return next;
      });
      setChapterEditorKey((k) => k + 1);
      setActiveChapterId(chapter.id);
      setEditorPanel("chapter");
      const resolvedPageId =
        pageId ?? defaultPageIdForChapter(chapter) ?? undefined;
      if (resolvedPageId) {
        setActivePageByChapter((prev) => ({
          ...prev,
          [chapter.id]: resolvedPageId,
        }));
      }
    },
    [],
  );

  /** 편집기 진입 시 1회 — 서버에서 전체 목차 pull */
  useEffect(() => {
    if (initialPullDoneRef.current) return;
    initialPullDoneRef.current = true;

    void (async () => {
      try {
        const pulled = await pullAllChaptersFromServer();
        const dirty = dirtyChapterIdsRef.current;
        const prev = chaptersRef.current;
        const activeId = activeChapterId;
        const next = pulled.map((serverCh) => {
          const local = prev.find((c) => c.id === serverCh.id);
          if (local && dirty.has(serverCh.id)) return local;
          return serverCh;
        });
        chaptersRef.current = next;
        setChapters(next);

        const activeKeptLocal =
          !!activeId && dirty.has(activeId);
        if (!activeKeptLocal) {
          setChapterEditorKey((k) => k + 1);
        }

        const first = next[0];
        if (first && !activeKeptLocal) {
          setActiveChapterId(first.id);
          const pageId = defaultPageIdForChapter(first);
          if (pageId) {
            setActivePageByChapter({ [first.id]: pageId });
          }
        }

        if (dirty.size === 0) {
          setSaveState("saved");
        }
      } catch (err) {
        const detail =
          err instanceof Error
            ? err.message
            : "서버에서 책 내용을 불러오지 못했습니다.";
        setMessage(detail);
      }
    })();
  }, [pullAllChaptersFromServer]);

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
      cover_path: s.cover_path ?? book.cover_path,
      cover_bg_color: s.cover_bg_color,
      cover_title_color: s.cover_title_color,
      heading_fonts: s.heading_fonts,
      body_font: normalizeBookBodyFont(s.body_font ?? book.body_font),
      reader_pitch: s.reader_pitch,
      reader_analysis: s.reader_analysis,
      sales_page_copy: s.sales_page_copy ?? book.sales_page_copy,
    };
  }, [book, versionPreview]);

  const activeChapter = displayChapters.find((c) => c.id === activeChapterId);
  const editorFrozen = !!versionPreview;

  const updateChapterContent = useCallback(
    (
      chapterId: string,
      contentJson: Record<string, unknown>,
      contentHtml: string,
    ) => {
      markChapterDirty(chapterId);
      setChapters((prev) => {
        const next = prev.map((c) =>
          c.id === chapterId
            ? { ...c, content_json: contentJson, content_html: contentHtml }
            : c,
        );
        chaptersRef.current = next;
        return next;
      });
    },
    [markChapterDirty],
  );

  const saveChapter = useCallback(
    (
      chapterId: string,
      contentJson: Record<string, unknown>,
      contentHtml: string,
      title?: string,
    ) =>
      enqueueChapterSave(chapterId, async () => {
        let lastError: unknown;
        for (let i = 0; i < 3; i++) {
          try {
            const res = await fetch(`/api/chapters/${chapterId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content_json: contentJson,
                content_html: contentHtml,
                ...(title !== undefined ? { title } : {}),
              }),
            });
            const saved = await parseChapterPatchResponse(res);
            applySavedChapter(saved);
            clearChapterDraft(bookId, chapterId);
            setSaveState("saved");
            return;
          } catch (err) {
            lastError = err;
            if (i < 2) {
              await new Promise((r) => setTimeout(r, 500 * (i + 1)));
            }
          }
        }
        throw lastError;
      }),
    [applySavedChapter, bookId, enqueueChapterSave],
  );

  const persistChapterInBackground = useCallback(
    (
      chapterId: string,
      snapshot?: {
        chapterId: string;
        contentJson: Record<string, unknown>;
        contentHtml: string;
      },
    ) => {
      void (async () => {
        try {
          const ch = chaptersRef.current.find((c) => c.id === chapterId);
          const contentJson = snapshot?.contentJson ?? ch?.content_json;
          const contentHtml = snapshot?.contentHtml ?? ch?.content_html ?? "";
          if (!contentJson) return;

          markChapterDirty(chapterId);
          await saveChapter(
            chapterId,
            contentJson,
            contentHtml,
            ch?.title,
          );
          dirtyChapterIdsRef.current.delete(chapterId);
        } catch {
          setSaveState("error");
          setMessage("저장에 실패했습니다.");
        }
      })();
    },
    [markChapterDirty, saveChapter],
  );

  const persistChapterFromRef = useCallback(
    (chapterId: string) => {
      const ch = chaptersRef.current.find((c) => c.id === chapterId);
      if (!ch) return;
      persistChapterInBackground(chapterId, {
        chapterId,
        contentJson: ch.content_json,
        contentHtml: ch.content_html ?? "",
      });
    },
    [persistChapterInBackground],
  );

  const togglePageDone = useCallback(
    (chapterId: string, pageId: string, done: boolean) => {
      markChapterDirty(chapterId);
      setSaveState("pending");
      setChapters((prev) => {
        const next = prev.map((c) =>
          c.id === chapterId
            ? {
                ...c,
                content_json: withPageDone(
                  c.content_json,
                  pageId,
                  done,
                  c.title,
                  c.content_html,
                ),
              }
            : c,
        );
        chaptersRef.current = next;
        return next;
      });
      if (chapterId === activeChapterId) {
        editorRef.current?.setPageDone(pageId, done);
      } else {
        persistChapterFromRef(chapterId);
      }
    },
    [activeChapterId, markChapterDirty, persistChapterFromRef],
  );

  const clearAllPageDone = useCallback(() => {
    for (const c of chaptersRef.current) {
      markChapterDirty(c.id);
    }
    setSaveState("pending");
    setChapters((prev) => {
      const next = prev.map((c) => ({
        ...c,
        content_json: withAllPagesDone(
          c.content_json,
          false,
          c.title,
          c.content_html,
        ),
      }));
      chaptersRef.current = next;
      return next;
    });
    const active = chaptersRef.current.find((c) => c.id === activeChapterId);
    if (active && editorRef.current) {
      editorRef.current.setAllPagesDone(false);
    } else if (active) {
      persistChapterFromRef(activeChapterId);
    }
    for (const c of chaptersRef.current) {
      if (c.id === activeChapterId) continue;
      persistChapterFromRef(c.id);
    }
  }, [
    activeChapterId,
    markChapterDirty,
    persistChapterFromRef,
    persistChapterInBackground,
  ]);

  const setPageMemo = useCallback(
    (chapterId: string, pageId: string, memo: string) => {
      markChapterDirty(chapterId);
      setSaveState("pending");
      setChapters((prev) => {
        const next = prev.map((c) =>
          c.id === chapterId
            ? {
                ...c,
                content_json: withPageMemo(
                  c.content_json,
                  pageId,
                  memo,
                  c.title,
                  c.content_html,
                ),
              }
            : c,
        );
        chaptersRef.current = next;
        return next;
      });
      if (chapterId === activeChapterId) {
        editorRef.current?.setPageMemo(pageId, memo);
      } else {
        persistChapterFromRef(chapterId);
      }
    },
    [activeChapterId, markChapterDirty, persistChapterFromRef],
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
          const detail =
            err instanceof Error ? err.message : "장 저장에 실패했습니다.";
          throw new Error(`「${c.title}」 저장 실패: ${detail}`);
        }
      }

      const normalizedReport = readerReport
        ? normalizeReaderAnalysisReport(readerReport)
        : null;
      const normalizedSalesCopy = salesCopyReport
        ? salesCopyReport
        : null;

      const bookRes = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: book.title,
          heading_fonts: book.heading_fonts,
          body_font: book.body_font,
          cover_path: book.cover_path,
          cover_bg_color: book.cover_bg_color,
          cover_title_color: book.cover_title_color,
          reader_pitch: readerPitch,
          ...(normalizedReport ? { reader_analysis: normalizedReport } : {}),
          ...(normalizedSalesCopy ? { sales_page_copy: normalizedSalesCopy } : {}),
        }),
      });

      if (!bookRes.ok) {
        const data = await bookRes.json().catch(() => ({}));
        let errMsg =
          typeof data.error === "string" ? data.error : "책 정보 저장 실패";
        if (/column|does not exist|reader_|cover_|heading_fonts|body_font|sales_page_copy/i.test(errMsg)) {
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
    book.body_font,
    book.cover_path,
    book.cover_bg_color,
    book.cover_title_color,
    readerPitch,
    readerReport,
    salesCopyReport,
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

  const saveSalesPageCopy = useCallback(
    async (report: SalesPageCopyReport) => {
      const res = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sales_page_copy: report }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "상세페이지 문구 저장에 실패했습니다.",
        );
      }
      const data = await res.json();
      const normalized = normalizeBookReaderFields(data.book);
      setBook((b) => ({ ...b, ...normalized }));
      setSalesCopyReport(normalized.sales_page_copy);
    },
    [bookId],
  );

  const runSalesPageCopy = useCallback(async () => {
    setSalesLoading(true);
    setSalesError(null);
    setSalesProvider(null);
    setSalesChaptersAnalyzed(null);

    try {
      await flushActiveChapter();

      const res = await fetch("/api/sales-page-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          bookTitle: book.title,
          bookSubtitle: book.subtitle,
          readerAnalysis: readerReport ?? undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "상세페이지 문구 생성에 실패했습니다.",
        );
      }

      const report = data.report as SalesPageCopyReport;
      await saveSalesPageCopy(report);
      setSalesCopyReport(report);
      setSalesProvider(data.provider ?? null);
      setSalesChaptersAnalyzed(
        typeof data.chaptersAnalyzed === "number" ? data.chaptersAnalyzed : null,
      );
      setSalesPanelOpen(true);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "상세페이지 문구 생성에 실패했습니다.";
      setSalesError(
        msg.includes("저장")
          ? `${msg} (화면에만 보일 수 있음 — 「전체 저장」 또는 다시 시도해 주세요.)`
          : msg,
      );
    } finally {
      setSalesLoading(false);
    }
  }, [
    book.subtitle,
    book.title,
    bookId,
    flushActiveChapter,
    readerReport,
    saveSalesPageCopy,
  ]);

  const runBookTitlePick = useCallback(async () => {
    setTitlePickLoading(true);
    setTitlePickError(null);
    setTitlePickProvider(null);
    setTitlePickChaptersAnalyzed(null);

    try {
      await flushActiveChapter();

      const res = await fetch("/api/book-title-pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          bookTitle: book.title,
          bookSubtitle: book.subtitle,
          readerAnalysis: readerReport ?? undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "제목·부제목 생성에 실패했습니다.",
        );
      }

      setTitlePickReport(data.report as BookTitlePickReport);
      setTitlePickProvider(
        typeof data.provider === "string" ? data.provider : null,
      );
      setTitlePickChaptersAnalyzed(
        typeof data.chaptersAnalyzed === "number" ? data.chaptersAnalyzed : null,
      );
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "제목·부제목 생성에 실패했습니다.";
      setTitlePickError(msg);
    } finally {
      setTitlePickLoading(false);
    }
  }, [
    book.subtitle,
    book.title,
    bookId,
    flushActiveChapter,
    readerReport,
  ]);

  const runChapterTitlePick = useCallback(
    async (chapterId: string) => {
      setChapterTitlePickLoading(true);
      setChapterTitlePickError(null);
      setChapterTitlePickProvider(null);
      setChapterTitlePickReport(null);

      try {
        if (activeChapterId === chapterId) {
          await flushActiveChapter();
        }

        const chapter = chaptersRef.current.find((c) => c.id === chapterId);
        if (!chapter) {
          throw new Error("장을 찾을 수 없습니다.");
        }

        const res = await fetch("/api/chapter-title-pick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chapterId,
            bookTitle: book.title,
            chapter: {
              title: chapter.title,
              content_json: chapter.content_json,
              content_html: chapter.content_html,
              sort_order: chapter.sort_order,
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "장 제목 생성에 실패했습니다.",
          );
        }

        setChapterTitlePickReport(data.report as ChapterTitlePickReport);
        setChapterTitlePickProvider(
          typeof data.provider === "string" ? data.provider : null,
        );
        setMessage("장 제목 후보가 준비됐습니다. 팝업에서 고르세요.");
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "장 제목 생성에 실패했습니다.";
        setChapterTitlePickError(msg);
        setMessage(msg);
      } finally {
        setChapterTitlePickLoading(false);
      }
    },
    [activeChapterId, book.title, flushActiveChapter],
  );

  const openChapterTitlePick = useCallback(
    (chapterId: string) => {
      setChapterTitlePickChapterId(chapterId);
      setMessage("이 장의 페이지를 읽어 제목 후보를 만드는 중…");
      void runChapterTitlePick(chapterId);
    },
    [runChapterTitlePick],
  );

  const closeChapterTitlePick = useCallback(() => {
    setChapterTitlePickChapterId(null);
    setChapterTitlePickReport(null);
    setChapterTitlePickError(null);
    setChapterTitlePickProvider(null);
    setChapterTitlePickLoading(false);
  }, []);

  const applyBookTitleCandidate = useCallback(
    async (candidate: BookTitleCandidate) => {
      const title = candidate.title.trim();
      const subtitle = candidate.subtitle.trim() || null;
      if (!title) return;

      setBook((b) => ({ ...b, title, subtitle }));
      try {
        const res = await fetch(`/api/books/${bookId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, subtitle }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "제목 저장에 실패했습니다.",
          );
        }
        setMessage("제목·부제목을 표지에 적용했습니다.");
        setSaveState("saved");
      } catch (e) {
        setMessage(
          e instanceof Error
            ? e.message
            : "제목 저장에 실패했습니다. 「전체 저장」을 눌러 주세요.",
        );
        setSaveState("pending");
      }
    },
    [bookId],
  );

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

  const renameChapter = useCallback(
    (id: string, title: string) => {
      setChapters((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, title } : c));
        chaptersRef.current = next;
        return next;
      });
      markChapterDirty(id);
      setSaveState("pending");
    },
    [markChapterDirty],
  );

  const applyChapterTitleCandidate = useCallback(
    async (candidate: ChapterTitleCandidate) => {
      const chapterId = chapterTitlePickChapterId;
      if (!chapterId) return;

      const title = candidate.title.trim();
      if (!title) return;

      renameChapter(chapterId, title);
      try {
        const res = await fetch(`/api/chapters/${chapterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "장 제목 저장에 실패했습니다.",
          );
        }
        setMessage("장 제목을 적용했습니다.");
        setSaveState("saved");
      } catch (e) {
        setMessage(
          e instanceof Error
            ? e.message
            : "장 제목 저장에 실패했습니다. 「전체 저장」을 눌러 주세요.",
        );
        setSaveState("pending");
      }
    },
    [chapterTitlePickChapterId, renameChapter],
  );

  const saveChapterFromEditor = useCallback(
    (
      chapterId: string,
      contentJson: Record<string, unknown>,
      contentHtml: string,
    ) => {
      const ch = chaptersRef.current.find((c) => c.id === chapterId);
      return saveChapter(
        chapterId,
        contentJson,
        contentHtml,
        ch?.title,
      );
    },
    [saveChapter],
  );

  const openChapterLocal = useCallback(
    (id: string) => {
      const ch = chaptersRef.current.find((c) => c.id === id);
      const pageId = ch ? defaultPageIdForChapter(ch) : undefined;

      if (editorPanel === "chapter" && editorRef.current) {
        const snapshot = editorRef.current.commitChapterSnapshot();
        if (id !== activeChapterId) {
          persistChapterInBackground(snapshot.chapterId, snapshot);
        } else if (pageId) {
          editorRef.current.selectPage(pageId);
          setActivePageByChapter((prev) => ({ ...prev, [id]: pageId }));
          return;
        }
      }

      setEditorPanel("chapter");
      setActiveChapterId(id);

      if (pageId) {
        setActivePageByChapter((prev) => ({ ...prev, [id]: pageId }));
      }
    },
    [activeChapterId, editorPanel, persistChapterInBackground],
  );

  const reorderChapters = (ids: string[]) => {
    const prev = chaptersRef.current;
    const reordered = ids
      .map((id) => prev.find((c) => c.id === id))
      .filter(Boolean) as Chapter[];
    if (reordered.length !== prev.length) return;

    setChapters(reordered);
    chaptersRef.current = reordered;

    void (async () => {
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
    })();
  };

  const updateBookTitle = async (title: string) => {
    setBook((b) => ({ ...b, title }));
    await fetch(`/api/books/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  };

  const updateBodyFont = async (value: BookBodyFont) => {
    setBook((b) => ({ ...b, body_font: value }));
    await fetch(`/api/books/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body_font: value }),
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

  const updateCoverPath = useCallback(
    async (coverPath: string | null, previewUrl: string | null) => {
      const res = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover_path: coverPath }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "표지 정보 저장에 실패했습니다.",
        );
      }
      setBook((b) => ({ ...b, cover_path: coverPath }));
      setCoverImageUrl(previewUrl);
    },
    [bookId],
  );

  const handleUploadCover = useCallback(
    async (file: File) => {
      setCoverUploading(true);
      try {
        const { path, url } = await uploadBookCover(file, bookId);
        await updateCoverPath(path, url);
      } catch (err) {
        const detail =
          err instanceof Error ? err.message : "표지 업로드에 실패했습니다.";
        alert(detail);
      } finally {
        setCoverUploading(false);
      }
    },
    [bookId, updateCoverPath],
  );

  const handleRemoveCover = useCallback(async () => {
    try {
      await updateCoverPath(null, null);
    } catch (err) {
      const detail =
        err instanceof Error ? err.message : "표지 제거에 실패했습니다.";
      alert(detail);
    }
  }, [updateCoverPath]);

  const stashActiveChapter = useCallback(async (): Promise<boolean> => {
    return flushActiveChapter();
  }, [flushActiveChapter]);

  const blockIfUnsaved = useCallback(async (): Promise<boolean> => {
    await stashActiveChapter();
    return true;
  }, [stashActiveChapter]);

  const applyPageMove = useCallback(
    (nextChapters: Chapter[]) => {
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
      chaptersRef.current = nextChapters;
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

      void (async () => {
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
      })();
    },
    [activeChapterId, markChapterDirty, saveChapter],
  );

  const movePageByDragOrder = useCallback(
    (
      activePageId: string,
      overKey: string,
      insertPosition: "before" | "after" = "before",
    ) => {
      let prev = chaptersRef.current;

      if (editorPanel === "chapter" && editorRef.current) {
        const snapshot = editorRef.current.commitChapterSnapshot();
        prev = prev.map((c) =>
          c.id === snapshot.chapterId
            ? {
                ...c,
                content_json: snapshot.contentJson,
                content_html: snapshot.contentHtml,
              }
            : c,
        );
        chaptersRef.current = prev;
      }

      const result = movePageByDrag(
        prev,
        activePageId,
        overKey,
        insertPosition,
      );
      if ("error" in result) {
        setPageMoveError(result.error);
        return;
      }

      applyPageMove(result.chapters);
    },
    [applyPageMove, editorPanel],
  );

  const selectChapter = useCallback(
    (id: string) => {
      openChapterLocal(id);
    },
    [openChapterLocal],
  );

  const selectChapterPage = useCallback(
    (chapterId: string, pageId: string) => {
      setEditorPanel("chapter");
      setMessage("");

      if (chapterId === activeChapterId && editorPanel === "chapter") {
        setActivePageByChapter((prev) => ({ ...prev, [chapterId]: pageId }));
        editorRef.current?.selectPage(pageId);
        return;
      }

      if (editorPanel === "chapter" && editorRef.current) {
        const snapshot = editorRef.current.commitChapterSnapshot();
        if (snapshot.chapterId !== chapterId) {
          persistChapterInBackground(snapshot.chapterId, snapshot);
        }
      }

      setActiveChapterId(chapterId);
      setActivePageByChapter((prev) => ({ ...prev, [chapterId]: pageId }));
    },
    [activeChapterId, editorPanel, persistChapterInBackground],
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

  const selectBookCover = useCallback(() => {
    if (editorPanel === "chapter" && editorRef.current) {
      const snapshot = editorRef.current.commitChapterSnapshot();
      persistChapterInBackground(snapshot.chapterId, snapshot);
    }
    setEditorPanel("book-cover");
  }, [editorPanel, persistChapterInBackground]);

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
    setMessage("출판 중… (EPUB·PDF 생성, 책이 길면 1~2분 걸릴 수 있습니다)");
    const controller = new AbortController();
    const abortTimer = window.setTimeout(() => controller.abort(), 240_000);

    try {
      const saved = await saveAll();
      if (!saved) {
        setMessage(
          "저장에 실패해 출판을 중단했습니다. 「전체 저장」 후 다시 출판해 주세요.",
        );
        return;
      }

      const res = await fetch(`/api/publish/${bookId}`, {
        method: "POST",
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        book?: typeof book;
        readerUrl?: string;
        pdfReady?: boolean;
        pdfError?: string;
      };

      if (!res.ok || data.error) {
        setMessage(
          data.error ??
            (res.status >= 500
              ? "출판 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
              : "출판에 실패했습니다."),
        );
        return;
      }

      if (data.book) setBook(data.book);
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
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      setMessage(
        aborted
          ? "출판 요청 시간이 초과되었습니다. 서버 터미널 로그를 확인하거나 잠시 후 다시 시도해 주세요."
          : err instanceof Error
            ? err.message
            : "출판 중 오류가 발생했습니다.",
      );
    } finally {
      window.clearTimeout(abortTimer);
      setPublishing(false);
    }
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
      <style
        dangerouslySetInnerHTML={{
          __html: bookTypographyFontFaceCss(
            displayBook.heading_fonts,
            displayBook.body_font,
          ),
        }}
      />
      {envLabel ? (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950">
          {envLabel}
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
          title="책 전체 서체 — 본문·장·중·소제목"
        >
          <span className="shrink-0 text-stone-400">서체</span>
          <label className="flex items-center gap-1">
            <span>본문</span>
            <select
              value={book.body_font}
              onChange={(e) =>
                void updateBodyFont(e.target.value as BookBodyFont)
              }
              className="max-w-[7.5rem] rounded border border-stone-200 bg-white px-1 py-0.5"
            >
              {BODY_FONT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
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
          {saveState === "pending" && "저장 대기 (페이지 탭·목차 클릭 시 저장)"}
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
          disabled={manualSaving || publishing || editorFrozen}
          title="수정한 장·설정만 서버에 저장 (⌘S / Ctrl+S)"
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {manualSaving ? "저장 중…" : "전체 저장"}
        </button>
        <button
          type="button"
          onClick={() => {
            setVersionsPanelOpen((o) => !o);
            if (!versionsPanelOpen) {
              setReaderPanelOpen(false);
              setSalesPanelOpen(false);
              setTitlePickPanelOpen(false);
            }
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
          onClick={() => {
            setReaderPanelOpen((open) => !open);
            if (!readerPanelOpen) {
              setSalesPanelOpen(false);
              setTitlePickPanelOpen(false);
            }
          }}
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
        <button
          type="button"
          onClick={() => {
            setSalesPanelOpen((open) => !open);
            if (!salesPanelOpen) {
              setReaderPanelOpen(false);
              setTitlePickPanelOpen(false);
            }
          }}
          title="상세페이지 문구 생성 패널"
          aria-pressed={salesPanelOpen}
          className={`rounded-lg border px-4 py-2 text-sm font-medium ${
            salesPanelOpen
              ? "border-sky-400 bg-sky-100 text-sky-950"
              : "border-sky-200 bg-sky-50 text-sky-950 hover:bg-sky-100"
          }`}
        >
          상세페이지
        </button>
        <button
          type="button"
          onClick={() => {
            const willOpen = !titlePickPanelOpen;
            setTitlePickPanelOpen((open) => !open);
            if (willOpen) {
              setReaderPanelOpen(false);
              setSalesPanelOpen(false);
              setVersionsPanelOpen(false);
              if (!titlePickLoading) {
                void runBookTitlePick();
              }
            }
          }}
          title="책 전체 원고를 읽고 표지용 제목·부제목 후보 생성"
          aria-pressed={titlePickPanelOpen}
          className={`rounded-lg border px-4 py-2 text-sm font-medium ${
            titlePickPanelOpen
              ? "border-emerald-400 bg-emerald-100 text-emerald-950"
              : "border-emerald-200 bg-emerald-50 text-emerald-950 hover:bg-emerald-100"
          }`}
        >
          책 제목뽑기
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
        className="flex min-h-0 min-w-0 flex-1 overflow-x-auto"
        style={{
          ...headingFontCssVariables(displayBook.heading_fonts),
          ...bodyFontCssVariables(displayBook.body_font),
        }}
      >
        <ChapterSidebar
          chapters={displayChapters}
          activeId={activeChapterId}
          activePageId={activePageByChapter[activeChapterId] ?? null}
          bookCoverActive={editorPanel === "book-cover"}
          onSelectBookCover={selectBookCover}
          onOpenChapter={openChapterLocal}
          onSelectPage={selectChapterPage}
          onTogglePageDone={togglePageDone}
          onClearAllPageDone={clearAllPageDone}
          onPageMemoChange={setPageMemo}
          onAdd={addChapter}
          onDelete={(id) => void deleteChapter(id)}
          onPickChapterTitle={openChapterTitlePick}
          onReorder={reorderChapters}
          onPageDragEnd={(pageId, overId, insertPosition) =>
            void movePageByDragOrder(pageId, overId, insertPosition)
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
              coverImageUrl={
                displayBook.cover_path ? coverImageUrl : null
              }
              uploading={coverUploading}
              onCoverChange={(patch) => void updateCoverStyle(patch)}
              onUploadCover={handleUploadCover}
              onRemoveCover={handleRemoveCover}
            />
          ) : activeChapter ? (
            <BookEditor
              ref={editorRef}
              key={`${activeChapter.id}-${chapterEditorKey}`}
              chapterId={activeChapter.id}
              chapterTitle={activeChapter.title}
              bookId={bookId}
              bookTitle={book.title}
              initialContent={activeChapter.content_json}
              initialContentHtml={activeChapter.content_html}
              initialPageId={activePageByChapter[activeChapter.id]}
              onContentChange={updateChapterContent}
              onSave={saveChapterFromEditor}
              savePaused={editorFrozen}
              onSaveState={setSaveState}
              onSaveError={(msg) => setMessage(msg)}
              onChapterTitleChange={(title) =>
                renameChapter(activeChapter.id, title)
              }
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
                body_font: normalizeBookBodyFont(nextBook.body_font),
                ...normalizeBookReaderFields(nextBook),
              }));
              setReaderPitch(
                normalizeBookReaderFields(nextBook).reader_pitch,
              );
              setReaderReport(
                normalizeBookReaderFields(nextBook).reader_analysis,
              );
              setSalesCopyReport(
                normalizeBookReaderFields(nextBook).sales_page_copy,
              );
              dirtyChapterIdsRef.current.clear();
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
        {salesPanelOpen && (
          <SalesPageCopyPanel
            report={salesCopyReport}
            loading={salesLoading}
            error={salesError}
            provider={salesProvider}
            chaptersAnalyzed={salesChaptersAnalyzed}
            onGenerate={() => void runSalesPageCopy()}
          />
        )}
        {titlePickPanelOpen && (
          <BookTitlePickPanel
            currentTitle={book.title}
            currentSubtitle={book.subtitle}
            report={titlePickReport}
            loading={titlePickLoading}
            error={titlePickError}
            provider={titlePickProvider}
            chaptersAnalyzed={titlePickChaptersAnalyzed}
            onGenerate={() => void runBookTitlePick()}
            onApply={(candidate) => void applyBookTitleCandidate(candidate)}
          />
        )}
      </div>
      <ChapterTitlePickDialog
        open={chapterTitlePickChapterId != null}
        chapterLabel={
          chapters.find((c) => c.id === chapterTitlePickChapterId)?.title ??
          "장"
        }
        loading={chapterTitlePickLoading}
        error={chapterTitlePickError}
        provider={chapterTitlePickProvider}
        report={chapterTitlePickReport}
        onClose={closeChapterTitlePick}
        onRegenerate={() => {
          if (chapterTitlePickChapterId) {
            void runChapterTitlePick(chapterTitlePickChapterId);
          }
        }}
        onApply={(candidate) => void applyChapterTitleCandidate(candidate)}
      />
    </div>
  );
}
