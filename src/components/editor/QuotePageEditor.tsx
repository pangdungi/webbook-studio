"use client";

import { useEffect, useState } from "react";
import {
  bookQuotePageClass,
  bookQuoteSourceClass,
  bookQuoteTextClass,
} from "@/lib/pages/bookPageCss";
import {
  parseQuotePageContent,
} from "@/lib/pages/quotePage";

type Props = {
  pageId: string;
  initialContent: Record<string, unknown>;
  onUpdate: (pageId: string, quote: string, source: string) => void;
};

export function QuotePageEditor({ pageId, initialContent, onUpdate }: Props) {
  const parsed = parseQuotePageContent(initialContent);
  const [quote, setQuote] = useState(parsed.quote);
  const [source, setSource] = useState(parsed.source);

  useEffect(() => {
    const next = parseQuotePageContent(initialContent);
    setQuote(next.quote);
    setSource(next.source);
  }, [pageId, initialContent]);

  useEffect(() => {
    return () => {
      onUpdate(pageId, quote, source);
    };
  }, [pageId, onUpdate, quote, source]);

  const emit = (nextQuote: string, nextSource: string) => {
    onUpdate(pageId, nextQuote, nextSource);
  };

  return (
    <div
      className={bookQuotePageClass}
      onClick={(e) => e.stopPropagation()}
    >
      <textarea
        className={bookQuoteTextClass}
        value={quote}
        rows={3}
        placeholder="인용구"
        aria-label="인용구"
        onChange={(e) => {
          setQuote(e.target.value);
          emit(e.target.value, source);
        }}
      />
      <textarea
        className={bookQuoteSourceClass}
        value={source}
        rows={1}
        placeholder="출처"
        aria-label="출처"
        onChange={(e) => {
          setSource(e.target.value);
          emit(quote, e.target.value);
        }}
      />
    </div>
  );
}
