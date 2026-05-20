-- ─────────────────────────────────────────────────
-- 1. Partner invite / confirmation requests
-- ─────────────────────────────────────────────────
create table if not exists partner_requests (
  id            uuid primary key default gen_random_uuid(),
  from_user_id  uuid references auth.users(id) on delete cascade not null,
  to_user_id    uuid references auth.users(id) on delete cascade not null,
  status        text not null default 'pending'
                  check (status in ('pending','accepted','declined')),
  created_at    timestamptz default now(),
  unique (from_user_id, to_user_id)
);

alter table partner_requests enable row level security;

-- senders can insert / read / delete their own requests
create policy "partner_requests_sender" on partner_requests
  for all using (auth.uid() = from_user_id);

-- recipients can read requests addressed to them and update status
create policy "partner_requests_recipient_read" on partner_requests
  for select using (auth.uid() = to_user_id);

create policy "partner_requests_recipient_update" on partner_requests
  for update using (auth.uid() = to_user_id);

-- ─────────────────────────────────────────────────
-- 2. Goal milestones
-- ─────────────────────────────────────────────────
create table if not exists goal_milestones (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid references goals(id) on delete cascade not null,
  title       text not null,
  is_done     boolean not null default false,
  position    int not null default 0,
  created_at  timestamptz default now()
);

alter table goal_milestones enable row level security;

create policy "milestones_owner" on goal_milestones
  for all using (
    exists (
      select 1 from goals
      where goals.id = goal_milestones.goal_id
        and (goals.owner_id = auth.uid() or goals.partner_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────
-- 3. Gratitude journal entries
-- ─────────────────────────────────────────────────
create table if not exists gratitude_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  entry_1    text not null default '',
  entry_2    text not null default '',
  entry_3    text not null default '',
  date       date not null,
  created_at timestamptz default now(),
  unique (user_id, date)
);

alter table gratitude_entries enable row level security;

create policy "gratitude_own" on gratitude_entries
  for all using (auth.uid() = user_id);
