import {
  parseLlmJsonObject,
  salvageWritingEvaluationFields,
} from "@/lib/llm/parseJsonResponse";
import type {
  ArgumentFramework,
  EmpathyFramework,
  WritingEvaluationReport,
  WritingEvaluationResult,
  WritingGenre,
  WritingImprovementSuggestion,
} from "@/lib/writingEvaluation/types";
import { WRITING_EVALUATION_SYSTEM_PROMPT } from "@/lib/writingEvaluation/prompt";

const ANTHROPIC_MODEL =
  process.env.SPELLCHECK_ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const OPENAI_MODEL = process.env.WRITING_REVIEW_OPENAI_MODEL ?? "gpt-4o";

function maxTokensForText(text: string): number {
  return Math.min(8192, Math.max(2560, Math.ceil(text.length * 1.2) + 2000));
}

function buildUserMessage(text: string, pageSubtitle: string): string {
  const sub =
    pageSubtitle.trim().length > 0
      ? `페이지 부제목: 「${pageSubtitle.trim()}」\n\n`
      : "페이지 부제목: (없음)\n\n";
  return `${sub}아래는 이 편집 페이지의 전체 본문입니다. 유형 판별·평가 후 improvements에 「어디가 문제 → 이렇게 고치면」을 3~6개 반드시 넣으세요.\n\n---\n${text}\n---`;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());
}

function parseEmpathy(raw: unknown): EmpathyFramework | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const observation = asString(o.observation);
  const reflection = asString(o.reflection);
  const insight = asString(o.insight);
  const suggestedOutline = asString(o.suggestedOutline);
  if (!observation && !reflection && !insight) return undefined;
  return { observation, reflection, insight, suggestedOutline };
}

function parseArgument(raw: unknown): ArgumentFramework | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const claim = asString(o.claim);
  if (!claim) return undefined;
  return {
    claim,
    reasons: asStringArray(o.reasons),
    examples: asStringArray(o.examples),
    methodProposal: asString(o.methodProposal),
    suggestedOutline: asString(o.suggestedOutline),
  };
}

function normalizeGenre(value: unknown): WritingGenre {
  return value === "argument" ? "argument" : "empathy";
}

function parseImprovements(raw: unknown): WritingImprovementSuggestion[] {
  if (!Array.isArray(raw)) return [];
  const out: WritingImprovementSuggestion[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const area = asString(o.area);
    const problem = asString(o.problem);
    const suggestion = asString(o.suggestion);
    if (!problem && !suggestion) continue;
    out.push({
      area: area || "본문",
      problem: problem || "개선이 필요한 부분",
      suggestion: suggestion || "구체적 수정 방향을 정리하지 못했습니다.",
      category: asString(o.category) || undefined,
    });
  }

  return out.slice(0, 8);
}

function normalizeReport(raw: Record<string, unknown>): WritingEvaluationReport {
  const genre = normalizeGenre(raw.genre);
  const genreLabel =
    asString(raw.genreLabel) ||
    (genre === "argument" ? "주장·설득형" : "공감·경험 공유형");

  return {
    genre,
    genreLabel,
    genreRationale: asString(raw.genreRationale, "유형 판별 근거를 정리하지 못했습니다."),
    coreMessage: asString(raw.coreMessage, "핵심 메시지를 추출하지 못했습니다."),
    singleMessage: raw.singleMessage === true,
    singleMessageAssessment: asString(
      raw.singleMessageAssessment,
      "메시지 일관성을 평가하지 못했습니다.",
    ),
    subtitleAlignment: asString(
      raw.subtitleAlignment,
      "부제목과의 관계를 평가하지 못했습니다.",
    ),
    idealReaders: asStringArray(raw.idealReaders),
    improvements: parseImprovements(raw.improvements),
    empathy: genre === "empathy" ? parseEmpathy(raw.empathy) : undefined,
    argument: genre === "argument" ? parseArgument(raw.argument) : undefined,
    overallSummary: asString(raw.overallSummary, "평가 요약을 생성하지 못했습니다."),
    analyzedAt: new Date().toISOString(),
  };
}

function parseEvaluationJson(raw: string): {
  report: WritingEvaluationReport;
  warning?: string;
} {
  try {
    const parsed = parseLlmJsonObject<Record<string, unknown>>(raw);
    return { report: normalizeReport(parsed) };
  } catch {
    const salvaged = salvageWritingEvaluationFields(raw);
    return {
      report: normalizeReport(salvaged),
      warning:
        "AI 응답 JSON이 깨져 일부만 복구했습니다. 표시된 평가를 확인해 주세요.",
    };
  }
}

async function evaluateWithAnthropic(
  text: string,
  pageSubtitle: string,
): Promise<WritingEvaluationResult> {
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
      max_tokens: maxTokensForText(text),
      system: WRITING_EVALUATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(text, pageSubtitle) }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic error: ${res.status} ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.content?.[0]?.text ?? "{}";
  const { report, warning } = parseEvaluationJson(content);
  return { report, provider: "anthropic", warning };
}

async function evaluateWithOpenAI(
  text: string,
  pageSubtitle: string,
): Promise<WritingEvaluationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: WRITING_EVALUATION_SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(text, pageSubtitle) },
      ],
      temperature: 0.2,
      max_tokens: maxTokensForText(text),
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI error: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const { report, warning } = parseEvaluationJson(content);
  return { report, provider: "openai", warning };
}

export async function runWritingEvaluation(
  text: string,
  pageSubtitle = "",
): Promise<WritingEvaluationResult> {
  if (!text.trim()) {
    throw new Error("평가할 본문이 없습니다.");
  }

  const provider = process.env.SPELLCHECK_PROVIDER ?? "local";

  try {
    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      return evaluateWithOpenAI(text, pageSubtitle);
    }
    if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
      return evaluateWithAnthropic(text, pageSubtitle);
    }
    if (process.env.ANTHROPIC_API_KEY) {
      return evaluateWithAnthropic(text, pageSubtitle);
    }
    if (process.env.OPENAI_API_KEY) {
      return evaluateWithOpenAI(text, pageSubtitle);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "글평가 API 오류";
    console.error("Writing evaluation failed:", error);
    if (/JSON|parse/i.test(message)) {
      throw new Error(
        `글평가 응답을 해석하지 못했습니다 (${message}). 다시 시도해 주세요.`,
      );
    }
    throw new Error(
      `Claude/OpenAI 연결 실패 (${message}). ANTHROPIC_API_KEY를 확인해 주세요.`,
    );
  }

  throw new Error(
    "글평가 API 키가 없습니다. ANTHROPIC_API_KEY를 설정해 주세요.",
  );
}
