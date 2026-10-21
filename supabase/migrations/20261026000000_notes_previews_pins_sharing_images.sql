-- Notes: text previews and search, shared notes, stable keys for the notebooks
-- the app creates automatically, and a bucket for note photos.
-- pages.content is jsonb holding the note's HTML as a JSON string.
-- Safe to run more than once.

-- 1. Plain text of each note, kept up to date by Postgres:
--    search_text (full, for search) and preview (first 200 characters, for lists)
alter table pages
  add column if not exists search_text text
  generated always as (
    trim(regexp_replace(regexp_replace(replace(
      case jsonb_typeof(content) when 'string' then content #>> '{}' else coalesce(content::text, '') end,
      '&nbsp;', ' '), '<[^>]+>', ' ', 'g'), '\s+', ' ', 'g'))
  ) stored;

alter table pages
  add column if not exists preview text
  generated always as (
    left(trim(regexp_replace(regexp_replace(replace(
      case jsonb_typeof(content) when 'string' then content #>> '{}' else coalesce(content::text, '') end,
      '&nbsp;', ' '), '<[^>]+>', ' ', 'g'), '\s+', ' ', 'g')), 200)
  ) stored;

-- 2. Pinned notes use the existing is_pinned column; add sharing
alter table pages add column if not exists is_pinned boolean not null default false;
alter table pages add column if not exists shared boolean not null default false;

-- Partners can read notes shared with them (read-only)
drop policy if exists "Partners can read shared pages" on pages;
create policy "Partners can read shared pages"
  on pages for select
  using (
    shared
    and exists (
      select 1
      from sections s
      join notebooks n on n.id = s.notebook_id
      join profiles p on p.id = auth.uid()
      where s.id = pages.section_id and p.partner_id = n.user_id
    )
  );

-- 3. Stable keys for auto-created notebooks (renaming one no longer creates a duplicate)
alter table notebooks add column if not exists system_key text;

-- Tag the oldest existing notebook of each kind per user
with candidates as (
  select distinct on (user_id, key) id, key
  from (
    select id, user_id, created_at,
      case lower(title)
        when 'reading logs' then 'reading_logs'
        when 'bible notes' then 'bible_notes'
        when 'daily journaling' then 'daily_journal'
        when 'prayer inspirations' then 'prayer_inspirations'
        when 'prayer diary' then 'prayer_diary'
        when 'general' then 'general'
      end as key
    from notebooks
    where system_key is null
  ) t
  where key is not null
    and not exists (select 1 from notebooks n2 where n2.user_id = t.user_id and n2.system_key = t.key)
  order by user_id, key, created_at
)
update notebooks n set system_key = c.key from candidates c where n.id = c.id;

create unique index if not exists notebooks_user_system_key_idx
  on notebooks (user_id, system_key) where system_key is not null;

-- 4. Photos in notes: public bucket, each user writes only to their own folder
insert into storage.buckets (id, name, public)
values ('note-images', 'note-images', true)
on conflict (id) do nothing;

drop policy if exists "Users upload their note images" on storage.objects;
create policy "Users upload their note images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'note-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete their note images" on storage.objects;
create policy "Users delete their note images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'note-images' and (storage.foldername(name))[1] = auth.uid()::text);
