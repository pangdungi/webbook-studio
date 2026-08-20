import { NextResponse } from "next/server";
import { runChapterTitlePick } from "@/lib/chapterTitlePick";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const chapterId = typeof body.chapterId === "string" ? body.chapterId : "";
  const bookTitle = typeof body.bookTitle === "string" ? body.bookTitle : "";
  const clientChapter =
    body.chapter && typeof body.chapter === "object"
      ? (body.chapter as Record<string, unknown>)
      : null;

  if (!chapterId) {
    return NextResponse.json({ error: "chapterId is required" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: chapter, error } = await supabase
      .from("chapters")
      .select("title, content_json, content_html, sort_order, books!inner(created_by, title)")
      .eq("id", chapterId)
      .single();

    if (error || !chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    const bookMeta = chapter.books as unknown as {
      created_by: string;
      title: string;
    };
    if (bookMeta.created_by !== admin.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedBookTitle = bookTitle.trim() || bookMeta.title || "";
    const { books: _, ...chapterRow } = chapter as typeof chapter & {
      books: unknown;
    };

    const chapterForPick =
      clientChapter &&
      typeof clientChapter.title === "string" &&
      clientChapter.content_json !== undefined
        ? {
            title: clientChapter.title,
            content_json: clientChapter.content_json as Record<string, unknown>,
            content_html:
              typeof clientChapter.content_html === "string"
                ? clientChapter.content_html
                : chapterRow.content_html ?? "",
            sort_order:
              typeof clientChapter.sort_order === "number"
                ? clientChapter.sort_order
                : chapterRow.sort_order,
          }
        : chapterRow;

    const result = await runChapterTitlePick(chapterForPick, resolvedBookTitle);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "장 제목 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
