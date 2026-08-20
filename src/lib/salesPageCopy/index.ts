import { parseSalesPageCopyJson } from "@/lib/salesPageCopy/normalize";
import { CHAPTER_DIGEST_SYSTEM_PROMPT } from "@/lib/salesPageCopy/digestPrompt";
import { SALES_PAGE_COPY_SYSTEM_PROMPT } from "@/lib/salesPageCopy/prompt";
import type { ReaderAnalysisReport } from "@/lib/readerAnalysis/types";
import {
  blocksToManuscript,
  buildChapterBlocks,
  splitChapterIntoParts,
  type ChapterBlock,
} from "@/lib/salesPageCopy/fullBookText";
import type { Chapter } from "@/lib/types/database";
import type { SalesPageCopyResult } from "@/lib/salesPageCopy/types";
import {
  salesPageAnthropicModel,
  salesPageOpenAiModel,
  SALES_PAGE_DIGEST_MAX_TOKENS,
  SALES_PAGE_FINAL_MAX_TOKENS,
  type SalesPageLlmPhase,
} from "@/lib/salesPageCopy/models";

/** 단일 장·한 번에 통째로 LLM에 넣을 수 있는 원고 상한 (자) */
const SINGLE_PASS_MAX_CHARS = 100_000;
/** 장(또는 장의 한 구간)당 digest 1회 상한 */
const CHAPTER_PART_MAX_CHARS = 36_000;

export type SalesPageCopyInput = {
  bookTitle: string;
  bookSubtitle?: string | null;
  fullText: string;
  readerAnalysis?: ReaderAnalysisReport | null;
};

type LlmProvider = "anthropic" | "openai";

type ChapterDigest = {
  title: string;
  digest: string;
  parts: number;
};

function pickProvider(): LlmProvider {
  const pref = process.env.SPELLCHECK_PROVIDER ?? "local";
  if (pref === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  throw new Error(
    "상세페이지 문구 API 키가 없습니다. ANTHROPIC_API_KEY를 설정해 주세요.",
  );
}

function readerAnalysisBlock(analysis: ReaderAnalysisReport | null | undefined) {
  if (!analysis) return "";
  return `## 독자 분석 (참고)\n${analysis.summary}\n타겟: ${analysis.targetReaders.map((p) => p.label).join(", ")}`;
}

function buildChapterChecklist(blocks: ChapterBlock[]): string {
  return blocks.map((b, i) => `${i + 1}. ${b.title}`).join("\n");
}

function buildFinalUserMessage(input: {
  bookTitle: string;
  bookSubtitle?: string | null;
  manuscript?: string;
  chapterDigests?: ChapterDigest[];
  chapterBlocks?: ChapterBlock[];
  readerAnalysis?: ReaderAnalysisReport | null;
}): string {
  const chapterCount =
    input.chapterBlocks?.length ?? input.chapterDigests?.length ?? 1;

  const lines = [
    `## 책 제목\n${input.bookTitle.trim() || "(제목 없음)"}`,
  ];
  if (input.bookSubtitle?.trim()) {
    lines.push(`## 부제\n${input.bookSubtitle.trim()}`);
  }
  lines.push(
    `## 분석 범위\n전체 ${chapterCount}개 장 원고를 모두 읽고 반영했습니다.`,
  );

  const readerBlock = readerAnalysisBlock(input.readerAnalysis);
  if (readerBlock) lines.push(readerBlock);

  if (input.manuscript) {
    lines.push(`## 책 전체 원고\n${input.manuscript.trim()}`);
  } else if (input.chapterDigests?.length && input.chapterBlocks?.length) {
    lines.push(
      `## 전체 장 목록 (아래 모든 장이 분석에 포함됨 — 누락 금지)\n${buildChapterChecklist(input.chapterBlocks)}`,
    );
    const sections = input.chapterDigests
      .map((d) => {
        const suffix = d.parts > 1 ? ` (${d.parts}개 구간 순차 분석)` : "";
        return `### ${d.title}${suffix}\n${d.digest}`;
      })
      .join("\n\n---\n\n");
    lines.push(`## 장별 심층 분석 (${input.chapterDigests.length}개 장)\n${sections}`);
  }

  return lines.join("\n\n");
}

async function callAnthropic(
  system: string,
  user: string,
  maxTokens: number,
  phase: SalesPageLlmPhase,
): Promise<string> {
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
      model: salesPageAnthropicModel(phase),
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic error: ${res.status} ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function callOpenAI(
  system: string,
  user: string,
  maxTokens: number,
  phase: SalesPageLlmPhase,
  json = false,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: salesPageOpenAiModel(phase),
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function llmComplete(
  provider: LlmProvider,
  phase: SalesPageLlmPhase,
  system: string,
  user: string,
  maxTokens: number,
  json = false,
): Promise<string> {
  if (provider === "openai") {
    return callOpenAI(system, user, maxTokens, phase, json);
  }
  return callAnthropic(system, user, maxTokens, phase);
}

function buildDigestUserMessage(input: {
  bookTitle: string;
  chapterTitle: string;
  chapterIndex: number;
  totalChapters: number;
  partIndex?: number;
  partTotal?: number;
  text: string;
}): string {
  const lines = [
    `## 책 제목\n${input.bookTitle}`,
    `## 장 ${input.chapterIndex}/${input.totalChapters}: ${input.chapterTitle}`,
  ];
  if (input.partIndex != null && input.partTotal != null && input.partTotal > 1) {
    lines.push(
      `## 이 장의 구간 ${input.partIndex}/${input.partTotal} (앞뒤 구간과 이어지는 한 장의 일부 — 이 구간 전체를 끝까지 읽을 것)`,
    );
  } else {
    lines.push(`## 이 장 전체 원고 (처음부터 끝까지 모두 읽을 것)`);
  }
  lines.push(`## 원고\n[${input.chapterTitle}]\n${input.text}`);
  return lines.join("\n\n");
}

async function digestChapterBlock(
  provider: LlmProvider,
  bookTitle: string,
  block: ChapterBlock,
  chapterIndex: number,
  totalChapters: number,
): Promise<ChapterDigest> {
  const parts = splitChapterIntoParts(block.text, CHAPTER_PART_MAX_CHARS);
  const partDigests: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const user = buildDigestUserMessage({
      bookTitle,
      chapterTitle: block.title,
      chapterIndex: chapterIndex + 1,
      totalChapters,
      partIndex: parts.length > 1 ? i + 1 : undefined,
      partTotal: parts.length > 1 ? parts.length : undefined,
      text: parts[i],
    });

    const raw = await llmComplete(
      provider,
      "digest",
      CHAPTER_DIGEST_SYSTEM_PROMPT,
      user,
      SALES_PAGE_DIGEST_MAX_TOKENS,
      provider === "openai",
    );
    partDigests.push(raw.trim());
  }

  const digest =
    parts.length === 1
      ? partDigests[0]
      : partDigests.join("\n\n---\n\n");

  return { title: block.title, digest, parts: parts.length };
}

async function digestAllChapters(
  provider: LlmProvider,
  bookTitle: string,
  blocks: ChapterBlock[],
): Promise<ChapterDigest[]> {
  const digests: ChapterDigest[] = [];
  for (let i = 0; i < blocks.length; i++) {
    digests.push(
      await digestChapterBlock(provider, bookTitle, blocks[i], i, blocks.length),
    );
  }
  return digests;
}

async function generateFinalCopy(
  provider: LlmProvider,
  userMessage: string,
): Promise<SalesPageCopyResult> {
  const raw = await llmComplete(
    provider,
    "final",
    SALES_PAGE_COPY_SYSTEM_PROMPT,
    userMessage,
    SALES_PAGE_FINAL_MAX_TOKENS,
    provider === "openai",
  );
  const report = parseSalesPageCopyJson(raw);
  if (!report) {
    throw new Error("상세페이지 문구를 파싱하지 못했습니다. 다시 시도해 주세요.");
  }
  return { report, provider };
}

/** 단일 패스: 장 1개이고 원고가 한 번에 들어갈 때만 */
function shouldUseSinglePass(blocks: ChapterBlock[], manuscriptLength: number): boolean {
  return blocks.length === 1 && manuscriptLength <= SINGLE_PASS_MAX_CHARS;
}

export async function runSalesPageCopy(
  input: SalesPageCopyInput,
): Promise<SalesPageCopyResult> {
  if (!input.fullText.trim()) {
    throw new Error("분석할 원고가 없습니다. 챕터에 본문을 작성해 주세요.");
  }

  const provider = pickProvider();
  const userMessage = buildFinalUserMessage({
    bookTitle: input.bookTitle,
    bookSubtitle: input.bookSubtitle,
    manuscript: input.fullText,
    readerAnalysis: input.readerAnalysis,
  });

  return generateFinalCopy(provider, userMessage);
}

type ChapterLike = Pick<
  Chapter,
  "title" | "content_json" | "content_html" | "sort_order"
>;

export type BookManuscriptAnalysis = {
  provider: LlmProvider;
  blocks: ChapterBlock[];
  manuscript: string | null;
  chapterDigests: ChapterDigest[] | null;
  chaptersAnalyzed: number;
  digestCalls: number;
};

/** 전체 장 원고 — digest 또는 단일 패스용 원고 준비 */
export async function analyzeBookManuscript(
  chapters: ChapterLike[],
  bookTitle: string,
): Promise<BookManuscriptAnalysis> {
  const blocks = buildChapterBlocks(chapters);
  if (blocks.length === 0) {
    throw new Error("분석할 원고가 없습니다. 챕터에 본문을 작성해 주세요.");
  }

  const provider = pickProvider();
  const manuscript = blocksToManuscript(blocks);

  if (shouldUseSinglePass(blocks, manuscript.length)) {
    return {
      provider,
      blocks,
      manuscript,
      chapterDigests: null,
      chaptersAnalyzed: blocks.length,
      digestCalls: 0,
    };
  }

  const chapterDigests = await digestAllChapters(provider, bookTitle, blocks);
  const digestCalls = chapterDigests.reduce((sum, d) => sum + d.parts, 0);

  return {
    provider,
    blocks,
    manuscript: null,
    chapterDigests,
    chaptersAnalyzed: blocks.length,
    digestCalls,
  };
}

export function buildManuscriptContextMessage(input: {
  bookTitle: string;
  bookSubtitle?: string | null;
  manuscript?: string | null;
  chapterDigests?: ChapterDigest[] | null;
  chapterBlocks: ChapterBlock[];
  readerAnalysis?: ReaderAnalysisReport | null;
}): string {
  return buildFinalUserMessage({
    bookTitle: input.bookTitle,
    bookSubtitle: input.bookSubtitle,
    manuscript: input.manuscript ?? undefined,
    chapterDigests: input.chapterDigests ?? undefined,
    chapterBlocks: input.chapterBlocks,
    readerAnalysis: input.readerAnalysis,
  });
}

/** 전체 장 원고 — 장마다 순차 digest 후 최종 합성 (잘림 없음) */
export async function runSalesPageCopyFromChapters(
  chapters: ChapterLike[],
  input: Omit<SalesPageCopyInput, "fullText">,
): Promise<SalesPageCopyResult & { chaptersAnalyzed: number; digestCalls: number }> {
  const analysis = await analyzeBookManuscript(chapters, input.bookTitle);

  const userMessage = buildManuscriptContextMessage({
    bookTitle: input.bookTitle,
    bookSubtitle: input.bookSubtitle,
    manuscript: analysis.manuscript,
    chapterDigests: analysis.chapterDigests,
    chapterBlocks: analysis.blocks,
    readerAnalysis: input.readerAnalysis,
  });

  const result = await generateFinalCopy(analysis.provider, userMessage);

  return {
    ...result,
    chaptersAnalyzed: analysis.chaptersAnalyzed,
    digestCalls: analysis.digestCalls,
  };
}
