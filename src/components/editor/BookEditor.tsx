"use client";

import { ImageAlign, type ImageAlignValue } from "./ImageAlignExtension";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { BookParagraph } from "./BookParagraph";
import {
  bookChapterTitleClass,
  chapterBodyClass,
  chapterOpenerPageClass,
} from "@/lib/typography/bookStyles";
import { useCallback, useEffect, useRef, useState } from "react";
import { SpellcheckPanel } from "./SpellcheckPanel";
import type { SpellCorrection } from "@/lib/types/database";
import {
  applyCorrectedPlainTextToEditor,
  applyOneCorrectionToEditor,
  getEditorPlainText,
  shiftCorrectionsAfterApply,
} from "@/lib/spellcheck/applyToEditor";

type Props = {
  chapterId: string;
  chapterTitle: string;
  bookId: string;
  initialContent: Record<string, unknown>;
  onContentChange: (
    chapterId: string,
    contentJson: Record<string, unknown>,
    contentHtml: string,
  ) => void;
  onSave: (
    chapterId: string,
    contentJson: Record<string, unknown>,
    contentHtml: string,
  ) => void;
};

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded px-2 py-1 text-sm ${
        active
          ? "bg-stone-900 text-white"
          : "text-stone-600 hover:bg-stone-100"
      }`}
    >
      {children}
    </button>
  );
}

export function BookEditor({
  chapterId,
  chapterTitle,
  bookId,
  initialContent,
  onContentChange,
  onSave,
}: Props) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chapterIdRef = useRef(chapterId);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const onSaveRef = useRef(onSave);
  const onContentChangeRef = useRef(onContentChange);
  chapterIdRef.current = chapterId;
  onSaveRef.current = onSave;
  onContentChangeRef.current = onContentChange;
  const [spellOpen, setSpellOpen] = useState(false);
  const [spellLoading, setSpellLoading] = useState(false);
  const [corrections, setCorrections] = useState<SpellCorrection[]>([]);
  const [correctedText, setCorrectedText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [scannedLength, setScannedLength] = useState(0);
  const [spellError, setSpellError] = useState<string | null>(null);
  const [spellProvider, setSpellProvider] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ paragraph: false }),
      BookParagraph,
      Underline,
      ImageAlign.configure({ inline: false }),
      Placeholder.configure({
        placeholder: "장 제목 다음 페이지부터 본문을 작성하세요. 중제목·소제목으로 구분할 수 있습니다.",
      }),
    ],
    content: initialContent,
    immediatelyRender: false,
    /** #, >, --- 등 마크다운 단축키 비활성 — 툴바로만 서식 적용 */
    enableInputRules: false,
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON() as Record<string, unknown>;
      const html = ed.getHTML();
      onContentChange(chapterIdRef.current, json, html);

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        onSave(chapterIdRef.current, json, html);
      }, 800);
    },
  });

  editorRef.current = editor;

  const [, setSelectionTick] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const bump = () => setSelectionTick((n) => n + 1);
    editor.on("selectionUpdate", bump);
    editor.on("transaction", bump);
    return () => {
      editor.off("selectionUpdate", bump);
      editor.off("transaction", bump);
    };
  }, [editor]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      const ed = editorRef.current;
      if (ed && !ed.isDestroyed) {
        const json = ed.getJSON() as Record<string, unknown>;
        const html = ed.getHTML();
        onContentChangeRef.current(chapterIdRef.current, json, html);
        onSaveRef.current(chapterIdRef.current, json, html);
      }
    };
  }, []);

  const uploadImage = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !editor) return;

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
  }, [bookId, editor]);

  const runSpellcheck = useCallback(async () => {
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
  }, [editor]);

  const applyAllCorrections = useCallback(() => {
    if (!editor || !correctedText) return;
    const ok = applyCorrectedPlainTextToEditor(editor, correctedText);
    if (!ok) {
      alert("교정본을 적용하지 못했습니다. 맞춤법 검사를 다시 실행해 주세요.");
      return;
    }
    setSpellOpen(false);
    setCorrections([]);
    setCorrectedText("");
  }, [editor, correctedText]);

  const applyOneCorrection = useCallback(
    (correction: SpellCorrection) => {
      if (!editor) return;
      const ok = applyOneCorrectionToEditor(editor, correction);
      if (!ok) {
        alert("해당 부분을 찾지 못했습니다. 맞춤법 검사를 다시 실행해 주세요.");
        return;
      }
      setCorrections((prev) => shiftCorrectionsAfterApply(prev, correction));
    },
    [editor],
  );

  if (!editor) return null;

  const imageSelected = editor.isActive("image");
  const imageAlign =
    (editor.getAttributes("image").align as ImageAlignValue | undefined) ??
    "center";

  const setImageAlign = (align: ImageAlignValue) => {
    editor.chain().focus().updateAttributes("image", { align }).run();
  };

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-stone-200 bg-white px-4 py-2">
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="중제목"
        >
          중제목
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="소제목"
        >
          소제목
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("paragraph")}
          onClick={() => editor.chain().focus().setParagraph().run()}
          title="본문"
        >
          본문
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
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
              title="이미지 왼쪽"
            >
              ◧
            </ToolbarButton>
            <ToolbarButton
              active={imageAlign === "center"}
              onClick={() => setImageAlign("center")}
              title="이미지 가운데"
            >
              ▣
            </ToolbarButton>
            <ToolbarButton
              active={imageAlign === "right"}
              onClick={() => setImageAlign("right")}
              title="이미지 오른쪽"
            >
              ◨
            </ToolbarButton>
          </>
        )}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          인용
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          구분선
        </ToolbarButton>
        <div className="flex-1" />
        <ToolbarButton onClick={runSpellcheck}>맞춤법 검사</ToolbarButton>
      </div>

      <div className="flex-1 overflow-y-auto bg-stone-50 p-4 sm:p-6">
        <div className="book-prose min-h-[60vh] rounded-xl bg-white shadow-sm">
          <section className={chapterOpenerPageClass} aria-label="장 표지">
            <h1 className={bookChapterTitleClass}>{chapterTitle}</h1>
          </section>
          <section className={`${chapterBodyClass} book-prose-editor`}>
            <EditorContent editor={editor} />
          </section>
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
}
