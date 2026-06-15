"use client";

import { useEffect, useState } from "react";
import type { ReaderTocEntry } from "@/lib/reader/buildBookScrollDocument";
import { READER_SCROLL_DOC_VERSION } from "@/lib/reader/scrollDocVersion";

export function scrollUrlFromEpubUrl(epubUrl: string) {
  return epubUrl.replace(/\/epub\/?$/, "/scroll");
}

type ScrollPayload = {
  bodyHtml: string;
  toc: ReaderTocEntry[];
};

export function useReaderScrollContent(
  scrollUrl: string | null,
  coverKey?: string | null,
) {
  const [content, setContent] = useState<ScrollPayload | null>(null);
  const [loading, setLoading] = useState(Boolean(scrollUrl));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scrollUrl) {
      setContent(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setContent(null);

    const base = scrollUrl.startsWith("http")
      ? scrollUrl
      : `${window.location.origin}${scrollUrl}`;
    const coverParam = encodeURIComponent(coverKey ?? "");
    const absolute = `${base}${base.includes("?") ? "&" : "?"}v=${READER_SCROLL_DOC_VERSION}&cover=${coverParam}`;

    fetch(absolute, { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string" ? data.error : "본문을 불러올 수 없습니다.",
          );
        }
        return data as ScrollPayload;
      })
      .then((payload) => {
        if (!cancelled) setContent(payload);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || "본문을 불러올 수 없습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scrollUrl, coverKey]);

  return { content, loading, error };
}
