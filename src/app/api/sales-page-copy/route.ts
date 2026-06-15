import { NextResponse } from "next/server";
import { normalizeReaderAnalysisReport } from "@/lib/readerAnalysis/normalize";
import { runSalesPageCopyFromChapters } from "@/lib/salesPageCopy";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** 장마다 순차 LLM 호출 — 긴 책은 수 분 소요 가능 */
export const maxDuration = 300;

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const bookId = typeof body.bookId === "string" ? body.bookId : "";
  const bookTitle = typeof body.bookTitle === "string" ? body.bookTitle : "";
  const bookSubtitle =
    typeof body.bookSubtitle === "string" ? body.bookSubtitle : null;
  const readerAnalysis = normalizeReaderAnalysisReport(body.readerAnalysis);

  if (!bookId) {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  }

  try {
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

    const { data: chapters, error: chaptersError } = await supabase
      .from("chapters")
      .select("title, content_json, content_html, sort_order")
      .eq("book_id", bookId)
      .order("sort_order", { ascending: true });

    if (chaptersError) {
      return NextResponse.json(
        { error: chaptersError.message },
        { status: 500 },
      );
    }

    const result = await runSalesPageCopyFromChapters(chapters ?? [], {
      bookTitle,
      bookSubtitle,
      readerAnalysis,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "상세페이지 문구 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
