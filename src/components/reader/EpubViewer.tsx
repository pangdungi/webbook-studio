"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Book, NavItem, Rendition } from "epubjs";
import type { WritingMode } from "@/lib/types/database";
import { injectBookFonts, readerInjectCss, readerThemeStyles } from "@/lib/typography/bookStyles";
import { schedulePaginatedImageFix, getRenditionColumnWidth } from "@/lib/typography/imageLayout";

export type ReaderViewMode = "scroll" | "paginated";

type Props = {
  data: ArrayBuffer;
  viewMode: ReaderViewMode;
  writingMode: WritingMode;
  onLocationChange?: (cfi: string) => void;
  onTocReady?: (toc: NavItem[]) => void;
  onRendition?: (rendition: Rendition) => void;
};

type ContainerSize = { width: number; height: number };

const SIZE_SETTLE_MS = 100;
const HEIGHT_REMOUNT_DELTA = 40;

function firstChapterHref(book: Book): string | undefined {
  let href: string | undefined;
  book.spine.each((item: { href: string }) => {
    if (!href && !/toc\.xhtml/i.test(item.href)) {
      href = item.href;
    }
  });
  return href;
}

function applyPaginatedContainerStyles(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>(".epub-container").forEach((el) => {
    el.style.height = "100%";
    el.style.width = "100%";
    el.style.maxWidth = "100%";
    el.style.overflow = "hidden";
    el.style.overflowX = "hidden";
    el.style.overflowY = "hidden";
  });
}

function applyScrollContainerStyles(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>(".epub-container").forEach((el) => {
    el.style.height = "100%";
    el.style.maxHeight = "100%";
    el.style.overflowY = "auto";
    el.style.overflowX = "hidden";
    el.style.setProperty("-webkit-overflow-scrolling", "touch");
    el.style.overscrollBehavior = "contain";
  });
}

type ContinuousManager = { fill?: () => Promise<unknown> };

/** scrolled-continuous: 첫 display 직후 fill()이 끝까지 안 돌아 스크롤 높이가 안 잡히는 경우 보정 */
async function ensureContinuousFill(
  rendition: Rendition,
  root: HTMLElement,
  fit: () => void,
  isCancelled: () => boolean,
) {
  const manager = (rendition as unknown as { manager?: ContinuousManager }).manager;
  if (typeof manager?.fill !== "function") return;

  const isScrollable = () => {
    const scroller = root.querySelector<HTMLElement>(".epub-container");
    if (!scroller || scroller.clientHeight <= 0) return false;
    return scroller.scrollHeight > scroller.clientHeight + 2;
  };

  for (let attempt = 0; attempt < 8; attempt++) {
    if (isCancelled()) return;
    try {
      await manager.fill();
    } catch {
      /* fill may reject while views are still rendering */
    }
    applyScrollContainerStyles(root);
    fit();
    if (isScrollable()) return;
    await new Promise((r) => setTimeout(r, 60 + attempt * 80));
  }
}


export function EpubViewer({
  data,
  viewMode,
  writingMode,
  onLocationChange,
  onTocReady,
  onRendition,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const savedCfiRef = useRef<string | null>(null);
  const viewModeRef = useRef(viewMode);
  const readyRef = useRef(false);
  const onLocationChangeRef = useRef(onLocationChange);
  const onTocReadyRef = useRef(onTocReady);
  const onRenditionRef = useRef(onRendition);
  viewModeRef.current = viewMode;
  onLocationChangeRef.current = onLocationChange;
  onTocReadyRef.current = onTocReady;
  onRenditionRef.current = onRendition;

  const [mountSize, setMountSize] = useState<ContainerSize | null>(null);
  const [mountSession, setMountSession] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const measuredSizeRef = useRef<ContainerSize | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fitToContainer = useCallback(() => {
    const el = containerRef.current;
    if (!el || !renditionRef.current) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w > 0 && h > 0) {
      renditionRef.current.resize(w, h);
      if (viewModeRef.current === "scroll") {
        applyScrollContainerStyles(el);
      } else {
        applyPaginatedContainerStyles(el);
      }
    }
  }, []);

  /** data/viewMode 바뀔 때 마운트 세션 리셋 */
  useEffect(() => {
    readyRef.current = false;
    setReady(false);
    setMountSize(null);
    measuredSizeRef.current = null;
    setMountSession((s) => s + 1);
  }, [data, viewMode]);

  /** 레이아웃 안정 후 크기 확정 (모바일 주소창·EPUB fetch 직후 높이 변동 대응) */
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const commitSize = () => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      if (width <= 0 || height <= 0) return;

      const next = { width, height };
      measuredSizeRef.current = next;

      setMountSize((prev) => {
        if (!prev) return next;
        if (readyRef.current) return prev;
        if (Math.abs(next.height - prev.height) >= HEIGHT_REMOUNT_DELTA) return next;
        if (Math.abs(next.width - prev.width) >= HEIGHT_REMOUNT_DELTA) return next;
        return prev;
      });
    };

    const scheduleCommit = () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      settleTimerRef.current = setTimeout(commitSize, SIZE_SETTLE_MS);
    };

    const measureNow = () => {
      commitSize();
      scheduleCommit();
    };

    measureNow();
    requestAnimationFrame(measureNow);

    const observer = new ResizeObserver(scheduleCommit);
    observer.observe(node);

    window.addEventListener("resize", scheduleCommit);
    window.addEventListener("orientationchange", measureNow);
    window.visualViewport?.addEventListener("resize", scheduleCommit);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleCommit);
      window.removeEventListener("orientationchange", measureNow);
      window.visualViewport?.removeEventListener("resize", scheduleCommit);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    };
  }, [mountSession]);

  useEffect(() => {
    if (!containerRef.current || !data || !mountSize) return;

    let cancelled = false;
    setReady(false);
    readyRef.current = false;
    setError(null);

    const mount = async () => {
      const ePub = (await import("epubjs")).default;
      if (cancelled || !containerRef.current) return;

      const node = containerRef.current;
      const width = node.clientWidth || mountSize.width;
      const height = node.clientHeight || mountSize.height;
      if (width <= 0 || height <= 0) return;

      renditionRef.current?.destroy();
      bookRef.current?.destroy();
      node.innerHTML = "";

      const book = ePub(data);
      bookRef.current = book;

      book.on("openFailed", () => {
        if (!cancelled) setError("EPUB을 열 수 없습니다.");
      });

      await book.ready;
      if (cancelled) {
        book.destroy();
        return;
      }

      const { toc } = await book.loaded.navigation;
      onTocReadyRef.current?.(toc);

      const flow = viewMode === "scroll" ? "scrolled" : "paginated";
      const manager = viewMode === "scroll" ? "continuous" : "default";

      const rendition = book.renderTo(node, {
        width,
        height,
        flow,
        manager,
        allowScriptedContent: false,
      });

      renditionRef.current = rendition;
      onRenditionRef.current?.(rendition);
      rendition.themes.default(readerThemeStyles);
      rendition.themes.fontSize("100%");

      rendition.hooks.content.register((contents: { document: Document }) => {
        const doc = contents.document;
        injectBookFonts(doc);
        if (viewMode === "paginated") {
          schedulePaginatedImageFix(doc, getRenditionColumnWidth(rendition));
        }
        if (doc.getElementById("webbook-reader-styles")) return;
        const style = doc.createElement("style");
        style.id = "webbook-reader-styles";
        style.textContent = readerInjectCss(writingMode, viewMode);
        doc.head.appendChild(style);
      });

      rendition.on("relocated", (location: { start: { cfi: string } }) => {
        savedCfiRef.current = location.start.cfi;
        onLocationChangeRef.current?.(location.start.cfi);
      });

      const applyModeStyles = () => {
        if (!containerRef.current) return;
        if (viewMode === "scroll") {
          applyScrollContainerStyles(containerRef.current);
        } else {
          applyPaginatedContainerStyles(containerRef.current);
        }
      };

      rendition.on("rendered", (_section: unknown, view: unknown) => {
        applyModeStyles();
        if (viewMode === "paginated") {
          const doc = (view as { contents?: { document?: Document } })?.contents
            ?.document;
          schedulePaginatedImageFix(doc, getRenditionColumnWidth(rendition));
        }
        if (viewMode === "scroll" && containerRef.current) {
          void ensureContinuousFill(
            rendition,
            containerRef.current,
            fitToContainer,
            () => cancelled,
          );
        }
      });

      const target = savedCfiRef.current ?? firstChapterHref(book) ?? toc[0]?.href;
      if (target) {
        await rendition.display(target);
      } else {
        await rendition.display();
      }

      if (viewMode === "scroll" && containerRef.current) {
        await ensureContinuousFill(
          rendition,
          containerRef.current,
          fitToContainer,
          () => cancelled,
        );
      }

      const reflow = () => fitToContainer();
      reflow();
      requestAnimationFrame(reflow);
      [50, 150, 350, 600].forEach((ms) => setTimeout(reflow, ms));

      if (!cancelled) {
        readyRef.current = true;
        setReady(true);
      }
    };

    mount().catch(() => {
      if (!cancelled) setError("책을 표시할 수 없습니다.");
    });

    return () => {
      cancelled = true;
      readyRef.current = false;
      renditionRef.current?.destroy();
      bookRef.current?.destroy();
      renditionRef.current = null;
      bookRef.current = null;
    };
  }, [data, viewMode, writingMode, mountSize, mountSession, fitToContainer]);

  useEffect(() => {
    if (!ready) return;
    const node = containerRef.current;
    if (!node) return;

    const onResize = () => {
      fitToContainer();
      if (viewMode === "paginated" && renditionRef.current) {
        const iframe = node.querySelector<HTMLIFrameElement>(".epub-view iframe");
        const doc = iframe?.contentDocument;
        if (doc) {
          schedulePaginatedImageFix(doc, getRenditionColumnWidth(renditionRef.current));
        }
      }
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(node);
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, [ready, fitToContainer, viewMode]);

  return (
    <div className="relative h-full min-h-0 w-full">
      {!ready && !error && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-stone-50 text-sm text-stone-500">
          책을 여는 중…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4 text-center text-sm text-red-600">
          {error}
        </div>
      )}
      <div
        ref={containerRef}
        data-mode={viewMode}
        className="epub-viewer-root h-full min-h-0 w-full min-w-0"
      />
    </div>
  );
}
