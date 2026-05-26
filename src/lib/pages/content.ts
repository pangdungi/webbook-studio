import {
  CHAPTER_CONTENT_VERSION,
  type BookPage,
  type ChapterContentV2,
  type PageKind,
} from "@/lib/pages/types";
import {
  EMPTY_QUOTE_CONTENT,
  quoteContentToHtml,
} from "@/lib/pages/quotePage";

export const EMPTY_TIPTAP_DOC: Record<string, unknown> = {
  type: "doc",
  content: [{ type: "paragraph", attrs: { class: "book-body-p" } }],
};

export function createPageId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `page-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createPage(kind: PageKind, content?: Record<string, unknown>): BookPage {
  if (kind === "chapter-cover") {
    return {
      id: createPageId(),
      kind,
      content: content ?? structuredClone(EMPTY_TIPTAP_DOC),
      content_html: "",
    };
  }

  if (kind === "quote") {
    const quoteContent = content ?? structuredClone(EMPTY_QUOTE_CONTENT);
    return {
      id: createPageId(),
      kind,
      content: quoteContent,
      content_html: quoteContentToHtml(
        typeof quoteContent.quote === "string" ? quoteContent.quote : "",
        typeof quoteContent.source === "string" ? quoteContent.source : "",
      ),
    };
  }

  return {
    id: createPageId(),
    kind,
    content: content ?? structuredClone(EMPTY_TIPTAP_DOC),
    content_html: "<p class=\"book-body-p\"></p>",
  };
}

export function createDefaultChapterContent(): ChapterContentV2 {
  return {
    version: CHAPTER_CONTENT_VERSION,
    pages: [createPage("chapter-cover"), createPage("content")],
  };
}

function isChapterContentV2(json: Record<string, unknown>): json is ChapterContentV2 {
  return (
    json.version === CHAPTER_CONTENT_VERSION &&
    Array.isArray(json.pages) &&
    json.pages.length > 0
  );
}

/** DB content_json → 페이지 배열 (레거시 단일 doc 자동 변환) */
export function parseChapterContent(
  json: Record<string, unknown>,
  _chapterTitle?: string,
  legacyHtml?: string,
): ChapterContentV2 {
  if (isChapterContentV2(json)) {
    const pages = json.pages.map((p) => ({
      id: p.id || createPageId(),
      kind:
        p.kind === "chapter-cover"
          ? "chapter-cover"
          : p.kind === "quote"
            ? "quote"
            : "content",
      content: p.content ?? structuredClone(EMPTY_TIPTAP_DOC),
      content_html: p.content_html ?? "",
    })) as BookPage[];

    const contentPages = pages.filter((p) => p.kind === "content");
    if (
      legacyHtml?.trim() &&
      contentPages.length === 1 &&
      !contentPages[0].content_html.trim()
    ) {
      contentPages[0].content_html = legacyHtml;
    }

    return { version: CHAPTER_CONTENT_VERSION, pages };
  }

  const legacyDoc =
    json.type === "doc" ? json : structuredClone(EMPTY_TIPTAP_DOC);

  return {
    version: CHAPTER_CONTENT_VERSION,
    pages: [
      createPage("chapter-cover"),
      {
        id: createPageId(),
        kind: "content",
        content: legacyDoc,
        content_html: legacyHtml ?? "",
      },
    ],
  };
}

export function chapterContentToJson(pages: BookPage[]): ChapterContentV2 {
  return { version: CHAPTER_CONTENT_VERSION, pages };
}

/** 저장용 content_html — 레거시 API 호환 */
export function chapterPagesToStorageHtml(pages: BookPage[]): string {
  return pages
    .filter((p) => p.kind === "content")
    .map((p) => p.content_html)
    .join("\n");
}
