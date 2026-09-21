/** 편집기 pageBox — 42rem × A4 비율 @ 16px root */
export const BOOK_EDITOR_PAGE_WIDTH_PX = 672;
export const BOOK_EDITOR_PAGE_HEIGHT_PX = 950;
export const BOOK_EDITOR_ROOT_FONT_PX = 16;

export const PDF_A4_WIDTH_PX = Math.round((210 / 25.4) * 96);
export const PDF_A4_HEIGHT_PX = Math.round((297 / 25.4) * 96);

/** 672px 레이아웃 → A4 용지에 맞게 확대 (비율 동일 = 편집 화면과 같음) */
export const PDF_A4_PRINT_SCALE =
  PDF_A4_WIDTH_PX / BOOK_EDITOR_PAGE_WIDTH_PX;
