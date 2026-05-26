"use client";

import { useState } from "react";

type Props = {
  bookId: string;
  bookTitle: string;
};

export function ClaimForm({ bookId, bookTitle }: Props) {
  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [readerUrl, setReaderUrl] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setReaderUrl("");

    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_id: bookId,
          email,
          order_id: orderId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "수령에 실패했습니다.");
        return;
      }
      setReaderUrl(data.url);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (readerUrl) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          「{bookTitle}」 읽기 링크가 준비되었습니다.
        </p>
        <a
          href={readerUrl}
          className="flex w-full items-center justify-center rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800"
        >
          지금 읽기
        </a>
        <p className="break-all text-center text-xs text-stone-500">{readerUrl}</p>
        <p className="text-center text-xs text-stone-400">
          링크를 북마크해 두시면 다시 열 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="claim-email" className="mb-1 block text-sm font-medium text-stone-700">
          구매 이메일
        </label>
        <input
          id="claim-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="아임웹 주문 시 입력한 이메일"
          className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-stone-400"
        />
      </div>
      <div>
        <label htmlFor="claim-order" className="mb-1 block text-sm font-medium text-stone-700">
          주문번호
        </label>
        <input
          id="claim-order"
          type="text"
          required
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="아임웹 주문 확인 메일에 있는 번호"
          className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-stone-400"
        />
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
      >
        {loading ? "링크 만드는 중…" : "읽기 링크 받기"}
      </button>
    </form>
  );
}
