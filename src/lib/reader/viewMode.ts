export type ReaderViewMode = "scroll" | "paginated";

export const READER_VIEW_MODE_KEY = "wbs_reader_view_mode";

function viewModeStorageKey(scopeKey?: string) {
  return scopeKey ? `${READER_VIEW_MODE_KEY}:${scopeKey}` : READER_VIEW_MODE_KEY;
}

export function loadReaderViewMode(
  scopeKey?: string,
  defaultMode: ReaderViewMode = "scroll",
): ReaderViewMode {
  if (typeof window === "undefined") return defaultMode;
  const raw = localStorage.getItem(viewModeStorageKey(scopeKey));
  if (raw === null) return defaultMode;
  return raw === "paginated" ? "paginated" : "scroll";
}

export function saveReaderViewMode(mode: ReaderViewMode, scopeKey?: string) {
  localStorage.setItem(viewModeStorageKey(scopeKey), mode);
}
