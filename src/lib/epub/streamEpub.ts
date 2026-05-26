import { createServiceClient } from "@/lib/supabase/server";

export async function streamEpubFromStorage(epubPath: string) {
  const service = createServiceClient();
  const { data, error } = await service.storage
    .from("book-epubs")
    .download(epubPath);

  if (error || !data) {
    return null;
  }

  const buffer = await data.arrayBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/epub+zip",
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, max-age=300",
    },
  });
}
