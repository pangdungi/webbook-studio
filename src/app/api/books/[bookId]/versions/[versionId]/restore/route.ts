import { NextResponse } from "next/server";
import type { BookVersionSnapshot } from "@/lib/books/bookVersionSnapshot";
import { applyBookVersionSnapshot } from "@/lib/books/applyBookVersionSnapshot";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ bookId: string; versionId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
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

  const { data: version, error: loadError } = await supabase
    .from("book_versions")
    .select("snapshot")
    .eq("id", versionId)
    .eq("book_id", bookId)
    .single();

  if (loadError || !version?.snapshot) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  try {
    await applyBookVersionSnapshot(
      supabase,
      bookId,
      version.snapshot as BookVersionSnapshot,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "복원 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { data: chapters } = await supabase
    .from("chapters")
    .select("*")
    .eq("book_id", bookId)
    .order("sort_order", { ascending: true });

  const { data: updatedBook } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .single();

  return NextResponse.json({
    ok: true,
    book: updatedBook,
    chapters: chapters ?? [],
  });
}
