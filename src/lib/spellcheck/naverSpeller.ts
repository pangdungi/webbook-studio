import type { SpellCorrection, SpellcheckResult } from "@/lib/types/database";
import {
  anchorCorrectionsToText,
  applyCorrectionsToPlainText,
  dedupeCorrections,
} from "./localRules";
import { chunkStarts } from "./pnuSpeller";

const NAVER_PROXY_URL =
  "https://m.search.naver.com/p/csearch/ocontent/util/SpellerProxy";
const NAVER_PASSPORT_PAGE =
  "https://search.naver.com/search.naver?query=%EB%A7%9E%EC%B6%A4%EB%B2%95+%EA%B2%80%EC%82%AC%EA%B8%B0";
const NAVER_MAX_WORDS = 80;
const REQUEST_TIMEOUT_MS = 20_000;
const NAVER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const COLOR_INFO: Record<string, string> = {
  red: "맞춤법",
  green: "띄어쓰기",
  blue: "표준어",
  violet: "통계 교정",
};

let cachedPassportKey: string | null = null;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

async function fetchPassportKey(): Promise<string> {
  const res = await fetch(NAVER_PASSPORT_PAGE, {
    headers: { "User-Agent": NAVER_UA },
    cache: "no-store",
  });
  const body = await res.text();
  const match = body.match(/passportKey=([a-f0-9]+)/);
  if (!match) throw new Error("네이버 passportKey 추출 실패");
  return match[1];
}

async function getPassportKey(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedPassportKey) return cachedPassportKey;
  cachedPassportKey = await fetchPassportKey();
  return cachedPassportKey;
}

function unwrapJsonp(body: string): {
  message?: { result?: NaverResult; error?: string };
} {
  const start = body.indexOf("(");
  const end = body.lastIndexOf(")");
  if (start < 0 || end <= start) throw new Error("네이버 응답 파싱 실패");
  return JSON.parse(body.slice(start + 1, end)) as {
    message?: { result?: NaverResult; error?: string };
  };
}

type NaverResult = {
  errata_count?: number;
  origin_html?: string;
  html?: string;
};

function parseNaverResult(result: NaverResult): Array<{
  token: string;
  suggestions: string[];
  info: string;
}> {
  if (!result.errata_count || !result.origin_html || !result.html) return [];

  const origins: string[] = [];
  const reSpan = /<span class='[^']*'>([\s\S]*?)<\/span>/g;
  let m = reSpan.exec(result.origin_html);
  while (m) {
    origins.push(decodeHtmlEntities(m[1]));
    m = reSpan.exec(result.origin_html);
  }

  const fixes: Array<{ color: string; text: string }> = [];
  const reEm = /<em class='([^']*)'>([\s\S]*?)<\/em>/g;
  m = reEm.exec(result.html);
  while (m) {
    fixes.push({ color: m[1], text: decodeHtmlEntities(m[2]) });
    m = reEm.exec(result.html);
  }

  const typos: Array<{ token: string; suggestions: string[]; info: string }> =
    [];
  const len = Math.min(origins.length, fixes.length);
  for (let i = 0; i < len; i++) {
    typos.push({
      token: origins[i],
      suggestions: [fixes[i].text],
      info: COLOR_INFO[fixes[i].color] ?? "맞춤법",
    });
  }
  return typos;
}

function splitByWordCount(text: string, maxWords: number): string[] {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return [text];

  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(" "));
  }
  return chunks;
}

async function fetchNaverChunk(part: string): Promise<NaverResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const call = async (refreshKey: boolean) => {
    const key = await getPassportKey(refreshKey);
    const url = `${NAVER_PROXY_URL}?_callback=jQuery&q=${encodeURIComponent(part)}&where=nexearch&color_blindness=0&passportKey=${key}`;
    return fetch(url, {
      headers: {
        "User-Agent": NAVER_UA,
        Referer: "https://search.naver.com/",
      },
      signal: controller.signal,
      cache: "no-store",
    });
  };

  try {
    let res = await call(false);
    let body = await res.text();
    if (body.includes("유효한 키가 아닙니다")) {
      res = await call(true);
      body = await res.text();
    }
    if (!res.ok) throw new Error(`Naver HTTP ${res.status}`);

    const json = unwrapJsonp(body);
    const result = json.message?.result;
    if (!result) {
      throw new Error(json.message?.error ?? "네이버 응답 없음");
    }
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

function typosToCorrections(
  chunk: string,
  typos: Array<{ token: string; suggestions: string[]; info: string }>,
  chunkOffset: number,
): SpellCorrection[] {
  const corrections: SpellCorrection[] = [];

  for (const typo of typos) {
    const from = typo.token;
    const to = typo.suggestions[0] ?? "";
    if (!from || !to || from === to) continue;

    const offset = chunk.indexOf(from);
    if (offset === -1) continue;

    corrections.push({
      from,
      to,
      reason: `${typo.info}: 네이버 맞춤법 검사기`,
      offset: chunkOffset + offset,
    });
  }

  return corrections;
}

export async function checkWithNaver(text: string): Promise<SpellcheckResult> {
  const chunks = splitByWordCount(text, NAVER_MAX_WORDS);
  const starts = chunkStarts(text, chunks);

  const parts = await Promise.all(
    chunks.map(async (chunk, i) => {
      const result = await fetchNaverChunk(chunk);
      const typos = parseNaverResult(result);
      return typosToCorrections(chunk, typos, starts[i] ?? 0);
    }),
  );

  const flat = dedupeCorrections(parts.flat());
  const anchored = anchorCorrectionsToText(text, flat);

  return {
    corrections: anchored,
    correctedText: applyCorrectionsToPlainText(text, anchored),
    provider: "naver",
  };
}
