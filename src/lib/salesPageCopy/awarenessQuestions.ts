/** 독자 인식 단계별 — 상대와 나눌 대화 (UI·프롬프트 공용) */
export const SALES_PAGE_AWARENESS_QUESTIONS = [
  {
    key: "conversationKnowsGod",
    label:
      "신이 누구인지 알고 무슨 일을 하는지 아는 상대와 어떤 대화를 나누겠는가?",
  },
  {
    key: "conversationKnowsProblemNotYou",
    label:
      "자신의 문제를 인지하나 당신을 잘 모르는 상대와 어떤 대화를 나누겠는가?",
  },
  {
    key: "conversationKnowsProblemNoSolution",
    label:
      "자신에게 문제가 있음은 알지만 그것을 해결할 방법이 있는지조차 모르는 상대와 어떤 대화를 나누겠는가?",
  },
  {
    key: "conversationUnawareOfProblem",
    label:
      "자신에게 문제가 있는지조차 모르는 상대와 어떤 대화를 나누겠는가?",
  },
  {
    key: "conversationKnowsBookUndecided",
    label:
      "당신(이 책)과 해결 방법을 알지만 아직 선택·구매를 망설이는 상대와 어떤 대화를 나누겠는가?",
  },
] as const;

export type SalesPageAwarenessKey =
  (typeof SALES_PAGE_AWARENESS_QUESTIONS)[number]["key"];

export type SalesPageAwarenessAnswers = Record<
  SalesPageAwarenessKey,
  string
>;

export function emptyAwarenessAnswers(): SalesPageAwarenessAnswers {
  return {
    conversationKnowsGod: "",
    conversationKnowsProblemNotYou: "",
    conversationKnowsProblemNoSolution: "",
    conversationUnawareOfProblem: "",
    conversationKnowsBookUndecided: "",
  };
}
