import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import {
  READER_SESSION_COOKIE,
  isReaderAllowedPath,
  isReaderPathForToken,
  readerBookPath,
} from "@/lib/access/readerSession";

async function getProfileRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return profile?.role ?? null;
}

function redirectToReaderBook(request: NextRequest, token: string) {
  const url = request.nextUrl.clone();
  url.pathname = readerBookPath(token);
  url.search = "";
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const readerToken = request.cookies.get(READER_SESSION_COOKIE)?.value;

  let isAdmin = false;
  if (user) {
    const role = await getProfileRole(supabase, user.id);
    isAdmin = role === "admin";
  }

  /* 관리자는 플랫폼 사용 — 독자 잠금 쿠키 제거 */
  if (isAdmin && readerToken) {
    if (
      pathname.startsWith("/admin") ||
      pathname === "/" ||
      pathname === "/login" ||
      pathname.startsWith("/api/") && !pathname.startsWith("/api/read")
    ) {
      supabaseResponse.cookies.delete(READER_SESSION_COOKIE);
    }
  }

  /* 독자 링크로 들어온 세션: /read/해당토큰 과 EPUB·정적 리소스만 */
  if (readerToken && !isAdmin) {
    if (pathname.startsWith("/api/read")) {
      return redirectToReaderBook(request, readerToken);
    }

    if (!isReaderAllowedPath(pathname)) {
      return redirectToReaderBook(request, readerToken);
    }

    if (
      pathname.startsWith("/read/") &&
      !isReaderPathForToken(pathname, readerToken)
    ) {
      return redirectToReaderBook(request, readerToken);
    }

    return supabaseResponse;
  }

  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      url.searchParams.set("error", "admin_required");
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/login" && user && isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = request.nextUrl.searchParams.get("redirect") || "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
