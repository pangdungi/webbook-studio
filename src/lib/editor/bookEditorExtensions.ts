import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { BookParagraph } from "@/components/editor/BookParagraph";
import { ImageAlign } from "@/components/editor/ImageAlignExtension";

/** 편집기·HTML 생성 공통 */
export function createBookEditorExtensions() {
  return [
    StarterKit.configure({ paragraph: false }),
    BookParagraph,
    Underline,
    ImageAlign.configure({ inline: false }),
    Placeholder.configure({
      placeholder: "이 페이지에 글을 작성하세요.",
    }),
  ];
}
