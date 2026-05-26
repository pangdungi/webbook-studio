alter table public.books
  add column if not exists heading_fonts jsonb not null default '{"chapterTitle":"serif","heading2":"serif","heading3":"serif"}'::jsonb;
