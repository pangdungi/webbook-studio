import {
  buildBookScrollDocument,
  type ReaderScrollPage,
} from "@/lib/reader/buildBookScrollDocument";
import type { Book, Chapter } from "@/lib/types/database";
import { resolveBookCoverEmbedSrc } from "@/lib/books/resolveCoverImageUrl";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type ScrollResult =
  | {
      ok: true;
      book: Pick<
        Book,
        | "title"
        | "subtitle"
        | "cover_bg_color"
        | "cover_title_color"
        | "cover_path"
      >;
      bodyHtml: string;
      toc: ReturnType<typeof buildBookScrollDocument>["toc"];
      pages: ReaderScrollPage[];
    }
  | { ok: false; error: string; status: number };

export async function loadDraftBookScrollData(
  bookId: string,
  adminUserId: string,
): Promise<ScrollResult> {
  const supabase = await createClient();

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, title, subtitle, cover_path, cover_bg_color, cover_title_color")
    .eq("id", bookId)
    .eq("created_by", adminUserId)
    .single();

  if (bookError || !book) {
    return { ok: false, error: "책을 찾을 수 없습니다.", status: 404 };
  }

  const { data: chapters, error: chaptersError } = await supabase
    .from("chapters")
    .select("id, title, content_json, content_html")
    .eq("book_id", bookId)
    .order("sort_order", { ascending: true });

  if (chaptersError || !chapters?.length) {
    return { ok: false, error: "미리볼 챕터가 없습니다.", status: 400 };
  }

  const coverImageUrl = await resolveBookCoverEmbedSrc(
    supabase.storage,
    book.cover_path,
  );
  const { bodyHtml, toc, pages } = buildBookScrollDocument(
    book,
    chapters,
    coverImageUrl,
  );
  return { ok: true, book, bodyHtml, toc, pages };
}

export async function loadPublishedBookScrollData(
  bookId: string,
): Promise<ScrollResult> {
  const service = createServiceClient();

  const { data: book, error: bookError } = await service
    .from("books")
    .select(
      "id, title, subtitle, cover_path, cover_bg_color, cover_title_color, status, epub_storage_path",
    )
    .eq("id", bookId)
    .single();

  if (bookError || !book) {
    return { ok: false, error: "책을 찾을 수 없습니다.", status: 404 };
  }

  if (book.status !== "published" || !book.epub_storage_path) {
    return { ok: false, error: "출판된 책이 아닙니다.", status: 404 };
  }

  const { data: chapters, error: chaptersError } = await service
    .from("chapters")
    .select("id, title, content_json, content_html")
    .eq("book_id", bookId)
    .order("sort_order", { ascending: true });

  if (chaptersError || !chapters?.length) {
    return { ok: false, error: "챕터가 없습니다.", status: 404 };
  }

  const coverImageUrl = book.cover_path
    ? await resolveBookCoverEmbedSrc(service.storage, book.cover_path)
    : null;
  const { bodyHtml, toc, pages } = buildBookScrollDocument(
    book,
    chapters,
    coverImageUrl,
  );
  return { ok: true, book, bodyHtml, toc, pages };
}
