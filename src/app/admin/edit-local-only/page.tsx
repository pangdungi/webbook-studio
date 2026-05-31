import Link from "next/link";
import { localEditorUrl } from "@/lib/editor/localEditorOnly";

type PageProps = {
  searchParams: Promise<{ bookId?: string }>;
};

export default async function EditLocalOnlyPage({ searchParams }: PageProps) {
  const { bookId } = await searchParams;
  const localEditHref = bookId
    ? localEditorUrl(`/admin/books/${bookId}/edit`)
    : localEditorUrl("/");

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-bold text-stone-900">편집은 로컬에서만</h1>
      <p className="mt-4 text-sm leading-relaxed text-stone-600">
        배포 사이트(도메인)에서는 <strong>읽기·미리보기·링크 복사</strong>만 하고, 글
        수정·저장·출판은 <strong>로컬 개발 서버</strong>에서만 할 수 있습니다. 로컬과
        웹을 같이 쓰면 내용이 섞일 수 있어서 막아 두었습니다.
      </p>
      <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-stone-700">
        <li>터미널에서 프로젝트 폴더로 이동</li>
        <li>
          <code className="rounded bg-stone-100 px-1.5 py-0.5">npm run dev</code> 실행
        </li>
        <li>아래 버튼으로 로컬 편집기 열기</li>
      </ol>
      <a
        href={localEditHref}
        className="mt-8 inline-flex justify-center rounded-lg bg-stone-900 px-5 py-3 text-sm font-medium text-white hover:bg-stone-800"
      >
        로컬 편집기 열기 ({localEditorUrl("")})
      </a>
      <Link
        href="/"
        className="mt-4 text-center text-sm text-stone-500 underline hover:text-stone-800"
      >
        책 목록으로 (배포 사이트)
      </Link>
    </main>
  );
}
