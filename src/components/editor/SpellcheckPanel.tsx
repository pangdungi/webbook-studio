"use client";

import type { SpellCorrection } from "@/lib/types/database";
import { summarizeCorrections } from "@/lib/spellcheck/localRules";
import {
  SPELLCHECK_DISCLAIMER,
  spellcheckProviderLabel,
} from "@/lib/spellcheck/sources";

type Props = {
  corrections: SpellCorrection[];
  correctedText: string;
  originalText: string;
  error?: string | null;
  provider?: string | null;
  onApplyAll: () => void;
  onClose: () => void;
  loading: boolean;
  scannedLength?: number;
};

export function SpellcheckPanel({
  corrections,
  correctedText,
  originalText,
  error = null,
  provider = null,
  onApplyAll,
  onClose,
  loading,
  scannedLength = 0,
}: Props) {
  const summary = summarizeCorrections(corrections);
  const hasRewrite = correctedText.trim() !== originalText.trim();
  const aiFailed =
    !!error?.includes("보조") ||
    (!!error &&
      provider !== "daum" &&
      provider !== "naver" &&
      provider !== "pnu");
  const providerLabel = spellcheckProviderLabel(provider, aiFailed && !loading);

  return (
    <div className="absolute right-4 top-16 z-20 w-80 rounded-xl border border-amber-200 bg-amber-50 shadow-lg">
      <div className="flex items-center justify-between border-b border-amber-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-amber-900">맞춤법 검사</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-amber-700 hover:text-amber-900"
        >
          닫기
        </button>
      </div>

      <div className="p-4">
        <p className="mb-3 rounded-lg border border-stone-200 bg-white p-2.5 text-[11px] leading-relaxed text-stone-600">
          {SPELLCHECK_DISCLAIMER}
        </p>

        {loading && (
          <p className="mb-3 text-sm text-amber-800">
            맞춤법 검사기 연동 중…
            {scannedLength > 0 && (
              <span className="block text-xs text-amber-600">
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

        {!loading && (
          <p className="mb-2 text-xs font-medium text-amber-800">
            {providerLabel}
          </p>
        )}

        {!loading && hasRewrite && (
          <>
            <p className="mb-3 text-sm leading-relaxed text-amber-900">
              노란 밑줄을 클릭하면 교정됩니다. 확실하지 않으면 적용하지 마세요.
            </p>
            {corrections.length > 0 && (
              <p className="mb-3 text-xs text-amber-800">
                {corrections.length}건 제안
                {summary.오타 > 0 && ` · 오타 ${summary.오타}`}
                {summary.맞춤법 > 0 && ` · 맞춤법 ${summary.맞춤법}`}
                {summary.문법 > 0 && ` · 문법 ${summary.문법}`}
                {summary.문장 > 0 && ` · 문장 ${summary.문장}`}
                {summary.띄어쓰기 > 0 && ` · 띄어쓰기 ${summary.띄어쓰기}`}
              </p>
            )}
            <button
              type="button"
              onClick={onApplyAll}
              className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
            >
              한 번에 모두 적용
            </button>
          </>
        )}

        {!loading && !hasRewrite && (
          <p className="text-sm text-amber-800">
            고칠 부분을 찾지 못았습니다.
            {scannedLength > 0 && (
              <span className="block text-xs text-amber-600">
                {scannedLength.toLocaleString()}자 검사 완료
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
