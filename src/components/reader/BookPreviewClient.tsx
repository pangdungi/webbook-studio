"use client";

import { WebBookReader } from "@/components/reader/WebBookReader";
import type { WritingMode } from "@/lib/types/database";
import type { BookBodyFont } from "@/lib/typography/bodyFonts";
import type { BookHeadingFonts } from "@/lib/typography/headingFonts";

type Props = {
  bookId: string;
  title: string;
  writingMode: WritingMode;
  headingFonts: BookHeadingFonts;
  bodyFont: BookBodyFont;
};

export function BookPreviewClient({
  bookId,
  title,
  writingMode,
  headingFonts,
  bodyFont,
}: Props) {
  return (
    <div className="h-dvh min-h-0">
      <WebBookReader
        epubUrl={`/api/preview/${bookId}/epub`}
        title={title}
        writingMode={writingMode}
        headingFonts={headingFonts}
        bodyFont={bodyFont}
        embedded
        progressStorageKey={`preview:${bookId}`}
      />
    </div>
  );
}
