-- Migration: create saved_verses table
create table if not exists public.saved_verses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  book        text not null,
  chapter     integer not null,
  verse       integer not null,
  text        text not null,
  created_at  timestamptz not null default now(),

  unique (user_id, book, chapter, verse)
);

-- Enable RLS
alter table public.saved_verses enable row level security;

-- Policies
create policy "Users can view their own saved verses"
  on public.saved_verses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own saved verses"
  on public.saved_verses for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own saved verses"
  on public.saved_verses for delete
  using (auth.uid() = user_id);
