-- 상세페이지(판매·소개) AI 카피
alter table public.books
  add column if not exists sales_page_copy jsonb;

comment on column public.books.sales_page_copy is 'AI 상세페이지 문구 JSON (헤드라인·불릿·CTA 등)';
