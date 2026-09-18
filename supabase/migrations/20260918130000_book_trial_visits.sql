-- 7일권 공유 링크 1개 + 방문자(브라우저)마다 첫 접속 시점부터 7일

create table if not exists public.book_trial_visits (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.book_access_tokens (id) on delete cascade,
  visitor_key text not null,
  first_accessed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (token_id, visitor_key)
);

create index if not exists book_trial_visits_token_id_idx
  on public.book_trial_visits (token_id);

create index if not exists book_trial_visits_expires_at_idx
  on public.book_trial_visits (expires_at);

alter table public.book_trial_visits enable row level security;

comment on table public.book_trial_visits is
  '7일권 공유 URL — 방문자(쿠키)별 첫 접속부터 trial_days';
