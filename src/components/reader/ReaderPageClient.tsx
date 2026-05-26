"use client";

import { useEffect, useState } from "react";
import { WebBookReader } from "@/components/reader/WebBookReader";
import type { WritingMode } from "@/lib/types/database";

type Props = {
  token: string;
};

export function ReaderPageClient({ token }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [epubUrl, setEpubUrl] = useState("");
  const [title, setTitle] = useState("");
  const [writingMode, setWritingMode] = useState<WritingMode>("horizontal-tb");

  useEffect(() => {
    fetch(`/api/read/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setEpubUrl(data.epubUrl);
          setTitle(data.title);
          setWritingMode(data.writingMode);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("책을 불러올 수 없습니다.");
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-stone-100">
        <p className="text-stone-500">책을 여는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-stone-100 px-4">
        <p className="text-lg font-medium text-stone-900">접근할 수 없습니다</p>
        <p className="mt-2 text-sm text-stone-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0">
      <WebBookReader
        epubUrl={epubUrl}
        title={title}
        writingMode={writingMode}
      />
    </div>
  );
}
