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
        "서버에 더 새로운 저장이 있어 이 내용을 올리지 못했습니다.",
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

export function chapterSavePayloadKey(parts: {
  contentJson: Record<string, unknown>;
  contentHtml: string;
  title?: string;
}): string {
  return `${parts.title ?? ""}\0${parts.contentHtml}\0${JSON.stringify(parts.contentJson)}`;
}

/** 서버에 이미 같은 내용이 올라간 경우(자동저장 겹침) */
export function chapterMatchesSavePayload(
  chapter: Chapter,
  payload: {
    contentJson: Record<string, unknown>;
    contentHtml: string;
    title?: string;
  },
): boolean {
  const json = chapter.content_json as Record<string, unknown> | null;
  return (
    chapterSavePayloadKey({
      contentJson: json ?? {},
      contentHtml: chapter.content_html ?? "",
      title: chapter.title,
    }) === chapterSavePayloadKey(payload)
  );
}

export function chapterBaselinesMatch(
  serverUpdatedAt: string,
  clientUpdatedAt: string,
): boolean {
  const serverMs = Date.parse(serverUpdatedAt);
  const clientMs = Date.parse(clientUpdatedAt);
  if (Number.isNaN(serverMs) || Number.isNaN(clientMs)) {
    return serverUpdatedAt === clientUpdatedAt;
  }
  return Math.abs(serverMs - clientMs) < 2000;
}

/** 배포·다른 PC 등 진짜 외부 충돌 — 짧은 간격은 같은 탭 자동저장 겹침 */
export function isExternalChapterConflict(
  serverUpdatedAt: string,
  clientUpdatedAt: string,
): boolean {
  if (chapterBaselinesMatch(serverUpdatedAt, clientUpdatedAt)) return false;
  const serverMs = Date.parse(serverUpdatedAt);
  const clientMs = Date.parse(clientUpdatedAt);
  if (Number.isNaN(serverMs) || Number.isNaN(clientMs)) return true;
  if (serverMs <= clientMs) return false;
  return serverMs - clientMs > 60_000;
}
