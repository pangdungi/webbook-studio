import Epub from "epub-gen-memory";
import type { Book, Chapter, WritingMode } from "@/lib/types/database";
import { markTocNonLinear } from "@/lib/epub/postProcess";
import { parseChapterContent } from "@/lib/pages/content";
import { buildPageEpubHtml } from "@/lib/typography/pageLayout";
import { normalizeBookHeadingFonts } from "@/lib/typography/headingFonts";
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

function contentPageNumber(
  pages: ReturnType<typeof parseChapterContent>["pages"],
  pageId: string,
) {
  const idx = pages.filter((p) => p.kind === "content").findIndex((p) => p.id === pageId);
  return idx >= 0 ? idx + 1 : 1;
}

export async function buildEpubBuffer(
  book: Pick<Book, "title" | "subtitle" | "writing_mode" | "cover_path" | "heading_fonts">,
  chapters: Pick<Chapter, "title" | "content_json" | "content_html">[],
  coverUrl?: string | null,
): Promise<Buffer> {
  const headingFonts = normalizeBookHeadingFonts(book.heading_fonts);
  const css = epubTypographyCss(writingModeCss(book.writing_mode), headingFonts);

  const content = chapters.flatMap((ch) => {
    const parsed = parseChapterContent(ch.content_json, ch.title, ch.content_html);

    return parsed.pages.map((page) => ({
      title:
        page.kind === "chapter-cover"
          ? ch.title
          : page.kind === "quote"
            ? `${ch.title} 명언`
            : `${ch.title} ${contentPageNumber(parsed.pages, page.id)}`,
      content: buildPageEpubHtml(page, ch.title),
      excludeFromToc: page.kind !== "chapter-cover",
    }));
  });

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
