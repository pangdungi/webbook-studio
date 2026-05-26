import type { BookAccessToken } from "@/lib/types/database";

export function isTokenValid(token: BookAccessToken): boolean {
  if (token.revoked_at) return false;
  if (token.expires_at && new Date(token.expires_at) < new Date()) return false;
  return true;
}

export async function validateReaderToken(tokenValue: string) {
  const { createServiceClient } = await import("@/lib/supabase/server");
  const supabase = createServiceClient();

  const { data: token, error } = await supabase
    .from("book_access_tokens")
    .select("*, books(*)")
    .eq("token", tokenValue)
    .single();

  if (error || !token) return null;
  if (!isTokenValid(token as BookAccessToken)) return null;

  return token as BookAccessToken & {
    books: {
      id: string;
      title: string;
      epub_storage_path: string | null;
      status: string;
      writing_mode: string;
    };
  };
}
