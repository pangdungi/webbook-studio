import { getTextSerializersFromSchema } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { extractEditorPlainWithMap } from "@/lib/spellcheck/applyToEditor";

export type EditorBlockRole = "title" | "subtitle" | "body" | "other";

export type EditorBlockLine = {
  /** doc 안 텍스트블록 순서 (applyParagraphAtIndex와 동일) */
  blockIndex: number;
  text: string;
  /** getEditorPlainText() 기준 시작 위치 */
  start: number;
  role: EditorBlockRole;
  /** 패널 표시용: 제목, 부제, 1문단, 2문단 … */
  label: string;
};

function getTextblockPlain(
  node: ProseMirrorNode,
  serializers: ReturnType<typeof getTextSerializersFromSchema>,
): string {
  return extractEditorPlainWithMap(node, serializers).plain;
}

function inferBlockRole(node: ProseMirrorNode): EditorBlockRole {
  if (node.type.name === "heading") return "title";
  const cls = String(node.attrs?.class ?? "");
  if (cls.includes("book-page-subtitle")) return "subtitle";
  if (cls.includes("book-body-p")) return "body";
  return "other";
}

/** 편집기 블록 순서·역할·plain offset (글검사 문단 번호와 본문 apply 인덱스 통일) */
export function listEditorBlockLines(editor: Editor): EditorBlockLine[] {
  const serializers = getTextSerializersFromSchema(editor.schema);
  const plain = extractEditorPlainWithMap(editor.state.doc, serializers).plain;
  const lines: EditorBlockLine[] = [];
  let blockIndex = 0;
  let bodyCount = 0;
  let searchFrom = 0;

  editor.state.doc.forEach((child) => {
    if (!child.isTextblock) return;

    const text = getTextblockPlain(child, serializers);
    const role = inferBlockRole(child);
    let label: string;
    if (role === "title") label = "제목";
    else if (role === "subtitle") label = "부제";
    else if (role === "body") {
      bodyCount += 1;
      label = `${bodyCount}문단`;
    } else {
      label = `${blockIndex + 1}번째 줄`;
    }

    const start = text.length > 0 ? plain.indexOf(text, searchFrom) : searchFrom;
    const safeStart = start === -1 ? searchFrom : start;
    searchFrom = safeStart + text.length;
    if (searchFrom < plain.length && plain[searchFrom] === "\n") searchFrom += 1;

    lines.push({
      blockIndex,
      text,
      start: safeStart,
      role,
      label,
    });
    blockIndex += 1;
  });

  return lines;
}
