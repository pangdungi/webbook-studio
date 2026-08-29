import { buildPdfBufferFromBook } from "@/lib/pdf/buildPdfBuffer";
import type { Book, Chapter } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/server";
import { normalizeBookBodyFont } from "@/lib/typography/bodyFonts";
import { normalizeBookHeadingFonts } from "@/lib/typography/headingFonts";

type DraftPdfResult =
  | {
      ok: true;
      book: Book;
      chapters: Pick<Chapter, "title" | "content_json" | "content_html">[];
      buffer: Buffer;
    }
  | { ok: false; error: string; status: number };

export async function buildDraftPdfBuffer(
  bookId: string,
  adminUserId: string,
): Promise<DraftPdfResult> {
  const supabase = await createClient();

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .eq("created_by", adminUserId)
    .single();

  if (bookError || !book) {
    return { ok: false, error: "책을 찾을 수 없습니다.", status: 404 };
  }

  const { data: chapters, error: chaptersError } = await supabase
    .from("chapters")
    .select("title, content_json, content_html")
    .eq("book_id", bookId)
    .order("sort_order", { ascending: true });

  if (chaptersError || !chapters?.length) {
    return { ok: false, error: "챕터가 없습니다.", status: 400 };
  }

  try {
    const buffer = await buildPdfBufferFromBook(
      {
        ...book,
        heading_fonts: normalizeBookHeadingFonts(book.heading_fonts),
        body_font: normalizeBookBodyFont(book.body_font),
      },
      chapters,
    );
    return { ok: true, book, chapters, buffer };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "PDF를 만들 수 없습니다.";
    return { ok: false, error: message, status: 500 };
  }
}
