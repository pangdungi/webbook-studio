import { NextResponse } from "next/server";
import { runWritingEvaluation } from "@/lib/writingEvaluation";
import { requireAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const text = body?.text;
  const pageSubtitle =
    typeof body?.pageSubtitle === "string" ? body.pageSubtitle : "";

  if (typeof text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  try {
    const result = await runWritingEvaluation(text, pageSubtitle);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "글평가에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
