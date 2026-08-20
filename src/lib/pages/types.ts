/** 챕터 콘텐츠 v2 — 페이지 단위 (PowerPoint/A4 기준) */
export const CHAPTER_CONTENT_VERSION = 2;

export type PageKind = "chapter-cover" | "content" | "quote";

/** 본문 페이지 레이아웃 — aside: 회색·고딕 보충 페이지 */
export type PageLayout = "aside";

export type BookPage = {
  id: string;
  kind: PageKind;
  /** content 전용 — aside면 어사이드(보충) 스타일 */
  layout?: PageLayout;
  /** 목차 서브 항목 — 비우면 첫 중·소제목 또는 기본 라벨 */
  title?: string;
  /** TipTap ProseMirror doc */
  content: Record<string, unknown>;
  /** EPUB·미리보기용 HTML (페이지 캔버스 안) */
  content_html: string;
  /** 편집기 전용 — 작성·검수 완료 표시 (출판·리더 무시) */
  editor_done?: boolean;
  /** 편집기 전용 — 페이지 메모 (출판·리더 무시) */
  editor_memo?: string;
};

export type ChapterContentV2 = {
  version: typeof CHAPTER_CONTENT_VERSION;
  pages: BookPage[];
};
