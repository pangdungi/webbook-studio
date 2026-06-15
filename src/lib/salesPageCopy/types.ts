import type { SalesPageBenefitAnswers } from "@/lib/salesPageCopy/benefitQuestions";
import type { SalesPageAwarenessAnswers } from "@/lib/salesPageCopy/awarenessQuestions";
import type { SalesPageNicheAudience } from "@/lib/salesPageCopy/nicheAudience";

export type SalesPageCopyReport = {
  headline: string;
  subheadline: string;
  hook: string;
  valueProposition: string;
  bullets: string[];
  forWho: string;
  cta: string;
  seoDescription: string;
  /** 상세페이지 혜택 프레임워크 질문별 답변 */
  benefitAnswers: SalesPageBenefitAnswers;
  /** 독자 인식 단계별 대화 전략 */
  awarenessAnswers: SalesPageAwarenessAnswers;
  /** 타깃 오디언스 3단계 (틈새·하위·초틈새 + 프레드) */
  nicheAudience: SalesPageNicheAudience;
  analyzedAt: string;
};

export type SalesPageCopyResult = {
  report: SalesPageCopyReport;
  provider?: "anthropic" | "openai";
  chaptersAnalyzed?: number;
};
