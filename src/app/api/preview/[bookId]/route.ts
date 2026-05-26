import { NextResponse } from "next/server";
import { buildReaderUrl, generateAccessToken } from "@/lib/utils/tokens";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ bookId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await context.params;
  const supabase = await createClient();

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .eq("created_by", admin.id)
    .single();

  if (bookError || !book) {
    return NextResponse.json({ error: "책을 찾을 수 없습니다." }, { status: 404 });
  }

  if (book.status !== "published" || !book.epub_storage_path) {
    return NextResponse.json(
      { error: "출판된 책만 미리볼 수 있습니다. 먼저 출판해 주세요." },
      { status: 400 },
    );
  }

  let { data: accessToken } = await supabase
    .from("book_access_tokens")
    .select("token")
    .eq("book_id", bookId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!accessToken?.token) {
    const token = generateAccessToken();
    const { data: created } = await supabase
      .from("book_access_tokens")
      .insert({ book_id: bookId, token, label: "general" })
      .select("token")
      .single();
    accessToken = created;
  }

  return NextResponse.json({
    title: book.title,
    writingMode: book.writing_mode,
    readerUrl: accessToken?.token ? buildReaderUrl(accessToken.token) : null,
  });
}
