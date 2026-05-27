import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import {
  READER_SESSION_COOKIE,
  clearReaderSessionCookie,
  isReaderAllowedPath,
  isReaderPathForToken,
  parseReaderTokenFromPath,
  readerBookPath,
  readerCookieOptions,
} from "@/lib/access/readerSession";
import {
  isReaderOnlyHost,
  isStudioPlatformPath,
} from "@/lib/utils/siteUrls";

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

function attachReaderCookie(response: NextResponse, token: string, secure: boolean) {
  response.cookies.set(READER_SESSION_COOKIE, token, readerCookieOptions(secure));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hostname = request.nextUrl.hostname;
  const secure = request.nextUrl.protocol === "https:";
  const tokenFromPath = parseReaderTokenFromPath(pathname);
  const readerOnlySite = isReaderOnlyHost(hostname);

  /* 독자 전용 도메인: 출판 플랫폼 경로 없음 — /read 만 */
  if (readerOnlySite) {
    if (!isReaderAllowedPath(pathname)) {
      return new NextResponse("Not Found", { status: 404 });
    }

    let response = NextResponse.next({ request });
    if (tokenFromPath) {
      attachReaderCookie(response, tokenFromPath, secure);
    }
    return response;
  }

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

  let isAdmin = false;
  if (user) {
    const role = await getProfileRole(supabase, user.id);
    isAdmin = role === "admin";
  }

  /* 독자 링크 페이지 진입 시 쿠키 부여 (RSC보다 미들웨어가 확실함) */
  if (tokenFromPath && !isAdmin) {
    attachReaderCookie(supabaseResponse, tokenFromPath, secure);
  }

  const readerToken =
    request.cookies.get(READER_SESSION_COOKIE)?.value ??
    (tokenFromPath && !isAdmin ? tokenFromPath : undefined);

  /* 관리자는 플랫폼 사용 — 독자 잠금 쿠키 제거 */
  if (isAdmin && readerToken) {
    const onPlatform =
      pathname.startsWith("/admin") ||
      pathname === "/" ||
      pathname === "/login" ||
      pathname === "/signup" ||
      (pathname.startsWith("/api/") && !pathname.startsWith("/api/read"));

    if (onPlatform) {
      clearReaderSessionCookie(supabaseResponse, secure);
    }
  }

  /*
   * 스튜디오 도메인(webbook-studio.vercel.app): /·/admin 등에서는 독자 잠금 없음.
   * 독자 잠금은 독자 전용 도메인 또는 /read/... 경로에서만.
   */
  const readerLockActive =
    readerOnlySite || pathname.startsWith("/read/");

  if (!readerOnlySite && isStudioPlatformPath(pathname) && readerToken) {
    clearReaderSessionCookie(supabaseResponse, secure);
  } else if (readerLockActive && readerToken && !isAdmin) {
  /* 독자: /read/본인토큰·epub·정적 파일만, 나머지는 책으로 되돌림 */
    if (pathname.startsWith("/api/")) {
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

    if (tokenFromPath) {
      attachReaderCookie(supabaseResponse, readerToken, secure);
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
