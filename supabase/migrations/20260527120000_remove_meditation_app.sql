-- One-time cleanup: tables/columns from a mistakenly merged app (not Webbook Studio).
-- Safe to run multiple times (IF EXISTS).

drop table if exists public.meditation_guides cascade;
drop table if exists public.library_books cascade;

alter table public.profiles
  drop column if exists subscription_status,
  drop column if exists subscription_ends_at;
