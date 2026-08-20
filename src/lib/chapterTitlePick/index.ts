import { buildContentPageStorageHtml } from "@/lib/editor/contentPageStorageHtml";
import { parseChapterTitlePickJson } from "@/lib/chapterTitlePick/normalize";
import { CHAPTER_TITLE_PICK_SYSTEM_PROMPT } from "@/lib/chapterTitlePick/prompt";
import type { ChapterTitlePickResult } from "@/lib/chapterTitlePick/types";
import { parseChapterContent } from "@/lib/pages/content";
import { getPageTocLabel } from "@/lib/pages/pageTitle";
import type { BookPage } from "@/lib/pages/types";
import {
  salesPageAnthropicModel,
  salesPageOpenAiModel,
} from "@/lib/salesPageCopy/models";
import type { Chapter } from "@/lib/types/database";

const MAX_CHAPTER_CHARS = 48_000;
const MAX_TOKENS = 2048;

type LlmProvider = "anthropic" | "openai";

type ChapterLike = Pick<
  Chapter,
  "title" | "content_json" | "content_html" | "sort_order"
>;

function pickProvider(): LlmProvider {
  const pref = process.env.SPELLCHECK_PROVIDER ?? "local";
  if (pref === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  throw new Error(
    "장 제목 API 키가 없습니다. ANTHROPIC_API_KEY를 설정해 주세요.",
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pagePlainText(page: BookPage): string {
  if (page.kind === "chapter-cover") return "";

  let html = page.content_html?.trim() ?? "";
  if (!html && page.kind === "content") {
    html = buildContentPageStorageHtml(page);
  }

  return stripHtml(html);
}

export function buildChapterTitlePickContext(
  chapter: ChapterLike,
  bookTitle: string,
): { userMessage: string; pagesRead: number } {
  const parsed = parseChapterContent(
    chapter.content_json,
    chapter.title,
    chapter.content_html ?? "",
  );

  let contentPageIndex = 0;
  const sections: string[] = [];
  let pagesRead = 0;

  for (const page of parsed.pages) {
    if (page.kind === "chapter-cover") continue;

    pagesRead += 1;
    const label =
      page.kind === "content"
        ? getPageTocLabel(page, contentPageIndex++)
        : getPageTocLabel(page, 0);
    const body = pagePlainText(page) || "(본문 없음)";
    sections.push(`### 페이지: ${label}\n${body}`);
  }

  let manuscript = sections.join("\n\n");
  if (manuscript.length > MAX_CHAPTER_CHARS) {
    manuscript = `${manuscript.slice(0, MAX_CHAPTER_CHARS)}\n\n… (일부 생략)`;
  }

  const lines = [
    `## 책 제목\n${bookTitle.trim() || "(제목 없음)"}`,
    `## 현재 장 제목\n${chapter.title.trim() || "(제목 없음)"}`,
    `## 장 순서\n${chapter.sort_order + 1}번째 장`,
    `## 이 장의 페이지 (${pagesRead}개) — 모두 읽고 제목을 제안할 것`,
    manuscript || "(페이지 본문 없음)",
  ];

  return { userMessage: lines.join("\n\n"), pagesRead };
}

async function callAnthropic(system: string, user: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: salesPageAnthropicModel("digest"),
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error: ${res.status} ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  if (!text.trim()) throw new Error("Anthropic returned empty response");
  return text;
}

async function callOpenAI(system: string, user: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: salesPageOpenAiModel("digest"),
      max_tokens: MAX_TOKENS,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("OpenAI returned empty response");
  return text;
}

export async function runChapterTitlePick(
  chapter: ChapterLike,
  bookTitle: string,
): Promise<ChapterTitlePickResult> {
  const { userMessage, pagesRead } = buildChapterTitlePickContext(
    chapter,
    bookTitle,
  );

  if (pagesRead === 0) {
    throw new Error(
      "분석할 페이지가 없습니다. 이 장에 본문·명언 페이지를 추가해 주세요.",
    );
  }

  const provider = pickProvider();
  const raw =
    provider === "openai"
      ? await callOpenAI(CHAPTER_TITLE_PICK_SYSTEM_PROMPT, userMessage)
      : await callAnthropic(CHAPTER_TITLE_PICK_SYSTEM_PROMPT, userMessage);

  const report = parseChapterTitlePickJson(raw, pagesRead);
  if (!report) {
    throw new Error("장 제목 후보를 파싱하지 못했습니다. 다시 시도해 주세요.");
  }

  return { report, provider };
}
