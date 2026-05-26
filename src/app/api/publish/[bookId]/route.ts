import { NextResponse } from "next/server";
import { buildEpubBuffer } from "@/lib/epub/builder";
import { buildReaderUrl, buildClaimUrl, generateAccessToken } from "@/lib/utils/tokens";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ bookId: string }> };

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
    .select("title, content_html")
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

  const epubBuffer = await buildEpubBuffer(book, chapters, coverUrl);
  const epubPath = `${bookId}/${Date.now()}.epub`;

  const { error: uploadError } = await service.storage
    .from("book-epubs")
    .upload(epubPath, epubBuffer, {
      contentType: "application/epub+zip",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: updatedBook, error: updateError } = await supabase
    .from("books")
    .update({
      status: "published",
      epub_storage_path: epubPath,
      published_at: new Date().toISOString(),
    })
    .eq("id", bookId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: existingToken } = await supabase
    .from("book_access_tokens")
    .select("*")
    .eq("book_id", bookId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let token = existingToken?.token;
  if (!token) {
    token = generateAccessToken();
    await supabase.from("book_access_tokens").insert({
      book_id: bookId,
      token,
      label: "general",
    });
  }

  return NextResponse.json({
    book: updatedBook,
    readerUrl: buildReaderUrl(token),
    claimUrl: buildClaimUrl(bookId),
    token,
  });
}
