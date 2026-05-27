/** 스크롤 모드 — epub.js continuous: 바깥(.epub-container)만 스크롤, iframe은 내용 높이만큼 펼침 */

export function applyScrollContainerStyles(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>(".epub-container").forEach((el) => {
    el.classList.add("reader-hide-scrollbar");
    el.style.height = "100%";
    el.style.maxHeight = "100%";
    el.style.overflowY = "auto";
    el.style.overflowX = "hidden";
    el.style.scrollSnapType = "none";
    el.style.setProperty("-webkit-overflow-scrolling", "touch");
    el.style.overscrollBehavior = "auto";
    el.style.scrollbarWidth = "none";
    el.style.touchAction = "pan-y";
  });
}

export function expandContinuousScrollIframes(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>(".epub-view").forEach((view) => {
    view.style.height = "auto";
    view.style.minHeight = "0";
    view.style.overflow = "visible";
  });

  root.querySelectorAll<HTMLIFrameElement>("iframe").forEach((iframe) => {
    const doc = iframe.contentDocument;
    if (!doc?.body) return;

    const docEl = doc.documentElement;
    docEl.style.overflow = "visible";
    doc.body.style.overflow = "visible";

    const height = Math.ceil(
      Math.max(
        docEl.scrollHeight,
        docEl.offsetHeight,
        doc.body.scrollHeight,
        doc.body.offsetHeight,
      ),
    );
    if (height <= 0) return;

    iframe.style.setProperty("height", `${height}px`, "important");
    iframe.style.setProperty("min-height", `${height}px`, "important");
    iframe.style.overflow = "hidden";
    iframe.setAttribute("scrolling", "no");
  });
}

export function applyReaderScrollLayout(root: HTMLElement) {
  applyScrollContainerStyles(root);
  expandContinuousScrollIframes(root);
}
