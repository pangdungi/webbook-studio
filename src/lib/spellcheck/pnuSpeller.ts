import type { SpellCorrection, SpellcheckResult } from "@/lib/types/database";
import {
  anchorCorrectionsToText,
  applyCorrectionsToPlainText,
  dedupeCorrections,
} from "./localRules";

const DEFAULT_PNU_URL =
  process.env.SPELLCHECK_PNU_URL ?? "http://164.125.7.61/speller/results";
const MAX_WORDS_PER_REQUEST = 300;
const REQUEST_TIMEOUT_MS = 25_000;

type PnuErrInfo = {
  help?: string;
  orgStr?: string;
  crtStr?: string;
};

type PnuBlock = {
  str?: string;
  errInfo?: PnuErrInfo[];
};

function usePnuSpeller(): boolean {
  const flag = process.env.SPELLCHECK_USE_PNU;
  if (flag === "0" || flag === "false") return false;
  return true;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** PNU·나라인포테크 검사기 어절 제한(약 300어절) */
export function splitTextForPnu(text: string): string[] {
  const paragraphs = text.split("\n");
  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    if (current) {
      chunks.push(current);
      current = "";
    }
  };

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n${para}` : para;
    if (countWords(candidate) > MAX_WORDS_PER_REQUEST && current) {
      flush();
      current = para;
      while (countWords(current) > MAX_WORDS_PER_REQUEST) {
        const words = current.split(/\s+/);
        chunks.push(words.slice(0, MAX_WORDS_PER_REQUEST).join(" "));
        current = words.slice(MAX_WORDS_PER_REQUEST).join(" ");
      }
    } else {
      current = candidate;
    }
  }
  flush();

  return chunks.length ? chunks : [text];
}

export function chunkStarts(text: string, chunks: string[]): number[] {
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

function extractPnuJsonArray(html: string): PnuBlock[] {
  const marker = "data = [";
  const start = html.indexOf(marker);
  if (start < 0) {
    throw new Error("PNU 응답에서 검사 결과를 찾지 못했습니다.");
  }

  const inner = html.slice(start + marker.length).split("];")[0]?.trim();
  if (!inner) {
    throw new Error("PNU 응답 형식이 비어 있습니다.");
  }

  const parsed = JSON.parse(`[${inner}]`) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("PNU 응답이 배열이 아닙니다.");
  }
  return parsed as PnuBlock[];
}

function mapHelpToReason(help: string | undefined): string {
  const trimmed = (help ?? "").replace(/\s+/g, " ").trim();
  if (!trimmed) return "맞춤법 검사기";
  if (/띄어|붙여|공백/i.test(trimmed)) return `띄어쓰기: ${trimmed.slice(0, 120)}`;
  if (/문법|어미|조사/i.test(trimmed)) return `문법: ${trimmed.slice(0, 120)}`;
  if (/철자|오타/i.test(trimmed)) return `오타: ${trimmed.slice(0, 120)}`;
  return `맞춤법: ${trimmed.slice(0, 120)}`;
}

async function fetchPnuHtml(text: string): Promise<string> {
  const url = DEFAULT_PNU_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const body = new URLSearchParams({ text1: text });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent":
          "Mozilla/5.0 (compatible; WebbookStudio/1.0; +https://webbook-studio)",
      },
      body: body.toString(),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`PNU HTTP ${res.status}`);
    }

    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function checkChunkWithPnu(
  chunk: string,
  chunkOffset: number,
): Promise<SpellCorrection[]> {
  const html = await fetchPnuHtml(chunk);
  const blocks = extractPnuJsonArray(html);
  const corrections: SpellCorrection[] = [];

  for (const block of blocks) {
    for (const err of block.errInfo ?? []) {
      const from = err.orgStr?.trim();
      const to = err.crtStr?.trim();
      if (!from || !to || from === to) continue;

      let offset = chunk.indexOf(from);
      if (offset === -1) continue;

      corrections.push({
        from,
        to,
        reason: mapHelpToReason(err.help),
        offset: chunkOffset + offset,
      });
    }
  }

  return corrections;
}

/** 부산대·나라인포테크 맞춤법 검사기(국립국어원 한글 맞춤법 검사기와 동일 엔진 계열) */
export async function checkWithPnu(text: string): Promise<SpellcheckResult> {
  if (!usePnuSpeller()) {
    throw new Error("PNU spellcheck is disabled");
  }

  const chunks = splitTextForPnu(text);
  const starts = chunkStarts(text, chunks);

  const parts = await Promise.all(
    chunks.map((chunk, i) => checkChunkWithPnu(chunk, starts[i] ?? 0)),
  );

  const flat = dedupeCorrections(parts.flat());
  const anchored = anchorCorrectionsToText(text, flat);

  return {
    corrections: anchored,
    correctedText: applyCorrectionsToPlainText(text, anchored),
    provider: "pnu",
  };
}

export function isPnuSpellcheckEnabled(): boolean {
  return usePnuSpeller();
}
