import { NextResponse } from "next/server";
import { blockNonLocalEditorMutation } from "@/lib/editor/requireLocalEditor";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ chapterId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const blocked = blockNonLocalEditorMutation(request);
  if (blocked) return blocked;

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

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const ifUpdatedAt =
    typeof body.if_updated_at === "string" ? body.if_updated_at : null;

  let updateQuery = supabase
    .from("chapters")
    .update(updates)
    .eq("id", chapterId);

  if (ifUpdatedAt) {
    updateQuery = updateQuery.eq("updated_at", ifUpdatedAt);
  }

  const { data, error } = await updateQuery
    .select("*, books!inner(created_by)")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    if (!ifUpdatedAt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: current, error: readError } = await supabase
      .from("chapters")
      .select("*, books!inner(created_by)")
      .eq("id", chapterId)
      .single();

    if (readError || !current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const bookMetaCurrent = current.books as unknown as { created_by: string };
    if (bookMetaCurrent.created_by !== admin.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { books: _books, ...chapter } = current;
    return NextResponse.json(
      {
        error:
          "다른 탭·다른 주소(로컬/배포)에서 더 최근에 저장된 내용이 있습니다. 이 화면을 서버에 올리지 않았습니다.",
        code: "STALE_CHAPTER",
        chapter,
      },
      { status: 409 },
    );
  }

  const bookMeta = data.books as unknown as { created_by: string };
  if (bookMeta.created_by !== admin.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { books: _, ...chapter } = data;
  return NextResponse.json({ chapter });
}

export async function DELETE(request: Request, context: RouteContext) {
  const blocked = blockNonLocalEditorMutation(request);
  if (blocked) return blocked;

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
