"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DevicePreviewModal } from "@/components/reader/DevicePreviewModal";
import { CopyField } from "@/components/home/CopyField";
import { createClient } from "@/lib/supabase/client";
import type { Book, BookAccessToken } from "@/lib/types/database";
import { buildClaimUrl } from "@/lib/utils/tokens";

type TokenWithUrl = BookAccessToken & { url: string };

export function BookDashboard() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Record<string, TokenWithUrl[]>>({});
  const [previewBookId, setPreviewBookId] = useState<string | null>(null);

  const loadBooks = useCallback(async () => {
    const res = await fetch("/api/books");
    const data = await res.json();
    setBooks(data.books ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const createBook = async () => {
    const res = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "새 책" }),
    });
    const data = await res.json();
    if (data.book) {
      router.push(`/admin/books/${data.book.id}/edit`);
    }
  };

  const loadTokens = async (bookId: string) => {
    const res = await fetch(`/api/access/${bookId}`);
    const data = await res.json();
    setTokens((prev) => ({ ...prev, [bookId]: data.tokens ?? [] }));
    setExpandedBook(bookId);
  };

  const createToken = async (bookId: string) => {
    const res = await fetch(`/api/access/${bookId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "general" }),
    });
    const data = await res.json();
    if (data.url) {
      await loadTokens(bookId);
      await navigator.clipboard.writeText(data.url);
      alert("독자 링크가 생성되어 클립보드에 복사되었습니다.");
    }
  };

  const revokeToken = async (bookId: string, tokenId: string) => {
    await fetch(`/api/access/${bookId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenId }),
    });
    await loadTokens(bookId);
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  if (loading) {
    return <p className="text-stone-500">불러오는 중...</p>;
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">내 책</h1>
          <p className="mt-1 text-sm text-stone-500">
            작성, 출판, 독자 링크를 관리하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={createBook}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white"
          >
            + 새 책
          </button>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600"
          >
            로그아웃
          </button>
        </div>
      </div>

      {books.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 p-12 text-center">
          <p className="text-stone-500">아직 책이 없습니다.</p>
          <button
            type="button"
            onClick={createBook}
            className="mt-4 text-sm font-medium text-stone-900 underline"
          >
            첫 책 만들기
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <article
              key={book.id}
              className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <h2 className="font-semibold text-stone-900">{book.title}</h2>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                    book.status === "published"
                      ? "bg-green-100 text-green-800"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {book.status === "published" ? "출판됨" : "초안"}
                </span>
              </div>

              {book.subtitle && (
                <p className="mb-3 text-sm text-stone-500">{book.subtitle}</p>
              )}

              <div className="mb-3 space-y-2">
                <CopyField label="책 ID" value={book.id} />
                {book.status === "published" && (
                  <CopyField
                    label="수령 페이지 (아임웹 주문 안내용)"
                    value={buildClaimUrl(book.id)}
                    hint="구매자가 이메일·주문번호 입력 후 읽기 링크를 받는 주소"
                  />
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/books/${book.id}/edit`}
                  className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white"
                >
                  편집
                </Link>
                {book.status === "published" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPreviewBookId(book.id)}
                      className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-700"
                    >
                      독자 미리보기
                    </button>
                    <button
                      type="button"
                      onClick={() => loadTokens(book.id)}
                      className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-700"
                    >
                      링크 관리
                    </button>
                    <button
                      type="button"
                      onClick={() => createToken(book.id)}
                      className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-700"
                    >
                      링크 생성
                    </button>
                  </>
                )}
              </div>

              {expandedBook === book.id && tokens[book.id] && (
                <div className="mt-4 space-y-2 border-t border-stone-100 pt-4">
                  {tokens[book.id].length === 0 ? (
                    <p className="text-xs text-stone-400">링크 없음</p>
                  ) : (
                    tokens[book.id].map((t) => (
                      <div
                        key={t.id}
                        className="rounded-lg bg-stone-50 p-2 text-xs"
                      >
                        <p className="truncate font-mono text-stone-600">
                          {t.url}
                        </p>
                        <div className="mt-1 flex gap-2">
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(t.url)}
                            className="text-stone-700 hover:underline"
                          >
                            복사
                          </button>
                          {!t.revoked_at && (
                            <button
                              type="button"
                              onClick={() => revokeToken(book.id, t.id)}
                              className="text-red-600 hover:underline"
                            >
                              폐기
                            </button>
                          )}
                          {t.revoked_at && (
                            <span className="text-red-500">폐기됨</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {previewBookId && (
        <DevicePreviewModal
          bookId={previewBookId}
          open={Boolean(previewBookId)}
          onClose={() => setPreviewBookId(null)}
        />
      )}
    </div>
  );
}
