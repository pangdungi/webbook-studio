import { cookies } from "next/headers";
import { ReaderAccessDenied } from "@/components/reader/ReaderAccessDenied";
import { ReaderPageClient } from "@/components/reader/ReaderPageClient";
import { trialVisitorCookieName, trialVisitorCookieOptions } from "@/lib/access/trialAccess";
import {
  getReaderTokenDenialReason,
  readerTokenDenialMessage,
  validateReaderAccess,
} from "@/lib/access/validate";
import { normalizeBookBodyFont } from "@/lib/typography/bodyFonts";
import { normalizeBookHeadingFonts } from "@/lib/typography/headingFonts";
import type { WritingMode } from "@/lib/types/database";

type PageProps = { params: Promise<{ token: string }> };

export default async function ReadPage({ params }: PageProps) {
  const { token } = await params;
  const jar = await cookies();
  const visitorKey = jar.get(trialVisitorCookieName(token))?.value ?? null;
  const access = await validateReaderAccess(token, visitorKey);

  if (!access.record) {
    const reason =
      access.denial ??
      (await getReaderTokenDenialReason(token, visitorKey));
    return <ReaderAccessDenied message={readerTokenDenialMessage(reason)} />;
  }

  if (access.newVisitorKey) {
    jar.set(
      trialVisitorCookieName(token),
      access.newVisitorKey,
      trialVisitorCookieOptions(false),
    );
  }

  const book = access.record.books;
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
