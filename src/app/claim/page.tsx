import Link from "next/link";
import { ClaimForm } from "@/components/claim/ClaimForm";
import { createServiceClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ book?: string }>;
};

export default async function ClaimPage({ searchParams }: PageProps) {
  const { book: bookId } = await searchParams;

  if (!bookId) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-stone-900">수령 링크가 올바르지 않습니다</h1>
          <p className="mt-2 text-sm text-stone-500">
            아임웹 주문 안내에 포함된 전체 URL로 접속해 주세요.
          </p>
        </div>
      </main>
    );
  }

  const supabase = createServiceClient();
  const { data: book } = await supabase
    .from("books")
    .select("id, title, status")
    .eq("id", bookId)
    .single();

  if (!book || book.status !== "published") {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-stone-900">수령할 수 없습니다</h1>
          <p className="mt-2 text-sm text-stone-500">
            출판되지 않았거나 존재하지 않는 책입니다.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
          이북 수령
        </p>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">{book.title}</h1>
        <p className="mt-2 text-sm text-stone-500">
          아임웹에서 구매하신 뒤, 주문 확인 메일의 정보를 입력하면 바로 읽을 수
          있습니다.
        </p>
        <div className="mt-8">
          <ClaimForm bookId={book.id} bookTitle={book.title} />
        </div>
        <p className="mt-6 text-center text-xs text-stone-400">
          로그인 없이 바로 읽기 ·{" "}
          <Link href="/" className="underline hover:text-stone-600">
            Webbook Studio
          </Link>
        </p>
      </div>
    </main>
  );
}
