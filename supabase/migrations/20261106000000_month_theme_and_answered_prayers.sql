-- 1. The month theme belongs to one month, so it stops showing when the next month starts.
--    month_theme_month holds 'YYYY-MM'. Null means the month is unknown, and the theme keeps showing.
alter table user_preferences
  add column if not exists month_theme_month text;

alter table user_preferences
  drop constraint if exists user_preferences_month_theme_month_check;

alter table user_preferences
  add constraint user_preferences_month_theme_month_check
  check (month_theme_month is null or month_theme_month ~ '^\d{4}-(0[1-9]|1[0-2])$');

-- Existing month themes were written for the current month
update user_preferences
  set month_theme_month = to_char(now(), 'YYYY-MM')
  where month_theme_month is null
    and coalesce(month_theme, '') <> '';

-- 2. A prayer request can be marked as answered.
alter table posts
  add column if not exists answered_at timestamptz;
