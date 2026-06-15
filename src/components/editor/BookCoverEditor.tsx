"use client";

import { useEffect, useRef, useState } from "react";
import {
  bookBookTitleClass,
  bookCoverImageClass,
  bookPageBodyClass,
  bookPageBookCoverClass,
  bookPageBookCoverImageClass,
  bookPageClass,
  bookPageShellClass,
  syncBookPageMetrics,
} from "@/lib/pages/bookPageCss";
import type { BookCoverStyle } from "@/lib/books/coverStyle";

type Props = {
  title: string;
  subtitle: string | null;
  cover: BookCoverStyle;
  coverImageUrl: string | null;
  uploading?: boolean;
  onCoverChange: (patch: Partial<BookCoverStyle>) => void;
  onUploadCover: (file: File) => void | Promise<void>;
  onRemoveCover: () => void | Promise<void>;
};

export function BookCoverEditor({
  title,
  subtitle,
  cover,
  coverImageUrl,
  uploading = false,
  onCoverChange,
  onUploadCover,
  onRemoveCover,
}: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const sync = () => syncBookPageMetrics(shell);
    sync();

    const ro = new ResizeObserver(sync);
    ro.observe(shell);
    return () => ro.disconnect();
  }, [coverImageUrl]);

  const displayTitle = title.trim() || "제목 없음";
  const hasImage = Boolean(coverImageUrl);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file?.type.startsWith("image/")) return;
    void onUploadCover(file);
  };

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-stone-900">책 표지</h2>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">
          표지 이미지를 올리거나, 색상+제목으로 만든 표지를 사용할 수 있습니다.
          제목은 헤더의 책 제목과 같습니다.
        </p>

        <div className="mt-6">
          <p className="text-xs font-medium text-stone-700">표지 이미지</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div
            className={`mt-2 rounded-xl border-2 border-dashed p-4 transition-colors ${
              dragOver
                ? "border-stone-400 bg-stone-50"
                : "border-stone-200 bg-stone-50/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
          >
            {hasImage ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImageUrl!}
                  alt="표지 미리보기"
                  className="aspect-[210/297] w-full rounded-lg object-cover shadow-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                  >
                    {uploading ? "업로드 중…" : "다른 이미지로 교체"}
                  </button>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => void onRemoveCover()}
                    className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    제거
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-lg py-6 text-center disabled:opacity-50"
              >
                <span className="text-2xl text-stone-400">+</span>
                <span className="text-xs font-medium text-stone-700">
                  {uploading ? "업로드 중…" : "이미지 선택 또는 드래그"}
                </span>
                <span className="text-[11px] text-stone-400">
                  JPG, PNG, WebP · 세로 비율 권장
                </span>
              </button>
            )}
          </div>
        </div>

        {!hasImage && (
          <>
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
          </>
        )}
      </aside>

      <div className="book-page-editor-scroll flex-1 overflow-y-auto">
        <div ref={shellRef} className={bookPageShellClass}>
          {hasImage ? (
            <article
              className={`${bookPageClass} ${bookPageBookCoverClass} ${bookPageBookCoverImageClass}`}
              aria-label="책 표지 미리보기"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={bookCoverImageClass}
                src={coverImageUrl!}
                alt={displayTitle}
              />
            </article>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
