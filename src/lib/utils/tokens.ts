import { nanoid } from "nanoid";

export function generateAccessToken() {
  return nanoid(32);
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function buildReaderUrl(token: string) {
  return `${getSiteUrl()}/read/${token}`;
}

export function buildClaimUrl(bookId: string) {
  const base = getSiteUrl().replace(/\/$/, "");
  return `${base}/claim?book=${bookId}`;
}
