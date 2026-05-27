"use client";

const CRITERIA = [
  "핵심 메시지 유지 · 중복·누락 없음",
  "겹치는 표현 제거",
  "주어·술어 · 마침표·느낌표·물음표로 종료",
  "세미콜론·콜론·괄호 제거 · 능동형·단문",
  "관념적·모호한 표현·멋부린 문장 피하기",
  "설명하지 말고 보여주기(구체적 장면·행동)",
  "출처·인용 표기",
];

type Props = {
  originalText: string;
  revisedText: string;
  summary: string;
  error?: string | null;
  provider?: string | null;
  loading: boolean;
  scannedLength?: number;
  onApplyAll: () => void;
  onClose: () => void;
};

export function WritingReviewPanel({
  originalText,
  revisedText,
  summary,
  error = null,
  provider = null,
  loading,
  scannedLength = 0,
  onApplyAll,
  onClose,
}: Props) {
  const hasChange = revisedText.trim() !== originalText.trim();

  return (
    <div className="absolute inset-y-0 right-0 z-20 flex w-full max-w-xl flex-col border-l border-sky-200 bg-sky-50 shadow-xl sm:max-w-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-sky-200 bg-sky-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-sky-950">글검사</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-sky-800 hover:text-sky-950"
        >
          닫기
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading && (
          <p className="text-sm text-sky-900">
            Claude로 이 페이지 글을 검사·다듬는 중…
            {scannedLength > 0 && (
              <span className="mt-1 block text-xs text-sky-700">
                {scannedLength.toLocaleString()}자
              </span>
            )}
          </p>
        )}

        {!loading && error && (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            {provider && (
              <p className="mb-2 text-xs text-sky-800">
                {provider === "anthropic"
                  ? "Claude로 다듬었습니다."
                  : provider === "openai"
                    ? "OpenAI로 다듬었습니다."
                    : "검사 완료"}
              </p>
            )}

            <ul className="mb-3 list-inside list-disc text-xs leading-relaxed text-sky-900/90">
              {CRITERIA.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>

            {summary && (
              <p className="mb-4 rounded-lg border border-sky-200 bg-white p-3 text-xs leading-relaxed text-stone-700">
                {summary}
              </p>
            )}

            {!hasChange ? (
              <p className="text-sm text-sky-900">
                수정 제안이 없습니다. 기준에 맞게 잘 쓰여 있습니다.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onApplyAll}
                  className="mb-4 w-full rounded-lg bg-sky-700 px-3 py-2.5 text-sm font-medium text-white hover:bg-sky-800"
                >
                  전체 적용
                </button>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-stone-600">
                      원문
                    </p>
                    <div className="max-h-64 overflow-y-auto rounded-lg border border-stone-200 bg-white p-3 text-xs leading-relaxed whitespace-pre-wrap text-stone-600">
                      {originalText}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-sky-900">
                      다듬은 글
                    </p>
                    <div className="max-h-64 overflow-y-auto rounded-lg border border-sky-300 bg-white p-3 text-xs leading-relaxed whitespace-pre-wrap text-stone-900">
                      {revisedText}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
