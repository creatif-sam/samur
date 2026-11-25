-- Planner to-dos linked to a role and, optionally, a goal (replacing the vision link).
-- Planner events need no change: they live as JSON in planner_days and simply gain
-- role_id / goal_id / rock_id fields.
-- Old to-dos keep their vision_id. Deleting a role or goal just unlinks the to-do.
--
-- Run this once in the Supabase SQL editor, after 20261125000000_roles.sql.
-- Safe to run more than once. The planner works before it is run.

alter table planner_todos
  add column if not exists role_id uuid references roles(id) on delete set null,
  add column if not exists goal_id uuid references goals(id) on delete set null;
