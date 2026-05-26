/** 챕터 콘텐츠 v2 — 페이지 단위 (PowerPoint/A4 기준) */
export const CHAPTER_CONTENT_VERSION = 2;

export type PageKind = "chapter-cover" | "content" | "quote";

export type BookPage = {
  id: string;
  kind: PageKind;
  /** TipTap ProseMirror doc */
  content: Record<string, unknown>;
  /** EPUB·미리보기용 HTML (페이지 캔버스 안) */
  content_html: string;
};

export type ChapterContentV2 = {
  version: typeof CHAPTER_CONTENT_VERSION;
  pages: BookPage[];
};
