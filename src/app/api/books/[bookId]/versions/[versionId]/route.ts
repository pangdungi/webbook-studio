import { NextResponse } from "next/server";
import type { BookVersionSnapshot } from "@/lib/books/bookVersionSnapshot";
import { applyBookVersionSnapshot } from "@/lib/books/applyBookVersionSnapshot";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ bookId: string; versionId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId, versionId } = await context.params;
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

  const { data, error } = await supabase
    .from("book_versions")
    .select("*")
    .eq("id", versionId)
    .eq("book_id", bookId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  return NextResponse.json({ version: data });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId, versionId } = await context.params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("book_versions")
    .delete()
    .eq("id", versionId)
    .eq("book_id", bookId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
