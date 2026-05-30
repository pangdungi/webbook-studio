"use client";

import type { ReviewParagraphChunk } from "@/lib/writingReview/compare";

const CRITERIA = [
  "핵심 메시지 유지 · 중복·누락 없음",
  "겹치는 표현 제거",
  "주어·술어 · 마침표·느낌표·물음표로 종료",
  "세미콜론·콜론·괄호 제거 · 능동형·단문",
  "관념적·모호한 표현·멋부린 문장 피하기",
  "설명하지 말고 보여주기(구체적 장면·행동)",
  "출처·인용 표기",
];

const CRITERION_LABELS: Record<string, string> = {
  메시지: "핵심 메시지",
  중복: "중복·군더더기",
  문장: "문장 부호",
  문체: "문체·능동형",
  표현: "구체적 표현",
  문법: "문법",
  띄어쓰기: "띄어쓰기",
  오타: "오타",
  인용: "인용",
};

type Props = {
  summary: string;
  paragraphs: ReviewParagraphChunk[];
  appliedIndices: ReadonlySet<number>;
  error?: string | null;
  provider?: string | null;
  loading: boolean;
  scannedLength?: number;
  onApplyParagraph: (chunk: ReviewParagraphChunk) => void;
  onApplyAll: () => void;
  onFocusParagraph: (chunk: ReviewParagraphChunk) => void;
  alignWarning?: string | null;
  hasResult?: boolean;
  onRerun: () => void;
  onClose: () => void;
};

function criteriaLabel(keys: string[] | undefined): string | null {
  if (!keys?.length) return null;
  return keys.map((k) => CRITERION_LABELS[k] ?? k).join(" · ");
}

export function WritingReviewPanel({
  summary,
  paragraphs,
  appliedIndices,
  error = null,
  provider = null,
  loading,
  scannedLength = 0,
  onApplyParagraph,
  onApplyAll,
  onFocusParagraph,
  alignWarning = null,
  hasResult = false,
  onRerun,
  onClose,
}: Props) {
  const changed = paragraphs.filter((p) => p.changed);
  const unchanged = paragraphs.filter((p) => !p.changed);
  const pending = changed.filter((p) => !appliedIndices.has(p.blockIndex));

  return (
    <aside
      className="flex h-full min-h-[min(50vh,100%)] w-full shrink-0 flex-col border-t border-sky-200 bg-sky-50 md:h-auto md:min-h-0 md:w-[min(42rem,52vw)] md:max-w-[52vw] md:border-t-0 md:border-l lg:w-[min(44rem,50vw)]"
      aria-label="글검사 패널"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-sky-200 bg-sky-100/80 px-5 py-3.5">
        <h3 className="text-base font-semibold text-sky-950">글검사</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRerun}
            disabled={loading}
            className="rounded-md border border-sky-300 bg-white px-2.5 py-1 text-sm font-medium text-sky-900 hover:bg-sky-50 disabled:opacity-50"
          >
            검사를 다시하기
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-sky-800 hover:bg-sky-200/60"
          >
            닫기
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <p className="mb-4 rounded-lg border border-stone-200 bg-white p-3 text-sm leading-relaxed text-stone-600">
          왼쪽 본문: <span className="font-medium text-sky-800">바뀐 부분</span>
          이 하늘색입니다. 오른쪽에서{" "}
          <span className="font-medium">문제점 · 수정 포인트</span>를 확인하고
          「이 문단으로 교체」하세요.
        </p>

        {loading && (
          <p className="text-sm text-sky-900">
            이 페이지 글검사 중…
            {scannedLength > 0 && (
              <span className="mt-1 block text-sm text-sky-700">
                {scannedLength.toLocaleString()}자
              </span>
            )}
          </p>
        )}

        {!loading && !hasResult && !error && (
          <p className="rounded-lg border border-sky-100 bg-white p-4 text-sm text-sky-900/90">
            아직 이 페이지에서 글검사를 하지 않았습니다. 위 「검사를 다시하기」를
            눌러 실행하세요. 검사가 끝난 뒤에는 글검사 탭을 눌러 마지막 결과를
            다시 볼 수 있습니다.
          </p>
        )}

        {!loading && error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </p>
        )}

        {!loading && !error && hasResult && (
          <>
            {provider && (
              <p className="mb-3 text-sm font-medium text-sky-800">
                {provider === "anthropic"
                  ? "Claude Sonnet — 글검사"
                  : provider === "openai"
                    ? "OpenAI — 글검사"
                    : "검사 완료"}
              </p>
            )}

            <details className="mb-4 rounded-lg border border-sky-100 bg-white">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-sky-900">
                검사 기준 보기
              </summary>
              <ul className="list-inside list-disc border-t border-sky-50 px-3 py-2 text-sm leading-relaxed text-sky-900/90">
                {CRITERIA.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </details>

            {summary && (
              <p className="mb-4 rounded-lg border border-sky-200 bg-white p-4 text-sm leading-relaxed text-stone-700">
                {summary}
              </p>
            )}

            {alignWarning && (
              <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
                {alignWarning}
              </p>
            )}

            {changed.length === 0 ? (
              <p className="text-sm text-sky-900">
                수정이 필요한 문단이 없습니다.
              </p>
            ) : (
              <>
                <p className="mb-3 text-sm font-medium text-sky-950">
                  수정 문단 {changed.length}개 · 미적용 {pending.length}개
                </p>

                <ul className="mb-4 space-y-4">
                  {changed.map((para) => {
                    const applied = appliedIndices.has(para.blockIndex);
                    const crit = criteriaLabel(para.criteria);
                    return (
                      <li
                        key={para.blockIndex}
                        className={`rounded-xl border p-4 ${
                          applied
                            ? "border-stone-200 bg-stone-50"
                            : "border-sky-200 bg-white shadow-sm"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onFocusParagraph(para)}
                          className="text-left text-sm font-semibold text-sky-950 hover:underline"
                        >
                          {para.label}
                          {applied && (
                            <span className="ml-2 font-normal text-stone-600">
                              적용됨
                            </span>
                          )}
                        </button>

                        {crit && (
                          <p className="mt-2 text-xs font-medium text-sky-800">
                            해당 기준 · {crit}
                          </p>
                        )}

                        {para.problem && (
                          <div className="mt-3 rounded-lg bg-red-50/80 px-3 py-2.5">
                            <p className="text-xs font-semibold text-red-900">
                              문제점
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-red-950/90">
                              {para.problem}
                            </p>
                          </div>
                        )}

                        {para.suggestion && (
                          <div className="mt-2 rounded-lg bg-amber-50/80 px-3 py-2.5">
                            <p className="text-xs font-semibold text-amber-900">
                              수정 포인트
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-amber-950/90">
                              {para.suggestion}
                            </p>
                          </div>
                        )}

                        <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50/50 px-3 py-2.5">
                          <p className="text-xs font-semibold text-sky-900">
                            다듬은 문단
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-stone-900">
                            {para.revised}
                          </p>
                        </div>

                        {!applied && (
                          <button
                            type="button"
                            onClick={() => onApplyParagraph(para)}
                            className="mt-3 w-full rounded-lg bg-sky-700 px-3 py-2.5 text-sm font-medium text-white hover:bg-sky-800"
                          >
                            이 문단으로 교체
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {unchanged.length > 0 && (
                  <details className="mb-4 rounded-lg border border-stone-200 bg-stone-50/80">
                    <summary className="cursor-pointer px-3 py-2 text-sm text-stone-600">
                      변경 없음 {unchanged.length}개 문단
                    </summary>
                    <ul className="space-y-1 border-t border-stone-200 px-3 py-2 text-sm text-stone-500">
                      {unchanged.map((p) => (
                        <li key={p.blockIndex}>{p.label}</li>
                      ))}
                    </ul>
                  </details>
                )}

                {pending.length > 0 && (
                  <button
                    type="button"
                    onClick={onApplyAll}
                    className="w-full rounded-lg border border-sky-400 bg-white px-4 py-2.5 text-sm font-medium text-sky-900 hover:bg-sky-100"
                  >
                    남은 문단 모두 적용
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
