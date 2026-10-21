-- Planner: untimed to-dos and reusable day templates.
-- Memory verses: spaced-review schedule (review after 1, 3, 7, 14, 30 days).

-- To-dos without a time yet; scheduling one turns it into a planner task
create table if not exists planner_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null,
  vision_id uuid references visions (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists planner_todos_user_idx on planner_todos (user_id, created_at);

alter table planner_todos enable row level security;

create policy "Users manage their planner todos"
  on planner_todos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- A named set of tasks (times, titles, visions) that can be applied to any day
create table if not exists planner_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  tasks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists planner_templates_user_idx on planner_templates (user_id, created_at);

alter table planner_templates enable row level security;

create policy "Users manage their planner templates"
  on planner_templates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Spaced review: stage counts successful reviews; next_review is when it's due again
alter table memory_verses
  add column if not exists review_stage integer not null default 0,
  add column if not exists next_review date;
