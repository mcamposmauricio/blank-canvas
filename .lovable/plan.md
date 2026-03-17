
# Plano: Default Queue/Team Always Active + Priority Assignment — CONCLUÍDO ✅

## O que foi feito

### Migração: Triggers + Auto-provisioning
- ✅ Removidos 6 triggers duplicados em `chat_rooms` (auto_assign_chat_room, trg_chat_timeline_update, trg_decrement_attendant_on_close, decrement_active_on_room_delete, trg_resync_attendant_counter, update_company_contact_metrics_on_close)
- ✅ Criada function `ensure_tenant_chat_defaults(p_tenant_id, p_user_id)` que auto-provisiona: default team, default category, category-team link, e assignment config habilitado
- ✅ Trigger `trg_provision_tenant_chat_defaults` em `user_profiles` AFTER INSERT para provisionar defaults em novos tenants
- ✅ Function `sync_csm_chat_enabled()` atualizada para chamar `ensure_tenant_chat_defaults` e auto-vincular atendente ao time default
- ✅ UNIQUE constraint em `chat_assignment_configs(category_team_id)` para suportar ON CONFLICT

### Frontend
- ✅ Removido bloco de setTimeout + auto-assign manual em AttendantsTab.tsx (o trigger faz tudo automaticamente)

## Resultado
- Default team + category + assignment config são criados automaticamente para cada tenant
- Novos atendentes são vinculados ao time default automaticamente pelo trigger
- Regras manuais de categoria têm prioridade na atribuição (service_category_id definido pelo resolve-chat-visitor)
- Sem regra manual → fallback para categoria/time default
- 6 triggers redundantes eliminados em chat_rooms
