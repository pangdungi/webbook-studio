import {
  bookBodyContinueClass,
  bookPageBodyClass,
  bookPageClass,
  bookPageContentClass,
  bookPageShellClass,
  bookPageShellFlowClass,
  syncBookPageMetrics,
} from "@/lib/pages/bookPageCss";

const SOURCE_HTML_ATTR = "data-wbs-reader-source";
const PAGINATED_ATTR = "data-wbs-reader-paginated";

const BLOCK_SELECTOR =
  ":scope > p, :scope > h2, :scope > h3, :scope > blockquote, :scope > ul, :scope > ol, :scope > hr, :scope > .webbook-img-wrap, :scope > figure";

export type PaginateLayout = {
  pageWidth: number;
  pageHeight: number;
  fontSize: string;
};

function parseShell(sourceInner: string): { shellHtml: string; bodyHtml: string } | null {
  const wrap = document.createElement("div");
  wrap.innerHTML = sourceInner;
  const shell = wrap.querySelector(
    `:scope > .${bookPageShellClass}.${bookPageShellFlowClass}`,
  );
  const body = wrap.querySelector(`.${bookPageBodyClass}`);
  if (!shell || !body) return null;
  return { shellHtml: shell.outerHTML, bodyHtml: body.innerHTML };
}

function rebuildShellWithBody(shellHtml: string, bodyInnerHtml: string): string {
  const wrap = document.createElement("div");
  wrap.innerHTML = shellHtml;
  const body = wrap.querySelector(`.${bookPageBodyClass}`);
  if (!body) return shellHtml;
  body.innerHTML = bodyInnerHtml;
  const shell = wrap.firstElementChild;
  return shell instanceof HTMLElement ? shell.outerHTML : shellHtml;
}

function flattenBlocks(body: Element): HTMLElement[] {
  const direct = Array.from(body.querySelectorAll(BLOCK_SELECTOR)) as HTMLElement[];
  if (direct.length > 0) return direct;
  return Array.from(body.children) as HTMLElement[];
}

function blocksHtml(blocks: HTMLElement[]) {
  return blocks.map((el) => el.outerHTML).join("");
}

function blocksFromHtml(fragmentHtml: string): HTMLElement[] {
  const wrap = document.createElement("div");
  wrap.innerHTML = `<div class="${bookPageBodyClass}">${fragmentHtml}</div>`;
  const body = wrap.querySelector(`.${bookPageBodyClass}`);
  if (!body) return [];
  return flattenBlocks(body);
}

/** 공백 단위 분할; 띄어쓰기 없는 한글 문장은 글자 단위 */
function textUnits(text: string): string[] {
  if (/\s/.test(text)) {
    return text.split(/(\s+)/).filter((t) => t.length > 0);
  }
  return Array.from(text);
}

/** 이어지는 화면 — 출판 규칙: 첫 문단 들여쓰기 없음 */
function applyPublishingChunkMarkup(bodyHtml: string, isContinuation: boolean): string {
  if (!isContinuation || !bodyHtml.trim()) return bodyHtml;

  const wrap = document.createElement("div");
  wrap.innerHTML = `<div class="${bookPageBodyClass}">${bodyHtml}</div>`;
  const firstP = wrap.querySelector("p");
  if (firstP instanceof HTMLElement) {
    firstP.classList.add(bookBodyContinueClass);
  }
  return wrap.querySelector(`.${bookPageBodyClass}`)?.innerHTML ?? bodyHtml;
}

function prepareAnchorForMeasure(
  anchor: HTMLElement,
  shellHtml: string,
  bodyHtml: string,
  layout: PaginateLayout,
) {
  anchor.innerHTML = rebuildShellWithBody(shellHtml, bodyHtml);
  const shell = anchor.querySelector(`.${bookPageShellClass}`);
  if (shell instanceof HTMLElement) {
    syncBookPageMetrics(shell, {
      mode: "paginated",
      pageWidth: layout.pageWidth,
      pageHeight: layout.pageHeight,
    });
  }
  void anchor.offsetHeight;
}

/** 본문 영역 실측 — 화면 높이를 넘으면 다음 슬라이드로 분할 */
function liveOverflows(anchor: HTMLElement): boolean {
  const body = anchor.querySelector(`.${bookPageBodyClass}`) as HTMLElement | null;
  if (!body) return false;

  void body.offsetHeight;
  const available = body.clientHeight;

  if (available > 8) {
    return body.scrollHeight > available + 1;
  }

  const article = anchor.querySelector(
    `.${bookPageClass}.${bookPageContentClass}`,
  ) as HTMLElement | null;
  if (article) {
    const style = getComputedStyle(article);
    const pad =
      (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
    const artAvail = article.clientHeight - pad;
    if (artAvail > 8) return body.scrollHeight > artAvail + 1;
  }

  return body.scrollHeight > 24;
}

function splitOversizedBlock(
  anchor: HTMLElement,
  shellHtml: string,
  block: HTMLElement,
  prefixHtml: string,
  layout: PaginateLayout,
): { head: string; tail: string } {
  const tag = block.tagName.toLowerCase();
  const splittable = tag === "p" || tag === "blockquote";
  const fullText = block.textContent ?? "";

  if (splittable && fullText.trim()) {
    const tokens = textUnits(fullText);
    if (tokens.length > 1) {
      let best = 0;
      for (let i = 1; i <= tokens.length; i++) {
        const partial = block.cloneNode(false) as HTMLElement;
        partial.textContent = tokens.slice(0, i).join("");
        prepareAnchorForMeasure(anchor, shellHtml, prefixHtml + partial.outerHTML, layout);
        if (liveOverflows(anchor)) break;
        best = i;
      }

      if (best > 0 && best < tokens.length) {
        const headEl = block.cloneNode(false) as HTMLElement;
        headEl.textContent = tokens.slice(0, best).join("");
        const tailEl = block.cloneNode(false) as HTMLElement;
        tailEl.textContent = tokens.slice(best).join("");
        return { head: headEl.outerHTML, tail: tailEl.outerHTML };
      }
    }
  }

  return { head: block.outerHTML, tail: "" };
}

function splitBodyOnAnchor(
  anchor: HTMLElement,
  shellHtml: string,
  bodyHtml: string,
  layout: PaginateLayout,
): string[] {
  const blocks = blocksFromHtml(bodyHtml);
  if (blocks.length === 0) return [bodyHtml];

  prepareAnchorForMeasure(anchor, shellHtml, bodyHtml, layout);
  if (!liveOverflows(anchor)) return [bodyHtml];

  const pages: string[] = [];
  const queue = [...blocks];
  let currentBlocks: HTMLElement[] = [];

  const pushPage = (html: string) => {
    if (!html.trim()) return;
    pages.push(applyPublishingChunkMarkup(html, pages.length > 0));
  };

  const flush = () => {
    if (!currentBlocks.length) return;
    pushPage(blocksHtml(currentBlocks));
    currentBlocks = [];
  };

  const tryHtml = (html: string) => {
    prepareAnchorForMeasure(anchor, shellHtml, html, layout);
    return !liveOverflows(anchor);
  };

  while (queue.length > 0) {
    const block = queue.shift()!;
    const trial = [...currentBlocks, block];
    const trialHtml = blocksHtml(trial);

    if (tryHtml(trialHtml)) {
      currentBlocks = trial;
      continue;
    }

    flush();

    if (tryHtml(block.outerHTML)) {
      currentBlocks = [block];
      continue;
    }

    const prefix = "";
    const { head, tail } = splitOversizedBlock(anchor, shellHtml, block, prefix, layout);
    if (head.trim()) pushPage(head);
    if (tail.trim()) {
      const tailBlocks = blocksFromHtml(tail);
      for (let i = tailBlocks.length - 1; i >= 0; i--) {
        queue.unshift(tailBlocks[i]);
      }
    }
  }

  flush();
  return pages.length > 0 ? pages : [bodyHtml];
}

function isFlowAnchor(anchor: HTMLElement): boolean {
  if (/-r\d+$/.test(anchor.id)) return false;
  if (/-p\d+$/.test(anchor.id)) {
    return !!anchor.querySelector(`.${bookPageShellFlowClass}`);
  }
  return !!anchor.querySelector(`.${bookPageShellFlowClass}`);
}

/** 장 앵커(wbs-ch) — 표지·프롤로그·본문 shell을 슬라이드별로 펼침 (첫 flow만 쓰던 문제 방지) */
function expandAnchorsWithMultipleShells(surface: HTMLElement): void {
  const anchors = Array.from(
    surface.querySelectorAll<HTMLElement>(":scope > .reader-scroll-anchor"),
  );

  for (const anchor of anchors) {
    const shells = Array.from(
      anchor.querySelectorAll<HTMLElement>(`:scope > .${bookPageShellClass}`),
    );
    if (shells.length <= 1) continue;

    const parent = anchor.parentElement;
    if (!parent) continue;

    const baseId = anchor.id || `wbs-page-${Math.random().toString(36).slice(2, 9)}`;
    const fragment = document.createDocumentFragment();

    shells.forEach((shell, idx) => {
      const slide = document.createElement("div");
      slide.className = "reader-scroll-anchor";
      slide.id = idx === 0 ? baseId : `${baseId}-p${idx}`;
      slide.innerHTML = shell.outerHTML;
      fragment.appendChild(slide);
    });

    parent.insertBefore(fragment, anchor);
    anchor.remove();
  }
}

export function paginateFlowPagesInSurface(
  surface: HTMLElement,
  layout: PaginateLayout,
): void {
  if (layout.pageWidth <= 0 || layout.pageHeight <= 0) return;

  expandAnchorsWithMultipleShells(surface);

  const anchors = Array.from(
    surface.querySelectorAll<HTMLElement>(":scope > .reader-scroll-anchor"),
  );

  for (const anchor of anchors) {
    if (!isFlowAnchor(anchor)) continue;

    if (!anchor.getAttribute(SOURCE_HTML_ATTR)) {
      anchor.setAttribute(SOURCE_HTML_ATTR, anchor.innerHTML);
    }
    const sourceInner = anchor.getAttribute(SOURCE_HTML_ATTR) ?? anchor.innerHTML;
    const parsed = parseShell(sourceInner);
    if (!parsed) continue;

    const { shellHtml, bodyHtml } = parsed;
    const chunks = splitBodyOnAnchor(anchor, shellHtml, bodyHtml, layout);

    if (chunks.length <= 1) {
      anchor.innerHTML = rebuildShellWithBody(shellHtml, bodyHtml);
      anchor.removeAttribute(PAGINATED_ATTR);
      continue;
    }

    const parent = anchor.parentElement;
    if (!parent) continue;

    const baseId = anchor.id || `wbs-page-${Math.random().toString(36).slice(2, 9)}`;
    const fragment = document.createDocumentFragment();

    chunks.forEach((chunk, idx) => {
      const slide = document.createElement("div");
      slide.className = "reader-scroll-anchor";
      slide.id = idx === 0 ? baseId : `${baseId}-r${idx}`;
      slide.setAttribute(SOURCE_HTML_ATTR, sourceInner);
      if (idx > 0) slide.setAttribute(PAGINATED_ATTR, "1");
      slide.innerHTML = rebuildShellWithBody(shellHtml, chunk);
      fragment.appendChild(slide);
    });

    parent.insertBefore(fragment, anchor);
    anchor.remove();
  }
}

export function resetPaginatedFlowPages(surface: HTMLElement, sourceBodyHtml: string): void {
  surface.innerHTML = sourceBodyHtml;
}

export function readerPaginateMeasureCss() {
  return "";
}
