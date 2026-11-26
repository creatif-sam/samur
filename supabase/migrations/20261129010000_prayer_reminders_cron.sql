-- Daily prayer reminders: every minute, sends the reminder to anyone whose chosen prayer
-- time (in their own time zone) has just come. Each time is sent once a day.
--
-- Run this AFTER 20261129000000_prayer_partner.sql, and once this version of the app is
-- live. It uses the same Vault secret as the task reminders
-- (20261120000000_task_reminders_cron.sql). Running it again is safe: the job is replaced.

select cron.schedule(
  'prayer-reminders',
  '* * * * *',
  $$
  select net.http_get(
    url := 'https://mastery.samuelgyasi.com/api/cron/prayer-reminders',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 30000
  );
  $$
);

-- CHECK (after two or three minutes):
--
--   select status, return_message, start_time
--   from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'prayer-reminders')
--   order by start_time desc limit 5;
