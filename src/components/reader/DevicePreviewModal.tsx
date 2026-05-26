"use client";

import { useEffect, useState } from "react";

type PreviewData = {
  title: string;
  previewUrl: string;
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
  const [cacheKey, setCacheKey] = useState(0);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setError("");
    setPreview(null);
    setCacheKey(Date.now());

    fetch(`/api/preview/${bookId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (!data.previewUrl) {
          setError("미리보기를 불러올 수 없습니다.");
        } else {
          setPreview({
            title: data.title,
            previewUrl: data.previewUrl,
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

  const iframeSrc = preview
    ? `${preview.previewUrl}?t=${cacheKey}`
    : "";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-900">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-stone-700 px-4 py-3 text-white">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">독자 화면 미리보기</h2>
          <p className="text-xs text-stone-400">
            지금 저장된 내용 기준 · 출판하면 이렇게 보입니다
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {iframeSrc && (
            <a
              href={iframeSrc}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-stone-600 px-3 py-1.5 text-xs text-stone-200 hover:bg-stone-800"
            >
              새 탭에서 열기
            </a>
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
            <p className="text-sm text-stone-300">미리보기 만드는 중…</p>
          </div>
        )}
        {error && (
          <div className="flex h-full items-center justify-center bg-stone-900 p-6">
            <p className="max-w-md rounded-xl bg-red-950/50 px-4 py-3 text-center text-sm text-red-200">
              {error}
            </p>
          </div>
        )}
        {!loading && !error && iframeSrc && (
          <iframe
            key={iframeSrc}
            src={iframeSrc}
            title={preview?.title ?? "미리보기"}
            className="h-full w-full border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
}
