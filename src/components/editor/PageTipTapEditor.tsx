"use client";

import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { BookParagraph } from "./BookParagraph";
import { ImageAlign } from "./ImageAlignExtension";
import { useEffect } from "react";

type Props = {
  pageId: string;
  initialContent: Record<string, unknown>;
  editable?: boolean;
  onUpdate: (pageId: string, json: Record<string, unknown>, html: string) => void;
  onFocus: (pageId: string) => void;
  registerEditor: (pageId: string, editor: Editor | null) => void;
};

export function PageTipTapEditor({
  pageId,
  initialContent,
  editable = true,
  onUpdate,
  onFocus,
  registerEditor,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ paragraph: false }),
      BookParagraph,
      Underline,
      ImageAlign.configure({ inline: false }),
      Placeholder.configure({
        placeholder: editable
          ? "이 페이지에 글을 작성하세요."
          : "편집하려면 위에서 이 페이지를 선택하세요.",
      }),
    ],
    content: initialContent,
    editable,
    immediatelyRender: false,
    enableInputRules: false,
    onUpdate: ({ editor: ed }) => {
      if (!ed.isEditable) return;
      onUpdate(pageId, ed.getJSON() as Record<string, unknown>, ed.getHTML());
    },
    onFocus: () => onFocus(pageId),
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    registerEditor(pageId, editor);
    return () => registerEditor(pageId, null);
  }, [editor, pageId, registerEditor]);

  if (!editor) return null;

  return <EditorContent editor={editor} className="book-page-prose" />;
}
