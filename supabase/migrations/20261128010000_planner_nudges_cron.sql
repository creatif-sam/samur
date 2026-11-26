-- Planner nudges: on Sunday evening (18:00 in each person's own time zone), a reminder to
-- choose the week's big rocks if none are chosen yet.
--
-- The route runs every hour and only sends to people whose local time is 18:00 to 19:00 on
-- a Sunday, once per week. It uses the same Vault secret as the task reminders
-- (20261120000000_task_reminders_cron.sql), so that file must have been run first.
--
-- Run this once in the Supabase SQL editor. Running it again is safe: the job is replaced.

select cron.schedule(
  'planner-nudges',
  '5 * * * *',
  $$
  select net.http_get(
    url := 'https://mastery.samuelgyasi.com/api/cron/planner-nudges',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 30000
  );
  $$
);

-- CHECK (after the next hour, at :05):
--
--   select status, return_message, start_time
--   from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'planner-nudges')
--   order by start_time desc limit 5;
