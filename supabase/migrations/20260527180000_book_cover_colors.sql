-- Book cover: background and title colors (hex)

alter table public.books
  add column if not exists cover_bg_color text not null default '#2d4a6f',
  add column if not exists cover_title_color text not null default '#ffffff';
