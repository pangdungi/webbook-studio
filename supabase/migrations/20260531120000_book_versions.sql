-- 책 전체 스냅샷 버전 (이름 지정 · 복원 · 열람)

create table public.book_versions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  label text not null,
  snapshot jsonb not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index book_versions_book_created_idx
  on public.book_versions (book_id, created_at desc);

comment on table public.book_versions is '책+모든 장 스냅샷 — 이름 붙여 저장·복원·열람';
comment on column public.book_versions.snapshot is '{ book, chapters[] } JSON';

alter table public.book_versions enable row level security;

create policy "Admins manage versions of own books"
  on public.book_versions for all
  using (
    public.is_admin()
    and exists (
      select 1 from public.books b
      where b.id = book_versions.book_id and b.created_by = auth.uid()
    )
  )
  with check (
    public.is_admin()
    and exists (
      select 1 from public.books b
      where b.id = book_versions.book_id and b.created_by = auth.uid()
    )
  );
