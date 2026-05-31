import { NextResponse } from "next/server";
import { blockNonLocalEditorMutation } from "@/lib/editor/requireLocalEditor";
import {
  ensurePrimaryReaderToken,
  primaryReaderUrlsByBookId,
} from "@/lib/access/bookToken";
import { buildReaderUrl } from "@/lib/utils/tokens";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("created_by", admin.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bookIds = (data ?? []).map((b) => b.id);
  const readerUrls = await primaryReaderUrlsByBookId(supabase, bookIds);

  const books = await Promise.all(
    (data ?? []).map(async (book) => {
      let readerUrl = readerUrls[book.id] ?? null;
      if (!readerUrl) {
        const token = await ensurePrimaryReaderToken(supabase, book.id);
        readerUrl = buildReaderUrl(token.token);
      }
      return { ...book, readerUrl };
    }),
  );

  return NextResponse.json({ books });
}

export async function POST(request: Request) {
  const blocked = blockNonLocalEditorMutation(request);
  if (blocked) return blocked;

  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title : "새 책";

  const supabase = await createClient();
  const { data: book, error: bookError } = await supabase
    .from("books")
    .insert({ title, created_by: admin.id })
    .select()
    .single();

  if (bookError || !book) {
    return NextResponse.json(
      { error: bookError?.message ?? "Failed to create book" },
      { status: 500 },
    );
  }

  const { error: chapterError } = await supabase.from("chapters").insert({
    book_id: book.id,
    title: "1장",
    sort_order: 0,
  });

  if (chapterError) {
    return NextResponse.json({ error: chapterError.message }, { status: 500 });
  }

  try {
    await ensurePrimaryReaderToken(supabase, book.id);
  } catch (tokenError) {
    return NextResponse.json(
      {
        error:
          tokenError instanceof Error
            ? tokenError.message
            : "독자 링크 생성에 실패했습니다.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ book }, { status: 201 });
}
