/** 현재 페이지 SNS 카피 — 품질 우선 (기본 Opus / gpt-4o) */

export const PAGE_SOCIAL_ANTHROPIC_MODEL =
  process.env.PAGE_SOCIAL_COPY_ANTHROPIC_MODEL?.trim() ||
  process.env.SALES_PAGE_FINAL_ANTHROPIC_MODEL?.trim() ||
  "claude-opus-4-6";

export const PAGE_SOCIAL_OPENAI_MODEL =
  process.env.PAGE_SOCIAL_COPY_OPENAI_MODEL?.trim() ||
  process.env.SALES_PAGE_FINAL_OPENAI_MODEL?.trim() ||
  "gpt-4o";

export const PAGE_SOCIAL_MAX_TOKENS = 12_288;
