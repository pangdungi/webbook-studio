import { createClient } from "@supabase/supabase-js";
import JSZip from "jszip";
import { nanoid } from "nanoid";
import { readFileSync } from "fs";
import { randomUUID } from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_ID = process.env.RECOVER_ADMIN_ID;
const BOOK_ID = process.env.RECOVER_BOOK_ID ?? "b88f0aa9-b409-4e5f-9311-d8ee4e97d87d";
const EPUB_PATH =
  process.env.RECOVER_EPUB_PATH ?? "/tmp/epub-recover/book.epub";

if (!SUPABASE_URL || !SERVICE_KEY || !ADMIN_ID) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RECOVER_ADMIN_ID");
  process.exit(1);
}

const EMPTY_DOC = {
  type: "doc",
  content: [{ type: "paragraph", attrs: { class: "book-body-p" } }],
};

function decodeHtml(text) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

function extractChapterTitle(coverHtml) {
  const match = coverHtml.match(
    /<h1 class="book-chapter-title">([\s\S]*?)<\/h1>/,
  );
  return decodeHtml(match?.[1]?.trim() || "제목 없음");
}

function parseQuoteBody(bodyHtml) {
  const quote = decodeHtml(
    bodyHtml.match(/<blockquote class="book-quote-text">([\s\S]*?)<\/blockquote>/)?.[1]?.trim() ?? "",
  );
  const sourceRaw = decodeHtml(
    bodyHtml.match(/<p class="book-quote-source">([\s\S]*?)<\/p>/)?.[1]?.trim() ?? "",
  ).replace(/^—\s*/, "");
  return { quote, source: sourceRaw };
}

async function parseEpub(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const container = await zip.files["META-INF/container.xml"].async("string");
  const rootfile = container.match(/full-path="([^"]+)/)[1];
  const opf = await zip.files[rootfile].async("string");
  const bookTitle = decodeHtml(opf.match(/<dc:title[^>]*>([^<]+)/)?.[1]?.trim() || "복구된 책");

  const manifest = Object.fromEntries(
    [...opf.matchAll(/<item\s+[^>]*id="([^"]+)"[^>]*href="([^"]+)"/g)].map(
      (m) => [m[1], m[2]],
    ),
  );
  const spineIds = [...opf.matchAll(/<itemref idref="([^"]+)"/g)].map((m) => m[1]);

  const pages = [];
  for (const id of spineIds) {
    const href = manifest[id];
    if (!href || href.includes("toc")) continue;
    const path = href.startsWith("OEBPS/") ? href : `OEBPS/${href}`.replace("//", "/");
    const filePath = Object.keys(zip.files).find((f) => f.endsWith(href) || f === path);
    if (!filePath) continue;
    const xhtml = await zip.files[filePath].async("string");
    const bodyHtml =
      xhtml.match(/<div class="book-page__body">([\s\S]*?)<\/div>\s*<\/article>/)?.[1]?.trim() ?? "";
    pages.push({
      isCover: xhtml.includes("book-page--cover"),
      isQuote: xhtml.includes("book-page--quote"),
      bodyHtml,
    });
  }

  const chapters = [];
  let current = null;

  for (const page of pages) {
    if (page.isCover) {
      if (current) chapters.push(current);
      current = {
        title: extractChapterTitle(page.bodyHtml),
        pages: [{ kind: "chapter-cover", content_html: "", content: structuredClone(EMPTY_DOC) }],
      };
      continue;
    }

    if (!current) {
      current = { title: "1장", pages: [{ kind: "chapter-cover", content_html: "", content: structuredClone(EMPTY_DOC) }] };
    }

    if (page.isQuote) {
      const { quote, source } = parseQuoteBody(page.bodyHtml);
      current.pages.push({
        kind: "quote",
        content: { type: "quote", quote, source },
        content_html: page.bodyHtml,
      });
      continue;
    }

    current.pages.push({
      kind: "content",
      content: structuredClone(EMPTY_DOC),
      content_html: page.bodyHtml,
    });
  }

  if (current) chapters.push(current);

  return { bookTitle, chapters };
}

function chapterToRow(chapter, bookId, sortOrder) {
  const pages = chapter.pages.map((page) => ({
    id: randomUUID(),
    kind: page.kind,
    content: page.content,
    content_html: page.content_html,
  }));

  return {
    book_id: bookId,
    sort_order: sortOrder,
    title: chapter.title,
    content_json: { version: 2, pages },
    content_html: pages
      .filter((p) => p.kind === "content")
      .map((p) => p.content_html)
      .join("\n"),
  };
}

async function main() {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const buffer = readFileSync(EPUB_PATH);
  const { bookTitle, chapters } = await parseEpub(buffer);

  console.log("Recovering book:", bookTitle);
  console.log("Chapters:", chapters.map((c) => `${c.title} (${c.pages.length} pages)`).join(", "));

  const { error: bookError } = await sb.from("books").upsert({
    id: BOOK_ID,
    title: bookTitle,
    subtitle: null,
    cover_path: null,
    writing_mode: "horizontal-tb",
    status: "published",
    epub_storage_path: `${BOOK_ID}/book.epub`,
    published_at: new Date().toISOString(),
    created_by: ADMIN_ID,
    heading_fonts: {
      chapterTitle: "serif",
      heading2: "serif",
      heading3: "serif",
    },
  });

  if (bookError) throw bookError;

  const { error: deleteChaptersError } = await sb
    .from("chapters")
    .delete()
    .eq("book_id", BOOK_ID);
  if (deleteChaptersError) throw deleteChaptersError;

  const chapterRows = chapters.map((chapter, index) =>
    chapterToRow(chapter, BOOK_ID, index),
  );

  const { data: insertedChapters, error: chapterError } = await sb
    .from("chapters")
    .insert(chapterRows)
    .select("id, title");

  if (chapterError) throw chapterError;

  const { count: tokenCount } = await sb
    .from("book_access_tokens")
    .select("*", { count: "exact", head: true })
    .eq("book_id", BOOK_ID);

  if (!tokenCount) {
    const token = nanoid(32);
    const { error: tokenError } = await sb.from("book_access_tokens").insert({
      book_id: BOOK_ID,
      token,
      label: "primary",
    });
    if (tokenError) throw tokenError;
    console.log("Created reader token:", token);
  }

  console.log("Recovered chapters:", insertedChapters);
  console.log("Done. Refresh the dashboard.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
