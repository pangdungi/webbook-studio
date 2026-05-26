-- Storage buckets and policies (run after initial schema)

insert into storage.buckets (id, name, public)
values
  ('book-assets', 'book-assets', false),
  ('book-epubs', 'book-epubs', false)
on conflict (id) do nothing;

-- Admins upload assets
create policy "Admins upload book assets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'book-assets'
    and public.is_admin()
  );

create policy "Admins read own book assets"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'book-assets'
    and public.is_admin()
  );

create policy "Admins update book assets"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'book-assets' and public.is_admin());

create policy "Admins delete book assets"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'book-assets' and public.is_admin());

-- Service role handles EPUB uploads via API; admins can read
create policy "Admins read book epubs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'book-epubs'
    and public.is_admin()
  );
