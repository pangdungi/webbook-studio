import Epub from "epub-gen-memory";
import type { Book, Chapter, WritingMode } from "@/lib/types/database";
import { markTocNonLinear } from "@/lib/epub/postProcess";
import { buildChapterEpubHtml } from "@/lib/typography/chapterLayout";
import { epubTypographyCss } from "@/lib/typography/bookStyles";

function writingModeCss(mode: WritingMode) {
  if (mode === "vertical-rl") {
    return `
      body { writing-mode: vertical-rl; text-orientation: mixed; }
      h1, h2, h3, p, blockquote { writing-mode: vertical-rl; }
    `;
  }
  return `body { writing-mode: horizontal-tb; }`;
}

export async function buildEpubBuffer(
  book: Pick<Book, "title" | "subtitle" | "writing_mode" | "cover_path">,
  chapters: Pick<Chapter, "title" | "content_html">[],
  coverUrl?: string | null,
): Promise<Buffer> {
  const css = epubTypographyCss(writingModeCss(book.writing_mode));

  const content = chapters.map((ch) => ({
    title: ch.title,
    content: buildChapterEpubHtml(ch.title, ch.content_html),
  }));

  const options = {
    title: book.title,
    author: "Webbook Studio",
    publisher: "Webbook Studio",
    description: book.subtitle ?? undefined,
    cover: coverUrl ?? undefined,
    css,
    lang: "ko",
    tocTitle: "목차",
    prependChapterTitles: false,
  };

  const raw = await Epub(options, content);
  const buffer = Buffer.from(raw);
  return markTocNonLinear(buffer);
}
