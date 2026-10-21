-- Bible reading progress: which chapters each user has read.

create table if not exists bible_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  book text not null,
  chapter integer not null,
  read_at timestamptz not null default now(),
  primary key (user_id, book, chapter)
);

alter table bible_progress enable row level security;

create policy "Users manage their Bible progress"
  on bible_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
