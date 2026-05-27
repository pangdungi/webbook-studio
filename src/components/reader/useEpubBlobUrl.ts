"use client";

import { useEffect, useState } from "react";

/** EPUB 바이너리를 fetch한 뒤 epub.js에 ArrayBuffer로 전달 (blob URL은 확장자 없어 directory로 오인됨) */
export function useEpubBlobUrl(epubUrl: string) {
  const [epubData, setEpubData] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!epubUrl) {
      setLoading(false);
      setEpubData(null);
      setError(null);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);
    setEpubData(null);

    const absolute = epubUrl.startsWith("http")
      ? epubUrl
      : `${window.location.origin}${epubUrl}`;

    fetch(absolute, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 401
              ? "EPUB 접근 권한이 없습니다."
              : res.status === 403
                ? "유효하지 않거나 만료된 링크입니다."
              : res.status === 404
                ? "출판된 EPUB을 찾을 수 없습니다."
                : `EPUB 불러오기 실패 (${res.status})`,
          );
        }
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (!cancelled) setEpubData(buffer);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || "EPUB을 불러올 수 없습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [epubUrl]);

  return { epubData, loading, error };
}
