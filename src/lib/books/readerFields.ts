import { normalizeReaderAnalysisReport } from "@/lib/readerAnalysis/normalize";
import { normalizeSalesPageCopyReport } from "@/lib/salesPageCopy/normalize";
import type { Book } from "@/lib/types/database";

export function normalizeBookReaderFields(
  book: Partial<Book> & {
    reader_analysis?: unknown;
    sales_page_copy?: unknown;
  },
): Pick<Book, "reader_pitch" | "reader_analysis" | "sales_page_copy"> {
  return {
    reader_pitch:
      typeof book.reader_pitch === "string" ? book.reader_pitch : "",
    reader_analysis: normalizeReaderAnalysisReport(book.reader_analysis),
    sales_page_copy: normalizeSalesPageCopyReport(book.sales_page_copy),
  };
}
