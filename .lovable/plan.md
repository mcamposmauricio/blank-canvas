

# Relatório de Validação da Plataforma

## 1. Tabelas

| Item | Status |
|------|--------|
| tenants | ✅ OK |
| user_profiles | ✅ OK |
| user_roles | ✅ OK |
| contacts | ✅ OK (todas as 17 colunas documentadas presentes) |
| company_contacts | ✅ OK |
| csms | ✅ OK |
| campaigns | ✅ OK |
| campaign_contacts | ✅ OK |
| campaign_sends | ✅ OK |
| responses (nps_responses na doc) | ✅ OK (tabela existe como `responses`) |
| chat_visitors | ✅ OK |
| chat_rooms | ✅ OK |
| chat_messages | ✅ OK |
| attendant_profiles | ✅ OK |
| chat_service_categories | ✅ OK |
| chat_teams | ✅ OK |
| chat_team_members | ✅ OK |
| chat_category_teams | ✅ OK |
| chat_assignment_configs | ✅ OK |
| chat_business_hours | ✅ OK |
| chat_business_hour_breaks | ✅ OK |
| chat_business_hour_overrides | ✅ OK |
| chat_banners | ✅ OK |
| chat_banner_field_rules | ✅ OK |
| chat_banner_assignments | ✅ OK |
| help_collections | ✅ OK |
| help_articles | ✅ OK |
| help_article_versions | ✅ OK |
| trail_templates | ✅ OK |
| trail_template_activities | ✅ OK |
| trails | ✅ OK |
| trail_activity_logs | ✅ OK |
| user_permissions | ✅ OK |
| api_keys | ✅ OK |
| brand_settings | ✅ OK |
| timeline_events | ✅ OK |

Tabelas adicionais encontradas (não documentadas mas existentes): `chat_auto_rules`, `chat_broadcasts`, `chat_broadcast_recipients`, `chat_category_field_rules`, `chat_custom_field_definitions`, `chat_custom_fields`, `chat_macros`, `chat_room_reads`, `chat_room_tags`, `chat_settings`, `chat_tags`, `help_article_events`, `help_article_feedback`, `help_site_settings`, `leads`, `user_email_settings`, `user_notification_settings`.

## 2. Enums

| Enum | Status | Detalhes |
|------|--------|----------|
| app_role | ❌ Divergência | Possui: `admin`, `attendant`, `master`. **Faltam: `moderator`, `user`**. Possui `attendant` (não documentado). |
| trail_type | ✅ OK | Possui: `default`, `overdue`, `attention`, `nps`. Nota: `overdue` não estava na doc mas existe. |
| timeline_event_type | ✅ OK | Todos os valores presentes. |

## 3. Funções

| Função | Status |
|--------|--------|
| get_user_tenant_id() | ✅ OK |
| has_role() | ✅ OK |
| is_master() | ✅ OK |
| set_tenant_id_from_user() | ✅ OK |
| set_tenant_id_from_banner() | ✅ OK |
| set_tenant_id_from_business_hour() | ✅ OK |
| assign_chat_room() | ✅ OK |
| decrement_attendant_active_conversations() | ✅ OK |
| resync_attendant_counter_on_room_change() | ✅ OK |
| decrement_on_room_delete() | ✅ OK |
| sync_csm_chat_enabled() | ✅ OK |
| sync_attendant_display_name() | ✅ OK |
| update_contact_nps_on_response() | ✅ OK |
| create_recovery_trail_for_detractor() | ✅ OK |
| create_nps_trail_on_campaign_contact() | ✅ OK |
| update_nps_trail_on_email_sent() | ✅ OK |
| update_campaign_send_response() | ✅ OK |
| update_company_contact_chat_metrics() | ✅ OK |
| create_chat_timeline_event() | ✅ OK |
| search_help_articles() | ✅ OK |
| update_updated_at_column() | ✅ OK |
| set_tenant_id_from_owner() | ❌ Ausente | Documentada mas não existe no banco. O `chat_rooms` usa trigger direto no `assign_chat_room` que resolve tenant_id internamente. |

## 4. Triggers

| Trigger | Tabela | Status |
|---------|--------|--------|
| trg_assign_chat_room | chat_rooms | ✅ OK |
| trg_decrement_attendant_on_close | chat_rooms | ✅ OK |
| trg_resync_attendant_counter | chat_rooms | ✅ OK |
| decrement_active_on_room_delete | chat_rooms | ✅ OK |
| trg_chat_timeline_insert/update | chat_rooms | ✅ OK |
| trg_update_chat_metrics | chat_rooms | ✅ OK |
| trg_sync_csm_chat_enabled | csms | ✅ OK |
| sync_attendant_name_on_profile_update | user_profiles | ✅ OK |
| on_nps_response_update_contact | responses | ✅ OK |
| on_detractor_create_recovery_trail | responses | ✅ OK |
| on_campaign_contact_create_nps_trail | campaign_contacts | ✅ OK |
| on_campaign_contact_email_sent | campaign_contacts | ✅ OK |
| on_response_received | responses | ✅ OK |
| set_chat_banners_tenant_id | chat_banners | ✅ OK |
| set_tenant_id_from_banner_trigger | chat_banner_field_rules | ✅ OK |
| set_break_tenant_id | chat_business_hour_breaks | ✅ OK |
| set_broadcast_tenant_id | chat_broadcasts | ✅ OK |
| Todos os update_*_updated_at | Vários | ✅ OK |

## 5. RLS Policies

| Item | Status |
|------|--------|
| Todas as tabelas têm RLS habilitado | ✅ OK (nenhuma tabela sem RLS) |
| Todas as tabelas têm policies | ✅ OK (nenhuma tabela sem policies) |

## 6. Realtime

| Tabela | Status |
|--------|--------|
| chat_messages | ✅ OK |
| chat_rooms | ✅ OK |
| attendant_profiles | ✅ OK |
| chat_banner_assignments | ✅ OK |
| chat_broadcasts | ✅ OK |
| help_articles | ✅ OK |

## 7. Storage Buckets

| Bucket | Público | Status |
|--------|---------|--------|
| logos | Sim | ✅ OK |
| chat-attachments | Sim | ✅ OK |
| help-images | Sim | ✅ OK |

## 8. Build Errors (Problema Principal)

O arquivo `src/integrations/supabase/types.ts` está **vazio** — as tabelas estão definidas como `[_ in never]: never`, o que causa todos os erros de TypeScript (`'chat_rooms' is not assignable to parameter of type 'never'`). Isso acontece porque o Supabase não gerou os tipos automaticamente para este projeto.

**Solução**: Preciso regenerar os tipos do Supabase executando a sincronização de tipos. Isso é feito automaticamente pelo Lovable quando a conexão Supabase está ativa, mas o arquivo atual está com tipos vazios.

---

## Resumo de Divergências

| # | Item | Severidade | Recomendação |
|---|------|-----------|--------------|
| 1 | enum `app_role` falta `moderator` e `user` | **Alta** | Adicionar valores ao enum via migration: `ALTER TYPE app_role ADD VALUE 'moderator'; ALTER TYPE app_role ADD VALUE 'user';` |
| 2 | Função `set_tenant_id_from_owner()` ausente | **Baixa** | Não impacta funcionalidade — o `assign_chat_room` resolve tenant_id diretamente. Criar se necessário para consistência. |
| 3 | `types.ts` vazio (causa todos os build errors) | **Crítica** | Regenerar tipos do Supabase. Isso resolve todos os ~100+ erros de TypeScript. |

### Plano de Correção

1. **Criar migration** para adicionar valores faltantes no enum `app_role`:
   - `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';`
   - `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';`

2. **Regenerar `types.ts`** — o Lovable fará isso automaticamente após a migration, resolvendo todos os build errors.

3. Opcionalmente criar a função `set_tenant_id_from_owner()` se houver necessidade futura.

