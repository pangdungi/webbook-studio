"use client";

import { useEffect, useRef } from "react";
import {
  bookBookTitleClass,
  bookPageBodyClass,
  bookPageBookCoverClass,
  bookPageClass,
  bookPageShellClass,
  syncBookPageMetrics,
} from "@/lib/pages/bookPageCss";
import type { BookCoverStyle } from "@/lib/books/coverStyle";

type Props = {
  title: string;
  subtitle: string | null;
  cover: BookCoverStyle;
  onCoverChange: (patch: Partial<BookCoverStyle>) => void;
};

export function BookCoverEditor({
  title,
  subtitle,
  cover,
  onCoverChange,
}: Props) {
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const sync = () => syncBookPageMetrics(shell);
    sync();

    const ro = new ResizeObserver(sync);
    ro.observe(shell);
    return () => ro.disconnect();
  }, []);

  const displayTitle = title.trim() || "제목 없음";

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="w-72 shrink-0 border-r border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-stone-900">책 표지</h2>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">
          상단 제목은 헤더의 책 제목과 같습니다. 배경·글자 색만 여기서 고릅니다.
        </p>

        <label className="mt-6 block text-xs font-medium text-stone-700">
          배경 색
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              value={cover.cover_bg_color}
              onChange={(e) =>
                onCoverChange({ cover_bg_color: e.target.value })
              }
              className="h-10 w-14 cursor-pointer rounded border border-stone-200 bg-white p-0.5"
            />
            <input
              type="text"
              value={cover.cover_bg_color}
              onChange={(e) =>
                onCoverChange({ cover_bg_color: e.target.value })
              }
              className="min-w-0 flex-1 rounded-lg border border-stone-200 px-2 py-1.5 font-mono text-xs"
              spellCheck={false}
            />
          </div>
        </label>

        <label className="mt-5 block text-xs font-medium text-stone-700">
          제목 글자 색
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              value={cover.cover_title_color}
              onChange={(e) =>
                onCoverChange({ cover_title_color: e.target.value })
              }
              className="h-10 w-14 cursor-pointer rounded border border-stone-200 bg-white p-0.5"
            />
            <input
              type="text"
              value={cover.cover_title_color}
              onChange={(e) =>
                onCoverChange({ cover_title_color: e.target.value })
              }
              className="min-w-0 flex-1 rounded-lg border border-stone-200 px-2 py-1.5 font-mono text-xs"
              spellCheck={false}
            />
          </div>
        </label>
      </aside>

      <div className="book-page-editor-scroll flex-1 overflow-y-auto">
        <div ref={shellRef} className={bookPageShellClass}>
          <article
            className={`${bookPageClass} ${bookPageBookCoverClass}`}
            style={{
              backgroundColor: cover.cover_bg_color,
              ["--book-cover-title-color" as string]: cover.cover_title_color,
            }}
            aria-label="책 표지 미리보기"
          >
            <div className={bookPageBodyClass}>
              <h1 className={bookBookTitleClass}>{displayTitle}</h1>
              {subtitle?.trim() ? (
                <p className="book-book-subtitle">{subtitle.trim()}</p>
              ) : null}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
