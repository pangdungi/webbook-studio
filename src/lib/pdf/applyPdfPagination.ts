import {
  BOOK_EDITOR_PAGE_HEIGHT_PX,
  BOOK_EDITOR_PAGE_WIDTH_PX,
} from "@/lib/pdf/bookPdfLayout";
import type { Page } from "playwright";

/**
 * Playwright browser context — imports 불가, 문자열만 사용.
 * 편집기 pageBox(672×950) 기준 overflow → 다음 PDF 페이지.
 */
function paginatePdfDocument(layout: {
  pageWidth: number;
  pageHeight: number;
}) {
  const SHELL = "book-page-shell";
  const SHELL_FLOW = "book-page-shell--flow";
  const BODY = "book-page-body";
  const CONTINUE = "book-body-p--continue";
  const ANCHOR = "reader-scroll-anchor";
  const SOURCE_ATTR = "data-wbs-reader-source";
  const BLOCK_SELECTOR = `:scope > p, :scope > h2, :scope > h3, :scope > blockquote, :scope > ul, :scope > ol, :scope > hr, :scope > .webbook-img-wrap, :scope > figure`;

  const syncShellMetrics = (shell: HTMLElement) => {
    shell.style.setProperty("--book-page-w", `${layout.pageWidth}px`);
    shell.style.setProperty("--book-page-h", `${layout.pageHeight}px`);
  };

  const parseShell = (sourceInner: string) => {
    const wrap = document.createElement("div");
    wrap.innerHTML = sourceInner;
    const shell = wrap.querySelector(`:scope > .${SHELL}.${SHELL_FLOW}`);
    const body = wrap.querySelector(`.${BODY}`);
    if (!shell || !body) return null;
    return { shellHtml: shell.outerHTML, bodyHtml: body.innerHTML };
  };

  const rebuildShellWithBody = (shellHtml: string, bodyInnerHtml: string) => {
    const wrap = document.createElement("div");
    wrap.innerHTML = shellHtml;
    const body = wrap.querySelector(`.${BODY}`);
    if (!body) return shellHtml;
    body.innerHTML = bodyInnerHtml;
    const shell = wrap.firstElementChild;
    return shell instanceof HTMLElement ? shell.outerHTML : shellHtml;
  };

  const flattenBlocks = (body: Element): HTMLElement[] => {
    const direct = Array.from(body.querySelectorAll(BLOCK_SELECTOR)) as HTMLElement[];
    if (direct.length > 0) return direct;
    return Array.from(body.children) as HTMLElement[];
  };

  const blocksHtml = (blocks: HTMLElement[]) =>
    blocks.map((el) => el.outerHTML).join("");

  const blocksFromHtml = (fragmentHtml: string) => {
    const wrap = document.createElement("div");
    wrap.innerHTML = `<div class="${BODY}">${fragmentHtml}</div>`;
    const body = wrap.querySelector(`.${BODY}`);
    if (!body) return [] as HTMLElement[];
    return flattenBlocks(body);
  };

  const textUnits = (text: string) => {
    if (/\s/.test(text)) {
      return text.split(/(\s+)/).filter((t) => t.length > 0);
    }
    return Array.from(text);
  };

  const applyContinuationMarkup = (bodyHtml: string, isContinuation: boolean) => {
    if (!isContinuation || !bodyHtml.trim()) return bodyHtml;
    const wrap = document.createElement("div");
    wrap.innerHTML = `<div class="${BODY}">${bodyHtml}</div>`;
    const firstP = wrap.querySelector("p");
    if (firstP instanceof HTMLElement) firstP.classList.add(CONTINUE);
    return wrap.querySelector(`.${BODY}`)?.innerHTML ?? bodyHtml;
  };

  const prepareAnchorForMeasure = (
    anchor: HTMLElement,
    shellHtml: string,
    bodyHtml: string,
  ) => {
    anchor.innerHTML = rebuildShellWithBody(shellHtml, bodyHtml);
    const shell = anchor.querySelector(`.${SHELL}`);
    if (shell instanceof HTMLElement) syncShellMetrics(shell);
    void anchor.offsetHeight;
  };

  const liveOverflows = (anchor: HTMLElement) => {
    const body = anchor.querySelector(`.${BODY}`) as HTMLElement | null;
    if (!body) return false;
    void body.offsetHeight;
    const available = body.clientHeight;
    if (available > 8) return body.scrollHeight > available + 1;
    return body.scrollHeight > 24;
  };

  const splitOversizedBlock = (
    anchor: HTMLElement,
    shellHtml: string,
    block: HTMLElement,
    prefixHtml: string,
  ) => {
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
          prepareAnchorForMeasure(
            anchor,
            shellHtml,
            prefixHtml + partial.outerHTML,
          );
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
  };

  const splitBodyOnAnchor = (
    anchor: HTMLElement,
    shellHtml: string,
    bodyHtml: string,
  ) => {
    const blocks = blocksFromHtml(bodyHtml);
    if (blocks.length === 0) return [bodyHtml];

    prepareAnchorForMeasure(anchor, shellHtml, bodyHtml);
    if (!liveOverflows(anchor)) return [bodyHtml];

    const pages: string[] = [];
    const queue = [...blocks];
    let currentBlocks: HTMLElement[] = [];

    const pushPage = (html: string) => {
      if (!html.trim()) return;
      pages.push(applyContinuationMarkup(html, pages.length > 0));
    };

    const flush = () => {
      if (!currentBlocks.length) return;
      pushPage(blocksHtml(currentBlocks));
      currentBlocks = [];
    };

    const tryHtml = (html: string) => {
      prepareAnchorForMeasure(anchor, shellHtml, html);
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

      const { head, tail } = splitOversizedBlock(anchor, shellHtml, block, "");
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
  };

  document.querySelectorAll(`.${SHELL}`).forEach((node) => {
    if (node instanceof HTMLElement) syncShellMetrics(node);
  });

  const flowShells = Array.from(
    document.body.querySelectorAll<HTMLElement>(`:scope > .${SHELL}.${SHELL_FLOW}`),
  );

  for (const shell of flowShells) {
    const anchor = document.createElement("div");
    anchor.className = ANCHOR;
    anchor.id = `pdf-${Math.random().toString(36).slice(2, 9)}`;
    document.body.insertBefore(anchor, shell);
    anchor.appendChild(shell);
  }

  const surface = document.body;
  const anchors = Array.from(
    surface.querySelectorAll<HTMLElement>(`:scope > .${ANCHOR}`),
  );

  for (const anchor of anchors) {
    if (!anchor.querySelector(`.${SHELL_FLOW}`)) continue;

    if (!anchor.getAttribute(SOURCE_ATTR)) {
      anchor.setAttribute(SOURCE_ATTR, anchor.innerHTML);
    }
    const sourceInner = anchor.getAttribute(SOURCE_ATTR) ?? anchor.innerHTML;
    const parsed = parseShell(sourceInner);
    if (!parsed) continue;

    const { shellHtml, bodyHtml } = parsed;
    const chunks = splitBodyOnAnchor(anchor, shellHtml, bodyHtml);

    if (chunks.length <= 1) {
      anchor.innerHTML = rebuildShellWithBody(shellHtml, bodyHtml);
      continue;
    }

    const parent = anchor.parentElement;
    if (!parent) continue;

    const baseId = anchor.id || `pdf-page-${Math.random().toString(36).slice(2, 9)}`;
    const fragment = document.createDocumentFragment();

    chunks.forEach((chunk, idx) => {
      const slide = document.createElement("div");
      slide.className = ANCHOR;
      slide.id = idx === 0 ? baseId : `${baseId}-r${idx}`;
      slide.setAttribute(SOURCE_ATTR, sourceInner);
      slide.innerHTML = rebuildShellWithBody(shellHtml, chunk);
      fragment.appendChild(slide);
    });

    parent.insertBefore(fragment, anchor);
    anchor.remove();
  }

  Array.from(surface.querySelectorAll<HTMLElement>(`:scope > .${ANCHOR}`)).forEach(
    (anchor) => {
      while (anchor.firstElementChild) {
        surface.insertBefore(anchor.firstElementChild, anchor);
      }
      anchor.remove();
    },
  );

  surface.querySelectorAll(`.${SHELL}`).forEach((node) => {
    if (node instanceof HTMLElement) syncShellMetrics(node);
  });
}

export async function applyPdfPagination(page: Page) {
  await page.evaluate(paginatePdfDocument, {
    pageWidth: BOOK_EDITOR_PAGE_WIDTH_PX,
    pageHeight: BOOK_EDITOR_PAGE_HEIGHT_PX,
  });
}
