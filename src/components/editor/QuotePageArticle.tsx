"use client";

import { memo, type RefCallback } from "react";
import type { BookPage } from "@/lib/pages/types";
import {
  bookPageBodyClass,
  bookPageClass,
  bookPageQuoteClass,
} from "@/lib/pages/bookPageCss";
import { QuotePageEditor } from "./QuotePageEditor";

type Props = {
  page: BookPage;
  onUpdate: (pageId: string, quote: string, source: string) => void;
  pageRef: RefCallback<HTMLElement>;
};

export const QuotePageArticle = memo(function QuotePageArticle({
  page,
  onUpdate,
  pageRef,
}: Props) {
  return (
    <article
      ref={pageRef}
      className={`${bookPageClass} ${bookPageQuoteClass}`}
      aria-label="명언 페이지"
    >
      <div className={bookPageBodyClass}>
        <QuotePageEditor
          key={page.id}
          pageId={page.id}
          initialContent={page.content}
          onUpdate={onUpdate}
        />
      </div>
    </article>
  );
});
