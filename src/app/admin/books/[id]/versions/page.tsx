import Link from "next/link";
import { notFound } from "next/navigation";
import { BookVersionsPageClient } from "@/components/editor/BookVersionsPageClient";
import { normalizeBookCoverStyle } from "@/lib/books/coverStyle";
import { normalizeBookReaderFields } from "@/lib/books/readerFields";
import { localEditorUrl } from "@/lib/editor/localEditorOnly";
import { normalizeBookHeadingFonts } from "@/lib/typography/headingFonts";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ id: string }> };

export default async function BookVersionsPage({ params }: PageProps) {
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
    <div className="flex h-[100dvh] flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-stone-200 bg-white px-4 py-3">
        <Link href="/" className="text-sm text-stone-500 hover:text-stone-900">
          ← 목록
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">
          {book.title} · 버전 기록
        </h1>
        <a
          href={localEditorUrl(`/admin/books/${id}/edit`)}
          className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          로컬에서 편집
        </a>
      </header>
      <BookVersionsPageClient
        bookId={id}
        initialBook={{
          ...book,
          ...normalizeBookCoverStyle(book),
          heading_fonts: normalizeBookHeadingFonts(book.heading_fonts),
          ...normalizeBookReaderFields(book),
        }}
        initialChapters={chapters ?? []}
      />
    </div>
  );
}
