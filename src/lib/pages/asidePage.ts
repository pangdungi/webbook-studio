import type { BookPage } from "@/lib/pages/types";

/** 어사이드(보충) 본문 페이지 — 같은 content, layout만 다름 */
export function isAsideContentPage(page: BookPage): boolean {
  return page.kind === "content" && page.layout === "aside";
}

export function toggleAsideLayout(page: BookPage): BookPage {
  if (page.kind !== "content") return page;
  return {
    ...page,
    layout: page.layout === "aside" ? undefined : "aside",
  };
}
