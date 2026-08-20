export type BookTitleCandidate = {
  title: string;
  subtitle: string;
  rationale: string;
};

export type BookTitlePickReport = {
  bookSummary?: string;
  candidates: BookTitleCandidate[];
  generatedAt?: string;
};

export type BookTitlePickResult = {
  report: BookTitlePickReport;
  provider: "anthropic" | "openai";
  chaptersAnalyzed: number;
  digestCalls: number;
};
