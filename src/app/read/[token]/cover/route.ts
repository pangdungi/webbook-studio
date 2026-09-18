import {
  applyTrialVisitorCookieToResponse,
  validateReaderRouteAccess,
} from "@/lib/access/readerRouteAccess";
import { guessImageMimeFromPath } from "@/lib/books/resolveCoverImageUrl";
import { createServiceClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ token: string }> };

/** 출판 독자 — 표지 이미지 (토큰 검증 후 storage에서 스트리밍) */
export async function GET(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const access = await validateReaderRouteAccess(request, token);

  if (!access.record) {
    return new Response("Forbidden", { status: 403 });
  }

  const book = access.record.books;
  if (book.status !== "published" || !book.cover_path) {
    return new Response("Not Found", { status: 404 });
  }

  const service = createServiceClient();
  const { data, error } = await service.storage
    .from("book-assets")
    .download(book.cover_path);

  if (error || !data) {
    return new Response("Not Found", { status: 404 });
  }

  const buf = Buffer.from(await data.arrayBuffer());
  const contentType = data.type || guessImageMimeFromPath(book.cover_path);
  const secure = new URL(request.url).protocol === "https:";

  return applyTrialVisitorCookieToResponse(
    new Response(buf, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    }),
    token,
    access,
    secure,
  );
}
