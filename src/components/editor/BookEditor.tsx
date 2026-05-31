"use client";

import { ContentPageArticle } from "./ContentPageArticle";
import { QuotePageArticle } from "./QuotePageArticle";
import type { ImageAlignValue } from "./ImageAlignExtension";
import {
  bookChapterTitleClass,
  bookPageBodyClass,
  bookPageClass,
  bookPageContentClass,
  bookPageCoverClass,
  bookPageShellClass,
  BOOK_PAGE_REF_WIDTH,
  syncBookPageMetrics,
} from "@/lib/pages/bookPageCss";
import {
  chapterContentToJson,
  chapterPagesToStorageHtml,
  createPage,
  normalizeContentPageDoc,
  parseChapterContent,
} from "@/lib/pages/content";
import { buildContentPageStorageHtml } from "@/lib/editor/contentPageStorageHtml";
import { contentPageDocToHtml } from "@/lib/editor/pageContentHtml";
import {
  clampEditorPageZoom,
  EDITOR_PAGE_ZOOM_DEFAULT,
  EDITOR_PAGE_ZOOM_MAX,
  EDITOR_PAGE_ZOOM_MIN,
  EDITOR_PAGE_ZOOM_STEP,
  formatEditorPageZoomLabel,
  loadEditorPageZoom,
  saveEditorPageZoom,
} from "@/lib/editor/pageZoom";
import { typographyGuide } from "@/lib/typography/bookStyles";
import type { BookPage, PageKind } from "@/lib/pages/types";
import {
  getPageSubtitle,
  getPageTocLabel,
  pageSubtitleInputValue,
} from "@/lib/pages/pageTitle";
import { quoteContentToHtml } from "@/lib/pages/quotePage";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { SpellcheckPanel } from "./SpellcheckPanel";
import { WritingReviewPanel } from "./WritingReviewPanel";
import { WritingEvaluationPanel } from "./WritingEvaluationPanel";
import type { WritingEvaluationReport } from "@/lib/writingEvaluation/types";
import type { SpellCorrection } from "@/lib/types/database";
import {
  applyCorrectedPlainTextToEditor,
  applyOneCorrectionToEditor,
  applyParagraphAtIndex,
  getEditorPlainText,
  shiftCorrectionsAfterApply,
} from "@/lib/spellcheck/applyToEditor";
import { anchorCorrectionsToText } from "@/lib/spellcheck/localRules";
import {
  clearSpellcheckHighlights,
  focusIssueInEditor,
  syncSpellcheckHighlights,
} from "@/lib/spellcheck/spellcheckMarks";
import {
  buildReviewParagraphs,
  buildReviewParagraphsFromPlain,
  joinAlignedRevisedText,
  deriveReviewHighlights,
  deriveReviewHighlightsFromPlain,
  type ReviewParagraphChunk,
} from "@/lib/writingReview/compare";
import {
  getWritingReviewPlainFromEditor,
  listEditorBlockLines,
} from "@/lib/writingReview/editorBlocks";
import {
  attachNotesToParagraphs,
  type ParagraphNote,
} from "@/lib/writingReview/paragraphNotes";
import { runSpellcheckLocal } from "@/lib/spellcheck/runLocal";
import type { Editor } from "@tiptap/react";
import {
  clearChapterDraft,
  writeChapterDraft,
} from "@/lib/editor/chapterDraftBackup";

type Props = {
  chapterId: string;
  chapterTitle: string;
  bookId: string;
  initialContent: Record<string, unknown>;
  initialContentHtml?: string;
  onContentChange: (
    chapterId: string,
    contentJson: Record<string, unknown>,
    contentHtml: string,
  ) => void;
  onSave: (
    chapterId: string,
    contentJson: Record<string, unknown>,
    contentHtml: string,
  ) => void | Promise<void>;
  onSaveState?: (state: "pending" | "saving" | "saved" | "error") => void;
  onSaveError?: (message: string) => void;
  /** 서버가 더 최신일 때 — 자동 저장·서버 PATCH 중단 */
  savePaused?: boolean;
  initialPageId?: string;
  onActivePageChange?: (pageId: string) => void;
};

export type BookEditorHandle = {
  flushPendingSave: () => Promise<{
    chapterId: string;
    contentJson: Record<string, unknown>;
    contentHtml: string;
    saved: boolean;
  }>;
  /** 장·표지 전환 — 서버 대기 없이 부모 state만 반영, 저장은 백그라운드 */
  commitChapterSnapshot: () => {
    chapterId: string;
    contentJson: Record<string, unknown>;
    contentHtml: string;
  };
  selectPage: (pageId: string) => void;
};

function ToolbarButton({
  active,
  disabled,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-stone-900 text-white"
          : "text-stone-600 hover:bg-stone-100"
      }`}
    >
      {children}
    </button>
  );
}

export const BookEditor = forwardRef<BookEditorHandle, Props>(function BookEditor(
  {
  chapterId,
  chapterTitle,
  bookId,
  initialContent,
  initialContentHtml = "",
  onContentChange,
  onSave,
  onSaveState,
  onSaveError,
  savePaused = false,
  initialPageId,
  onActivePageChange,
  },
  ref,
) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const savePausedRef = useRef(savePaused);
  savePausedRef.current = savePaused;
  const chapterIdRef = useRef(chapterId);
  const bookIdRef = useRef(bookId);
  bookIdRef.current = bookId;
  chapterIdRef.current = chapterId;
  const onSaveRef = useRef(onSave);
  const onContentChangeRef = useRef(onContentChange);
  const onSaveStateRef = useRef(onSaveState);
  const pendingSaveRef = useRef<{
    chapterId: string;
    contentJson: Record<string, unknown>;
    contentHtml: string;
  } | null>(null);
  const editorsRef = useRef<Map<string, Editor | null>>(new Map());
  const shellRef = useRef<HTMLDivElement>(null);
  const zoomHostRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pageZoom, setPageZoom] = useState(EDITOR_PAGE_ZOOM_DEFAULT);
  const pageRefs = useRef<Map<string, HTMLElement>>(new Map());

  const initialPages = parseChapterContent(
    initialContent,
    chapterTitle,
    initialContentHtml,
  ).pages;

  const [pages, setPages] = useState<BookPage[]>(() => initialPages);
  const [activePageId, setActivePageId] = useState(() => {
    if (initialPageId && initialPages.some((p) => p.id === initialPageId)) {
      return initialPageId;
    }
    return (
      initialPages.find((p) => p.kind === "chapter-cover")?.id ??
      initialPages.find((p) => p.kind === "content")?.id ??
      initialPages[0]?.id ??
      ""
    );
  });
  const [, setToolbarTick] = useState(0);

  const [spellOpen, setSpellOpen] = useState(false);
  const [spellLoading, setSpellLoading] = useState(false);
  const [corrections, setCorrections] = useState<SpellCorrection[]>([]);
  const [correctedText, setCorrectedText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [scannedLength, setScannedLength] = useState(0);
  const [spellError, setSpellError] = useState<string | null>(null);
  const [spellProvider, setSpellProvider] = useState<string | null>(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewProvider, setReviewProvider] = useState<string | null>(null);
  const [reviewOriginal, setReviewOriginal] = useState("");
  const [reviewRevised, setReviewRevised] = useState("");
  const [reviewSummary, setReviewSummary] = useState("");
  const [reviewScannedLength, setReviewScannedLength] = useState(0);
  const [reviewParagraphs, setReviewParagraphs] = useState<
    ReviewParagraphChunk[]
  >([]);
  const [reviewHighlights, setReviewHighlights] = useState<SpellCorrection[]>(
    [],
  );
  const [reviewAppliedParagraphs, setReviewAppliedParagraphs] = useState<
    Set<number>
  >(new Set());
  const [reviewAlignWarning, setReviewAlignWarning] = useState<string | null>(
    null,
  );
  const [reviewParagraphNotes, setReviewParagraphNotes] = useState<
    ParagraphNote[]
  >([]);

  const [evalOpen, setEvalOpen] = useState(false);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [evalWarning, setEvalWarning] = useState<string | null>(null);
  const [evalProvider, setEvalProvider] = useState<string | null>(null);
  const [evalReport, setEvalReport] = useState<WritingEvaluationReport | null>(
    null,
  );
  const [evalScannedLength, setEvalScannedLength] = useState(0);
  const [reviewHasResult, setReviewHasResult] = useState(false);
  const [evalHasResult, setEvalHasResult] = useState(false);

  const reviewCacheRef = useRef(
    new Map<
      string,
      {
        original: string;
        revised: string;
        summary: string;
        paragraphs: ReviewParagraphChunk[];
        highlights: SpellCorrection[];
        appliedParagraphs: number[];
        paragraphNotes: ParagraphNote[];
        provider: string | null;
        alignWarning: string | null;
        error: string | null;
        scannedLength: number;
      }
    >(),
  );
  const evalCacheRef = useRef(
    new Map<
      string,
      {
        report: WritingEvaluationReport | null;
        provider: string | null;
        warning: string | null;
        error: string | null;
        scannedLength: number;
        pageSubtitle: string;
      }
    >(),
  );
  const reviewPanelPageIdRef = useRef<string | null>(null);
  const evalPanelPageIdRef = useRef<string | null>(null);

  const activeEditor = editorsRef.current.get(activePageId) ?? null;
  const sidePanelOpen = reviewOpen || evalOpen;

  const saveReviewCache = useCallback(
    (pageId: string | null) => {
      if (!pageId) return;
      reviewCacheRef.current.set(pageId, {
        original: reviewOriginal,
        revised: reviewRevised,
        summary: reviewSummary,
        paragraphs: reviewParagraphs,
        highlights: reviewHighlights,
        appliedParagraphs: [...reviewAppliedParagraphs],
        paragraphNotes: reviewParagraphNotes,
        provider: reviewProvider,
        alignWarning: reviewAlignWarning,
        error: reviewError,
        scannedLength: reviewScannedLength,
      });
    },
    [
      reviewOriginal,
      reviewRevised,
      reviewSummary,
      reviewParagraphs,
      reviewHighlights,
      reviewAppliedParagraphs,
      reviewParagraphNotes,
      reviewProvider,
      reviewAlignWarning,
      reviewError,
      reviewScannedLength,
    ],
  );

  const loadReviewCache = useCallback(
    (pageId: string, editor: Editor | null) => {
      const cached = reviewCacheRef.current.get(pageId);
      if (!cached) {
        setReviewOriginal("");
        setReviewRevised("");
        setReviewSummary("");
        setReviewParagraphs([]);
        setReviewHighlights([]);
        setReviewAppliedParagraphs(new Set());
        setReviewAlignWarning(null);
        setReviewParagraphNotes([]);
        setReviewError(null);
        setReviewProvider(null);
        setReviewScannedLength(0);
        setReviewHasResult(false);
        clearSpellcheckHighlights(editor);
        return;
      }
      setReviewOriginal(cached.original);
      setReviewRevised(cached.revised);
      setReviewSummary(cached.summary);
      setReviewParagraphs(cached.paragraphs);
      setReviewHighlights(cached.highlights);
      setReviewAppliedParagraphs(new Set(cached.appliedParagraphs));
      setReviewAlignWarning(cached.alignWarning);
      setReviewParagraphNotes(cached.paragraphNotes);
      setReviewError(cached.error);
      setReviewProvider(cached.provider);
      setReviewScannedLength(cached.scannedLength);
      setReviewHasResult(true);
      if (editor && cached.highlights.length > 0) {
        syncSpellcheckHighlights(editor, cached.highlights, "review");
      } else {
        clearSpellcheckHighlights(editor);
      }
    },
    [],
  );

  const saveEvalCache = useCallback(
    (pageId: string | null, pageSubtitle: string) => {
      if (!pageId) return;
      evalCacheRef.current.set(pageId, {
        report: evalReport,
        provider: evalProvider,
        warning: evalWarning,
        error: evalError,
        scannedLength: evalScannedLength,
        pageSubtitle,
      });
    },
    [evalReport, evalProvider, evalWarning, evalError, evalScannedLength],
  );

  const loadEvalCache = useCallback((pageId: string) => {
    const cached = evalCacheRef.current.get(pageId);
    if (!cached) {
      setEvalReport(null);
      setEvalError(null);
      setEvalWarning(null);
      setEvalProvider(null);
      setEvalScannedLength(0);
      setEvalHasResult(false);
      return;
    }
    setEvalReport(cached.report);
    setEvalError(cached.error);
    setEvalWarning(cached.warning);
    setEvalProvider(cached.provider);
    setEvalScannedLength(cached.scannedLength);
    setEvalHasResult(true);
  }, []);

  const closeWritingEvaluation = useCallback(
    (pageSubtitle = "") => {
      saveEvalCache(evalPanelPageIdRef.current, pageSubtitle);
      setEvalOpen(false);
    },
    [saveEvalCache],
  );

  const closeWritingReview = useCallback(() => {
    saveReviewCache(reviewPanelPageIdRef.current);
    clearSpellcheckHighlights(activeEditor);
    setReviewOpen(false);
  }, [activeEditor, saveReviewCache]);

  const refreshReviewDiff = useCallback(
    (
      original: string,
      revised: string,
      editor: Editor | null,
      notes: ParagraphNote[] = [],
    ) => {
      if (editor) {
        const blocks = listEditorBlockLines(editor);
        const { paragraphs, meta } = buildReviewParagraphs(blocks, revised);
        const withNotes = attachNotesToParagraphs(paragraphs, notes);
        setReviewParagraphs(withNotes);
        setReviewAlignWarning((prev) => meta.warning ?? prev);
        setReviewHighlights(
          anchorCorrectionsToText(
            original,
            deriveReviewHighlights(blocks, withNotes),
          ),
        );
        return;
      }
      const { paragraphs, meta } = buildReviewParagraphsFromPlain(
        original,
        revised,
      );
      const withNotes = attachNotesToParagraphs(paragraphs, notes);
      setReviewParagraphs(withNotes);
      setReviewAlignWarning((prev) => meta.warning ?? prev);
      setReviewHighlights(
        anchorCorrectionsToText(
          original,
          deriveReviewHighlightsFromPlain(original, withNotes),
        ),
      );
    },
    [],
  );

  const closeSpellcheck = useCallback(() => {
    clearSpellcheckHighlights(activeEditor);
    setSpellOpen(false);
    setCorrections([]);
    setCorrectedText("");
  }, [activeEditor]);

  useEffect(() => {
    const editor = activeEditor;
    if (!editor) return;

    editor.storage.spellcheckHighlight.onApplied = (correction, flash) => {
      if (spellOpen) {
        setCorrections((prev) => {
          const next = shiftCorrectionsAfterApply(prev, correction);
          syncSpellcheckHighlights(editor, next, "spellcheck");
          editor.commands.flashSpellcheckRange(flash);
          window.setTimeout(() => {
            if (!editor.isDestroyed) {
              editor.commands.clearSpellcheckFlash();
            }
          }, 900);
          return next;
        });
      }
    };

    return () => {
      editor.storage.spellcheckHighlight.onApplied = undefined;
    };
  }, [activeEditor, spellOpen]);

  useEffect(() => {
    if (!activeEditor || !spellOpen || spellLoading) return;
    syncSpellcheckHighlights(activeEditor, corrections, "spellcheck");
  }, [activeEditor, corrections, spellOpen, spellLoading]);

  useEffect(() => {
    if (!activeEditor || !reviewOpen || reviewLoading) return;
    syncSpellcheckHighlights(activeEditor, reviewHighlights, "review");
  }, [activeEditor, reviewHighlights, reviewOpen, reviewLoading]);

  useEffect(() => {
    if (!spellOpen && !reviewOpen) return;
    return () => clearSpellcheckHighlights(activeEditor);
  }, [activePageId, spellOpen, reviewOpen, activeEditor]);

  onSaveRef.current = onSave;
  onContentChangeRef.current = onContentChange;
  onSaveStateRef.current = onSaveState;
  const onSaveErrorRef = useRef(onSaveError);
  onSaveErrorRef.current = onSaveError;

  const snapshotEditorPage = useCallback(
    (pageId: string) => {
      const editor = editorsRef.current.get(pageId);
      const page = pagesRef.current.find((p) => p.id === pageId);
      if (!editor || page?.kind !== "content") return null;

      const json = normalizeContentPageDoc(
        editor.getJSON() as Record<string, unknown>,
      );
      return {
        json,
        html: contentPageDocToHtml(json),
      };
    },
    [],
  );

  const buildSavePayload = useCallback(() => {
    const fromId = activePageIdRef.current;
    const snap = snapshotEditorPage(fromId);
    let nextPages = pagesRef.current;
    if (snap) {
      nextPages = nextPages.map((p) =>
        p.id === fromId
          ? {
              ...p,
              content: snap.json,
              content_html: buildContentPageStorageHtml({
                ...p,
                content: snap.json,
              } as BookPage),
            }
          : p,
      );
      pagesRef.current = nextPages;
      setPages(nextPages);
    }

    nextPages = nextPages.map((p) =>
      p.kind === "content"
        ? { ...p, content_html: buildContentPageStorageHtml(p) }
        : p,
    );
    pagesRef.current = nextPages;

    const json = chapterContentToJson(nextPages) as unknown as Record<
      string,
      unknown
    >;
    const html = chapterPagesToStorageHtml(nextPages);
    return {
      chapterId: chapterIdRef.current,
      contentJson: json,
      contentHtml: html,
    };
  }, [snapshotEditorPage]);

  const flushSave = useCallback(async (): Promise<boolean> => {
    saveTimer.current = null;
    const pending = pendingSaveRef.current;
    if (!pending) return true;
    if (saveInFlightRef.current) return false;

    if (savePausedRef.current) {
      onSaveStateRef.current?.("error");
      onSaveErrorRef.current?.(
        "다른 곳에서 더 최근에 저장된 내용이 있어 서버 저장이 중단되었습니다. 상단 안내를 확인하세요.",
      );
      return false;
    }

    const payload = { ...pending };
    pendingSaveRef.current = null;
    saveInFlightRef.current = true;
    onSaveStateRef.current?.("saving");

    try {
      await onSaveRef.current(
        payload.chapterId,
        payload.contentJson,
        payload.contentHtml,
      );
      onSaveStateRef.current?.("saved");
      clearChapterDraft(bookIdRef.current, payload.chapterId);
      return true;
    } catch (err) {
      pendingSaveRef.current = payload;
      onSaveStateRef.current?.("error");
      const msg =
        err instanceof Error ? err.message : "저장에 실패했습니다.";
      let detail = msg;
      if (/401|Unauthorized/i.test(msg)) {
        detail = "로그인이 만료되었습니다. 다시 로그인해 주세요.";
      }
      onSaveErrorRef.current?.(detail);
      writeChapterDraft({
        bookId: bookIdRef.current,
        chapterId: payload.chapterId,
        contentJson: payload.contentJson,
        contentHtml: payload.contentHtml,
        savedAt: Date.now(),
      });
      return false;
    } finally {
      saveInFlightRef.current = false;
      if (pendingSaveRef.current) {
        saveTimer.current = setTimeout(() => {
          void flushSave();
        }, 400);
      }
    }
  }, []);

  const flushPendingSave = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    const payload = buildSavePayload();
    pendingSaveRef.current = payload;
    onContentChangeRef.current(
      payload.chapterId,
      payload.contentJson,
      payload.contentHtml,
    );
    const saved = await flushSave();
    return { ...payload, saved };
  }, [buildSavePayload, flushSave]);

  const onActivePageChangeRef = useRef(onActivePageChange);
  onActivePageChangeRef.current = onActivePageChange;

  const persist = useCallback(
    (nextPages: BookPage[]) => {
      const json = chapterContentToJson(nextPages) as unknown as Record<
        string,
        unknown
      >;
      const html = chapterPagesToStorageHtml(nextPages);
      pendingSaveRef.current = {
        chapterId: chapterIdRef.current,
        contentJson: json,
        contentHtml: html,
      };
      onContentChangeRef.current(chapterIdRef.current, json, html);
      onSaveStateRef.current?.("pending");
      writeChapterDraft({
        bookId: bookIdRef.current,
        chapterId: chapterIdRef.current,
        contentJson: json,
        contentHtml: html,
        savedAt: Date.now(),
      });

      if (savePausedRef.current) {
        onSaveStateRef.current?.("error");
        return;
      }

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void flushSave();
      }, 1200);
    },
    [flushSave],
  );

  const handlePageUpdate = useCallback(
    (pageId: string, json: Record<string, unknown>) => {
      const normalized = normalizeContentPageDoc(json);
      setPages((prev) => {
        const next = prev.map((p) =>
          p.id === pageId
            ? {
                ...p,
                content: normalized,
                content_html: buildContentPageStorageHtml({
                  ...p,
                  content: normalized,
                } as BookPage),
              }
            : p,
        );
        queueMicrotask(() => persist(next));
        return next;
      });
    },
    [persist],
  );

  const handlePageTitleChange = useCallback(
    (pageId: string, title: string) => {
      setPages((prev) => {
        const next = prev.map((p) => (p.id === pageId ? { ...p, title } : p));
        queueMicrotask(() => persist(next));
        return next;
      });
    },
    [persist],
  );

  const handleQuoteUpdate = useCallback(
    (pageId: string, quote: string, source: string) => {
      const content = { type: "quote" as const, quote, source };
      const html = quoteContentToHtml(quote, source);
      setPages((prev) => {
        const next = prev.map((p) =>
          p.id === pageId ? { ...p, content, content_html: html } : p,
        );
        queueMicrotask(() => persist(next));
        return next;
      });
    },
    [persist],
  );

  const registerEditor = useCallback(
    (pageId: string, editor: Editor | null) => {
      editorsRef.current.set(pageId, editor);
      if (editor) {
        const bump = () => setToolbarTick((n) => n + 1);
        editor.on("selectionUpdate", bump);
        editor.on("transaction", bump);
      }
    },
    [],
  );

  useEffect(() => {
    setPageZoom(loadEditorPageZoom());
  }, []);

  const applyPageZoom = useCallback((next: number) => {
    const z = clampEditorPageZoom(next);
    setPageZoom(z);
    saveEditorPageZoom(z);
  }, []);

  /** 스크롤 영역 너비 기준 — shell 실측×줌은 페이지마다 폭이 줄어드는 버그 유발 */
  const syncEditorPageZoomLayout = useCallback(() => {
    const scroll = scrollRef.current;
    const shell = shellRef.current;
    const host = zoomHostRef.current;
    if (!scroll || !shell || !host) return;

    const padPx = 48;
    const maxPagePx =
      typeof window !== "undefined"
        ? Math.min(
            672,
            Math.round(
              parseFloat(
                getComputedStyle(document.documentElement).fontSize || "16",
              ) * 42,
            ),
          )
        : 672;
    const baseW = Math.min(
      maxPagePx,
      Math.max(280, scroll.clientWidth - padPx),
    );

    shell.style.width = `${baseW}px`;
    shell.style.maxWidth = BOOK_PAGE_REF_WIDTH;
    shell.style.transform = "";
    shell.style.transformOrigin = "";
    syncBookPageMetrics(shell);

    if (pageZoom === 1) {
      host.style.zoom = "";
    } else {
      host.style.zoom = String(pageZoom);
    }
    host.style.width = "";
    host.style.minHeight = "";
  }, [pageZoom]);

  useEffect(() => {
    syncEditorPageZoomLayout();
    const scroll = scrollRef.current;
    if (!scroll) return;

    const ro = new ResizeObserver(() => syncEditorPageZoomLayout());
    ro.observe(scroll);

    const t0 = window.setTimeout(syncEditorPageZoomLayout, 0);
    const t1 = window.setTimeout(syncEditorPageZoomLayout, 120);

    return () => {
      ro.disconnect();
      window.clearTimeout(t0);
      window.clearTimeout(t1);
    };
  }, [syncEditorPageZoomLayout, activePageId, sidePanelOpen]);

  const handlePageZoomWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -EDITOR_PAGE_ZOOM_STEP : EDITOR_PAGE_ZOOM_STEP;
      applyPageZoom(pageZoom + delta);
    },
    [applyPageZoom, pageZoom],
  );

  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      if (pendingSaveRef.current) {
        void flushSave().catch(() => {});
      }
    };
  }, [flushSave]);

  const activePageIdRef = useRef(activePageId);
  activePageIdRef.current = activePageId;

  const selectPage = useCallback(
    (pageId: string) => {
      const fromId = activePageIdRef.current;

      if (fromId !== pageId) {
        const snap = snapshotEditorPage(fromId);
        if (snap) {
          setPages((prev) => {
            const next = prev.map((p) =>
              p.id === fromId
                ? { ...p, content: snap.json, content_html: snap.html }
                : p,
            );
            queueMicrotask(() => persist(next));
            return next;
          });
        }
      }

      setActivePageId(pageId);
      pageRefs.current.clear();
      scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    },
    [persist, snapshotEditorPage],
  );

  const selectPageRef = useRef(selectPage);
  selectPageRef.current = selectPage;

  useEffect(() => {
    onActivePageChangeRef.current?.(activePageId);
  }, [activePageId]);

  const commitChapterSnapshot = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    const payload = buildSavePayload();
    pendingSaveRef.current = payload;
    onContentChangeRef.current(
      payload.chapterId,
      payload.contentJson,
      payload.contentHtml,
    );
    onSaveStateRef.current?.("pending");
    writeChapterDraft({
      bookId: bookIdRef.current,
      chapterId: payload.chapterId,
      contentJson: payload.contentJson,
      contentHtml: payload.contentHtml,
      savedAt: Date.now(),
    });
    saveTimer.current = setTimeout(() => {
      void flushSave();
    }, 800);

    return payload;
  }, [buildSavePayload, flushSave]);

  useImperativeHandle(
    ref,
    () => ({
      flushPendingSave,
      commitChapterSnapshot,
      selectPage: (pageId: string) => {
        selectPageRef.current(pageId);
      },
    }),
    [commitChapterSnapshot, flushPendingSave],
  );

  const addPage = (kind: Extract<PageKind, "content" | "quote">) => {
    const page = createPage(kind);
    setPages((prev) => {
      const next = [...prev, page];
      queueMicrotask(() => persist(next));
      return next;
    });
    requestAnimationFrame(() => {
      selectPage(page.id);
    });
  };

  const deletePage = (pageId: string) => {
    const target = pages.find((p) => p.id === pageId);
    if (!target || target.kind === "chapter-cover") return;

    setPages((prev) => {
      const next = prev.filter((p) => p.id !== pageId);
      queueMicrotask(() => persist(next));
      return next;
    });
    if (activePageId === pageId) {
      const idx = pages.findIndex((p) => p.id === pageId);
      const fallback = pages[idx + 1] ?? pages[idx - 1];
      if (fallback) {
        requestAnimationFrame(() => {
          selectPage(fallback.id);
        });
      }
    }
  };

  const uploadImage = useCallback(async () => {
    const editor = activeEditor;
    if (!editor) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("bookId", bookId);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        editor
          .chain()
          .focus()
          .setImage({ src: data.url })
          .updateAttributes("image", { align: "center" })
          .run();
      }
    };
    input.click();
  }, [activeEditor, bookId]);

  const runWritingReview = useCallback(async () => {
    const editor = activeEditor;
    if (!editor) return;
    const { plain: text, blocks } = getWritingReviewPlainFromEditor(editor);
    setReviewOriginal(text);
    setReviewScannedLength(text.length);
    setReviewLoading(true);
    setReviewError(null);
    setReviewProvider(null);
    setReviewRevised("");
    setReviewSummary("");
    setReviewParagraphs([]);
    setReviewHighlights([]);
    setReviewAppliedParagraphs(new Set());
    setReviewAlignWarning(null);
    setReviewParagraphNotes([]);
    clearSpellcheckHighlights(editor);

    try {
      const res = await fetch("/api/writing-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (!res.ok) {
        setReviewError(data.error ?? "글검사에 실패했습니다.");
        setReviewRevised(text);
        setReviewHasResult(true);
        reviewPanelPageIdRef.current = activePageId;
        saveReviewCache(activePageId);
        return;
      }

      const revisedRaw = data.revisedText ?? text;
      const revised = joinAlignedRevisedText(blocks, revisedRaw);
      setReviewRevised(revised);
      setReviewSummary(data.summary ?? "");
      setReviewProvider(data.provider ?? null);
      const notes = data.paragraphNotes ?? [];
      setReviewParagraphNotes(notes);
      if (data.warning) {
        setReviewAlignWarning(data.warning);
      }
      refreshReviewDiff(text, revised, editor, notes);
      setReviewHasResult(true);
      reviewPanelPageIdRef.current = activePageId;
      saveReviewCache(activePageId);
    } catch {
      setReviewError("네트워크 오류로 글검사에 실패했습니다.");
      setReviewRevised(text);
      setReviewHasResult(true);
      saveReviewCache(activePageId);
    } finally {
      setReviewLoading(false);
    }
  }, [activeEditor, activePageId, refreshReviewDiff, saveReviewCache]);

  const applyWritingReview = useCallback(() => {
    const editor = activeEditor;
    if (!editor || !reviewRevised) return;
    for (const para of reviewParagraphs) {
      if (!para.changed || reviewAppliedParagraphs.has(para.blockIndex)) {
        continue;
      }
      applyParagraphAtIndex(editor, para.blockIndex, para.revised);
    }
    const plain = getEditorPlainText(editor);
    refreshReviewDiff(plain, reviewRevised, editor);
    setReviewAppliedParagraphs(
      new Set(
        reviewParagraphs.filter((p) => p.changed).map((p) => p.blockIndex),
      ),
    );
    saveReviewCache(activePageId);
  }, [
    activeEditor,
    activePageId,
    reviewRevised,
    reviewParagraphs,
    reviewAppliedParagraphs,
    reviewParagraphNotes,
    refreshReviewDiff,
    saveReviewCache,
  ]);

  const applyReviewParagraph = useCallback(
    (chunk: ReviewParagraphChunk) => {
      const editor = activeEditor;
      if (!editor || !chunk.changed) return;
      const ok = applyParagraphAtIndex(editor, chunk.blockIndex, chunk.revised);
      if (!ok) {
        alert("이 문단을 교체하지 못했습니다.");
        return;
      }
      setReviewAppliedParagraphs((prev) => new Set(prev).add(chunk.blockIndex));
      const plain = getEditorPlainText(editor);
      refreshReviewDiff(plain, reviewRevised, editor, reviewParagraphNotes);
      saveReviewCache(activePageId);
    },
    [
      activeEditor,
      activePageId,
      reviewRevised,
      reviewParagraphNotes,
      refreshReviewDiff,
      saveReviewCache,
    ],
  );

  const focusReviewParagraph = useCallback(
    (chunk: ReviewParagraphChunk) => {
      const editor = activeEditor;
      if (!editor) return;
      const blocks = listEditorBlockLines(editor);
      const block = blocks.find((b) => b.blockIndex === chunk.blockIndex);
      const line = block?.text ?? chunk.original;
      if (!line) return;
      focusIssueInEditor(editor, {
        from: line,
        to: line,
        reason: "글검사",
        offset: block?.start ?? 0,
      });
    },
    [activeEditor],
  );

  const applySpellcheckResult = useCallback(
    (
      editor: Editor,
      text: string,
      data: {
        corrections?: SpellCorrection[];
        correctedText?: string;
        provider?: string | null;
        warning?: string | null;
      },
    ) => {
      const corrections = data.corrections ?? [];
      setCorrections(corrections);
      setCorrectedText(data.correctedText ?? text);
      setSpellProvider(data.provider ?? "local");
      setSpellError(data.warning ?? null);
      syncSpellcheckHighlights(editor, corrections);
    },
    [],
  );

  const runSpellcheck = useCallback(async () => {
    const editor = activeEditor;
    if (!editor) return;
    const text = getEditorPlainText(editor);
    setOriginalText(text);
    setScannedLength(text.length);
    if (reviewOpen) {
      saveReviewCache(reviewPanelPageIdRef.current);
      clearSpellcheckHighlights(editor);
    }
    if (evalOpen) {
      const evalPageId = evalPanelPageIdRef.current ?? activePageId;
      const evalPage = pages.find((p) => p.id === evalPageId);
      let evalSubtitle = "";
      if (evalPage?.kind === "content") {
        const idx = pages
          .filter((p) => p.kind === "content")
          .findIndex((p) => p.id === evalPage.id);
        evalSubtitle =
          getPageSubtitle(evalPage) ||
          getPageTocLabel(evalPage, idx >= 0 ? idx : 0);
      } else if (evalPage) {
        evalSubtitle = evalPage.title ?? "";
      }
      saveEvalCache(evalPageId, evalSubtitle);
    }
    setReviewOpen(false);
    setEvalOpen(false);
    setSpellOpen(true);
    setSpellLoading(true);
    setSpellError(null);
    setSpellProvider(null);
    setCorrections([]);
    syncSpellcheckHighlights(editor, []);

    try {
      const res = await fetch("/api/spellcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, ai: true }),
      });
      const data = await res.json();

      if (!res.ok) {
        const local = runSpellcheckLocal(text);
        applySpellcheckResult(editor, text, local);
        setSpellError(
          `${data.error ?? "맞춤법 검사에 실패했습니다."} · 보조 목록만 표시합니다.`,
        );
        return;
      }

      applySpellcheckResult(editor, text, data);
    } catch {
      const local = runSpellcheckLocal(text);
      applySpellcheckResult(editor, text, local);
      setSpellError(
        "네트워크 오류 · 보조 목록만 표시합니다.",
      );
    } finally {
      setSpellLoading(false);
    }
  }, [
    activeEditor,
    activePageId,
    pages,
    reviewOpen,
    evalOpen,
    applySpellcheckResult,
    saveReviewCache,
    saveEvalCache,
  ]);

  const applyAllCorrections = useCallback(() => {
    const editor = activeEditor;
    if (!editor || !correctedText) return;

    let ok = applyCorrectedPlainTextToEditor(editor, correctedText);
    if (!ok && corrections.length > 0) {
      const sorted = [...corrections].sort((a, b) => b.offset - a.offset);
      ok = sorted.every((c) => applyOneCorrectionToEditor(editor, c));
    }
    if (!ok) {
      alert("교정본을 적용하지 못했습니다. 맞춤법 검사를 다시 실행해 주세요.");
      return;
    }
    clearSpellcheckHighlights(activeEditor);
    setSpellOpen(false);
    setCorrections([]);
    setCorrectedText("");
  }, [activeEditor, correctedText, corrections]);

  const imageSelected = activeEditor?.isActive("image") ?? false;
  const imageAlign =
    (activeEditor?.getAttributes("image").align as ImageAlignValue | undefined) ??
    "center";

  const setImageAlign = (align: ImageAlignValue) => {
    activeEditor?.chain().focus().updateAttributes("image", { align }).run();
  };

  const contentPageIndex = (id: string) =>
    pages.filter((p) => p.kind === "content").findIndex((p) => p.id === id);

  const activePage = pages.find((p) => p.id === activePageId);
  const isContentPageActive = activePage?.kind === "content";
  const activeContentPageIndex = activePage
    ? pages.filter((p) => p.kind === "content").findIndex((p) => p.id === activePage.id)
    : -1;
  const activePageTitleValue =
    activePage?.kind === "content"
      ? pageSubtitleInputValue(activePage)
      : (activePage?.title ?? "");
  const activePageTitlePlaceholder =
    activePage && activePage.kind !== "chapter-cover"
      ? getPageTocLabel(
          activePage,
          activeContentPageIndex >= 0 ? activeContentPageIndex : 0,
        )
      : "";

  const pageSubtitleFor = useCallback((page: BookPage | undefined) => {
    if (!page || page.kind === "chapter-cover") return "";
    if (page.kind === "content") return getPageSubtitle(page);
    return page.title ?? "";
  }, []);

  const toggleWritingReviewPanel = useCallback(() => {
    if (reviewOpen) {
      closeWritingReview();
      return;
    }
    closeWritingEvaluation(activePageTitleValue);
    setSpellOpen(false);
    setEvalOpen(false);
    setReviewOpen(true);
    reviewPanelPageIdRef.current = activePageId;
    loadReviewCache(activePageId, activeEditor);
  }, [
    reviewOpen,
    activePageId,
    activePageTitleValue,
    activeEditor,
    closeWritingReview,
    closeWritingEvaluation,
    loadReviewCache,
  ]);

  const toggleWritingEvaluationPanel = useCallback(() => {
    if (evalOpen) {
      closeWritingEvaluation(activePageTitleValue);
      return;
    }
    setSpellOpen(false);
    closeWritingReview();
    setEvalOpen(true);
    evalPanelPageIdRef.current = activePageId;
    loadEvalCache(activePageId);
  }, [
    evalOpen,
    activePageId,
    activePageTitleValue,
    closeWritingEvaluation,
    closeWritingReview,
    loadEvalCache,
  ]);

  const prevActivePageIdForPanelsRef = useRef(activePageId);
  useEffect(() => {
    const prev = prevActivePageIdForPanelsRef.current;
    if (prev === activePageId) return;
    prevActivePageIdForPanelsRef.current = activePageId;

    const prevPage = pages.find((p) => p.id === prev);
    if (reviewOpen && reviewPanelPageIdRef.current === prev) {
      saveReviewCache(prev);
    }
    if (evalOpen && evalPanelPageIdRef.current === prev) {
      saveEvalCache(prev, pageSubtitleFor(prevPage));
    }

    const nextEditor = editorsRef.current.get(activePageId) ?? null;
    if (reviewOpen) {
      reviewPanelPageIdRef.current = activePageId;
      loadReviewCache(activePageId, nextEditor);
    }
    if (evalOpen) {
      evalPanelPageIdRef.current = activePageId;
      loadEvalCache(activePageId);
    }
  }, [
    activePageId,
    pages,
    reviewOpen,
    evalOpen,
    saveReviewCache,
    saveEvalCache,
    loadReviewCache,
    loadEvalCache,
    pageSubtitleFor,
  ]);

  const runWritingEvaluation = useCallback(async () => {
    const editor = activeEditor;
    if (!editor || activePage?.kind !== "content") return;
    const text = getEditorPlainText(editor);
    const pageSubtitle = activePageTitleValue;

    setEvalScannedLength(text.length);
    setEvalLoading(true);
    setEvalError(null);
    setEvalWarning(null);
    setEvalProvider(null);
    setEvalReport(null);

    try {
      const res = await fetch("/api/writing-evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, pageSubtitle }),
      });
      const data = await res.json();

      if (!res.ok) {
        setEvalError(data.error ?? "글평가에 실패했습니다.");
        setEvalHasResult(true);
        evalPanelPageIdRef.current = activePageId;
        saveEvalCache(activePageId, pageSubtitle);
        return;
      }

      setEvalReport(data.report ?? null);
      setEvalProvider(data.provider ?? null);
      setEvalWarning(data.warning ?? null);
      setEvalHasResult(true);
      evalPanelPageIdRef.current = activePageId;
      saveEvalCache(activePageId, pageSubtitle);
    } catch {
      setEvalError("네트워크 오류로 글평가에 실패했습니다.");
      setEvalHasResult(true);
      saveEvalCache(activePageId, pageSubtitle);
    } finally {
      setEvalLoading(false);
    }
  }, [
    activeEditor,
    activePage,
    activePageId,
    activePageTitleValue,
    saveEvalCache,
  ]);

  const canDeletePage = (page: BookPage) => page.kind !== "chapter-cover";

  const requestDeletePage = (pageId: string) => {
    const target = pages.find((p) => p.id === pageId);
    if (!target || !canDeletePage(target)) return;

    const contentIdx = pages
      .filter((p) => p.kind === "content")
      .findIndex((p) => p.id === pageId);
    const label = getPageTocLabel(target, contentIdx >= 0 ? contentIdx : 0);

    const message =
      target.kind === "quote"
        ? `「${label}」 명언 페이지를 삭제할까요?\n\n되돌릴 수 없습니다.`
        : `「${label}」 페이지를 삭제할까요?\n\n내용이 모두 지워지며 되돌릴 수 없습니다.`;

    if (!window.confirm(message)) return;
    deletePage(pageId);
  };

  const pageTabLabel = (page: BookPage) => {
    if (page.kind === "quote") return "명";
    return String(contentPageIndex(page.id) + 1);
  };

  const tabPages = pages.filter((p) => p.kind !== "chapter-cover");

  const activePageIndex = pages.findIndex((p) => p.id === activePageId);
  const goAdjacentPage = (delta: -1 | 1) => {
    const next = pages[activePageIndex + delta];
    if (next) selectPage(next.id);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    const page = pagesRef.current.find((p) => p.id === activePageId);
    if (page?.kind !== "content") return;
    const t = window.setTimeout(() => {
      editorsRef.current.get(activePageId)?.commands.focus("end", {
        scrollIntoView: false,
      });
    }, 0);
    return () => window.clearTimeout(t);
  }, [chapterId, activePageId]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-stone-200 bg-white px-4 py-2">
        <ToolbarButton
          active={activeEditor?.isActive("heading", { level: 2 })}
          disabled={!isContentPageActive}
          onClick={() =>
            activeEditor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
          title="중제목"
        >
          중제목
        </ToolbarButton>
        <ToolbarButton
          active={activeEditor?.isActive("heading", { level: 3 })}
          disabled={!isContentPageActive}
          onClick={() =>
            activeEditor?.chain().focus().toggleHeading({ level: 3 }).run()
          }
          title="소제목"
        >
          소제목
        </ToolbarButton>
        <ToolbarButton
          active={activeEditor?.isActive("paragraph")}
          disabled={!isContentPageActive}
          onClick={() => activeEditor?.chain().focus().setParagraph().run()}
          title={typographyGuide.p}
        >
          본문
        </ToolbarButton>
        <ToolbarButton
          disabled={!activeEditor?.can().undo()}
          onClick={() => activeEditor?.chain().focus().undo().run()}
          title="실행 취소 (⌘Z)"
        >
          실행취소
        </ToolbarButton>
        <ToolbarButton
          disabled={!activeEditor?.can().redo()}
          onClick={() => activeEditor?.chain().focus().redo().run()}
          title="다시 실행 (⌘⇧Z)"
        >
          다시실행
        </ToolbarButton>
        <ToolbarButton
          active={activeEditor?.isActive("bold")}
          disabled={!isContentPageActive}
          onClick={() => activeEditor?.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          active={activeEditor?.isActive("italic")}
          disabled={!isContentPageActive}
          onClick={() => activeEditor?.chain().focus().toggleItalic().run()}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          active={activeEditor?.isActive("underline")}
          disabled={!isContentPageActive}
          onClick={() => activeEditor?.chain().focus().toggleUnderline().run()}
        >
          U
        </ToolbarButton>
        <ToolbarButton disabled={!isContentPageActive} onClick={uploadImage}>
          이미지
        </ToolbarButton>
        {imageSelected && isContentPageActive && (
          <>
            <span className="mx-1 text-xs text-stone-400">|</span>
            <ToolbarButton
              active={imageAlign === "left"}
              onClick={() => setImageAlign("left")}
            >
              ◧
            </ToolbarButton>
            <ToolbarButton
              active={imageAlign === "center"}
              onClick={() => setImageAlign("center")}
            >
              ▣
            </ToolbarButton>
            <ToolbarButton
              active={imageAlign === "right"}
              onClick={() => setImageAlign("right")}
            >
              ◨
            </ToolbarButton>
          </>
        )}
        <ToolbarButton
          disabled={!isContentPageActive}
          onClick={() => activeEditor?.chain().focus().toggleBlockquote().run()}
        >
          인용
        </ToolbarButton>
        <ToolbarButton
          disabled={!isContentPageActive}
          onClick={() => activeEditor?.chain().focus().setHorizontalRule().run()}
        >
          구분선
        </ToolbarButton>
        <div className="flex-1" />
        <ToolbarButton
          disabled={!isContentPageActive}
          active={evalOpen}
          onClick={toggleWritingEvaluationPanel}
        >
          글평가
        </ToolbarButton>
        <ToolbarButton
          disabled={!isContentPageActive}
          active={reviewOpen}
          onClick={toggleWritingReviewPanel}
        >
          글검사
        </ToolbarButton>
        <ToolbarButton disabled={!isContentPageActive} onClick={runSpellcheck}>
          맞춤법
        </ToolbarButton>
      </div>

      <div className="border-b border-stone-100 bg-stone-50/80">
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
          <button
            type="button"
            disabled={activePageIndex <= 0}
            onClick={() => goAdjacentPage(-1)}
            className="rounded-md px-2 py-1 text-xs text-stone-500 hover:bg-white hover:text-stone-800 disabled:opacity-30"
            title="이전 페이지"
          >
            ←
          </button>
          <button
            type="button"
            disabled={activePageIndex < 0 || activePageIndex >= pages.length - 1}
            onClick={() => goAdjacentPage(1)}
            className="rounded-md px-2 py-1 text-xs text-stone-500 hover:bg-white hover:text-stone-800 disabled:opacity-30"
            title="다음 페이지"
          >
            →
          </button>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
            {tabPages.map((page) => {
              const isActive = activePageId === page.id;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => selectPage(page.id)}
                  className={`min-w-[2.5rem] px-3 py-2 text-lg tabular-nums leading-none ${
                    page.kind === "content" ? "font-semibold" : "font-medium"
                  } ${
                    isActive
                      ? "text-stone-900"
                      : "text-stone-700 hover:text-stone-900"
                  }`}
                >
                  {pageTabLabel(page)}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => addPage("content")}
            className="rounded-md border border-stone-200/80 bg-white px-2 py-1 text-[11px] text-stone-600 hover:border-stone-300"
            title="본문 페이지 추가"
          >
            +본문
          </button>
          <button
            type="button"
            onClick={() => addPage("quote")}
            className="rounded-md border border-stone-200/80 bg-white px-2 py-1 text-[11px] text-stone-600 hover:border-stone-300"
            title="명언 페이지 추가"
          >
            +명언
          </button>
          <div
            className="ml-1 flex items-center gap-0.5 rounded-md border border-stone-200/80 bg-white px-0.5 py-0.5"
            title="페이지 화면 확대·축소 (Ctrl 또는 ⌘ + 스크롤)"
          >
            <button
              type="button"
              onClick={() => applyPageZoom(pageZoom - EDITOR_PAGE_ZOOM_STEP)}
              disabled={pageZoom <= EDITOR_PAGE_ZOOM_MIN + 0.001}
              className="rounded px-2 py-1 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-30"
              aria-label="페이지 축소"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => applyPageZoom(EDITOR_PAGE_ZOOM_DEFAULT)}
              className="min-w-[3rem] rounded px-1.5 py-1 text-[11px] tabular-nums text-stone-600 hover:bg-stone-50"
              aria-label="확대 100%로 초기화"
            >
              {formatEditorPageZoomLabel(pageZoom)}
            </button>
            <button
              type="button"
              onClick={() => applyPageZoom(pageZoom + EDITOR_PAGE_ZOOM_STEP)}
              disabled={pageZoom >= EDITOR_PAGE_ZOOM_MAX - 0.001}
              className="rounded px-2 py-1 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-30"
              aria-label="페이지 확대"
            >
              +
            </button>
          </div>
        </div>
        {activePage && activePage.kind !== "chapter-cover" && (
          <div className="flex items-center gap-2 border-t border-stone-100/80 px-3 py-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-stone-500">
              <span className="shrink-0 text-stone-400">부제목</span>
              <input
                type="text"
                value={activePageTitleValue}
                placeholder={activePageTitlePlaceholder}
                onChange={(e) =>
                  handlePageTitleChange(activePage.id, e.target.value)
                }
                className="min-w-0 flex-1 border-0 bg-transparent py-0.5 text-sm text-stone-900 outline-none placeholder:text-stone-400"
              />
            </label>
            <button
              type="button"
              onClick={() => requestDeletePage(activePage.id)}
              className="shrink-0 rounded border border-red-200/80 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:border-red-300 hover:bg-red-50"
            >
              페이지 삭제
            </button>
          </div>
        )}
      </div>

      <div
        className={
          sidePanelOpen
            ? "flex min-h-0 flex-1 flex-col md:flex-row"
            : "flex min-h-0 flex-1 flex-col"
        }
      >
        <div
          ref={scrollRef}
          className="book-page-editor-scroll min-h-0 min-w-0 flex-1 overflow-y-auto"
          onWheel={handlePageZoomWheel}
        >
          <div className="flex justify-center">
            <div ref={zoomHostRef} className="book-page-zoom-host relative">
              <div ref={shellRef} className={bookPageShellClass}>
            {activePage?.kind === "chapter-cover" ? (
            <article
              key={activePage.id}
              ref={(el) => {
                if (el) pageRefs.current.set(activePage.id, el);
                else pageRefs.current.delete(activePage.id);
              }}
              className={`${bookPageClass} ${bookPageCoverClass}`}
              aria-label="장 표지"
            >
              <div className={bookPageBodyClass}>
                <h1 className={bookChapterTitleClass}>{chapterTitle}</h1>
              </div>
            </article>
          ) : activePage?.kind === "quote" ? (
            <QuotePageArticle
              key={activePage.id}
              page={activePage}
              onUpdate={handleQuoteUpdate}
              pageRef={(el) => {
                if (el) pageRefs.current.set(activePage.id, el);
                else pageRefs.current.delete(activePage.id);
              }}
            />
          ) : activePage?.kind === "content" ? (
            <ContentPageArticle
              key={activePage.id}
              page={activePage}
              onUpdate={handlePageUpdate}
              registerEditor={registerEditor}
              pageRef={(el) => {
                if (el) pageRefs.current.set(activePage.id, el);
                else pageRefs.current.delete(activePage.id);
              }}
            />
            ) : null}
              </div>
            </div>
          </div>
        </div>

        {evalOpen && (
          <WritingEvaluationPanel
            report={evalReport}
            loading={evalLoading}
            error={evalError}
            warning={evalWarning}
            provider={evalProvider}
            scannedLength={evalScannedLength}
            pageSubtitle={activePageTitleValue}
            hasResult={evalHasResult}
            onRerun={runWritingEvaluation}
            onClose={() => closeWritingEvaluation(activePageTitleValue)}
          />
        )}

        {reviewOpen && (
          <WritingReviewPanel
            summary={reviewSummary}
            paragraphs={reviewParagraphs}
            appliedIndices={reviewAppliedParagraphs}
            error={reviewError}
            provider={reviewProvider}
            loading={reviewLoading}
            scannedLength={reviewScannedLength}
            hasResult={reviewHasResult}
            onRerun={runWritingReview}
            onApplyParagraph={applyReviewParagraph}
            onApplyAll={applyWritingReview}
            onFocusParagraph={focusReviewParagraph}
            alignWarning={reviewAlignWarning}
            onClose={closeWritingReview}
          />
        )}
      </div>

      {spellOpen && !reviewOpen && !evalOpen && (
        <SpellcheckPanel
          corrections={corrections}
          correctedText={correctedText}
          originalText={originalText}
          error={spellError}
          provider={spellProvider}
          onApplyAll={applyAllCorrections}
          onClose={closeSpellcheck}
          loading={spellLoading}
          scannedLength={scannedLength}
        />
      )}
    </div>
  );
});
