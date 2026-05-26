"use client";

import type { SpellCorrection } from "@/lib/types/database";
import { summarizeCorrections } from "@/lib/spellcheck/localRules";

type Props = {
  corrections: SpellCorrection[];
  correctedText: string;
  originalText: string;
  error?: string | null;
  provider?: string | null;
  onApplyAll: () => void;
  onApplyOne: (correction: SpellCorrection) => void;
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
  onApplyOne,
  onClose,
  loading,
  scannedLength = 0,
}: Props) {
  const summary = summarizeCorrections(corrections);
  const hasRewrite = correctedText.trim() !== originalText.trim();

  return (
    <div className="absolute right-4 top-16 z-20 w-80 max-h-[60vh] overflow-auto rounded-xl border border-amber-200 bg-amber-50 shadow-lg">
      <div className="sticky top-0 flex items-center justify-between border-b border-amber-200 bg-amber-50 px-4 py-3">
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
        {loading && (
          <p className="text-sm text-amber-800">
            Claude로 전체 글 검사 중…
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

        {!loading && provider && (
          <p className="mb-2 text-xs text-amber-700">
            {provider === "anthropic"
              ? "Claude Sonnet으로 검사했습니다."
              : provider === "openai"
                ? "OpenAI로 검사했습니다."
                : "로컬 규칙으로 검사했습니다."}
          </p>
        )}

        {!loading && !hasRewrite && (
          <p className="text-sm text-amber-800">
            수정할 항목이 없습니다.
            {scannedLength > 0 && (
              <span className="block text-xs text-amber-600">
                {scannedLength.toLocaleString()}자 검사 완료
              </span>
            )}
          </p>
        )}

        {!loading && hasRewrite && (
          <>
            <button
              type="button"
              onClick={onApplyAll}
              className="mb-3 w-full rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              교정본 적용
            </button>
            {corrections.length > 0 && (
              <p className="mb-2 text-xs text-amber-800">
                변경 {corrections.length}건
                {summary.맞춤법 > 0 && ` · 맞춤법 ${summary.맞춤법}`}
                {summary.띄어쓰기 > 0 && ` · 띄어쓰기 ${summary.띄어쓰기}`}
                {summary.오탈자 > 0 && ` · 오탈자 ${summary.오탈자}`}
                {summary.문장부호 > 0 && ` · 문장부호 ${summary.문장부호}`}
              </p>
            )}
          </>
        )}

        {!loading && corrections.length > 0 && (
          <>
            <ul className="space-y-2">
              {corrections.map((c, i) => (
                <li
                  key={`${c.offset}-${i}`}
                  className="rounded-lg border border-amber-200 bg-white p-3 text-sm"
                >
                  <p>
                    <span className="line-through text-red-600">{c.from}</span>
                    {" → "}
                    <span className="font-medium text-green-700">{c.to}</span>
                  </p>
                  <p className="mt-1 text-xs text-stone-500">{c.reason}</p>
                  <button
                    type="button"
                    onClick={() => onApplyOne(c)}
                    className="mt-2 text-xs font-medium text-amber-700 hover:underline"
                  >
                    적용
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {!loading && correctedText && (
          <details className="mt-4" open={corrections.length === 0}>
            <summary className="cursor-pointer text-xs text-amber-800">
              교정 미리보기
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-xs text-stone-700">
              {correctedText}
            </p>
          </details>
        )}
      </div>
    </div>
  );
}
