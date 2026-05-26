"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DevicePreviewModal } from "@/components/reader/DevicePreviewModal";
import { createClient } from "@/lib/supabase/client";
import type { Book } from "@/lib/types/database";

type BookListItem = Book & { readerUrl: string | null };

export function BookDashboard() {
  const router = useRouter();
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewBookId, setPreviewBookId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const copyReaderUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    alert("독자 링크가 클립보드에 복사되었습니다.");
  };

  const deleteBook = async (book: BookListItem) => {
    const label =
      book.title.trim() || "제목 없음";
    if (
      !window.confirm(
        `「${label}」을(를) 삭제할까요?\n\n챕터·독자 링크·출판 파일이 모두 지워지며 되돌릴 수 없습니다.`,
      )
    ) {
      return;
    }

    setDeletingId(book.id);
    const res = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
    setDeletingId(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "삭제에 실패했습니다.");
      return;
    }

    setBooks((prev) => prev.filter((b) => b.id !== book.id));
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
            책마다 독자 링크는 하나입니다. 출판할 때마다 같은 링크에 최신
            내용이 반영됩니다.
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
          {books.map((book) => {
            const isPublished = book.status === "published";

            return (
              <article
                key={book.id}
                className="flex flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-stone-900">{book.title}</h2>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      isPublished
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {isPublished ? "출판됨" : "초안"}
                  </span>
                </div>

                <p className="mb-4 text-xs leading-relaxed text-stone-500">
                  {isPublished ? (
                    <>
                      독자에게 공개 중입니다. 편집 후 다시 「출판」하면 아래
                      링크는 그대로, 내용만 바뀝니다.
                    </>
                  ) : (
                    <>
                      아직 독자에게 보이지 않습니다. 편집기에서 「출판」하면
                      아래 링크로 열립니다.
                    </>
                  )}
                </p>

                {book.subtitle && (
                  <p className="mb-3 text-sm text-stone-500">{book.subtitle}</p>
                )}

                {book.readerUrl ? (
                  <div className="mb-4 rounded-lg bg-stone-50 p-3">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                      독자 링크
                    </p>
                    <p className="break-all font-mono text-[11px] leading-relaxed text-stone-700">
                      {book.readerUrl}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyReaderUrl(book.readerUrl!)}
                      className="mt-2 text-xs font-medium text-stone-800 hover:underline"
                    >
                      링크 복사
                    </button>
                    {!isPublished && (
                      <p className="mt-2 text-[11px] text-amber-700">
                        출판 전까지 이 주소는 「준비 중」으로 보입니다.
                      </p>
                    )}
                  </div>
                ) : null}

                <div className="mt-auto flex flex-wrap gap-2">
                  <Link
                    href={`/admin/books/${book.id}/edit`}
                    className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    편집
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPreviewBookId(book.id)}
                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-700"
                  >
                    미리보기
                  </button>
                  {isPublished && book.readerUrl && (
                    <a
                      href={book.readerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-700"
                    >
                      독자 화면
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteBook(book)}
                    disabled={deletingId === book.id}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 disabled:opacity-50"
                  >
                    {deletingId === book.id ? "삭제 중…" : "삭제"}
                  </button>
                </div>
              </article>
            );
          })}
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
