"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const adminRequired = searchParams.get("error") === "admin_required";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [existingEmail, setExistingEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setExistingEmail(user?.email ?? null);
    });
  }, []);

  async function signOutExisting() {
    setLoading(true);
    setError("");
    const supabase = createClient();
    await supabase.auth.signOut();
    setExistingEmail(null);
    setLoading(false);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    try {
      if (existingEmail && existingEmail !== email.trim()) {
        await supabase.auth.signOut();
        setExistingEmail(null);
      }

      if (mode === "password") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) {
          setError(authError.message);
          setLoading(false);
          return;
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithOtp({ email });
        if (authError) {
          setError(authError.message);
          setLoading(false);
          return;
        }
        setError("이메일로 로그인 링크를 보냈습니다.");
        setLoading(false);
        return;
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "로그인 요청에 실패했습니다. 환경 변수 설정을 확인해 주세요.",
      );
      setLoading(false);
      return;
    }

    router.push(redirectTo.startsWith("/") ? redirectTo : "/");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {adminRequired && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          관리자 권한이 있는 계정으로 로그인해야 합니다.
        </p>
      )}

      {existingEmail && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-700">
          <p>
            <span className="font-medium">{existingEmail}</span>로 이미 로그인되어
            있습니다.
          </p>
          <p className="mt-1 text-stone-500">
            다른 계정으로 관리자 로그인하려면 먼저 로그아웃하세요.
          </p>
          <button
            type="button"
            onClick={() => void signOutExisting()}
            disabled={loading}
            className="mt-2 text-sm font-medium text-stone-900 underline disabled:opacity-50"
          >
            로그아웃
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">
            이메일
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
          />
        </div>

        {mode === "password" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              비밀번호
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
            />
          </div>
        )}

        {error && (
          <p
            className={`text-sm ${error.includes("보냈") ? "text-green-700" : "text-red-600"}`}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-stone-900 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "로그인 중..." : mode === "password" ? "로그인" : "매직 링크 받기"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "password" ? "magic" : "password")}
          className="w-full text-sm text-stone-500 hover:text-stone-900"
        >
          {mode === "password" ? "매직 링크로 로그인" : "비밀번호로 로그인"}
        </button>
      </form>
    </div>
  );
}
