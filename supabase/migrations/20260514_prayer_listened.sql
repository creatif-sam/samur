-- Add "listened to God" field to prayer daily check-in
ALTER TABLE prayer_entries
  ADD COLUMN IF NOT EXISTS listened_to_god BOOLEAN NOT NULL DEFAULT FALSE;
