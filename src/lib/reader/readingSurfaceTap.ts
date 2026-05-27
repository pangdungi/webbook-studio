const TAP_MAX_MS = 500;
/** 스크롤 제스처와 구분 — 세로 스크롤 중 메뉴 토글 방지 */
const TAP_MAX_MOVE_PX = 14;

const cleanups = new WeakMap<object, () => void>();

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return !!target.closest(
    "a, button, input, textarea, select, label, .reader-edge-nav",
  );
}

/** 스크롤·스와이프와 구분되는 탭 — EPUB iframe·모바일 touch 대응 */
export function attachReadingSurfaceTap(
  root: Document | HTMLElement,
  onTap: () => void,
): () => void {
  const key: object = root instanceof Document ? root : root;
  cleanups.get(key)?.();

  const target: HTMLElement | null =
    root instanceof Document ? root.body : root;
  if (!target) return () => {};

  let start: { x: number; y: number; t: number } | null = null;
  let didMove = false;
  let lastFiredAt = 0;
  let tapHandled = false;

  const reset = () => {
    start = null;
    didMove = false;
    tapHandled = false;
  };

  const fire = () => {
    if (tapHandled) return;
    const now = Date.now();
    if (now - lastFiredAt < 280) return;
    tapHandled = true;
    lastFiredAt = now;
    onTap();
  };

  const recordStart = (x: number, y: number) => {
    start = { x, y, t: Date.now() };
    didMove = false;
    tapHandled = false;
  };

  const recordMove = (x: number, y: number) => {
    if (!start) return;
    if (
      Math.abs(x - start.x) > TAP_MAX_MOVE_PX ||
      Math.abs(y - start.y) > TAP_MAX_MOVE_PX
    ) {
      didMove = true;
    }
  };

  const tryFireTap = (targetEl: EventTarget | null) => {
    if (!start || didMove || isInteractiveTarget(targetEl)) {
      reset();
      return;
    }
    const dt = Date.now() - start.t;
    reset();
    if (dt > TAP_MAX_MS) return;
    fire();
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || isInteractiveTarget(e.target)) return;
    recordStart(e.clientX, e.clientY);
  };

  const onPointerMove = (e: PointerEvent) => {
    recordMove(e.clientX, e.clientY);
  };

  const onPointerUp = (e: PointerEvent) => {
    tryFireTap(e.target);
  };

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1 || isInteractiveTarget(e.target)) return;
    const t = e.touches[0];
    recordStart(t.clientX, t.clientY);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    recordMove(t.clientX, t.clientY);
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (e.changedTouches.length !== 1) {
      reset();
      return;
    }
    tryFireTap(e.target);
  };

  const onClick = (e: MouseEvent) => {
    if (isInteractiveTarget(e.target)) return;
    if (didMove || tapHandled) {
      reset();
      return;
    }
    if (!start) return;
    tryFireTap(e.target);
  };

  const opts = { capture: true, passive: true } as const;
  const optsActive = { capture: true } as const;

  target.addEventListener("pointerdown", onPointerDown, opts);
  target.addEventListener("pointermove", onPointerMove, opts);
  target.addEventListener("pointerup", onPointerUp, optsActive);
  target.addEventListener("pointercancel", reset, opts);
  target.addEventListener("touchstart", onTouchStart, opts);
  target.addEventListener("touchmove", onTouchMove, opts);
  target.addEventListener("touchend", onTouchEnd, optsActive);
  target.addEventListener("touchcancel", reset, opts);
  target.addEventListener("click", onClick, optsActive);

  const cleanup = () => {
    target.removeEventListener("pointerdown", onPointerDown, opts);
    target.removeEventListener("pointermove", onPointerMove, opts);
    target.removeEventListener("pointerup", onPointerUp, optsActive);
    target.removeEventListener("pointercancel", reset, opts);
    target.removeEventListener("touchstart", onTouchStart, opts);
    target.removeEventListener("touchmove", onTouchMove, opts);
    target.removeEventListener("touchend", onTouchEnd, optsActive);
    target.removeEventListener("touchcancel", reset, opts);
    target.removeEventListener("click", onClick, optsActive);
    reset();
  };

  cleanups.set(key, cleanup);
  return cleanup;
}

export function bindReadingSurfaceTapInRoot(
  root: HTMLElement,
  onTap: () => void,
): () => void {
  const cleanupsList: (() => void)[] = [];
  let debounce: ReturnType<typeof setTimeout> | null = null;

  const bindAll = () => {
    cleanupsList.forEach((fn) => fn());
    cleanupsList.length = 0;
    cleanupsList.push(attachReadingSurfaceTap(root, onTap));
    root.querySelectorAll("iframe").forEach((iframe) => {
      if (!(iframe instanceof HTMLIFrameElement)) return;
      const tryBind = () => {
        const doc = iframe.contentDocument;
        if (doc?.body) cleanupsList.push(attachReadingSurfaceTap(doc, onTap));
      };
      tryBind();
      if (!iframe.contentDocument?.body) {
        iframe.addEventListener("load", tryBind, { once: true });
      }
    });
  };

  const scheduleBind = () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      bindAll();
      debounce = null;
    }, 80);
  };

  bindAll();
  const observer = new MutationObserver(scheduleBind);
  observer.observe(root, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    if (debounce) clearTimeout(debounce);
    cleanupsList.forEach((fn) => fn());
    cleanupsList.length = 0;
  };
}
