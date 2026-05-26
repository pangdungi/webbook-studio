import { streamEpubFromStorage } from "@/lib/epub/streamEpub";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ bookId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { bookId } = await context.params;
  const supabase = await createClient();

  const { data: book, error } = await supabase
    .from("books")
    .select("epub_storage_path, status, created_by")
    .eq("id", bookId)
    .eq("created_by", admin.id)
    .single();

  if (error || !book?.epub_storage_path || book.status !== "published") {
    return new Response("Not found", { status: 404 });
  }

  const response = await streamEpubFromStorage(book.epub_storage_path);
  if (!response) {
    return new Response("EPUB unavailable", { status: 500 });
  }

  return response;
}
