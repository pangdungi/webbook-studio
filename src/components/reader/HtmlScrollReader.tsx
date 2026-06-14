"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  forwardRef,
} from "react";
import type { WritingMode } from "@/lib/types/database";
import type { BookHeadingFonts } from "@/lib/typography/headingFonts";
import { DEFAULT_BOOK_HEADING_FONTS } from "@/lib/typography/headingFonts";
import type { ReaderTocEntry } from "@/lib/reader/buildBookScrollDocument";
import {
  READER_SLIDE_W_VAR,
  readerScrollSurfaceCss,
} from "@/lib/reader/readerScrollCss";
import type { ReaderViewMode } from "@/lib/reader/viewMode";
import {
  bookPageShellClass,
  syncBookPageMetrics,
  syncReaderViewportVars,
} from "@/lib/pages/bookPageCss";
import { attachReadingSurfaceTap } from "@/lib/reader/readingSurfaceTap";
import { useReaderSwipe } from "@/components/reader/useReaderSwipe";
import { paginateFlowPagesInSurface } from "@/lib/reader/paginateFlowPages";
import { applyScrollFullBleedLayout } from "@/lib/reader/readerScrollFullBleedCss";
import {
  baseAnchorId,
  loadReadingProgress,
  resolveSlideIndex,
  saveReadingProgress,
  type ReaderReadingProgress,
} from "@/lib/reader/readingProgress";

export type HtmlScrollReaderHandle = {
  goTo: (anchorId: string) => void;
  prev: () => void;
  next: () => void;
};

type Props = {
  bodyHtml: string;
  toc: ReaderTocEntry[];
  viewMode: ReaderViewMode;
  writingMode: WritingMode;
  headingFonts?: BookHeadingFonts;
  fontSizePercent?: string;
  protectContent?: boolean;
  /** localStorage 키 접미사 — 독자 token 또는 preview:bookId */
  progressStorageKey?: string;
  onTocReady?: (toc: ReaderTocEntry[]) => void;
  /** 본문 탭 — 메뉴 열기/닫기만 (스크롤·레이아웃 변경 없음) */
  onReadingAreaTap?: () => void;
  /** 상단 메뉴(크롬) 열림 — true일 때 스크롤·resize 무시 */
  menuOpen?: boolean;
};

function getSlides(surface: HTMLElement) {
  return Array.from(
    surface.querySelectorAll<HTMLElement>(".reader-scroll-anchor"),
  );
}

export const HtmlScrollReader = forwardRef<HtmlScrollReaderHandle, Props>(
  function HtmlScrollReader(
    {
      bodyHtml,
      toc,
      viewMode,
      writingMode,
      headingFonts = DEFAULT_BOOK_HEADING_FONTS,
      fontSizePercent = "100%",
      protectContent = false,
      progressStorageKey,
      onTocReady,
      onReadingAreaTap,
      menuOpen = false,
    },
    ref,
  ) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const surfaceRef = useRef<HTMLDivElement>(null);
    const pageIndexRef = useRef(0);
    const restoredOnceRef = useRef(false);
    const scrollLayoutReadyRef = useRef(false);
    const lastKnownScrollTopRef = useRef(0);
    const forceScrollRelayoutRef = useRef(true);
    const lastScrollLayoutWidthRef = useRef(0);
    const lastPaginatedWidthRef = useRef(0);
    /** 탭·주소창 resize 시 --wbs-reader-vh 변동 방지 (스플래시 높이 줄며 scroll 튐) */
    const lockedScrollVhRef = useRef(0);
    const menuOpenRef = useRef(menuOpen);
    const onReadingAreaTapRef = useRef(onReadingAreaTap);
    const saveProgressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    menuOpenRef.current = menuOpen;
    onReadingAreaTapRef.current = onReadingAreaTap;
    const sourceBodyHtmlRef = useRef(bodyHtml);
    sourceBodyHtmlRef.current = bodyHtml;
    const paginated = viewMode === "paginated";

    const scrollViewportHeight = useCallback(
      (viewport: HTMLElement, measuredH: number) => {
        if (lockedScrollVhRef.current > 0) return lockedScrollVhRef.current;
        return Math.max(measuredH, 1);
      },
      [],
    );

    const syncScrollViewportVars = useCallback(
      (
        viewport: HTMLElement,
        surface: HTMLElement,
        width: number,
        measuredH: number,
      ) => {
        const h = scrollViewportHeight(viewport, measuredH);
        const doc = surface.ownerDocument;
        if (doc) syncReaderViewportVars(doc.documentElement, width, h);
        syncReaderViewportVars(surface, width, h);
      },
      [scrollViewportHeight],
    );

    const pinScrollTop = useCallback((top: number) => {
      const viewport = viewportRef.current;
      if (!viewport || top < 0) return;
      viewport.scrollTop = top;
      lastKnownScrollTopRef.current = top;
      requestAnimationFrame(() => {
        viewport.scrollTop = top;
        requestAnimationFrame(() => {
          viewport.scrollTop = top;
          lastKnownScrollTopRef.current = viewport.scrollTop;
        });
      });
    }, []);

    const persistProgress = useCallback(() => {
      if (!progressStorageKey) return;
      if (!paginated && !scrollLayoutReadyRef.current) return;
      const viewport = viewportRef.current;
      const surface = surfaceRef.current;
      if (!viewport || !surface) return;

      let snapshot: Omit<ReaderReadingProgress, "updatedAt">;

      if (paginated) {
        const slides = getSlides(surface);
        const slide = slides[pageIndexRef.current];
        if (!slide?.id) return;
        snapshot = {
          viewMode,
          anchorId: baseAnchorId(slide.id),
          slideId: slide.id,
          slideIndex: pageIndexRef.current,
        };
      } else {
        const scrollTop = viewport.scrollTop;
        const slides = getSlides(surface);
        let anchorId = slides[0]?.id ?? "";
        let anchorTop = 0;
        for (const slide of slides) {
          const top = slide.offsetTop;
          if (top <= scrollTop + 32 && top >= anchorTop) {
            anchorTop = top;
            anchorId = slide.id;
          }
        }
        if (!anchorId) return;
        snapshot = {
          viewMode,
          anchorId: baseAnchorId(anchorId),
          scrollTop: Math.max(0, Math.round(scrollTop - anchorTop)),
          absoluteScrollTop: Math.max(0, Math.round(scrollTop)),
        };
      }

      saveReadingProgress(progressStorageKey, snapshot);
    }, [paginated, progressStorageKey, viewMode]);

    const schedulePersistProgress = useCallback(() => {
      if (!progressStorageKey) return;
      if (saveProgressTimerRef.current) clearTimeout(saveProgressTimerRef.current);
      saveProgressTimerRef.current = setTimeout(() => {
        saveProgressTimerRef.current = null;
        persistProgress();
      }, 400);
    }, [persistProgress, progressStorageKey]);

    const restoreScrollProgress = useCallback(
      (saved: ReaderReadingProgress) => {
        const viewport = viewportRef.current;
        const surface = surfaceRef.current;
        if (!viewport || !surface) return;

        if (
          typeof saved.absoluteScrollTop === "number" &&
          saved.absoluteScrollTop > 0
        ) {
          pinScrollTop(saved.absoluteScrollTop);
          return;
        }

        const anchor =
          surface.querySelector<HTMLElement>(`#${CSS.escape(saved.anchorId)}`) ??
          document.getElementById(saved.anchorId);

        if (anchor) {
          pinScrollTop(anchor.offsetTop + (saved.scrollTop ?? 0));
          return;
        }

        const el = document.getElementById(saved.anchorId);
        if (!el) return;
        const top =
          el.getBoundingClientRect().top -
          viewport.getBoundingClientRect().top +
          viewport.scrollTop;
        pinScrollTop(top + (saved.scrollTop ?? 0));
      },
      [pinScrollTop],
    );

    const applyPaginatedSlide = useCallback(
      (index: number, animate: boolean) => {
        const viewport = viewportRef.current;
        const surface = surfaceRef.current;
        if (!viewport || !surface) return;

        const slides = getSlides(surface);
        const count = slides.length;
        if (count === 0) return;

        const w = viewport.clientWidth;
        if (w <= 0) return;

        const h = Math.max(viewport.clientHeight, 1);
        const i = Math.max(0, Math.min(index, count - 1));
        pageIndexRef.current = i;

        syncReaderViewportVars(surface.ownerDocument?.documentElement, w, h);
        syncReaderViewportVars(surface, w, h);
        viewport.style.setProperty(READER_SLIDE_W_VAR, `${w}px`);
        surface.style.setProperty(READER_SLIDE_W_VAR, `${w}px`);

        slides.forEach((slide) => {
          slide.style.flex = `0 0 ${w}px`;
          slide.style.width = `${w}px`;
          slide.style.minWidth = `${w}px`;
          slide.style.maxWidth = `${w}px`;
        });

        surface.querySelectorAll<HTMLElement>(`.${bookPageShellClass}`).forEach((shell) => {
          syncBookPageMetrics(shell, {
            mode: "paginated",
            pageWidth: w,
            pageHeight: h,
          });
        });

        viewport.scrollLeft = 0;
        surface.style.transition = animate
          ? "transform 0.22s ease-out"
          : "none";
        surface.style.transform = `translate3d(${-i * w}px, 0, 0)`;
        schedulePersistProgress();
      },
      [schedulePersistProgress],
    );

    const runPaginatedLayout = useCallback(() => {
      const viewport = viewportRef.current;
      const surface = surfaceRef.current;
      if (!viewport || !surface) return;

      const w = viewport.clientWidth;
      const h = viewport.clientHeight;
      if (w <= 0 || h <= 0) return;

      const doc = surface.ownerDocument;
      if (doc) {
        syncReaderViewportVars(doc.documentElement, w, h);
        syncReaderViewportVars(surface, w, h);
      }

      surface.innerHTML = sourceBodyHtmlRef.current;
      surface.style.fontSize = fontSizePercent;
      viewport.style.setProperty(READER_SLIDE_W_VAR, `${w}px`);
      surface.style.setProperty(READER_SLIDE_W_VAR, `${w}px`);

      surface.querySelectorAll<HTMLElement>(".reader-scroll-anchor").forEach((slide) => {
        slide.style.flex = `0 0 ${w}px`;
        slide.style.width = `${w}px`;
        slide.style.minWidth = `${w}px`;
        slide.style.maxWidth = `${w}px`;
        slide.style.height = "100%";
      });

      surface
        .querySelectorAll<HTMLElement>(`.${bookPageShellClass}`)
        .forEach((shell) => {
          syncBookPageMetrics(shell, {
            mode: "paginated",
            pageWidth: w,
            pageHeight: h,
          });
        });

      paginateFlowPagesInSurface(surface, {
        pageWidth: w,
        pageHeight: h,
        fontSize: fontSizePercent,
      });

      surface
        .querySelectorAll<HTMLElement>(`.${bookPageShellClass}`)
        .forEach((shell) => {
          syncBookPageMetrics(shell, {
            mode: "paginated",
            pageWidth: w,
            pageHeight: h,
          });
        });

      if (progressStorageKey && !restoredOnceRef.current) {
        const saved = loadReadingProgress(progressStorageKey);
        if (saved?.viewMode === "paginated") {
          const slides = getSlides(surface);
          pageIndexRef.current = resolveSlideIndex(slides, saved);
        } else {
          pageIndexRef.current = 0;
        }
        restoredOnceRef.current = true;
      }

      applyPaginatedSlide(pageIndexRef.current, false);
    }, [applyPaginatedSlide, fontSizePercent, progressStorageKey]);

    const syncLayout = useCallback(() => {
      const viewport = viewportRef.current;
      const surface = surfaceRef.current;
      if (!viewport || !surface) return;

      const w = viewport.clientWidth;
      const h = viewport.clientHeight;
      if (w <= 0) return;

      if (paginated) {
        const doc = surface.ownerDocument;
        if (doc) {
          syncReaderViewportVars(doc.documentElement, w, Math.max(h, 1));
          syncReaderViewportVars(surface, w, Math.max(h, 1));
        }
        if (w !== lastPaginatedWidthRef.current) {
          lastPaginatedWidthRef.current = w;
          runPaginatedLayout();
        }
        return;
      }

      if (h <= 0) return;

      syncScrollViewportVars(viewport, surface, w, h);

      const layoutW = Math.round(w);
      if (scrollLayoutReadyRef.current && !forceScrollRelayoutRef.current) {
        return;
      }
      forceScrollRelayoutRef.current = false;
      lastScrollLayoutWidthRef.current = layoutW;

      viewport.style.backgroundColor = "#ffffff";
      viewport.style.removeProperty(READER_SLIDE_W_VAR);
      surface.style.transform = "";
      surface.style.transition = "";
      surface.style.removeProperty(READER_SLIDE_W_VAR);
      surface.style.width = "100%";
      surface.style.maxWidth = "none";
      surface.style.margin = "0";
      viewport.scrollLeft = 0;

      applyScrollFullBleedLayout(surface, w);

      surface.querySelectorAll<HTMLElement>(`.${bookPageShellClass}`).forEach((shell) => {
        syncBookPageMetrics(shell, { mode: "scroll" });
      });

      applyScrollFullBleedLayout(surface, w);

      const pinnedTop = scrollLayoutReadyRef.current
        ? viewport.scrollTop
        : lastKnownScrollTopRef.current;

      const finishScrollLayout = () => {
        let targetTop = 0;

        if (progressStorageKey && !restoredOnceRef.current) {
          const saved = loadReadingProgress(progressStorageKey);
          restoredOnceRef.current = true;
          if (saved?.viewMode === viewMode) {
            restoreScrollProgress(saved);
            targetTop = viewport.scrollTop;
          } else {
            pinScrollTop(0);
            targetTop = 0;
          }
        } else if (pinnedTop > 0) {
          pinScrollTop(pinnedTop);
          targetTop = pinnedTop;
        } else {
          pinScrollTop(0);
          targetTop = 0;
        }

        lastKnownScrollTopRef.current = targetTop;
        if (lockedScrollVhRef.current <= 0) {
          lockedScrollVhRef.current = Math.max(viewport.clientHeight, 1);
        }
        scrollLayoutReadyRef.current = true;
      };

      requestAnimationFrame(finishScrollLayout);
    }, [
      paginated,
      applyPaginatedSlide,
      runPaginatedLayout,
      progressStorageKey,
      pinScrollTop,
      restoreScrollProgress,
      syncScrollViewportVars,
      viewMode,
    ]);

    const scrollToAnchor = useCallback(
      (anchorId: string, behavior: ScrollBehavior = "smooth") => {
        const viewport = viewportRef.current;
        const surface = surfaceRef.current;
        if (!viewport || !surface) return;

        if (paginated) {
          const slides = getSlides(surface);
          const idx = slides.findIndex((s) => s.id === anchorId);
          if (idx >= 0) applyPaginatedSlide(idx, behavior !== "auto");
          return;
        }

        const el = document.getElementById(anchorId);
        if (!el) return;
        const top =
          el.getBoundingClientRect().top -
          viewport.getBoundingClientRect().top +
          viewport.scrollTop;
        viewport.scrollTo({ top, behavior });
      },
      [paginated, applyPaginatedSlide],
    );

    useImperativeHandle(
      ref,
      () => ({
        goTo: (anchorId: string) => scrollToAnchor(anchorId),
        prev: () => {
          if (paginated) {
            applyPaginatedSlide(pageIndexRef.current - 1, true);
            return;
          }
          const viewport = viewportRef.current;
          if (viewport) {
            viewport.scrollBy({ top: -viewport.clientHeight, behavior: "smooth" });
          }
        },
        next: () => {
          if (paginated) {
            applyPaginatedSlide(pageIndexRef.current + 1, true);
            return;
          }
          const viewport = viewportRef.current;
          if (viewport) {
            viewport.scrollBy({ top: viewport.clientHeight, behavior: "smooth" });
          }
        },
      }),
      [paginated, applyPaginatedSlide, scrollToAnchor],
    );

    useEffect(() => {
      restoredOnceRef.current = false;
      scrollLayoutReadyRef.current = false;
      forceScrollRelayoutRef.current = true;
      lastKnownScrollTopRef.current = 0;
      lockedScrollVhRef.current = 0;
      lastScrollLayoutWidthRef.current = 0;
      lastPaginatedWidthRef.current = 0;
      if (!progressStorageKey) pageIndexRef.current = 0;
    }, [bodyHtml, viewMode, progressStorageKey]);

    useEffect(() => {
      forceScrollRelayoutRef.current = true;
      lastScrollLayoutWidthRef.current = 0;
    }, [fontSizePercent]);

    const goPaginatedPrev = useCallback(
      () => applyPaginatedSlide(pageIndexRef.current - 1, true),
      [applyPaginatedSlide],
    );
    const goPaginatedNext = useCallback(
      () => applyPaginatedSlide(pageIndexRef.current + 1, true),
      [applyPaginatedSlide],
    );

    useReaderSwipe(paginated, goPaginatedPrev, goPaginatedNext, viewportRef);

    useLayoutEffect(() => {
      if (!paginated || !bodyHtml) return;
      runPaginatedLayout();
      const id = requestAnimationFrame(() => runPaginatedLayout());
      return () => cancelAnimationFrame(id);
    }, [bodyHtml, paginated, fontSizePercent, runPaginatedLayout]);

    useEffect(() => {
      onTocReady?.(toc);
    }, [toc, onTocReady]);

    useEffect(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const onTap = () => {
        if (!paginated) {
          const top = viewport.scrollTop;
          lastKnownScrollTopRef.current = top;
          onReadingAreaTapRef.current?.();
          pinScrollTop(top);
          return;
        }
        onReadingAreaTapRef.current?.();
      };
      const detachTap = attachReadingSurfaceTap(viewport, onTap);

      syncLayout();

      const onWindowResize = () => {
        if (paginated) {
          syncLayout();
          return;
        }
        const surface = surfaceRef.current;
        if (!surface) return;

        const w = viewport.clientWidth;
        const h = viewport.clientHeight;
        if (w <= 0) return;

        if (!scrollLayoutReadyRef.current) {
          syncLayout();
          return;
        }

        syncScrollViewportVars(viewport, surface, w, h);

        const pinned = lastKnownScrollTopRef.current;
        if (pinned > 0 && Math.abs(viewport.scrollTop - pinned) > 8) {
          pinScrollTop(pinned);
        }
      };
      window.addEventListener("resize", onWindowResize);

      return () => {
        detachTap();
        window.removeEventListener("resize", onWindowResize);
      };
    }, [bodyHtml, paginated, protectContent, syncLayout, pinScrollTop, syncScrollViewportVars]);

    useEffect(() => {
      if (!paginated) {
        const viewport = viewportRef.current;
        if (scrollLayoutReadyRef.current && viewport) {
          lastKnownScrollTopRef.current = viewport.scrollTop;
        }
        forceScrollRelayoutRef.current = true;
        lastScrollLayoutWidthRef.current = 0;
      }
      syncLayout();
    }, [fontSizePercent, bodyHtml, viewMode, paginated, syncLayout]);

    useEffect(() => {
      if (!progressStorageKey) return;

      const flush = () => persistProgress();
      document.addEventListener("visibilitychange", flush);
      window.addEventListener("pagehide", flush);

      return () => {
        document.removeEventListener("visibilitychange", flush);
        window.removeEventListener("pagehide", flush);
        flush();
      };
    }, [bodyHtml, viewMode, persistProgress, progressStorageKey]);

    useEffect(() => {
      if (!progressStorageKey || paginated) return;
      const viewport = viewportRef.current;
      if (!viewport) return;

      const onScroll = () => {
        if (!scrollLayoutReadyRef.current) return;
        lastKnownScrollTopRef.current = viewport.scrollTop;
        schedulePersistProgress();
      };
      viewport.addEventListener("scroll", onScroll, { passive: true });

      return () => {
        viewport.removeEventListener("scroll", onScroll);
        if (saveProgressTimerRef.current) {
          clearTimeout(saveProgressTimerRef.current);
          saveProgressTimerRef.current = null;
        }
      };
    }, [bodyHtml, paginated, progressStorageKey, schedulePersistProgress]);

    const mode = writingMode === "vertical-rl" ? "vertical-rl" : "horizontal-tb";
    const css = readerScrollSurfaceCss(mode, headingFonts, viewMode, protectContent);

    return (
      <div
        ref={viewportRef}
        className={`reader-scroll-viewport reader-hide-scrollbar${
          paginated
            ? " reader-scroll-viewport--paginated"
            : " reader-scroll-viewport--scroll"
        }`}
      >
        <style dangerouslySetInnerHTML={{ __html: css }} />
        {paginated ? (
          <div
            ref={surfaceRef}
            className="reader-scroll-surface reader-scroll-surface--paginated"
            style={{ fontSize: fontSizePercent }}
          />
        ) : (
          <div
            ref={surfaceRef}
            className="reader-scroll-surface reader-scroll-surface--scroll"
            style={{ fontSize: fontSizePercent }}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        )}
      </div>
    );
  },
);
