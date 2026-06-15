import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { EditorWorkspace } from "@/components/editor/EditorWorkspace";
import { LocalEditorGate } from "@/components/editor/LocalEditorGate";
import { isLocalDevHostname } from "@/lib/editor/localEditorOnly";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeBookCoverStyle } from "@/lib/books/coverStyle";
import { resolveBookCoverSignedUrl } from "@/lib/books/resolveCoverImageUrl";
import { normalizeBookReaderFields } from "@/lib/books/readerFields";
import { normalizeBookHeadingFonts } from "@/lib/typography/headingFonts";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditBookPage({ params }: PageProps) {
  const admin = await requireAdmin();
  if (!admin) notFound();

  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  const { id } = await params;

  if (!isLocalDevHostname(host)) {
    redirect(`/admin/edit-local-only?bookId=${id}`);
  }
  const supabase = await createClient();

  const { data: book } = await supabase
    .from("books")
    .select("*")
    .eq("id", id)
    .eq("created_by", admin.id)
    .single();

  if (!book) notFound();

  const initialCoverImageUrl = await resolveBookCoverSignedUrl(
    supabase.storage,
    book.cover_path,
    60 * 60 * 24,
  );

  const { data: chapters } = await supabase
    .from("chapters")
    .select("*")
    .eq("book_id", id)
    .order("sort_order", { ascending: true });

  return (
    <LocalEditorGate bookId={id}>
      <EditorWorkspace
        bookId={id}
        initialCoverImageUrl={initialCoverImageUrl}
        initialBook={{
          ...book,
          ...normalizeBookCoverStyle(book),
          heading_fonts: normalizeBookHeadingFonts(book.heading_fonts),
          ...normalizeBookReaderFields(book),
        }}
        initialChapters={chapters ?? []}
      />
    </LocalEditorGate>
  );
}
