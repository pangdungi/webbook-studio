export const EDITOR_PAGE_ZOOM_KEY = "wbs_editor_page_zoom";

/** 너무 작으면 본문이 읽기 어려움 */
export const EDITOR_PAGE_ZOOM_MIN = 0.75;
export const EDITOR_PAGE_ZOOM_MAX = 2;
export const EDITOR_PAGE_ZOOM_STEP = 0.1;
export const EDITOR_PAGE_ZOOM_DEFAULT = 1;

export function clampEditorPageZoom(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return Math.min(
    EDITOR_PAGE_ZOOM_MAX,
    Math.max(EDITOR_PAGE_ZOOM_MIN, rounded),
  );
}

export function loadEditorPageZoom(): number {
  if (typeof window === "undefined") return EDITOR_PAGE_ZOOM_DEFAULT;
  const raw = localStorage.getItem(EDITOR_PAGE_ZOOM_KEY);
  if (!raw) return EDITOR_PAGE_ZOOM_DEFAULT;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return EDITOR_PAGE_ZOOM_DEFAULT;
  return clampEditorPageZoom(n);
}

export function saveEditorPageZoom(zoom: number) {
  localStorage.setItem(EDITOR_PAGE_ZOOM_KEY, String(clampEditorPageZoom(zoom)));
}

export function formatEditorPageZoomLabel(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}
