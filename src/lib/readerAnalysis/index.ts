import { parseReaderAnalysisJson } from "@/lib/readerAnalysis/normalize";
import { READER_ANALYSIS_SYSTEM_PROMPT } from "@/lib/readerAnalysis/prompt";
import type { ReaderAnalysisResult } from "@/lib/readerAnalysis/types";

const ANTHROPIC_MODEL =
  process.env.SPELLCHECK_ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

export type ReaderAnalysisInput = {
  bookTitle: string;
  pitch: string;
  sampleText?: string;
};

function buildUserMessage(input: ReaderAnalysisInput): string {
  const lines = [
    `## 책 제목\n${input.bookTitle.trim() || "(제목 없음)"}`,
    `## 책 내용 요약 (작가 입력)\n${input.pitch.trim()}`,
  ];
  if (input.sampleText?.trim()) {
    lines.push(`## 원고 발췌 (참고)\n${input.sampleText.trim()}`);
  }
  return lines.join("\n\n");
}

async function analyzeWithAnthropic(
  input: ReaderAnalysisInput,
): Promise<ReaderAnalysisResult> {
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
      max_tokens: 4096,
      system: READER_ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(input) }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic error: ${res.status} ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.content?.[0]?.text ?? "";
  const report = parseReaderAnalysisJson(content);
  if (!report) {
    throw new Error("독자 분석 결과를 파싱하지 못했습니다. 다시 시도해 주세요.");
  }

  return { report, provider: "anthropic" };
}

async function analyzeWithOpenAI(
  input: ReaderAnalysisInput,
): Promise<ReaderAnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      max_tokens: 4096,
      messages: [
        { role: "system", content: READER_ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(input) },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const report = parseReaderAnalysisJson(content);
  if (!report) {
    throw new Error("독자 분석 결과를 파싱하지 못했습니다.");
  }

  return { report, provider: "openai" };
}

export async function runReaderAnalysis(
  input: ReaderAnalysisInput,
): Promise<ReaderAnalysisResult> {
  if (!input.pitch.trim()) {
    throw new Error("책 내용 요약을 입력한 뒤 분석해 주세요.");
  }

  const provider = process.env.SPELLCHECK_PROVIDER ?? "local";

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return analyzeWithOpenAI(input);
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return analyzeWithAnthropic(input);
  }
  if (process.env.OPENAI_API_KEY) {
    return analyzeWithOpenAI(input);
  }

  throw new Error(
    "독자 분석 API 키가 없습니다. ANTHROPIC_API_KEY를 설정해 주세요.",
  );
}
