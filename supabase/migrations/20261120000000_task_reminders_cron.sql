-- Planner reminders and alarms on time.
--
-- Supabase calls the reminder check every minute. Until now GitHub Actions did it from an
-- hourly schedule, but GitHub only ran a handful of those a day (none between 06:00 and
-- 16:00 UTC on 19 Nov 2026), so most reminders were never sent. Supabase is now the only
-- scheduler for reminders (the GitHub loop was removed). Applied on 20 Nov 2026.
--
-- Run this once in the Supabase SQL editor.
--
-- STEP 1 (once, by you): store the app's CRON_SECRET in Vault. It is the same value as the
-- CRON_SECRET environment variable on Vercel and the GitHub Actions secret. Run this line
-- on its own with the real value; don't save the value in this file:
--
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret', 'Bearer token for the /api/cron routes');
--
--   (To change it later:
--    select vault.update_secret((select id from vault.secrets where name = 'cron_secret'), '<new value>');)
--
-- STEP 2: run everything below. Running it again is safe: a job with the same name is
-- replaced, not duplicated.

-- Scheduler and HTTP calls. If pg_cron won't enable here, turn on "Cron" under
-- Integrations in the dashboard, then run this file again.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Every minute: the route sends every reminder whose time has come (and skips ones already sent)
select cron.schedule(
  'task-reminders',
  '* * * * *',
  $$
  select net.http_get(
    url := 'https://mastery.samuelgyasi.com/api/cron/task-reminders',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    -- pg_net's default is 2 s; the route goes through every user
    timeout_milliseconds := 30000
  );
  $$
);

-- cron.job_run_details is never cleaned up on its own, and this job adds 1,440 rows a day
select cron.schedule(
  'cron-history-cleanup',
  '17 3 * * *',
  $$ delete from cron.job_run_details where end_time < now() - interval '7 days' $$
);

-- CHECK (after two or three minutes):
--
--   Did the job run?
--   select status, return_message, start_time
--   from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'task-reminders')
--   order by start_time desc limit 5;
--
--   Did the app answer? Expect status_code 200 and content like {"ok":true,"sent":0}.
--   A 401 means the Vault secret doesn't match CRON_SECRET on Vercel.
--   select status_code, content, error_msg, created
--   from net._http_response
--   order by created desc limit 5;
--
-- STOP: select cron.unschedule('task-reminders');
