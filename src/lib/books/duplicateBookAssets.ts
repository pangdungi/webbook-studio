import type { SupabaseClient } from "@supabase/supabase-js";

const BOOK_ASSETS_BUCKET = "book-assets";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365;

/** signed URL 또는 storage path → book-assets 상대 경로 */
export function extractBookAssetPath(
  src: string,
  bookId: string,
): string | null {
  const trimmed = src.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith(`${bookId}/`)) return trimmed;

  const patterns = [
    /\/storage\/v1\/object\/sign\/book-assets\/([^?]+)/,
    /\/storage\/v1\/object\/public\/book-assets\/([^?]+)/,
    /book-assets\/([^?]+)/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (!match?.[1]) continue;
    const path = decodeURIComponent(match[1]);
    if (path.startsWith(`${bookId}/`)) return path;
  }

  return null;
}

function remapAssetPath(
  path: string,
  sourceBookId: string,
  newBookId: string,
): string {
  if (!path.startsWith(`${sourceBookId}/`)) return path;
  return `${newBookId}/${path.slice(sourceBookId.length + 1)}`;
}

async function signedUrlForPath(
  storage: Pick<SupabaseClient["storage"], "from">,
  path: string,
): Promise<string | null> {
  const { data } = await storage
    .from(BOOK_ASSETS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}

export async function remapBookAssetSrc(
  src: string,
  sourceBookId: string,
  newBookId: string,
  storage: Pick<SupabaseClient["storage"], "from">,
): Promise<string> {
  const path = extractBookAssetPath(src, sourceBookId);
  if (!path) return src;

  const newPath = remapAssetPath(path, sourceBookId, newBookId);
  const signed = await signedUrlForPath(storage, newPath);
  return signed ?? src;
}

export async function remapBookAssetInHtml(
  html: string,
  sourceBookId: string,
  newBookId: string,
  storage: Pick<SupabaseClient["storage"], "from">,
): Promise<string> {
  if (!html.includes(sourceBookId)) return html;

  const srcPattern = /src="([^"]+)"/g;
  const matches = [...html.matchAll(srcPattern)];
  if (matches.length === 0) return html;

  let out = html;
  for (const match of matches) {
    const original = match[1];
    const next = await remapBookAssetSrc(
      original,
      sourceBookId,
      newBookId,
      storage,
    );
    if (next !== original) {
      out = out.replace(`src="${original}"`, `src="${next}"`);
    }
  }
  return out;
}

export async function remapBookAssetInJson(
  value: unknown,
  sourceBookId: string,
  newBookId: string,
  storage: Pick<SupabaseClient["storage"], "from">,
): Promise<unknown> {
  if (Array.isArray(value)) {
    return Promise.all(
      value.map((item) =>
        remapBookAssetInJson(item, sourceBookId, newBookId, storage),
      ),
    );
  }

  if (!value || typeof value !== "object") return value;

  const obj = value as Record<string, unknown>;

  if (obj.type === "image" && obj.attrs && typeof obj.attrs === "object") {
    const attrs = { ...(obj.attrs as Record<string, unknown>) };
    if (typeof attrs.src === "string") {
      attrs.src = await remapBookAssetSrc(
        attrs.src,
        sourceBookId,
        newBookId,
        storage,
      );
    }
    return { ...obj, attrs };
  }

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(obj)) {
    out[key] = await remapBookAssetInJson(
      child,
      sourceBookId,
      newBookId,
      storage,
    );
  }
  return out;
}

/** sourceBookId 폴더 전체를 newBookId로 복사 */
export async function copyBookStorageAssets(
  storage: Pick<SupabaseClient["storage"], "from">,
  sourceBookId: string,
  newBookId: string,
): Promise<void> {
  const { data: files, error: listError } = await storage
    .from(BOOK_ASSETS_BUCKET)
    .list(sourceBookId);

  if (listError) throw new Error(listError.message);
  if (!files?.length) return;

  for (const file of files) {
    if (!file.name || file.name.endsWith("/")) continue;

    const sourcePath = `${sourceBookId}/${file.name}`;
    const destPath = `${newBookId}/${file.name}`;

    const { data: blob, error: downloadError } = await storage
      .from(BOOK_ASSETS_BUCKET)
      .download(sourcePath);

    if (downloadError || !blob) {
      throw new Error(
        downloadError?.message ?? `스토리지 복사 실패: ${sourcePath}`,
      );
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const { error: uploadError } = await storage
      .from(BOOK_ASSETS_BUCKET)
      .upload(destPath, buffer, {
        contentType: blob.type || undefined,
        upsert: true,
      });

    if (uploadError) throw new Error(uploadError.message);
  }
}

export function remapBookCoverPath(
  coverPath: string | null | undefined,
  sourceBookId: string,
  newBookId: string,
): string | null {
  if (!coverPath) return null;
  return remapAssetPath(coverPath, sourceBookId, newBookId);
}
