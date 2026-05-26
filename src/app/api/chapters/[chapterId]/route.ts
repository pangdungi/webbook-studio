import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ chapterId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chapterId } = await context.params;
  const body = await request.json();
  const supabase = await createClient();

  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string") updates.title = body.title;
  if (body.content_json !== undefined) updates.content_json = body.content_json;
  if (typeof body.content_html === "string")
    updates.content_html = body.content_html;

  const { data, error } = await supabase
    .from("chapters")
    .update(updates)
    .eq("id", chapterId)
    .select("*, books!inner(created_by)")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  }

  const bookMeta = data.books as unknown as { created_by: string };
  if (bookMeta.created_by !== admin.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { books: _, ...chapter } = data;
  return NextResponse.json({ chapter });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chapterId } = await context.params;
  const supabase = await createClient();

  const { data: chapterRow } = await supabase
    .from("chapters")
    .select("book_id, books!inner(created_by)")
    .eq("id", chapterId)
    .single();

  if (!chapterRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bookMeta = chapterRow.books as unknown as { created_by: string };
  if (bookMeta.created_by !== admin.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { count } = await supabase
    .from("chapters")
    .select("*", { count: "exact", head: true })
    .eq("book_id", chapterRow.book_id);

  if ((count ?? 0) <= 1) {
    return NextResponse.json(
      { error: "최소 1개의 챕터가 필요합니다." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("chapters").delete().eq("id", chapterId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
