import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_COVER_BG,
  DEFAULT_COVER_TITLE,
  normalizeCoverColor,
} from "@/lib/books/coverStyle";
import { normalizeBookHeadingFonts } from "@/lib/typography/headingFonts";

type RouteContext = { params: Promise<{ bookId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await context.params;
  const supabase = await createClient();

  const { data: book, error } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .eq("created_by", admin.id)
    .single();

  if (error || !book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const { data: chapters } = await supabase
    .from("chapters")
    .select("*")
    .eq("book_id", bookId)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ book, chapters: chapters ?? [] });
}

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await context.params;
  const body = await request.json();
  const supabase = await createClient();

  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string") updates.title = body.title;
  if (typeof body.subtitle === "string") updates.subtitle = body.subtitle;
  if (typeof body.writing_mode === "string")
    updates.writing_mode = body.writing_mode;
  if (typeof body.cover_path === "string") updates.cover_path = body.cover_path;
  if (body.heading_fonts && typeof body.heading_fonts === "object") {
    updates.heading_fonts = normalizeBookHeadingFonts(body.heading_fonts);
  }
  if (typeof body.cover_bg_color === "string") {
    updates.cover_bg_color = normalizeCoverColor(
      body.cover_bg_color,
      DEFAULT_COVER_BG,
    );
  }
  if (typeof body.cover_title_color === "string") {
    updates.cover_title_color = normalizeCoverColor(
      body.cover_title_color,
      DEFAULT_COVER_TITLE,
    );
  }

  const { data, error } = await supabase
    .from("books")
    .update(updates)
    .eq("id", bookId)
    .eq("created_by", admin.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ book: data });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await context.params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("books")
    .delete()
    .eq("id", bookId)
    .eq("created_by", admin.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
