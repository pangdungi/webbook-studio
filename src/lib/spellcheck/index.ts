import type { SpellcheckResult } from "@/lib/types/database";
import {
  applyLocalCorrectionsToText,
  buildSpellcheckResult,
  findLocalCorrections,
  normalizeSpellcheckResult,
} from "./localRules";

const SYSTEM_PROMPT = `You are a professional Korean proofreader for book manuscripts.

Task: Read the ENTIRE input and produce a fully corrected Korean version.

Fix ALL of:
- 맞춤법 (spelling)
- 띄어쓰기 (spacing)
- 오탈자 and typos (including broken/spaced syllables like "잚 ㅗ르겟다")
- 문장 부호 (punctuation spacing)
- obvious keyboard mistakes and duplicated letters (e.g. "오오늘" → "오늘")

Rules:
1. "correctedText" is the PRIMARY output — the complete rewritten text with every error fixed.
2. Preserve paragraph breaks and overall meaning. Do not change the author's intent or add new content.
3. Return JSON ONLY:
{
  "correctedText": "full corrected version of entire input",
  "corrections": [
    { "from": "exact wrong substring", "to": "corrected substring", "reason": "맞춤법|띄어쓰기|오탈자|문장부호: 설명", "offset": 0 }
  ]
}
4. "offset" = 0-based character index in the ORIGINAL input where "from" starts.
5. List representative corrections when possible, but ALWAYS return a complete correctedText even if listing every change is hard.
6. If the input is garbled, reconstruct the most likely intended Korean phrase in correctedText.`;

const CHUNK_SIZE = 3500;
const ANTHROPIC_MODEL =
  process.env.SPELLCHECK_ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

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
        { role: "user", content: text },
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI error: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content) as SpellcheckResult;
  const normalized = normalizeSpellcheckResult(text, parsed);

  return {
    corrections: normalized.corrections,
    correctedText: parsed.correctedText?.trim() || normalized.correctedText,
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
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic error: ${res.status} ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.content?.[0]?.text ?? "{}";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch?.[0] ?? content) as SpellcheckResult;
  const normalized = normalizeSpellcheckResult(text, parsed);

  return {
    corrections: normalized.corrections,
    correctedText: parsed.correctedText?.trim() || normalized.correctedText,
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
  const allCorrections: SpellcheckResult["corrections"] = [];
  const correctedParts: string[] = [];
  let searchFrom = 0;

  for (const chunk of chunks) {
    const start = text.indexOf(chunk, searchFrom);
    if (start === -1) continue;

    const result = await checkWithLlm(chunk);
    if (result?.correctedText) {
      correctedParts.push(result.correctedText);
    }
    if (result?.corrections) {
      for (const c of result.corrections) {
        allCorrections.push({ ...c, offset: c.offset + start });
      }
    }

    searchFrom = start + chunk.length;
    if (text[searchFrom] === "\n") searchFrom += 1;
  }

  if (correctedParts.length === 0 && allCorrections.length === 0) {
    return null;
  }

  return {
    corrections: allCorrections,
    correctedText: correctedParts.join("\n"),
  };
}

export async function runSpellcheck(text: string): Promise<SpellcheckResult> {
  if (!text.trim()) {
    return { correctedText: text, corrections: [], provider: "local" };
  }

  const localCorrections = findLocalCorrections(text);
  const localCorrected = applyLocalCorrectionsToText(text);

  try {
    const llm = await checkLongTextWithLlm(text);
    if (llm) {
      const provider =
        process.env.SPELLCHECK_PROVIDER === "openai"
          ? "openai"
          : process.env.SPELLCHECK_PROVIDER === "anthropic"
            ? "anthropic"
            : process.env.OPENAI_API_KEY
              ? "openai"
              : "anthropic";

      return {
        ...buildSpellcheckResult(text, { localCorrections, llm }),
        provider,
      };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "맞춤법 검사 API 오류";
    console.error("Spellcheck LLM failed, using local rules:", error);

    return {
      corrections: localCorrections,
      correctedText: localCorrected,
      provider: "local",
      warning: `Claude/OpenAI 연결 실패 (${message}). 로컬 규칙으로 교정했습니다.`,
    };
  }

  return {
    corrections: localCorrections,
    correctedText: localCorrected,
    provider: "local",
  };
}
