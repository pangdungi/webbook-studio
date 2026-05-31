import type { SpellCorrection } from "@/lib/types/database";
import type { EditorBlockLine } from "@/lib/writingReview/editorBlocks";

const MAX_HIGHLIGHTS = 120;
const MAX_INLINE_LEN = 240;
const MIN_SIMILARITY_ALIGN = 0.12;
const COUNT_TOLERANCE = 2;

export type ReviewParagraphChunk = {
  blockIndex: number;
  label: string;
  original: string;
  revised: string;
  changed: boolean;
  /** 이 문단의 문제 (AI 또는 diff 추정) */
  problem?: string;
  /** 수정 포인트 / 이렇게 고치면 */
  suggestion?: string;
  /** 위반·해당 기준 키 */
  criteria?: string[];
};

export type ReviewAlignMeta = {
  blockCount: number;
  revisedLineCount: number;
  changedCount: number;
  warning?: string;
};

function lineSimilarity(a: string, b: string): number {
  if (!a.trim() || !b.trim()) return 0;
  const longer = Math.max(a.length, b.length, 1);
  let prefix = 0;
  const limit = Math.min(a.length, b.length);
  while (prefix < limit && a[prefix] === b[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < a.length - prefix &&
    suffix < b.length - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix++;
  }
  return (prefix + suffix) / longer;
}

function normalizeCompareText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** 입력과 같은 줄 수일 때 N번째 줄 ↔ N번째 블록 */
function alignByIndex(
  blockTexts: string[],
  revLines: string[],
): string[] {
  return blockTexts.map((orig, i) => {
    const rev = revLines[i];
    if (rev === undefined) return orig;
    return rev;
  });
}

/** 줄 수가 다를 때만 유사도로 짝짓기 */
function alignBySimilarity(
  blockTexts: string[],
  revLines: string[],
): string[] {
  const usedRev = new Set<number>();

  return blockTexts.map((orig, i) => {
    if (!orig.trim()) return orig;

    const indexCandidate = revLines[i];
    if (
      indexCandidate !== undefined &&
      !usedRev.has(i) &&
      indexCandidate.trim() !== orig.trim()
    ) {
      usedRev.add(i);
      return indexCandidate;
    }

    let bestJ = -1;
    let bestScore = 0;
    for (let j = 0; j < revLines.length; j++) {
      if (usedRev.has(j)) continue;
      const score = lineSimilarity(orig, revLines[j]);
      if (score > bestScore) {
        bestScore = score;
        bestJ = j;
      }
    }

    if (bestJ >= 0 && bestScore >= MIN_SIMILARITY_ALIGN) {
      usedRev.add(bestJ);
      return revLines[bestJ];
    }

    if (indexCandidate !== undefined && !usedRev.has(i)) {
      usedRev.add(i);
      return indexCandidate;
    }

    return orig;
  });
}

function countNonEmptyLines(lines: string[]): number {
  return lines.filter((l) => l.trim()).length;
}

/** AI가 줄을 합쳤을 때 — 빈 블록은 유지, 내용 있는 블록에만 순서대로 대입 */
function alignNonEmptyBlocksSequential(
  blockTexts: string[],
  revLines: string[],
): string[] {
  const revQueue = revLines.filter((l) => l.trim());
  let r = 0;
  return blockTexts.map((orig) => {
    if (!orig.trim()) return orig;
    const next = revQueue[r];
    r += 1;
    return next !== undefined ? next : orig;
  });
}

function alignRevisedToBlocks(
  blocks: EditorBlockLine[],
  revisedPlain: string,
): string[] {
  const blockTexts = blocks.map((b) => b.text);
  const revLines = revisedPlain.split("\n");
  const countDiff = Math.abs(revLines.length - blockTexts.length);
  const nonEmptyDiff = Math.abs(
    countNonEmptyLines(blockTexts) - countNonEmptyLines(revLines),
  );

  if (countDiff === 0) {
    return alignByIndex(blockTexts, revLines);
  }

  if (countDiff <= COUNT_TOLERANCE) {
    return alignByIndex(blockTexts, revLines);
  }

  if (nonEmptyDiff <= COUNT_TOLERANCE) {
    return alignNonEmptyBlocksSequential(blockTexts, revLines);
  }

  let aligned = alignBySimilarity(blockTexts, revLines);

  const origJoined = blockTexts.join("\n");
  const globalChanged =
    normalizeCompareText(origJoined) !== normalizeCompareText(revisedPlain);
  const changedInAligned = aligned.filter(
    (rev, i) => blockTexts[i].trim() !== rev.trim(),
  ).length;
  const nonEmptyBlocks = blockTexts.filter((t) => t.trim()).length;

  if (
    globalChanged &&
    nonEmptyBlocks > 0 &&
    changedInAligned < Math.max(2, nonEmptyBlocks * 0.2)
  ) {
    aligned = alignByIndex(blockTexts, revLines);
  }

  return aligned;
}

function commonPrefixLen(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  let i = 0;
  while (i < limit && a[i] === b[i]) i++;
  return i;
}

function commonSuffixLen(a: string, b: string): number {
  let i = 0;
  while (
    i < a.length &&
    i < b.length &&
    a[a.length - 1 - i] === b[b.length - 1 - i]
  ) {
    i++;
  }
  return i;
}

function spansInLine(
  original: string,
  revised: string,
  lineOffset: number,
): SpellCorrection[] {
  if (original === revised || !original) return [];

  const prefix = commonPrefixLen(original, revised);
  const fromMid = original.slice(prefix);
  const toMid = revised.slice(prefix);
  const suffix = commonSuffixLen(fromMid, toMid);
  const from = fromMid.slice(0, fromMid.length - suffix);
  const to = toMid.slice(0, toMid.length - suffix);

  if (from && to && from.length <= MAX_INLINE_LEN) {
    return [
      {
        from,
        to,
        reason: "다듬음",
        offset: lineOffset + prefix,
      },
    ];
  }

  if (original.length <= 800) {
    return [
      {
        from: original,
        to: revised,
        reason: "다듬음",
        offset: lineOffset,
      },
    ];
  }

  return [];
}

export function buildReviewParagraphs(
  blocks: EditorBlockLine[],
  revisedPlain: string,
): { paragraphs: ReviewParagraphChunk[]; meta: ReviewAlignMeta } {
  const aligned = alignRevisedToBlocks(blocks, revisedPlain);
  const revLines = revisedPlain.split("\n");

  const paragraphs = blocks.map((block, i) => {
    const orig = block.text;
    const rev = aligned[i] ?? orig;
    return {
      blockIndex: block.blockIndex,
      label: block.label,
      original: orig,
      revised: rev,
      changed: orig.trim() !== rev.trim(),
    };
  });

  const changedCount = paragraphs.filter((p) => p.changed).length;
  const blockCount = blocks.length;
  const revisedLineCount = revLines.length;

  const nonEmptyBlocks = blocks.filter((b) => b.text.trim()).length;
  const nonEmptyRevised = revLines.filter((l) => l.trim()).length;
  const alignmentLooksOk =
    changedCount >= Math.max(1, Math.min(nonEmptyBlocks, nonEmptyRevised) * 0.25);

  let warning: string | undefined;
  if (
    Math.abs(blockCount - revisedLineCount) > COUNT_TOLERANCE &&
    !alignmentLooksOk
  ) {
    warning = `다듬은 글 줄 수(${revisedLineCount})와 본문 블록 수(${blockCount})가 달라 문단 매칭이 어긋날 수 있습니다. 「검사를 다시하기」를 눌러 주세요.`;
  } else if (
    changedCount <= 1 &&
    normalizeCompareText(blocks.map((b) => b.text).join("\n")) !==
      normalizeCompareText(revisedPlain)
  ) {
    warning =
      "요약에는 수정이 있는데 문단별로는 거의 안 잡혔습니다. 아래 「다듬은 글 전체」와 본문 밑줄을 확인하거나 글검사를 다시 실행해 주세요.";
  }

  return {
    paragraphs,
    meta: { blockCount, revisedLineCount, changedCount, warning },
  };
}

export function deriveReviewHighlights(
  blocks: EditorBlockLine[],
  chunks: ReviewParagraphChunk[],
): SpellCorrection[] {
  const issues: SpellCorrection[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const block = blocks[i];
    if (!chunk.changed || !block) continue;
    issues.push(
      ...spansInLine(chunk.original, chunk.revised, block.start),
    );
  }

  return issues.slice(0, MAX_HIGHLIGHTS);
}

/** AI revisedText를 편집기 블록 수에 맞게 재조합 (줄 수 불일치 보정) */
export function joinAlignedRevisedText(
  blocks: EditorBlockLine[],
  revisedPlain: string,
): string {
  return alignRevisedToBlocks(blocks, revisedPlain).join("\n");
}

export function buildReviewParagraphsFromPlain(
  original: string,
  revised: string,
): { paragraphs: ReviewParagraphChunk[]; meta: ReviewAlignMeta } {
  const blocks = original.split("\n").map((text, blockIndex) => ({
    blockIndex,
    text,
    start: 0,
    role: "body" as const,
    label: `${blockIndex + 1}문단`,
  }));

  return buildReviewParagraphs(blocks, revised);
}

export function deriveReviewHighlightsFromPlain(
  original: string,
  chunks: ReviewParagraphChunk[],
): SpellCorrection[] {
  const issues: SpellCorrection[] = [];
  let offset = 0;
  const lines = original.split("\n");

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const line = lines[i] ?? "";
    if (chunk.changed) {
      issues.push(...spansInLine(chunk.original, chunk.revised, offset));
    }
    offset += line.length;
    if (i < lines.length - 1) offset += 1;
  }

  return issues.slice(0, MAX_HIGHLIGHTS);
}
