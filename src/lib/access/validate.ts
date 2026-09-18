import {
  isTrialToken,
  resolveTrialVisitorAccess,
} from "@/lib/access/trialAccess";
import type { BookAccessToken } from "@/lib/types/database";

export type ReaderTokenDenialReason =
  | "not_found"
  | "revoked"
  | "expired"
  | "invalid";

export type ReaderRecord = BookAccessToken & {
  books: {
    id: string;
    title: string;
    epub_storage_path: string | null;
    status: string;
    writing_mode: string;
    heading_fonts?: unknown;
    body_font?: unknown;
    cover_path?: string | null;
  };
};

export type ReaderAccessResult = {
  record: ReaderRecord | null;
  denial?: ReaderTokenDenialReason;
  newVisitorKey?: string;
};

/** 7일권 공유 URL은 토큰 자체 만료 없음 — 방문자별로 따로 계산 */
export function isTokenExpired(token: BookAccessToken): boolean {
  if (isTrialToken(token)) return false;
  return Boolean(
    token.expires_at && new Date(token.expires_at).getTime() < Date.now(),
  );
}

export function isTokenValid(token: BookAccessToken): boolean {
  if (token.revoked_at) return false;
  if (isTokenExpired(token)) return false;
  return true;
}

export function readerTokenDenialMessage(
  reason: ReaderTokenDenialReason,
): string {
  if (reason === "expired") {
    return "첫 접속 후 7일 이용 기간이 끝났습니다. 연장이 필요하면 판매처에 문의해 주세요.";
  }
  if (reason === "revoked") {
    return "비활성화된 링크입니다.";
  }
  return "유효하지 않거나 만료된 링크입니다.";
}

export async function lookupReaderToken(tokenValue: string) {
  const { createServiceClient } = await import("@/lib/supabase/server");
  const supabase = createServiceClient();

  const { data: token, error } = await supabase
    .from("book_access_tokens")
    .select("*, books(*)")
    .eq("token", tokenValue)
    .single();

  if (error || !token) return null;

  return token as ReaderRecord;
}

export async function validateReaderAccess(
  tokenValue: string,
  visitorKey?: string | null,
): Promise<ReaderAccessResult> {
  const record = await lookupReaderToken(tokenValue);
  if (!record) return { record: null, denial: "not_found" };
  if (record.revoked_at) return { record: null, denial: "revoked" };

  if (!isTrialToken(record)) {
    if (isTokenExpired(record)) {
      return { record: null, denial: "expired" };
    }
    return { record };
  }

  const trial = await resolveTrialVisitorAccess(record, visitorKey ?? null);
  if (!trial.allowed) {
    return { record: null, denial: "expired" };
  }

  return { record, newVisitorKey: trial.newVisitorKey };
}

export async function getReaderTokenDenialReason(
  tokenValue: string,
  visitorKey?: string | null,
): Promise<ReaderTokenDenialReason> {
  const access = await validateReaderAccess(tokenValue, visitorKey);
  return access.denial ?? "invalid";
}

/** @deprecated validateReaderAccess 사용 */
export async function validateReaderToken(tokenValue: string) {
  const { record } = await validateReaderAccess(tokenValue, null);
  return record;
}
