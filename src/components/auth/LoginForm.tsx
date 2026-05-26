"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

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

    router.push("/");
    router.refresh();
  }

  return (
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
        <p className={`text-sm ${error.includes("보냈") ? "text-green-700" : "text-red-600"}`}>
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
  );
}
