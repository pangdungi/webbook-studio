import {
  parseLlmJsonObject,
  salvageWritingReviewFields,
} from "@/lib/llm/parseJsonResponse";
import {
  normalizeParagraphNotes,
  offsetParagraphNotes,
  type ParagraphNote,
  type ParagraphNoteInput,
} from "@/lib/writingReview/paragraphNotes";
import { WRITING_REVIEW_SYSTEM_PROMPT } from "@/lib/writingReview/prompt";

export type WritingReviewResult = {
  revisedText: string;
  summary: string;
  paragraphNotes: ParagraphNote[];
  provider?: "anthropic" | "openai";
  warning?: string;
};

const CHUNK_SIZE = 3500;
const ANTHROPIC_MODEL =
  process.env.SPELLCHECK_ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

function splitText(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return [text];

  const chunks: string[] = [];
  const paragraphs = text.split("\n");
  let current = "";

  for (const para of paragraphs) {
    const piece = current ? `${current}\n${para}` : para;
    if (piece.length > CHUNK_SIZE && current) {
      chunks.push(current);
      current = para;
    } else {
      current = piece;
    }
  }
  if (current) chunks.push(current);

  return chunks.length ? chunks : [text];
}

function parseReviewJson(raw: string, fallbackText: string): WritingReviewResult {
  try {
    const parsed = parseLlmJsonObject<{
      revisedText?: string;
      summary?: string;
      paragraphNotes?: ParagraphNoteInput[];
    }>(raw);

    return {
      revisedText: parsed.revisedText?.trim() || fallbackText,
      summary:
        parsed.summary?.trim() ||
        "다듬은 문장을 확인한 뒤 문단별로 적용해 주세요.",
      paragraphNotes: normalizeParagraphNotes(
        parsed.paragraphNotes ?? [],
      ),
    };
  } catch {
    const fields = salvageWritingReviewFields(raw, fallbackText);
    return {
      revisedText: fields.revisedText,
      summary: fields.summary,
      paragraphNotes: normalizeParagraphNotes(fields.paragraphNotes),
      warning:
        "AI 응답 JSON이 깨져 일부만 복구했습니다. 결과를 확인한 뒤 적용해 주세요.",
    };
  }
}

async function reviewWithAnthropic(text: string): Promise<WritingReviewResult> {
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
      model: ANTHROPIC_MODEL,
      max_tokens: 8192,
      system: WRITING_REVIEW_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `이 본문은 ${text.split("\n").length}줄(\\n으로 구분)입니다. revisedText도 같은 ${text.split("\n").length}줄을 유지하세요. 고친 줄마다 paragraphNotes에 problem·suggestion·criteria를 넣으세요.\n\n${text}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic error: ${res.status} ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.content?.[0]?.text ?? "{}";
  const result = parseReviewJson(content, text);

  return { ...result, provider: "anthropic" };
}

async function reviewWithOpenAI(text: string): Promise<WritingReviewResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: WRITING_REVIEW_SYSTEM_PROMPT },
        {
          role: "user",
          content: `이 본문은 ${text.split("\n").length}줄(\\n으로 구분)입니다. revisedText도 같은 ${text.split("\n").length}줄을 유지하세요. 고친 줄마다 paragraphNotes에 problem·suggestion·criteria를 넣으세요.\n\n${text}`,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI error: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const result = parseReviewJson(content, text);

  return { ...result, provider: "openai" };
}

async function reviewWithLlm(text: string): Promise<WritingReviewResult | null> {
  const provider = process.env.SPELLCHECK_PROVIDER ?? "local";

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return reviewWithOpenAI(text);
  }
  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return reviewWithAnthropic(text);
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return reviewWithAnthropic(text);
  }
  if (process.env.OPENAI_API_KEY) {
    return reviewWithOpenAI(text);
  }
  return null;
}

async function reviewLongText(text: string): Promise<WritingReviewResult | null> {
  if (text.length <= CHUNK_SIZE) {
    return reviewWithLlm(text);
  }

  const chunks = splitText(text);
  const revisedParts: string[] = [];
  const summaries: string[] = [];
  const allNotes: ParagraphNote[] = [];
  let provider: WritingReviewResult["provider"];
  let warning: string | undefined;
  let searchFrom = 0;
  let lineOffset = 0;

  for (const chunk of chunks) {
    const start = text.indexOf(chunk, searchFrom);
    if (start === -1) continue;

    const result = await reviewWithLlm(chunk);
    if (!result) return null;

    revisedParts.push(result.revisedText);
    if (result.summary) summaries.push(result.summary);
    provider = result.provider ?? provider;
    if (result.warning) warning = result.warning;
    allNotes.push(
      ...offsetParagraphNotes(result.paragraphNotes, lineOffset),
    );
    lineOffset += chunk.split("\n").length;
    searchFrom = start + chunk.length;
    if (text[searchFrom] === "\n") searchFrom += 1;
  }

  if (revisedParts.length === 0) return null;

  return {
    revisedText: revisedParts.join("\n"),
    summary: summaries.join(" "),
    paragraphNotes: allNotes,
    provider,
    warning,
  };
}

export async function runWritingReview(text: string): Promise<WritingReviewResult> {
  if (!text.trim()) {
    return {
      revisedText: text,
      summary: "검사할 본문이 없습니다.",
      paragraphNotes: [],
    };
  }

  try {
    const llm = await reviewLongText(text);
    if (llm) return llm;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "글검사 API 오류";
    console.error("Writing review LLM failed:", error);
    if (/JSON|parse|position/i.test(message)) {
      throw new Error(
        `글검사 응답을 해석하지 못했습니다 (${message}). 다시 시도해 주세요.`,
      );
    }
    throw new Error(
      `Claude/OpenAI 연결 실패 (${message}). .env.local의 ANTHROPIC_API_KEY와 SPELLCHECK_PROVIDER=anthropic을 확인해 주세요.`,
    );
  }

  throw new Error(
    "글검사 API 키가 없습니다. ANTHROPIC_API_KEY를 설정해 주세요.",
  );
}
