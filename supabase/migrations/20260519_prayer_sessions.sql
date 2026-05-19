-- prayer_sessions: each row is one timed prayer session
CREATE TABLE IF NOT EXISTS prayer_sessions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date            date        NOT NULL DEFAULT CURRENT_DATE,
  duration_seconds integer    NOT NULL DEFAULT 0,
  completed       boolean     NOT NULL DEFAULT false,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE prayer_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their prayer sessions"
  ON prayer_sessions FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- prayer_inspirations: thoughts captured during a prayer session
CREATE TABLE IF NOT EXISTS prayer_inspirations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid        NOT NULL REFERENCES prayer_sessions(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     text        NOT NULL,
  page_id     uuid,       -- optional link to the notes page created
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE prayer_inspirations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their prayer inspirations"
  ON prayer_inspirations FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
