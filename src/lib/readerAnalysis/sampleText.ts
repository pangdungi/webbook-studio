import { chapterPlainText } from "@/lib/chapters/chapterPlainText";
import type { Chapter } from "@/lib/types/database";

const DEFAULT_MAX = 3500;

/** 챕터 원고에서 독자 분석용 발췌 (선택) */
export function buildChapterSample(
  chapters: Chapter[],
  maxLen = DEFAULT_MAX,
): string {
  const sorted = [...chapters].sort((a, b) => a.sort_order - b.sort_order);
  const parts: string[] = [];
  let len = 0;

  for (const ch of sorted) {
    const text = chapterPlainText(ch);
    if (!text) continue;
    const block = `[${ch.title}]\n${text}`;
    if (len + block.length > maxLen) {
      const remain = maxLen - len;
      if (remain > 80) parts.push(`${block.slice(0, remain)}…`);
      break;
    }
    parts.push(block);
    len += block.length;
  }

  return parts.join("\n\n");
}
