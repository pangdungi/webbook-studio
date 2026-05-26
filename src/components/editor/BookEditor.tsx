"use client";

import { PageTipTapEditor } from "./PageTipTapEditor";
import type { ImageAlignValue } from "./ImageAlignExtension";
import {
  bookChapterTitleClass,
  bookPageBodyClass,
  bookPageClass,
  bookPageContentClass,
  bookPageCoverClass,
  bookPageShellClass,
  syncBookPageMetrics,
} from "@/lib/pages/bookPageCss";
import {
  chapterContentToJson,
  chapterPagesToStorageHtml,
  createPage,
  parseChapterContent,
} from "@/lib/pages/content";
import type { BookPage } from "@/lib/pages/types";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { SpellcheckPanel } from "./SpellcheckPanel";
import type { SpellCorrection } from "@/lib/types/database";
import {
  applyCorrectedPlainTextToEditor,
  applyOneCorrectionToEditor,
  getEditorPlainText,
  shiftCorrectionsAfterApply,
} from "@/lib/spellcheck/applyToEditor";
import type { Editor } from "@tiptap/react";

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
};

export type BookEditorHandle = {
  flushPendingSave: () => Promise<{
    chapterId: string;
    contentJson: Record<string, unknown>;
    contentHtml: string;
  }>;
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
  },
  ref,
) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chapterIdRef = useRef(chapterId);
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<string, HTMLElement>>(new Map());

  const [pages, setPages] = useState<BookPage[]>(() =>
    parseChapterContent(initialContent, chapterTitle, initialContentHtml).pages,
  );
  const [activePageId, setActivePageId] = useState(
    () => pages.find((p) => p.kind === "content")?.id ?? pages[0]?.id ?? "",
  );
  const [, setToolbarTick] = useState(0);

  const [spellOpen, setSpellOpen] = useState(false);
  const [spellLoading, setSpellLoading] = useState(false);
  const [corrections, setCorrections] = useState<SpellCorrection[]>([]);
  const [correctedText, setCorrectedText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [scannedLength, setScannedLength] = useState(0);
  const [spellError, setSpellError] = useState<string | null>(null);
  const [spellProvider, setSpellProvider] = useState<string | null>(null);

  const activeEditor = editorsRef.current.get(activePageId) ?? null;

  chapterIdRef.current = chapterId;
  onSaveRef.current = onSave;
  onContentChangeRef.current = onContentChange;
  onSaveStateRef.current = onSaveState;

  const flushSave = useCallback(async () => {
    saveTimer.current = null;
    const pending = pendingSaveRef.current;
    if (!pending) return;

    const payload = { ...pending };
    pendingSaveRef.current = null;
    onSaveStateRef.current?.("saving");

    try {
      await onSaveRef.current(
        payload.chapterId,
        payload.contentJson,
        payload.contentHtml,
      );
      onSaveStateRef.current?.("saved");
    } catch {
      pendingSaveRef.current = payload;
      onSaveStateRef.current?.("error");
      throw new Error("chapter save failed");
    }
  }, []);

  const flushPendingSave = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    const snapshot = pagesRef.current;
    const json = chapterContentToJson(snapshot) as unknown as Record<
      string,
      unknown
    >;
    const html = chapterPagesToStorageHtml(snapshot);
    const payload = {
      chapterId: chapterIdRef.current,
      contentJson: json,
      contentHtml: html,
    };

    pendingSaveRef.current = payload;
    onContentChangeRef.current(chapterIdRef.current, json, html);
    await flushSave();
    return payload;
  }, [flushSave]);

  useImperativeHandle(ref, () => ({ flushPendingSave }), [flushPendingSave]);

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

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void flushSave();
      }, 800);
    },
    [flushSave],
  );

  const handlePageUpdate = useCallback(
    (pageId: string, json: Record<string, unknown>, html: string) => {
      setPages((prev) => {
        const next = prev.map((p) =>
          p.id === pageId ? { ...p, content: json, content_html: html } : p,
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
    const shell = shellRef.current;
    if (!shell) return;

    const sync = () => syncBookPageMetrics(shell);

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(shell);
    return () => ro.disconnect();
  }, [pages.length]);

  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      if (pendingSaveRef.current) {
        void flushSave();
      }
    };
  }, [flushSave]);

  const scrollToPage = useCallback(function scrollToPage(
    pageId: string,
    focusEditor = false,
    attempt = 0,
  ) {
    const scroller = scrollRef.current;
    const pageEl = pageRefs.current.get(pageId);
    if (!scroller || !pageEl) {
      if (attempt < 4) {
        requestAnimationFrame(() => scrollToPage(pageId, focusEditor, attempt + 1));
      }
      return;
    }

    const top =
      pageEl.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop;

    scroller.scrollTo({ top: Math.max(0, top - 12), behavior: "smooth" });

    if (!focusEditor) return;

    const page = pagesRef.current.find((p) => p.id === pageId);
    if (page?.kind !== "content") return;

    window.setTimeout(() => {
      editorsRef.current.get(pageId)?.commands.focus("end", { scrollIntoView: false });
    }, 280);
  }, []);

  const selectPage = useCallback(
    (pageId: string) => {
      setActivePageId(pageId);
      requestAnimationFrame(() => {
        scrollToPage(pageId, true);
      });
    },
    [scrollToPage],
  );

  const addPage = () => {
    const page = createPage("content");
    setPages((prev) => {
      const next = [...prev, page];
      persist(next);
      return next;
    });
    requestAnimationFrame(() => {
      selectPage(page.id);
    });
  };

  const deletePage = (pageId: string) => {
    const contentPages = pages.filter((p) => p.kind === "content");
    if (contentPages.length <= 1) return;

    setPages((prev) => {
      const next = prev.filter((p) => p.id !== pageId);
      persist(next);
      return next;
    });
    if (activePageId === pageId) {
      const remaining = pages.filter(
        (p) => p.id !== pageId && p.kind === "content",
      );
      const nextId = remaining[0]?.id ?? pages[0]?.id ?? "";
      requestAnimationFrame(() => {
        selectPage(nextId);
      });
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

  const runSpellcheck = useCallback(async () => {
    const editor = activeEditor;
    if (!editor) return;
    const text = getEditorPlainText(editor);
    setOriginalText(text);
    setScannedLength(text.length);
    setSpellOpen(true);
    setSpellLoading(true);
    setSpellError(null);
    setSpellProvider(null);

    try {
      const res = await fetch("/api/spellcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSpellError(data.error ?? "맞춤법 검사에 실패했습니다.");
        setCorrections([]);
        setCorrectedText(text);
        return;
      }

      setCorrections(data.corrections ?? []);
      setCorrectedText(data.correctedText ?? text);
      setSpellProvider(data.provider ?? null);
      if (data.warning) setSpellError(data.warning);
    } catch {
      setSpellError("네트워크 오류로 맞춤법 검사에 실패했습니다.");
      setCorrections([]);
      setCorrectedText(text);
    } finally {
      setSpellLoading(false);
    }
  }, [activeEditor]);

  const applyAllCorrections = useCallback(() => {
    const editor = activeEditor;
    if (!editor || !correctedText) return;
    const ok = applyCorrectedPlainTextToEditor(editor, correctedText);
    if (!ok) {
      alert("교정본을 적용하지 못했습니다. 맞춤법 검사를 다시 실행해 주세요.");
      return;
    }
    setSpellOpen(false);
    setCorrections([]);
    setCorrectedText("");
  }, [activeEditor, correctedText]);

  const applyOneCorrection = useCallback(
    (correction: SpellCorrection) => {
      const editor = activeEditor;
      if (!editor) return;
      const ok = applyOneCorrectionToEditor(editor, correction);
      if (!ok) {
        alert("해당 부분을 찾지 못했습니다. 맞춤법 검사를 다시 실행해 주세요.");
        return;
      }
      setCorrections((prev) => shiftCorrectionsAfterApply(prev, correction));
    },
    [activeEditor],
  );

  const imageSelected = activeEditor?.isActive("image") ?? false;
  const imageAlign =
    (activeEditor?.getAttributes("image").align as ImageAlignValue | undefined) ??
    "center";

  const setImageAlign = (align: ImageAlignValue) => {
    activeEditor?.chain().focus().updateAttributes("image", { align }).run();
  };

  const contentPageIndex = (id: string) =>
    pages.filter((p) => p.kind === "content").findIndex((p) => p.id === id);

  useEffect(() => {
    requestAnimationFrame(() => scrollToPage(activePageId));
  }, [chapterId, scrollToPage]);

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-stone-200 bg-white px-4 py-2">
        <ToolbarButton
          active={activeEditor?.isActive("heading", { level: 2 })}
          onClick={() =>
            activeEditor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
          title="중제목"
        >
          중제목
        </ToolbarButton>
        <ToolbarButton
          active={activeEditor?.isActive("heading", { level: 3 })}
          onClick={() =>
            activeEditor?.chain().focus().toggleHeading({ level: 3 }).run()
          }
          title="소제목"
        >
          소제목
        </ToolbarButton>
        <ToolbarButton
          active={activeEditor?.isActive("paragraph")}
          onClick={() => activeEditor?.chain().focus().setParagraph().run()}
          title="본문"
        >
          본문
        </ToolbarButton>
        <ToolbarButton
          active={activeEditor?.isActive("bold")}
          onClick={() => activeEditor?.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          active={activeEditor?.isActive("italic")}
          onClick={() => activeEditor?.chain().focus().toggleItalic().run()}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          active={activeEditor?.isActive("underline")}
          onClick={() => activeEditor?.chain().focus().toggleUnderline().run()}
        >
          U
        </ToolbarButton>
        <ToolbarButton onClick={uploadImage}>이미지</ToolbarButton>
        {imageSelected && (
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
          onClick={() => activeEditor?.chain().focus().toggleBlockquote().run()}
        >
          인용
        </ToolbarButton>
        <ToolbarButton
          onClick={() => activeEditor?.chain().focus().setHorizontalRule().run()}
        >
          구분선
        </ToolbarButton>
        <div className="flex-1" />
        <ToolbarButton onClick={runSpellcheck}>맞춤법 검사</ToolbarButton>
      </div>

      <div className="flex items-center gap-2 border-b border-stone-100 bg-stone-50 px-4 py-2 text-xs text-stone-600">
        <span className="font-medium text-stone-800">페이지</span>
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            onClick={() => selectPage(page.id)}
            className={`rounded px-2 py-1 ${
              activePageId === page.id
                ? "bg-stone-900 text-white"
                : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
            }`}
          >
            {page.kind === "chapter-cover"
              ? "표지"
              : contentPageIndex(page.id) + 1}
          </button>
        ))}
        <button
          type="button"
          onClick={addPage}
          className="rounded bg-white px-2 py-1 ring-1 ring-stone-200 hover:bg-stone-100"
        >
          + 페이지
        </button>
        {pages.find((p) => p.id === activePageId)?.kind === "content" &&
          pages.filter((p) => p.kind === "content").length > 1 && (
            <button
              type="button"
              onClick={() => deletePage(activePageId)}
              className="ml-auto text-red-600 hover:underline"
            >
              페이지 삭제
            </button>
          )}
      </div>

      <div
        ref={scrollRef}
        className="book-page-editor-scroll flex-1 overflow-y-auto"
      >
        <div ref={shellRef} className={bookPageShellClass}>
          {pages.map((page) =>
            page.kind === "chapter-cover" ? (
              <article
                key={page.id}
                ref={(el) => {
                  if (el) pageRefs.current.set(page.id, el);
                  else pageRefs.current.delete(page.id);
                }}
                className={`${bookPageClass} ${bookPageCoverClass}`}
                onClick={() => selectPage(page.id)}
                aria-label="장 표지"
              >
                <div className={bookPageBodyClass}>
                  <h1 className={bookChapterTitleClass}>{chapterTitle}</h1>
                </div>
              </article>
            ) : (
              <article
                key={page.id}
                ref={(el) => {
                  if (el) pageRefs.current.set(page.id, el);
                  else pageRefs.current.delete(page.id);
                }}
                className={`${bookPageClass} ${bookPageContentClass} ${
                  page.id !== activePageId ? "ring-1 ring-stone-200/80" : ""
                }`}
                onClick={() => selectPage(page.id)}
              >
                <div className={bookPageBodyClass}>
                  <PageTipTapEditor
                    pageId={page.id}
                    initialContent={page.content}
                    editable={page.id === activePageId}
                    onUpdate={handlePageUpdate}
                    onFocus={(pageId) => setActivePageId(pageId)}
                    registerEditor={registerEditor}
                  />
                </div>
              </article>
            ),
          )}
        </div>
      </div>

      {spellOpen && (
        <SpellcheckPanel
          corrections={corrections}
          correctedText={correctedText}
          originalText={originalText}
          error={spellError}
          provider={spellProvider}
          onApplyAll={applyAllCorrections}
          onApplyOne={applyOneCorrection}
          onClose={() => setSpellOpen(false)}
          loading={spellLoading}
          scannedLength={scannedLength}
        />
      )}
    </div>
  );
});
