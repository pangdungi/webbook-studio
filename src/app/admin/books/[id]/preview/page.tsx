import { BookPreviewClient } from "@/components/reader/BookPreviewClient";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeBookHeadingFonts } from "@/lib/typography/headingFonts";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BookPreviewPage({ params }: PageProps) {
  const admin = await requireAdmin();
  if (!admin) {
    return null;
  }

  const { id: bookId } = await params;
  const supabase = await createClient();

  const { data: book } = await supabase
    .from("books")
    .select("id, title, writing_mode, heading_fonts")
    .eq("id", bookId)
    .eq("created_by", admin.id)
    .single();

  if (!book) {
    return (
      <main className="flex h-dvh items-center justify-center bg-stone-100 text-sm text-stone-600">
        책을 찾을 수 없습니다.
      </main>
    );
  }

  return (
    <BookPreviewClient
      bookId={book.id}
      title={book.title}
      writingMode={book.writing_mode}
      headingFonts={normalizeBookHeadingFonts(book.heading_fonts)}
    />
  );
}
