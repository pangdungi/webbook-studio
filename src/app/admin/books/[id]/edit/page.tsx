import { notFound } from "next/navigation";
import { EditorWorkspace } from "@/components/editor/EditorWorkspace";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditBookPage({ params }: PageProps) {
  const admin = await requireAdmin();
  if (!admin) notFound();

  const { id } = await params;
  const supabase = await createClient();

  const { data: book } = await supabase
    .from("books")
    .select("*")
    .eq("id", id)
    .eq("created_by", admin.id)
    .single();

  if (!book) notFound();

  const { data: chapters } = await supabase
    .from("chapters")
    .select("*")
    .eq("book_id", id)
    .order("sort_order", { ascending: true });

  return (
    <EditorWorkspace
      bookId={id}
      initialBook={book}
      initialChapters={chapters ?? []}
    />
  );
}
