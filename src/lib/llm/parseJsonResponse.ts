/** LLM이 준 비표준·깨진 JSON을 최대한 복구해 파싱 */

function stripMarkdownFence(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  return text;
}

function repairTrailingCommas(json: string): string {
  return json.replace(/,\s*]/g, "]").replace(/,\s*}/g, "}");
}

/** 문자열 안이 아닐 때만 따옴표 밖 줄바꿈을 이스케이프 */
function escapeRawNewlinesInJsonStrings(json: string): string {
  let out = "";
  let inString = false;
  let escape = false;

  for (let i = 0; i < json.length; i++) {
    const c = json[i];
    if (inString) {
      if (escape) {
        out += c;
        escape = false;
        continue;
      }
      if (c === "\\") {
        out += c;
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = false;
        out += c;
        continue;
      }
      if (c === "\n") {
        out += "\\n";
        continue;
      }
      if (c === "\r") {
        continue;
      }
      out += c;
      continue;
    }

    if (c === '"') {
      inString = true;
    }
    out += c;
  }

  return out;
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = false;
      }
      continue;
    }

    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return text.slice(start);
}

function closeTruncatedJson(fragment: string): string {
  let s = fragment.trim();
  const openBraces = (s.match(/{/g) ?? []).length;
  const closeBraces = (s.match(/}/g) ?? []).length;
  const openBrackets = (s.match(/\[/g) ?? []).length;
  const closeBrackets = (s.match(/]/g) ?? []).length;

  if (s.endsWith(",")) {
    s = s.slice(0, -1);
  }

  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    s += "]";
  }
  for (let i = 0; i < openBraces - closeBraces; i++) {
    s += "}";
  }

  return s;
}

function tryParse(json: string): unknown {
  return JSON.parse(json);
}

/**
 * LLM 응답에서 JSON 객체 추출·복구 후 파싱.
 * 실패 시 마지막 시도 오류를 던짐.
 */
export function parseLlmJsonObject<T extends Record<string, unknown>>(
  raw: string,
): T {
  const stripped = stripMarkdownFence(raw);
  const extracted = extractFirstJsonObject(stripped) ?? stripped;

  const attempts = [
    extracted,
    repairTrailingCommas(extracted),
    repairTrailingCommas(escapeRawNewlinesInJsonStrings(extracted)),
    repairTrailingCommas(closeTruncatedJson(extracted)),
    repairTrailingCommas(
      escapeRawNewlinesInJsonStrings(closeTruncatedJson(extracted)),
    ),
  ];

  let lastError: unknown;
  for (const candidate of attempts) {
    try {
      return tryParse(candidate) as T;
    } catch (err) {
      lastError = err;
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "JSON parse failed";
  throw new Error(message);
}

/**
 * "key": "…" 값 추출. 줄바꿈·따옴표가 JSON 규칙을 어겨도 revisedText 복구용.
 */
export function extractJsonStringValueAfterKey(
  raw: string,
  key: string,
): string | null {
  const stripped = stripMarkdownFence(raw);
  const label = `"${key}"`;
  const keyIdx = stripped.indexOf(label);
  if (keyIdx < 0) return null;

  let i = keyIdx + label.length;
  while (i < stripped.length && /\s/.test(stripped[i])) i++;
  if (stripped[i] !== ":") return null;
  i++;
  while (i < stripped.length && /\s/.test(stripped[i])) i++;
  if (stripped[i] !== '"') return null;
  i++;

  let value = "";
  let escape = false;

  while (i < stripped.length) {
    const c = stripped[i];

    if (escape) {
      if (c === "n") value += "\n";
      else if (c === "r") value += "\r";
      else if (c === "t") value += "\t";
      else if (c === '"') value += '"';
      else if (c === "\\") value += "\\";
      else value += c;
      escape = false;
      i++;
      continue;
    }

    if (c === "\\") {
      escape = true;
      i++;
      continue;
    }

    if (c === '"') {
      const rest = stripped.slice(i + 1).trimStart();
      if (rest.startsWith(",") || rest.startsWith("}")) {
        return value;
      }
      value += c;
      i++;
      continue;
    }

    value += c;
    i++;
  }

  return value.length > 0 ? value : null;
}

/** issues 배열이 깨졌을 때 revisedText·summary만이라도 복구 */
export function salvageWritingReviewFields(
  raw: string,
  originalText: string,
): {
  revisedText: string;
  summary: string;
  issues: Array<{
    from?: string;
    to?: string;
    reason?: string;
    offset?: number;
  }>;
  paragraphNotes: Array<{
    index?: number;
    problem?: string;
    suggestion?: string;
    criteria?: string[];
  }>;
} {
  const stripped = stripMarkdownFence(raw);

  const readStringField = (fieldKey: string): string | null => {
    const extracted = extractJsonStringValueAfterKey(stripped, fieldKey);
    if (extracted !== null) return extracted;

    const re = new RegExp(
      `"${fieldKey}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"(?:\\s*[,}])`,
      "s",
    );
    const m = stripped.match(re);
    if (!m) return null;
    try {
      return JSON.parse(`"${m[1]}"`) as string;
    } catch {
      return m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
    }
  };

  const issues: Array<{
    from?: string;
    to?: string;
    reason?: string;
    offset?: number;
  }> = [];

  const issueBlock = stripped.match(/"issues"\s*:\s*\[([\s\S]*?)\]\s*(?:,|\})/);
  if (issueBlock) {
    const itemRe =
      /\{\s*"from"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"to"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"reason"\s*:\s*"((?:\\.|[^"\\])*)"(?:\s*,\s*"offset"\s*:\s*(\d+))?\s*\}/g;
    let m: RegExpExecArray | null;
    while ((m = itemRe.exec(issueBlock[1])) !== null) {
      issues.push({
        from: m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
        to: m[2].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
        reason: m[3].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
        offset: m[4] ? Number(m[4]) : undefined,
      });
    }
  }

  const paragraphNotes: Array<{
    index?: number;
    problem?: string;
    suggestion?: string;
    criteria?: string[];
  }> = [];

  const notesBlock = stripped.match(
    /"paragraphNotes"\s*:\s*\[([\s\S]*?)\]\s*(?:,|\})/,
  );
  if (notesBlock) {
    const itemRe =
      /\{\s*"index"\s*:\s*(\d+)\s*,\s*"criteria"\s*:\s*\[((?:[^\]]*))\]\s*,\s*"problem"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"suggestion"\s*:\s*"((?:\\.|[^"\\])*)"\s*\}/g;
    let m: RegExpExecArray | null;
    while ((m = itemRe.exec(notesBlock[1])) !== null) {
      const criteriaRaw = m[2].replace(/"/g, "").split(",").map((s) => s.trim());
      paragraphNotes.push({
        index: Number(m[1]),
        criteria: criteriaRaw.filter(Boolean),
        problem: m[3].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
        suggestion: m[4].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
      });
    }
    if (paragraphNotes.length === 0) {
      const simpleRe =
        /\{\s*"index"\s*:\s*(\d+)\s*,\s*"problem"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"suggestion"\s*:\s*"((?:\\.|[^"\\])*)"\s*\}/g;
      while ((m = simpleRe.exec(notesBlock[1])) !== null) {
        paragraphNotes.push({
          index: Number(m[1]),
          problem: m[2].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
          suggestion: m[3].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
        });
      }
    }
  }

  return {
    revisedText: readStringField("revisedText")?.trim() || originalText,
    summary:
      readStringField("summary")?.trim() ||
      "일부 결과만 복구했습니다. 본문 밑줄과 요약을 확인해 주세요.",
    issues,
    paragraphNotes,
  };
}

/** corrections 배열이 깨졌을 때 항목만 추출 */
export function salvageSpellcheckCorrections(raw: string): Array<{
  from?: string;
  to?: string;
  reason?: string;
  offset?: number;
}> {
  const stripped = stripMarkdownFence(raw);
  const corrections: Array<{
    from?: string;
    to?: string;
    reason?: string;
    offset?: number;
  }> = [];

  const block = stripped.match(
    /"corrections"\s*:\s*\[([\s\S]*?)\]\s*(?:,|\})/,
  );
  if (!block) return corrections;

  const itemRe =
    /\{\s*"from"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"to"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"reason"\s*:\s*"((?:\\.|[^"\\])*)"(?:\s*,\s*"offset"\s*:\s*(\d+))?\s*\}/g;

  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(block[1])) !== null) {
    corrections.push({
      from: m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
      to: m[2].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
      reason: m[3].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
      offset: m[4] ? Number(m[4]) : undefined,
    });
  }

  return corrections;
}

function unescapeJsonString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function extractJsonObjectSection(raw: string, key: string): string {
  const label = `"${key}"`;
  const idx = raw.indexOf(label);
  if (idx < 0) return "";

  const colon = raw.indexOf(":", idx + label.length);
  if (colon < 0) return "";

  let i = colon + 1;
  while (i < raw.length && /\s/.test(raw[i])) i++;
  if (raw[i] !== "{") return "";

  let depth = 0;
  const start = i;
  for (; i < raw.length; i++) {
    const c = raw[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }

  return raw.slice(start);
}

function salvageStringArrayFromSection(section: string, key: string): string[] {
  const block = section.match(
    new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)\\]`),
  );
  if (!block) return [];

  const items: string[] = [];
  const itemRe = /"((?:\\.|[^"\\])*)"/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(block[1])) !== null) {
    const v = unescapeJsonString(m[1]).trim();
    if (v) items.push(v);
  }
  return items;
}

/** 글평가 JSON이 깨졌을 때 필드 단위 복구 */
export function salvageWritingEvaluationFields(
  raw: string,
): Record<string, unknown> {
  const stripped = stripMarkdownFence(raw);

  const readStr = (key: string) =>
    extractJsonStringValueAfterKey(stripped, key);

  const genreMatch = stripped.match(/"genre"\s*:\s*"(empathy|argument)"/);
  const genre = genreMatch?.[1] ?? "empathy";

  const singleMessageMatch = stripped.match(
    /"singleMessage"\s*:\s*(true|false)/,
  );

  const improvements: Array<Record<string, unknown>> = [];
  const impRe =
    /"area"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"problem"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"suggestion"\s*:\s*"((?:\\.|[^"\\])*)"(?:\s*,\s*"category"\s*:\s*"((?:\\.|[^"\\])*)")?\s*\}/g;
  let imp: RegExpExecArray | null;
  while ((imp = impRe.exec(stripped)) !== null) {
    improvements.push({
      area: unescapeJsonString(imp[1]),
      problem: unescapeJsonString(imp[2]),
      suggestion: unescapeJsonString(imp[3]),
      category: imp[4] ? unescapeJsonString(imp[4]) : undefined,
    });
  }

  const empathySection = extractJsonObjectSection(stripped, "empathy");
  const empathy = empathySection
    ? {
        observation:
          extractJsonStringValueAfterKey(empathySection, "observation") ?? "",
        reflection:
          extractJsonStringValueAfterKey(empathySection, "reflection") ?? "",
        insight: extractJsonStringValueAfterKey(empathySection, "insight") ?? "",
        suggestedOutline:
          extractJsonStringValueAfterKey(empathySection, "suggestedOutline") ??
          "",
      }
    : undefined;

  const argumentSection = extractJsonObjectSection(stripped, "argument");
  const argument = argumentSection
    ? {
        claim: extractJsonStringValueAfterKey(argumentSection, "claim") ?? "",
        reasons: salvageStringArrayFromSection(argumentSection, "reasons"),
        examples: salvageStringArrayFromSection(argumentSection, "examples"),
        methodProposal:
          extractJsonStringValueAfterKey(argumentSection, "methodProposal") ??
          "",
        suggestedOutline:
          extractJsonStringValueAfterKey(argumentSection, "suggestedOutline") ??
          "",
      }
    : undefined;

  const idealReaders = salvageStringArrayFromSection(stripped, "idealReaders");

  return {
    genre,
    genreLabel: readStr("genreLabel"),
    genreRationale: readStr("genreRationale"),
    coreMessage: readStr("coreMessage"),
    singleMessage: singleMessageMatch?.[1] === "true",
    singleMessageAssessment: readStr("singleMessageAssessment"),
    subtitleAlignment: readStr("subtitleAlignment"),
    idealReaders,
    improvements,
    empathy,
    argument,
    overallSummary: readStr("overallSummary"),
  };
}
