import { NextResponse } from "next/server";
import { validateReaderToken } from "@/lib/access/validate";
import { normalizeBookHeadingFonts } from "@/lib/typography/headingFonts";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const record = await validateReaderToken(token);

  if (!record) {
    return NextResponse.json(
      { error: "유효하지 않거나 만료된 링크입니다." },
      { status: 403 },
    );
  }

  const book = record.books;
  if (book.status !== "published" || !book.epub_storage_path) {
    return NextResponse.json(
      { error: "아직 출판되지 않은 책입니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    title: book.title,
    writingMode: book.writing_mode,
    headingFonts: normalizeBookHeadingFonts(book.heading_fonts),
    epubUrl: `/api/read/${token}/epub`,
  });
}
