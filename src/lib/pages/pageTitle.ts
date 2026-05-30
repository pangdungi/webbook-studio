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
