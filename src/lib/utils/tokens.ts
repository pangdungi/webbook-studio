import { nanoid } from "nanoid";

export function generateAccessToken() {
  return nanoid(32);
}

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;

  const vercel = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercel) return vercel.startsWith("http") ? vercel : `https://${vercel}`;

  return "http://localhost:3000";
}

export function buildReaderUrl(token: string) {
  return `${getSiteUrl()}/read/${token}`;
}
