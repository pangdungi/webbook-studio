"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { createBookEditorExtensions } from "@/lib/editor/bookEditorExtensions";
import { useLayoutEffect } from "react";

type Props = {
  pageId: string;
  initialContent: Record<string, unknown>;
  onUpdate: (pageId: string, json: Record<string, unknown>) => void;
  registerEditor: (pageId: string, editor: Editor | null) => void;
};

export function PageTipTapEditor({
  pageId,
  initialContent,
  onUpdate,
  registerEditor,
}: Props) {
  const editor = useEditor({
    extensions: createBookEditorExtensions(),
    content: initialContent,
    immediatelyRender: false,
    enableInputRules: false,
    onUpdate: ({ editor: ed }) => {
      onUpdate(pageId, ed.getJSON() as Record<string, unknown>);
    },
  });

  useLayoutEffect(() => {
    if (!editor) return;
    registerEditor(pageId, editor);
    return () => registerEditor(pageId, null);
  }, [editor, pageId, registerEditor]);

  if (!editor) return null;

  return <EditorContent editor={editor} className="book-page-prose" />;
}
