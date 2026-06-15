/** 상세페이지 혜택 프레임워크 — 질문 라벨 (UI·프롬프트 공용) */
export const SALES_PAGE_BENEFIT_QUESTIONS = [
  {
    key: "makeMoneyFiveWays",
    label:
      "이 책(상품·서비스)이 사람들이 돈을 버는 데 도움을 주는 다섯 가지 방법",
    list: true,
  },
  {
    key: "saveMoneyTimeline",
    label:
      "다음 주, 다음 달, 내년에 사람들이 돈을 아끼는 데 어떤 도움을 주는가?",
  },
  {
    key: "timeSaved",
    label:
      "사람들의 시간을 얼마나 절약해주고, 그 시간 동안 대신 무엇을 할 수 있는가?",
  },
  {
    key: "effortReduced",
    label:
      "이 책이 있으면 사람들이 더는 하지 않아도 될 일 — 수고를 어떻게 덜어주는가?",
  },
  {
    key: "physicalPainRelief",
    label:
      "어떤 신체적 고통을 없애주고, 이것이 삶과 비즈니스에 어떤 의미인가?",
  },
  {
    key: "mentalPainRelief",
    label: "정신적 고통이나 걱정을 어떻게 없애주는가?",
  },
  {
    key: "comfortThreeWays",
    label: "사람들을 더욱 편하게 만들어줄 세 가지 방법",
    list: true,
  },
  {
    key: "cleanlinessHygiene",
    label: "더욱 청결하고 위생적인 삶을 쉽게 이루는 데 어떤 도움을 주는가?",
  },
  {
    key: "healthVitality",
    label: "더욱 건강하고 활력 넘치는 삶을 만드는 데 어떤 도움을 주는가?",
  },
  {
    key: "socialLoveEnvy",
    label:
      "친구들의 부러움을 사거나 가족들에게 더욱 사랑받는 데 어떤 도움을 주는가?",
  },
  {
    key: "statusPopularity",
    label:
      "구매·독서 후 더욱 인기를 얻거나 사회적 지위가 높아졌다는 기분을 느끼게 하는 이유",
  },
] as const;

export type SalesPageBenefitKey =
  (typeof SALES_PAGE_BENEFIT_QUESTIONS)[number]["key"];

export type SalesPageBenefitAnswers = Record<
  SalesPageBenefitKey,
  string | string[]
>;

export function emptyBenefitAnswers(): SalesPageBenefitAnswers {
  return {
    makeMoneyFiveWays: [],
    saveMoneyTimeline: "",
    timeSaved: "",
    effortReduced: "",
    physicalPainRelief: "",
    mentalPainRelief: "",
    comfortThreeWays: [],
    cleanlinessHygiene: "",
    healthVitality: "",
    socialLoveEnvy: "",
    statusPopularity: "",
  };
}
