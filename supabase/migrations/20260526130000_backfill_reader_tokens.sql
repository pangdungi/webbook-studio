-- 기존 책 중 독자 링크가 없는 경우 보정 (책당 primary 링크 1개)
-- 앱 GET /api/books 에서도 ensure 하므로 선택적 마이그레이션

insert into public.book_access_tokens (book_id, token, label)
select
  b.id,
  replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  'primary'
from public.books b
where not exists (
  select 1
  from public.book_access_tokens t
  where t.book_id = b.id and t.revoked_at is null
);
