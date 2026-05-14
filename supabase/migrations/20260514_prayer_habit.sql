-- ============================================================
-- Prayer Habit tables
-- ============================================================

-- 1. Daily prayer check-in (habit/streak tracking)
-- One row per user per calendar day.
CREATE TABLE IF NOT EXISTS prayer_entries (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date             DATE        NOT NULL DEFAULT CURRENT_DATE,
  completed        BOOLEAN     NOT NULL DEFAULT FALSE,
  duration_minutes SMALLINT,                         -- how long they prayed (optional)
  notes            TEXT,                             -- what they brought before God (optional)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- 2. Prayer request / petition list
-- Each row is one prayer item the user is actively tracking.
CREATE TABLE IF NOT EXISTS prayer_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  description  TEXT,
  category     TEXT        NOT NULL DEFAULT 'personal'
                           CHECK (category IN (
                             'personal', 'family', 'intercession',
                             'guidance', 'healing', 'thanksgiving'
                           )),
  status       TEXT        NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'answered', 'ongoing')),
  is_shared    BOOLEAN     NOT NULL DEFAULT FALSE,   -- visible to accountability partner
  answer_note  TEXT,                                 -- testimony when marked answered
  answered_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep updated_at current automatically
CREATE OR REPLACE FUNCTION update_prayer_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prayer_entries_updated_at
  BEFORE UPDATE ON prayer_entries
  FOR EACH ROW EXECUTE FUNCTION update_prayer_updated_at();

CREATE TRIGGER trg_prayer_requests_updated_at
  BEFORE UPDATE ON prayer_requests
  FOR EACH ROW EXECUTE FUNCTION update_prayer_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE prayer_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;

-- prayer_entries: owner only
CREATE POLICY "owner can manage prayer_entries"
  ON prayer_entries FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- prayer_requests: owner can do everything
CREATE POLICY "owner can manage prayer_requests"
  ON prayer_requests FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- prayer_requests: partner can READ shared requests
-- (partner_id comes from the profiles table, same pattern as meditations)
CREATE POLICY "partner can read shared prayer_requests"
  ON prayer_requests FOR SELECT
  USING (
    is_shared = TRUE
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.partner_id = prayer_requests.user_id
    )
  );

-- ============================================================
-- Indexes for common query patterns
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_prayer_entries_user_date
  ON prayer_entries (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_prayer_requests_user_status
  ON prayer_requests (user_id, status, created_at DESC);
