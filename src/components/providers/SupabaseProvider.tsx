"use client";

import type { ReactNode } from "react";
import { setSupabaseBrowserConfig } from "@/lib/supabase/client";

type Props = {
  url: string;
  anonKey: string;
  children: ReactNode;
};

/** 서버 런타임 env → 브라우저 Supabase 클라이언트 (Vercel 빌드 캐시와 무관) */
export function SupabaseProvider({ url, anonKey, children }: Props) {
  setSupabaseBrowserConfig({ url, anonKey });
  return children;
}
