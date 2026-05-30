/**
 * 서버 저장 실패·탭 종료 대비 — 브라우저 localStorage 백업만.
 * 자동으로 화면·서버를 덮지 않음. 사용자가 「이 장 백업 불러오기」를 눌렀을 때만 해당 장에 적용.
 */

export type ChapterDraftBackup = {
  bookId: string;
  chapterId: string;
  contentJson: Record<string, unknown>;
  contentHtml: string;
  savedAt: number;
};

function storageKey(bookId: string, chapterId: string) {
  return `wbs-chapter-draft:${bookId}:${chapterId}`;
}

export function writeChapterDraft(backup: ChapterDraftBackup) {
  try {
    localStorage.setItem(
      storageKey(backup.bookId, backup.chapterId),
      JSON.stringify(backup),
    );
  } catch {
    /* 용량 초과 등 — 무시 */
  }
}

export function readChapterDraft(
  bookId: string,
  chapterId: string,
): ChapterDraftBackup | null {
  try {
    const raw = localStorage.getItem(storageKey(bookId, chapterId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChapterDraftBackup;
    if (
      parsed?.bookId !== bookId ||
      parsed?.chapterId !== chapterId ||
      !parsed.contentJson
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearChapterDraft(bookId: string, chapterId: string) {
  try {
    localStorage.removeItem(storageKey(bookId, chapterId));
  } catch {
    /* ignore */
  }
}

export function draftIsNewerThanChapter(
  draft: ChapterDraftBackup,
  chapterUpdatedAt: string,
): boolean {
  const serverMs = Date.parse(chapterUpdatedAt);
  if (Number.isNaN(serverMs)) return true;
  return draft.savedAt > serverMs + 500;
}

export function draftContentDiffers(
  draft: ChapterDraftBackup,
  serverJson: Record<string, unknown>,
): boolean {
  try {
    return (
      JSON.stringify(draft.contentJson) !== JSON.stringify(serverJson)
    );
  } catch {
    return true;
  }
}
