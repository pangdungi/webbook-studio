import { NextResponse } from "next/server";
import { duplicateBook } from "@/lib/books/duplicateBook";
import { blockNonLocalEditorMutation } from "@/lib/editor/requireLocalEditor";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ bookId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const blocked = blockNonLocalEditorMutation(request);
  if (blocked) return blocked;

  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await context.params;

  try {
    const { book, chapters } = await duplicateBook(
      await createClient(),
      bookId,
      admin.id,
    );

    return NextResponse.json({ book, chapters }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "책 복제에 실패했습니다.";
    const status = message === "Book not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
