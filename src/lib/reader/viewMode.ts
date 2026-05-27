export type ReaderViewMode = "scroll" | "paginated";

export const READER_VIEW_MODE_KEY = "wbs_reader_view_mode";

export function loadReaderViewMode(): ReaderViewMode {
  if (typeof window === "undefined") return "scroll";
  const raw = localStorage.getItem(READER_VIEW_MODE_KEY);
  return raw === "paginated" ? "paginated" : "scroll";
}

export function saveReaderViewMode(mode: ReaderViewMode) {
  localStorage.setItem(READER_VIEW_MODE_KEY, mode);
}
