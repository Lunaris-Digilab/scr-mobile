-- Product photos storage bucket for the "Magic Add" flow.
-- Run via `supabase db push` (or paste into the Supabase SQL editor).
-- Public read so product images render without signed URLs; writes are limited
-- to authenticated users inside their own `<user_id>/...` folder.

insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

-- Public read of product photos.
drop policy if exists "product_photos_public_read" on storage.objects;
create policy "product_photos_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'product-photos');

-- Authenticated users may upload into their own folder only.
drop policy if exists "product_photos_insert_own" on storage.objects;
create policy "product_photos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users may delete their own photos.
drop policy if exists "product_photos_delete_own" on storage.objects;
create policy "product_photos_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
