import type { SpellCorrection, SpellcheckResult } from "@/lib/types/database";

type LocalRule = {
  pattern: RegExp;
  replace: string;
  reason: string;
};

/** 붙어 쓰기 흔한 단어 — 앞 공백 */
const SPACE_BEFORE = [
  "도대체",
  "그리고",
  "하지만",
  "그러나",
  "그래서",
  "그런데",
  "혹시",
  "정말",
  "진짜",
  "아마",
  "또는",
  "때문에",
  "오히려",
  "물론",
  "역시",
];

/** 뒤에 공백 (무엇인가·인칭 등 예외는 별도 규칙) */
const SPACE_AFTER = [
  "도대체",
  "그리고",
  "하지만",
  "그러나",
  "그래서",
  "그런데",
];

function buildSpacingRules(): LocalRule[] {
  const rules: LocalRule[] = [];
  for (const word of SPACE_BEFORE) {
    rules.push({
      pattern: new RegExp(`([가-힣])(${word})`, "g"),
      replace: "$1 $2",
      reason: `띄어쓰기: ${word} 앞`,
    });
  }
  for (const word of SPACE_AFTER) {
    rules.push({
      pattern: new RegExp(`(${word})([가-힣])`, "g"),
      replace: "$1 $2",
      reason: `띄어쓰기: ${word} 뒤`,
    });
  }
  // 도대체 + 무엇 (붙어 쓴 경우)
  rules.push({
    pattern: /(도대체)(무엇)/g,
    replace: "$1 $2",
    reason: "띄어쓰기: 도대체 뒤",
  });
  return rules;
}

/** 한국어 맞춤법·띄어쓰기·오탈자 */
const BASE_RULES: LocalRule[] = [
  { pattern: /\s+([,.!?;:])/g, replace: "$1", reason: "문장부호: 부호 앞 공백 제거" },
  { pattern: /([,.!?])([가-힣A-Za-z0-9])/g, replace: "$1 $2", reason: "문장부호: 부호 뒤 공백" },
  { pattern: /([가-힣])\?([가-힣])/g, replace: "$1? $2", reason: "문장부호: ? 뒤 공백" },
  { pattern: /([가-힣])!([가-힣])/g, replace: "$1! $2", reason: "문장부호: ! 뒤 공백" },
  { pattern: /([가-힣])\.([가-힣])/g, replace: "$1. $2", reason: "문장부호: . 뒤 공백" },
  { pattern: / {2,}/g, replace: " ", reason: "띄어쓰기: 연속 공백" },
  { pattern: /([가-힣])([A-Za-z0-9])/g, replace: "$1 $2", reason: "띄어쓰기: 한글-영문/숫자" },
  { pattern: /([A-Za-z0-9])([가-힣])/g, replace: "$1 $2", reason: "띄어쓰기: 영문/숫자-한글" },
  // 맞춤법·오탈자
  { pattern: /됬/g, replace: "됐", reason: "맞춤법: 됐" },
  { pattern: /됫/g, replace: "됐", reason: "맞춤법: 됐" },
  { pattern: /됬어/g, replace: "됐어", reason: "맞춤법: 됐어" },
  { pattern: /됬어요/g, replace: "됐어요", reason: "맞춤법: 됐어요" },
  { pattern: /햇/g, replace: "했", reason: "맞춤법: 했" },
  { pattern: /햇어/g, replace: "했어", reason: "맞춤법: 했어" },
  { pattern: /햇어요/g, replace: "했어요", reason: "맞춤법: 했어요" },
  { pattern: /할께/g, replace: "할게", reason: "맞춤법: 할게" },
  { pattern: /할께요/g, replace: "할게요", reason: "맞춤법: 할게요" },
  { pattern: /갈께/g, replace: "갈게", reason: "맞춤법: 갈게" },
  { pattern: /살께/g, replace: "살게", reason: "맞춤법: 살게" },
  { pattern: /어떻해/g, replace: "어떻게", reason: "맞춤법: 어떻게" },
  { pattern: /뭉엇/g, replace: "무엇", reason: "오탈자: 무엇" },
  { pattern: /뭇엇/g, replace: "무엇", reason: "오탈자: 무엇" },
  { pattern: /금새/g, replace: "금세", reason: "맞춤법: 금세" },
  { pattern: /희안/g, replace: "희한", reason: "맞춤법: 희한" },
  { pattern: /몇일/g, replace: "며칠", reason: "맞춤법: 며칠" },
  { pattern: /되요/g, replace: "돼요", reason: "맞춤법: 돼요" },
  { pattern: /안되/g, replace: "안 돼", reason: "띄어쓰기: 안 돼" },
  { pattern: /안돼/g, replace: "안 돼", reason: "띄어쓰기: 안 돼" },
  { pattern: /않되/g, replace: "안 돼", reason: "띄어쓰기: 안 돼" },
  { pattern: /안돼요/g, replace: "안 돼요", reason: "띄어쓰기: 안 돼요" },
  { pattern: /안되요/g, replace: "안 돼요", reason: "띄어쓰기: 안 돼요" },
  { pattern: /안좋/g, replace: "안 좋", reason: "띄어쓰기: 안 좋" },
  { pattern: /안좋아/g, replace: "안 좋아", reason: "띄어쓰기: 안 좋아" },
  { pattern: /안잡/g, replace: "안 잡", reason: "띄어쓰기: 안 잡" },
  { pattern: /안잡아/g, replace: "안 잡아", reason: "띄어쓰기: 안 잡아" },
  { pattern: /안잡아요/g, replace: "안 잡아요", reason: "띄어쓰기: 안 잡아요" },
  { pattern: /안자요/g, replace: "안 자요", reason: "띄어쓰기: 안 자요" },
  { pattern: /잘못됬/g, replace: "잘못됐", reason: "맞춤법: 잘못됐" },
  { pattern: /곰곰히/g, replace: "곰곰이", reason: "맞춤법: 곰곰이" },
  { pattern: /일일히/g, replace: "일일이", reason: "맞춤법: 일일이" },
  { pattern: /어의없/g, replace: "어이없", reason: "맞춤법: 어이없" },
  { pattern: /왠만/g, replace: "웬만", reason: "맞춤법: 웬만" },
  { pattern: /왠만하면/g, replace: "웬만하면", reason: "맞춤법: 웬만하면" },
  { pattern: /설레임/g, replace: "설렘", reason: "맞춤법: 설렘" },
  { pattern: /촛점/g, replace: "초점", reason: "오탈자: 초점" },
  { pattern: /낼수/g, replace: "낼 수", reason: "띄어쓰기: 낼 수" },
  { pattern: /수있/g, replace: "수 있", reason: "띄어쓰기: 수 있" },
  { pattern: /수없/g, replace: "수 없", reason: "띄어쓰기: 수 없" },
  { pattern: /것같/g, replace: "것 같", reason: "띄어쓰기: 것 같" },
  { pattern: /것같아/g, replace: "것 같아", reason: "띄어쓰기: 것 같아" },
  { pattern: /것같다/g, replace: "것 같다", reason: "띄어쓰기: 것 같다" },
  { pattern: /것같은/g, replace: "것 같은", reason: "띄어쓰기: 것 같은" },
  { pattern: /것같습니다/g, replace: "것 같습니다", reason: "띄어쓰기: 것 같습니다" },
  { pattern: /오랫동안/g, replace: "오랜 동안", reason: "띄어쓰기: 오랜 동안" },
];

const ALL_RULES: LocalRule[] = [...BASE_RULES, ...buildSpacingRules()];

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
  let earliest: SpellCorrection | null = null;

  for (const rule of ALL_RULES) {
    const hit = applyRuleOnce(text, rule);
    if (!hit) continue;
    if (!earliest || hit.offset < earliest.offset) {
      earliest = hit;
    }
  }

  return earliest;
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

/** 연속 붙어쓰기·오탈자를 순차적으로 찾음 (원문 offset 기준) */
export function findLocalCorrections(text: string): SpellCorrection[] {
  let virtual = text;
  const steps: SpellCorrection[] = [];

  for (let pass = 0; pass < 30; pass++) {
    const pick = findEarliestInText(virtual);
    if (!pick) break;
    steps.push(pick);
    virtual = applyAt(virtual, pick);
  }

  // 가상 텍스트에서 찾은 순서대로 원문에도 같은 치환을 적용하며 offset 확정
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

/** 동일 구간 중복만 제거 (순차 띄어쓰기 교정은 겹침 허용) */
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

export function normalizeSpellcheckResult(
  text: string,
  result: SpellcheckResult,
): SpellcheckResult {
  const valid = (result.corrections ?? []).filter((c) =>
    validateCorrection(text, c),
  );
  const corrections = dedupeCorrections(valid);
  const correctedFromList = applyCorrectionsToPlainText(text, corrections);
  const llmCorrected = result.correctedText?.trim();

  return {
    corrections,
    correctedText:
      llmCorrected && llmCorrected !== text ? llmCorrected : correctedFromList,
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

/** LLM 교정문 + 로컬 규칙 목록 병합 */
export function buildSpellcheckResult(
  text: string,
  options: {
    localCorrections?: SpellCorrection[];
    llm?: SpellcheckResult | null;
  },
): SpellcheckResult {
  const localCorrections = options.localCorrections ?? findLocalCorrections(text);
  const localCorrected = applyLocalCorrectionsToText(text);

  if (options.llm?.correctedText?.trim()) {
    return {
      corrections: dedupeExactCorrections([
        ...localCorrections,
        ...(options.llm.corrections ?? []),
      ]),
      correctedText: options.llm.correctedText,
    };
  }

  return {
    corrections: localCorrections,
    correctedText: localCorrected,
  };
}

export function summarizeCorrections(corrections: SpellCorrection[]) {
  const counts = { 맞춤법: 0, 띄어쓰기: 0, 오탈자: 0, 문장부호: 0, 기타: 0 };
  for (const c of corrections) {
    if (c.reason.includes("맞춤법")) counts.맞춤법++;
    else if (c.reason.includes("띄어쓰기")) counts.띄어쓰기++;
    else if (c.reason.includes("오탈자")) counts.오탈자++;
    else if (c.reason.includes("문장부호")) counts.문장부호++;
    else counts.기타++;
  }
  return counts;
}
