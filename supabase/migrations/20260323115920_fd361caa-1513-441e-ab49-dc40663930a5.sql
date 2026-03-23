
SELECT cron.schedule(
  'process-chat-auto-rules-cron',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://ydnblcgygkbqioowbnhz.supabase.co/functions/v1/process-chat-auto-rules',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbmJsY2d5Z2ticWlvb3dibmh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNzUyNTgsImV4cCI6MjA4ODk1MTI1OH0.gwPqGe9v12Hs_4Js5AuoixZGQvfEDQHno_IzIWplVpk"}'::jsonb,
    body:='{"time": "now"}'::jsonb
  ) AS request_id;
  $$
);
