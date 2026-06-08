import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { BookParagraph } from "@/components/editor/BookParagraph";
import { ImageAlign } from "@/components/editor/ImageAlignExtension";
import { SpellcheckHighlight } from "@/components/editor/SpellcheckHighlightExtension";
import { BookImageDrop } from "@/lib/editor/BookImageDropExtension";

type BookEditorExtensionOptions = {
  bookId?: string;
  onImageUploadError?: (message: string) => void;
};

/** 편집기·HTML 생성 공통 */
export function createBookEditorExtensions(
  options: BookEditorExtensionOptions = {},
) {
  const extensions = [
    StarterKit.configure({ paragraph: false }),
    BookParagraph,
    ImageAlign.configure({ inline: false }),
    Placeholder.configure({
      placeholder: "이 페이지에 글을 작성하세요.",
    }),
    SpellcheckHighlight,
  ];

  if (options.bookId) {
    extensions.push(
      BookImageDrop.configure({
        bookId: options.bookId,
        onUploadError: options.onImageUploadError ?? (() => {}),
      }),
    );
  }

  return extensions;
}
