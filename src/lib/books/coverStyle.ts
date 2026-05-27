export const DEFAULT_COVER_BG = "#2d4a6f";
export const DEFAULT_COVER_TITLE = "#ffffff";

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function normalizeCoverColor(
  value: unknown,
  fallback: string,
): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!HEX_RE.test(trimmed)) return fallback;
  if (trimmed.length === 4) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return trimmed.toLowerCase();
}

export type BookCoverStyle = {
  cover_bg_color: string;
  cover_title_color: string;
};

export function normalizeBookCoverStyle(
  book: Partial<BookCoverStyle>,
): BookCoverStyle {
  return {
    cover_bg_color: normalizeCoverColor(
      book.cover_bg_color,
      DEFAULT_COVER_BG,
    ),
    cover_title_color: normalizeCoverColor(
      book.cover_title_color,
      DEFAULT_COVER_TITLE,
    ),
  };
}
