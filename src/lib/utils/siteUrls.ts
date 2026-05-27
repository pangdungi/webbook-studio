/** 출판 플랫폼(관리자) vs 독자 읽기 URL 분리 */

function normalizeBaseUrl(raw: string | undefined): string | null {
  const trimmed = raw?.trim().replace(/\/$/, "");
  return trimmed || null;
}

function urlHostname(baseUrl: string): string | null {
  try {
    const withProtocol = baseUrl.startsWith("http")
      ? baseUrl
      : `https://${baseUrl}`;
    return new URL(withProtocol).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** 관리자 출판 플랫폼 (편집·출판·링크 생성) */
export function getStudioSiteUrl() {
  const configured = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;

  const vercel = normalizeBaseUrl(process.env.VERCEL_URL);
  if (vercel) {
    return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  }

  return "http://localhost:3000";
}

/**
 * 독자에게 공유하는 링크의 베이스 URL.
 * NEXT_PUBLIC_READER_URL 미설정 시 SITE_URL과 동일(한 도메인 + 미들웨어 잠금).
 */
export function getReaderSiteUrl() {
  const reader = normalizeBaseUrl(process.env.NEXT_PUBLIC_READER_URL);
  if (reader) {
    return reader.startsWith("http") ? reader : `https://${reader}`;
  }
  return getStudioSiteUrl();
}

export function getReaderHostname(): string | null {
  return urlHostname(getReaderSiteUrl());
}

export function getStudioHostname(): string | null {
  return urlHostname(getStudioSiteUrl());
}

/** 독자 전용 도메인 — 이 호스트에서는 /read 만 허용, 출판 플랫폼 경로 차단 */
export function isReaderOnlyHost(hostname: string): boolean {
  const readerHost = getReaderHostname();
  const studioHost = getStudioHostname();
  if (!readerHost) return false;
  if (readerHost === studioHost) return false;
  return hostname.toLowerCase() === readerHost;
}

export function isStudioPlatformPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/admin") ||
    pathname === "/login" ||
    pathname === "/signup"
  );
}
