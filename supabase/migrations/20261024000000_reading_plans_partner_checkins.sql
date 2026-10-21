-- Bible reading plans (plan schedules live in the app; this stores who follows
-- which plan and which days they've completed) and weekly partner check-ins.
-- Partners can read each other's rows.

create table if not exists bible_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_key text not null,
  start_date date not null,
  completed_days integer[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, plan_key)
);

alter table bible_plans enable row level security;

create policy "Users manage their reading plans"
  on bible_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Partners can read reading plans"
  on bible_plans for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.partner_id = bible_plans.user_id
    )
  );

create table if not exists partner_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  wins text not null default '',
  struggles text not null default '',
  prayer text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table partner_checkins enable row level security;

create policy "Users manage their check-ins"
  on partner_checkins for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Partners can read check-ins"
  on partner_checkins for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.partner_id = partner_checkins.user_id
    )
  );
