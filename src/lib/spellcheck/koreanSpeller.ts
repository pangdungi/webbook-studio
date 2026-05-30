import type { SpellcheckResult } from "@/lib/types/database";
import { checkWithDaum } from "./daumSpeller";
import { checkWithNaver } from "./naverSpeller";
import { checkWithPnu } from "./pnuSpeller";

export type SpellerBackend = "daum" | "naver" | "pnu";

const DEFAULT_ORDER: SpellerBackend[] = ["daum", "naver", "pnu"];

function parseSpellerOrder(): SpellerBackend[] {
  const raw = process.env.SPELLCHECK_SPELLER_ORDER?.trim();
  if (!raw) return DEFAULT_ORDER;

  const allowed = new Set<SpellerBackend>(["daum", "naver", "pnu"]);
  const order = raw
    .split(",")
    .map((s) => s.trim().toLowerCase() as SpellerBackend)
    .filter((s): s is SpellerBackend => allowed.has(s));

  return order.length ? order : DEFAULT_ORDER;
}

async function runBackend(
  name: SpellerBackend,
  text: string,
): Promise<SpellcheckResult> {
  if (name === "daum") return checkWithDaum(text);
  if (name === "naver") return checkWithNaver(text);
  return checkWithPnu(text);
}

/** 공개 맞춤법 검사기 연동 (다음 → 네이버 → 부산대 순, 환경변수로 변경 가능) */
export async function checkWithKoreanSpeller(
  text: string,
): Promise<SpellcheckResult> {
  const order = parseSpellerOrder();
  const errors: string[] = [];

  for (const backend of order) {
    try {
      return await runBackend(backend, text);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown error";
      console.error(`Spellcheck ${backend} failed:`, error);
      errors.push(`${backend}: ${message}`);
    }
  }

  throw new Error(
    errors.join("; ") || "맞춤법 검사기에 연결하지 못했습니다.",
  );
}

export function isKoreanSpellerEnabled(): boolean {
  const flag = process.env.SPELLCHECK_USE_PNU;
  if (flag === "0" || flag === "false") return false;
  return true;
}
