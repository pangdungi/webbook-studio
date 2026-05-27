/** 독자 링크 — 전체 화면 + 노치·홈 인디케이터 safe area */
export default function ReadTokenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 flex h-dvh max-h-dvh flex-col overflow-hidden"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {children}
    </div>
  );
}
