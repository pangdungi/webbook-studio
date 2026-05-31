import { NextResponse } from "next/server";
import { isLocalDevHostname } from "@/lib/editor/localEditorOnly";

const LOCAL_EDITOR_MESSAGE =
  "편집·저장은 로컬(localhost)에서만 가능합니다. npm run dev 로 연 뒤 작업하세요.";

export function requestHostname(request: Request): string {
  const raw =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  return raw.split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
}

export function isLocalEditorRequest(request: Request): boolean {
  return isLocalDevHostname(requestHostname(request));
}

/** 배포 URL에서 편집 API — 미들웨어 없어도 403 */
export function blockNonLocalEditorMutation(request: Request): NextResponse | null {
  if (isLocalEditorRequest(request)) return null;
  return NextResponse.json({ error: LOCAL_EDITOR_MESSAGE }, { status: 403 });
}
