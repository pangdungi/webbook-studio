import { buildDraftPdfBuffer } from "@/lib/pdf/buildDraft";
import { bookPdfDownloadFilename } from "@/lib/pdf/downloadFilename";
import { streamPdfFromStorage } from "@/lib/pdf/streamPdf";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

type RouteContext = { params: Promise<{ bookId: string }> };

/** 출판된 PDF 또는 현재 저장본 기준 초안 PDF */
export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { bookId } = await context.params;
  const supabase = await createClient();

  const { data: book, error } = await supabase
    .from("books")
    .select("id, title, status, pdf_storage_path")
    .eq("id", bookId)
    .eq("created_by", admin.id)
    .single();

  if (error || !book) {
    return new Response("책을 찾을 수 없습니다.", { status: 404 });
  }

  const filename = bookPdfDownloadFilename(book.title);

  if (book.status === "published" && book.pdf_storage_path) {
    const stored = await streamPdfFromStorage(book.pdf_storage_path);
    if (stored) {
      stored.headers.set(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      );
      return stored;
    }
  }

  const draft = await buildDraftPdfBuffer(bookId, admin.id);
  if (!draft.ok) {
    return new Response(draft.error, { status: draft.status });
  }

  return new Response(new Uint8Array(draft.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
