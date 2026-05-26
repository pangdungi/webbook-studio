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
import { PageStaticPreview } from "./PageStaticPreview";

type Props = {
  page: BookPage;
  isActive: boolean;
  onSelect: (pageId: string) => void;
  onUpdate: (pageId: string, json: Record<string, unknown>, html: string) => void;
  registerEditor: (pageId: string, editor: Editor | null) => void;
  pageRef: RefCallback<HTMLElement>;
};

/** 활성 페이지만 TipTap — 비활성은 정적 HTML. 타이핑 시 다른 페이지는 리렌더 안 함. */
export const ContentPageArticle = memo(function ContentPageArticle({
  page,
  isActive,
  onSelect,
  onUpdate,
  registerEditor,
  pageRef,
}: Props) {
  return (
    <article
      ref={pageRef}
      className={`${bookPageClass} ${bookPageContentClass} ${
        !isActive ? "ring-1 ring-stone-200/80" : ""
      }`}
      onClick={() => onSelect(page.id)}
    >
      <div className={bookPageBodyClass}>
        {isActive ? (
          <PageTipTapEditor
            key={page.id}
            pageId={page.id}
            initialContent={page.content}
            onUpdate={onUpdate}
            registerEditor={registerEditor}
          />
        ) : (
          <PageStaticPreview html={page.content_html} />
        )}
      </div>
    </article>
  );
}, (prev, next) => {
  if (prev.page.id !== next.page.id || prev.isActive !== next.isActive) {
    return false;
  }
  if (next.isActive) {
    return true;
  }
  return prev.page.content_html === next.page.content_html;
});
