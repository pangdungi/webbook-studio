import { Extension, type Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { bookPageBodyClass } from "@/lib/pages/bookPageCss";

export const PAGE_CAPACITY_FULL_MESSAGE =
  "이 페이지가 가득 찼습니다. 「+ 본문」으로 다음 페이지를 추가한 뒤 이어서 작성하세요.";

export function getPageBodyFromEditor(editor: Editor): HTMLElement | null {
  const el = editor.view.dom.closest(`.${bookPageBodyClass}`);
  return el instanceof HTMLElement ? el : null;
}

export function isPageBodyOverflow(body: HTMLElement, slack = 2): boolean {
  return body.scrollHeight > body.clientHeight + slack;
}

function docContentGrew(tr: Transaction, state: EditorState): boolean {
  if (!tr.docChanged) return false;
  const next = state.apply(tr);
  return next.doc.content.size > state.doc.content.size;
}

export function createPageCapacityGuard(options: { onPageFull?: () => void }) {
  let reverting = false;

  return Extension.create({
    name: "pageCapacityGuard",

    addProseMirrorPlugins() {
      const editor = this.editor;

      return [
        new Plugin({
          key: new PluginKey("pageCapacityGuard"),
          filterTransaction(tr, state) {
            if (reverting || !tr.docChanged || !docContentGrew(tr, state)) {
              return true;
            }
            const body = getPageBodyFromEditor(editor);
            if (!body || !isPageBodyOverflow(body)) return true;
            options.onPageFull?.();
            return false;
          },
        }),
      ];
    },

    onUpdate({ editor }) {
      if (reverting) return;
      const body = getPageBodyFromEditor(editor);
      if (!body || !isPageBodyOverflow(body)) return;

      reverting = true;
      while (isPageBodyOverflow(body) && editor.can().undo()) {
        editor.commands.undo();
      }
      reverting = false;
      options.onPageFull?.();
    },
  });
}
