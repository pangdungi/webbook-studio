"use client";

import { useState } from "react";
import type { BookTitleCandidate, BookTitlePickReport } from "@/lib/bookTitlePick/types";

type Props = {
  currentTitle: string;
  currentSubtitle: string | null;
  report: BookTitlePickReport | null;
  loading: boolean;
  error: string | null;
  provider: string | null;
  chaptersAnalyzed: number | null;
  onGenerate: () => void;
  onApply: (candidate: BookTitleCandidate) => void;
};

function CandidateCard({
  candidate,
  onApply,
}: {
  candidate: BookTitleCandidate;
  onApply: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyText = `${candidate.title}\n${candidate.subtitle}`.trim();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <article className="rounded-xl border border-emerald-200 bg-white p-3">
      <p className="text-base font-semibold leading-snug text-stone-900">
        {candidate.title}
      </p>
      {candidate.subtitle ? (
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-stone-600">
          {candidate.subtitle}
        </p>
      ) : null}
      {candidate.rationale ? (
        <p className="mt-2 text-xs leading-relaxed text-stone-500">
          {candidate.rationale}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onApply}
          className="rounded-md bg-emerald-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-950"
        >
          표지에 적용
        </button>
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-950 hover:bg-emerald-100"
        >
          {copied ? "복사됨" : "텍스트 복사"}
        </button>
      </div>
    </article>
  );
}

export function BookTitlePickPanel({
  currentTitle,
  currentSubtitle,
  report,
  loading,
  error,
  provider,
  chaptersAnalyzed,
  onGenerate,
  onApply,
}: Props) {
  return (
    <aside className="flex h-full min-h-0 w-[min(100%,20rem)] shrink-0 flex-col border-l border-emerald-200 bg-emerald-50 sm:w-80">
      <div className="shrink-0 border-b border-emerald-200 px-3 py-2.5">
        <h3 className="text-sm font-semibold text-emerald-950">책 제목뽑기</h3>
        <p className="mt-0.5 text-xs text-emerald-800/80">
          책 전체 원고를 읽고 표지용 제목·부제목 후보를 뽑습니다
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mb-3 rounded-lg border border-emerald-200/80 bg-white/70 p-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-900">
            현재 표지
          </p>
          <p className="mt-1 text-sm font-semibold text-stone-900">
            {currentTitle.trim() || "제목 없음"}
          </p>
          {currentSubtitle?.trim() ? (
            <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-stone-600">
              {currentSubtitle.trim()}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-stone-400">부제 없음</p>
          )}
        </div>

        {report?.bookSummary && !loading ? (
          <p className="mb-3 rounded-lg border border-emerald-200 bg-white p-2.5 text-sm leading-relaxed text-stone-700">
            {report.bookSummary}
          </p>
        ) : null}

        {report && !loading ? (
          <div className="mb-3 space-y-3">
            {provider ? (
              <p className="text-xs text-emerald-800">
                {provider === "anthropic" ? "Claude" : "OpenAI"} 생성
                {report.generatedAt
                  ? ` · ${new Date(report.generatedAt).toLocaleString("ko-KR")}`
                  : ""}
              </p>
            ) : null}
            {report.candidates.map((candidate, index) => (
              <CandidateCard
                key={`${candidate.title}-${index}`}
                candidate={candidate}
                onApply={() => onApply(candidate)}
              />
            ))}
          </div>
        ) : null}

        {loading ? (
          <p className="mb-3 text-sm font-medium text-emerald-900">
            모든 장 원고를 순차 분석한 뒤 제목·부제목 후보를 만드는 중… (장이
            많거나 길면 몇 분 걸릴 수 있습니다)
          </p>
        ) : null}

        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="mb-3 w-full rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "원고 분석 중…"
            : report
              ? "제목·부제목 다시 뽑기"
              : "제목·부제목 뽑기"}
        </button>

        {chaptersAnalyzed != null && chaptersAnalyzed > 0 && !loading ? (
          <p className="mb-2 text-[11px] leading-relaxed text-emerald-800">
            {chaptersAnalyzed}개 장 원고 전체를 분석했습니다.
          </p>
        ) : null}

        {!loading && error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {error}
          </p>
        ) : null}

        {!loading && !error && !report ? (
          <p className="text-xs leading-relaxed text-emerald-800/90">
            패널을 열면 자동으로 분석을 시작합니다. 완료되면 6가지 제목·부제목
            조합이 아래에 표시됩니다.
          </p>
        ) : null}
      </div>
    </aside>
  );
}
