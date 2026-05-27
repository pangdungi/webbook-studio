import type { ReaderViewMode } from "@/lib/reader/viewMode";

export type ReaderReadingProgress = {
  viewMode: ReaderViewMode;
  /** 편집 페이지 앵커 (분할 슬라이드는 `-r1` 제거한 id) */
  anchorId: string;
  /** 페이지 모드 — 실제 슬라이드 id */
  slideId?: string;
  slideIndex?: number;
  /** 스크롤 모드 — 앵커 상단 기준 추가 오프셋(px) */
  scrollTop?: number;
  updatedAt: number;
};

function storageKey(progressKey: string) {
  return `wbs_reader_progress:${progressKey}`;
}

export function baseAnchorId(slideOrAnchorId: string): string {
  return slideOrAnchorId.replace(/-r\d+$/, "") || slideOrAnchorId;
}

export function loadReadingProgress(
  progressKey: string,
): ReaderReadingProgress | null {
  if (typeof window === "undefined" || !progressKey) return null;
  try {
    const raw = localStorage.getItem(storageKey(progressKey));
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<ReaderReadingProgress>;
    if (typeof data.anchorId !== "string" || !data.anchorId) return null;
    const viewMode = data.viewMode === "paginated" ? "paginated" : "scroll";
    return {
      viewMode,
      anchorId: data.anchorId,
      slideId: typeof data.slideId === "string" ? data.slideId : undefined,
      slideIndex:
        typeof data.slideIndex === "number" && Number.isFinite(data.slideIndex)
          ? data.slideIndex
          : undefined,
      scrollTop:
        typeof data.scrollTop === "number" && Number.isFinite(data.scrollTop)
          ? Math.max(0, Math.round(data.scrollTop))
          : undefined,
      updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

export function saveReadingProgress(
  progressKey: string,
  progress: Omit<ReaderReadingProgress, "updatedAt">,
) {
  if (typeof window === "undefined" || !progressKey) return;
  try {
    const payload: ReaderReadingProgress = {
      ...progress,
      anchorId: baseAnchorId(progress.anchorId),
      updatedAt: Date.now(),
    };
    localStorage.setItem(storageKey(progressKey), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function resolveSlideIndex(
  slides: { id: string }[],
  progress: ReaderReadingProgress,
): number {
  if (slides.length === 0) return 0;

  if (progress.slideId) {
    const byId = slides.findIndex((s) => s.id === progress.slideId);
    if (byId >= 0) return byId;
  }

  if (typeof progress.slideIndex === "number") {
    return Math.max(0, Math.min(progress.slideIndex, slides.length - 1));
  }

  const anchor = baseAnchorId(progress.anchorId);
  const exact = slides.findIndex((s) => s.id === anchor);
  if (exact >= 0) return exact;

  const split = slides.findIndex(
    (s) => s.id === progress.anchorId || s.id.startsWith(`${anchor}-r`),
  );
  if (split >= 0) return split;

  return 0;
}
