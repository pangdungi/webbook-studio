"use client";

type Props = {
  open: boolean;
  pageLabel: string;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export function PageMemoDialog({
  open,
  pageLabel,
  value,
  onChange,
  onClose,
  onSave,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="page-memo-title"
        className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="page-memo-title"
          className="text-sm font-semibold text-stone-900"
        >
          페이지 메모
        </h3>
        <p className="mt-0.5 text-xs text-stone-500">{pageLabel}</p>
        <p className="mt-2 text-[11px] text-stone-400">
          저자·편집용 · 독자에게는 보이지 않습니다
        </p>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          autoFocus
          placeholder="손볼 점, 검수 메모…"
          className="mt-3 w-full resize-y rounded-lg border border-stone-200 px-3 py-2 text-sm leading-relaxed text-stone-800 placeholder:text-stone-400"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
