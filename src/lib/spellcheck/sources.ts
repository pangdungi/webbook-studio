/** 맞춤법 검사 출처 안내 (UI·문서용) */

export const SPELLCHECK_DISCLAIMER =
  "다음·네이버·부산대(PNU) 공개 맞춤법 검사기를 순서대로 연동합니다. " +
  "검사기 연결에 실패하면 ANTHROPIC_API_KEY가 있을 때 AI로 대체합니다.";

export const SPELLCHECK_LOCAL_NOTE =
  "검사기·AI 모두 실패 시에만 쓰는 보조 목록(자주 틀리는 표기 몇 가지)입니다.";

const EXTERNAL_PROVIDERS = new Set(["daum", "naver", "pnu"]);

export function spellcheckProviderLabel(
  provider: string | null,
  aiFailed?: boolean,
): string {
  if (aiFailed) {
    return `검사 실패 · ${SPELLCHECK_LOCAL_NOTE}`;
  }
  if (provider === "daum") {
    return "다음 사전 맞춤법 검사기";
  }
  if (provider === "naver") {
    return "네이버 맞춤법 검사기";
  }
  if (provider === "pnu") {
    return "부산대 맞춤법 검사기(PNU)";
  }
  if (provider === "anthropic") {
    return "Claude — 오타·맞춤법·문법·문장";
  }
  if (provider === "openai") {
    return "OpenAI — 오타·맞춤법·문법·문장";
  }
  return SPELLCHECK_LOCAL_NOTE;
}

export function isExternalSpellcheckProvider(provider: string | null): boolean {
  return !!provider && EXTERNAL_PROVIDERS.has(provider);
}
