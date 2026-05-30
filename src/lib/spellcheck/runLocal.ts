import type { SpellcheckResult } from "@/lib/types/database";
import {
  applyLocalCorrectionsToText,
  findLocalCorrections,
} from "@/lib/spellcheck/localRules";

/**
 * API 없이 즉시 실행. 국어사전이 아니라 코드에 하드코딩된 표기 목록만 검사.
 * 맞춤법 버튼 기본 경로가 아님 — AI 실패 시에만 사용.
 */
export function runSpellcheckLocal(text: string): SpellcheckResult {
  if (!text.trim()) {
    return { correctedText: text, corrections: [], provider: "local" };
  }

  const corrections = findLocalCorrections(text);
  return {
    corrections,
    correctedText: applyLocalCorrectionsToText(text),
    provider: "local",
  };
}
