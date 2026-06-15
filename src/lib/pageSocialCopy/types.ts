export type PageSocialCarousel = {
  hookSlide: string;
  slides: string[];
  ctaSlide: string;
};

export type PageSocialFormulaPas = {
  problem: string;
  agitate: string;
  solution: string;
  fullMessage: string;
};

export type PageSocialFormulaBenefits = {
  benefits: [string, string, string];
  cta: string;
  fullMessage: string;
};

export type PageSocialFormulaBab = {
  before: string;
  after: string;
  bridge: string;
  fullMessage: string;
};

export type PageSocialCopyReport = {
  reelsScript: string;
  carousel: PageSocialCarousel;
  formulaPas: PageSocialFormulaPas;
  formulaBenefits: PageSocialFormulaBenefits;
  formulaBab: PageSocialFormulaBab;
  analyzedAt: string;
};

export type PageSocialCopyResult = {
  report: PageSocialCopyReport;
  provider?: "anthropic" | "openai";
};

export type PageSocialCopyInput = {
  pageText: string;
  pageTitle?: string | null;
  chapterTitle?: string | null;
  bookTitle?: string | null;
};
