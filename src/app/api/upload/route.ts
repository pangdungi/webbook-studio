import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const bookId = formData.get("bookId") as string | null;

  if (!file || !bookId) {
    return NextResponse.json(
      { error: "file and bookId are required" },
      { status: 400 },
    );
  }

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

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${bookId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from("book-assets")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: signed } = await supabase.storage
    .from("book-assets")
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  return NextResponse.json({
    path,
    url: signed?.signedUrl ?? null,
  });
}
