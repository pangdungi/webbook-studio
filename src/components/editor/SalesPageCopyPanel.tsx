"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { SalesPageCopyReport } from "@/lib/salesPageCopy/types";
import {
  SALES_PAGE_BENEFIT_QUESTIONS,
} from "@/lib/salesPageCopy/benefitQuestions";
import { SALES_PAGE_AWARENESS_QUESTIONS } from "@/lib/salesPageCopy/awarenessQuestions";
import { SALES_PAGE_NICHE_FIELDS } from "@/lib/salesPageCopy/nicheAudience";
import {
  formatAwarenessAnswersText,
  formatBenefitAnswersText,
  formatNicheAudienceText,
  formatSalesPageCopyFullText,
} from "@/lib/salesPageCopy/normalize";

type Props = {
  report: SalesPageCopyReport | null;
  loading: boolean;
  error: string | null;
  provider: string | null;
  chaptersAnalyzed: number | null;
  onGenerate: () => void;
};

function Section({
  title,
  children,
  copyText,
  compactTitle = false,
}: {
  title: string;
  children: ReactNode;
  copyText?: string;
  compactTitle?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="mb-4">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h4
          className={`text-xs font-semibold text-sky-900 ${
            compactTitle ? "leading-snug" : "uppercase tracking-wide"
          }`}
        >
          {title}
        </h4>
        {copyText ? (
          <button
            type="button"
            onClick={() => void copy()}
            className="shrink-0 text-[11px] font-medium text-sky-700 hover:text-sky-950"
          >
            {copied ? "복사됨" : "복사"}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function BenefitAnswersBody({
  report,
}: {
  report: SalesPageCopyReport;
}) {
  const benefitText = formatBenefitAnswersText(report.benefitAnswers);

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-950">
          혜택 프레임워크
        </h3>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(benefitText)}
          className="shrink-0 rounded-md border border-amber-200 bg-white px-2 py-1 text-[11px] font-medium text-amber-950 hover:bg-amber-50"
        >
          전체 복사
        </button>
      </div>

      <div className="space-y-4">
        {SALES_PAGE_BENEFIT_QUESTIONS.map((q) => {
          const value = report.benefitAnswers[q.key];
          const copyText = Array.isArray(value)
            ? value.map((item, i) => `${i + 1}. ${item}`).join("\n")
            : value;

          return (
            <Section
              key={q.key}
              title={q.label}
              copyText={copyText || undefined}
              compactTitle
            >
              {Array.isArray(value) ? (
                value.length > 0 ? (
                  <ol className="list-inside list-decimal space-y-1 text-sm leading-relaxed text-stone-700">
                    {value.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-stone-500">—</p>
                )
              ) : value ? (
                <p className="text-sm leading-relaxed text-stone-700">{value}</p>
              ) : (
                <p className="text-xs text-stone-500">—</p>
              )}
            </Section>
          );
        })}
      </div>
    </div>
  );
}

function AwarenessAnswersBody({
  report,
}: {
  report: SalesPageCopyReport;
}) {
  const awarenessText = formatAwarenessAnswersText(report.awarenessAnswers);

  return (
    <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-950">
          독자 인식 단계별 대화
        </h3>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(awarenessText)}
          className="shrink-0 rounded-md border border-violet-200 bg-white px-2 py-1 text-[11px] font-medium text-violet-950 hover:bg-violet-50"
        >
          전체 복사
        </button>
      </div>

      <div className="space-y-4">
        {SALES_PAGE_AWARENESS_QUESTIONS.map((q) => {
          const value = report.awarenessAnswers[q.key];
          return (
            <Section
              key={q.key}
              title={q.label}
              copyText={value || undefined}
              compactTitle
            >
              {value ? (
                <p className="text-sm leading-relaxed text-stone-700">{value}</p>
              ) : (
                <p className="text-xs text-stone-500">—</p>
              )}
            </Section>
          );
        })}
      </div>
    </div>
  );
}

function NicheAudienceBody({
  report,
}: {
  report: SalesPageCopyReport;
}) {
  const nicheText = formatNicheAudienceText(report.nicheAudience);

  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-950">
          타깃 오디언스 3단계
        </h3>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(nicheText)}
          className="shrink-0 rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] font-medium text-emerald-950 hover:bg-emerald-50"
        >
          전체 복사
        </button>
      </div>

      <div className="space-y-4">
        {SALES_PAGE_NICHE_FIELDS.map((field) => {
          const value = report.nicheAudience[field.key];
          return (
            <Section
              key={field.key}
              title={field.label}
              copyText={value || undefined}
              compactTitle
            >
              <p className="mb-1.5 text-[11px] leading-snug text-emerald-900/70">
                {field.hint}
              </p>
              {value ? (
                <p className="text-sm leading-relaxed text-stone-700">{value}</p>
              ) : (
                <p className="text-xs text-stone-500">—</p>
              )}
            </Section>
          );
        })}
      </div>
    </div>
  );
}

function ReportBody({
  report,
  provider,
}: {
  report: SalesPageCopyReport;
  provider: string | null;
}) {
  const analyzedLabel = report.analyzedAt
    ? new Date(report.analyzedAt).toLocaleString("ko-KR")
    : null;

  const allText = formatSalesPageCopyFullText(report);

  return (
    <div className="rounded-xl border border-sky-200 bg-white p-3">
      <div className="mb-3 flex items-start justify-between gap-2">
        {provider && (
          <p className="text-xs text-sky-800">
            {provider === "anthropic" ? "Claude" : "OpenAI"} 생성
            {analyzedLabel ? ` · ${analyzedLabel}` : ""}
          </p>
        )}
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(allText)}
          className="shrink-0 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-900 hover:bg-sky-100"
        >
          전체 복사
        </button>
      </div>

      <Section title="헤드라인" copyText={report.headline}>
        <p className="text-base font-bold leading-snug text-stone-900">
          {report.headline}
        </p>
      </Section>

      {report.subheadline ? (
        <Section title="부제" copyText={report.subheadline}>
          <p className="text-sm leading-relaxed text-stone-700">
            {report.subheadline}
          </p>
        </Section>
      ) : null}

      {report.hook ? (
        <Section title="훅 (첫 인상)" copyText={report.hook}>
          <p className="text-sm leading-relaxed text-stone-800">{report.hook}</p>
        </Section>
      ) : null}

      {report.valueProposition ? (
        <Section title="핵심 가치" copyText={report.valueProposition}>
          <p className="text-sm leading-relaxed text-stone-800">
            {report.valueProposition}
          </p>
        </Section>
      ) : null}

      {report.forWho ? (
        <Section title="추천 대상" copyText={report.forWho}>
          <p className="text-sm leading-relaxed text-stone-800">{report.forWho}</p>
        </Section>
      ) : null}

      {report.bullets.length > 0 ? (
        <Section
          title="핵심 포인트"
          copyText={report.bullets.map((b) => `· ${b}`).join("\n")}
        >
          <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-stone-700">
            {report.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {report.cta ? (
        <Section title="CTA" copyText={report.cta}>
          <p className="text-sm font-semibold text-sky-950">{report.cta}</p>
        </Section>
      ) : null}

      {report.seoDescription ? (
        <Section title="SEO·공유 설명" copyText={report.seoDescription}>
          <p className="text-xs leading-relaxed text-stone-600">
            {report.seoDescription}
          </p>
        </Section>
      ) : null}

      <BenefitAnswersBody report={report} />
      <AwarenessAnswersBody report={report} />
      <NicheAudienceBody report={report} />
    </div>
  );
}

export function SalesPageCopyPanel({
  report,
  loading,
  error,
  provider,
  chaptersAnalyzed,
  onGenerate,
}: Props) {
  return (
    <aside className="flex h-full min-h-0 w-[min(100%,20rem)] shrink-0 flex-col border-l border-sky-200 bg-sky-50 sm:w-80">
      <div className="shrink-0 border-b border-sky-200 px-3 py-2.5">
        <h3 className="text-sm font-semibold text-sky-950">상세페이지</h3>
        <p className="mt-0.5 text-xs text-sky-800/80">
          책 전체 원고를 읽고 상세페이지에 쓸 문구를 뽑습니다
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {report && !loading && (
          <div className="mb-3">
            <ReportBody report={report} provider={provider} />
          </div>
        )}

        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="mb-3 w-full rounded-lg bg-sky-900 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "원고 분석 중…"
            : report
              ? "상세페이지 문구 다시 만들기"
              : "상세페이지 문구 만들기"}
        </button>

        {chaptersAnalyzed != null && chaptersAnalyzed > 0 && !loading && (
          <p className="mb-2 text-[11px] leading-relaxed text-sky-800">
            {chaptersAnalyzed}개 장 원고 전체를 분석했습니다.
          </p>
        )}

        {loading && (
          <p className="text-sm text-sky-900">
            모든 장 원고를 장마다 순차 분석한 뒤 상세페이지 문구를 작성하는
            중… (장이 많거나 길면 몇 분 걸릴 수 있습니다)
          </p>
        )}

        {!loading && error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {error}
          </p>
        )}

        {!loading && !error && !report && (
          <p className="text-xs leading-relaxed text-sky-800/90">
            「상세페이지 문구 만들기」를 누르면 저장된 모든 챕터 원고를 바탕으로
            판매·소개 페이지용 카피를 생성합니다. 독자 분석을 먼저 해두면 더
            맞춤형 문구가 나올 수 있습니다.
          </p>
        )}
      </div>
    </aside>
  );
}
