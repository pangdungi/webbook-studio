import { NextResponse } from "next/server";
import {
  ensureTrialReaderToken,
  getTrialReaderToken,
  readerTokenUrl,
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
    .select("id, status")
    .eq("id", bookId)
    .eq("created_by", admin.id)
    .single();

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const token = await getTrialReaderToken(supabase, bookId);

  return NextResponse.json({
    trial: token
      ? {
          url: readerTokenUrl(token),
          trial_days: token.trial_days,
          created_at: token.created_at,
        }
      : null,
  });
}

/** 책당 7일권 공유 URL 하나 — 모두 같은 주소, 각자 첫 클릭부터 7일 */
export async function POST(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await context.params;
  const supabase = await createClient();

  const { data: book } = await supabase
    .from("books")
    .select("id, status")
    .eq("id", bookId)
    .eq("created_by", admin.id)
    .single();

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  if (book.status !== "published") {
    return NextResponse.json(
      { error: "출판된 책만 7일권 링크를 만들 수 있습니다." },
      { status: 400 },
    );
  }

  try {
    const token = await ensureTrialReaderToken(supabase, bookId);

    return NextResponse.json(
      {
        trial: {
          url: readerTokenUrl(token),
          trial_days: token.trial_days,
          created_at: token.created_at,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "7일권 링크 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
