import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { BookParagraph } from "@/components/editor/BookParagraph";
import { ImageAlign } from "@/components/editor/ImageAlignExtension";
import { SpellcheckHighlight } from "@/components/editor/SpellcheckHighlightExtension";

/** 편집기·HTML 생성 공통 */
export function createBookEditorExtensions() {
  return [
    StarterKit.configure({ paragraph: false }),
    BookParagraph,
    ImageAlign.configure({ inline: false }),
    Placeholder.configure({
      placeholder: "이 페이지에 글을 작성하세요.",
    }),
    SpellcheckHighlight,
  ];
}
