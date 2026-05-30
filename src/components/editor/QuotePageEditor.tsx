"use client";

import { useEffect, useRef, useState } from "react";
import {
  bookQuotePageClass,
  bookQuoteSourceClass,
  bookQuoteTextClass,
} from "@/lib/pages/bookPageCss";
import { parseQuotePageContent } from "@/lib/pages/quotePage";

type Props = {
  pageId: string;
  initialContent: Record<string, unknown>;
  onUpdate: (pageId: string, quote: string, source: string) => void;
};

export function QuotePageEditor({ pageId, initialContent, onUpdate }: Props) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const parsed = parseQuotePageContent(initialContent);
  const [quote, setQuote] = useState(parsed.quote);
  const [source, setSource] = useState(parsed.source);

  const quoteRef = useRef(quote);
  const sourceRef = useRef(source);
  quoteRef.current = quote;
  sourceRef.current = source;

  useEffect(() => {
    const next = parseQuotePageContent(initialContent);
    setQuote(next.quote);
    setSource(next.source);
  }, [pageId]);

  useEffect(() => {
    return () => {
      onUpdateRef.current(
        pageId,
        quoteRef.current,
        sourceRef.current,
      );
    };
  }, [pageId]);

  const pushUpdate = (nextQuote: string, nextSource: string) => {
    onUpdateRef.current(pageId, nextQuote, nextSource);
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
          const nextQuote = e.target.value;
          setQuote(nextQuote);
          pushUpdate(nextQuote, sourceRef.current);
        }}
      />
      <textarea
        className={bookQuoteSourceClass}
        value={source}
        rows={1}
        placeholder="출처"
        aria-label="출처"
        onChange={(e) => {
          const nextSource = e.target.value;
          setSource(nextSource);
          pushUpdate(quoteRef.current, nextSource);
        }}
      />
    </div>
  );
}
