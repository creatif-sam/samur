-- Add year/month theme columns to user_preferences
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS year_theme       TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS year_scripture   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS month_theme      TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS month_scripture  TEXT DEFAULT NULL;
