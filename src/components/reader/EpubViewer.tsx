"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Book, NavItem, Rendition } from "epubjs";
import type { WritingMode } from "@/lib/types/database";
import {
  DEFAULT_BOOK_HEADING_FONTS,
  normalizeBookHeadingFonts,
  type BookHeadingFonts,
} from "@/lib/typography/headingFonts";
import { injectBookFonts, readerInjectCss } from "@/lib/typography/bookStyles";
import {
  syncBookPageMetrics,
  syncReaderViewportVars,
  bookPageShellClass,
  type ReaderPageLayoutMode,
} from "@/lib/pages/bookPageCss";
import { schedulePaginatedImageFix, getRenditionColumnWidth } from "@/lib/typography/imageLayout";
import { attachReaderContentProtection } from "@/lib/reader/contentProtection";
import {
  attachReadingSurfaceTap,
  bindReadingSurfaceTapInRoot,
} from "@/lib/reader/readingSurfaceTap";
import {
  applyReaderScrollLayout,
  expandContinuousScrollIframes,
} from "@/lib/reader/scrollLayout";

import type { ReaderViewMode } from "@/lib/reader/viewMode";

type Props = {
  data: ArrayBuffer;
  viewMode: ReaderViewMode;
  writingMode: WritingMode;
  headingFonts?: BookHeadingFonts;
  fontSizePercent?: string;
  protectContent?: boolean;
  onLocationChange?: (cfi: string) => void;
  onTocReady?: (toc: NavItem[]) => void;
  onRendition?: (rendition: Rendition) => void;
  /** 본문 탭 — 읽기 메뉴 토글 */
  onReadingAreaTap?: () => void;
};

type ContainerSize = { width: number; height: number };

const SIZE_SETTLE_MS = 100;
const HEIGHT_REMOUNT_DELTA = 40;

/** spine 첫 본문(표지·1장) — toc.xhtml 제외 */
function firstSpineContentHref(book: Book): string | undefined {
  let href: string | undefined;
  book.spine.each((item: { href: string; linear?: string }) => {
    if (href) return;
    if (/toc\.xhtml/i.test(item.href)) return;
    if (item.linear === "no") return;
    href = item.href;
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

type ContinuousManager = { fill?: () => Promise<unknown> };

/** scrolled-continuous: 첫 display 직후 fill()이 끝까지 안 돌아 스크롤 높이가 안 잡히는 경우 보정 */
async function ensureContinuousFill(
  rendition: Rendition,
  root: HTMLElement,
  isCancelled: () => boolean,
) {
  const manager = (rendition as unknown as { manager?: ContinuousManager }).manager;
  if (typeof manager?.fill !== "function") return;

  const isScrollable = () => {
    const scroller = root.querySelector<HTMLElement>(".epub-container");
    if (!scroller || scroller.clientHeight <= 0) return false;
    return scroller.scrollHeight > scroller.clientHeight + 2;
  };

  for (let attempt = 0; attempt < 6; attempt++) {
    if (isCancelled()) return;
    try {
      await manager.fill();
    } catch {
      /* fill may reject while views are still rendering */
    }
    applyReaderScrollLayout(root);
    if (isScrollable()) return;
    await new Promise((r) => setTimeout(r, 80 + attempt * 100));
  }
  applyReaderScrollLayout(root);
}


export function EpubViewer({
  data,
  viewMode,
  writingMode,
  headingFonts = DEFAULT_BOOK_HEADING_FONTS,
  fontSizePercent = "100%",
  protectContent = false,
  onLocationChange,
  onTocReady,
  onRendition,
  onReadingAreaTap,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const savedCfiRef = useRef<string | null>(null);
  const viewModeRef = useRef(viewMode);
  const headingFontsRef = useRef(headingFonts);
  const fontSizePercentRef = useRef(fontSizePercent);
  const protectContentRef = useRef(protectContent);
  const readyRef = useRef(false);
  const onLocationChangeRef = useRef(onLocationChange);
  const onTocReadyRef = useRef(onTocReady);
  const onRenditionRef = useRef(onRendition);
  const onReadingAreaTapRef = useRef(onReadingAreaTap);
  viewModeRef.current = viewMode;
  headingFontsRef.current = normalizeBookHeadingFonts(headingFonts);
  fontSizePercentRef.current = fontSizePercent;
  protectContentRef.current = protectContent;
  onLocationChangeRef.current = onLocationChange;
  onTocReadyRef.current = onTocReady;
  onRenditionRef.current = onRendition;
  onReadingAreaTapRef.current = onReadingAreaTap;

  const [mountSize, setMountSize] = useState<ContainerSize | null>(null);
  const [mountSession, setMountSession] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const measuredSizeRef = useRef<ContainerSize | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFitSizeRef = useRef<ContainerSize>({ width: 0, height: 0 });
  const resizeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fitToContainer = useCallback(() => {
    const el = containerRef.current;
    if (!el || !renditionRef.current) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w <= 0 || h <= 0) return;

    const last = lastFitSizeRef.current;
    const sizeChanged =
      Math.abs(w - last.width) >= 3 || Math.abs(h - last.height) >= 3;
    if (!sizeChanged && readyRef.current) {
      if (viewModeRef.current === "scroll") {
        applyReaderScrollLayout(el);
      }
      return;
    }
    lastFitSizeRef.current = { width: w, height: h };

    renditionRef.current.resize(w, h);
    if (viewModeRef.current === "scroll") {
      applyReaderScrollLayout(el);
    } else {
      applyPaginatedContainerStyles(el);
    }
  }, []);

  const getReaderViewport = useCallback((): { width: number; height: number } => {
    const root = containerRef.current;
    if (!root) return { width: 0, height: 0 };
    return { width: root.clientWidth, height: root.clientHeight };
  }, []);

  const syncPageMetrics = useCallback(
    (doc: Document | null | undefined, mode: ReaderPageLayoutMode = viewModeRef.current) => {
      if (!doc) return;
      const { width, height } = getReaderViewport();
      syncReaderViewportVars(doc, width, height);
      doc.querySelectorAll<HTMLElement>(`.${bookPageShellClass}`).forEach((shell) => {
        syncBookPageMetrics(shell, { mode });
        if (shell.dataset.wbsMetricsObserved) return;
        shell.dataset.wbsMetricsObserved = "1";
        const ro = new ResizeObserver(() => {
          const vp = getReaderViewport();
          syncReaderViewportVars(doc, vp.width, vp.height);
          syncBookPageMetrics(shell, { mode: viewModeRef.current });
          if (viewModeRef.current === "scroll" && containerRef.current) {
            expandContinuousScrollIframes(containerRef.current);
          }
        });
        ro.observe(shell);
      });
    },
    [getReaderViewport],
  );

  /** data/viewMode/headingFonts 바뀔 때 마운트 세션 리셋 */
  useEffect(() => {
    readyRef.current = false;
    setReady(false);
    setMountSize(null);
    measuredSizeRef.current = null;
    setMountSession((s) => s + 1);
  }, [data, viewMode, headingFonts, fontSizePercent]);

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
        spread: "none",
        allowScriptedContent: false,
      });

      renditionRef.current = rendition;
      onRenditionRef.current?.(rendition);
      rendition.themes.fontSize(fontSizePercentRef.current);

      rendition.hooks.content.register((contents: { document: Document }) => {
        const doc = contents.document;
        const fonts = headingFontsRef.current;
        injectBookFonts(doc, fonts);
        syncPageMetrics(doc, viewMode);
        let style = doc.getElementById("webbook-reader-styles");
        if (!style) {
          style = doc.createElement("style");
          style.id = "webbook-reader-styles";
          doc.head.appendChild(style);
        }
        style.textContent = readerInjectCss(
          writingMode,
          viewMode,
          fonts,
          protectContentRef.current,
        );
        if (protectContentRef.current) {
          attachReaderContentProtection(doc);
        }
        attachReadingSurfaceTap(doc, () => onReadingAreaTapRef.current?.());
        if (viewMode === "paginated") {
          schedulePaginatedImageFix(doc, getRenditionColumnWidth(rendition));
        }
      });

      rendition.on("relocated", (location: { start: { cfi: string } }) => {
        savedCfiRef.current = location.start.cfi;
        onLocationChangeRef.current?.(location.start.cfi);
      });

      const applyModeStyles = () => {
        if (!containerRef.current) return;
        if (viewMode === "scroll") {
          applyReaderScrollLayout(containerRef.current);
        } else {
          applyPaginatedContainerStyles(containerRef.current);
        }
      };

      rendition.on("rendered", (_section: unknown, view: unknown) => {
        applyModeStyles();
        const doc = (view as { contents?: { document?: Document } })?.contents
          ?.document;
        if (doc) {
          attachReadingSurfaceTap(doc, () => onReadingAreaTapRef.current?.());
        }
        syncPageMetrics(doc, viewMode);
        if (viewMode === "paginated") {
          schedulePaginatedImageFix(doc, getRenditionColumnWidth(rendition));
        }
        if (viewMode === "scroll" && containerRef.current) {
          requestAnimationFrame(() => {
            if (containerRef.current) applyReaderScrollLayout(containerRef.current);
          });
        }
      });

      const target =
        savedCfiRef.current ?? firstSpineContentHref(book) ?? toc[0]?.href;
      if (target) {
        await rendition.display(target);
      } else {
        await rendition.display();
      }

      if (viewMode === "scroll" && containerRef.current) {
        await ensureContinuousFill(rendition, containerRef.current, () => cancelled);
      }

      const reflow = () => fitToContainer();
      reflow();
      requestAnimationFrame(reflow);
      setTimeout(reflow, 200);

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
  }, [data, viewMode, writingMode, protectContent, mountSize, mountSession, fitToContainer, syncPageMetrics]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || !ready) return;
    return bindReadingSurfaceTapInRoot(node, () => onReadingAreaTapRef.current?.());
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const node = containerRef.current;
    if (!node) return;

    const onResize = () => {
      if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current);
      resizeDebounceRef.current = setTimeout(() => {
        resizeDebounceRef.current = null;
        fitToContainer();
        if (!containerRef.current) return;
        if (viewMode === "scroll") {
          expandContinuousScrollIframes(containerRef.current);
        }
        containerRef.current
          .querySelectorAll<HTMLIFrameElement>("iframe")
          .forEach((iframe) => {
            const iframeDoc = iframe.contentDocument;
            if (iframeDoc) syncPageMetrics(iframeDoc, viewMode);
          });
        if (viewMode === "paginated" && renditionRef.current) {
          const iframe = node.querySelector<HTMLIFrameElement>(".epub-view iframe");
          const doc = iframe?.contentDocument;
          if (doc) {
            schedulePaginatedImageFix(doc, getRenditionColumnWidth(renditionRef.current));
          }
        }
      }, 120);
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(node);
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current);
    };
  }, [ready, fitToContainer, viewMode, syncPageMetrics]);

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
