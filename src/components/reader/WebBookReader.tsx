"use client";

import dynamic from "next/dynamic";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { NavItem, Rendition } from "epubjs";
import type { WritingMode } from "@/lib/types/database";
import { useEpubBlobUrl } from "@/components/reader/useEpubBlobUrl";
import { useReaderSwipe } from "@/components/reader/useReaderSwipe";
import type { ReaderViewMode } from "@/components/reader/EpubViewer";

const EpubViewer = dynamic(
  () => import("@/components/reader/EpubViewer").then((m) => m.EpubViewer),
  { ssr: false },
);

type Props = {
  epubUrl: string;
  title: string;
  writingMode: WritingMode;
  embedded?: boolean;
};

export function WebBookReader({ epubUrl, title, writingMode, embedded = false }: Props) {
  const [viewMode, setViewMode] = useState<ReaderViewMode>("scroll");
  const [tocOpen, setTocOpen] = useState(false);
  const [toc, setToc] = useState<NavItem[]>([]);
  const navRef = useRef<{ prev: () => void; next: () => void; goTo: (href: string) => void } | null>(null);
  const readerAreaRef = useRef<HTMLDivElement>(null);
  const { epubData, loading, error } = useEpubBlobUrl(epubUrl);

  useEffect(() => {
    if (!embedded) document.title = title;
  }, [title, embedded]);

  const handleTocReady = useCallback((items: NavItem[]) => {
    setToc(items);
  }, []);

  const goPrev = useCallback(() => navRef.current?.prev(), []);
  const goNext = useCallback(() => navRef.current?.next(), []);

  useReaderSwipe(viewMode === "paginated", goPrev, goNext, readerAreaRef);

  useEffect(() => {
    if (viewMode !== "paginated") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewMode, goPrev, goNext]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-stone-50">
      <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-3 py-2">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xs font-semibold text-stone-900 sm:text-sm">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setTocOpen((v) => !v)}
            className={`rounded-lg px-2 py-1 text-[11px] font-medium sm:px-3 sm:py-1.5 sm:text-xs ${
              tocOpen ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            목차
          </button>
          <div
            className="flex rounded-lg bg-stone-100 p-0.5"
            role="group"
            aria-label="읽기 방식"
          >
            <button
              type="button"
              onClick={() => setViewMode("scroll")}
              className={`rounded-md px-2 py-1 text-[11px] font-medium sm:px-3 sm:py-1.5 sm:text-xs ${
                viewMode === "scroll"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              스크롤
            </button>
            <button
              type="button"
              onClick={() => setViewMode("paginated")}
              className={`rounded-md px-2 py-1 text-[11px] font-medium sm:px-3 sm:py-1.5 sm:text-xs ${
                viewMode === "paginated"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              페이지
            </button>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {tocOpen && toc.length > 0 && (
          <aside className="absolute inset-y-0 left-0 z-20 w-64 shrink-0 overflow-y-auto border-r border-stone-200 bg-white p-4 shadow-lg sm:relative sm:shadow-none">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
              목차
            </h2>
            <ol className="space-y-1 text-sm">
              {toc.map((item, i) => (
                <li key={`${item.href}-${i}`}>
                  <button
                    type="button"
                    onClick={() => {
                      navRef.current?.goTo(item.href);
                      setTocOpen(false);
                    }}
                    className="w-full rounded-lg px-2 py-1.5 text-left text-stone-700 hover:bg-stone-100"
                  >
                    {item.label?.trim() || `항목 ${i + 1}`}
                  </button>
                </li>
              ))}
            </ol>
          </aside>
        )}

        <div
          ref={readerAreaRef}
          className={`relative min-h-0 min-w-0 flex-1 ${
            viewMode === "paginated" ? "touch-pan-x" : ""
          }`}
        >
          {loading && (
            <div className="flex h-full items-center justify-center text-sm text-stone-500">
              책을 여는 중…
            </div>
          )}
          {error && (
            <div className="flex h-full items-center justify-center p-4 text-center text-sm text-red-600">
              {error}
            </div>
          )}
          {!loading && !error && epubData && (
            <EpubViewerWithNav
              ref={navRef}
              data={epubData}
              viewMode={viewMode}
              writingMode={writingMode}
              onTocReady={handleTocReady}
            />
          )}

          {viewMode === "paginated" && !loading && !error && epubData && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="이전 페이지"
                className="reader-edge-nav reader-edge-nav--prev"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="다음 페이지"
                className="reader-edge-nav reader-edge-nav--next"
              >
                ›
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const EpubViewerWithNav = forwardRef<
  { prev: () => void; next: () => void; goTo: (href: string) => void },
  {
    data: ArrayBuffer;
    viewMode: ReaderViewMode;
    writingMode: WritingMode;
    onTocReady: (toc: NavItem[]) => void;
  }
>(function EpubViewerWithNav({ data, viewMode, writingMode, onTocReady }, ref) {
  const renditionRef = useRef<Rendition | null>(null);

  useImperativeHandle(ref, () => ({
    prev: () => renditionRef.current?.prev(),
    next: () => renditionRef.current?.next(),
    goTo: (href: string) => renditionRef.current?.display(href),
  }));

  return (
    <EpubViewer
      data={data}
      viewMode={viewMode}
      writingMode={writingMode}
      onTocReady={onTocReady}
      onRendition={(rendition) => {
        renditionRef.current = rendition;
      }}
    />
  );
});
