-- Store notebook pins on the account so they sync across devices
-- (previously kept only in the browser's localStorage)
ALTER TABLE notebooks
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
