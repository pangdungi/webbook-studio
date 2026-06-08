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
  bookPageShellSplashClass,
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
import {
  getWritingEvalCache,
  getWritingReviewCache,
  setWritingEvalCache,
  setWritingReviewCache,
  writingAssistPageKey,
  clearWritingEvalPending,
  clearWritingReviewPending,
  getWritingEvalPending,
  getWritingReviewPending,
  setWritingEvalPending,
  setWritingReviewPending,
  type WritingEvalCacheEntry,
  type WritingReviewCacheEntry,
} from "@/lib/editor/writingAssistCache";
import { buildReviewCacheEntry } from "@/lib/writingReview/buildReviewCacheEntry";
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
import { PageMemoDialog } from "./PageMemoDialog";
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
import { uploadBookImage } from "@/lib/editor/uploadBookImage";
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
  onChapterTitleChange?: (title: string) => void;
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
  setPageDone: (pageId: string, done: boolean) => void;
  setPageMemo: (pageId: string, memo: string) => void;
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
  onChapterTitleChange,
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
  const onChapterTitleChangeRef = useRef(onChapterTitleChange);
  onChapterTitleChangeRef.current = onChapterTitleChange;
  const chapterTitleFocusedRef = useRef(false);
  const chapterTitleRef = useRef<HTMLHeadingElement>(null);
  const pendingSaveRef = useRef<{
    chapterId: string;
    contentJson: Record<string, unknown>;
    contentHtml: string;
  } | null>(null);
  const lastSavedFingerprintRef = useRef<string | null>(null);

  const savePayloadFingerprint = (
    chapterId: string,
    contentJson: Record<string, unknown>,
    contentHtml: string,
  ) => `${chapterId}\0${contentHtml}\0${JSON.stringify(contentJson)}`;
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

  useEffect(() => {
    if (!chapterTitleFocusedRef.current && chapterTitleRef.current) {
      chapterTitleRef.current.textContent = chapterTitle;
    }
  }, [chapterId, chapterTitle]);

  const [spellOpen, setSpellOpen] = useState(false);
  const [spellLoading, setSpellLoading] = useState(false);
  const [corrections, setCorrections] = useState<SpellCorrection[]>([]);
  const [correctedText, setCorrectedText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [scannedLength, setScannedLength] = useState(0);
  const [spellError, setSpellError] = useState<string | null>(null);
  const [spellProvider, setSpellProvider] = useState<string | null>(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [pageMemoOpen, setPageMemoOpen] = useState(false);
  const [pageMemoTargetId, setPageMemoTargetId] = useState<string | null>(null);
  const [pageMemoDraft, setPageMemoDraft] = useState("");
  const [pendingReviewPages, setPendingReviewPages] = useState<Set<string>>(
    () => new Set(),
  );
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
  const [pendingEvalPages, setPendingEvalPages] = useState<Set<string>>(
    () => new Set(),
  );
  const [evalError, setEvalError] = useState<string | null>(null);
  const [evalWarning, setEvalWarning] = useState<string | null>(null);
  const [evalProvider, setEvalProvider] = useState<string | null>(null);
  const [evalReport, setEvalReport] = useState<WritingEvaluationReport | null>(
    null,
  );
  const [evalScannedLength, setEvalScannedLength] = useState(0);
  const [reviewHasResult, setReviewHasResult] = useState(false);
  const [evalHasResult, setEvalHasResult] = useState(false);

  const reviewPanelPageIdRef = useRef<string | null>(null);
  const evalPanelPageIdRef = useRef<string | null>(null);
  const reviewStatePageIdRef = useRef<string | null>(null);
  const evalStatePageIdRef = useRef<string | null>(null);
  const evalPageSubtitleRef = useRef("");
  const reviewOpenRef = useRef(reviewOpen);
  reviewOpenRef.current = reviewOpen;
  const evalOpenRef = useRef(evalOpen);
  evalOpenRef.current = evalOpen;

  const reviewLoading = pendingReviewPages.has(activePageId);
  const evalLoading = pendingEvalPages.has(activePageId);

  const assistPageKey = useCallback(
    (pageId: string) =>
      writingAssistPageKey(bookIdRef.current, chapterIdRef.current, pageId),
    [],
  );

  const persistReviewCache = useCallback(
    (pageId: string | null, entry: WritingReviewCacheEntry) => {
      if (!pageId) return;
      setWritingReviewCache(assistPageKey(pageId), entry);
    },
    [assistPageKey],
  );

  const persistEvalCache = useCallback(
    (pageId: string | null, entry: WritingEvalCacheEntry) => {
      if (!pageId) return;
      setWritingEvalCache(assistPageKey(pageId), entry);
    },
    [assistPageKey],
  );

  const applyReviewEntryToState = useCallback(
    (entry: WritingReviewCacheEntry) => {
      setReviewOriginal(entry.original);
      setReviewRevised(entry.revised);
      setReviewSummary(entry.summary);
      setReviewParagraphs(entry.paragraphs);
      setReviewHighlights(entry.highlights);
      setReviewAppliedParagraphs(new Set(entry.appliedParagraphs));
      setReviewAlignWarning(entry.alignWarning);
      setReviewParagraphNotes(entry.paragraphNotes);
      setReviewError(entry.error);
      setReviewProvider(entry.provider);
      setReviewScannedLength(entry.scannedLength);
      setReviewHasResult(true);
    },
    [],
  );

  const applyEvalEntryToState = useCallback((entry: WritingEvalCacheEntry) => {
    setEvalReport(entry.report);
    setEvalError(entry.error);
    setEvalWarning(entry.warning);
    setEvalProvider(entry.provider);
    setEvalScannedLength(entry.scannedLength);
    evalPageSubtitleRef.current = entry.pageSubtitle;
    setEvalHasResult(true);
  }, []);

  const markReviewPendingStart = useCallback(
    (pageId: string, scannedLength: number) => {
      setWritingReviewPending(assistPageKey(pageId), { scannedLength });
      setPendingReviewPages((prev) => new Set(prev).add(pageId));
    },
    [assistPageKey],
  );

  const markReviewPendingDone = useCallback(
    (pageId: string) => {
      clearWritingReviewPending(assistPageKey(pageId));
      setPendingReviewPages((prev) => {
        if (!prev.has(pageId)) return prev;
        const next = new Set(prev);
        next.delete(pageId);
        return next;
      });
    },
    [assistPageKey],
  );

  const markEvalPendingStart = useCallback(
    (pageId: string, scannedLength: number) => {
      setWritingEvalPending(assistPageKey(pageId), { scannedLength });
      setPendingEvalPages((prev) => new Set(prev).add(pageId));
    },
    [assistPageKey],
  );

  const markEvalPendingDone = useCallback(
    (pageId: string) => {
      clearWritingEvalPending(assistPageKey(pageId));
      setPendingEvalPages((prev) => {
        if (!prev.has(pageId)) return prev;
        const next = new Set(prev);
        next.delete(pageId);
        return next;
      });
    },
    [assistPageKey],
  );

  const activeEditor = editorsRef.current.get(activePageId) ?? null;
  const sidePanelOpen = reviewOpen || evalOpen;

  const saveReviewCache = useCallback(
    (pageId: string | null) => {
      if (!pageId || (!reviewHasResult && !reviewError)) return;
      persistReviewCache(pageId, {
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
      persistReviewCache,
      reviewHasResult,
      reviewError,
      reviewOriginal,
      reviewRevised,
      reviewSummary,
      reviewParagraphs,
      reviewHighlights,
      reviewAppliedParagraphs,
      reviewParagraphNotes,
      reviewProvider,
      reviewAlignWarning,
      reviewScannedLength,
    ],
  );

  useEffect(() => {
    const pageId = reviewStatePageIdRef.current;
    if (!pageId || (!reviewHasResult && !reviewError)) return;
    persistReviewCache(pageId, {
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
  }, [
    persistReviewCache,
    reviewHasResult,
    reviewError,
    reviewOriginal,
    reviewRevised,
    reviewSummary,
    reviewParagraphs,
    reviewHighlights,
    reviewAppliedParagraphs,
    reviewParagraphNotes,
    reviewProvider,
    reviewAlignWarning,
    reviewScannedLength,
  ]);

  useEffect(() => {
    const pageId = evalStatePageIdRef.current;
    if (!pageId || (!evalHasResult && !evalError)) return;
    persistEvalCache(pageId, {
      report: evalReport,
      provider: evalProvider,
      warning: evalWarning,
      error: evalError,
      scannedLength: evalScannedLength,
      pageSubtitle: evalPageSubtitleRef.current,
    });
  }, [
    persistEvalCache,
    evalHasResult,
    evalError,
    evalReport,
    evalProvider,
    evalWarning,
    evalScannedLength,
  ]);

  const loadReviewCache = useCallback(
    (pageId: string, editor: Editor | null) => {
      reviewStatePageIdRef.current = pageId;
      const key = assistPageKey(pageId);
      const pending = getWritingReviewPending(key);
      if (pending) {
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
        setReviewScannedLength(pending.scannedLength);
        setReviewHasResult(false);
        setPendingReviewPages((prev) => new Set(prev).add(pageId));
        clearSpellcheckHighlights(editor);
        return;
      }

      const cached = getWritingReviewCache(key);
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
    [assistPageKey],
  );

  const saveEvalCache = useCallback(
    (pageId: string | null, pageSubtitle: string) => {
      if (!pageId || (!evalHasResult && !evalError)) return;
      evalPageSubtitleRef.current = pageSubtitle;
      persistEvalCache(pageId, {
        report: evalReport,
        provider: evalProvider,
        warning: evalWarning,
        error: evalError,
        scannedLength: evalScannedLength,
        pageSubtitle,
      });
    },
    [
      persistEvalCache,
      evalHasResult,
      evalError,
      evalReport,
      evalProvider,
      evalWarning,
      evalScannedLength,
    ],
  );

  const loadEvalCache = useCallback((pageId: string) => {
    evalStatePageIdRef.current = pageId;
    const key = assistPageKey(pageId);
    const pending = getWritingEvalPending(key);
    if (pending) {
      setEvalReport(null);
      setEvalError(null);
      setEvalWarning(null);
      setEvalProvider(null);
      setEvalScannedLength(pending.scannedLength);
      setEvalHasResult(false);
      setPendingEvalPages((prev) => new Set(prev).add(pageId));
      return;
    }

    const cached = getWritingEvalCache(key);
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
    evalPageSubtitleRef.current = cached.pageSubtitle;
    setEvalHasResult(true);
  }, [assistPageKey]);

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
    if (saveInFlightRef.current) {
      if (!saveTimer.current) {
        saveTimer.current = setTimeout(() => {
          void flushSave();
        }, 700);
      }
      return false;
    }

    const fingerprint = savePayloadFingerprint(
      pending.chapterId,
      pending.contentJson,
      pending.contentHtml,
    );
    if (fingerprint === lastSavedFingerprintRef.current) {
      pendingSaveRef.current = null;
      onSaveStateRef.current?.("saved");
      return true;
    }

    if (savePausedRef.current) {
      onSaveStateRef.current?.("error");
      onSaveErrorRef.current?.(
        "저장이 중단되었습니다. 다른 페이지를 클릭하거나 「전체 저장」을 눌러 주세요.",
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
      lastSavedFingerprintRef.current = savePayloadFingerprint(
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
      if (/failed to fetch|networkerror|load failed/i.test(msg)) {
        detail =
          "서버와 연결이 끊겼습니다. 터미널에서 npm run dev 가 켜져 있는지 확인한 뒤, 잠시 후 다시 저장해 주세요. (브라우저에 초안은 남아 있습니다.)";
      } else if (/401|Unauthorized/i.test(msg)) {
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

  const rememberLocalChapter = useCallback((nextPages: BookPage[]) => {
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
  }, []);

  const pushCurrentChapterToServer = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (savePausedRef.current) return;

    const payload = buildSavePayload();
    pendingSaveRef.current = payload;
    onContentChangeRef.current(
      payload.chapterId,
      payload.contentJson,
      payload.contentHtml,
    );
    await flushSave();
  }, [buildSavePayload, flushSave]);

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
        queueMicrotask(() => rememberLocalChapter(next));
        return next;
      });
    },
    [rememberLocalChapter],
  );

  const handlePageTitleChange = useCallback(
    (pageId: string, title: string) => {
      setPages((prev) => {
        const next = prev.map((p) => (p.id === pageId ? { ...p, title } : p));
        queueMicrotask(() => rememberLocalChapter(next));
        return next;
      });
    },
    [rememberLocalChapter],
  );

  const handleQuoteUpdate = useCallback(
    (pageId: string, quote: string, source: string) => {
      const content = { type: "quote" as const, quote, source };
      const html = quoteContentToHtml(quote, source);
      setPages((prev) => {
        const next = prev.map((p) =>
          p.id === pageId ? { ...p, content, content_html: html } : p,
        );
        queueMicrotask(() => rememberLocalChapter(next));
        return next;
      });
    },
    [rememberLocalChapter],
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
        if (reviewStatePageIdRef.current === fromId) {
          saveReviewCache(fromId);
        }
        if (evalStatePageIdRef.current === fromId) {
          saveEvalCache(fromId, evalPageSubtitleRef.current);
        }

        const snap = snapshotEditorPage(fromId);
        if (snap) {
          setPages((prev) => {
            const next = prev.map((p) =>
              p.id === fromId
                ? { ...p, content: snap.json, content_html: snap.html }
                : p,
            );
            queueMicrotask(() => rememberLocalChapter(next));
            return next;
          });
        }
        void pushCurrentChapterToServer();
      }

      setActivePageId(pageId);
      pageRefs.current.clear();
      scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    },
    [pushCurrentChapterToServer, rememberLocalChapter, saveEvalCache, saveReviewCache, snapshotEditorPage],
  );

  const selectPageRef = useRef(selectPage);
  selectPageRef.current = selectPage;

  useEffect(() => {
    onActivePageChangeRef.current?.(activePageId);
  }, [activePageId]);

  const commitChapterSnapshot = useCallback(() => {
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
    return payload;
  }, [buildSavePayload]);

  const setPageDone = useCallback(
    (pageId: string, done: boolean) => {
      setPages((prev) => {
        const next = prev.map((p) =>
          p.id === pageId ? { ...p, editor_done: done } : p,
        );
        queueMicrotask(() => rememberLocalChapter(next));
        return next;
      });
    },
    [rememberLocalChapter],
  );

  const setPageMemo = useCallback(
    (pageId: string, memo: string) => {
      setPages((prev) => {
        const next = prev.map((p) =>
          p.id === pageId ? { ...p, editor_memo: memo } : p,
        );
        queueMicrotask(() => rememberLocalChapter(next));
        return next;
      });
    },
    [rememberLocalChapter],
  );

  const openPageMemoDialog = useCallback(
    (pageId: string) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page || page.kind === "chapter-cover") return;
      setPageMemoDraft(page.editor_memo ?? "");
      setPageMemoTargetId(pageId);
      setPageMemoOpen(true);
    },
    [pages],
  );

  const closePageMemoDialog = useCallback(() => {
    setPageMemoOpen(false);
    setPageMemoTargetId(null);
    setPageMemoDraft("");
  }, []);

  const savePageMemoDialog = useCallback(() => {
    if (!pageMemoTargetId) return;
    setPageMemo(pageMemoTargetId, pageMemoDraft);
    closePageMemoDialog();
  }, [closePageMemoDialog, pageMemoDraft, pageMemoTargetId, setPageMemo]);

  useImperativeHandle(
    ref,
    () => ({
      flushPendingSave,
      commitChapterSnapshot,
      selectPage: (pageId: string) => {
        selectPageRef.current(pageId);
      },
      setPageDone,
      setPageMemo,
    }),
    [commitChapterSnapshot, flushPendingSave, setPageDone, setPageMemo],
  );

  const addPage = (kind: Extract<PageKind, "content" | "quote">) => {
    const page = createPage(kind);
    setPages((prev) => {
      const next = [...prev, page];
      queueMicrotask(() => rememberLocalChapter(next));
      return next;
    });
    requestAnimationFrame(() => {
      void pushCurrentChapterToServer().finally(() => {
        selectPage(page.id);
      });
    });
  };

  const deletePage = (pageId: string) => {
    const target = pages.find((p) => p.id === pageId);
    if (!target || target.kind === "chapter-cover") return;

    setPages((prev) => {
      const next = prev.filter((p) => p.id !== pageId);
      queueMicrotask(() => rememberLocalChapter(next));
      return next;
    });
    void pushCurrentChapterToServer();
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

  const uploadImage = useCallback(() => {
    const pageId = activePageIdRef.current;
    const editor = editorsRef.current.get(pageId);
    if (!editor || editor.isDestroyed) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const url = await uploadBookImage(file, bookId);
        const ed = editorsRef.current.get(pageId);
        if (!ed || ed.isDestroyed) return;

        ed.chain()
          .focus()
          .setImage({ src: url })
          .updateAttributes("image", { align: "center" })
          .run();
      } catch (err) {
        onSaveError?.(
          err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.",
        );
      }
    };
    input.click();
  }, [bookId, onSaveError]);

  const runWritingReview = useCallback(async () => {
    const pageId = activePageIdRef.current;
    const editor = editorsRef.current.get(pageId);
    if (!editor) return;

    reviewStatePageIdRef.current = pageId;
    const { plain: text, blocks } = getWritingReviewPlainFromEditor(editor);
    markReviewPendingStart(pageId, text.length);

    if (reviewOpenRef.current && activePageIdRef.current === pageId) {
      setReviewOriginal(text);
      setReviewScannedLength(text.length);
      setReviewError(null);
      setReviewProvider(null);
      setReviewRevised("");
      setReviewSummary("");
      setReviewParagraphs([]);
      setReviewHighlights([]);
      setReviewAppliedParagraphs(new Set());
      setReviewAlignWarning(null);
      setReviewParagraphNotes([]);
      setReviewHasResult(false);
      clearSpellcheckHighlights(editor);
    }

    const finishReview = (entry: WritingReviewCacheEntry) => {
      persistReviewCache(pageId, entry);
      markReviewPendingDone(pageId);
      if (activePageIdRef.current === pageId && reviewOpenRef.current) {
        reviewStatePageIdRef.current = pageId;
        reviewPanelPageIdRef.current = pageId;
        applyReviewEntryToState(entry);
        const ed = editorsRef.current.get(pageId);
        if (ed && entry.highlights.length > 0) {
          syncSpellcheckHighlights(ed, entry.highlights, "review");
        } else if (ed) {
          clearSpellcheckHighlights(ed);
        }
      }
    };

    try {
      const res = await fetch("/api/writing-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      let data: {
        error?: string;
        revisedText?: string;
        summary?: string;
        provider?: string;
        paragraphNotes?: ParagraphNote[];
        warning?: string;
      };
      try {
        data = await res.json();
      } catch {
        finishReview(
          buildReviewCacheEntry(text, text, [], {
            error:
              "서버 응답을 읽을 수 없습니다. localhost:3000 에 npm run dev 가 실행 중인지 확인하세요.",
            scannedLength: text.length,
          }),
        );
        return;
      }

      if (!res.ok) {
        finishReview(
          buildReviewCacheEntry(text, text, [], {
            error: data.error ?? "글검사에 실패했습니다.",
            scannedLength: text.length,
          }),
        );
        return;
      }

      const revisedRaw = data.revisedText ?? text;
      const revised = joinAlignedRevisedText(blocks, revisedRaw);
      const notes = data.paragraphNotes ?? [];
      finishReview(
        buildReviewCacheEntry(text, revised, notes, {
          summary: data.summary ?? "",
          provider: data.provider ?? null,
          alignWarning: data.warning ?? null,
          scannedLength: text.length,
        }),
      );
    } catch (err) {
      const failedFetch =
        err instanceof TypeError &&
        /fetch|network|load failed|failed to fetch/i.test(String(err));
      finishReview(
        buildReviewCacheEntry(text, text, [], {
          error: failedFetch
            ? "로컬 개발 서버(localhost:3000)에 연결할 수 없습니다. 터미널에서 npm run dev 를 실행한 뒤 다시 시도하세요."
            : "네트워크 오류로 글검사에 실패했습니다.",
          scannedLength: text.length,
        }),
      );
    }
  }, [
    applyReviewEntryToState,
    markReviewPendingDone,
    markReviewPendingStart,
    persistReviewCache,
  ]);

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
    if (reviewStatePageIdRef.current === prev) {
      saveReviewCache(prev);
    }
    if (evalStatePageIdRef.current === prev) {
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
    const pageId = activePageIdRef.current;
    const editor = editorsRef.current.get(pageId);
    const page = pagesRef.current.find((p) => p.id === pageId);
    if (!editor || page?.kind !== "content") return;

    const text = getEditorPlainText(editor);
    const pageSubtitle =
      page.kind === "content"
        ? pageSubtitleInputValue(page)
        : (page.title ?? "");
    evalStatePageIdRef.current = pageId;
    evalPageSubtitleRef.current = pageSubtitle;
    markEvalPendingStart(pageId, text.length);

    if (evalOpenRef.current && activePageIdRef.current === pageId) {
      setEvalScannedLength(text.length);
      setEvalError(null);
      setEvalWarning(null);
      setEvalProvider(null);
      setEvalReport(null);
      setEvalHasResult(false);
    }

    const finishEval = (entry: WritingEvalCacheEntry) => {
      persistEvalCache(pageId, entry);
      markEvalPendingDone(pageId);
      if (activePageIdRef.current === pageId && evalOpenRef.current) {
        evalStatePageIdRef.current = pageId;
        evalPanelPageIdRef.current = pageId;
        applyEvalEntryToState(entry);
      }
    };

    try {
      const res = await fetch("/api/writing-evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, pageSubtitle }),
      });
      const data = await res.json();

      if (!res.ok) {
        finishEval({
          report: null,
          provider: null,
          warning: null,
          error: data.error ?? "글평가에 실패했습니다.",
          scannedLength: text.length,
          pageSubtitle,
        });
        return;
      }

      finishEval({
        report: data.report ?? null,
        provider: data.provider ?? null,
        warning: data.warning ?? null,
        error: null,
        scannedLength: text.length,
        pageSubtitle,
      });
    } catch {
      finishEval({
        report: null,
        provider: null,
        warning: null,
        error: "네트워크 오류로 글평가에 실패했습니다.",
        scannedLength: text.length,
        pageSubtitle,
      });
    }
  }, [
    applyEvalEntryToState,
    markEvalPendingDone,
    markEvalPendingStart,
    persistEvalCache,
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
        <ToolbarButton
          disabled={!isContentPageActive}
          onClick={uploadImage}
          title="이미지 추가 · 본문에 파일을 끌어다 놓아도 됩니다"
        >
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
                <div key={page.id} className="flex items-center gap-0.5">
                  <input
                    type="checkbox"
                    checked={!!page.editor_done}
                    onChange={(e) => setPageDone(page.id, e.target.checked)}
                    className="size-3.5 shrink-0 accent-emerald-600"
                    aria-label={`${pageTabLabel(page)}페이지 작성·검수 완료`}
                    title="작성·검수 완료"
                  />
                  <button
                    type="button"
                    onClick={() => selectPage(page.id)}
                    className={`min-w-[2.25rem] px-2 py-2 text-lg tabular-nums leading-none ${
                      page.kind === "content" ? "font-semibold" : "font-medium"
                    } ${
                      isActive
                        ? "text-stone-900"
                        : "text-stone-700 hover:text-stone-900"
                    }`}
                  >
                    {pageTabLabel(page)}
                  </button>
                  {page.kind !== "chapter-cover" ? (
                    <button
                      type="button"
                      onClick={() => openPageMemoDialog(page.id)}
                      className={`rounded px-1 py-0.5 text-[10px] font-medium ${
                        page.editor_memo?.trim()
                          ? "bg-amber-50 text-amber-800 hover:bg-amber-100"
                          : "text-stone-400 hover:bg-white hover:text-stone-600"
                      }`}
                      title={
                        page.editor_memo?.trim()
                          ? "페이지 메모 보기·수정"
                          : "페이지 메모 추가"
                      }
                    >
                      메모
                    </button>
                  ) : null}
                </div>
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
              <div
                ref={shellRef}
                className={`${bookPageShellClass}${
                  activePage?.kind === "chapter-cover"
                    ? ` ${bookPageShellSplashClass}`
                    : ""
                }`}
              >
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
                <h1
                  ref={(el) => {
                    chapterTitleRef.current = el;
                    if (
                      el &&
                      !chapterTitleFocusedRef.current &&
                      el.textContent !== chapterTitle
                    ) {
                      el.textContent = chapterTitle;
                    }
                  }}
                  className={bookChapterTitleClass}
                  style={{ textAlign: "left", width: "fit-content" }}
                  contentEditable
                  suppressContentEditableWarning
                  aria-label="장 제목"
                  onFocus={() => {
                    chapterTitleFocusedRef.current = true;
                  }}
                  onBlur={() => {
                    chapterTitleFocusedRef.current = false;
                  }}
                  onInput={(e) => {
                    onChapterTitleChangeRef.current?.(
                      e.currentTarget.textContent ?? "",
                    );
                  }}
                />
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
              bookId={bookId}
              onUpdate={handlePageUpdate}
              registerEditor={registerEditor}
              onImageUploadError={onSaveError}
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
      <PageMemoDialog
        open={pageMemoOpen}
        pageLabel={
          pageMemoTargetId
            ? pageTabLabel(
                pages.find((p) => p.id === pageMemoTargetId) ?? pages[0],
              )
            : ""
        }
        value={pageMemoDraft}
        onChange={setPageMemoDraft}
        onClose={closePageMemoDialog}
        onSave={savePageMemoDialog}
      />
    </div>
  );
});
