import { buildDraftEpubBuffer } from "@/lib/epub/buildDraft";
import { requireAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ bookId: string }> };

/** 현재 저장된 챕터로 EPUB 즉시 생성 (미리보기 전용) */
export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { bookId } = await context.params;
  const result = await buildDraftEpubBuffer(bookId, admin.id);

  if (!result.ok) {
    return new Response(result.error, { status: result.status });
  }

  return new Response(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/epub+zip",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
