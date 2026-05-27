"use client";

import { memo, type RefCallback } from "react";
import type { Editor } from "@tiptap/react";
import type { BookPage } from "@/lib/pages/types";
import {
  bookPageBodyClass,
  bookPageClass,
  bookPageContentClass,
} from "@/lib/pages/bookPageCss";
import { PageTipTapEditor } from "./PageTipTapEditor";

type Props = {
  page: BookPage;
  onUpdate: (pageId: string, json: Record<string, unknown>) => void;
  registerEditor: (pageId: string, editor: Editor | null) => void;
  pageRef: RefCallback<HTMLElement>;
};

/** 탭으로 선택된 본문 페이지만 표시 — 한 화면에 한 페이지 */
export const ContentPageArticle = memo(function ContentPageArticle({
  page,
  onUpdate,
  registerEditor,
  pageRef,
}: Props) {
  return (
    <article
      ref={pageRef}
      className={`${bookPageClass} ${bookPageContentClass}`}
    >
      <div className={bookPageBodyClass}>
        <PageTipTapEditor
          key={page.id}
          pageId={page.id}
          initialContent={page.content}
          onUpdate={onUpdate}
          registerEditor={registerEditor}
        />
      </div>
    </article>
  );
});
