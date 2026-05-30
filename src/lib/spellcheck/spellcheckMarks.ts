import type { Editor } from "@tiptap/react";
import type { SpellCorrection } from "@/lib/types/database";
import { correctionToDocRange } from "@/lib/spellcheck/applyToEditor";
import type {
  IssueHighlightVariant,
  SpellcheckMark,
} from "@/components/editor/SpellcheckHighlightExtension";

export function spellcheckMarkId(correction: SpellCorrection, index: number) {
  return `${correction.offset}:${correction.from}:${correction.to}:${index}`;
}

export function marksFromCorrections(
  editor: Editor,
  corrections: SpellCorrection[],
): SpellcheckMark[] {
  const marks: SpellcheckMark[] = [];
  corrections.forEach((correction, index) => {
    const range = correctionToDocRange(editor, correction);
    if (!range) return;
    marks.push({
      id: spellcheckMarkId(correction, index),
      correction,
      from: range.from,
      to: range.to,
    });
  });
  return marks;
}

export function syncSpellcheckHighlights(
  editor: Editor | null,
  corrections: SpellCorrection[],
  variant: IssueHighlightVariant = "spellcheck",
) {
  if (!editor) return;
  const marks = marksFromCorrections(editor, corrections);
  editor.commands.setSpellcheckMarks(marks, variant);
}

export function focusIssueInEditor(
  editor: Editor | null,
  correction: SpellCorrection,
): boolean {
  if (!editor) return false;
  const range = correctionToDocRange(editor, correction);
  if (!range) return false;
  editor
    .chain()
    .focus()
    .setTextSelection({ from: range.from, to: range.to })
    .scrollIntoView()
    .run();
  return true;
}

export function clearSpellcheckHighlights(editor: Editor | null) {
  editor?.commands.clearSpellcheckMarks();
}
