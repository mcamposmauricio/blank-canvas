

# Fix: Cron jobs apontando para URL antiga do Supabase

## Problema

Dois cron jobs criados por migrações antigas ainda chamam `https://mfmkxpdufcbwydixbbbe.supabase.co` com o anon key do projeto antigo. Isso significa que o `process-automatic-campaigns` (campanhas automáticas NPS) **não está funcionando** — todas as chamadas cron falham silenciosamente.

| Cron Job | Schedule | URL |
|---|---|---|
| `process-automatic-campaigns` | `* * * * *` | **ERRADA** (projeto antigo) |
| `process-automatic-campaigns-hourly` | `0 * * * *` | **ERRADA** (projeto antigo) |

Todos os outros arquivos do projeto (embed JS, client.ts, edge functions) já estão com a URL correta `ydnblcgygkbqioowbnhz`.

## Correção

Uma migração SQL que:

1. Remove os dois cron jobs antigos (`cron.unschedule`)
2. Recria apenas o hourly (1x por hora é suficiente) com a URL e anon key corretas do projeto atual (`ydnblcgygkbqioowbnhz`)

```sql
SELECT cron.unschedule('process-automatic-campaigns');
SELECT cron.unschedule('process-automatic-campaigns-hourly');

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
```

Nenhuma alteração de frontend. Apenas 1 migração SQL.

