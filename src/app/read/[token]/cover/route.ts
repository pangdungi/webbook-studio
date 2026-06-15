import { validateReaderToken } from "@/lib/access/validate";
import { guessImageMimeFromPath } from "@/lib/books/resolveCoverImageUrl";
import { createServiceClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ token: string }> };

/** 출판 독자 — 표지 이미지 (토큰 검증 후 storage에서 스트리밍) */
export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const record = await validateReaderToken(token);

  if (!record) {
    return new Response("Forbidden", { status: 403 });
  }

  const book = record.books as { cover_path?: string | null; status?: string };
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

  return new Response(buf, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
