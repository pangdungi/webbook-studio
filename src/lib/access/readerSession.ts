import type { NextResponse } from "next/server";

/** 독자 링크로 들어온 세션 — 플랫폼 경로 차단용 */

export const READER_SESSION_COOKIE = "wbs_reader_token";

const READER_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

export function readerCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: READER_COOKIE_MAX_AGE,
  };
}

export function clearReaderSessionCookie(response: NextResponse, secure: boolean) {
  response.cookies.set(READER_SESSION_COOKIE, "", {
    ...readerCookieOptions(secure),
    maxAge: 0,
  });
}

/** /read/abc123, /read/abc123/, /read/abc123/epub */
export function parseReaderTokenFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/read\/([^/]+)(?:\/epub)?\/?$/);
  return match?.[1] ?? null;
}

/** URL에 있는 토큰이 쿠키보다 우선 (새 출판 링크가 예전 쿠키에 가로채이지 않음) */
export function resolveReaderToken(
  cookieToken: string | undefined,
  pathToken: string | null,
  isAdmin: boolean,
): string | undefined {
  if (isAdmin) return undefined;
  if (pathToken) return pathToken;
  return cookieToken;
}

export function isReaderAllowedPath(pathname: string): boolean {
  if (pathname.startsWith("/read/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  return false;
}

export function readerBookPath(token: string) {
  return `/read/${token}`;
}

export function readerEpubPath(token: string) {
  return `/read/${token}/epub`;
}

/** 독자 세션일 때 이 토큰의 책 경로만 허용 */
export function isReaderPathForToken(pathname: string, token: string): boolean {
  if (pathname === readerBookPath(token)) return true;
  if (pathname === readerEpubPath(token)) return true;
  return false;
}
