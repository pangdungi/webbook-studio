"use client";

import { useEffect } from "react";
import { isLocalEditorClient } from "@/lib/editor/localEditorOnly";

/** 배포 URL에서 편집기 HTML이 뜨는 경우(캐시·미들웨어 누락) 즉시 차단 */
export function LocalEditorGate({
  bookId,
  children,
}: {
  bookId: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!isLocalEditorClient()) {
      window.location.replace(`/admin/edit-local-only?bookId=${bookId}`);
    }
  }, [bookId]);

  if (typeof window !== "undefined" && !isLocalEditorClient()) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-stone-50 text-sm text-stone-600">
        편집은 로컬에서만 가능합니다. 이동 중…
      </div>
    );
  }

  return children;
}
