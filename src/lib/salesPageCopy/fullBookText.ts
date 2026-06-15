import { chapterPlainText } from "@/lib/chapters/chapterPlainText";
import type { Chapter } from "@/lib/types/database";

export type ChapterBlock = {
  title: string;
  text: string;
  sortOrder: number;
};

export type FullBookTextResult = {
  text: string;
  chapterCount: number;
  /** 본문이 있는 장 수 */
  chaptersWithText: number;
};

type ChapterLike = Pick<
  Chapter,
  "title" | "content_json" | "content_html" | "sort_order"
>;

/** 상세페이지 — 잘림 없이 전체 원고 */
export function buildChapterBlocks(chapters: ChapterLike[]): ChapterBlock[] {
  return [...chapters]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((ch) => ({
      title: ch.title,
      text: chapterPlainText(ch),
      sortOrder: ch.sort_order,
    }))
    .filter((b) => b.text.length > 0);
}

export function blocksToManuscript(blocks: ChapterBlock[]): string {
  return blocks.map((b) => `[${b.title}]\n${b.text}`).join("\n\n");
}

export function buildFullBookText(chapters: ChapterLike[]): FullBookTextResult {
  const blocks = buildChapterBlocks(chapters);
  return {
    text: blocksToManuscript(blocks),
    chapterCount: chapters.length,
    chaptersWithText: blocks.length,
  };
}

/** 한 장이 너무 길 때 문단·문장 경계에서 잘라 순차 분석 */
export function splitChapterIntoParts(
  text: string,
  maxChars: number,
): string[] {
  if (text.length <= maxChars) return [text];

  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > maxChars) {
    const slice = remaining.slice(0, maxChars);
    let cut = maxChars;

    const lastPara = slice.lastIndexOf("\n\n");
    if (lastPara > maxChars * 0.45) {
      cut = lastPara;
    } else {
      const lastBreak = Math.max(
        slice.lastIndexOf(".\n"),
        slice.lastIndexOf("。\n"),
        slice.lastIndexOf("? "),
      );
      if (lastBreak > maxChars * 0.45) cut = lastBreak + 1;
    }

    const chunk = remaining.slice(0, cut).trim();
    if (chunk) parts.push(chunk);
    remaining = remaining.slice(cut).trim();
  }

  if (remaining) parts.push(remaining);
  return parts.length > 0 ? parts : [text];
}
