-- Metal Stack Ledger: run the price updater on a schedule
-- Run this in the SQL Editor AFTER the update-prices function is deployed.
-- Replace the two placeholder values first.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Your project URL (Dashboard -> Project Settings -> Data API) and the same
-- CRON_SECRET string you saved in the Edge Function secrets.
select vault.create_secret('https://YOUR-PROJECT-REF.supabase.co', 'project_url');
select vault.create_secret('PASTE-THE-SAME-CRON_SECRET-HERE', 'cron_secret');
-- Your publishable key (Project Settings -> API Keys; starts with sb_publishable_,
-- or the "anon public" key on older projects). Supabase requires it on every request.
select vault.create_secret('PASTE-YOUR-PUBLISHABLE-KEY-HERE', 'publishable_key');

-- Every 10 minutes (about 4,500 API calls a month), matching MetalpriceAPI Basic:
-- 10,000 calls a month, prices refreshed every 10 minutes. Checking more often
-- would mostly re-read the same price.
-- If you upgrade: Professional (60-second updates) -> '* * * * *';
--                 Professional Plus (30-second updates) -> '30 seconds'.
select cron.schedule(
  'update-spot-prices',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/hyper-function',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Handy checks:
--   select * from cron.job;                                                -- the schedule
--   select * from cron.job_run_details order by start_time desc limit 10;  -- recent runs
--   select * from net._http_response order by created desc limit 10;       -- what the function returned
--   select * from public.spot_prices;                                      -- current prices
-- To change the interval:  select cron.alter_job((select jobid from cron.job where jobname = 'update-spot-prices'), schedule := '1 minute');
-- To stop it:              select cron.unschedule('update-spot-prices');
