import Link from "next/link";
import { BookDashboard } from "@/components/home/BookDashboard";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/admin";

export default async function HomePage() {
  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;
  const isAdmin = profile?.role === "admin";

  return (
    <main className="mx-auto min-h-[100dvh] max-w-6xl px-4 py-10">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-stone-400">
            Webbook Studio
          </p>
          <h1 className="mt-1 text-3xl font-bold text-stone-900">
            웹북 출판 플랫폼
          </h1>
        </div>
        {!isAdmin && (
          <Link
            href="/login"
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white"
          >
            관리자 로그인
          </Link>
        )}
      </header>

      {isAdmin ? (
        <BookDashboard />
      ) : (
        <section className="rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-stone-900">
            독자용 웹북 리더
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone-500">
            구매하신 책의 매직링크로 접속하시면 이북처럼 읽으실 수 있습니다.
            작성 및 출판은 관리자만 가능합니다.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-stone-900 underline"
          >
            관리자이신가요? 로그인하기
          </Link>
        </section>
      )}
    </main>
  );
}
