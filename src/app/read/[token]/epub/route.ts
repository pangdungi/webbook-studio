import {
  applyTrialVisitorCookieToResponse,
  validateReaderRouteAccess,
} from "@/lib/access/readerRouteAccess";
import { streamEpubFromStorage } from "@/lib/epub/streamEpub";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const access = await validateReaderRouteAccess(request, token);

  if (!access.record) {
    return new Response("Forbidden", { status: 403 });
  }

  const book = access.record.books;
  if (book.status !== "published" || !book.epub_storage_path) {
    return new Response("Not found", { status: 404 });
  }

  const response = await streamEpubFromStorage(book.epub_storage_path);
  if (!response) {
    return new Response("EPUB unavailable", { status: 500 });
  }

  const secure = new URL(request.url).protocol === "https:";
  return applyTrialVisitorCookieToResponse(response, token, access, secure);
}
