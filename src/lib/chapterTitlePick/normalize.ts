import { parseLlmJsonObject } from "@/lib/llm/parseJsonResponse";
import type {
  ChapterTitleCandidate,
  ChapterTitlePickReport,
} from "@/lib/chapterTitlePick/types";

function readStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCandidate(raw: unknown): ChapterTitleCandidate | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = readStr(o.title);
  const rationale = readStr(o.rationale);
  if (!title) return null;
  return { title, rationale };
}

export function normalizeChapterTitlePickReport(
  raw: unknown,
  pagesRead: number,
): ChapterTitlePickReport | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const candidates = Array.isArray(o.candidates)
    ? o.candidates
        .map(normalizeCandidate)
        .filter((c): c is ChapterTitleCandidate => c != null)
    : [];

  if (candidates.length === 0) return null;

  return {
    chapterSummary: readStr(o.chapterSummary) || undefined,
    candidates: candidates.slice(0, 6),
    pagesRead,
    generatedAt: new Date().toISOString(),
  };
}

export function parseChapterTitlePickJson(
  raw: string,
  pagesRead: number,
): ChapterTitlePickReport | null {
  try {
    const parsed = parseLlmJsonObject<Record<string, unknown>>(raw);
    return normalizeChapterTitlePickReport(parsed, pagesRead);
  } catch {
    return null;
  }
}
