import { createServiceClient } from "@/lib/supabase/server";

export async function streamPdfFromStorage(pdfPath: string) {
  const service = createServiceClient();
  const { data, error } = await service.storage.from("book-epubs").download(pdfPath);

  if (error || !data) {
    return null;
  }

  const buffer = await data.arrayBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, max-age=300",
    },
  });
}
