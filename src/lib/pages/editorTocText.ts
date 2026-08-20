import { parseChapterContent } from "@/lib/pages/content";
import { getPageTocLabel } from "@/lib/pages/pageTitle";
import type { Chapter } from "@/lib/types/database";

/** 편집기 목차 — 상세페이지 등에 붙여넣기용 plain text */
export function formatEditorTocPlainText(
  chapters: Chapter[],
  options?: { includeBookCover?: boolean },
): string {
  const lines: string[] = [];
  const includeBookCover = options?.includeBookCover ?? true;

  if (includeBookCover) {
    lines.push("책 표지", "");
  }

  for (const chapter of chapters) {
    const chapterTitle = chapter.title.trim() || "제목 없음";
    lines.push(chapterTitle);

    const parsed = parseChapterContent(
      chapter.content_json,
      chapter.title,
      chapter.content_html,
    );
    let contentPageIndex = 0;
    const pages = parsed.pages.filter((p) => p.kind !== "chapter-cover");

    for (const page of pages) {
      const label =
        page.kind === "content"
          ? getPageTocLabel(page, contentPageIndex++)
          : getPageTocLabel(page, 0);
      lines.push(`  ${label}`);
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
