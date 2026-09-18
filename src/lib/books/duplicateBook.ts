import { ensurePrimaryReaderToken } from "@/lib/access/bookToken";
import {
  copyBookStorageAssets,
  remapBookAssetInHtml,
  remapBookAssetInJson,
  remapBookCoverPath,
} from "@/lib/books/duplicateBookAssets";
import { normalizeBookCoverStyle } from "@/lib/books/coverStyle";
import { normalizeBookReaderFields } from "@/lib/books/readerFields";
import {
  chapterContentToJson,
  createDefaultChapterContent,
  createPageId,
  parseChapterContent,
} from "@/lib/pages/content";
import { normalizeBookBodyFont } from "@/lib/typography/bodyFonts";
import { normalizeBookHeadingFonts } from "@/lib/typography/headingFonts";
import type { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { Book, Chapter } from "@/lib/types/database";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function duplicateBookTitle(title: string): string {
  const trimmed = title.trim() || "제목 없음";
  return trimmed.endsWith(" (복사)") ? trimmed : `${trimmed} (복사)`;
}

async function duplicateChapterContentJson(
  contentJson: Record<string, unknown>,
  chapterTitle: string,
  contentHtml: string,
  sourceBookId: string,
  newBookId: string,
  storage: ReturnType<typeof createServiceClient>["storage"],
): Promise<{ content_json: Record<string, unknown>; content_html: string }> {
  const parsed = parseChapterContent(contentJson, chapterTitle, contentHtml);

  const pages = await Promise.all(
    parsed.pages.map(async (page) => ({
      ...page,
      id: createPageId(),
      content: (await remapBookAssetInJson(
        page.content,
        sourceBookId,
        newBookId,
        storage,
      )) as Record<string, unknown>,
      content_html: await remapBookAssetInHtml(
        page.content_html,
        sourceBookId,
        newBookId,
        storage,
      ),
    })),
  );

  return {
    content_json: chapterContentToJson(pages) as unknown as Record<
      string,
      unknown
    >,
    content_html: contentHtml,
  };
}

async function cleanupDuplicateBook(
  supabase: Supabase,
  storage: ReturnType<typeof createServiceClient>["storage"],
  bookId: string,
) {
  const { data: files } = await storage.from("book-assets").list(bookId);
  if (files?.length) {
    const paths = files
      .filter((file) => file.name && !file.name.endsWith("/"))
      .map((file) => `${bookId}/${file.name}`);
    if (paths.length > 0) {
      await storage.from("book-assets").remove(paths);
    }
  }
  await supabase.from("books").delete().eq("id", bookId);
}

export async function duplicateBook(
  supabase: Supabase,
  sourceBookId: string,
  adminId: string,
): Promise<{ book: Book; chapters: Chapter[] }> {
  const { data: sourceBook, error: bookError } = await supabase
    .from("books")
    .select("*")
    .eq("id", sourceBookId)
    .eq("created_by", adminId)
    .single();

  if (bookError || !sourceBook) {
    throw new Error("Book not found");
  }

  const { data: sourceChapters, error: chaptersError } = await supabase
    .from("chapters")
    .select("*")
    .eq("book_id", sourceBookId)
    .order("sort_order", { ascending: true });

  if (chaptersError) {
    throw new Error(chaptersError.message);
  }

  const normalizedBook = {
    ...sourceBook,
    ...normalizeBookCoverStyle(sourceBook),
    heading_fonts: normalizeBookHeadingFonts(sourceBook.heading_fonts),
    body_font: normalizeBookBodyFont(sourceBook.body_font),
    ...normalizeBookReaderFields(sourceBook),
  };

  const service = createServiceClient();
  const storage = service.storage;

  const { data: newBook, error: insertError } = await supabase
    .from("books")
    .insert({
      title: duplicateBookTitle(normalizedBook.title),
      subtitle: normalizedBook.subtitle,
      cover_path: null,
      cover_bg_color: normalizedBook.cover_bg_color,
      cover_title_color: normalizedBook.cover_title_color,
      writing_mode: normalizedBook.writing_mode,
      heading_fonts: normalizedBook.heading_fonts,
      body_font: normalizedBook.body_font,
      reader_pitch: normalizedBook.reader_pitch,
      reader_analysis: normalizedBook.reader_analysis,
      sales_page_copy: normalizedBook.sales_page_copy,
      status: "draft",
      epub_storage_path: null,
      pdf_storage_path: null,
      published_at: null,
      created_by: adminId,
    })
    .select()
    .single();

  if (insertError || !newBook) {
    throw new Error(insertError?.message ?? "책 복제 생성에 실패했습니다.");
  }

  try {
    await copyBookStorageAssets(storage, sourceBookId, newBook.id);

    const newCoverPath = remapBookCoverPath(
      normalizedBook.cover_path,
      sourceBookId,
      newBook.id,
    );

    const chapterRows = await Promise.all(
      (sourceChapters ?? []).map(async (chapter) => {
        const duplicated = await duplicateChapterContentJson(
          chapter.content_json,
          chapter.title,
          chapter.content_html,
          sourceBookId,
          newBook.id,
          storage,
        );

        return {
          book_id: newBook.id,
          parent_id: null,
          title: chapter.title,
          sort_order: chapter.sort_order,
          content_json: duplicated.content_json,
          content_html: duplicated.content_html,
        };
      }),
    );

    if (chapterRows.length === 0) {
      chapterRows.push({
        book_id: newBook.id,
        parent_id: null,
        title: "1장",
        sort_order: 0,
        content_json: chapterContentToJson(
          createDefaultChapterContent().pages,
        ) as unknown as Record<string, unknown>,
        content_html: "",
      });
    }

    const { data: insertedChapters, error: chapterInsertError } = await supabase
      .from("chapters")
      .insert(chapterRows)
      .select();

    if (chapterInsertError) {
      throw new Error(chapterInsertError.message);
    }

    const { data: updatedBook, error: coverUpdateError } = await supabase
      .from("books")
      .update({ cover_path: newCoverPath })
      .eq("id", newBook.id)
      .select()
      .single();

    if (coverUpdateError || !updatedBook) {
      throw new Error(coverUpdateError?.message ?? "표지 경로 저장에 실패했습니다.");
    }

    await ensurePrimaryReaderToken(supabase, newBook.id);

    return {
      book: updatedBook,
      chapters: insertedChapters ?? [],
    };
  } catch (error) {
    await cleanupDuplicateBook(supabase, storage, newBook.id);
    throw error;
  }
}
