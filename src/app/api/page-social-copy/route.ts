import { NextResponse } from "next/server";
import { runPageSocialCopy } from "@/lib/pageSocialCopy";
import { requireAdmin } from "@/lib/supabase/admin";

export const maxDuration = 120;

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const pageText = typeof body.pageText === "string" ? body.pageText : "";
  const pageTitle =
    typeof body.pageTitle === "string" ? body.pageTitle : null;
  const chapterTitle =
    typeof body.chapterTitle === "string" ? body.chapterTitle : null;
  const bookTitle =
    typeof body.bookTitle === "string" ? body.bookTitle : null;

  if (!pageText.trim()) {
    return NextResponse.json(
      { error: "pageText is required" },
      { status: 400 },
    );
  }

  try {
    const result = await runPageSocialCopy({
      pageText,
      pageTitle,
      chapterTitle,
      bookTitle,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "SNS 카피 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
