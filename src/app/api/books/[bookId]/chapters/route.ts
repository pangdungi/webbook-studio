import { NextResponse } from "next/server";
import {
  chapterContentToJson,
  chapterPagesToStorageHtml,
  createDefaultChapterContent,
} from "@/lib/pages/content";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ bookId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await context.params;
  const syncOnly = new URL(request.url).searchParams.get("sync") === "1";
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chapters")
    .select(syncOnly ? "id, updated_at" : "*")
    .eq("book_id", bookId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ chapters: data });
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
    .select("id")
    .eq("id", bookId)
    .eq("created_by", admin.id)
    .single();

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("chapters")
    .select("sort_order")
    .eq("book_id", bookId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;
  const title =
    typeof body.title === "string" ? body.title : `${nextOrder + 1}장`;

  const defaultContent = createDefaultChapterContent();

  const { data, error } = await supabase
    .from("chapters")
    .insert({
      book_id: bookId,
      title,
      sort_order: nextOrder,
      content_json: chapterContentToJson(defaultContent.pages),
      content_html: chapterPagesToStorageHtml(defaultContent.pages),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ chapter: data }, { status: 201 });
}

export async function PUT(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await context.params;
  const { order } = await request.json();

  if (!Array.isArray(order)) {
    return NextResponse.json({ error: "order array required" }, { status: 400 });
  }

  const supabase = await createClient();

  for (let i = 0; i < order.length; i++) {
    await supabase
      .from("chapters")
      .update({ sort_order: i })
      .eq("id", order[i])
      .eq("book_id", bookId);
  }

  return NextResponse.json({ ok: true });
}
