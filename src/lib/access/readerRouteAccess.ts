import {
  attachTrialVisitorCookie,
  readTrialVisitorKey,
} from "@/lib/access/readerAccessCookies";
import {
  validateReaderAccess,
  type ReaderAccessResult,
} from "@/lib/access/validate";
import { NextResponse, type NextRequest } from "next/server";

function cookieValue(request: NextRequest, name: string): string | undefined {
  return request.cookies.get(name)?.value;
}

export async function validateReaderRouteAccess(
  request: NextRequest,
  tokenValue: string,
): Promise<ReaderAccessResult> {
  const visitorKey = readTrialVisitorKey(tokenValue, (name) =>
    cookieValue(request, name),
  );
  return validateReaderAccess(tokenValue, visitorKey);
}

export function applyTrialVisitorCookie(
  response: NextResponse,
  tokenValue: string,
  access: ReaderAccessResult,
  secure: boolean,
) {
  if (access.newVisitorKey) {
    attachTrialVisitorCookie(
      response,
      tokenValue,
      access.newVisitorKey,
      secure,
    );
  }
  return response;
}

export function applyTrialVisitorCookieToResponse(
  response: Response,
  tokenValue: string,
  access: ReaderAccessResult,
  secure: boolean,
): Response {
  if (!access.newVisitorKey) return response;

  const headers = new Headers(response.headers);
  const cookie = NextResponse.next();
  attachTrialVisitorCookie(cookie, tokenValue, access.newVisitorKey, secure);
  const setCookie = cookie.headers.get("set-cookie");
  if (setCookie) headers.append("Set-Cookie", setCookie);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
