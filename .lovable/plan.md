

# Plano: Recriar Triggers + Corrigir e Deploiar Edge Functions

## Contexto

Este é um sistema clonado de outro projeto Supabase. As tabelas e funções foram migradas, mas **todos os 55 triggers estão ausentes** e as **16 edge functions não foram deployadas**. O usuário forneceu o SQL completo de migração da origem.

## Parte 1: Migration SQL — Triggers + Função Ausente

Criar uma migration que:

1. **Cria a função `set_tenant_id_from_owner()`** (ausente no banco atual)
2. **Recria todos os 55 triggers** exatamente como no SQL fornecido, usando `DROP TRIGGER IF EXISTS` antes de cada `CREATE TRIGGER` para ser idempotente

Tabelas afetadas e contagem de triggers:
- `api_keys` (2), `attendant_profiles` (2), `brand_settings` (2)
- `campaign_contacts` (2), `campaigns` (1)
- `chat_assignment_configs` (1), `chat_auto_rules` (1)
- `chat_banner_field_rules` (1), `chat_banners` (2), `chat_broadcasts` (2)
- `chat_business_hour_breaks` (1), `chat_business_hours` (1)
- `chat_custom_field_definitions` (1), `chat_custom_fields` (1)
- `chat_macros` (2), `chat_rooms` (9), `chat_service_categories` (1)
- `chat_settings` (2), `chat_tags` (1), `chat_teams` (1), `chat_visitors` (1)
- `company_contacts` (2), `contacts` (2), `csms` (3)
- `help_articles` (1), `help_collections` (1), `help_site_settings` (1)
- `responses` (3), `timeline_events` (2)
- `trail_template_activities` (1), `trail_templates` (2), `trails` (2)
- `user_email_settings` (2), `user_notification_settings` (2)
- `user_permissions` (2), `user_profiles` (2)

## Parte 2: Corrigir CORS em 10 Edge Functions

As seguintes funções têm CORS incompleto (faltam headers `x-supabase-client-platform*`):

| Função | CORS | serve() |
|--------|------|---------|
| backoffice-admin | ❌ | ✅ Deno.serve |
| check-nps-pending | ❌ | ❌ serve() |
| import-external-data | ❌ | ❌ serve() |
| process-automatic-campaigns | ❌ | ❌ serve() |
| process-chat-auto-rules | ❌ | ✅ Deno.serve |
| process-chat-broadcasts | ❌ | ✅ Deno.serve |
| send-nps-reminder | ❌ | ❌ serve() |
| send-response-notification | ❌ | ❌ serve() |
| submit-embedded-response | ❌ | ❌ serve() |
| test-email-config | ❌ | ❌ serve() |
| vote-banner | ❌ | ✅ Deno.serve |

Correções por função:
- **10 funções**: atualizar CORS headers para incluir `x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version`
- **7 funções**: migrar de `import { serve } from "https://deno.land/std@..."` + `serve(async (req) => {` para `Deno.serve(async (req) => {`

5 funções já estão corretas: `assign-chat-room`, `dismiss-banner`, `get-visitor-banners`, `get-widget-config`, `resolve-chat-visitor`.

## Parte 3: Atualizar config.toml

Adicionar `verify_jwt = false` para as 8 funções públicas (chamadas sem JWT pelo widget/visitante):

```toml
[functions.get-widget-config]
verify_jwt = false
[functions.resolve-chat-visitor]
verify_jwt = false
[functions.assign-chat-room]
verify_jwt = false
[functions.submit-embedded-response]
verify_jwt = false
[functions.get-visitor-banners]
verify_jwt = false
[functions.dismiss-banner]
verify_jwt = false
[functions.vote-banner]
verify_jwt = false
[functions.check-nps-pending]
verify_jwt = false
```

## Parte 4: Deploy

Todas as 16 edge functions serão deployadas automaticamente após salvar as alterações. O deploy automático do Lovable cuidará disso.

## Ordem de Execução

1. Migration SQL (triggers + função `set_tenant_id_from_owner`)
2. Atualizar CORS + `Deno.serve` nas 10+7 funções
3. Atualizar `config.toml`
4. Validar que `backoffice-admin` funciona para criar plataformas

