"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NavItem } from "epubjs";
import type { WritingMode } from "@/lib/types/database";
import type { BookHeadingFonts } from "@/lib/typography/headingFonts";
import { DEFAULT_BOOK_HEADING_FONTS } from "@/lib/typography/headingFonts";
import {
  scrollUrlFromEpubUrl,
  useReaderScrollContent,
} from "@/components/reader/useReaderScrollContent";
import {
  HtmlScrollReader,
  type HtmlScrollReaderHandle,
} from "@/components/reader/HtmlScrollReader";
import type { ReaderTocEntry } from "@/lib/reader/buildBookScrollDocument";
import { ReaderChrome } from "@/components/reader/ReaderChrome";
import { IconClose } from "@/components/reader/ReaderChromeIcons";
import {
  loadReaderFontScale,
  READER_FONT_SCALE_PERCENT,
  saveReaderFontScale,
  type ReaderFontScale,
} from "@/lib/reader/fontScale";
import {
  loadReaderViewMode,
  saveReaderViewMode,
  type ReaderViewMode,
} from "@/lib/reader/viewMode";

const PAGINATED_HINT =
  "페이지 모드 — 출판 책처럼 화면 한 장씩 넘깁니다. 이어서 읽기는 스크롤 모드를 이용하세요.";

type Props = {
  epubUrl: string;
  title: string;
  writingMode: WritingMode;
  headingFonts?: BookHeadingFonts;
  embedded?: boolean;
  protectContent?: boolean;
  /** 있으면 localStorage에 읽던 위치 저장·복원 */
  progressStorageKey?: string;
};

export function WebBookReader({
  epubUrl,
  title,
  writingMode,
  headingFonts = DEFAULT_BOOK_HEADING_FONTS,
  embedded = false,
  protectContent = false,
  progressStorageKey,
}: Props) {
  const [viewMode, setViewMode] = useState<ReaderViewMode>("scroll");
  const [fontScale, setFontScale] = useState<ReaderFontScale>("normal");
  const [chromeOpen, setChromeOpen] = useState(false);
  const [showPaginatedHint, setShowPaginatedHint] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [toc, setToc] = useState<NavItem[]>([]);
  const readerNavRef = useRef<HtmlScrollReaderHandle | null>(null);
  const readerAreaRef = useRef<HTMLDivElement>(null);

  const scrollUrl = scrollUrlFromEpubUrl(epubUrl);
  const { content, loading, error } = useReaderScrollContent(scrollUrl);

  useEffect(() => {
    if (!embedded) document.title = title;
  }, [title, embedded]);

  useEffect(() => {
    setViewMode(loadReaderViewMode());
    setFontScale(loadReaderFontScale());
  }, []);

  const changeViewMode = (mode: ReaderViewMode) => {
    setViewMode(mode);
    saveReaderViewMode(mode);
    if (mode === "paginated") {
      setShowPaginatedHint(true);
    }
  };

  const changeFontScale = (scale: ReaderFontScale) => {
    setFontScale(scale);
    saveReaderFontScale(scale);
  };

  const handleTocReady = useCallback((items: NavItem[] | ReaderTocEntry[]) => {
    setToc(
      items.map((item) => ({
        label: item.label,
        href: item.href,
      })) as NavItem[],
    );
  }, []);

  const goPrev = useCallback(() => readerNavRef.current?.prev(), []);
  const goNext = useCallback(() => readerNavRef.current?.next(), []);
  const goTo = useCallback((href: string) => readerNavRef.current?.goTo(href), []);

  const handleReadingAreaTap = useCallback(() => {
    if (tocOpen) return;
    setChromeOpen((open) => !open);
  }, [tocOpen]);

  useEffect(() => {
    if (!protectContent) return;

    const block = (e: Event) => e.preventDefault();
    const root = readerAreaRef.current;
    if (!root) return;

    root.addEventListener("contextmenu", block);
    root.addEventListener("copy", block);
    root.addEventListener("cut", block);

    return () => {
      root.removeEventListener("contextmenu", block);
      root.removeEventListener("copy", block);
      root.removeEventListener("cut", block);
    };
  }, [protectContent]);

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
    <div
      className="relative flex h-full min-h-0 flex-col bg-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <ReaderChrome
          title={title}
          open={chromeOpen}
          onClose={() => setChromeOpen(false)}
          viewMode={viewMode}
          onViewMode={changeViewMode}
          fontScale={fontScale}
          onFontScale={changeFontScale}
          onOpenToc={() => {
            setTocOpen(true);
            setChromeOpen(false);
          }}
          paginatedHint={
            showPaginatedHint && viewMode === "paginated" ? PAGINATED_HINT : null
          }
          onDismissPaginatedHint={() => setShowPaginatedHint(false)}
        />

        {tocOpen && toc.length > 0 && (
          <>
            <button
              type="button"
              aria-label="목차 닫기"
              className="fixed inset-0 z-30 bg-stone-900/25"
              onClick={() => setTocOpen(false)}
            />
            <aside
              className="fixed inset-y-0 left-0 z-40 flex w-[min(85vw,18rem)] flex-col bg-white shadow-xl"
              style={{
                paddingTop: "env(safe-area-inset-top)",
                paddingBottom: "env(safe-area-inset-bottom)",
                paddingLeft: "env(safe-area-inset-left)",
              }}
            >
              <div className="flex items-center justify-between border-b border-stone-100 px-3 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                  목차
                </h2>
                <button
                  type="button"
                  onClick={() => setTocOpen(false)}
                  aria-label="목차 닫기"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100"
                >
                  <IconClose className="h-5 w-5" />
                </button>
              </div>
              <ol className="reader-hide-scrollbar flex-1 space-y-0.5 overflow-y-auto p-2 text-sm">
                {toc.map((item, i) => (
                  <li key={`${item.href}-${i}`}>
                    <button
                      type="button"
                      onClick={() => {
                        goTo(item.href);
                        setTocOpen(false);
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-stone-700 hover:bg-stone-100"
                    >
                      {item.label?.trim() || `항목 ${i + 1}`}
                    </button>
                  </li>
                ))}
              </ol>
            </aside>
          </>
        )}

        <div
          ref={readerAreaRef}
          className={`relative min-h-0 min-w-0 flex-1 overflow-hidden ${
            viewMode === "paginated" ? "touch-pan-x" : "touch-pan-y"
          } ${protectContent ? "select-none" : ""}`}
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
          {!loading && !error && content && (
            <HtmlScrollReader
              key={viewMode}
              ref={readerNavRef}
              bodyHtml={content.bodyHtml}
              toc={content.toc}
              viewMode={viewMode}
              writingMode={writingMode}
              headingFonts={headingFonts}
              fontSizePercent={READER_FONT_SCALE_PERCENT[fontScale]}
              protectContent={protectContent}
              progressStorageKey={progressStorageKey}
              onTocReady={handleTocReady}
              onReadingAreaTap={handleReadingAreaTap}
            />
          )}

          {viewMode === "paginated" && !loading && !error && content && (
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
