import { parseBookTitlePickJson } from "@/lib/bookTitlePick/normalize";
import { BOOK_TITLE_PICK_SYSTEM_PROMPT } from "@/lib/bookTitlePick/prompt";
import type { BookTitlePickResult } from "@/lib/bookTitlePick/types";
import type { ReaderAnalysisReport } from "@/lib/readerAnalysis/types";
import {
  analyzeBookManuscript,
  buildManuscriptContextMessage,
} from "@/lib/salesPageCopy";
import {
  salesPageAnthropicModel,
  salesPageOpenAiModel,
} from "@/lib/salesPageCopy/models";
import type { Chapter } from "@/lib/types/database";

const FINAL_MAX_TOKENS = 4096;

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
      model: salesPageAnthropicModel("final"),
      max_tokens: FINAL_MAX_TOKENS,
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
      model: salesPageOpenAiModel("final"),
      max_tokens: FINAL_MAX_TOKENS,
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

function buildTitlePickUserMessage(input: {
  manuscriptContext: string;
  bookTitle: string;
  bookSubtitle?: string | null;
  readerAnalysis?: ReaderAnalysisReport | null;
}): string {
  const lines = [input.manuscriptContext];

  lines.push(
    "",
    "## 제목뽑기 요청",
    "위 원고 전체를 바탕으로 책 제목·부제목 후보 6개를 JSON으로 제안해 주세요.",
  );

  if (input.bookTitle.trim() || input.bookSubtitle?.trim()) {
    lines.push(
      "",
      "## 현재 작업 중인 표지 문구 (참고)",
      `제목: ${input.bookTitle.trim() || "(없음)"}`,
      `부제: ${input.bookSubtitle?.trim() || "(없음)"}`,
    );
  }

  if (input.readerAnalysis?.summary) {
    lines.push("", "## 독자 분석 요약 (참고)", input.readerAnalysis.summary);
  }

  return lines.join("\n");
}

type ChapterLike = Pick<
  Chapter,
  "title" | "content_json" | "content_html" | "sort_order"
>;

export async function runBookTitlePickFromChapters(
  chapters: ChapterLike[],
  input: {
    bookTitle: string;
    bookSubtitle?: string | null;
    readerAnalysis?: ReaderAnalysisReport | null;
  },
): Promise<BookTitlePickResult> {
  const analysis = await analyzeBookManuscript(chapters, input.bookTitle);

  const manuscriptContext = buildManuscriptContextMessage({
    bookTitle: input.bookTitle,
    bookSubtitle: input.bookSubtitle,
    manuscript: analysis.manuscript,
    chapterDigests: analysis.chapterDigests,
    chapterBlocks: analysis.blocks,
    readerAnalysis: input.readerAnalysis,
  });

  const userMessage = buildTitlePickUserMessage({
    manuscriptContext,
    bookTitle: input.bookTitle,
    bookSubtitle: input.bookSubtitle,
    readerAnalysis: input.readerAnalysis,
  });

  const raw =
    analysis.provider === "openai"
      ? await callOpenAI(BOOK_TITLE_PICK_SYSTEM_PROMPT, userMessage)
      : await callAnthropic(BOOK_TITLE_PICK_SYSTEM_PROMPT, userMessage);

  const report = parseBookTitlePickJson(raw);
  if (!report) {
    throw new Error("제목·부제목 후보를 파싱하지 못했습니다. 다시 시도해 주세요.");
  }

  return {
    report,
    provider: analysis.provider,
    chaptersAnalyzed: analysis.chaptersAnalyzed,
    digestCalls: analysis.digestCalls,
  };
}
