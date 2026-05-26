type Props = {
  html: string;
};

/** 비활성 페이지 — TipTap 없이 HTML만 표시 (에디터 1개만 유지) */
export function PageStaticPreview({ html }: Props) {
  if (!html.trim()) {
    return (
      <p className="book-page-prose text-sm text-stone-400">
        이 페이지는 비어 있습니다. 클릭하면 편집할 수 있습니다.
      </p>
    );
  }

  return (
    <div
      className="book-page-prose pointer-events-none select-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
