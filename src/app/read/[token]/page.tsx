import { ReaderAccessDenied } from "@/components/reader/ReaderAccessDenied";
import { ReaderPageClient } from "@/components/reader/ReaderPageClient";
import { validateReaderToken } from "@/lib/access/validate";
import { normalizeBookBodyFont } from "@/lib/typography/bodyFonts";
import { normalizeBookHeadingFonts } from "@/lib/typography/headingFonts";
import type { WritingMode } from "@/lib/types/database";

type PageProps = { params: Promise<{ token: string }> };

export default async function ReadPage({ params }: PageProps) {
  const { token } = await params;
  const record = await validateReaderToken(token);

  if (!record) {
    return (
      <ReaderAccessDenied message="유효하지 않거나 만료된 링크입니다." />
    );
  }

  const book = record.books as {
    title: string;
    status: string;
    epub_storage_path: string | null;
    writing_mode: string;
    heading_fonts?: unknown;
    body_font?: unknown;
    cover_path?: string | null;
  };
  if (book.status !== "published" || !book.epub_storage_path) {
    return (
      <ReaderAccessDenied message="아직 출판되지 않은 책이거나 파일을 찾을 수 없습니다." />
    );
  }

  return (
    <ReaderPageClient
      token={token}
      title={book.title}
      writingMode={book.writing_mode as WritingMode}
      headingFonts={normalizeBookHeadingFonts(book.heading_fonts)}
      bodyFont={normalizeBookBodyFont(book.body_font)}
      scrollCoverKey={book.cover_path ?? null}
    />
  );
}
