import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { loadDraftBookScrollData } from "@/lib/reader/loadBookScrollData";

type RouteContext = { params: Promise<{ bookId: string }> };

/** 편집 미리보기 — 한 페이지 HTML (웹 스크롤) */
export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await context.params;
  const result = await loadDraftBookScrollData(bookId, admin.id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    title: result.book.title,
    bodyHtml: result.bodyHtml,
    toc: result.toc,
  });
}
