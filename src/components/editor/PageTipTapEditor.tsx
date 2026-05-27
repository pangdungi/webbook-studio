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
  initialContentHtml?: string;
  onUpdate: (pageId: string, json: Record<string, unknown>, html: string) => void;
  registerEditor: (pageId: string, editor: Editor | null) => void;
};

function isEmptyDoc(content: Record<string, unknown>) {
  const nodes = content.content;
  if (!Array.isArray(nodes) || nodes.length === 0) return true;
  if (nodes.length > 1) return false;
  const first = nodes[0] as { type?: string; content?: unknown[] };
  return first.type === "paragraph" && (!first.content || first.content.length === 0);
}

export function PageTipTapEditor({
  pageId,
  initialContent,
  initialContentHtml = "",
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
    if (
      initialContentHtml.trim() &&
      isEmptyDoc(initialContent) &&
      !editor.getText().trim()
    ) {
      editor.commands.setContent(initialContentHtml);
    }
  }, [editor, initialContent, initialContentHtml]);

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
