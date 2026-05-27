import { NextResponse } from "next/server";

/** EPUB은 /read/[token]/epub 로만 제공 */
export async function GET() {
  return new Response("Gone — use /read/{token}/epub", { status: 410 });
}
