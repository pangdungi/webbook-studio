import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { SpellCorrection } from "@/lib/types/database";

export const SPELLCHECK_BLOCK_SEPARATOR = "\n";

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

/** 교정된 전체 텍스트를 문단 단위로 반영 (이미지·제목 구조 유지) */
export function applyCorrectedPlainTextToEditor(
  editor: Editor,
  correctedText: string,
): boolean {
  const original = getEditorPlainText(editor);
  if (original === correctedText) return true;

  const correctedLines = correctedText.split("\n");
  const updates: { from: number; to: number; text: string }[] = [];
  let lineIdx = 0;

  editor.state.doc.content.forEach((node, offset) => {
    if (!node.isTextblock) return;

    const newText = correctedLines[lineIdx] ?? "";
    lineIdx += 1;
    if (node.textContent === newText) return;

    const blockPos = offset + 1;
    updates.push({
      from: blockPos + 1,
      to: blockPos + node.nodeSize - 1,
      text: newText,
    });
  });

  if (updates.length === 0) return false;

  const { tr } = editor.state;
  for (const update of updates.sort((a, b) => b.from - a.from)) {
    if (update.text.length === 0) {
      tr.delete(update.from, update.to);
      continue;
    }
    tr.replaceWith(update.from, update.to, editor.schema.text(update.text));
  }

  editor.view.dispatch(tr);
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
