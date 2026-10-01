-- Let partners see each other's prayer sessions (date, duration, completed)
-- for the partnership streak board on the prayer tab. Read-only; inspirations
-- captured during prayer stay private.

create policy "Partners can read prayer sessions"
  on prayer_sessions for select
  using (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
        and profiles.partner_id = prayer_sessions.user_id
    )
  );
