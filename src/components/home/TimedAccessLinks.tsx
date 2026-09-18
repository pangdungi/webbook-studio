"use client";

import { useCallback, useEffect, useState } from "react";
import { CopyField } from "@/components/home/CopyField";

type TrialLink = {
  url: string;
  trial_days: number | null;
  created_at: string;
};

type Props = {
  bookId: string;
  bookTitle: string;
  isPublished: boolean;
};

export function TimedAccessLinks({ bookId, bookTitle, isPublished }: Props) {
  const [trial, setTrial] = useState<TrialLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadTrial = useCallback(async () => {
    const res = await fetch(`/api/access/${bookId}/timed`);
    const data = await res.json().catch(() => ({}));
    setTrial(data.trial ?? null);
    setLoading(false);
  }, [bookId]);

  useEffect(() => {
    void loadTrial();
  }, [loadTrial]);

  const ensureTrialLink = async () => {
    if (!isPublished) {
      window.alert("먼저 책을 출판한 뒤 7일권 링크를 만들 수 있습니다.");
      return;
    }

    setCreating(true);
    const res = await fetch(`/api/access/${bookId}/timed`, { method: "POST" });
    setCreating(false);

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.trial) {
      window.alert(data.error ?? "7일권 링크 생성에 실패했습니다.");
      return;
    }

    setTrial(data.trial as TrialLink);
  };

  return (
    <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-violet-950">7일권 독자 링크</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-violet-900/80">
            책당 주소 <strong>하나</strong>입니다. 체험자 전원에게 같은 URL을
            보내면, <strong>각자 처음 연 순간</strong>부터 7일간 볼 수
            있습니다. 영구 링크는 위와 별개입니다.
          </p>
        </div>
        {!trial ? (
          <button
            type="button"
            onClick={() => void ensureTrialLink()}
            disabled={creating || !isPublished || loading}
            className="shrink-0 rounded-lg bg-violet-900 px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-50"
          >
            {creating ? "만드는 중…" : "7일권 링크 만들기"}
          </button>
        ) : null}
      </div>

      {!isPublished ? (
        <p className="mt-2 text-[11px] text-violet-800/70">
          출판 후 이용 가능합니다.
        </p>
      ) : null}

      {loading ? (
        <p className="mt-2 text-[11px] text-violet-800/70">불러오는 중…</p>
      ) : trial ? (
        <div className="mt-3">
          <CopyField
            label={`「${bookTitle}」 7일권 (공유용)`}
            value={trial.url}
            hint="이 주소 하나를 체험자에게 보내세요 · 사람마다 첫 클릭 시점부터 7일"
          />
        </div>
      ) : isPublished ? (
        <p className="mt-2 text-[11px] text-violet-800/70">
          아직 7일권 링크가 없습니다. 위 버튼으로 한 번만 만드세요.
        </p>
      ) : null}
    </div>
  );
}
