/** 장·중·소제목 서체 — 책 전체에 동일 적용 (본문은 별도 body_font 설정) */
export type HeadingFontRole = "serif" | "sans";

export type BookHeadingFonts = {
  chapterTitle: HeadingFontRole;
  heading2: HeadingFontRole;
  heading3: HeadingFontRole;
};

export const DEFAULT_BOOK_HEADING_FONTS: BookHeadingFonts = {
  chapterTitle: "serif",
  heading2: "serif",
  heading3: "serif",
};

export const HEADING_FONT_OPTIONS: {
  value: HeadingFontRole;
  label: string;
}[] = [
  { value: "serif", label: "명조" },
  { value: "sans", label: "고딕" },
];

export const bookSerifFontFamily =
  '"Noto Serif KR", "Apple Myungjo", "Batang", serif';

export const bookSansFontFamily =
  '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

export const NOTO_SERIF_KR_GOOGLE_CSS =
  "https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&display=swap";

export const NOTO_SANS_KR_GOOGLE_CSS =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&display=swap";

export function headingFontFamily(role: HeadingFontRole): string {
  return role === "sans" ? bookSansFontFamily : bookSerifFontFamily;
}

export function normalizeBookHeadingFonts(raw: unknown): BookHeadingFonts {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_BOOK_HEADING_FONTS };

  const o = raw as Record<string, unknown>;
  const pick = (key: keyof BookHeadingFonts): HeadingFontRole =>
    o[key] === "sans" ? "sans" : "serif";

  return {
    chapterTitle: pick("chapterTitle"),
    heading2: pick("heading2"),
    heading3: pick("heading3"),
  };
}

export function headingFontCssVariables(fonts: BookHeadingFonts): Record<string, string> {
  return {
    "--wbs-font-chapter": headingFontFamily(fonts.chapterTitle),
    "--wbs-font-h2": headingFontFamily(fonts.heading2),
    "--wbs-font-h3": headingFontFamily(fonts.heading3),
  };
}

/** EPUB·리더 iframe — 필요한 Google Fonts만 로드 */
export function bookGoogleFontStylesheetUrls(fonts: BookHeadingFonts): string[] {
  const urls: string[] = [NOTO_SERIF_KR_GOOGLE_CSS];
  const needsSans =
    fonts.chapterTitle === "sans" ||
    fonts.heading2 === "sans" ||
    fonts.heading3 === "sans";
  if (needsSans) urls.push(NOTO_SANS_KR_GOOGLE_CSS);
  return urls;
}

export function bookFontFaceCss(fonts: BookHeadingFonts): string {
  return bookGoogleFontStylesheetUrls(fonts)
    .map((url) => `@import url("${url}");`)
    .join("\n");
}
