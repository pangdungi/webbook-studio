import { NextResponse } from "next/server";
import {
  ensurePrimaryReaderToken,
  getPrimaryReaderToken,
  primaryReaderUrl,
} from "@/lib/access/bookToken";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ bookId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await context.params;
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

  let token = await getPrimaryReaderToken(supabase, bookId);
  if (!token) {
    token = await ensurePrimaryReaderToken(supabase, bookId);
  }

  return NextResponse.json({
    token,
    url: primaryReaderUrl(token),
  });
}

/** 책당 링크 하나 — 이미 있으면 그대로 반환 */
export async function POST(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await context.params;
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

  const token = await ensurePrimaryReaderToken(supabase, bookId);

  return NextResponse.json({
    token,
    url: primaryReaderUrl(token),
  });
}
