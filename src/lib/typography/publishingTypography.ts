import { bookPageContentClass, bookPageClass } from "@/lib/pages/bookPageCss";

/** 독자 페이지 모드 — 종이 느낌만 (본문 정렬은 bookStyles proseContentCss) */
export function publishingReaderPageCss(important = false) {
  const i = important ? " !important" : "";
  const scope = ".reader-scroll-viewport--paginated";

  return `
    ${scope} .reader-scroll-anchor .${bookPageClass}.${bookPageContentClass} {
      background-color: #fffdf9${i};
      box-shadow: 0 1px 4px rgba(28, 25, 23, 0.08)${i};
    }
  `;
}
