"use client";

import { WebBookReader } from "@/components/reader/WebBookReader";
import type { WritingMode } from "@/lib/types/database";
import type { BookHeadingFonts } from "@/lib/typography/headingFonts";

type Props = {
  bookId: string;
  title: string;
  writingMode: WritingMode;
  headingFonts: BookHeadingFonts;
};

export function BookPreviewClient({
  bookId,
  title,
  writingMode,
  headingFonts,
}: Props) {
  return (
    <div className="h-dvh min-h-0">
      <WebBookReader
        epubUrl={`/api/preview/${bookId}/epub`}
        title={title}
        writingMode={writingMode}
        headingFonts={headingFonts}
        embedded
      />
    </div>
  );
}
