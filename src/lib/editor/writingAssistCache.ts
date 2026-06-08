import type { WritingEvaluationReport } from "@/lib/writingEvaluation/types";
import type { SpellCorrection } from "@/lib/types/database";
import type { ReviewParagraphChunk } from "@/lib/writingReview/compare";
import type { ParagraphNote } from "@/lib/writingReview/paragraphNotes";

export type WritingReviewCacheEntry = {
  original: string;
  revised: string;
  summary: string;
  paragraphs: ReviewParagraphChunk[];
  highlights: SpellCorrection[];
  appliedParagraphs: number[];
  paragraphNotes: ParagraphNote[];
  provider: string | null;
  alignWarning: string | null;
  error: string | null;
  scannedLength: number;
};

export type WritingEvalCacheEntry = {
  report: WritingEvaluationReport | null;
  provider: string | null;
  warning: string | null;
  error: string | null;
  scannedLength: number;
  pageSubtitle: string;
};

export type AssistPendingEntry = {
  scannedLength: number;
};

const reviewCache = new Map<string, WritingReviewCacheEntry>();
const evalCache = new Map<string, WritingEvalCacheEntry>();
const reviewPending = new Map<string, AssistPendingEntry>();
const evalPending = new Map<string, AssistPendingEntry>();

export function writingAssistPageKey(
  bookId: string,
  chapterId: string,
  pageId: string,
): string {
  return `${bookId}:${chapterId}:${pageId}`;
}

export function getWritingReviewCache(
  key: string,
): WritingReviewCacheEntry | undefined {
  return reviewCache.get(key);
}

export function setWritingReviewCache(
  key: string,
  entry: WritingReviewCacheEntry,
): void {
  reviewCache.set(key, entry);
}

export function getWritingEvalCache(
  key: string,
): WritingEvalCacheEntry | undefined {
  return evalCache.get(key);
}

export function setWritingEvalCache(
  key: string,
  entry: WritingEvalCacheEntry,
): void {
  evalCache.set(key, entry);
}

export function getWritingReviewPending(
  key: string,
): AssistPendingEntry | undefined {
  return reviewPending.get(key);
}

export function setWritingReviewPending(
  key: string,
  entry: AssistPendingEntry,
): void {
  reviewPending.set(key, entry);
}

export function clearWritingReviewPending(key: string): void {
  reviewPending.delete(key);
}

export function isWritingReviewPending(key: string): boolean {
  return reviewPending.has(key);
}

export function getWritingEvalPending(
  key: string,
): AssistPendingEntry | undefined {
  return evalPending.get(key);
}

export function setWritingEvalPending(
  key: string,
  entry: AssistPendingEntry,
): void {
  evalPending.set(key, entry);
}

export function clearWritingEvalPending(key: string): void {
  evalPending.delete(key);
}

export function isWritingEvalPending(key: string): boolean {
  return evalPending.has(key);
}
