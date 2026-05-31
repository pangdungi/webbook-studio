import { contentPageDocToHtml } from "@/lib/editor/pageContentHtml";
import {
  buildPageLeadHtml,
  splitPageContentLead,
} from "@/lib/pages/pageTitle";
import type { BookPage } from "@/lib/pages/types";

/** page.content_html — 부제목 포함 (백업·복구용) */
export function buildContentPageStorageHtml(page: BookPage): string {
  if (page.kind !== "content") return page.content_html ?? "";
  const { lead, bodyDoc } = splitPageContentLead(page);
  const leadHtml = lead ? buildPageLeadHtml(lead) : "";
  const bodyHtml =
    contentPageDocToHtml(bodyDoc).trim() || '<p class="book-body-p"></p>';
  return `${leadHtml}${bodyHtml}`;
}
