import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveBookCoverSignedUrl(
  storage: Pick<SupabaseClient["storage"], "from">,
  coverPath: string | null | undefined,
  expiresIn = 3600,
): Promise<string | null> {
  if (!coverPath) return null;
  const { data } = await storage
    .from("book-assets")
    .createSignedUrl(coverPath, expiresIn);
  return data?.signedUrl ?? null;
}

/** EPUB spine — 만료 없는 data URI (출판 시점에 fetch) */
export async function fetchCoverImageDataUri(
  coverUrl: string | null | undefined,
): Promise<string | null> {
  if (!coverUrl) return null;
  try {
    const res = await fetch(coverUrl);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
