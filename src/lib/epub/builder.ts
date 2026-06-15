import Epub from "epub-gen-memory";
import type { Book, Chapter, WritingMode } from "@/lib/types/database";
import { markTocNonLinear } from "@/lib/epub/postProcess";
import { parseChapterContent } from "@/lib/pages/content";
import { getPageTocLabel } from "@/lib/pages/pageTitle";
import {
  buildBookCoverEpubHtml,
  buildPageEpubHtml,
} from "@/lib/typography/pageLayout";
import { normalizeBookCoverStyle } from "@/lib/books/coverStyle";
import { fetchCoverImageDataUri } from "@/lib/books/resolveCoverImageUrl";
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

export async function buildEpubBuffer(
  book: Pick<
    Book,
    | "title"
    | "subtitle"
    | "writing_mode"
    | "cover_path"
    | "cover_bg_color"
    | "cover_title_color"
    | "heading_fonts"
  >,
  chapters: Pick<Chapter, "title" | "content_json" | "content_html">[],
  coverUrl?: string | null,
): Promise<Buffer> {
  const headingFonts = normalizeBookHeadingFonts(book.heading_fonts);
  const coverStyle = normalizeBookCoverStyle(book);
  const coverImageSrc = coverUrl
    ? await fetchCoverImageDataUri(coverUrl)
    : null;
  const css = epubTypographyCss(writingModeCss(book.writing_mode), headingFonts);

  const bookCoverEntry = {
    title: "표지",
    content: buildBookCoverEpubHtml(
      book.title,
      book.subtitle,
      coverStyle,
      coverImageSrc ?? coverUrl,
    ),
    excludeFromToc: false,
  };

  const content = [
    bookCoverEntry,
    ...chapters.flatMap((ch) => {
      const parsed = parseChapterContent(
        ch.content_json,
        ch.title,
        ch.content_html,
      );

      let contentPageIndex = 0;

      return parsed.pages.map((page) => ({
        title:
          page.kind === "chapter-cover"
            ? ch.title.trim() || "장"
            : page.kind === "content"
              ? getPageTocLabel(page, contentPageIndex++)
              : getPageTocLabel(page, 0),
        content: buildPageEpubHtml(page, ch.title),
        excludeFromToc: page.kind !== "chapter-cover",
      }));
    }),
  ];

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
