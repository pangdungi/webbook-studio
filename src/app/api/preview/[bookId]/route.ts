import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ bookId: string }> };

/** 현재 저장된 내용 기준 미리보기 URL */
export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await context.params;
  const { buildDraftEpubBuffer } = await import("@/lib/epub/buildDraft");
  const result = await buildDraftEpubBuffer(bookId, admin.id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    title: result.book.title,
    writingMode: result.book.writing_mode,
    previewUrl: `/admin/books/${bookId}/preview`,
    draft: true,
  });
}
