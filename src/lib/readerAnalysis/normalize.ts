import type { ReaderAnalysisReport } from "@/lib/readerAnalysis/types";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());
}

function asPersonas(value: unknown): ReaderAnalysisReport["targetReaders"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const label = typeof o.label === "string" ? o.label.trim() : "";
      const description =
        typeof o.description === "string" ? o.description.trim() : "";
      if (!label) return null;
      return { label, description: description || label };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
}

export function normalizeReaderAnalysisReport(
  raw: unknown,
): ReaderAnalysisReport | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const summary = typeof o.summary === "string" ? o.summary.trim() : "";
  const targetReaders = asPersonas(o.targetReaders);
  if (!summary && targetReaders.length === 0) return null;

  const analyzedAt =
    typeof o.analyzedAt === "string" && o.analyzedAt
      ? o.analyzedAt
      : new Date().toISOString();

  return {
    summary: summary || "분석 요약이 생성되었습니다.",
    targetReaders,
    interests: asStringArray(o.interests),
    problemsToSolve: asStringArray(o.problemsToSolve),
    desiredHelp: asStringArray(o.desiredHelp),
    readingContext: asStringArray(o.readingContext),
    contentAngles: asStringArray(o.contentAngles),
    writingGuidance: asStringArray(o.writingGuidance),
    analyzedAt,
  };
}

export function parseReaderAnalysisJson(
  raw: string,
): ReaderAnalysisReport | null {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    const report = normalizeReaderAnalysisReport(parsed);
    if (report) return { ...report, analyzedAt: new Date().toISOString() };
    return null;
  } catch {
    return null;
  }
}
