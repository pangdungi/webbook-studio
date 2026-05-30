/** 글 유형: 공감·경험 공유 vs 주장·설득 */
export type WritingGenre = "empathy" | "argument";

export type EmpathyFramework = {
  /** 관찰하기: 체험·사실·자료 */
  observation: string;
  /** 성찰하기: 생각·느낌 정리 */
  reflection: string;
  /** 통찰하기: 궁극적 메시지 */
  insight: string;
  /** 위 틀에 맞춰 재구성 제안 */
  suggestedOutline: string;
};

export type ArgumentFramework = {
  /** 주장: 한 문장 */
  claim: string;
  /** 이유 */
  reasons: string[];
  /** 사례 */
  examples: string[];
  /** 방법 제안 */
  methodProposal: string;
  /** 위 틀에 맞춰 재구성 제안 */
  suggestedOutline: string;
};

/** 문제 구간 + 구체적 개선 방법 */
export type WritingImprovementSuggestion = {
  /** 어디(전반부·후반부·특정 단락 등) */
  area: string;
  /** 무엇이 문제인지 */
  problem: string;
  /** 이렇게 고치면 좋다 */
  suggestion: string;
  /** 메시지|구조|톤|부제목|독자 등 */
  category?: string;
};

export type WritingEvaluationReport = {
  genre: WritingGenre;
  genreLabel: string;
  genreRationale: string;
  coreMessage: string;
  singleMessage: boolean;
  singleMessageAssessment: string;
  subtitleAlignment: string;
  idealReaders: string[];
  /** 개선할 곳 + 개선 방법 (필수 3~6개) */
  improvements: WritingImprovementSuggestion[];
  empathy?: EmpathyFramework;
  argument?: ArgumentFramework;
  overallSummary: string;
  analyzedAt: string;
};

export type WritingEvaluationResult = {
  report: WritingEvaluationReport;
  provider?: "anthropic" | "openai";
  warning?: string;
};
