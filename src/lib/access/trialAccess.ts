import type { BookAccessToken } from "@/lib/types/database";
import { generateAccessToken } from "@/lib/utils/tokens";

export const TRIAL_READER_LABEL = "trial-7d";
export const DEFAULT_TRIAL_DAYS = 7;

/** 영구(primary) 링크는 절대 trial 대상 아님 */
export function isTrialToken(token: BookAccessToken): boolean {
  if (token.label === "primary") return false;
  return typeof token.trial_days === "number" && token.trial_days > 0;
}

export function trialVisitorCookieName(tokenValue: string): string {
  return `wbs_trial_v_${tokenValue.slice(0, 16)}`;
}

export function trialVisitorCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * (DEFAULT_TRIAL_DAYS + 1),
  };
}

export function trialExpiresAtFromActivation(
  activatedAt: Date,
  trialDays: number,
): string {
  return new Date(
    activatedAt.getTime() + trialDays * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export type TrialVisitorAccessResult = {
  allowed: boolean;
  newVisitorKey?: string;
  expiresAt?: string;
};

/** 공유 7일권 URL — 이 브라우저(방문자)의 첫 접속부터 trial_days */
export async function resolveTrialVisitorAccess(
  token: BookAccessToken,
  visitorKey: string | null,
): Promise<TrialVisitorAccessResult> {
  if (!isTrialToken(token) || !token.trial_days) {
    return { allowed: true };
  }

  const { createServiceClient } = await import("@/lib/supabase/server");
  const supabase = createServiceClient();

  if (visitorKey) {
    const { data: visit } = await supabase
      .from("book_trial_visits")
      .select("expires_at")
      .eq("token_id", token.id)
      .eq("visitor_key", visitorKey)
      .maybeSingle();

    if (visit) {
      const expired = new Date(visit.expires_at).getTime() < Date.now();
      return expired
        ? { allowed: false, expiresAt: visit.expires_at }
        : { allowed: true, expiresAt: visit.expires_at };
    }
  }

  const newVisitorKey = generateAccessToken();
  const firstAccessedAt = new Date();
  const expiresAt = trialExpiresAtFromActivation(
    firstAccessedAt,
    token.trial_days,
  );

  const { error } = await supabase.from("book_trial_visits").insert({
    token_id: token.id,
    visitor_key: newVisitorKey,
    first_accessed_at: firstAccessedAt.toISOString(),
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { allowed: true, newVisitorKey, expiresAt };
}
