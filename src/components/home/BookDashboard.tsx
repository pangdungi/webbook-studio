"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CopyField } from "@/components/home/CopyField";
import { createClient } from "@/lib/supabase/client";
import type { Book } from "@/lib/types/database";

type BookListItem = Book & { readerUrl: string | null };

export function BookDashboard() {
  const router = useRouter();
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [loading, setLoading] = useState(true);
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
        <>
          <section className="mb-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-900">
              책별 독자 링크
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              책마다 주소가 다릅니다. 아래에서 제목과 링크를 한눈에 확인하세요.
            </p>
            <ul className="mt-3 divide-y divide-stone-100">
              {books.map((book) => {
                const title = book.title.trim() || "제목 없음";
                return (
                  <li
                    key={book.id}
                    className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0 shrink-0 sm:w-40">
                      <p className="font-medium text-stone-900">{title}</p>
                      <p className="text-[10px] text-stone-400">
                        {book.status === "published" ? "출판됨" : "초안"} · ID{" "}
                        {book.id.slice(0, 8)}…
                      </p>
                    </div>
                    {book.readerUrl ? (
                      <p className="min-w-0 flex-1 break-all font-mono text-[11px] leading-relaxed text-stone-700">
                        {book.readerUrl}
                      </p>
                    ) : (
                      <p className="text-xs text-stone-400">링크 없음</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => {
            const isPublished = book.status === "published";
            const displayTitle = book.title.trim() || "제목 없음";
            const idHint = book.id.slice(0, 8);

            return (
              <article
                key={book.id}
                className="flex flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-stone-900">{displayTitle}</h2>
                    <p className="mt-0.5 font-mono text-[10px] text-stone-400">
                      ID {idHint}…
                    </p>
                  </div>
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
                  <div className="mb-4">
                    <CopyField
                    label={`「${displayTitle}」 독자 링크`}
                    value={book.readerUrl}
                    hint={
                      isPublished
                        ? "이 책 전용 주소입니다. txt·아임웹에 이 링크만 넣으세요."
                        : "출판 전까지는 열리지 않습니다. 출판 후 같은 주소로 읽을 수 있습니다."
                    }
                  />
                  </div>
                ) : null}

                <div className="mt-auto flex flex-wrap gap-2">
                  <Link
                    href={`/admin/books/${book.id}/edit`}
                    className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    편집
                  </Link>
                  <a
                    href={`/admin/books/${book.id}/preview`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
                  >
                    미리보기
                  </a>
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
        </>
      )}

    </div>
  );
}
