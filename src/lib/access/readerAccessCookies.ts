import {
  trialVisitorCookieName,
  trialVisitorCookieOptions,
} from "@/lib/access/trialAccess";
import type { NextResponse } from "next/server";

export function readTrialVisitorKey(
  tokenValue: string,
  cookieGetter: (name: string) => string | undefined,
): string | null {
  return cookieGetter(trialVisitorCookieName(tokenValue)) ?? null;
}

export function attachTrialVisitorCookie(
  response: NextResponse,
  tokenValue: string,
  visitorKey: string,
  secure: boolean,
) {
  response.cookies.set(
    trialVisitorCookieName(tokenValue),
    visitorKey,
    trialVisitorCookieOptions(secure),
  );
}
