import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { SpellCorrection } from "@/lib/types/database";

export const SPELLCHECK_BLOCK_SEPARATOR = "\n";

type DocBlockJson = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: { type: string; text: string }[];
};

/** getText와 동일한 규칙으로 global offset → doc position 매핑 */
function buildCharToDocPosMap(doc: ProseMirrorNode): number[] {
  const map: number[] = [];
  let separated = true;

  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) {
        map.push(pos + i);
      }
      separated = false;
      return;
    }

    if (node.isBlock && !separated) {
      for (let i = 0; i < SPELLCHECK_BLOCK_SEPARATOR.length; i++) {
        map.push(-1);
      }
      separated = true;
    }
  });

  return map;
}

export function getEditorPlainText(editor: Editor) {
  return editor.getText({ blockSeparator: SPELLCHECK_BLOCK_SEPARATOR });
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
  const { from, to } = correction;
  const plain = getEditorPlainText(editor);
  let offset = correction.offset;

  if (plain.slice(offset, offset + from.length) !== from) {
    offset = plain.indexOf(from);
    if (offset === -1) return false;
  }

  const end = offset + from.length;
  const map = buildCharToDocPosMap(editor.state.doc);

  if (
    offset < 0 ||
    end > map.length ||
    map[offset] === -1 ||
    map[end - 1] === -1
  ) {
    return false;
  }

  const docFrom = map[offset];
  const docTo = map[end - 1] + 1;
  const actual = editor.state.doc.textBetween(docFrom, docTo);

  if (actual !== from) {
    return false;
  }

  editor
    .chain()
    .focus()
    .insertContentAt({ from: docFrom, to: docTo }, to)
    .run();

  return true;
}

export function applyAllCorrectionsToEditor(
  editor: Editor,
  corrections: SpellCorrection[],
) {
  for (const correction of corrections) {
    applyOneCorrectionToEditor(editor, correction);
  }
}

/**
 * 교정된 전체 텍스트를 문단 단위로 반영.
 * 부분 replace 대신 doc JSON을 다시 조립해 첫 글자 중복(off-by-one)을 방지한다.
 */
export function applyCorrectedPlainTextToEditor(
  editor: Editor,
  correctedText: string,
): boolean {
  const original = getEditorPlainText(editor);
  if (original === correctedText) return true;

  const correctedLines = correctedText.split("\n");
  const newContent: DocBlockJson[] = [];
  let lineIdx = 0;
  let changed = false;

  editor.state.doc.forEach((child) => {
    if (child.isTextblock) {
      const line = correctedLines[lineIdx] ?? "";
      lineIdx += 1;
      if (child.textContent !== line) changed = true;
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

  while (lineIdx < correctedLines.length) {
    const line = correctedLines[lineIdx] ?? "";
    lineIdx += 1;
    if (!line) continue;
    changed = true;
    newContent.push({
      type: "paragraph",
      attrs: { class: "book-body-p" },
      content: [{ type: "text", text: line }],
    });
  }

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
