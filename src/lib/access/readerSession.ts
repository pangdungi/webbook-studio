/** 독자 링크로 들어온 세션 — 플랫폼 경로 차단용 */

export const READER_SESSION_COOKIE = "wbs_reader_token";

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
