import type { ImageAlignValue } from "@/components/editor/ImageAlignExtension";

/** 페이지(열) 모드 — margin:auto / width:100%는 전체 가로 열 기준이라 오른쪽으로 쏠림 */
export const columnImageWrapperCss = `
  img[data-align="center"],
  img[data-align="left"],
  img[data-align="right"],
  img {
    margin: 0 !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    float: none !important;
  }
  .webbook-img-wrap {
    box-sizing: border-box !important;
    break-inside: avoid !important;
    -webkit-column-break-inside: avoid !important;
    page-break-inside: avoid !important;
    margin: 1.25em 0 !important;
    display: block !important;
  }
  .webbook-img-wrap--center { text-align: center !important; }
  .webbook-img-wrap--left { text-align: left !important; }
  .webbook-img-wrap--right { text-align: right !important; }
  .webbook-img-wrap img {
    display: inline-block !important;
    width: auto !important;
    height: auto !important;
    margin: 0 !important;
    float: none !important;
    vertical-align: top !important;
  }
`;

export function imageAlignFromElement(img: Element): ImageAlignValue {
  const raw = img.getAttribute("data-align");
  if (raw === "left" || raw === "center" || raw === "right") return raw;
  return "center";
}

export function columnContentWidth(doc: Document, columnWidth: number): number {
  const body = doc.body;
  const view = doc.defaultView;
  if (!view) return columnWidth;
  const cs = view.getComputedStyle(body);
  const pad =
    parseFloat(cs.paddingLeft || "0") + parseFloat(cs.paddingRight || "0");
  return Math.max(0, Math.round(columnWidth - pad));
}

function applyWrapStyles(
  wrap: HTMLElement,
  align: ImageAlignValue,
  img: HTMLImageElement,
  contentWidth?: number,
) {
  const w = contentWidth ? `${contentWidth}px` : "100%";
  wrap.className = `webbook-img-wrap webbook-img-wrap--${align}`;
  wrap.style.cssText = [
    `width:${w}`,
    `max-width:${w}`,
    "box-sizing:border-box",
    "break-inside:avoid",
    "-webkit-column-break-inside:avoid",
    "margin:1.25em 0",
    "display:block",
    align === "center"
      ? "text-align:center"
      : align === "right"
        ? "text-align:right"
        : "text-align:left",
  ].join(";");
  img.style.cssText = [
    "display:inline-block",
    contentWidth ? `max-width:${contentWidth}px` : "max-width:100%",
    "width:auto",
    "height:auto",
    "margin:0",
    "float:none",
    "vertical-align:top",
  ].join(";");
  img.removeAttribute("align");
}

/** EPUB iframe 본문 — 페이지 모드용 이미지 wrapper (columnWidth px로 한 페이지 너비 고정) */
export function wrapImagesForColumnLayout(
  root: ParentNode,
  columnWidth?: number,
): void {
  const doc = root instanceof Document ? root : root.ownerDocument;
  if (!doc) return;
  const contentWidth =
    columnWidth && columnWidth > 0
      ? columnContentWidth(doc, columnWidth)
      : undefined;

  root.querySelectorAll("img").forEach((node) => {
    const img = node as HTMLImageElement;
    const existing = img.closest(".webbook-img-wrap") as HTMLElement | null;
    const align = imageAlignFromElement(img);

    if (existing) {
      applyWrapStyles(existing, align, img, contentWidth);
      return;
    }

    const wrap = doc.createElement("div");
    img.parentNode?.insertBefore(wrap, img);
    wrap.appendChild(img);
    applyWrapStyles(wrap, align, img, contentWidth);
  });
}

/** EPUB 빌드 — HTML 문자열 단계에서 wrapper 삽입 */
export function wrapImagesInHtml(html: string): string {
  return html.replace(/<img\b([^>]*?)>/gi, (match, attrs: string) => {
    if (/class="[^"]*webbook-img-wrap/i.test(match)) return match;
    const alignMatch = attrs.match(/data-align="(left|center|right)"/i);
    const align = alignMatch?.[1]?.toLowerCase() ?? "center";
    return `<div class="webbook-img-wrap webbook-img-wrap--${align}"><img${attrs}></div>`;
  });
}

export function getRenditionColumnWidth(rendition: unknown): number | undefined {
  const r = rendition as {
    _layout?: { columnWidth?: number };
    manager?: { layout?: { columnWidth?: number } };
  };
  const w = r._layout?.columnWidth ?? r.manager?.layout?.columnWidth;
  return w && w > 0 ? w : undefined;
}

export function schedulePaginatedImageFix(
  doc: Document | null | undefined,
  columnWidth?: number,
): void {
  if (!doc?.body) return;
  const run = () => wrapImagesForColumnLayout(doc.body, columnWidth);
  run();
  requestAnimationFrame(run);
  for (const ms of [0, 10, 50, 150, 300]) {
    window.setTimeout(run, ms);
  }
}
