export type ReaderFontScale = "small" | "normal" | "large";

export const READER_FONT_SCALE_KEY = "wbs_reader_font_scale";

export const READER_FONT_SCALE_PERCENT: Record<ReaderFontScale, string> = {
  small: "100%",
  normal: "112%",
  large: "124%",
};

export function loadReaderFontScale(): ReaderFontScale {
  if (typeof window === "undefined") return "normal";
  const raw = localStorage.getItem(READER_FONT_SCALE_KEY);
  if (raw === "small" || raw === "large") return raw;
  return "normal";
}

export function saveReaderFontScale(scale: ReaderFontScale) {
  localStorage.setItem(READER_FONT_SCALE_KEY, scale);
}

export const READER_FONT_SCALE_LABELS: Record<ReaderFontScale, string> = {
  small: "작게",
  normal: "보통",
  large: "크게",
};
