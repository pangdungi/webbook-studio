-- Webbook Studio initial schema

create type public.user_role as enum ('admin', 'reader');
create type public.book_status as enum ('draft', 'published');
create type public.writing_mode as enum ('horizontal-tb', 'vertical-rl');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'reader',
  display_name text,
  created_at timestamptz not null default now()
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null default '제목 없음',
  subtitle text,
  cover_path text,
  writing_mode public.writing_mode not null default 'horizontal-tb',
  status public.book_status not null default 'draft',
  epub_storage_path text,
  published_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  parent_id uuid references public.chapters (id) on delete set null,
  sort_order integer not null default 0,
  title text not null default '새 챕터',
  content_json jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  content_html text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.book_access_tokens (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  token text not null unique,
  label text not null default 'general',
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index books_created_by_idx on public.books (created_by);
create index chapters_book_id_sort_idx on public.chapters (book_id, sort_order);
create index book_access_tokens_token_idx on public.book_access_tokens (token);
create index book_access_tokens_book_id_idx on public.book_access_tokens (book_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger books_updated_at before update on public.books
  for each row execute function public.set_updated_at();

create trigger chapters_updated_at before update on public.chapters
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    'reader',
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin helper
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer;

-- RLS
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.chapters enable row level security;
alter table public.book_access_tokens enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins manage own books"
  on public.books for all
  using (public.is_admin() and created_by = auth.uid())
  with check (public.is_admin() and created_by = auth.uid());

create policy "Admins manage chapters of own books"
  on public.chapters for all
  using (
    public.is_admin() and exists (
      select 1 from public.books b
      where b.id = chapters.book_id and b.created_by = auth.uid()
    )
  )
  with check (
    public.is_admin() and exists (
      select 1 from public.books b
      where b.id = chapters.book_id and b.created_by = auth.uid()
    )
  );

create policy "Admins manage access tokens of own books"
  on public.book_access_tokens for all
  using (
    public.is_admin() and exists (
      select 1 from public.books b
      where b.id = book_access_tokens.book_id and b.created_by = auth.uid()
    )
  )
  with check (
    public.is_admin() and exists (
      select 1 from public.books b
      where b.id = book_access_tokens.book_id and b.created_by = auth.uid()
    )
  );

-- Storage buckets (run in Supabase dashboard or via storage API)
-- book-assets: images and covers (private)
-- book-epubs: published EPUB files (private)
