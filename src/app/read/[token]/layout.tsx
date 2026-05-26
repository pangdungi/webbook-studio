/** 독자 링크 — 전체 화면 고정 (스크롤/페이지 높이를 미리보기와 동일하게) */
export default function ReadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex h-dvh max-h-dvh flex-col overflow-hidden">
      {children}
    </div>
  );
}
