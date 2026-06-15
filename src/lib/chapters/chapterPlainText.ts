import { buildContentPageStorageHtml } from "@/lib/editor/contentPageStorageHtml";
import { parseChapterContent } from "@/lib/pages/content";
import type { BookPage } from "@/lib/pages/types";
import type { Chapter } from "@/lib/types/database";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pagePlainText(page: BookPage): string {
  if (page.kind === "chapter-cover") return "";

  let html = page.content_html?.trim() ?? "";
  if (!html && page.kind === "content") {
    html = buildContentPageStorageHtml(page);
  }

  return stripHtml(html);
}

/** 장 단위 평문 — content_json.pages[] 기준 (chapter.content_html은 비어 있음) */
export function chapterPlainText(
  chapter: Pick<Chapter, "content_json" | "content_html" | "title">,
): string {
  const parsed = parseChapterContent(
    chapter.content_json,
    chapter.title,
    chapter.content_html ?? "",
  );

  return parsed.pages.map(pagePlainText).filter(Boolean).join("\n\n");
}
