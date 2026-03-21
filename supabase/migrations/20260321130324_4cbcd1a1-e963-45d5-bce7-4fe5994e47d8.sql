-- Remove old cron job pointing to wrong Supabase URL
SELECT cron.unschedule('process-automatic-campaigns-hourly');

-- Recreate with correct URL and anon key
SELECT cron.schedule(
  'process-automatic-campaigns-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://ydnblcgygkbqioowbnhz.supabase.co/functions/v1/process-automatic-campaigns',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbmJsY2d5Z2ticWlvb3dibmh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNzUyNTgsImV4cCI6MjA4ODk1MTI1OH0.gwPqGe9v12Hs_4Js5AuoixZGQvfEDQHno_IzIWplVpk"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);