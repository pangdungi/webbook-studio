import {
  emptyBenefitAnswers,
  SALES_PAGE_BENEFIT_QUESTIONS,
  type SalesPageBenefitAnswers,
} from "@/lib/salesPageCopy/benefitQuestions";
import {
  emptyAwarenessAnswers,
  SALES_PAGE_AWARENESS_QUESTIONS,
  type SalesPageAwarenessAnswers,
} from "@/lib/salesPageCopy/awarenessQuestions";
import {
  emptyNicheAudience,
  SALES_PAGE_NICHE_FIELDS,
  type SalesPageNicheAudience,
} from "@/lib/salesPageCopy/nicheAudience";
import type { SalesPageCopyReport } from "@/lib/salesPageCopy/types";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asBullets(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeBenefitAnswers(value: unknown): SalesPageBenefitAnswers {
  const base = emptyBenefitAnswers();
  if (!value || typeof value !== "object") return base;

  const data = value as Record<string, unknown>;

  for (const q of SALES_PAGE_BENEFIT_QUESTIONS) {
    const raw = data[q.key];
    if ("list" in q && q.list) {
      base[q.key] = asBullets(raw);
    } else {
      base[q.key] = asString(raw);
    }
  }

  return base;
}

function normalizeAwarenessAnswers(value: unknown): SalesPageAwarenessAnswers {
  const base = emptyAwarenessAnswers();
  if (!value || typeof value !== "object") return base;

  const data = value as Record<string, unknown>;
  for (const q of SALES_PAGE_AWARENESS_QUESTIONS) {
    base[q.key] = asString(data[q.key]);
  }
  return base;
}

function normalizeNicheAudience(value: unknown): SalesPageNicheAudience {
  const base = emptyNicheAudience();
  if (!value || typeof value !== "object") return base;

  const data = value as Record<string, unknown>;
  for (const field of SALES_PAGE_NICHE_FIELDS) {
    base[field.key] = asString(data[field.key]);
  }
  return base;
}

export function normalizeSalesPageCopyReport(
  value: unknown,
): SalesPageCopyReport | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;

  const headline = asString(data.headline);
  const subheadline = asString(data.subheadline);
  if (!headline && !subheadline) return null;

  return {
    headline: headline || subheadline,
    subheadline,
    hook: asString(data.hook),
    valueProposition: asString(data.valueProposition),
    bullets: asBullets(data.bullets),
    forWho: asString(data.forWho),
    cta: asString(data.cta) || "지금 읽기 시작하기",
    seoDescription: asString(data.seoDescription),
    benefitAnswers: normalizeBenefitAnswers(data.benefitAnswers),
    awarenessAnswers: normalizeAwarenessAnswers(data.awarenessAnswers),
    nicheAudience: normalizeNicheAudience(data.nicheAudience),
    analyzedAt:
      typeof data.analyzedAt === "string" && data.analyzedAt
        ? data.analyzedAt
        : new Date().toISOString(),
  };
}

export function parseSalesPageCopyJson(raw: string): SalesPageCopyReport | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return normalizeSalesPageCopyReport(JSON.parse(match[0]));
  } catch {
    return null;
  }
}

export function formatBenefitAnswersText(
  answers: SalesPageBenefitAnswers,
): string {
  const lines: string[] = ["[혜택 프레임워크]"];

  for (const q of SALES_PAGE_BENEFIT_QUESTIONS) {
    lines.push("");
    lines.push(`Q. ${q.label}`);
    const value = answers[q.key];
    if (Array.isArray(value)) {
      value.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
      if (value.length === 0) lines.push("—");
    } else if (value) {
      lines.push(value);
    } else {
      lines.push("—");
    }
  }

  return lines.join("\n");
}

export function formatAwarenessAnswersText(
  answers: SalesPageAwarenessAnswers,
): string {
  const lines: string[] = ["[독자 인식 단계별 대화]"];

  for (const q of SALES_PAGE_AWARENESS_QUESTIONS) {
    lines.push("");
    lines.push(`Q. ${q.label}`);
    const value = answers[q.key];
    lines.push(value || "—");
  }

  return lines.join("\n");
}

export function formatNicheAudienceText(
  niche: SalesPageNicheAudience,
): string {
  const lines: string[] = ["[타깃 오디언스 3단계]"];

  for (const field of SALES_PAGE_NICHE_FIELDS) {
    lines.push("");
    lines.push(`${field.label}`);
    lines.push(field.hint);
    lines.push(niche[field.key] || "—");
  }

  return lines.join("\n");
}

export function formatSalesPageCopyFullText(
  report: SalesPageCopyReport,
): string {
  return [
    report.headline,
    report.subheadline,
    "",
    report.hook,
    "",
    report.valueProposition,
    "",
    report.forWho,
    "",
    ...report.bullets.map((b) => `· ${b}`),
    "",
    report.cta,
    "",
    report.seoDescription,
    "",
    formatBenefitAnswersText(report.benefitAnswers),
    "",
    formatAwarenessAnswersText(report.awarenessAnswers),
    "",
    formatNicheAudienceText(report.nicheAudience),
  ].join("\n");
}
