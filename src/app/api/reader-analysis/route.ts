import { NextResponse } from "next/server";
import { runReaderAnalysis } from "@/lib/readerAnalysis";
import { requireAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const pitch = typeof body.pitch === "string" ? body.pitch : "";
  const bookTitle = typeof body.bookTitle === "string" ? body.bookTitle : "";
  const sampleText =
    typeof body.sampleText === "string" ? body.sampleText : undefined;

  try {
    const result = await runReaderAnalysis({ pitch, bookTitle, sampleText });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "독자 분석에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
