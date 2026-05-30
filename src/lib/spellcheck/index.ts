import type { SpellcheckResult } from "@/lib/types/database";
import {
  applyCorrectionsToPlainText,
  buildSpellcheckResult,
  findLocalCorrections,
  normalizeSpellcheckResult,
} from "./localRules";
import {
  parseLlmJsonObject,
  salvageSpellcheckCorrections,
} from "@/lib/llm/parseJsonResponse";
import {
  checkWithKoreanSpeller,
  isKoreanSpellerEnabled,
} from "./koreanSpeller";
import { runSpellcheckLocal } from "./runLocal";

export { runSpellcheckLocal } from "./runLocal";

const SYSTEM_PROMPT = `당신은 한국어 원고 교정 전문가입니다. 아래 유형의 **실제 오류**를 빠짐없이 찾습니다.

## 반드시 잡을 것
1. **오타**: 잘못된 글자, 키보드 실수, 끊긴 음절(예: "잚 ㅗ르겟다")
2. **맞춤법**: 표기 오류(됬/됐, 되요/돼요, 할께/할게, 안되/안 돼)
3. **띄어쓰기**: 한국어 단어·조사·어미 사이만(것 같, 수 있, 안 돼 등). 숫자·영문과 한글 사이는 제외
4. **문법**: 조사·어미·시제·높임·주술 호응, 피동/사동, 이중 부정, 틀린 연결 어미
5. **문장**: 문법적으로 성립하지 않는 문장, 어색한 연결, 중복·누락된 조사, 깨진 문장

## 하지 말 것
- 한글과 숫자·영문 사이에 공백 넣기 (3개, 2024년, iPhone, A4 유지)
- 문체·어조·표현만 다듬기(문법이 맞으면 그대로)
- 사실·의미·문학적 의도 변경

## 출력 (JSON만)
{"corrections":[{"from":"원문과 동일한 틀린 부분","to":"고친 부분","reason":"오타|맞춤법|띄어쓰기|문법|문장: 한 줄 설명","offset":0}]}

- offset: 원문에서 from이 시작하는 0부터의 글자 위치
- correctedText 필드 없음. 최대 25건. reason 80자 이내. JSON만(후행 쉼표·문자열 안 실제 줄바꿈 금지)
- from은 원문에 실제로 있는 연속 문자열이어야 함`;

const CHUNK_SIZE = 4000;
const ANTHROPIC_MODEL =
  process.env.SPELLCHECK_ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

function maxTokensForText(text: string): number {
  return Math.min(8192, Math.max(1024, Math.ceil(text.length * 1.2)));
}

function buildUserMessage(text: string): string {
  return `다음 원고에서 오타·맞춤법·띄어쓰기·문법·문장 오류를 모두 찾아 corrections JSON으로 반환하세요.\n\n---\n${text}\n---`;
}

function parseSpellcheckLlmJson(
  raw: string,
  text: string,
): SpellcheckResult {
  try {
    return parseLlmJsonObject<SpellcheckResult>(raw);
  } catch {
    const salvaged = salvageSpellcheckCorrections(raw);
    return normalizeSpellcheckResult(text, {
      corrections: salvaged
        .filter((c) => c.from && c.to)
        .map((c) => ({
          from: c.from!,
          to: c.to!,
          reason: c.reason ?? "AI 교정",
          offset: c.offset ?? 0,
        })),
      correctedText: text,
    });
  }
}

function aiSupplementEnabled(): boolean {
  const flag = process.env.SPELLCHECK_AI_SUPPLEMENT;
  return flag === "1" || flag === "true";
}

function aiFallbackEnabled(): boolean {
  const flag = process.env.SPELLCHECK_FALLBACK_AI;
  if (flag === "0" || flag === "false") return false;
  return true;
}

function hasLlmSpellcheckKeys(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

function splitTextForSpellcheck(text: string): string[] {
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

function chunkStarts(text: string, chunks: string[]): number[] {
  const starts: number[] = [];
  let searchFrom = 0;
  for (const chunk of chunks) {
    const start = text.indexOf(chunk, searchFrom);
    starts.push(start === -1 ? searchFrom : start);
    searchFrom = (start === -1 ? searchFrom : start) + chunk.length;
    if (text[searchFrom] === "\n") searchFrom += 1;
  }
  return starts;
}

async function checkWithOpenAI(text: string): Promise<SpellcheckResult> {
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
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(text) },
      ],
      temperature: 0,
      max_tokens: maxTokensForText(text),
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI error: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = parseSpellcheckLlmJson(content, text);
  const normalized = normalizeSpellcheckResult(text, parsed);

  return {
    corrections: normalized.corrections,
    correctedText: applyCorrectionsToPlainText(text, normalized.corrections),
  };
}

async function checkWithAnthropic(text: string): Promise<SpellcheckResult> {
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
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(text) }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic error: ${res.status} ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.content?.[0]?.text ?? "{}";
  const parsed = parseSpellcheckLlmJson(content, text);
  const normalized = normalizeSpellcheckResult(text, parsed);

  return {
    corrections: normalized.corrections,
    correctedText: applyCorrectionsToPlainText(text, normalized.corrections),
  };
}

async function checkWithLlm(text: string): Promise<SpellcheckResult | null> {
  const provider = process.env.SPELLCHECK_PROVIDER ?? "local";

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return checkWithOpenAI(text);
  }
  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return checkWithAnthropic(text);
  }
  if (process.env.OPENAI_API_KEY) {
    return checkWithOpenAI(text);
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return checkWithAnthropic(text);
  }
  return null;
}

async function checkLongTextWithLlm(text: string): Promise<SpellcheckResult | null> {
  if (text.length <= CHUNK_SIZE) {
    return checkWithLlm(text);
  }

  const chunks = splitTextForSpellcheck(text);
  const starts = chunkStarts(text, chunks);

  const parts = await Promise.all(
    chunks.map((chunk) => checkWithLlm(chunk)),
  );

  const allCorrections: SpellcheckResult["corrections"] = [];
  for (let i = 0; i < parts.length; i++) {
    const result = parts[i];
    const start = starts[i] ?? 0;
    if (result?.corrections) {
      for (const c of result.corrections) {
        allCorrections.push({ ...c, offset: c.offset + start });
      }
    }
  }

  if (allCorrections.length === 0) return null;

  const localCorrections = findLocalCorrections(text);
  return buildSpellcheckResult(text, {
    localCorrections,
    llm: {
      corrections: allCorrections,
      correctedText: applyCorrectionsToPlainText(text, allCorrections),
    },
  });
}

function resolveProvider(): SpellcheckResult["provider"] {
  if (process.env.SPELLCHECK_PROVIDER === "openai") return "openai";
  if (process.env.SPELLCHECK_PROVIDER === "anthropic") return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "local";
}

/** 맞춤법 검사: PNU(국립국어원 공개 검사기 엔진) 우선, 선택적 AI 보조 */
export async function runSpellcheckWithAi(text: string): Promise<SpellcheckResult> {
  const local = runSpellcheckLocal(text);
  const warnings: string[] = [];
  let base: SpellcheckResult = local;
  let provider: SpellcheckResult["provider"] = "local";

  if (isKoreanSpellerEnabled()) {
    try {
      const speller = await checkWithKoreanSpeller(text);
      base = buildSpellcheckResult(text, {
        localCorrections: local.corrections,
        llm: speller,
      });
      provider = speller.provider ?? "daum";
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "맞춤법 검사기 연결 오류";
      console.error("Spellcheck external failed:", error);

      if (aiFallbackEnabled() && hasLlmSpellcheckKeys()) {
        try {
          const llm = await checkLongTextWithLlm(text);
          if (llm) {
            return {
              ...buildSpellcheckResult(text, {
                localCorrections: local.corrections,
                llm,
              }),
              provider: resolveProvider(),
              warning: `공개 검사기 연결 실패 → AI로 검사했습니다. (${message})`,
            };
          }
        } catch (llmError) {
          console.error("Spellcheck AI fallback failed:", llmError);
        }
      }

      warnings.push(
        `맞춤법 검사기 연결 실패 (${message}). 보조 규칙만 표시합니다.`,
      );
    }
  }

  if (!aiSupplementEnabled()) {
    if (provider === "daum" || provider === "naver" || provider === "pnu") {
      return { ...base, provider };
    }
    if (!isKoreanSpellerEnabled()) {
      warnings.push(
        "맞춤법 검사기가 꺼져 있습니다. SPELLCHECK_USE_PNU=true 로 켜 주세요.",
      );
    }
    return {
      ...base,
      provider,
      warning: warnings.length ? warnings.join(" ") : undefined,
    };
  }

  try {
    const llm = await checkLongTextWithLlm(text);
    if (llm) {
      return {
        ...buildSpellcheckResult(text, {
          localCorrections: base.corrections,
          llm,
        }),
        provider:
          provider === "daum" || provider === "naver" || provider === "pnu"
            ? provider
            : resolveProvider(),
        warning: warnings.length ? warnings.join(" ") : undefined,
      };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "맞춤법 검사 API 오류";
    console.error("Spellcheck LLM failed:", error);
    if (provider === "daum" || provider === "naver" || provider === "pnu") {
      return {
        ...base,
        provider,
        warning: `AI 보조 검사 실패 (${message}). 맞춤법 검사기 결과는 유지됩니다.`,
      };
    }
    warnings.push(`AI 검사 실패 (${message}). 기본 규칙 결과만 표시합니다.`);
  }

  if (provider === "daum" || provider === "naver" || provider === "pnu") {
    return { ...base, provider, warning: warnings.join(" ") || undefined };
  }

  return {
    ...local,
    provider: "local",
    warning:
      warnings.join(" ") ||
      "AI API 키가 없습니다. 맞춤법 검사기 또는 .env의 ANTHROPIC_API_KEY를 확인하세요.",
  };
}

/** @deprecated ai 기본 false — runSpellcheckLocal / runSpellcheckWithAi 사용 */
export async function runSpellcheck(
  text: string,
  options?: { ai?: boolean },
): Promise<SpellcheckResult> {
  if (options?.ai) return runSpellcheckWithAi(text);
  return runSpellcheckLocal(text);
}
