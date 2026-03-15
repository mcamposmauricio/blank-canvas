-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create cron job to process automatic campaigns every minute
SELECT cron.schedule(
  'process-automatic-campaigns',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://mfmkxpdufcbwydixbbbe.supabase.co/functions/v1/process-automatic-campaigns',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbWt4cGR1ZmNid3lkaXhiYmJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0OTE0MzgsImV4cCI6MjA3NTA2NzQzOH0.edxnyIfS9ywgitIJn1OZGNte8d92O1bE-LIzhd8bmV4"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);