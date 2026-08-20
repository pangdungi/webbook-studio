import { parseLlmJsonObject } from "@/lib/llm/parseJsonResponse";
import type { BookTitleCandidate, BookTitlePickReport } from "@/lib/bookTitlePick/types";

function readStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCandidate(raw: unknown): BookTitleCandidate | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = readStr(o.title);
  const subtitle = readStr(o.subtitle);
  const rationale = readStr(o.rationale);
  if (!title) return null;
  return { title, subtitle, rationale };
}

export function normalizeBookTitlePickReport(
  raw: unknown,
): BookTitlePickReport | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const candidates = Array.isArray(o.candidates)
    ? o.candidates
        .map(normalizeCandidate)
        .filter((c): c is BookTitleCandidate => c != null)
    : [];

  if (candidates.length === 0) return null;

  const bookSummary = readStr(o.bookSummary) || undefined;

  return {
    bookSummary,
    candidates: candidates.slice(0, 8),
    generatedAt: new Date().toISOString(),
  };
}

export function parseBookTitlePickJson(raw: string): BookTitlePickReport | null {
  try {
    const parsed = parseLlmJsonObject<Record<string, unknown>>(raw);
    return normalizeBookTitlePickReport(parsed);
  } catch {
    return null;
  }
}
