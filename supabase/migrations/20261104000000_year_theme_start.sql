-- A year theme can begin before January 1st (e.g. the 2027 theme received on Oct 19, 2026).
-- year_theme_year: the year the theme is for. Null means the current calendar year.
-- year_theme_start: the day you started walking in it. Null means January 1st of that year.

alter table user_preferences
  add column if not exists year_theme_year integer,
  add column if not exists year_theme_start date;

alter table user_preferences
  drop constraint if exists user_preferences_year_theme_year_check;

alter table user_preferences
  add constraint user_preferences_year_theme_year_check
  check (year_theme_year is null or year_theme_year between 2000 and 2100);
