"use client";

import { memo, type RefCallback } from "react";
import type { Editor } from "@tiptap/react";
import type { BookPage } from "@/lib/pages/types";
import {
  contentDocWithoutLead,
  pageSubtitleEditorDisplay,
} from "@/lib/pages/pageTitle";
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

export const ContentPageArticle = memo(function ContentPageArticle({
  page,
  onUpdate,
  registerEditor,
  pageRef,
}: Props) {
  const subtitle = pageSubtitleEditorDisplay(page);

  return (
    <article
      ref={pageRef}
      className={`${bookPageClass} ${bookPageContentClass}`}
    >
      <div className={bookPageBodyClass}>
        {subtitle.trim() ? (
          <h2
            className="book-page-subtitle book-page-subtitle--editor-preview"
            aria-label="부제목 (위 입력창에서만 수정)"
          >
            {subtitle}
          </h2>
        ) : null}
        <PageTipTapEditor
          key={page.id}
          pageId={page.id}
          initialContent={contentDocWithoutLead(page.content)}
          onUpdate={onUpdate}
          registerEditor={registerEditor}
        />
      </div>
    </article>
  );
});
