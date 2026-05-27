import { normalizeReaderAnalysisReport } from "@/lib/readerAnalysis/normalize";
import type { ReaderAnalysisReport } from "@/lib/readerAnalysis/types";
import type { Book } from "@/lib/types/database";

export function normalizeBookReaderFields(
  book: Partial<Book> & { reader_analysis?: unknown },
): Pick<Book, "reader_pitch" | "reader_analysis"> {
  return {
    reader_pitch:
      typeof book.reader_pitch === "string" ? book.reader_pitch : "",
    reader_analysis: normalizeReaderAnalysisReport(book.reader_analysis),
  };
}
