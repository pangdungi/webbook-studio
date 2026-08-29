import {
  bookFontFaceCss,
  bookSerifFontFamily,
  type BookHeadingFonts,
} from "@/lib/typography/headingFonts";

/** 본문 서체 — 책 전체에 동일 적용 */
export type BookBodyFont = "serif" | "bookk-light" | "bookk-bold";

export const DEFAULT_BOOK_BODY_FONT: BookBodyFont = "serif";

export const BOOK_BODY_FONT_VAR = "--wbs-font-body";

export const BODY_FONT_OPTIONS: { value: BookBodyFont; label: string }[] = [
  { value: "serif", label: "명조" },
  { value: "bookk-light", label: "부크크 Light" },
  { value: "bookk-bold", label: "부크크 Bold" },
];

const BOOKK_LIGHT_FAMILY =
  '"Bookk Gothic Light", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif';
const BOOKK_BOLD_FAMILY =
  '"Bookk Gothic Bold", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif';

/** CSS font-family — --wbs-font-body 미설정 시 명조 */
export const bookBodyFontFamilyVar = `var(${BOOK_BODY_FONT_VAR}, ${bookSerifFontFamily})`;

export function bodyFontFamily(bodyFont: BookBodyFont): string {
  switch (bodyFont) {
    case "bookk-light":
      return BOOKK_LIGHT_FAMILY;
    case "bookk-bold":
      return BOOKK_BOLD_FAMILY;
    default:
      return bookSerifFontFamily;
  }
}

export function normalizeBookBodyFont(raw: unknown): BookBodyFont {
  if (raw === "bookk-light" || raw === "bookk-bold") return raw;
  return "serif";
}

export function bodyFontCssVariables(
  bodyFont: BookBodyFont,
): Record<string, string> {
  return {
    [BOOK_BODY_FONT_VAR]: bodyFontFamily(bodyFont),
  };
}

export function bookBodyFontFaceCss(
  bodyFont: BookBodyFont,
  fontBaseUrl = "",
): string {
  const base = fontBaseUrl.replace(/\/$/, "");
  const pathPrefix = base ? base : "";

  if (bodyFont === "bookk-light") {
    return `@font-face {
  font-family: "Bookk Gothic Light";
  src: url("${pathPrefix}/fonts/bookk-gothic/BookkGothic_Light.ttf") format("truetype");
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}`;
  }

  if (bodyFont === "bookk-bold") {
    return `@font-face {
  font-family: "Bookk Gothic Bold";
  src: url("${pathPrefix}/fonts/bookk-gothic/BookkGothic_Bold.ttf") format("truetype");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}`;
  }

  return "";
}

export function bookTypographyFontFaceCss(
  headingFonts: BookHeadingFonts,
  bodyFont: BookBodyFont = DEFAULT_BOOK_BODY_FONT,
  fontBaseUrl = "",
): string {
  return [bookFontFaceCss(headingFonts), bookBodyFontFaceCss(bodyFont, fontBaseUrl)]
    .filter(Boolean)
    .join("\n");
}
