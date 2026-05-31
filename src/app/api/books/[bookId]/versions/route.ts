import { NextResponse } from "next/server";
import { blockNonLocalEditorMutation } from "@/lib/editor/requireLocalEditor";
import {
  buildBookVersionSnapshot,
  type BookVersionSnapshot,
} from "@/lib/books/bookVersionSnapshot";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ bookId: string }> };

async function loadBookForAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookId: string,
  adminId: string,
) {
  const { data: book } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .eq("created_by", adminId)
    .single();

  if (!book) return null;

  const { data: chapters } = await supabase
    .from("chapters")
    .select("*")
    .eq("book_id", bookId)
    .order("sort_order", { ascending: true });

  return { book, chapters: chapters ?? [] };
}

export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await context.params;
  const supabase = await createClient();

  const owned = await loadBookForAdmin(supabase, bookId, admin.id);
  if (!owned) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("book_versions")
    .select("id, book_id, label, created_at, created_by")
    .eq("book_id", bookId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ versions: data ?? [] });
}

export async function POST(request: Request, context: RouteContext) {
  const blocked = blockNonLocalEditorMutation(request);
  if (blocked) return blocked;

  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label.trim() : "";

  if (!label) {
    return NextResponse.json({ error: "버전 이름이 필요합니다." }, { status: 400 });
  }

  const supabase = await createClient();
  const owned = await loadBookForAdmin(supabase, bookId, admin.id);
  if (!owned) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  let snapshot: BookVersionSnapshot;
  if (body.snapshot && typeof body.snapshot === "object") {
    snapshot = body.snapshot as BookVersionSnapshot;
  } else {
    snapshot = buildBookVersionSnapshot(owned.book, owned.chapters);
  }

  const { data, error } = await supabase
    .from("book_versions")
    .insert({
      book_id: bookId,
      label,
      snapshot,
      created_by: admin.id,
    })
    .select("id, book_id, label, created_at")
    .single();

  if (error) {
    if (/book_versions|does not exist/i.test(error.message)) {
      return NextResponse.json(
        {
          error: `${error.message}\n\nSupabase에서 supabase/migrations/20260531120000_book_versions.sql 을 실행하세요.`,
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ version: data }, { status: 201 });
}
