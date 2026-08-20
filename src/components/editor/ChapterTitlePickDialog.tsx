"use client";

import type {
  ChapterTitleCandidate,
  ChapterTitlePickReport,
} from "@/lib/chapterTitlePick/types";

type Props = {
  open: boolean;
  chapterLabel: string;
  loading: boolean;
  error: string | null;
  provider: string | null;
  report: ChapterTitlePickReport | null;
  onClose: () => void;
  onRegenerate: () => void;
  onApply: (candidate: ChapterTitleCandidate) => void;
};

export function ChapterTitlePickDialog({
  open,
  chapterLabel,
  loading,
  error,
  provider,
  report,
  onClose,
  onRegenerate,
  onApply,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chapter-title-pick-heading"
        className="flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col rounded-xl border border-violet-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-violet-100 px-4 py-3">
          <h3
            id="chapter-title-pick-heading"
            className="text-sm font-semibold text-violet-950"
          >
            장 제목 뽑기
          </h3>
          <p className="mt-0.5 text-xs text-violet-800/80">{chapterLabel}</p>
          <p className="mt-1 text-[11px] text-stone-500">
            이 장의 모든 페이지를 읽고 제목 후보를 제안합니다
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="text-sm text-violet-900">
              페이지를 읽는 중… (잠시만 기다려 주세요)
            </p>
          ) : null}

          {!loading && error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              {error}
            </p>
          ) : null}

          {!loading && report ? (
            <div className="space-y-3">
              {provider ? (
                <p className="text-xs text-violet-800">
                  {provider === "anthropic" ? "Claude Sonnet" : "OpenAI"} ·{" "}
                  {report.pagesRead}개 페이지 분석
                </p>
              ) : null}
              {report.chapterSummary ? (
                <p className="rounded-lg border border-violet-100 bg-violet-50/60 p-2.5 text-sm leading-relaxed text-stone-700">
                  {report.chapterSummary}
                </p>
              ) : null}
              {report.candidates.map((candidate, index) => (
                <article
                  key={`${candidate.title}-${index}`}
                  className="rounded-xl border border-stone-200 bg-stone-50/50 p-3"
                >
                  <p className="text-base font-semibold text-stone-900">
                    {candidate.title}
                  </p>
                  {candidate.rationale ? (
                    <p className="mt-1 text-xs leading-relaxed text-stone-500">
                      {candidate.rationale}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onApply(candidate)}
                    className="mt-2 rounded-md bg-violet-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-950"
                  >
                    이 제목 적용
                  </button>
                </article>
              ))}
            </div>
          ) : null}

          {!loading && !error && !report ? (
            <p className="text-xs text-stone-500">준비 중…</p>
          ) : null}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-stone-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={loading}
            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-950 hover:bg-violet-100 disabled:opacity-50"
          >
            {loading ? "분석 중…" : "다시 뽑기"}
          </button>
        </div>
      </div>
    </div>
  );
}
