import { NextResponse } from "next/server";

/** 독자용 데이터는 /read/[token] 서버 페이지에서 처리 — 이 API는 사용하지 않음 */
export async function GET() {
  return NextResponse.json(
    { error: "Use the reader link (/read/...) only." },
    { status: 410 },
  );
}
