"use client";

import { WebBookReader } from "@/components/reader/WebBookReader";
import { readerEpubPath } from "@/lib/access/readerSession";
import type { WritingMode } from "@/lib/types/database";
import type { BookHeadingFonts } from "@/lib/typography/headingFonts";

type Props = {
  token: string;
  title: string;
  writingMode: WritingMode;
  headingFonts: BookHeadingFonts;
  scrollCoverKey?: string | null;
};

/** 서버에서 책 정보 검증 후 렌더 — 별도 /api/read 호출 없음 */
export function ReaderPageClient({
  token,
  title,
  writingMode,
  headingFonts,
  scrollCoverKey = null,
}: Props) {
  return (
    <div className="h-full min-h-0">
      <WebBookReader
        epubUrl={readerEpubPath(token)}
        title={title}
        writingMode={writingMode}
        headingFonts={headingFonts}
        scrollCoverKey={scrollCoverKey}
        protectContent
        progressStorageKey={token}
        defaultViewMode="scroll"
      />
    </div>
  );
}
