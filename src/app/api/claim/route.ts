import { NextResponse } from "next/server";
import { issueReaderLinkForPurchase } from "@/lib/claim/issueReaderLink";
import { createServiceClient } from "@/lib/supabase/server";

/** GET — 수령 페이지에 표시할 책 정보 */
export async function GET(request: Request) {
  const bookId = new URL(request.url).searchParams.get("book");
  if (!bookId) {
    return NextResponse.json({ error: "book 파라미터가 필요합니다." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: book } = await supabase
    .from("books")
    .select("id, title, status")
    .eq("id", bookId)
    .single();

  if (!book || book.status !== "published") {
    return NextResponse.json({ error: "수령할 수 있는 책이 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ bookId: book.id, title: book.title });
}

/** POST — 주문번호로 독서 링크 발급 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const bookId = typeof body.book_id === "string" ? body.book_id : "";
  const orderId = typeof body.order_id === "string" ? body.order_id : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!bookId) {
    return NextResponse.json({ error: "책 정보가 없습니다." }, { status: 400 });
  }
  if (!orderId.trim()) {
    return NextResponse.json({ error: "주문번호를 입력해 주세요." }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "이메일을 확인해 주세요." }, { status: 400 });
  }

  const result = await issueReaderLinkForPurchase(bookId, orderId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    url: result.url,
    title: result.title,
    reused: result.reused,
  });
}
