import Paragraph from "@tiptap/extension-paragraph";

/** 출판용 본문 단락 — EPUB·리더·편집기에서 들여쓰기 유지 */
export const BookParagraph = Paragraph.extend({
  addAttributes() {
    return {
      class: {
        default: "book-body-p",
        parseHTML: (element) => element.getAttribute("class"),
        renderHTML: (attributes) => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        },
      },
    };
  },
});
