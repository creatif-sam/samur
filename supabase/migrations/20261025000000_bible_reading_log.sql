-- Bible reading progress + daily reading log. Safe to run more than once.
--   bible_progress:    has this chapter ever been read (book progress)
--   bible_reading_log: one row per chapter per day read, so re-reading a
--                      chapter counts toward today's Bible habit and streak

-- 1. Reading progress (was in an earlier migration that may not have been run)
create table if not exists bible_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  book text not null,
  chapter integer not null,
  read_at timestamptz not null default now(),
  primary key (user_id, book, chapter)
);

alter table bible_progress enable row level security;

drop policy if exists "Users manage their Bible progress" on bible_progress;
create policy "Users manage their Bible progress"
  on bible_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Daily reading log
create table if not exists bible_reading_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  book text not null,
  chapter integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day, book, chapter)
);

create index if not exists bible_reading_log_user_day_idx on bible_reading_log (user_id, day);

alter table bible_reading_log enable row level security;

drop policy if exists "Users manage their Bible reading log" on bible_reading_log;
create policy "Users manage their Bible reading log"
  on bible_reading_log for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Carry over anything already marked read (each chapter's last read date)
insert into bible_reading_log (user_id, day, book, chapter)
select user_id, (read_at at time zone 'utc')::date, book, chapter
from bible_progress
on conflict do nothing;
