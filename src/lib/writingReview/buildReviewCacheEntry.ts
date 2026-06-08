import type { SpellCorrection } from "@/lib/types/database";
import type { WritingReviewCacheEntry } from "@/lib/editor/writingAssistCache";
import {
  buildReviewParagraphsFromPlain,
  deriveReviewHighlightsFromPlain,
} from "@/lib/writingReview/compare";
import {
  attachNotesToParagraphs,
  type ParagraphNote,
} from "@/lib/writingReview/paragraphNotes";
import { anchorCorrectionsToText } from "@/lib/spellcheck/localRules";

export function buildReviewCacheEntry(
  original: string,
  revised: string,
  notes: ParagraphNote[],
  meta: {
    summary?: string;
    provider?: string | null;
    alignWarning?: string | null;
    error?: string | null;
    scannedLength: number;
  },
): WritingReviewCacheEntry {
  const { paragraphs, meta: diffMeta } = buildReviewParagraphsFromPlain(
    original,
    revised,
  );
  const withNotes = attachNotesToParagraphs(paragraphs, notes);
  const highlights: SpellCorrection[] = anchorCorrectionsToText(
    original,
    deriveReviewHighlightsFromPlain(original, withNotes),
  );

  return {
    original,
    revised,
    summary: meta.summary ?? "",
    paragraphs: withNotes,
    highlights,
    appliedParagraphs: [],
    paragraphNotes: notes,
    provider: meta.provider ?? null,
    alignWarning: meta.alignWarning ?? diffMeta.warning ?? null,
    error: meta.error ?? null,
    scannedLength: meta.scannedLength,
  };
}
