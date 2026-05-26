export type QuotePageContent = {
  type: "quote";
  quote: string;
  source: string;
};

export const EMPTY_QUOTE_CONTENT: QuotePageContent = {
  type: "quote",
  quote: "",
  source: "",
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isQuotePageContent(
  content: Record<string, unknown>,
): content is QuotePageContent {
  return content.type === "quote";
}

export function parseQuotePageContent(
  content: Record<string, unknown>,
): QuotePageContent {
  if (isQuotePageContent(content)) {
    return {
      type: "quote",
      quote: typeof content.quote === "string" ? content.quote : "",
      source: typeof content.source === "string" ? content.source : "",
    };
  }

  return structuredClone(EMPTY_QUOTE_CONTENT);
}

export function quoteContentToHtml(quote: string, source: string): string {
  const q = quote.trim();
  const s = source.trim();

  if (!q && !s) {
    return `<div class="book-quote-page"><blockquote class="book-quote-text"></blockquote><p class="book-quote-source"></p></div>`;
  }

  const quoteHtml = q ? escapeHtml(q) : "";
  const sourceHtml = s ? `— ${escapeHtml(s)}` : "";

  return `<div class="book-quote-page"><blockquote class="book-quote-text">${quoteHtml}</blockquote><p class="book-quote-source">${sourceHtml}</p></div>`;
}
