import type { Chapter } from "@/lib/types/database";

export const STALE_CHAPTER_CODE = "STALE_CHAPTER";

export class ChapterSaveConflictError extends Error {
  readonly code = STALE_CHAPTER_CODE;
  readonly chapter?: Chapter;

  constructor(message: string, chapter?: Chapter) {
    super(message);
    this.name = "ChapterSaveConflictError";
    this.chapter = chapter;
  }
}

export function isChapterSaveConflict(err: unknown): err is ChapterSaveConflictError {
  return err instanceof ChapterSaveConflictError;
}

type PatchJson = {
  error?: string;
  code?: string;
  chapter?: Chapter;
};

export async function parseChapterPatchResponse(
  res: Response,
): Promise<Chapter> {
  const data = (await res.json().catch(() => ({}))) as PatchJson;

  if (
    res.status === 409 &&
    data.code === STALE_CHAPTER_CODE &&
    data.chapter
  ) {
    throw new ChapterSaveConflictError(
      data.error ??
        "다른 탭·다른 주소(로컬/배포)에서 더 최근에 저장된 내용이 있습니다.",
      data.chapter,
    );
  }

  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "저장에 실패했습니다.",
    );
  }

  if (!data.chapter) {
    throw new Error("저장 응답이 올바르지 않습니다.");
  }

  return data.chapter;
}

export function serverChapterIsNewer(
  serverUpdatedAt: string,
  baselineUpdatedAt: string,
): boolean {
  const serverMs = Date.parse(serverUpdatedAt);
  const baseMs = Date.parse(baselineUpdatedAt);
  if (Number.isNaN(serverMs) || Number.isNaN(baseMs)) return false;
  return serverMs > baseMs + 500;
}
