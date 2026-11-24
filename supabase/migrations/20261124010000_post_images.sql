-- Photos on posts (up to 4 per post).
-- posts.image_urls: public links to the photos, in the order they were added.
-- Bucket post-images: public to read (file names are random), and each person can
-- only add or delete files in their own folder.
--
-- Run this once in the Supabase SQL editor. Safe to run more than once.

alter table posts
  add column if not exists image_urls text[] not null default '{}';

alter table posts
  drop constraint if exists posts_image_urls_max_check;

alter table posts
  add constraint posts_image_urls_max_check
  check (coalesce(array_length(image_urls, 1), 0) <= 4);

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

drop policy if exists "Users upload their post images" on storage.objects;
create policy "Users upload their post images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete their post images" on storage.objects;
create policy "Users delete their post images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
