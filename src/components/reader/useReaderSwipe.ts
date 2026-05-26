"use client";

import { useEffect, useRef } from "react";

const SWIPE_MIN_PX = 48;
const SWIPE_MAX_MS = 600;

/** 페이지 모드: 왼쪽 스와이프 → 다음, 오른쪽 스와이프 → 이전 */
export function useReaderSwipe(
  enabled: boolean,
  onPrev: () => void,
  onNext: () => void,
  targetRef: React.RefObject<HTMLElement | null>,
) {
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const onPrevRef = useRef(onPrev);
  const onNextRef = useRef(onNext);
  onPrevRef.current = onPrev;
  onNextRef.current = onNext;

  useEffect(() => {
    if (!enabled) return;
    const el = targetRef.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      startRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    };

    const onEnd = (e: TouchEvent) => {
      const start = startRef.current;
      startRef.current = null;
      if (!start || e.changedTouches.length !== 1) return;

      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const dt = Date.now() - start.t;

      if (dt > SWIPE_MAX_MS) return;
      if (Math.abs(dx) < SWIPE_MIN_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.2) return;

      if (dx < 0) onNextRef.current();
      else onPrevRef.current();
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  }, [enabled, targetRef]);
}
