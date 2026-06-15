/** 상세페이지 — digest·final 모두 품질 우선 (기본 Opus / gpt-4o) */

export const SALES_PAGE_ANTHROPIC_DEFAULT = "claude-opus-4-6";
export const SALES_PAGE_OPENAI_DEFAULT = "gpt-4o";

export type SalesPageLlmPhase = "digest" | "final";

export function salesPageAnthropicModel(phase: SalesPageLlmPhase): string {
  if (phase === "digest") {
    return (
      process.env.SALES_PAGE_DIGEST_ANTHROPIC_MODEL?.trim() ||
      SALES_PAGE_ANTHROPIC_DEFAULT
    );
  }
  return (
    process.env.SALES_PAGE_FINAL_ANTHROPIC_MODEL?.trim() ||
    SALES_PAGE_ANTHROPIC_DEFAULT
  );
}

export function salesPageOpenAiModel(phase: SalesPageLlmPhase): string {
  if (phase === "digest") {
    return (
      process.env.SALES_PAGE_DIGEST_OPENAI_MODEL?.trim() ||
      SALES_PAGE_OPENAI_DEFAULT
    );
  }
  return (
    process.env.SALES_PAGE_FINAL_OPENAI_MODEL?.trim() ||
    SALES_PAGE_OPENAI_DEFAULT
  );
}

/** digest — 장별 심층 추출 */
export const SALES_PAGE_DIGEST_MAX_TOKENS = 8192;
/** final — 카피·혜택·인식단계·틈새시장 JSON */
export const SALES_PAGE_FINAL_MAX_TOKENS = 16_384;
