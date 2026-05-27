import { NextResponse } from "next/server";
import { buildEpubBuffer } from "@/lib/epub/builder";
import { buildPdfBufferFromBook } from "@/lib/pdf/buildPdfBuffer";
import { buildReaderUrl } from "@/lib/utils/tokens";
import { ensurePrimaryReaderToken } from "@/lib/access/bookToken";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { normalizeBookCoverStyle } from "@/lib/books/coverStyle";
import { normalizeBookHeadingFonts } from "@/lib/typography/headingFonts";

type RouteContext = { params: Promise<{ bookId: string }> };

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(_request: Request, context: RouteContext) {
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

  let coverUrl: string | null = null;
  if (book.cover_path) {
    const { data: signed } = await service.storage
      .from("book-assets")
      .createSignedUrl(book.cover_path, 3600);
    coverUrl = signed?.signedUrl ?? null;
  }

  const bookForExport = {
    ...book,
    ...normalizeBookCoverStyle(book),
    heading_fonts: normalizeBookHeadingFonts(book.heading_fonts),
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

  const pdfPath = `${bookId}/book.pdf`;
  let pdfStoragePath: string | null = null;
  let pdfError: string | null = null;

  try {
    const pdfBuffer = await buildPdfBufferFromBook(bookForExport, chapters);
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
    }
  } catch (err) {
    pdfError =
      err instanceof Error ? err.message : "PDF 생성에 실패했습니다.";
  }

  const { data: updatedBook, error: updateError } = await supabase
    .from("books")
    .update({
      status: "published",
      epub_storage_path: epubPath,
      pdf_storage_path: pdfStoragePath,
      published_at: new Date().toISOString(),
    })
    .eq("id", bookId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const primaryToken = await ensurePrimaryReaderToken(supabase, bookId);

  return NextResponse.json({
    book: updatedBook,
    readerUrl: buildReaderUrl(primaryToken.token),
    token: primaryToken.token,
    pdfReady: Boolean(pdfStoragePath),
    pdfError,
    pdfDownloadUrl: pdfStoragePath
      ? `/api/books/${bookId}/pdf`
      : null,
  });
}
