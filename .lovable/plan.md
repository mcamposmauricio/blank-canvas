

# Plano: Fix Atendentes Duplicados + Limpeza de Triggers Duplicados

## Problema 1: Atendentes duplicados na sidebar
Dois triggers idênticos em `csms` (`sync_csm_chat_enabled_trigger` e `trg_sync_csm_chat_enabled`) executam a mesma function `sync_csm_chat_enabled` no UPDATE. Cada toggle cria 2 attendant_profiles. Sem unique constraint em `attendant_profiles(csm_id)`.

## Problema 2: Toggle precisa ser desligado/ligado
O trigger só dispara em UPDATE, não em INSERT. CSM criado com `is_chat_enabled = true` não gera attendant_profile.

## Problema 3: Triggers duplicados em massa
Auditoria completa revelou **19 pares de triggers duplicados** (mesma function, mesmo evento, mesma tabela):

| Tabela | Function duplicada | Triggers a REMOVER |
|---|---|---|
| `csms` | `sync_csm_chat_enabled` (UPDATE) | `trg_sync_csm_chat_enabled` |
| `campaign_contacts` | `create_nps_trail_on_campaign_contact` (INSERT) | `on_campaign_contact_create_nps_trail` |
| `campaign_contacts` | `update_nps_trail_on_email_sent` (UPDATE) | `on_campaign_contact_email_sent` |
| `chat_banner_field_rules` | `set_tenant_id_from_banner` (INSERT) | `set_tenant_id_from_banner_trigger` |
| `chat_banners` | `set_tenant_id_from_user` (INSERT) | `set_chat_banners_tenant_id` |
| `chat_broadcasts` | `set_tenant_id_from_user` (INSERT) | `set_broadcast_tenant_id` |
| `chat_broadcasts` | `update_updated_at_column` (UPDATE) | `update_broadcasts_updated_at` |
| `chat_business_hour_breaks` | `set_tenant_id_from_business_hour` (INSERT) | `set_break_tenant_id` |
| `chat_rooms` | `assign_chat_room` (INSERT) | `trg_assign_chat_room` (BEFORE) -- conflita com `auto_assign_chat_room` (AFTER); manter apenas o AFTER |
| `chat_rooms` | `create_chat_timeline_event` (UPDATE) | `trg_chat_timeline_update` |
| `chat_rooms` | `decrement_attendant_active_conversations` (UPDATE) | `trg_decrement_attendant_on_close` |
| `chat_rooms` | `decrement_on_room_delete` (DELETE) | `decrement_on_room_delete` (o duplicado) |
| `chat_rooms` | `update_company_contact_chat_metrics` (UPDATE) | `update_company_contact_metrics_on_close` |
| `chat_service_categories` | `set_tenant_id_from_user` (INSERT) | `set_tenant_id_chat_service_categories` |
| `chat_teams` | `set_tenant_id_from_user` (INSERT) | `set_tenant_id_chat_teams` |
| `responses` | `create_recovery_trail_for_detractor` (INSERT) | `recovery_trail_for_detractor` |
| `responses` | `update_campaign_send_response` (INSERT) | `update_campaign_send_on_response` |
| `responses` | `update_contact_nps_on_response` (INSERT) | `update_contact_nps` |

---

## Correções (1 migração SQL)

### 1. Remover 18 triggers duplicados
DROP de todos os triggers listados na coluna "Triggers a REMOVER" acima.

### 2. Limpar attendant_profiles duplicados
Deletar registros duplicados por `csm_id`, mantendo o mais recente. Limpar `chat_team_members` órfãos.

### 3. Adicionar UNIQUE constraint em `attendant_profiles(csm_id)`
Garante que `ON CONFLICT` funcione e previne futuras duplicatas.

### 4. Expandir trigger de `csms` para INSERT
Alterar `sync_csm_chat_enabled_trigger` para disparar em `AFTER INSERT OR UPDATE OF is_chat_enabled`. Ajustar a function para tratar INSERT (criar profile se `is_chat_enabled = true`).

### 5. Frontend
Nenhuma alteração necessária. A sidebar e AttendantsTab refletem dados corretos automaticamente.

