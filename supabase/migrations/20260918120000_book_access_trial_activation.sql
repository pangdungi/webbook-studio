-- 7일권: 링크 생성 ≠ 시작. 독자가 처음 열었을 때 activated_at·expires_at 설정

alter table public.book_access_tokens
  add column if not exists trial_days integer,
  add column if not exists activated_at timestamptz;

comment on column public.book_access_tokens.trial_days is
  '첫 접속 후 이용 가능 일수. expires_at은 첫 접속 시 trial_days만큼 뒤로 설정';
comment on column public.book_access_tokens.activated_at is
  '독자가 처음 링크를 연 시각';
