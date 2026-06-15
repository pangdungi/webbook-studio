import type {
  PageSocialCopyReport,
  PageSocialFormulaBab,
  PageSocialFormulaBenefits,
  PageSocialFormulaPas,
} from "@/lib/pageSocialCopy/types";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asBullets(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizePas(value: unknown): PageSocialFormulaPas {
  const data =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    problem: asString(data.problem),
    agitate: asString(data.agitate),
    solution: asString(data.solution),
    fullMessage: asString(data.fullMessage),
  };
}

function normalizeBenefits(value: unknown): PageSocialFormulaBenefits {
  const data =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const benefits = asBullets(data.benefits);
  while (benefits.length < 3) benefits.push("");
  return {
    benefits: [benefits[0], benefits[1], benefits[2]],
    cta: asString(data.cta),
    fullMessage: asString(data.fullMessage),
  };
}

function normalizeBab(value: unknown): PageSocialFormulaBab {
  const data =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    before: asString(data.before),
    after: asString(data.after),
    bridge: asString(data.bridge),
    fullMessage: asString(data.fullMessage),
  };
}

export function normalizePageSocialCopyReport(
  value: unknown,
): PageSocialCopyReport | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;

  const reelsScript = asString(data.reelsScript);
  const carouselRaw =
    data.carousel && typeof data.carousel === "object"
      ? (data.carousel as Record<string, unknown>)
      : {};

  const hookSlide = asString(carouselRaw.hookSlide);
  const slides = asBullets(carouselRaw.slides);
  const ctaSlide = asString(carouselRaw.ctaSlide);

  const formulaPas = normalizePas(data.formulaPas);
  const formulaBenefits = normalizeBenefits(data.formulaBenefits);
  const formulaBab = normalizeBab(data.formulaBab);

  const hasContent =
    reelsScript ||
    hookSlide ||
    slides.length > 0 ||
    formulaPas.fullMessage ||
    formulaBenefits.fullMessage ||
    formulaBab.fullMessage;

  if (!hasContent) return null;

  return {
    reelsScript,
    carousel: { hookSlide, slides, ctaSlide },
    formulaPas,
    formulaBenefits,
    formulaBab,
    analyzedAt:
      typeof data.analyzedAt === "string" && data.analyzedAt
        ? data.analyzedAt
        : new Date().toISOString(),
  };
}

export function parsePageSocialCopyJson(
  raw: string,
): PageSocialCopyReport | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return normalizePageSocialCopyReport(JSON.parse(match[0]));
  } catch {
    return null;
  }
}

export function formatPageSocialCopyFullText(
  report: PageSocialCopyReport,
): string {
  const lines: string[] = ["[릴스 대본]", report.reelsScript, ""];

  lines.push("[캐러셀]");
  if (report.carousel.hookSlide) {
    lines.push(`1. ${report.carousel.hookSlide}`);
  }
  report.carousel.slides.forEach((slide, i) => {
    lines.push(`${i + 2}. ${slide}`);
  });
  if (report.carousel.ctaSlide) {
    lines.push(`${report.carousel.slides.length + 2}. ${report.carousel.ctaSlide}`);
  }
  lines.push("");

  lines.push("[공식 1 · 문제-동요-해결]");
  lines.push(`문제: ${report.formulaPas.problem}`);
  lines.push(`동요: ${report.formulaPas.agitate}`);
  lines.push(`해결: ${report.formulaPas.solution}`);
  lines.push(report.formulaPas.fullMessage);
  lines.push("");

  lines.push("[공식 2 · 혜택×3]");
  report.formulaBenefits.benefits.forEach((b, i) => {
    lines.push(`${i + 1}. ${b}`);
  });
  lines.push(`CTA: ${report.formulaBenefits.cta}`);
  lines.push(report.formulaBenefits.fullMessage);
  lines.push("");

  lines.push("[공식 3 · 비포-애프터-브리지]");
  lines.push(`비포: ${report.formulaBab.before}`);
  lines.push(`애프터: ${report.formulaBab.after}`);
  lines.push(`브리지: ${report.formulaBab.bridge}`);
  lines.push(report.formulaBab.fullMessage);

  return lines.join("\n");
}
