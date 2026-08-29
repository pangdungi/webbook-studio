import { NextResponse } from "next/server";
import { buildEpubBuffer } from "@/lib/epub/builder";
import { buildPdfBufferFromBook } from "@/lib/pdf/buildPdfBuffer";
import { buildReaderUrl } from "@/lib/utils/tokens";
import { ensurePrimaryReaderToken } from "@/lib/access/bookToken";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { resolveBookCoverSignedUrl } from "@/lib/books/resolveCoverImageUrl";
import { normalizeBookCoverStyle } from "@/lib/books/coverStyle";
import { normalizeBookBodyFont } from "@/lib/typography/bodyFonts";
import { normalizeBookHeadingFonts } from "@/lib/typography/headingFonts";

type RouteContext = { params: Promise<{ bookId: string }> };

export const runtime = "nodejs";
export const maxDuration = 300;

const PDF_PUBLISH_TIMEOUT_MS = 55_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} 시간 초과 (${Math.round(ms / 1000)}초)`)), ms);
    }),
  ]);
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    return await publishBook(_request, context);
  } catch (err) {
    console.error("[publish]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "출판 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}

async function publishBook(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await context.params;
  const supabase = await createClient();
  const service = createServiceClient();

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .eq("created_by", admin.id)
    .single();

  if (bookError || !book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const { data: chapters, error: chaptersError } = await supabase
    .from("chapters")
    .select("title, content_json, content_html")
    .eq("book_id", bookId)
    .order("sort_order", { ascending: true });

  if (chaptersError || !chapters?.length) {
    return NextResponse.json(
      { error: "챕터가 없습니다." },
      { status: 400 },
    );
  }

  /* PDF·EPUB용 — signed URL (data URI는 HTML 비대·Playwright 지연) */
  const coverUrl = book.cover_path
    ? await resolveBookCoverSignedUrl(service.storage, book.cover_path, 3600)
    : null;

  const bookForExport = {
    ...book,
    ...normalizeBookCoverStyle(book),
    heading_fonts: normalizeBookHeadingFonts(book.heading_fonts),
    body_font: normalizeBookBodyFont(book.body_font),
  };

  const epubBuffer = await buildEpubBuffer(bookForExport, chapters, coverUrl);
  const epubPath = `${bookId}/book.epub`;

  const { error: uploadError } = await service.storage
    .from("book-epubs")
    .upload(epubPath, epubBuffer, {
      contentType: "application/epub+zip",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  /* EPUB 업로드 직후 출판 처리 — PDF 실패해도 웹·EPUB 독자 링크는 사용 가능 */
  const publishedAt = new Date().toISOString();
  const { data: updatedBook, error: updateError } = await supabase
    .from("books")
    .update({
      status: "published",
      epub_storage_path: epubPath,
      published_at: publishedAt,
    })
    .eq("id", bookId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const primaryToken = await ensurePrimaryReaderToken(supabase, bookId);

  const pdfPath = `${bookId}/book.pdf`;
  let pdfStoragePath: string | null = null;
  let pdfError: string | null = null;

  try {
    const pdfBuffer = await withTimeout(
      buildPdfBufferFromBook(bookForExport, chapters, coverUrl),
      PDF_PUBLISH_TIMEOUT_MS,
      "PDF 생성",
    );
    const { error: pdfUploadError } = await service.storage
      .from("book-epubs")
      .upload(pdfPath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (pdfUploadError) {
      pdfError = pdfUploadError.message;
    } else {
      pdfStoragePath = pdfPath;
      await supabase
        .from("books")
        .update({ pdf_storage_path: pdfPath })
        .eq("id", bookId);
    }
  } catch (err) {
    pdfError =
      err instanceof Error ? err.message : "PDF 생성에 실패했습니다.";
  }

  const { data: bookWithPdf } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .single();

  return NextResponse.json({
    book: bookWithPdf ?? updatedBook,
    readerUrl: buildReaderUrl(primaryToken.token),
    token: primaryToken.token,
    pdfReady: Boolean(pdfStoragePath),
    pdfError,
    pdfDownloadUrl: pdfStoragePath
      ? `/api/books/${bookId}/pdf`
      : null,
  });
}
