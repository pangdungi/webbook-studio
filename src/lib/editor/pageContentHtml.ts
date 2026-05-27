/** TipTap JSON → 페이지 HTML (빈 줄·들여쓰기 유지, getHTML() 대체) */

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text: string) {
  return escapeHtml(text);
}

type MarkLike = { type?: string };

function applyMarks(text: string, marks?: MarkLike[]) {
  if (!marks?.length) return text;
  let out = text;
  for (const mark of marks) {
    if (mark.type === "bold") out = `<strong>${out}</strong>`;
    if (mark.type === "italic") out = `<em>${out}</em>`;
    if (mark.type === "underline") out = `<u>${out}</u>`;
  }
  return out;
}

function serializeInline(content: unknown[] | undefined): string {
  if (!content?.length) return "";

  return content
    .map((raw) => {
      const node = raw as Record<string, unknown>;
      if (node.type === "text") {
        return applyMarks(
          escapeHtml(String(node.text ?? "")),
          node.marks as MarkLike[] | undefined,
        );
      }
      if (node.type === "hardBreak") return "<br>";
      return "";
    })
    .join("");
}

function serializeBlock(node: Record<string, unknown>): string {
  const type = node.type;

  if (type === "paragraph") {
    const attrs = (node.attrs as { class?: string } | undefined) ?? {};
    const cls = attrs.class ?? "book-body-p";
    const inner = serializeInline(node.content as unknown[] | undefined);
    if (!inner) return `<p class="${cls}"><br></p>`;
    return `<p class="${cls}">${inner}</p>`;
  }

  if (type === "heading") {
    const level = (node.attrs as { level?: number } | undefined)?.level ?? 2;
    const tag = level === 3 ? "h3" : "h2";
    return `<${tag}>${serializeInline(node.content as unknown[] | undefined)}</${tag}>`;
  }

  if (type === "blockquote") {
    const inner = ((node.content as Record<string, unknown>[]) ?? [])
      .map(serializeBlock)
      .join("");
    return `<blockquote>${inner}</blockquote>`;
  }

  if (type === "horizontalRule") return "<hr>";

  if (type === "image") {
    const attrs = (node.attrs as {
      src?: string;
      alt?: string;
      align?: string;
    }) ?? { src: "" };
    const align = attrs.align ? ` data-align="${escapeAttr(attrs.align)}"` : "";
    return `<img src="${escapeAttr(attrs.src ?? "")}" alt="${escapeAttr(attrs.alt ?? "")}"${align}>`;
  }

  if (type === "bulletList" || type === "orderedList") {
    const tag = type === "bulletList" ? "ul" : "ol";
    const items = ((node.content as Record<string, unknown>[]) ?? [])
      .map((li) => {
        const blocks = ((li.content as Record<string, unknown>[]) ?? [])
          .map(serializeBlock)
          .join("");
        return `<li>${blocks}</li>`;
      })
      .join("");
    return `<${tag}>${items}</${tag}>`;
  }

  return "";
}

/** 한 페이지 doc — 다른 페이지와 합치지 않음 */
export function contentPageDocToHtml(doc: Record<string, unknown>): string {
  if (doc.type !== "doc" || !Array.isArray(doc.content)) {
    return '<p class="book-body-p"><br></p>';
  }
  const blocks = (doc.content as Record<string, unknown>[]).map(serializeBlock);
  return blocks.length > 0 ? blocks.join("") : '<p class="book-body-p"><br></p>';
}
