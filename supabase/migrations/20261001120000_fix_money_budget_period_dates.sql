-- Budget periods used to be keyed with Date.toISOString(), which shifted the
-- date back one day for users ahead of UTC: monthly budgets were saved on the
-- last day of the previous month and weekly ones on Saturday instead of Sunday.
-- The app now uses local dates, so move those rows forward one day to match.
-- Rows are skipped when a correctly dated period already exists for that user.

update money_budget_periods p
set
  period_start = p.period_start::date + 1,
  period_end   = p.period_end::date + 1
where (
    (p.scope = 'month' and extract(day from p.period_start::date + 1) = 1)
    or (p.scope = 'week' and extract(dow from p.period_start::date) = 6)
  )
  and not exists (
    select 1
    from money_budget_periods q
    where q.user_id = p.user_id
      and q.scope = p.scope
      and q.period_start::date = p.period_start::date + 1
  );
