import { buildBookPdfHtml } from "@/lib/pdf/buildBookPdfHtml";
import { renderHtmlToPdf } from "@/lib/pdf/renderHtmlToPdf";
import type { Book, Chapter } from "@/lib/types/database";

export async function buildPdfBufferFromBook(
  book: Pick<
    Book,
    | "title"
    | "subtitle"
    | "writing_mode"
    | "cover_bg_color"
    | "cover_title_color"
    | "heading_fonts"
  >,
  chapters: Pick<Chapter, "title" | "content_json" | "content_html">[],
  coverImageUrl?: string | null,
): Promise<Buffer> {
  const html = buildBookPdfHtml(book, chapters, coverImageUrl);
  return renderHtmlToPdf(html);
}
