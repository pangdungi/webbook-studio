import type { BookHeadingFonts } from "@/lib/typography/headingFonts";
import type { ReaderAnalysisReport } from "@/lib/readerAnalysis/types";
import type { SalesPageCopyReport } from "@/lib/salesPageCopy/types";

export type UserRole = "admin" | "reader";
export type BookStatus = "draft" | "published";
export type WritingMode = "horizontal-tb" | "vertical-rl";

export type Profile = {
  id: string;
  role: UserRole;
  display_name: string | null;
  created_at: string;
};

export type Book = {
  id: string;
  title: string;
  subtitle: string | null;
  cover_path: string | null;
  cover_bg_color: string;
  cover_title_color: string;
  writing_mode: WritingMode;
  heading_fonts: BookHeadingFonts;
  status: BookStatus;
  epub_storage_path: string | null;
  pdf_storage_path: string | null;
  published_at: string | null;
  reader_pitch: string;
  reader_analysis: ReaderAnalysisReport | null;
  sales_page_copy: SalesPageCopyReport | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Chapter = {
  id: string;
  book_id: string;
  parent_id: string | null;
  sort_order: number;
  title: string;
  content_json: Record<string, unknown>;
  content_html: string;
  created_at: string;
  updated_at: string;
};

export type BookVersion = {
  id: string;
  book_id: string;
  label: string;
  snapshot: import("@/lib/books/bookVersionSnapshot").BookVersionSnapshot;
  created_by: string;
  created_at: string;
};

export type BookAccessToken = {
  id: string;
  book_id: string;
  token: string;
  label: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type SpellCorrection = {
  from: string;
  to: string;
  reason: string;
  offset: number;
};

export type SpellcheckResult = {
  correctedText: string;
  corrections: SpellCorrection[];
  provider?: "daum" | "naver" | "pnu" | "anthropic" | "openai" | "local";
  warning?: string;
};
