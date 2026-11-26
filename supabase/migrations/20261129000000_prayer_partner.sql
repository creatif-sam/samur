-- Prayer: shared requests your partner can see and pray for, a history of who prayed
-- for each request (kept in the database, the same on every phone), a promise verse on a
-- request, and daily prayer reminder times.
--
-- Run this once in the Supabase SQL editor. Safe to run more than once.

-- 1. A promise to pray with, e.g. "Philippians 4:6" and its words
alter table prayer_requests add column if not exists verse_ref text;
alter table prayer_requests add column if not exists verse_text text;
alter table prayer_requests drop constraint if exists prayer_requests_verse_length;
alter table prayer_requests add constraint prayer_requests_verse_length
  check (char_length(coalesce(verse_ref, '')) <= 80 and char_length(coalesce(verse_text, '')) <= 2000);

-- 2. "Share with partner" now means it: your partner can read (not change) the requests you share
drop policy if exists "Partners see shared prayer requests" on prayer_requests;
create policy "Partners see shared prayer requests"
  on prayer_requests for select to authenticated
  using (is_shared and user_id = (select partner_id from profiles where id = auth.uid()));

-- 3. Each time someone prays for a request
create table if not exists prayer_request_prayers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references prayer_requests(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  prayed_at timestamptz not null default now()
);
create index if not exists prayer_request_prayers_request_idx on prayer_request_prayers (request_id, prayed_at desc);
create index if not exists prayer_request_prayers_user_idx on prayer_request_prayers (user_id, prayed_at desc);

alter table prayer_request_prayers enable row level security;

-- You see your own prayers, and anyone's prayers on your requests
drop policy if exists "See prayers by you or on your requests" on prayer_request_prayers;
create policy "See prayers by you or on your requests"
  on prayer_request_prayers for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from prayer_requests r where r.id = request_id and r.user_id = auth.uid())
  );

-- You record your own prayers, for your requests or your partner's shared ones
drop policy if exists "Record your prayers" on prayer_request_prayers;
create policy "Record your prayers"
  on prayer_request_prayers for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from prayer_requests r
      where r.id = request_id
        and (r.user_id = auth.uid()
             or (r.is_shared and r.user_id = (select partner_id from profiles where id = auth.uid())))
    )
  );

-- 4. Daily prayer reminder times ('HH:MM' in your own time zone), five at most
create table if not exists prayer_reminders (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  times text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint prayer_reminders_max_five check (coalesce(array_length(times, 1), 0) <= 5)
);

alter table prayer_reminders enable row level security;

drop policy if exists "Owners manage their prayer reminders" on prayer_reminders;
create policy "Owners manage their prayer reminders"
  on prayer_reminders for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
