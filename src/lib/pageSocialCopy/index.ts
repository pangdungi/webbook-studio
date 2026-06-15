import {
  PAGE_SOCIAL_ANTHROPIC_MODEL,
  PAGE_SOCIAL_MAX_TOKENS,
  PAGE_SOCIAL_OPENAI_MODEL,
} from "@/lib/pageSocialCopy/models";
import { parsePageSocialCopyJson } from "@/lib/pageSocialCopy/normalize";
import { PAGE_SOCIAL_COPY_SYSTEM_PROMPT } from "@/lib/pageSocialCopy/prompt";
import type {
  PageSocialCopyInput,
  PageSocialCopyResult,
} from "@/lib/pageSocialCopy/types";

type LlmProvider = "anthropic" | "openai";

function pickProvider(): LlmProvider {
  const pref = process.env.SPELLCHECK_PROVIDER ?? "local";
  if (pref === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  throw new Error(
    "SNS 카피 API 키가 없습니다. ANTHROPIC_API_KEY를 설정해 주세요.",
  );
}

function buildUserMessage(input: PageSocialCopyInput): string {
  const lines: string[] = [];
  if (input.bookTitle?.trim()) {
    lines.push(`## 책 제목\n${input.bookTitle.trim()}`);
  }
  if (input.chapterTitle?.trim()) {
    lines.push(`## 장 제목\n${input.chapterTitle.trim()}`);
  }
  if (input.pageTitle?.trim()) {
    lines.push(`## 페이지 부제\n${input.pageTitle.trim()}`);
  }
  lines.push(`## 이 페이지 본문 (전체)\n${input.pageText.trim()}`);
  return lines.join("\n\n");
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
      model: PAGE_SOCIAL_ANTHROPIC_MODEL,
      max_tokens: PAGE_SOCIAL_MAX_TOKENS,
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
      model: PAGE_SOCIAL_OPENAI_MODEL,
      max_tokens: PAGE_SOCIAL_MAX_TOKENS,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function runPageSocialCopy(
  input: PageSocialCopyInput,
): Promise<PageSocialCopyResult> {
  if (!input.pageText.trim()) {
    throw new Error("이 페이지에 분석할 본문이 없습니다.");
  }

  const provider = pickProvider();
  const userMessage = buildUserMessage(input);

  const raw =
    provider === "openai"
      ? await callOpenAI(PAGE_SOCIAL_COPY_SYSTEM_PROMPT, userMessage)
      : await callAnthropic(PAGE_SOCIAL_COPY_SYSTEM_PROMPT, userMessage);

  const report = parsePageSocialCopyJson(raw);
  if (!report) {
    throw new Error("SNS 카피를 파싱하지 못했습니다. 다시 시도해 주세요.");
  }

  return { report, provider };
}
