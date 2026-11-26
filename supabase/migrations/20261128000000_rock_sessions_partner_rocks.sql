-- Big rocks done in sessions, and partners seeing each other's big rocks.
--
-- 1. A big rock can need several sessions in a week ("Run three times" = 3). Each planner
--    event booked for the rock is a session; when enough sessions are ticked done, the rock
--    is done. Existing rocks keep 1 session, so nothing changes for them.
-- 2. Accountability partners can see (not change) each other's big rocks, in the planner's
--    week view, to cheer each other on.
--
-- Run this once in the Supabase SQL editor. Safe to run more than once.

alter table weekly_rocks
  add column if not exists target smallint not null default 1;

alter table weekly_rocks drop constraint if exists weekly_rocks_target_range;
alter table weekly_rocks
  add constraint weekly_rocks_target_range check (target between 1 and 7);

drop policy if exists "Partners see each other's weekly rocks" on weekly_rocks;
create policy "Partners see each other's weekly rocks"
  on weekly_rocks for select to authenticated
  using (owner_id = (select partner_id from profiles where id = auth.uid()));
