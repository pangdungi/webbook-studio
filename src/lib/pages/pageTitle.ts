import type { BookPage } from "@/lib/pages/types";
import { parseQuotePageContent } from "@/lib/pages/quotePage";

export type PageLeadHeading = {
  level: 2 | 3;
  text: string;
};

function headingNodes(doc: Record<string, unknown>): Record<string, unknown>[] {
  if (doc.type !== "doc" || !Array.isArray(doc.content)) return [];
  return doc.content as Record<string, unknown>[];
}

/** TipTap doc — 첫 중·소제목 */
export function extractFirstHeadingFromDoc(
  doc: Record<string, unknown>,
): PageLeadHeading | null {
  const first = headingNodes(doc)[0];
  if (first?.type !== "heading") return null;

  const level = (first.attrs as { level?: number } | undefined)?.level ?? 2;
  const text = headingPlainText(first);
  if (!text.trim()) return null;

  return {
    level: level === 3 ? 3 : 2,
    text,
  };
}

function headingPlainText(node: Record<string, unknown>): string {
  const parts = (node.content as Record<string, unknown>[] | undefined) ?? [];
  return parts
    .map((n) => (n.type === "text" ? String(n.text ?? "") : ""))
    .join("");
}

/** 본문 페이지 부제목 — 출판·목차용 (앞뒤 공백 제거) */
export function getPageSubtitle(page: BookPage): string {
  if (page.kind !== "content") return page.title?.trim() ?? "";
  if (page.title?.trim()) return page.title.trim();
  return extractFirstHeadingFromDoc(page.content)?.text.trim() ?? "";
}

/** 부제목 입력창 값 — trim 하지 않음 (띄어쓰기 입력 유지) */
export function pageSubtitleInputValue(page: BookPage | undefined): string {
  if (!page || page.kind !== "content") return page?.title ?? "";
  if (typeof page.title === "string") return page.title;
  return extractFirstHeadingFromDoc(page.content)?.text ?? "";
}

/** 편집기 페이지 미리보기 — 입력 중 공백 유지 */
export function pageSubtitleEditorDisplay(page: BookPage): string {
  return pageSubtitleInputValue(page);
}

/** EPUB·독자 미리보기 — 부제목(lead)과 본문 doc 분리 */
export function splitPageContentLead(page: BookPage): {
  lead: PageLeadHeading | null;
  bodyDoc: Record<string, unknown>;
} {
  if (page.kind !== "content") {
    return { lead: null, bodyDoc: page.content };
  }

  const subtitle = getPageSubtitle(page);
  const docLead = extractFirstHeadingFromDoc(page.content);
  const lead = subtitle
    ? { level: (docLead?.level === 3 ? 3 : 2) as 2 | 3, text: subtitle }
    : docLead;
  const bodyDoc =
    subtitle || docLead ? contentDocWithoutLead(page.content) : page.content;

  return { lead, bodyDoc };
}

/** 목차·EPUB 제목 */
export function getPageTocLabel(
  page: BookPage,
  contentPageIndex: number,
): string {
  if (page.kind === "chapter-cover") return "표지";

  if (page.kind === "quote") {
    if (page.title?.trim()) return page.title.trim();
    const q = parseQuotePageContent(page.content);
    const excerpt = q.quote.trim().replace(/\s+/g, " ").slice(0, 28);
    if (excerpt) return excerpt.length < q.quote.trim().length ? `${excerpt}…` : excerpt;
    return "명언";
  }

  if (page.title?.trim()) return page.title.trim();

  const heading = extractFirstHeadingFromDoc(page.content);
  if (heading?.text) return heading.text;

  return `본문 ${contentPageIndex + 1}`;
}

/** 본문 doc — 첫 제목 블록 제외 */
export function contentDocWithoutLead(
  doc: Record<string, unknown>,
): Record<string, unknown> {
  if (doc.type !== "doc" || !Array.isArray(doc.content)) return doc;
  const nodes = doc.content as Record<string, unknown>[];
  if (nodes[0]?.type !== "heading") return doc;
  return { ...doc, content: nodes.slice(1) };
}

/** 첫 제목 갱신(없으면 앞에 삽입) */
export function setFirstHeadingInDoc(
  doc: Record<string, unknown>,
  text: string,
  level: 2 | 3 = 2,
): Record<string, unknown> {
  const nodes = [...headingNodes(doc)];

  const headingNode = (line: string): Record<string, unknown> => ({
    type: "heading",
    attrs: { level },
    content: line ? [{ type: "text", text: line }] : [],
  });

  if (nodes[0]?.type === "heading") {
    if (!text.trim()) {
      return { ...doc, content: nodes.slice(1) };
    }
    nodes[0] = headingNode(text);
    return { ...doc, content: nodes };
  }

  if (!text.trim()) return doc;

  return { ...doc, content: [headingNode(text), ...nodes] };
}

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 페이지 상단 부제목(첫 중·소제목) */
export function buildPageLeadHtml(lead: PageLeadHeading): string {
  const tag = lead.level === 3 ? "h3" : "h2";
  return `<${tag} class="book-page-subtitle">${escapeHtml(lead.text)}</${tag}>`;
}
