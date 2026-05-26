import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm text-stone-500 hover:text-stone-900">
          ← 홈
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-stone-900">관리자 로그인</h1>
        <p className="mt-2 text-sm text-stone-500">
          작성 및 출판 기능은 관리자 계정만 사용할 수 있습니다.
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
