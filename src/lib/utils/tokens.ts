import { nanoid } from "nanoid";
import { getReaderSiteUrl, getStudioSiteUrl } from "@/lib/utils/siteUrls";

export function generateAccessToken() {
  return nanoid(32);
}

/** @deprecated getStudioSiteUrl 사용 */
export function getSiteUrl() {
  return getStudioSiteUrl();
}

/** 독자 공유 링크 — READER_URL 도메인만 사용(출판 플랫폼과 분리) */
export function buildReaderUrl(token: string) {
  return `${getReaderSiteUrl()}/read/${token}`;
}
