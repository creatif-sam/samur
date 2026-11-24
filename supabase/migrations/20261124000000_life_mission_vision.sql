-- Life mission and life vision statements, shown at the top of Goals & Vision and on Home.
-- life_mission: why you exist and how you live it out (present tense).
-- life_vision: the future you are working toward, described as if you can see it.
-- life_statement_updated_at: when either statement was last changed.
--
-- Run this once in the Supabase SQL editor. The app works before it is run; saving
-- just asks for this update.

alter table user_preferences
  add column if not exists life_mission text,
  add column if not exists life_vision text,
  add column if not exists life_statement_updated_at timestamptz;

alter table user_preferences
  drop constraint if exists user_preferences_life_statement_length_check;

alter table user_preferences
  add constraint user_preferences_life_statement_length_check
  check (coalesce(length(life_mission), 0) <= 2000 and coalesce(length(life_vision), 0) <= 2000);
