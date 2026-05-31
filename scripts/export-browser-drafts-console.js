/**
 * localhost 편집기 → F12 콘솔에 붙여넣기
 * 이 책의 브라우저 장 백업을 JSON 파일로 받습니다.
 */
(function exportWbsDrafts() {
  const bookId = location.pathname.match(
    /\/admin\/books\/([^/]+)\/edit/,
  )?.[1];
  if (!bookId) {
    alert("편집기 URL(/admin/books/.../edit)에서 실행하세요.");
    return;
  }

  const prefix = `wbs-chapter-draft:${bookId}:`;
  const drafts = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(prefix)) continue;
    try {
      drafts.push(JSON.parse(localStorage.getItem(key)));
    } catch {
      /* ignore */
    }
  }

  if (drafts.length === 0) {
    alert(
      "이 브라우저에 장 백업이 없습니다.\n로컬에서 작업하던 Chrome 창·프로필에서 다시 시도하세요.",
    );
    return;
  }

  const blob = new Blob([JSON.stringify(drafts, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `drafts-${bookId.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);

  const preview = drafts.flatMap((d) => {
    const pages = d.contentJson?.pages || [];
    return pages
      .filter((p) => p.kind === "content")
      .map((p) => p.title || "(부제목 없음)");
  });
  console.log("백업 장 수:", drafts.length);
  console.log("부제목 미리보기:", preview);
  alert(
    `백업 ${drafts.length}개 장을 drafts-....json 으로 받았습니다.\n\n터미널:\nDRAFTS_JSON=./drafts-....json RECOVER_BOOK_ID=${bookId} node scripts/restore-chapters-from-browser-drafts.mjs`,
  );
})();
