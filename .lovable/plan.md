
# Plano: Fix Atendentes Duplicados + Limpeza de Triggers — CONCLUÍDO ✅

## O que foi feito

### Migração 1 (parcial — triggers)
- ✅ Removidos 18 triggers duplicados em 10 tabelas (csms, campaign_contacts, chat_banner_field_rules, chat_banners, chat_broadcasts, chat_business_hour_breaks, chat_rooms, chat_service_categories, chat_teams, responses)

### Migração 2 (dados + constraint + trigger)
- ✅ Limpeza de attendant_profiles duplicados (mantido o mais recente por csm_id)
- ✅ Limpeza de chat_team_members órfãos
- ✅ Adicionada UNIQUE constraint em `attendant_profiles(csm_id)`
- ✅ Function `sync_csm_chat_enabled()` reescrita para tratar INSERT + UPDATE
- ✅ Trigger expandido para `AFTER INSERT OR UPDATE OF is_chat_enabled`

## Resultado
- Atendentes não aparecem mais duplicados na sidebar
- Novos CSMs criados com `is_chat_enabled = true` geram attendant_profile automaticamente (sem precisar desligar/ligar toggle)
- Constraint UNIQUE previne futuras duplicatas
- 18 triggers redundantes eliminados (performance melhorada)
