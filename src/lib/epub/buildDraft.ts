import { buildEpubBuffer } from "@/lib/epub/builder";
import type { Book, Chapter } from "@/lib/types/database";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type DraftEpubResult =
  | { ok: true; book: Book; chapters: Pick<Chapter, "title" | "content_html">[]; buffer: Buffer }
  | { ok: false; error: string; status: number };

/** DB에 저장된 최신 내용으로 EPUB 생성 (출판 여부와 무관) */
export async function buildDraftEpubBuffer(
  bookId: string,
  adminUserId: string,
): Promise<DraftEpubResult> {
  const supabase = await createClient();
  const service = createServiceClient();

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
    .select("title, content_html")
    .eq("book_id", bookId)
    .order("sort_order", { ascending: true });

  if (chaptersError || !chapters?.length) {
    return { ok: false, error: "미리볼 챕터가 없습니다.", status: 400 };
  }

  let coverUrl: string | null = null;
  if (book.cover_path) {
    const { data: signed } = await service.storage
      .from("book-assets")
      .createSignedUrl(book.cover_path, 3600);
    coverUrl = signed?.signedUrl ?? null;
  }

  const buffer = await buildEpubBuffer(book, chapters, coverUrl);
  return { ok: true, book, chapters, buffer };
}
