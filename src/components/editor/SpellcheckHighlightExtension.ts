import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { SpellCorrection } from "@/lib/types/database";
import { applyOneCorrectionToEditor } from "@/lib/spellcheck/applyToEditor";

export type SpellcheckMark = {
  id: string;
  correction: SpellCorrection;
  from: number;
  to: number;
};

export type IssueHighlightVariant = "spellcheck" | "review";

type PluginState = {
  marks: SpellcheckMark[];
  flash: { from: number; to: number } | null;
  variant: IssueHighlightVariant;
};

export const spellcheckHighlightKey = new PluginKey<PluginState>(
  "spellcheckHighlight",
);

function buildDecorations(
  doc: Parameters<typeof DecorationSet.create>[0],
  state: PluginState,
) {
  const items: Decoration[] = [];

  const markClass =
    state.variant === "review" ? "writing-review-mark" : "spellcheck-mark";

  for (const mark of state.marks) {
    const { correction, from, to } = mark;
    const title =
      state.variant === "review"
        ? `글검사 · 다듬은 부분: 「${correction.from}」 → 「${correction.to}」`
        : `클릭: 「${correction.from}」 → 「${correction.to}」`;
    items.push(
      Decoration.inline(from, to, {
        class: markClass,
        title,
        "data-issue-mark": "1",
      }),
    );
  }

  if (state.flash) {
    const { from, to } = state.flash;
    if (from < to && to <= doc.content.size) {
      items.push(
        Decoration.inline(from, to, {
          class: "spellcheck-applied",
        }),
      );
    }
  }

  return DecorationSet.create(doc, items);
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    spellcheckHighlight: {
      setSpellcheckMarks: (
        marks: SpellcheckMark[],
        variant?: IssueHighlightVariant,
      ) => ReturnType;
      clearSpellcheckMarks: () => ReturnType;
      flashSpellcheckRange: (range: { from: number; to: number }) => ReturnType;
      clearSpellcheckFlash: () => ReturnType;
    };
  }

  interface Storage {
    spellcheckHighlight: {
      onApplied?: (
        correction: SpellCorrection,
        flash: { from: number; to: number },
      ) => void;
    };
  }
}

export const SpellcheckHighlight = Extension.create({
  name: "spellcheckHighlight",

  addStorage() {
    return {
      onApplied: undefined as
        | ((
            correction: SpellCorrection,
            flash: { from: number; to: number },
          ) => void)
        | undefined,
    };
  },

  addCommands() {
    return {
      setSpellcheckMarks:
        (marks, variant = "spellcheck") =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(spellcheckHighlightKey, {
              marks,
              flash: null,
              variant,
            } satisfies PluginState);
          }
          return true;
        },
      clearSpellcheckMarks:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(spellcheckHighlightKey, {
              marks: [],
              flash: null,
              variant: "spellcheck",
            } satisfies PluginState);
          }
          return true;
        },
      flashSpellcheckRange:
        (range) =>
        ({ tr, dispatch, state }) => {
          const current = spellcheckHighlightKey.getState(state) ?? {
            marks: [],
            flash: null,
          };
          if (dispatch) {
            tr.setMeta(spellcheckHighlightKey, {
              ...current,
              flash: range,
              variant: current.variant,
            } satisfies PluginState);
          }
          return true;
        },
      clearSpellcheckFlash:
        () =>
        ({ tr, dispatch, state }) => {
          const current = spellcheckHighlightKey.getState(state) ?? {
            marks: [],
            flash: null,
          };
          if (dispatch) {
            tr.setMeta(spellcheckHighlightKey, {
              ...current,
              flash: null,
              variant: current.variant,
            } satisfies PluginState);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin<PluginState>({
        key: spellcheckHighlightKey,
        state: {
          init: () => ({ marks: [], flash: null, variant: "spellcheck" }),
          apply(tr, value) {
            const meta = tr.getMeta(spellcheckHighlightKey) as
              | PluginState
              | undefined;
            if (meta) return meta;

            if (!tr.docChanged) return value;

            const marks: SpellcheckMark[] = [];
            for (const mark of value.marks) {
              const mappedFrom = tr.mapping.map(mark.from);
              const mappedTo = tr.mapping.map(mark.to);
              if (mappedFrom >= mappedTo) continue;
              const text = tr.doc.textBetween(mappedFrom, mappedTo);
              if (text !== mark.correction.from) continue;
              marks.push({
                ...mark,
                from: mappedFrom,
                to: mappedTo,
              });
            }

            const flash = value.flash
              ? {
                  from: tr.mapping.map(value.flash.from),
                  to: tr.mapping.map(value.flash.to),
                }
              : null;

            return { marks, flash, variant: value.variant };
          },
        },
        props: {
          decorations(state) {
            const pluginState = spellcheckHighlightKey.getState(state);
            if (!pluginState) return DecorationSet.empty;
            return buildDecorations(state.doc, pluginState);
          },
          handleClick(view, pos, event) {
            const pluginState = spellcheckHighlightKey.getState(view.state);
            if (!pluginState?.marks.length) return false;

            const hit = pluginState.marks.find(
              (m) => pos >= m.from && pos < m.to,
            );
            if (!hit) return false;

            event.preventDefault();
            const editor = extension.editor;
            if (!editor) return true;

            const flash = {
              from: hit.from,
              to: hit.from + hit.correction.to.length,
            };

            const ok = applyOneCorrectionToEditor(editor, hit.correction);
            if (!ok) return true;

            extension.storage.onApplied?.(hit.correction, flash);
            return true;
          },
        },
      }),
    ];
  },
});
