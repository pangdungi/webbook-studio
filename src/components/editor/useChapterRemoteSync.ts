"use client";

import { useEffect, type RefObject } from "react";
import { serverChapterIsNewer } from "@/lib/editor/chapterSave";

type ChapterStamp = { id: string; updated_at: string };

type Options = {
  bookId: string;
  enabled: boolean;
  dirtyChapterIdsRef: RefObject<Set<string>>;
  chapterBaselineRef: RefObject<Record<string, string>>;
  onStaleDetected: (chapterIds: string[]) => void;
};

async function fetchChapterStamps(bookId: string): Promise<ChapterStamp[]> {
  const res = await fetch(`/api/books/${bookId}/chapters?sync=1`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json().catch(() => ({}))) as {
    chapters?: ChapterStamp[];
  };
  return Array.isArray(data.chapters) ? data.chapters : [];
}

/** 탭·로컬/배포 전환 후 서버가 더 최신이면 저장 전에 차단 */
export function useChapterRemoteSync({
  bookId,
  enabled,
  dirtyChapterIdsRef,
  chapterBaselineRef,
  onStaleDetected,
}: Options) {
  useEffect(() => {
    if (!enabled) return;

    const check = async () => {
      const stamps = await fetchChapterStamps(bookId);
      const dirty = dirtyChapterIdsRef.current;
      const baseline = chapterBaselineRef.current;
      const stale: string[] = [];

      for (const row of stamps) {
        const base = baseline[row.id];
        if (!base) continue;
        if (!dirty?.has(row.id)) continue;
        if (serverChapterIsNewer(row.updated_at, base)) {
          stale.push(row.id);
        }
      }

      if (stale.length > 0) onStaleDetected(stale);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    void check();

    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [
    bookId,
    enabled,
    dirtyChapterIdsRef,
    chapterBaselineRef,
    onStaleDetected,
  ]);
}
