-- Daily prayer target (minutes) per month, e.g. {"2026-11": 45}.
-- A month without its own entry uses the most recent earlier month's target.
alter table user_preferences
  add column if not exists prayer_targets jsonb not null default '{}'::jsonb;
