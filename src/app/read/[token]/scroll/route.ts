import { NextResponse, type NextRequest } from "next/server";
import {
  applyTrialVisitorCookie,
  validateReaderRouteAccess,
} from "@/lib/access/readerRouteAccess";
import { loadPublishedBookScrollData } from "@/lib/reader/loadBookScrollData";
import { READER_SCROLL_DOC_VERSION } from "@/lib/reader/scrollDocVersion";

type RouteContext = { params: Promise<{ token: string }> };

/** 독자 스크롤 — 한 페이지 HTML (웹 스크롤) */
export async function GET(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const access = await validateReaderRouteAccess(request, token);

  if (!access.record) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await loadPublishedBookScrollData(access.record.books.id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const secure = new URL(request.url).protocol === "https:";
  const response = NextResponse.json(
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

  return applyTrialVisitorCookie(response, token, access, secure);
}
