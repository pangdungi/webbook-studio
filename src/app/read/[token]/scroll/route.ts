import { NextResponse } from "next/server";
import { validateReaderToken } from "@/lib/access/validate";
import { loadPublishedBookScrollData } from "@/lib/reader/loadBookScrollData";
import { READER_SCROLL_DOC_VERSION } from "@/lib/reader/scrollDocVersion";
type RouteContext = { params: Promise<{ token: string }> };

/** 독자 스크롤 — 한 페이지 HTML (웹 스크롤) */
export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const record = await validateReaderToken(token);

  if (!record) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await loadPublishedBookScrollData(record.books.id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      title: result.book.title,
      bodyHtml: result.bodyHtml,
      toc: result.toc,
      scrollDocVersion: READER_SCROLL_DOC_VERSION,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
