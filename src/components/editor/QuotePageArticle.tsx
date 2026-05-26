"use client";

import { memo, type RefCallback } from "react";
import type { BookPage } from "@/lib/pages/types";
import {
  bookPageBodyClass,
  bookPageClass,
  bookPageQuoteClass,
} from "@/lib/pages/bookPageCss";
import { PageStaticPreview } from "./PageStaticPreview";
import { QuotePageEditor } from "./QuotePageEditor";

type Props = {
  page: BookPage;
  isActive: boolean;
  onSelect: (pageId: string) => void;
  onUpdate: (pageId: string, quote: string, source: string) => void;
  pageRef: RefCallback<HTMLElement>;
};

export const QuotePageArticle = memo(function QuotePageArticle({
  page,
  isActive,
  onSelect,
  onUpdate,
  pageRef,
}: Props) {
  return (
    <article
      ref={pageRef}
      className={`${bookPageClass} ${bookPageQuoteClass} ${
        !isActive ? "ring-1 ring-stone-200/80" : ""
      }`}
      onClick={() => onSelect(page.id)}
      aria-label="명언 페이지"
    >
      <div className={bookPageBodyClass}>
        {isActive ? (
          <QuotePageEditor
            key={page.id}
            pageId={page.id}
            initialContent={page.content}
            onUpdate={onUpdate}
          />
        ) : (
          <PageStaticPreview html={page.content_html} />
        )}
      </div>
    </article>
  );
}, (prev, next) => {
  if (prev.page.id !== next.page.id || prev.isActive !== next.isActive) {
    return false;
  }
  if (next.isActive) {
    return true;
  }
  return prev.page.content_html === next.page.content_html;
});
