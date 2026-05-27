"use client";

import type { ReaderViewMode } from "@/lib/reader/viewMode";
import {
  IconClose,
  IconFontLarge,
  IconFontNormal,
  IconFontSmall,
  IconList,
  IconPages,
  IconScroll,
} from "@/components/reader/ReaderChromeIcons";
import type { ReaderFontScale } from "@/lib/reader/fontScale";

const FONT_SCALES: ReaderFontScale[] = ["small", "normal", "large"];

const FONT_ICONS = {
  small: IconFontSmall,
  normal: IconFontNormal,
  large: IconFontLarge,
} as const;

type Props = {
  title: string;
  open: boolean;
  /** true — 독자 영역 안 absolute (iOS fixed 메뉴 시 scroll 튐 방지) */
  contained?: boolean;
  onClose: () => void;
  viewMode: ReaderViewMode;
  onViewMode: (mode: ReaderViewMode) => void;
  fontScale: ReaderFontScale;
  onFontScale: (scale: ReaderFontScale) => void;
  onOpenToc: () => void;
};

function ChromeIconButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
        active
          ? "bg-stone-900 text-white"
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
      }`}
    >
      {children}
    </button>
  );
}

export function ReaderChrome({
  title,
  open,
  contained = false,
  onClose,
  viewMode,
  onViewMode,
  fontScale,
  onFontScale,
  onOpenToc,
}: Props) {
  if (!open) return null;

  const overlayPos = contained ? "absolute" : "fixed";

  return (
    <>
      <div
        aria-hidden
        className={`pointer-events-none ${overlayPos} inset-0 z-40 bg-stone-900/30`}
      />

      <div
        role="dialog"
        aria-label="읽기 설정"
        className={`pointer-events-auto ${overlayPos} inset-x-0 bottom-0 z-50 px-3`}
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-lg rounded-2xl bg-white/98 p-4 shadow-xl ring-1 ring-stone-200/90 backdrop-blur-sm">
          <div className="mb-3 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">
              {title}
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100"
            >
              <IconClose />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <ChromeIconButton label="목차" onClick={onOpenToc}>
              <IconList />
            </ChromeIconButton>
            <ChromeIconButton
              active={viewMode === "scroll"}
              label="스크롤"
              onClick={() => onViewMode("scroll")}
            >
              <IconScroll />
            </ChromeIconButton>
            <ChromeIconButton
              active={viewMode === "paginated"}
              label="페이지"
              onClick={() => onViewMode("paginated")}
            >
              <IconPages />
            </ChromeIconButton>
            {FONT_SCALES.map((scale) => {
              const Icon = FONT_ICONS[scale];
              const labels: Record<ReaderFontScale, string> = {
                small: "글자 작게",
                normal: "글자 보통",
                large: "글자 크게",
              };
              return (
                <ChromeIconButton
                  key={scale}
                  active={fontScale === scale}
                  label={labels[scale]}
                  onClick={() => onFontScale(scale)}
                >
                  <Icon />
                </ChromeIconButton>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
