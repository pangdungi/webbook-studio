export type ReaderViewMode = "scroll" | "paginated";

export const READER_VIEW_MODE_KEY = "wbs_reader_view_mode";

function viewModeStorageKey(scopeKey?: string) {
  return scopeKey ? `${READER_VIEW_MODE_KEY}:${scopeKey}` : READER_VIEW_MODE_KEY;
}

/** 독자 보기 — 스크롤만 사용 (페이지 모드 비활성) */
export function loadReaderViewMode(
  scopeKey?: string,
  _defaultMode: ReaderViewMode = "scroll",
): ReaderViewMode {
  if (typeof window === "undefined") return "scroll";

  const key = viewModeStorageKey(scopeKey);
  const raw = localStorage.getItem(key);
  if (raw === "paginated") {
    localStorage.setItem(key, "scroll");
  }

  return "scroll";
}

export function saveReaderViewMode(_mode: ReaderViewMode, scopeKey?: string) {
  localStorage.setItem(viewModeStorageKey(scopeKey), "scroll");
}
