import { Extension } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { dropPoint } from "@tiptap/pm/transform";
import {
  dataTransferMayContainImage,
  imageFilesFromDataTransfer,
  uploadBookImage,
} from "@/lib/editor/uploadBookImage";

const DRAG_OVER_CLASS = "book-editor-drag-over";

function insertImageInView(view: EditorView, url: string, pos: number): number | null {
  const { state, dispatch } = view;
  const imageType = state.schema.nodes.image;
  if (!imageType) return null;

  const node = imageType.create({ src: url, align: "center" });
  const slice = new Slice(Fragment.from(node), 0, 0);
  const clamped = Math.max(0, Math.min(pos, state.doc.content.size));
  const insertPos = dropPoint(state.doc, clamped, slice);
  if (insertPos == null) return null;

  dispatch(state.tr.insert(insertPos, node));
  return insertPos + node.nodeSize;
}

async function insertImagesAt(
  view: EditorView,
  bookId: string,
  files: File[],
  pos: number,
  onUploadError: (message: string) => void,
) {
  let insertPos = pos;

  for (const file of files) {
    try {
      const url = await uploadBookImage(file, bookId);
      if (!view.dom.isConnected) return;

      const nextPos = insertImageInView(view, url, insertPos);
      if (nextPos == null) {
        onUploadError("이미지를 넣을 수 있는 위치가 아닙니다.");
        continue;
      }
      insertPos = nextPos;
    } catch (err) {
      onUploadError(
        err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.",
      );
    }
  }
}

export const BookImageDrop = Extension.create({
  name: "bookImageDrop",

  addOptions() {
    return {
      bookId: "",
      onUploadError: (_message: string) => {},
    };
  },

  addProseMirrorPlugins() {
    const { bookId, onUploadError } = this.options;
    let dragDepth = 0;

    const clearDragOver = (view: EditorView) => {
      dragDepth = 0;
      view.dom.classList.remove(DRAG_OVER_CLASS);
    };

    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            dragenter(_view, event) {
              if (!dataTransferMayContainImage(event.dataTransfer)) return false;
              dragDepth += 1;
              _view.dom.classList.add(DRAG_OVER_CLASS);
              return false;
            },
            dragleave(_view, event) {
              if (!dataTransferMayContainImage(event.dataTransfer)) return false;
              dragDepth = Math.max(0, dragDepth - 1);
              if (dragDepth === 0) {
                _view.dom.classList.remove(DRAG_OVER_CLASS);
              }
              return false;
            },
            dragover(_view, event) {
              if (!dataTransferMayContainImage(event.dataTransfer)) return false;
              event.preventDefault();
              if (event.dataTransfer) {
                event.dataTransfer.dropEffect = "copy";
              }
              return true;
            },
            drop(_view, event) {
              clearDragOver(_view);
              return false;
            },
          },
          handleDrop(view, event, _slice, moved) {
            if (moved || !bookId) return false;

            const files = imageFilesFromDataTransfer(event.dataTransfer);
            if (files.length === 0) return false;

            event.preventDefault();
            clearDragOver(view);

            const coords = { left: event.clientX, top: event.clientY };
            const pos =
              view.posAtCoords(coords)?.pos ?? view.state.selection.from;

            void insertImagesAt(view, bookId, files, pos, onUploadError);
            return true;
          },
          handlePaste(view, event) {
            if (!bookId) return false;

            const files = imageFilesFromDataTransfer(event.clipboardData);
            if (files.length === 0) return false;

            event.preventDefault();
            void insertImagesAt(
              view,
              bookId,
              files,
              view.state.selection.from,
              onUploadError,
            );
            return true;
          },
        },
      }),
    ];
  },
});
