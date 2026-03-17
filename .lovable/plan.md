

# Plano: Revisão de Isolamento de Tenant (Não-Master) + Backfill

## Problema

Políticas RLS usam `user_id = auth.uid()` em vez de `tenant_id = get_user_tenant_id(auth.uid())` em ~11 tabelas. Admins de um tenant não conseguem ver dados criados por outros membros do mesmo tenant.

## Dados encontrados que precisam de backfill

| Dado | Problema |
|---|---|
| `user_roles` — 6 registros | Todos com `tenant_id = NULL` |
| `attendant_profiles` — user `94a21524` | 2 perfis duplicados para o mesmo user |
| Nenhum tenant tem `chat_settings` | 0 registros — ao corrigir RLS de `user_id` para `tenant_id`, nenhum tenant terá configurações acessíveis até criar |
| Nenhum tenant tem `brand_settings` | 0 registros |
| Nenhum tenant tem `chat_business_hours` | 0 registros |
| Nenhum tenant tem `chat_service_categories` | 0 registros |

Todas as outras tabelas com dados (contacts, campaigns, etc.) já têm `tenant_id` preenchido corretamente.

---

## Fase 1: Backfill de dados

### 1.1 — Preencher `tenant_id` em `user_roles`
```sql
UPDATE user_roles ur
SET tenant_id = (SELECT tenant_id FROM user_profiles WHERE user_id = ur.user_id LIMIT 1)
WHERE tenant_id IS NULL;
```

### 1.2 — Remover `attendant_profile` duplicado
O user `94a21524` tem 2 perfis no mesmo tenant. Manter o mais recente, remover o outro.

### 1.3 — Garantir `chat_settings` por tenant
Ao corrigir a RLS para tenant-based, o sistema precisa criar `chat_settings` automaticamente por tenant (não mais por user). O frontend já faz upsert — ajustar para usar `tenant_id` no filtro. Nenhum backfill necessário pois não há registros existentes.

---

## Fase 2: Corrigir RLS (migração SQL)

Trocar `user_id = auth.uid()` por `tenant_id = get_user_tenant_id(auth.uid())` nas seguintes tabelas:

| Tabela | Policies a corrigir |
|---|---|
| `contacts` | SELECT/UPDATE/DELETE — de `user_id` para `tenant_id` |
| `company_contacts` | Idem + remover `anon = true` genérico |
| `csms` | SELECT/UPDATE/DELETE |
| `campaigns` | SELECT/UPDATE/DELETE (manter anon SELECT para NPS público) |
| `campaign_contacts` | SELECT/UPDATE/DELETE (via campaigns.tenant_id ou direto) |
| `campaign_sends` | SELECT/UPDATE (via campaigns.tenant_id ou direto) |
| `responses` | SELECT (via campaigns — trocar subquery para tenant_id) |
| `chat_settings` | ALL — de `user_id` para `tenant_id` |
| `chat_business_hours` | ALL — de `user_id` para `tenant_id` |
| `chat_auto_rules` | ALL — de `user_id` para `tenant_id` |
| `chat_macros` | ALL — de `user_id` para `tenant_id` (manter `is_private + user_id` para macros privadas) |
| `chat_tags` | ALL — de `user_id` para `tenant_id` |
| `chat_custom_fields` | ALL — de `user_id` para `tenant_id` |
| `chat_rooms` | SELECT — remover `anon = true` genérico, criar tenant-based para authenticated; manter anon INSERT/UPDATE para widget |
| `chat_visitors` | SELECT — de `owner_user_id` para `tenant_id` para authenticated; manter anon para widget |
| `chat_messages` | SELECT — de `owner via room` para tenant-based; manter anon para widget |
| `attendant_profiles` | SELECT "Admins can view all" — adicionar filtro `tenant_id` |
| `brand_settings` | SELECT/UPDATE/DELETE — de `user_id` para `tenant_id` |
| `api_keys` | ALL — de `user_id` para `tenant_id` |
| `user_roles` | Adicionar policy tenant-based para SELECT (admin vê roles do tenant) |

Para cada tabela: manter policy separada para master (`is_master(auth.uid())`).

---

## Fase 3: Ajustes no frontend

Com RLS corrigido, a maioria se resolve automaticamente. Ajustes pontuais:

- `AdminSettings.tsx` — query de `chat_settings` usar `.eq("tenant_id", tenantId)` em vez de `.eq("user_id", userId)` para upsert
- Componentes que fazem INSERT com `user_id` — continuar enviando `user_id` (auditoria), o trigger `set_tenant_id_from_user` preenche o `tenant_id` automaticamente
- Verificar que `chat_business_hours`, `chat_auto_rules`, `chat_tags`, `chat_macros` usam tenant no frontend para queries

---

## Fase 4: Validação

- Admin do tenant A vê todos os dados do tenant A (não só os próprios)
- Admin do tenant A não vê dados do tenant B
- Widget público continua funcionando (anon INSERT/SELECT em chat_rooms, chat_messages, chat_visitors)
- NPS público continua funcionando (anon SELECT em campaigns, campaign_contacts)
- Master vê tudo

