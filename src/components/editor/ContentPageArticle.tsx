"use client";

import { memo, type RefCallback } from "react";
import type { Editor } from "@tiptap/react";
import type { BookPage } from "@/lib/pages/types";
import { isAsideContentPage } from "@/lib/pages/asidePage";
import {
  contentDocWithoutLead,
  pageSubtitleEditorDisplay,
} from "@/lib/pages/pageTitle";
import {
  bookPageAsideClass,
  bookPageBodyClass,
  bookPageClass,
  bookPageContentClass,
} from "@/lib/pages/bookPageCss";
import { PageTipTapEditor } from "./PageTipTapEditor";

type Props = {
  page: BookPage;
  bookId: string;
  onUpdate: (pageId: string, json: Record<string, unknown>) => void;
  registerEditor: (pageId: string, editor: Editor | null) => void;
  pageRef: RefCallback<HTMLElement>;
  onImageUploadError?: (message: string) => void;
};

export const ContentPageArticle = memo(function ContentPageArticle({
  page,
  bookId,
  onUpdate,
  registerEditor,
  pageRef,
  onImageUploadError,
}: Props) {
  const subtitle = pageSubtitleEditorDisplay(page);
  const articleClass = [
    bookPageClass,
    bookPageContentClass,
    isAsideContentPage(page) ? bookPageAsideClass : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      ref={pageRef}
      className={articleClass}
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
          bookId={bookId}
          initialContent={contentDocWithoutLead(page.content)}
          onUpdate={onUpdate}
          registerEditor={registerEditor}
          onImageUploadError={onImageUploadError}
        />
      </div>
    </article>
  );
});
