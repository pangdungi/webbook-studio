"use client";

import { useEffect, useState } from "react";
import type { WritingMode } from "@/lib/types/database";

type PreviewData = {
  title: string;
  writingMode: WritingMode;
  readerUrl: string | null;
};

type Props = {
  bookId: string;
  open: boolean;
  onClose: () => void;
};

export function DevicePreviewModal({ bookId, open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setError("");
    setPreview(null);
    setCopied(false);

    fetch(`/api/preview/${bookId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (!data.readerUrl) {
          setError("독자 링크를 만들 수 없습니다. 출판 후 다시 시도해 주세요.");
        } else {
          setPreview({
            title: data.title,
            writingMode: data.writingMode,
            readerUrl: data.readerUrl,
          });
        }
      })
      .catch(() => setError("미리보기를 불러올 수 없습니다."))
      .finally(() => setLoading(false));
  }, [bookId, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const readerUrl = preview?.readerUrl ?? "";

  const copyLink = async () => {
    if (!readerUrl) return;
    try {
      await navigator.clipboard.writeText(readerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-900">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-stone-700 px-4 py-3 text-white">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">독자 화면 미리보기</h2>
          <p className="truncate text-xs text-stone-400">
            {readerUrl || "독자가 브라우저에서 여는 주소와 동일합니다"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {readerUrl && (
            <>
              <button
                type="button"
                onClick={copyLink}
                className="rounded-lg border border-stone-600 px-3 py-1.5 text-xs text-stone-200 hover:bg-stone-800"
              >
                {copied ? "복사됨" : "링크 복사"}
              </button>
              <a
                href={readerUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-stone-600 px-3 py-1.5 text-xs text-stone-200 hover:bg-stone-800"
              >
                새 탭에서 열기
              </a>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-stone-700 px-3 py-1.5 text-xs font-medium hover:bg-stone-600"
          >
            닫기
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-white">
        {loading && (
          <div className="flex h-full items-center justify-center bg-stone-900">
            <p className="text-sm text-stone-300">독자 페이지 불러오는 중…</p>
          </div>
        )}
        {error && (
          <div className="flex h-full items-center justify-center bg-stone-900 p-6">
            <p className="max-w-md rounded-xl bg-red-950/50 px-4 py-3 text-center text-sm text-red-200">
              {error}
            </p>
          </div>
        )}
        {!loading && !error && preview?.readerUrl && (
          <iframe
            key={preview.readerUrl}
            src={preview.readerUrl}
            title={preview.title}
            className="h-full w-full border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
}
