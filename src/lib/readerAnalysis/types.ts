export type ReaderPersona = {
  label: string;
  description: string;
};

export type ReaderAnalysisReport = {
  summary: string;
  targetReaders: ReaderPersona[];
  interests: string[];
  problemsToSolve: string[];
  desiredHelp: string[];
  readingContext: string[];
  contentAngles: string[];
  writingGuidance: string[];
  analyzedAt: string;
};

export type ReaderAnalysisResult = {
  report: ReaderAnalysisReport;
  provider?: "anthropic" | "openai";
};
