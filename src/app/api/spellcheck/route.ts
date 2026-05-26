import { NextResponse } from "next/server";
import { runSpellcheck } from "@/lib/spellcheck";
import { requireAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text } = await request.json();
  if (typeof text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const result = await runSpellcheck(text);
  return NextResponse.json(result);
}
