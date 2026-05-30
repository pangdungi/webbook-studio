import type { SpellCorrection, SpellcheckResult } from "@/lib/types/database";
import {
  anchorCorrectionsToText,
  applyCorrectionsToPlainText,
  dedupeCorrections,
} from "./localRules";
import { splitTextForPnu, chunkStarts } from "./pnuSpeller";

const DAUM_URL = "https://dic.daum.net/grammar_checker.do";
const DAUM_MAX_CHARS = 1000;
const REQUEST_TIMEOUT_MS = 20_000;
const DAUM_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type DaumTypo = {
  token: string;
  suggestions: string[];
  info?: string;
  type?: string;
};

function getAttr(line: string, key: string): string {
  const found = line.indexOf(key);
  const firstQuote = line.indexOf('"', found + 1);
  const secondQuote = line.indexOf('"', firstQuote + 1);
  return line.slice(firstQuote + 1, secondQuote);
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseDaumHtml(response: string): DaumTypo[] {
  const typos: DaumTypo[] = [];
  let found = -1;

  for (;;) {
    found = response.indexOf("data-error-type", found + 1);
    if (found === -1) break;

    const end = response.indexOf(">", found + 1);
    const line = response.slice(found, end);
    const token = decodeHtmlEntities(getAttr(line, "data-error-input="));
    const suggestion = decodeHtmlEntities(getAttr(line, "data-error-output="));
    const type = decodeHtmlEntities(getAttr(line, "data-error-type="));

    typos.push({
      type,
      token,
      suggestions: [suggestion],
      info: type === "space" ? "띄어쓰기" : "맞춤법",
    });
  }

  return typos;
}

function mapDaumReason(typo: DaumTypo): string {
  if (typo.type === "space") return "띄어쓰기: 다음 맞춤법 검사기";
  return "맞춤법: 다음 맞춤법 검사기";
}

function typosToCorrections(
  chunk: string,
  typos: DaumTypo[],
  chunkOffset: number,
): SpellCorrection[] {
  const corrections: SpellCorrection[] = [];

  for (const typo of typos) {
    const from = typo.token;
    const to = typo.suggestions[0] ?? "";
    if (!from || !to || from === to) continue;

    let offset = chunk.indexOf(from);
    if (offset === -1) {
      const trimmed = from.replace(/[.!?]+$/, "");
      offset = chunk.indexOf(trimmed);
      if (offset === -1) continue;
    }

    corrections.push({
      from,
      to,
      reason: mapDaumReason(typo),
      offset: chunkOffset + offset,
    });
  }

  return corrections;
}

async function fetchDaumHtml(sentence: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(DAUM_URL, {
      method: "POST",
      headers: {
        "User-Agent": DAUM_UA,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: new URLSearchParams({ sentence }).toString(),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`Daum HTTP ${res.status}`);

    const body = await res.text();
    if (!body.includes('="screen_out">맞춤법 검사기 본문')) {
      throw new Error("Daum 응답 형식이 올바르지 않습니다.");
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function splitForDaum(text: string): string[] {
  if (text.length <= DAUM_MAX_CHARS) return [text];

  const chunks: string[] = [];
  let rest = text;
  while (rest.length > DAUM_MAX_CHARS) {
    let cut = rest.lastIndexOf(".", DAUM_MAX_CHARS);
    if (cut < DAUM_MAX_CHARS * 0.5) cut = rest.lastIndexOf("\n", DAUM_MAX_CHARS);
    if (cut < 1) cut = DAUM_MAX_CHARS;
    chunks.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) chunks.push(rest);
  return chunks.length ? chunks : [text];
}

export async function checkWithDaum(text: string): Promise<SpellcheckResult> {
  const chunks = splitForDaum(text);
  const starts = chunkStarts(text, chunks);

  const parts = await Promise.all(
    chunks.map(async (chunk, i) => {
      const html = await fetchDaumHtml(chunk);
      const typos = parseDaumHtml(html);
      return typosToCorrections(chunk, typos, starts[i] ?? 0);
    }),
  );

  const flat = dedupeCorrections(parts.flat());
  const anchored = anchorCorrectionsToText(text, flat);

  return {
    corrections: anchored,
    correctedText: applyCorrectionsToPlainText(text, anchored),
    provider: "daum",
  };
}
