const PROTECTION_FLAG = "data-wbs-content-protected";

export function readerContentProtectionCss() {
  return `
    html, body {
      -webkit-user-select: none !important;
      user-select: none !important;
      -webkit-touch-callout: none !important;
    }
    img {
      -webkit-user-drag: none !important;
      user-drag: none !important;
    }
  `;
}

function blockEvent(e: Event) {
  e.preventDefault();
}

function blockImageDrag(e: Event) {
  if (e.target instanceof HTMLImageElement) {
    e.preventDefault();
  }
}

function blockCopyShortcut(e: KeyboardEvent) {
  if (!(e.metaKey || e.ctrlKey)) return;
  const key = e.key.toLowerCase();
  if (key === "c" || key === "x" || key === "a" || key === "s") {
    e.preventDefault();
  }
}

/** EPUB iframe 본문 — 선택·복사·우클릭·이미지 드래그 완화 (완전 DRM 아님) */
export function attachReaderContentProtection(doc: Document) {
  if (doc.documentElement.hasAttribute(PROTECTION_FLAG)) return;

  doc.documentElement.setAttribute(PROTECTION_FLAG, "1");

  doc.addEventListener("copy", blockEvent, true);
  doc.addEventListener("cut", blockEvent, true);
  doc.addEventListener("contextmenu", blockEvent, true);
  doc.addEventListener("selectstart", blockEvent, true);
  doc.addEventListener("dragstart", blockImageDrag, true);
  doc.addEventListener("keydown", blockCopyShortcut, true);
}
