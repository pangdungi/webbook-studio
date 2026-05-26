"use client";

import { WebBookReader } from "@/components/reader/WebBookReader";
import type { WritingMode } from "@/lib/types/database";

type Props = {
  bookId: string;
  title: string;
  writingMode: WritingMode;
};

export function BookPreviewClient({ bookId, title, writingMode }: Props) {
  return (
    <div className="h-dvh min-h-0">
      <WebBookReader
        epubUrl={`/api/preview/${bookId}/epub`}
        title={title}
        writingMode={writingMode}
        embedded
      />
    </div>
  );
}
