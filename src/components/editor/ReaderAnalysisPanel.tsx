"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { ReaderAnalysisReport } from "@/lib/readerAnalysis/types";

type Props = {
  pitch: string;
  onPitchChange: (value: string) => void;
  onPitchBlur?: () => void;
  report: ReaderAnalysisReport | null;
  loading: boolean;
  error: string | null;
  provider: string | null;
  includeSample: boolean;
  onIncludeSampleChange: (value: boolean) => void;
  onAnalyze: () => void;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-4">
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-violet-900">
        {title}
      </h4>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-stone-500">—</p>;
  }
  return (
    <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-stone-700">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function ReportBody({
  report,
  provider,
}: {
  report: ReaderAnalysisReport;
  provider: string | null;
}) {
  const analyzedLabel = report.analyzedAt
    ? new Date(report.analyzedAt).toLocaleString("ko-KR")
    : null;

  return (
    <div className="rounded-xl border border-violet-200 bg-white p-3">
      {provider && (
        <p className="mb-2 text-xs text-violet-800">
          {provider === "anthropic" ? "Claude" : "OpenAI"} 분석
          {analyzedLabel ? ` · ${analyzedLabel}` : ""}
        </p>
      )}

      <p className="mb-3 text-sm leading-relaxed text-stone-800">{report.summary}</p>

      <Section title="타겟 독자">
        <ul className="space-y-2">
          {report.targetReaders.map((p) => (
            <li
              key={p.label}
              className="rounded-lg border border-violet-100 bg-violet-50/50 p-2.5"
            >
              <p className="text-sm font-semibold text-violet-950">{p.label}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-stone-600">
                {p.description}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="관심 있을 내용">
        <BulletList items={report.interests} />
      </Section>

      <Section title="해결하고 싶은 고민">
        <BulletList items={report.problemsToSolve} />
      </Section>

      <Section title="도움받고 싶은 것">
        <BulletList items={report.desiredHelp} />
      </Section>

      <Section title="읽기 환경">
        <BulletList items={report.readingContext} />
      </Section>

      <Section title="책에서 강조할 소재">
        <BulletList items={report.contentAngles} />
      </Section>

      <Section title="이 독자에게 맞는 글쓰기">
        <BulletList items={report.writingGuidance} />
      </Section>
    </div>
  );
}

export function ReaderAnalysisPanel({
  pitch,
  onPitchChange,
  onPitchBlur,
  report,
  loading,
  error,
  provider,
  includeSample,
  onIncludeSampleChange,
  onAnalyze,
}: Props) {
  const [setupOpen, setSetupOpen] = useState(!report);

  return (
    <aside className="flex h-full min-h-0 w-[min(100%,20rem)] shrink-0 flex-col border-l border-violet-200 bg-violet-50 sm:w-80">
      <div className="shrink-0 border-b border-violet-200 px-3 py-2.5">
        <h3 className="text-sm font-semibold text-violet-950">독자 분석</h3>
        <p className="mt-0.5 text-xs text-violet-800/80">
          {report
            ? "다시 분석하기 전까지 이 레포트가 유지됩니다"
            : "분석 후 이 패널에 계속 표시됩니다"}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {report && !loading && (
          <div className="mb-3">
            <ReportBody report={report} provider={provider} />
          </div>
        )}

        {report && (
          <button
            type="button"
            onClick={() => setSetupOpen((o) => !o)}
            className="mb-2 w-full rounded-lg border border-violet-300 bg-white px-3 py-2 text-left text-xs font-medium text-violet-900 hover:bg-violet-100/80"
          >
            {setupOpen ? "책 요약·분석 설정 접기" : "다시 분석하기 (책 요약 수정)"}
          </button>
        )}

        {(!report || setupOpen) && (
          <>
            <label className="mb-1 block text-xs font-medium text-violet-950">
              이 책의 내용 (간단히)
            </label>
            <textarea
              value={pitch}
              onChange={(e) => onPitchChange(e.target.value)}
              onBlur={onPitchBlur}
              disabled={loading}
              rows={report ? 4 : 6}
              placeholder="예: 직장인 부모를 위한 아이와의 대화법…"
              className="mb-3 w-full resize-y rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm leading-relaxed text-stone-800 outline-none ring-violet-300 focus:ring-2 disabled:opacity-60"
            />

            <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-violet-900">
              <input
                type="checkbox"
                checked={includeSample}
                onChange={(e) => onIncludeSampleChange(e.target.checked)}
                disabled={loading}
                className="rounded border-violet-300"
              />
              챕터 원고 일부도 참고
            </label>

            <button
              type="button"
              onClick={onAnalyze}
              disabled={loading || !pitch.trim()}
              className="mb-3 w-full rounded-lg bg-violet-900 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "분석 중…" : report ? "독자 다시 분석하기" : "독자 분석하기"}
            </button>
          </>
        )}

        {loading && (
          <p className="text-sm text-violet-900">독자 페르소나·관심사·고민을 정리하는 중…</p>
        )}

        {!loading && error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {error}
          </p>
        )}

        {!loading && !error && !report && (
          <p className="text-xs leading-relaxed text-violet-800/90">
            책 내용을 적고 분석하면, 이 책을 열 때마다 레포트가 오른쪽에
            남습니다.
          </p>
        )}
      </div>
    </aside>
  );
}
