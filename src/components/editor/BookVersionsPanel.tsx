"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildBookVersionSnapshot,
  formatAutoVersionLabel,
  snapshotFingerprint,
  type BookVersionSnapshot,
} from "@/lib/books/bookVersionSnapshot";
import { isLocalEditorClient } from "@/lib/editor/localEditorOnly";
import type { Book, Chapter } from "@/lib/types/database";

type VersionRow = {
  id: string;
  label: string;
  created_at: string;
};

type Props = {
  bookId: string;
  book: Book;
  chapters: Chapter[];
  onPreview: (snapshot: BookVersionSnapshot, label: string) => void;
  onRestored: (book: Book, chapters: Chapter[]) => void;
  onClose: () => void;
};

export function BookVersionsPanel({
  bookId,
  book,
  chapters,
  onPreview,
  onRestored,
  onClose,
}: Props) {
  const onLocal = isLocalEditorClient();
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/books/${bookId}/versions`, {
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(
        typeof data.error === "string"
          ? data.error
          : "버전 목록을 불러오지 못했습니다.",
      );
      return;
    }
    setVersions(data.versions ?? []);
  }, [bookId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveVersion = async (name: string) => {
    if (!onLocal) {
      window.alert("버전 저장·복원은 localhost 편집기에서만 가능합니다.");
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);
    const snapshot = buildBookVersionSnapshot(book, chapters);
    const res = await fetch(`/api/books/${bookId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: trimmed, snapshot }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(
        typeof data.error === "string" ? data.error : "버전 저장에 실패했습니다.",
      );
      return;
    }

    setLabel("");
    void load();
  };

  const openPreview = async (versionId: string, versionLabel: string) => {
    const res = await fetch(`/api/books/${bookId}/versions/${versionId}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.version?.snapshot) {
      setError("버전 내용을 불러오지 못했습니다.");
      return;
    }
    onPreview(data.version.snapshot as BookVersionSnapshot, versionLabel);
  };

  const restoreVersion = async (versionId: string, versionLabel: string) => {
    if (!onLocal) {
      window.alert("복원은 localhost 편집기에서만 가능합니다.");
      return;
    }
    if (
      !window.confirm(
        `「${versionLabel}」 내용으로 지금 책 전체를 되돌립니다.\n\n현재 편집 중인 내용은 덮어씌워집니다. 계속할까요?`,
      )
    ) {
      return;
    }

    setSaving(true);
    const res = await fetch(
      `/api/books/${bookId}/versions/${versionId}/restore`,
      { method: "POST" },
    );
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(
        typeof data.error === "string" ? data.error : "복원에 실패했습니다.",
      );
      return;
    }

    if (data.book && data.chapters) {
      onRestored(data.book as Book, data.chapters as Chapter[]);
    }
    void load();
  };

  const deleteVersion = async (versionId: string, versionLabel: string) => {
    if (!onLocal) return;
    if (!window.confirm(`「${versionLabel}」 버전 기록을 삭제할까요?`)) return;

    const res = await fetch(`/api/books/${bookId}/versions/${versionId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "삭제 실패");
      return;
    }
    void load();
  };

  return (
    <aside className="flex w-full shrink-0 flex-col border-l border-stone-200 bg-stone-50 md:w-80">
      <div className="flex items-center justify-between border-b border-stone-200 px-3 py-2">
        <h2 className="text-sm font-semibold text-stone-900">버전 기록</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-stone-500 hover:text-stone-800"
        >
          닫기
        </button>
      </div>

      <div className="border-b border-stone-200 px-3 py-3">
        {onLocal ? (
          <>
            <label className="block text-xs text-stone-500">버전 이름</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="예: 5월 31일 로컬 작업본"
              className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              disabled={saving || !label.trim()}
              onClick={() => void saveVersion(label)}
              className="mt-2 w-full rounded-lg bg-stone-900 py-2 text-xs font-medium text-white disabled:opacity-40"
            >
              {saving ? "저장 중…" : "이 이름으로 버전 저장"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveVersion(formatAutoVersionLabel())}
              className="mt-2 w-full rounded-lg border border-stone-300 py-2 text-xs text-stone-700"
            >
              지금 상태를 자동 이름으로 저장
            </button>
          </>
        ) : (
          <p className="text-xs leading-relaxed text-stone-600">
            배포 사이트에서는 <strong>보기만</strong> 가능합니다. 저장·복원은{" "}
            <strong>localhost</strong> 편집기에서 하세요.
          </p>
        )}
      </div>

      {error ? (
        <p className="whitespace-pre-wrap px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <p className="px-1 text-xs text-stone-500">불러오는 중…</p>
        ) : versions.length === 0 ? (
          <p className="px-1 text-xs text-stone-500">
            저장된 버전이 없습니다. 로컬에서 「전체 저장」 시 자동 버전이 쌓이거나,
            위에서 이름을 지정해 저장하세요.
          </p>
        ) : (
          <ul className="space-y-2">
            {versions.map((v) => (
              <li
                key={v.id}
                className="rounded-lg border border-stone-200 bg-white p-2"
              >
                <p className="text-sm font-medium text-stone-900">{v.label}</p>
                <p className="mt-0.5 text-[11px] text-stone-400">
                  {new Date(v.created_at).toLocaleString("ko-KR")}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => void openPreview(v.id, v.label)}
                    className="rounded border border-stone-200 px-2 py-0.5 text-[11px] text-stone-700 hover:bg-stone-50"
                  >
                    보기
                  </button>
                  {onLocal ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void restoreVersion(v.id, v.label)}
                        className="rounded border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] text-violet-900"
                      >
                        복원
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteVersion(v.id, v.label)}
                        className="rounded border border-red-200 px-2 py-0.5 text-[11px] text-red-700"
                      >
                        삭제
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

/** 전체 저장 성공 후 자동 버전 (같은 내용이면 생략) */
export async function createAutoBookVersionIfChanged(
  bookId: string,
  book: Book,
  chapters: Chapter[],
): Promise<void> {
  const snapshot = buildBookVersionSnapshot(book, chapters);
  const fp = snapshotFingerprint(snapshot);

  const listRes = await fetch(`/api/books/${bookId}/versions`, {
    cache: "no-store",
  });
  const listData = await listRes.json().catch(() => ({}));
  const latest = listData.versions?.[0];
  if (latest?.id) {
    const detailRes = await fetch(
      `/api/books/${bookId}/versions/${latest.id}`,
    );
    const detail = await detailRes.json().catch(() => ({}));
    if (
      detail.version?.snapshot &&
      snapshotFingerprint(detail.version.snapshot) === fp
    ) {
      return;
    }
  }

  await fetch(`/api/books/${bookId}/versions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      label: formatAutoVersionLabel(),
      snapshot,
    }),
  });
}
