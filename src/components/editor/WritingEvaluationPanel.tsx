"use client";

import type { ReactNode } from "react";
import type {
  WritingEvaluationReport,
  WritingImprovementSuggestion,
} from "@/lib/writingEvaluation/types";

type Props = {
  report: WritingEvaluationReport | null;
  loading: boolean;
  error: string | null;
  warning?: string | null;
  provider: string | null;
  scannedLength?: number;
  pageSubtitle?: string;
  hasResult?: boolean;
  onRerun: () => void;
  onClose: () => void;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-4">
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-900">
        {title}
      </h4>
      {children}
    </section>
  );
}

function BodyText({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap text-stone-700">
      {children}
    </p>
  );
}

function ImprovementCard({ item }: { item: WritingImprovementSuggestion }) {
  return (
    <li className="rounded-lg border border-amber-200 bg-amber-50/80 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900">
        {item.category ? `${item.category} · ` : ""}
        {item.area}
      </p>
      <p className="mt-2 text-xs font-medium text-red-900/90">문제</p>
      <p className="mt-0.5 text-sm leading-relaxed text-stone-800">
        {item.problem}
      </p>
      <p className="mt-2 text-xs font-medium text-emerald-800">이렇게 고치면</p>
      <p className="mt-0.5 text-sm leading-relaxed font-medium text-emerald-950">
        {item.suggestion}
      </p>
    </li>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-stone-500">—</p>;
  }
  return (
    <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-stone-700">
      {items.map((item, i) => (
        <li key={`${i}-${item.slice(0, 24)}`}>{item}</li>
      ))}
    </ul>
  );
}

function ReportBody({
  report,
  provider,
  pageSubtitle,
}: {
  report: WritingEvaluationReport;
  provider: string | null;
  pageSubtitle?: string;
}) {
  const analyzedLabel = report.analyzedAt
    ? new Date(report.analyzedAt).toLocaleString("ko-KR")
    : null;

  return (
    <div className="space-y-4">
      {provider && (
        <p className="text-xs font-medium text-emerald-800">
          {provider === "anthropic" ? "Claude Sonnet" : "OpenAI"} · 글평가
          {analyzedLabel ? ` · ${analyzedLabel}` : ""}
        </p>
      )}

      <div className="rounded-lg border border-emerald-200 bg-white p-3">
        <p className="text-xs font-medium text-emerald-900">글 유형</p>
        <p className="mt-1 text-base font-semibold text-stone-900">
          {report.genreLabel}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          {report.genreRationale}
        </p>
      </div>

      <Section title="핵심 메시지">
        <BodyText>{report.coreMessage}</BodyText>
      </Section>

      {report.improvements.length > 0 && (
        <Section title="개선할 곳 · 이렇게 고치면">
          <ul className="space-y-2">
            {report.improvements.map((item, i) => (
              <ImprovementCard key={`${i}-${item.area}`} item={item} />
            ))}
          </ul>
        </Section>
      )}

      <Section title="전체 요약">
        <BodyText>{report.overallSummary}</BodyText>
      </Section>

      {report.genre === "empathy" && report.empathy && (
        <Section title="공감형 틀 — 관찰 · 성찰 · 통찰">
          <div className="space-y-3 rounded-lg border border-emerald-100 bg-white p-3">
            <div>
              <p className="text-xs font-medium text-stone-500">1. 관찰하기</p>
              <BodyText>{report.empathy.observation || "—"}</BodyText>
            </div>
            <div>
              <p className="text-xs font-medium text-stone-500">2. 성찰하기</p>
              <BodyText>{report.empathy.reflection || "—"}</BodyText>
            </div>
            <div>
              <p className="text-xs font-medium text-stone-500">3. 통찰하기</p>
              <BodyText>{report.empathy.insight || "—"}</BodyText>
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-800">
                이렇게 정리하면
              </p>
              <BodyText>{report.empathy.suggestedOutline || "—"}</BodyText>
            </div>
          </div>
        </Section>
      )}

      {report.genre === "argument" && report.argument && (
        <Section title="주장형 틀 — 주장 · 이유 · 사례 · 방법">
          <div className="space-y-3 rounded-lg border border-emerald-100 bg-white p-3">
            <div>
              <p className="text-xs font-medium text-stone-500">1. 주장</p>
              <BodyText>{report.argument.claim}</BodyText>
            </div>
            <div>
              <p className="text-xs font-medium text-stone-500">2. 이유</p>
              <BulletList items={report.argument.reasons} />
            </div>
            <div>
              <p className="text-xs font-medium text-stone-500">3. 사례</p>
              <BulletList items={report.argument.examples} />
            </div>
            <div>
              <p className="text-xs font-medium text-stone-500">4. 방법 제안</p>
              <BodyText>{report.argument.methodProposal || "—"}</BodyText>
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-800">
                이렇게 정리하면
              </p>
              <BodyText>{report.argument.suggestedOutline || "—"}</BodyText>
            </div>
          </div>
        </Section>
      )}

      <Section title="메시지 하나인가?">
        <p className="mb-1 text-sm font-medium text-stone-800">
          {report.singleMessage
            ? "하나의 메시지에 가깝습니다."
            : "여러 메시지가 섞여 있습니다."}
        </p>
        <BodyText>{report.singleMessageAssessment}</BodyText>
        {!report.singleMessage && report.improvements.length === 0 && (
          <p className="mt-2 text-xs text-amber-800">
            위 진단을 바탕으로 improvements 항목을 다시 생성해 주세요.
          </p>
        )}
      </Section>

      <Section title="부제목·제목과의 맞춤">
        {pageSubtitle?.trim() ? (
          <p className="mb-2 text-xs text-stone-500">
            부제목: 「{pageSubtitle.trim()}」
          </p>
        ) : null}
        <BodyText>{report.subtitleAlignment}</BodyText>
      </Section>

      <Section title="이 글이 잘 맞는 독자">
        <BulletList items={report.idealReaders} />
      </Section>
    </div>
  );
}

export function WritingEvaluationPanel({
  report,
  loading,
  error,
  warning = null,
  provider,
  scannedLength = 0,
  pageSubtitle = "",
  hasResult = false,
  onRerun,
  onClose,
}: Props) {
  return (
    <aside
      className="flex h-[min(42vh,320px)] min-h-0 w-full shrink-0 flex-col border-t border-emerald-200 bg-emerald-50 md:h-auto md:max-h-none md:w-[min(22rem,38vw)] md:min-w-[18rem] md:border-t-0 md:border-l lg:w-[min(26rem,36vw)]"
      aria-label="글평가 패널"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-emerald-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-emerald-950">글평가</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRerun}
            disabled={loading}
            className="rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
          >
            검사를 다시하기
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-emerald-800 hover:text-emerald-950"
          >
            닫기
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <p className="mb-3 rounded-lg border border-stone-200 bg-white p-2.5 text-[11px] leading-relaxed text-stone-600">
          이 페이지 전체를 읽고 유형·메시지·부제목을 평가합니다. 문제가 있는
          구간마다 「이렇게 고치면」 개선 방법을 제안합니다. 본문은 수정하지
          않습니다.
        </p>

        {loading && (
          <p className="text-sm text-emerald-900">
            Claude Sonnet으로 글평가 중…
            {scannedLength > 0 && (
              <span className="mt-1 block text-xs text-emerald-700">
                {scannedLength.toLocaleString()}자
              </span>
            )}
          </p>
        )}

        {!loading && !hasResult && !error && (
          <p className="rounded-lg border border-emerald-100 bg-white p-3 text-xs leading-relaxed text-emerald-900/90">
            아직 이 페이지에서 글평가를 하지 않았습니다. 위 「검사를 다시하기」를
            눌러 실행하세요. 평가가 끝난 뒤에는 글평가 탭을 눌러 마지막 결과를
            다시 볼 수 있습니다.
          </p>
        )}

        {!loading && error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {error}
          </p>
        )}

        {!loading && !error && warning && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
            {warning}
          </p>
        )}

        {!loading && !error && hasResult && report && (
          <ReportBody
            report={report}
            provider={provider}
            pageSubtitle={pageSubtitle}
          />
        )}
      </div>
    </aside>
  );
}
