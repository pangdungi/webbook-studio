import { normalizeBookCoverStyle } from "@/lib/books/coverStyle";
import { normalizeBookReaderFields } from "@/lib/books/readerFields";
import { normalizeBookHeadingFonts } from "@/lib/typography/headingFonts";
import type { Book, Chapter } from "@/lib/types/database";

export type BookVersionChapterSnapshot = {
  id: string;
  title: string;
  sort_order: number;
  content_json: Record<string, unknown>;
  content_html: string;
};

export type BookVersionBookSnapshot = {
  title: string;
  subtitle: string | null;
  cover_path: string | null;
  cover_bg_color: string;
  cover_title_color: string;
  heading_fonts: Book["heading_fonts"];
  reader_pitch: string;
  reader_analysis: Book["reader_analysis"];
};

export type BookVersionSnapshot = {
  book: BookVersionBookSnapshot;
  chapters: BookVersionChapterSnapshot[];
};

export type BookVersion = {
  id: string;
  book_id: string;
  label: string;
  snapshot: BookVersionSnapshot;
  created_by: string;
  created_at: string;
};

export function buildBookVersionSnapshot(
  book: Book,
  chapters: Chapter[],
): BookVersionSnapshot {
  const normalized = {
    ...book,
    ...normalizeBookCoverStyle(book),
    heading_fonts: normalizeBookHeadingFonts(book.heading_fonts),
    ...normalizeBookReaderFields(book),
  };

  return {
    book: {
      title: normalized.title,
      subtitle: normalized.subtitle,
      cover_path: normalized.cover_path,
      cover_bg_color: normalized.cover_bg_color,
      cover_title_color: normalized.cover_title_color,
      heading_fonts: normalized.heading_fonts,
      reader_pitch: normalized.reader_pitch,
      reader_analysis: normalized.reader_analysis,
    },
    chapters: [...chapters]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({
        id: c.id,
        title: c.title,
        sort_order: c.sort_order,
        content_json: c.content_json,
        content_html: c.content_html,
      })),
  };
}

export function formatAutoVersionLabel(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `자동 · ${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function chaptersFromSnapshot(
  bookId: string,
  snapshot: BookVersionSnapshot,
  existing: Chapter[],
): Chapter[] {
  const byId = new Map(existing.map((c) => [c.id, c]));
  return snapshot.chapters.map((ch) => {
    const prev = byId.get(ch.id);
    return {
      id: ch.id,
      book_id: bookId,
      parent_id: prev?.parent_id ?? null,
      sort_order: ch.sort_order,
      title: ch.title,
      content_json: ch.content_json,
      content_html: ch.content_html,
      created_at: prev?.created_at ?? new Date().toISOString(),
      updated_at: prev?.updated_at ?? new Date().toISOString(),
    };
  });
}

export function snapshotFingerprint(snapshot: BookVersionSnapshot): string {
  try {
    return JSON.stringify(snapshot);
  } catch {
    return String(Date.now());
  }
}
