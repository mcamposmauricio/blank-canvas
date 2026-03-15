-- Unschedule the existing cron job to avoid conflicts
SELECT cron.unschedule('process-automatic-campaigns');

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create new cron job to process automatic campaigns every hour at the top of the hour
SELECT cron.schedule(
  'process-automatic-campaigns-hourly',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://mfmkxpdufcbwydixbbbe.supabase.co/functions/v1/process-automatic-campaigns',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbWt4cGR1ZmNid3lkaXhiYmJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0OTE0MzgsImV4cCI6MjA3NTA2NzQzOH0.edxnyIfS9ywgitIJn1OZGNte8d92O1bE-LIzhd8bmV4"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);