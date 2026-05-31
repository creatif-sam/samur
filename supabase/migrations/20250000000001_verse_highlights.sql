-- Migration: create verse_highlights table
create table if not exists public.verse_highlights (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  book        text not null,
  chapter     integer not null,
  verse       integer not null,
  color       text not null,           -- e.g. 'yellow', 'green', 'blue', 'pink', 'purple', 'orange'
  created_at  timestamptz not null default now(),

  unique (user_id, book, chapter, verse)
);

alter table public.verse_highlights enable row level security;

create policy "Users can view their own highlights"
  on public.verse_highlights for select
  using (auth.uid() = user_id);

create policy "Users can insert their own highlights"
  on public.verse_highlights for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own highlights"
  on public.verse_highlights for update
  using (auth.uid() = user_id);

create policy "Users can delete their own highlights"
  on public.verse_highlights for delete
  using (auth.uid() = user_id);
