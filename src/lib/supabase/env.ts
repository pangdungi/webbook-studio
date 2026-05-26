const SUPABASE_HOST_RE = /\.supabase\.(co|in|red)(:\d+)?$/;

export function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다. Supabase 대시보드 → Settings → API의 Project URL을 넣으세요.",
    );
  }

  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL 형식이 올바르지 않습니다: ${url}`,
    );
  }

  if (!SUPABASE_HOST_RE.test(host)) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (siteUrl && url === siteUrl.replace(/\/$/, "")) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL에 배포 사이트 주소(webbook-studio.vercel.app)가 들어가 있습니다. Supabase Project URL(예: https://xxxx.supabase.co)로 바꿔 주세요.",
      );
    }
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL은 Supabase Project URL이어야 합니다. 현재: ${url}`,
    );
  }

  return url;
}

export function getSupabaseAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다. Supabase 대시보드 → Settings → API의 anon/public key를 넣으세요.",
    );
  }
  return key;
}
