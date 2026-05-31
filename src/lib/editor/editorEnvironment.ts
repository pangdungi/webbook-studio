export function getEditorEnvironmentLabel(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "로컬 편집 전용 — 저장·출판은 여기서만 하세요";
  }
  return null;
}
