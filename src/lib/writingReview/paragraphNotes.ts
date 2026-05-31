import type { ReviewParagraphChunk } from "@/lib/writingReview/compare";

export type ParagraphNote = {
  /** 입력 본문 줄 번호 (0-based, \\n 구분) */
  index: number;
  problem: string;
  suggestion: string;
  criteria: string[];
};

export type ParagraphNoteInput = {
  index?: number;
  problem?: string;
  suggestion?: string;
  criteria?: string[] | string;
};

const CRITERION_LABELS: Record<string, string> = {
  메시지: "핵심 메시지",
  중복: "중복·군더더기",
  문장: "문장 부호·문장 나눔",
  문체: "문체·능동형",
  표현: "구체적 표현",
  문법: "문법·어미",
  띄어쓰기: "띄어쓰기",
  오타: "오타",
  인용: "인용·출처",
};

function normalizeCriteria(raw: string[] | string | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  return raw
    .split(/[,·|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function normalizeParagraphNotes(
  raw: ParagraphNoteInput[] | undefined,
): ParagraphNote[] {
  if (!raw?.length) return [];

  const out: ParagraphNote[] = [];
  for (const item of raw) {
    if (typeof item.index !== "number" || item.index < 0) continue;
    const problem = item.problem?.trim() ?? "";
    const suggestion = item.suggestion?.trim() ?? "";
    if (!problem && !suggestion) continue;
    out.push({
      index: item.index,
      problem,
      suggestion,
      criteria: normalizeCriteria(item.criteria),
    });
  }
  return out;
}

function deriveFeedbackFromDiff(
  original: string,
  revised: string,
): Pick<ParagraphNote, "problem" | "suggestion" | "criteria"> {
  const criteria: string[] = [];

  if (/[;:()（）]/.test(original)) criteria.push("문장");
  if (original.length > revised.length + 40) criteria.push("중복");
  if (/되었|받았|당했|해졌|되어 |있었다/.test(original) && !/되었/.test(revised)) {
    criteria.push("문체");
  }
  if (/것 같|듯 하|모호|관념|아마|어쩌면/.test(original)) criteria.push("표현");
  if (criteria.length === 0) criteria.push("문체");

  const labels = criteria.map((c) => CRITERION_LABELS[c] ?? c).join(" · ");

  return {
    criteria,
    problem: `이 문단이 글검사 기준(${labels})에 맞게 다듬을 부분이 있습니다.`,
    suggestion: "아래 다듬은 문단을 읽고, 맞다고 생각되면 「이 문단으로 교체」를 눌러 주세요.",
  };
}

export function attachNotesToParagraphs(
  paragraphs: ReviewParagraphChunk[],
  notes: ParagraphNote[],
): ReviewParagraphChunk[] {
  const byLineIndex = new Map<number, ParagraphNote>();
  for (const note of notes) {
    byLineIndex.set(note.index, note);
  }

  return paragraphs.map((para) => {
    const note = byLineIndex.get(para.blockIndex);
    if (note) {
      return {
        ...para,
        problem: note.problem,
        suggestion: note.suggestion,
        criteria: note.criteria,
      };
    }
    if (!para.changed) return para;
    const derived = deriveFeedbackFromDiff(para.original, para.revised);
    return { ...para, ...derived };
  });
}

export function offsetParagraphNotes(
  notes: ParagraphNote[],
  lineOffset: number,
): ParagraphNote[] {
  return notes.map((n) => ({ ...n, index: n.index + lineOffset }));
}
