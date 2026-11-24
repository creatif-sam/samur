-- Roles (Covey, Habits 2 and 3): the parts of life you live in, each with its own
-- mission and vision, its goals, and the "big rocks" you put first each week.
--
-- roles: one per role you play (Husband, Father, Disciple, Entrepreneur…). Private to you.
-- goals.role_id: the role a goal serves. Deleting a role moves its goals to "Unassigned".
-- weekly_rocks: the most important things you will do this week, per role.
--   week_start is the Sunday the week begins (the Goals page's week).
--
-- role_categories: groups of roles, in your order. The app adds four to
--   start with (Spiritual Life & Ministry, Family, Relationships & Social Life,
--   Professional Life); they can be renamed, reordered or deleted.
--
-- Run this once in the Supabase SQL editor. Safe to run more than once.
-- The Goals page keeps working before it is run; roles just ask for this update.

create table if not exists role_categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  emoji text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  -- Lets the starter categories be added safely from two devices at once
  unique (owner_id, name)
);

alter table role_categories enable row level security;

drop policy if exists "Owners manage their role categories" on role_categories;
create policy "Owners manage their role categories"
  on role_categories for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  emoji text,
  color text not null default '#7c3aed',
  mission text check (mission is null or char_length(mission) <= 1000),
  vision text check (vision is null or char_length(vision) <= 1000),
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deleting a category keeps its roles; they show under "Other roles"
alter table roles
  add column if not exists category_id uuid references role_categories(id) on delete set null;

create index if not exists roles_owner_idx on roles (owner_id, sort_order);

alter table roles enable row level security;

drop policy if exists "Owners manage their roles" on roles;
create policy "Owners manage their roles"
  on roles for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

alter table goals
  add column if not exists role_id uuid references roles(id) on delete set null;

create index if not exists goals_role_idx on goals (role_id);

create table if not exists weekly_rocks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role_id uuid references roles(id) on delete cascade,
  goal_id uuid references goals(id) on delete set null,
  week_start date not null,
  text text not null check (char_length(btrim(text)) between 1 and 200),
  done boolean not null default false,
  done_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists weekly_rocks_owner_week_idx on weekly_rocks (owner_id, week_start);

alter table weekly_rocks enable row level security;

drop policy if exists "Owners manage their weekly rocks" on weekly_rocks;
create policy "Owners manage their weekly rocks"
  on weekly_rocks for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
