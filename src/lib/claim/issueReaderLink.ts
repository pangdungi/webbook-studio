import { isTokenValid } from "@/lib/access/validate";
import { createServiceClient } from "@/lib/supabase/server";
import { buildReaderUrl, generateAccessToken } from "@/lib/utils/tokens";

export function purchaseLabel(orderId: string) {
  return `purchase-${orderId.trim()}`;
}

type IssueResult =
  | { ok: true; url: string; title: string; reused: boolean }
  | { ok: false; error: string; status: number };

/** 구매 수령 — 1단계: 주문번호 기준 링크 발급 (아임웹 검증은 2단계) */
export async function issueReaderLinkForPurchase(
  bookId: string,
  orderId: string,
  expiresInDays = 365,
): Promise<IssueResult> {
  const normalizedOrder = orderId.trim();
  if (normalizedOrder.length < 3) {
    return { ok: false, error: "주문번호를 확인해 주세요.", status: 400 };
  }

  const supabase = createServiceClient();

  const { data: book } = await supabase
    .from("books")
    .select("id, title, status")
    .eq("id", bookId)
    .single();

  if (!book || book.status !== "published") {
    return { ok: false, error: "수령할 수 있는 책을 찾을 수 없습니다.", status: 404 };
  }

  const label = purchaseLabel(normalizedOrder);

  const { data: existing } = await supabase
    .from("book_access_tokens")
    .select("*")
    .eq("book_id", bookId)
    .eq("label", label)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && isTokenValid(existing)) {
    return {
      ok: true,
      url: buildReaderUrl(existing.token),
      title: book.title,
      reused: true,
    };
  }

  const token = generateAccessToken();
  const expires_at = new Date(
    Date.now() + expiresInDays * 86400000,
  ).toISOString();

  const { data, error } = await supabase
    .from("book_access_tokens")
    .insert({
      book_id: bookId,
      token,
      label,
      expires_at,
    })
    .select("token")
    .single();

  if (error || !data) {
    return { ok: false, error: "링크를 만들 수 없습니다.", status: 500 };
  }

  return {
    ok: true,
    url: buildReaderUrl(data.token),
    title: book.title,
    reused: false,
  };
}
