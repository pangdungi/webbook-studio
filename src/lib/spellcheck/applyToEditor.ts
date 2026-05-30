import { getTextSerializersFromSchema } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { SpellCorrection } from "@/lib/types/database";

export const SPELLCHECK_BLOCK_SEPARATOR = "\n";

type DocBlockJson = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: { type: string; text: string }[];
};

type TextSerializers = ReturnType<typeof getTextSerializersFromSchema>;

/** TipTap getText(getTextBetween)와 동일한 plain + offset→doc 위치 매핑 */
export function extractEditorPlainWithMap(
  doc: ProseMirrorNode,
  textSerializers: TextSerializers,
  range: { from: number; to: number } = { from: 0, to: doc.content.size },
): { plain: string; map: number[] } {
  const { from, to } = range;
  const map: number[] = [];
  let plain = "";

  doc.nodesBetween(from, to, (node, pos, parent, index) => {
    if (node.isBlock && pos > from) {
      for (let i = 0; i < SPELLCHECK_BLOCK_SEPARATOR.length; i++) {
        map.push(-1);
        plain += SPELLCHECK_BLOCK_SEPARATOR[i];
      }
    }

    const serializer = textSerializers[node.type.name];
    if (serializer) {
      if (parent) {
        const serialized = serializer({ node, pos, parent, index, range });
        for (let i = 0; i < serialized.length; i++) {
          map.push(-1);
          plain += serialized[i];
        }
      }
      return false;
    }

    if (node.isText && node.text) {
      const start = Math.max(from, pos) - pos;
      const end = Math.min(node.text.length, to - pos);
      const slice = node.text.slice(start, end);
      plain += slice;
      for (let i = start; i < end; i++) {
        map.push(pos + i);
      }
    }
  });

  return { plain, map };
}

function getTextblockPlain(
  node: ProseMirrorNode,
  textSerializers: TextSerializers,
): string {
  return extractEditorPlainWithMap(node, textSerializers).plain;
}

export function getEditorPlainText(editor: Editor) {
  const serializers = getTextSerializersFromSchema(editor.schema);
  return extractEditorPlainWithMap(editor.state.doc, serializers).plain;
}

export function resolveCorrectionOffset(
  plain: string,
  correction: SpellCorrection,
): number | null {
  const { from } = correction;
  const hint =
    typeof correction.offset === "number" && correction.offset >= 0
      ? correction.offset
      : 0;

  if (plain.slice(hint, hint + from.length) === from) {
    return hint;
  }

  const matches: number[] = [];
  let idx = plain.indexOf(from);
  while (idx !== -1) {
    matches.push(idx);
    idx = plain.indexOf(from, idx + 1);
  }

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  return matches.reduce((best, current) =>
    Math.abs(current - hint) < Math.abs(best - hint) ? current : best,
  );
}

function textblockToJson(node: ProseMirrorNode, line: string): DocBlockJson {
  const content = line.length > 0 ? [{ type: "text", text: line }] : [];

  if (node.type.name === "heading") {
    return {
      type: "heading",
      attrs: node.attrs as Record<string, unknown>,
      content,
    };
  }

  return {
    type: "paragraph",
    attrs: node.attrs as Record<string, unknown>,
    content,
  };
}

export function applyOneCorrectionToEditor(
  editor: Editor,
  correction: SpellCorrection,
): boolean {
  const { to } = correction;
  const range = correctionToDocRange(editor, correction);
  if (!range) return false;

  const applied = editor.commands.command(({ tr, dispatch }) => {
    if (dispatch) {
      tr.insertText(to, range.from, range.to);
    }
    return true;
  });

  if (applied) {
    editor.commands.focus();
  }

  return applied;
}

export function correctionToDocRange(
  editor: Editor,
  correction: SpellCorrection,
): { from: number; to: number } | null {
  const serializers = getTextSerializersFromSchema(editor.schema);
  const { plain, map } = extractEditorPlainWithMap(editor.state.doc, serializers);
  const offset = resolveCorrectionOffset(plain, correction);
  if (offset === null) return null;

  const end = offset + correction.from.length;
  if (
    end > map.length ||
    map[offset] === -1 ||
    map[end - 1] === -1
  ) {
    return null;
  }

  const from = map[offset];
  const to = map[end - 1] + 1;
  const actual = editor.state.doc.textBetween(from, to);
  if (actual !== correction.from) return null;

  return { from, to };
}

export function applyAllCorrectionsToEditor(
  editor: Editor,
  corrections: SpellCorrection[],
) {
  const sorted = [...corrections].sort((a, b) => b.offset - a.offset);
  for (const correction of sorted) {
    applyOneCorrectionToEditor(editor, correction);
  }
}

function listTextblockPlains(
  doc: ProseMirrorNode,
  serializers: TextSerializers,
): string[] {
  const lines: string[] = [];
  doc.forEach((child) => {
    if (child.isTextblock) {
      lines.push(getTextblockPlain(child, serializers));
    }
  });
  return lines;
}

/** 문단 수가 같으면 줄 단위로 바로 매핑 (LLM revisedText용) */
function splitCorrectedByLineCount(
  correctedText: string,
  blockCount: number,
): string[] | null {
  const lines = correctedText.split("\n");
  if (lines.length !== blockCount) return null;
  return lines;
}

/** 문단(텍스트블록) 단위로 교정문을 나눠 반영 */
function splitCorrectedByTextblocks(
  doc: ProseMirrorNode,
  correctedText: string,
  serializers: TextSerializers,
): string[] | null {
  const originals: string[] = [];
  doc.forEach((child) => {
    if (child.isTextblock) {
      originals.push(getTextblockPlain(child, serializers));
    }
  });

  if (originals.length === 0) return null;

  let remaining = correctedText;
  const result: string[] = [];

  for (let i = 0; i < originals.length; i++) {
    const orig = originals[i];
    const hasSep = i < originals.length - 1;

    if (remaining.startsWith(orig)) {
      result.push(orig);
      remaining = remaining.slice(orig.length);
    } else {
      if (hasSep) {
        const sepAt = remaining.indexOf(SPELLCHECK_BLOCK_SEPARATOR);
        if (sepAt === -1) return null;
        result.push(remaining.slice(0, sepAt));
        remaining = remaining.slice(sepAt + SPELLCHECK_BLOCK_SEPARATOR.length);
      } else {
        result.push(remaining);
        remaining = "";
      }
    }

    if (hasSep && remaining.startsWith(SPELLCHECK_BLOCK_SEPARATOR)) {
      remaining = remaining.slice(SPELLCHECK_BLOCK_SEPARATOR.length);
    }
  }

  if (remaining.length > 0) return null;
  return result;
}

/**
 * 교정된 전체 텍스트를 문단 단위로 반영.
 * hardBreak(문단 내 줄바꿈)는 한 블록 안에서 유지한다.
 */
export function applyCorrectedPlainTextToEditor(
  editor: Editor,
  correctedText: string,
): boolean {
  const serializers = getTextSerializersFromSchema(editor.schema);
  const { plain: original } = extractEditorPlainWithMap(
    editor.state.doc,
    serializers,
  );
  if (original === correctedText) return true;

  const blockPlains = listTextblockPlains(editor.state.doc, serializers);
  if (blockPlains.length === 0) return false;

  let blockLines =
    splitCorrectedByLineCount(correctedText, blockPlains.length) ??
    splitCorrectedByTextblocks(editor.state.doc, correctedText, serializers);

  if (!blockLines) {
    const trimmed = correctedText.trim();
    const normalizedOriginal = original.trim();
    if (trimmed === normalizedOriginal) return true;
    return false;
  }

  if (blockLines.length !== blockPlains.length) return false;

  const newContent: DocBlockJson[] = [];
  let lineIdx = 0;
  let changed = false;

  editor.state.doc.forEach((child) => {
    if (child.isTextblock) {
      const line = blockLines[lineIdx] ?? "";
      lineIdx += 1;
      if (getTextblockPlain(child, serializers) !== line) changed = true;
      newContent.push(textblockToJson(child, line));
      return;
    }

    if (child.type.name === "image") {
      newContent.push(child.toJSON() as DocBlockJson);
      return;
    }

    if (child.type.name === "horizontalRule") {
      newContent.push({ type: "horizontalRule" });
    }
  });

  if (!changed) return false;

  editor
    .chain()
    .focus()
    .setContent({ type: "doc", content: newContent }, { emitUpdate: true })
    .run();

  return true;
}

/** plain text 문단 index(0-based, \\n 구분)만 다듬은 문단으로 교체 */
export function applyParagraphAtIndex(
  editor: Editor,
  paragraphIndex: number,
  newText: string,
): boolean {
  const serializers = getTextSerializersFromSchema(editor.schema);
  const newContent: DocBlockJson[] = [];
  let lineIdx = 0;
  let changed = false;

  editor.state.doc.forEach((child) => {
    if (child.isTextblock) {
      const current = getTextblockPlain(child, serializers);
      const line = lineIdx === paragraphIndex ? newText : current;
      if (lineIdx === paragraphIndex && current !== newText) changed = true;
      newContent.push(textblockToJson(child, line));
      lineIdx += 1;
      return;
    }

    if (child.type.name === "image") {
      newContent.push(child.toJSON() as DocBlockJson);
      return;
    }

    if (child.type.name === "horizontalRule") {
      newContent.push({ type: "horizontalRule" });
    }
  });

  if (!changed) return false;

  editor
    .chain()
    .focus()
    .setContent({ type: "doc", content: newContent }, { emitUpdate: true })
    .run();

  return true;
}

export function shiftCorrectionsAfterApply(
  corrections: SpellCorrection[],
  applied: SpellCorrection,
): SpellCorrection[] {
  const delta = applied.to.length - applied.from.length;
  return corrections
    .filter(
      (c) =>
        !(
          c.offset === applied.offset &&
          c.from === applied.from &&
          c.to === applied.to
        ),
    )
    .map((c) =>
      c.offset > applied.offset ? { ...c, offset: c.offset + delta } : c,
    );
}
