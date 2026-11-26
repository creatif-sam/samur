-- Today's top 3: the three most important things for a day, chosen in the morning
-- and ticked off in the evening. Kept apart from planner_days so the planner's own
-- saves never depend on this update.
--
-- Run this once in the Supabase SQL editor. Safe to run more than once.
-- Until it is run, the top 3 are kept on each device only.

create table if not exists planner_priorities (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, day),
  constraint planner_priorities_max_three check (jsonb_array_length(items) <= 3)
);

alter table planner_priorities enable row level security;

drop policy if exists "Owners manage their priorities" on planner_priorities;
create policy "Owners manage their priorities"
  on planner_priorities for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
