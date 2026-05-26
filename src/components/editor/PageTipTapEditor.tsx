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
  onUpdate: (pageId: string, json: Record<string, unknown>, html: string) => void;
  registerEditor: (pageId: string, editor: Editor | null) => void;
};

export function PageTipTapEditor({
  pageId,
  initialContent,
  onUpdate,
  registerEditor,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ paragraph: false }),
      BookParagraph,
      Underline,
      ImageAlign.configure({ inline: false }),
      Placeholder.configure({
        placeholder: "이 페이지에 글을 작성하세요.",
      }),
    ],
    content: initialContent,
    immediatelyRender: false,
    enableInputRules: false,
    onUpdate: ({ editor: ed }) => {
      onUpdate(pageId, ed.getJSON() as Record<string, unknown>, ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    registerEditor(pageId, editor);
    return () => {
      onUpdate(
        pageId,
        editor.getJSON() as Record<string, unknown>,
        editor.getHTML(),
      );
      registerEditor(pageId, null);
    };
  }, [editor, pageId, onUpdate, registerEditor]);

  if (!editor) return null;

  return <EditorContent editor={editor} className="book-page-prose" />;
}
