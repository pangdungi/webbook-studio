import type { SpellCorrection, SpellcheckResult } from "@/lib/types/database";

type LocalRule = {
  pattern: RegExp;
  replace: string;
  reason: string;
};

/**
 * 자주 틀리는 표기만 (국립국어원 표준 어법에 가까운 철자 교정).
 * 한글·숫자·영문 사이 띄어쓰기, 접속어 추측 등은 넣지 않음.
 */
const SPELLING_RULES: LocalRule[] = [
  { pattern: /됬어요/g, replace: "됐어요", reason: "맞춤법: 됐어요" },
  { pattern: /됬어/g, replace: "됐어", reason: "맞춤법: 됐어" },
  { pattern: /잘못됬/g, replace: "잘못됐", reason: "맞춤법: 잘못됐" },
  { pattern: /됬/g, replace: "됐", reason: "맞춤법: 됐" },
  { pattern: /됫/g, replace: "됐", reason: "맞춤법: 됐" },
  { pattern: /햇어요/g, replace: "했어요", reason: "맞춤법: 했어요" },
  { pattern: /햇어/g, replace: "했어", reason: "맞춤법: 했어" },
  { pattern: /할께요/g, replace: "할게요", reason: "맞춤법: 할게요" },
  { pattern: /할께/g, replace: "할게", reason: "맞춤법: 할게" },
  { pattern: /갈께/g, replace: "갈게", reason: "맞춤법: 갈게" },
  { pattern: /살께/g, replace: "살게", reason: "맞춤법: 살게" },
  { pattern: /어떻해/g, replace: "어떻게", reason: "맞춤법: 어떻게" },
  { pattern: /뭉엇/g, replace: "무엇", reason: "오탈자: 무엇" },
  { pattern: /뭇엇/g, replace: "무엇", reason: "오탈자: 무엇" },
  { pattern: /금새/g, replace: "금세", reason: "맞춤법: 금세" },
  { pattern: /희안/g, replace: "희한", reason: "맞춤법: 희한" },
  { pattern: /몇일/g, replace: "며칠", reason: "맞춤법: 며칠" },
  { pattern: /되요/g, replace: "돼요", reason: "맞춤법: 돼요" },
  { pattern: /안되요/g, replace: "안 돼요", reason: "맞춤법: 안 돼요" },
  { pattern: /안돼요/g, replace: "안 돼요", reason: "맞춤법: 안 돼요" },
  { pattern: /곰곰히/g, replace: "곰곰이", reason: "맞춤법: 곰곰이" },
  { pattern: /일일히/g, replace: "일일이", reason: "맞춤법: 일일이" },
  { pattern: /어의없/g, replace: "어이없", reason: "맞춤법: 어이없" },
  { pattern: /왠만하면/g, replace: "웬만하면", reason: "맞춤법: 웬만하면" },
  { pattern: /왠만/g, replace: "웬만", reason: "맞춤법: 웬만" },
  { pattern: /설레임/g, replace: "설렘", reason: "맞춤법: 설렘" },
  { pattern: /촛점/g, replace: "초점", reason: "오탈자: 초점" },
  { pattern: /오랫동안/g, replace: "오랜 동안", reason: "맞춤법: 오랜 동안" },
];

const ALL_RULES: LocalRule[] = SPELLING_RULES;

function applyRuleOnce(text: string, rule: LocalRule): SpellCorrection | null {
  const flags = rule.pattern.flags.includes("g")
    ? rule.pattern.flags
    : `${rule.pattern.flags}g`;
  const re = new RegExp(rule.pattern.source, flags);
  const match = re.exec(text);
  if (!match) return null;

  const from = match[0];
  const replaceRe = new RegExp(
    rule.pattern.source,
    rule.pattern.flags.replace("g", ""),
  );
  const to = from.replace(replaceRe, rule.replace);
  if (from === to) return null;

  return { from, to, reason: rule.reason, offset: match.index };
}

function findEarliestInText(text: string): SpellCorrection | null {
  let best: SpellCorrection | null = null;

  for (const rule of ALL_RULES) {
    const hit = applyRuleOnce(text, rule);
    if (!hit) continue;
    if (
      !best ||
      hit.offset < best.offset ||
      (hit.offset === best.offset && hit.from.length > best.from.length)
    ) {
      best = hit;
    }
  }

  return best;
}

function applyAt(text: string, correction: SpellCorrection): string {
  const { offset, from, to } = correction;
  return text.slice(0, offset) + to + text.slice(offset + from.length);
}

/** 규칙을 끝까지 적용한 최종 교정문 */
export function applyLocalCorrectionsToText(text: string): string {
  let virtual = text;

  for (let pass = 0; pass < 30; pass++) {
    const pick = findEarliestInText(virtual);
    if (!pick) break;
    virtual = applyAt(virtual, pick);
  }

  return virtual;
}

/** 연속 오탈자를 순차적으로 찾음 (원문 offset 기준) */
export function findLocalCorrections(text: string): SpellCorrection[] {
  let virtual = text;
  const steps: SpellCorrection[] = [];

  for (let pass = 0; pass < 30; pass++) {
    const pick = findEarliestInText(virtual);
    if (!pick) break;
    steps.push(pick);
    virtual = applyAt(virtual, pick);
  }

  const corrections: SpellCorrection[] = [];
  let working = text;

  for (const step of steps) {
    const offset = working.indexOf(step.from);
    if (offset === -1) continue;
    corrections.push({ ...step, offset });
    working = applyAt(working, { ...step, offset });
  }

  return dedupeExactCorrections(corrections);
}

function dedupeExactCorrections(
  corrections: SpellCorrection[],
): SpellCorrection[] {
  const seen = new Set<string>();
  const result: SpellCorrection[] = [];

  for (const c of corrections) {
    const key = `${c.offset}:${c.from}:${c.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(c);
  }

  return result.sort((a, b) => a.offset - b.offset);
}

/** AI가 제안한 한글·숫자·영문 강제 띄어쓰기 등은 버림 */
export function filterUnwantedSpacingCorrections(
  corrections: SpellCorrection[],
): SpellCorrection[] {
  return corrections.filter((c) => {
    if (/한글.?영문|영문.?숫자|숫자.?한글/i.test(c.reason)) return false;
    if (c.reason.includes("한글-영문")) return false;

    const onlyAddsSpace =
      c.to === `${c.from.slice(0, -1)} ${c.from.slice(-1)}` ||
      c.to === `${c.from[0]} ${c.from.slice(1)}`;
    const touchesAlphanumeric = /[A-Za-z0-9]/.test(c.from);
    if (onlyAddsSpace && touchesAlphanumeric && c.reason.includes("띄어쓰기")) {
      return false;
    }

    return true;
  });
}

export function dedupeCorrections(
  corrections: SpellCorrection[],
): SpellCorrection[] {
  const sorted = [...corrections].sort(
    (a, b) => a.offset - b.offset || b.from.length - a.from.length,
  );
  const result: SpellCorrection[] = [];
  let lastEnd = -1;

  for (const c of sorted) {
    const end = c.offset + c.from.length;
    if (c.offset < lastEnd) continue;
    result.push(c);
    lastEnd = end;
  }

  return result;
}

export function applyCorrectionsToPlainText(
  text: string,
  corrections: SpellCorrection[],
): string {
  let result = text;

  for (const c of corrections) {
    const offset = result.indexOf(c.from);
    if (offset === -1) continue;
    result =
      result.slice(0, offset) + c.to + result.slice(offset + c.from.length);
  }

  return result;
}

export function validateCorrection(
  text: string,
  correction: SpellCorrection,
): boolean {
  const actual = text.slice(
    correction.offset,
    correction.offset + correction.from.length,
  );
  return actual === correction.from;
}

export function anchorCorrectionsToText(
  text: string,
  corrections: SpellCorrection[],
): SpellCorrection[] {
  const sorted = [...corrections].sort(
    (a, b) => a.offset - b.offset || a.from.length - b.from.length,
  );
  const anchored: SpellCorrection[] = [];
  let searchFrom = 0;

  for (const c of sorted) {
    let offset = c.offset;
    if (text.slice(offset, offset + c.from.length) !== c.from) {
      offset = text.indexOf(c.from, searchFrom);
      if (offset === -1) offset = text.indexOf(c.from);
    }
    if (offset === -1 || text.slice(offset, offset + c.from.length) !== c.from) {
      continue;
    }
    anchored.push({ ...c, offset });
    searchFrom = offset + c.from.length;
  }

  return dedupeExactCorrections(anchored);
}

export function normalizeSpellcheckResult(
  text: string,
  result: SpellcheckResult,
): SpellcheckResult {
  const filtered = filterUnwantedSpacingCorrections(result.corrections ?? []);
  const anchored = anchorCorrectionsToText(text, filtered);
  const corrections = dedupeCorrections(anchored);
  const correctedFromList = applyCorrectionsToPlainText(text, corrections);

  return {
    corrections,
    correctedText: correctedFromList,
  };
}

export function mergeSpellcheckResults(
  text: string,
  ...resultSets: SpellCorrection[][]
): SpellcheckResult {
  const flat = resultSets.flat();
  const corrections = dedupeExactCorrections(flat);

  return {
    corrections,
    correctedText: applyCorrectionsToPlainText(text, corrections),
  };
}

export function buildSpellcheckResult(
  text: string,
  options: {
    localCorrections?: SpellCorrection[];
    llm?: SpellcheckResult | null;
  },
): SpellcheckResult {
  const localCorrections = options.localCorrections ?? findLocalCorrections(text);

  if (options.llm?.corrections?.length) {
    const merged = dedupeExactCorrections([
      ...localCorrections,
      ...filterUnwantedSpacingCorrections(options.llm.corrections),
    ]);
    const anchored = anchorCorrectionsToText(text, merged);
    return {
      corrections: anchored,
      correctedText: applyCorrectionsToPlainText(text, anchored),
    };
  }

  return {
    corrections: localCorrections,
    correctedText: applyLocalCorrectionsToText(text),
  };
}

export function summarizeCorrections(corrections: SpellCorrection[]) {
  const counts = {
    맞춤법: 0,
    띄어쓰기: 0,
    오타: 0,
    문법: 0,
    문장: 0,
    기타: 0,
  };
  for (const c of corrections) {
    if (c.reason.includes("문장")) counts.문장++;
    else if (c.reason.includes("문법")) counts.문법++;
    else if (c.reason.includes("맞춤법")) counts.맞춤법++;
    else if (c.reason.includes("띄어쓰기")) counts.띄어쓰기++;
    else if (c.reason.includes("오타") || c.reason.includes("오탈자")) counts.오타++;
    else counts.기타++;
  }
  return counts;
}
