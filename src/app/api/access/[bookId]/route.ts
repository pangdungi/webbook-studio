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

  const { data: book } = await supabase
    .from("books")
    .select("id")
    .eq("id", bookId)
    .eq("created_by", admin.id)
    .single();

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const { data: tokens, error } = await supabase
    .from("book_access_tokens")
    .select("*")
    .eq("book_id", bookId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    tokens: (tokens ?? []).map((t) => ({
      ...t,
      url: buildReaderUrl(t.token),
    })),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const supabase = await createClient();

  const { data: book } = await supabase
    .from("books")
    .select("id, status")
    .eq("id", bookId)
    .eq("created_by", admin.id)
    .single();

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  if (book.status !== "published") {
    return NextResponse.json(
      { error: "출판된 책만 링크를 생성할 수 있습니다." },
      { status: 400 },
    );
  }

  const token = generateAccessToken();
  const label = typeof body.label === "string" ? body.label : "general";
  const expiresInDays =
    typeof body.expires_in_days === "number" ? body.expires_in_days : null;

  const expires_at = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
    : null;

  const { data, error } = await supabase
    .from("book_access_tokens")
    .insert({ book_id: bookId, token, label, expires_at })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    token: data,
    url: buildReaderUrl(data.token),
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await context.params;
  const { tokenId } = await request.json();
  const supabase = await createClient();

  const { error } = await supabase
    .from("book_access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId)
    .eq("book_id", bookId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
