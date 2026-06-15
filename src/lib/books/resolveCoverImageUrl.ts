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

/** 독자·PDF·EPUB HTML — storage에서 직접 읽어 data URI (만료·권한 이슈 방지) */
export async function resolveBookCoverEmbedSrc(
  storage: Pick<SupabaseClient["storage"], "from">,
  coverPath: string | null | undefined,
): Promise<string | null> {
  if (!coverPath) return null;

  const { data: blob, error } = await storage
    .from("book-assets")
    .download(coverPath);

  if (!error && blob) {
    const buf = Buffer.from(await blob.arrayBuffer());
    const contentType = blob.type || guessImageMime(coverPath);
    return `data:${contentType};base64,${buf.toString("base64")}`;
  }

  const signed = await resolveBookCoverSignedUrl(storage, coverPath, 3600);
  if (!signed) return null;
  return (await fetchCoverImageDataUri(signed)) ?? signed;
}

function guessImageMime(path: string): string {
  return guessImageMimeFromPath(path);
}

export function guessImageMimeFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
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
