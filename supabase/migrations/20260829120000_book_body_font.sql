alter table public.books
  add column if not exists body_font text not null default 'serif';

alter table public.books
  drop constraint if exists books_body_font_check;

alter table public.books
  add constraint books_body_font_check
  check (body_font in ('serif', 'bookk-light', 'bookk-bold'));
