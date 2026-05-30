import { NextResponse } from "next/server";
import { runSpellcheckLocal, runSpellcheckWithAi } from "@/lib/spellcheck";
import { requireAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const text = body?.text;
  if (typeof text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const result = body?.ai === true
    ? await runSpellcheckWithAi(text)
    : runSpellcheckLocal(text);
  return NextResponse.json(result);
}
