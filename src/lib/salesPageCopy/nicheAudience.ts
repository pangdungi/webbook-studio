/** 타깃 오디언스 3단계 — 틈새·하위·초틈새 + 프레드 (UI·프롬프트 공용) */
export const SALES_PAGE_NICHE_FIELDS = [
  {
    key: "nicheMarket",
    label: "1단계 · 틈새시장",
    hint: "이 책이 속하는 넓은 시장·분야 (광고·카피가 어려울 정도로 넓은 상위 개념)",
  },
  {
    key: "subNiche",
    label: "2단계 · 하위 틈새시장",
    hint: "틈새시장 안에서 더 좁혀진 고객층·세부 분야",
  },
  {
    key: "microNiche",
    label: "3단계 · 초틈새시장",
    hint: "이 책이 집중 공략할 가장 구체적 초점 — 하위 틈새의 한 조각",
  },
  {
    key: "avatarProfile",
    label: "고객 프레드(아바타)",
    hint: "초틈새시장의 대표 독자 — 누구인지, 어떤 상황·행동 패턴인지",
  },
  {
    key: "avatarUniqueNeeds",
    label: "프레드의 고유 니즈",
    hint: "같은 하위 틈새 안 다른 유형과 어떻게 니즈·고민·언어가 다른지",
  },
  {
    key: "copyImplication",
    label: "프레드 이해 → 카피 함의",
    hint: "프레드를 깊이 이해했을 때 상세페이지·세일즈 카피가 어떻게 달라져야 하는지",
  },
] as const;

export type SalesPageNicheKey =
  (typeof SALES_PAGE_NICHE_FIELDS)[number]["key"];

export type SalesPageNicheAudience = Record<SalesPageNicheKey, string>;

export function emptyNicheAudience(): SalesPageNicheAudience {
  return {
    nicheMarket: "",
    subNiche: "",
    microNiche: "",
    avatarProfile: "",
    avatarUniqueNeeds: "",
    copyImplication: "",
  };
}
