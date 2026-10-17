-- Daily memory verse on the meditations tab: one verse per user per day.
-- Shared verses are readable by the partner so you can memorise together.

create table if not exists memory_verses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  reference text not null,
  text text not null,
  translation text,
  visibility text not null default 'shared' check (visibility in ('private', 'shared')),
  memorized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

create index if not exists memory_verses_user_day_idx on memory_verses (user_id, day desc);

alter table memory_verses enable row level security;

create policy "Users manage their memory verses"
  on memory_verses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Partners can read shared memory verses"
  on memory_verses for select
  using (
    visibility = 'shared'
    and exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
        and profiles.partner_id = memory_verses.user_id
    )
  );
