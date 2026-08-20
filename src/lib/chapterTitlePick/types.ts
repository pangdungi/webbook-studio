export type ChapterTitleCandidate = {
  title: string;
  rationale: string;
};

export type ChapterTitlePickReport = {
  chapterSummary?: string;
  candidates: ChapterTitleCandidate[];
  pagesRead: number;
  generatedAt?: string;
};

export type ChapterTitlePickResult = {
  report: ChapterTitlePickReport;
  provider: "anthropic" | "openai";
};
