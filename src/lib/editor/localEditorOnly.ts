/** 편집·저장은 로컬 개발 서버에서만 — 배포 URL과 DB 충돌 방지 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isLocalDevHostname(hostname: string): boolean {
  const base = hostname.split(":")[0]?.toLowerCase() ?? "";
  return LOCAL_HOSTS.has(base);
}

export function getLocalEditorBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_LOCAL_EDITOR_URL?.trim().replace(
    /\/$/,
    "",
  );
  return fromEnv || "http://localhost:3000";
}

export function localEditorUrl(path: string): string {
  const base = getLocalEditorBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function isLocalEditorClient(): boolean {
  if (typeof window === "undefined") return false;
  return isLocalDevHostname(window.location.hostname);
}

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** 배포 환경에서 차단할 관리자·편집 API (GET·독자 API 제외) */
export function isEditorMutationApiPath(
  pathname: string,
  method: string,
): boolean {
  if (!MUTATION_METHODS.has(method.toUpperCase())) return false;

  if (pathname === "/api/books") return true;
  if (/^\/api\/books\/[^/]+$/.test(pathname)) return true;
  if (/^\/api\/books\/[^/]+\/chapters$/.test(pathname)) return true;
  if (/^\/api\/books\/[^/]+\/versions/.test(pathname)) return true;
  if (/^\/api\/chapters\/[^/]+$/.test(pathname)) return true;
  if (/^\/api\/publish\/[^/]+$/.test(pathname)) return true;
  if (pathname === "/api/upload") return true;
  if (pathname === "/api/spellcheck") return true;
  if (pathname === "/api/writing-review") return true;
  if (pathname === "/api/writing-evaluation") return true;
  if (pathname === "/api/reader-analysis") return true;
  if (/^\/api\/access\/[^/]+$/.test(pathname)) return true;

  return false;
}

export function isBookEditPagePath(pathname: string): boolean {
  return /^\/admin\/books\/[^/]+\/edit\/?$/.test(pathname);
}

/** 배포 사이트에서도 버전 목록·열람 가능 */
export function isBookVersionsViewPath(pathname: string): boolean {
  return /^\/admin\/books\/[^/]+\/versions\/?$/.test(pathname);
}

export function bookIdFromEditPath(pathname: string): string | null {
  const match = pathname.match(/^\/admin\/books\/([^/]+)\/edit\/?$/);
  return match?.[1] ?? null;
}
