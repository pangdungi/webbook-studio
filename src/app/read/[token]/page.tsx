import { cookies } from "next/headers";
import { ReaderAccessDenied } from "@/components/reader/ReaderAccessDenied";
import { ReaderPageClient } from "@/components/reader/ReaderPageClient";
import { READER_SESSION_COOKIE } from "@/lib/access/readerSession";
import { validateReaderToken } from "@/lib/access/validate";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/admin";
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

  const book = record.books;
  if (book.status !== "published" || !book.epub_storage_path) {
    return (
      <ReaderAccessDenied message="아직 출판되지 않은 책이거나 파일을 찾을 수 없습니다." />
    );
  }

  /* 관리자가 독자 링크를 테스트할 때는 플랫폼 잠금 쿠키를 넣지 않음 */
  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;
  if (profile?.role !== "admin") {
    const cookieStore = await cookies();
    cookieStore.set(READER_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
  }

  return (
    <ReaderPageClient
      token={token}
      title={book.title}
      writingMode={book.writing_mode as WritingMode}
      headingFonts={normalizeBookHeadingFonts(book.heading_fonts)}
    />
  );
}
