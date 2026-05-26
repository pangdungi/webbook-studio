import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** 개발 서버 하단 Next.js(N) 배지 — 독자 화면 테스트 시 노출 방지 */
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  serverExternalPackages: ["epub-gen-memory"],
};

export default nextConfig;
