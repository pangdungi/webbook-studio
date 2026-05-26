import { validateReaderToken } from "@/lib/access/validate";
import { streamEpubFromStorage } from "@/lib/epub/streamEpub";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const record = await validateReaderToken(token);

  if (!record) {
    return new Response("Forbidden", { status: 403 });
  }

  const book = record.books;
  if (book.status !== "published" || !book.epub_storage_path) {
    return new Response("Not found", { status: 404 });
  }

  const response = await streamEpubFromStorage(book.epub_storage_path);
  if (!response) {
    return new Response("EPUB unavailable", { status: 500 });
  }

  return response;
}
