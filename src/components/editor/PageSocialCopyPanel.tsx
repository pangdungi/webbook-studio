"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { PageSocialCopyReport } from "@/lib/pageSocialCopy/types";
import { formatPageSocialCopyFullText } from "@/lib/pageSocialCopy/normalize";

type Props = {
  report: PageSocialCopyReport | null;
  loading: boolean;
  error: string | null;
  provider: string | null;
  scannedLength?: number;
  pageSubtitle?: string;
  hasResult?: boolean;
  onGenerate: () => void;
  onClose: () => void;
};

function Section({
  title,
  children,
  copyText,
}: {
  title: string;
  children: ReactNode;
  copyText?: string;
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
        <h4 className="text-xs font-semibold uppercase tracking-wide text-rose-900">
          {title}
        </h4>
        {copyText ? (
          <button
            type="button"
            onClick={() => void copy()}
            className="shrink-0 text-[11px] font-medium text-rose-700 hover:text-rose-950"
          >
            {copied ? "복사됨" : "복사"}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function BodyText({ children }: { children: ReactNode }) {
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
      {children}
    </p>
  );
}

function ReportBody({
  report,
  provider,
}: {
  report: PageSocialCopyReport;
  provider: string | null;
}) {
  const analyzedLabel = report.analyzedAt
    ? new Date(report.analyzedAt).toLocaleString("ko-KR")
    : null;

  const carouselText = [
    report.carousel.hookSlide,
    ...report.carousel.slides,
    report.carousel.ctaSlide,
  ]
    .filter(Boolean)
    .map((s, i) => `${i + 1}. ${s}`)
    .join("\n");

  return (
    <div className="space-y-4">
      {provider && (
        <p className="text-xs font-medium text-rose-800">
          {provider === "anthropic" ? "Claude" : "OpenAI"} · SNS 카피
          {analyzedLabel ? ` · ${analyzedLabel}` : ""}
        </p>
      )}

      <div className="rounded-lg border border-rose-200 bg-white p-3">
        <Section title="릴스 대본" copyText={report.reelsScript}>
          <BodyText>{report.reelsScript || "—"}</BodyText>
        </Section>

        <Section title="캐러셀" copyText={carouselText || undefined}>
          {report.carousel.hookSlide ? (
            <p className="mb-2 text-sm font-semibold text-stone-900">
              1. {report.carousel.hookSlide}
            </p>
          ) : null}
          <ol className="list-inside list-decimal space-y-1.5 text-sm leading-relaxed text-stone-700">
            {report.carousel.slides.map((slide) => (
              <li key={slide}>{slide}</li>
            ))}
          </ol>
          {report.carousel.ctaSlide ? (
            <p className="mt-2 text-sm font-medium text-rose-950">
              CTA · {report.carousel.ctaSlide}
            </p>
          ) : null}
        </Section>
      </div>

      <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-3">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
          세일즈 메시지 공식
        </p>

        <Section
          title="공식 1 · 문제-동요-해결"
          copyText={report.formulaPas.fullMessage || undefined}
        >
          <p className="text-[11px] font-medium text-stone-500">문제</p>
          <BodyText>{report.formulaPas.problem || "—"}</BodyText>
          <p className="mt-2 text-[11px] font-medium text-stone-500">동요</p>
          <BodyText>{report.formulaPas.agitate || "—"}</BodyText>
          <p className="mt-2 text-[11px] font-medium text-stone-500">해결</p>
          <BodyText>{report.formulaPas.solution || "—"}</BodyText>
          {report.formulaPas.fullMessage ? (
            <>
              <p className="mt-2 text-[11px] font-medium text-rose-800">완성문</p>
              <BodyText>{report.formulaPas.fullMessage}</BodyText>
            </>
          ) : null}
        </Section>

        <Section
          title="공식 2 · 혜택×3"
          copyText={report.formulaBenefits.fullMessage || undefined}
        >
          <ol className="list-inside list-decimal space-y-1 text-sm text-stone-700">
            {report.formulaBenefits.benefits.map((b) => (
              <li key={b}>{b || "—"}</li>
            ))}
          </ol>
          {report.formulaBenefits.cta ? (
            <p className="mt-2 text-sm text-stone-700">
              CTA: {report.formulaBenefits.cta}
            </p>
          ) : null}
          {report.formulaBenefits.fullMessage ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
              {report.formulaBenefits.fullMessage}
            </p>
          ) : null}
        </Section>

        <Section
          title="공식 3 · 비포-애프터-브리지"
          copyText={report.formulaBab.fullMessage || undefined}
        >
          <p className="text-[11px] font-medium text-stone-500">비포</p>
          <BodyText>{report.formulaBab.before || "—"}</BodyText>
          <p className="mt-2 text-[11px] font-medium text-stone-500">애프터</p>
          <BodyText>{report.formulaBab.after || "—"}</BodyText>
          <p className="mt-2 text-[11px] font-medium text-stone-500">브리지</p>
          <BodyText>{report.formulaBab.bridge || "—"}</BodyText>
          {report.formulaBab.fullMessage ? (
            <>
              <p className="mt-2 text-[11px] font-medium text-rose-800">완성문</p>
              <BodyText>{report.formulaBab.fullMessage}</BodyText>
            </>
          ) : null}
        </Section>
      </div>
    </div>
  );
}

export function PageSocialCopyPanel({
  report,
  loading,
  error,
  provider,
  scannedLength,
  pageSubtitle,
  hasResult,
  onGenerate,
  onClose,
}: Props) {
  const allText = report ? formatPageSocialCopyFullText(report) : "";

  return (
    <aside className="flex h-full min-h-0 w-[min(100%,22rem)] shrink-0 flex-col border-l border-rose-200 bg-rose-50/40 sm:w-96">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-rose-200 px-3 py-2.5">
        <div>
          <h3 className="text-sm font-semibold text-rose-950">릴스·캐러셀</h3>
          {pageSubtitle ? (
            <p className="mt-0.5 truncate text-[11px] text-rose-800/80">
              {pageSubtitle}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasResult && allText ? (
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(allText)}
              className="rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-medium text-rose-900 hover:bg-rose-50"
            >
              전체 복사
            </button>
          ) : null}
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            className="rounded-md border border-rose-300 bg-white px-2 py-1 text-xs font-medium text-rose-900 hover:bg-rose-50 disabled:opacity-50"
          >
            {loading ? "생성 중…" : hasResult ? "다시 만들기" : "만들기"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-rose-800 hover:text-rose-950"
          >
            닫기
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <p className="mb-3 rounded-lg border border-rose-100 bg-white p-2.5 text-[11px] leading-relaxed text-stone-600">
          이 페이지 본문만 읽고 인스타 릴스 대본·캐러셀·세일즈 공식 3종
          (문제-동요-해결 / 혜택×3 / 비포-애프터-브리지)을 만듭니다.
        </p>

        {loading && (
          <p className="text-sm text-rose-900">
            이 페이지 원고로 SNS 카피 작성 중…
            {scannedLength != null && scannedLength > 0 ? (
              <span className="mt-1 block text-xs text-rose-700">
                {scannedLength.toLocaleString()}자
              </span>
            ) : null}
          </p>
        )}

        {!loading && !hasResult && !error && (
          <p className="rounded-lg border border-rose-100 bg-white p-3 text-xs leading-relaxed text-rose-900/90">
            「만들기」를 누르면 현재 페이지만 분석합니다.
          </p>
        )}

        {!loading && error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {error}
          </p>
        )}

        {!loading && !error && hasResult && report && (
          <ReportBody report={report} provider={provider} />
        )}
      </div>
    </aside>
  );
}
