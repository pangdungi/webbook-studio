/** A4 본문 페이지 분량 가이드 (편집·EPUB 공통 기준) */

export const PAGE_CHARS_GUIDE_MIN = 900;
export const PAGE_CHARS_GUIDE_MAX = 1200;
export const PAGE_CHARS_WARN = 1050;

export function countPlainTextFromHtml(html: string): number {
  if (!html.trim()) return 0;
  const text = html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, "")
    .trim();
  return text.length;
}

export type PageFillStatus = "empty" | "ok" | "near" | "over";

export function getPageFillStatus(charCount: number): PageFillStatus {
  if (charCount === 0) return "empty";
  if (charCount >= PAGE_CHARS_GUIDE_MAX) return "over";
  if (charCount >= PAGE_CHARS_WARN) return "near";
  return "ok";
}

export function formatPageStatsLabel(charCount: number): string {
  const n = charCount.toLocaleString("ko-KR");
  const range = `${PAGE_CHARS_GUIDE_MIN.toLocaleString("ko-KR")}~${PAGE_CHARS_GUIDE_MAX.toLocaleString("ko-KR")}`;
  return `약 ${n}자 · 권장 ${range}자/페이지`;
}

export function pageFillHint(status: PageFillStatus): string | null {
  if (status === "near") {
    return "이 페이지가 거의 찼습니다. 이어 쓸 내용은 「+ 본문」으로 새 페이지를 추가하세요.";
  }
  if (status === "over") {
    return "권장 글자 수를 넘었습니다. 더 쓰려면 「+ 본문」으로 새 페이지를 추가하세요.";
  }
  return null;
}
