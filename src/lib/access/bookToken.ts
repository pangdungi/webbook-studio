import type { createClient } from "@/lib/supabase/server";
import type { BookAccessToken } from "@/lib/types/database";
import { buildReaderUrl, generateAccessToken } from "@/lib/utils/tokens";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** 책당 하나 — 가장 먼저 만든 활성 링크 */
export async function getPrimaryReaderToken(
  supabase: Supabase,
  bookId: string,
): Promise<BookAccessToken | null> {
  const { data, error } = await supabase
    .from("book_access_tokens")
    .select("*")
    .eq("book_id", bookId)
    .is("revoked_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** 없으면 생성 (책 생성·구버전 데이터 보정) */
export async function ensurePrimaryReaderToken(
  supabase: Supabase,
  bookId: string,
): Promise<BookAccessToken> {
  const existing = await getPrimaryReaderToken(supabase, bookId);
  if (existing) return existing;

  const token = generateAccessToken();
  const { data, error } = await supabase
    .from("book_access_tokens")
    .insert({ book_id: bookId, token, label: "primary" })
    .select()
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to create reader token");
  }

  return data;
}

export function primaryReaderUrl(token: BookAccessToken | null): string | null {
  if (!token || token.revoked_at) return null;
  return buildReaderUrl(token.token);
}

/** 목록 API — 책 ID별 대표 링크 */
export async function primaryReaderUrlsByBookId(
  supabase: Supabase,
  bookIds: string[],
): Promise<Record<string, string>> {
  if (bookIds.length === 0) return {};

  const { data: tokens, error } = await supabase
    .from("book_access_tokens")
    .select("book_id, token, revoked_at, created_at")
    .in("book_id", bookIds)
    .is("revoked_at", null)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const urls: Record<string, string> = {};
  for (const row of tokens ?? []) {
    if (!urls[row.book_id]) {
      urls[row.book_id] = buildReaderUrl(row.token);
    }
  }
  return urls;
}
