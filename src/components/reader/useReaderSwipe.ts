"use client";

import { useEffect, useRef } from "react";

const SWIPE_MIN_PX = 48;
const SWIPE_MAX_MS = 600;
const WHEEL_ACCUM_THRESHOLD = 72;
const WHEEL_TURN_COOLDOWN_MS = 420;

/** 페이지 모드: 스와이프·트랙패드 가로 스크롤·드래그 → 이전/다음 */
export function useReaderSwipe(
  enabled: boolean,
  onPrev: () => void,
  onNext: () => void,
  targetRef: React.RefObject<HTMLElement | null>,
) {
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const wheelAccumRef = useRef(0);
  const lastWheelTurnRef = useRef(0);
  const onPrevRef = useRef(onPrev);
  const onNextRef = useRef(onNext);
  onPrevRef.current = onPrev;
  onNextRef.current = onNext;

  useEffect(() => {
    if (!enabled) return;
    const el = targetRef.current;
    if (!el) return;

    const turnNext = () => {
      const now = Date.now();
      if (now - lastWheelTurnRef.current < WHEEL_TURN_COOLDOWN_MS) return;
      lastWheelTurnRef.current = now;
      onNextRef.current();
    };

    const turnPrev = () => {
      const now = Date.now();
      if (now - lastWheelTurnRef.current < WHEEL_TURN_COOLDOWN_MS) return;
      lastWheelTurnRef.current = now;
      onPrevRef.current();
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      startRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    };

    const onTouchEnd = (e: TouchEvent) => {
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

      if (dx < 0) turnNext();
      else turnPrev();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const start = pointerStartRef.current;
      pointerStartRef.current = null;
      if (!start) return;

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) < SWIPE_MIN_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.2) return;

      if (dx < 0) turnNext();
      else turnPrev();
    };

    const onPointerCancel = () => {
      pointerStartRef.current = null;
    };

    const onWheel = (e: WheelEvent) => {
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);

      if (absX < 8 && absY < 8) return;

      const horizontalIntent = absX > absY * 0.85;

      if (!horizontalIntent) return;

      e.preventDefault();
      wheelAccumRef.current += e.deltaX;

      if (Math.abs(wheelAccumRef.current) < WHEEL_ACCUM_THRESHOLD) return;

      if (wheelAccumRef.current > 0) turnNext();
      else turnPrev();
      wheelAccumRef.current = 0;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    el.addEventListener("pointerup", onPointerUp, { passive: true });
    el.addEventListener("pointercancel", onPointerCancel, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
      el.removeEventListener("wheel", onWheel);
      wheelAccumRef.current = 0;
      startRef.current = null;
      pointerStartRef.current = null;
    };
  }, [enabled, targetRef]);
}
