

# Plano: Aplicar Migration de Triggers Pendente

## Diagnóstico

A migration que cria os 55 triggers (`20260316031101_629de6a9-...sql`) **existe no repositório mas não foi aplicada ao banco**. Confirmei via query que há **zero triggers** no database. Isso causa falhas porque:

- `set_tenant_id_from_user()` / `set_tenant_id_from_owner()` nunca são chamadas → `tenant_id` fica `NULL`
- O fluxo de accept-invite no `backoffice-admin` insere em `user_profiles` e `csms`, mas sem triggers o `tenant_id` não propaga corretamente
- Os edge function logs não mostram erros explícitos, o que sugere que a operação "funciona" mas os dados ficam inconsistentes

## Solução

Criar uma **nova migration** com o SQL completo fornecido pelo usuário (enums + funções + 55 triggers + realtime + storage buckets), usando `CREATE OR REPLACE` e `DROP TRIGGER IF EXISTS` para idempotência. Isso substituirá a migration anterior que não foi aplicada.

O SQL será essencialmente o que o usuário forneceu, organizado em seções:
1. Enums (`app_role`, `timeline_event_type`, `trail_type`)
2. Funções utilitárias (RLS)
3. Funções de trigger (tenant auto-set)
4. Função `update_updated_at_column`
5. Funções de negócio (chat assignment, NPS, metrics, timeline)
6. Funções de sync (CSM/attendant)
7. Busca help center
8. **Todos os 55 triggers** com `DROP IF EXISTS` antes de cada `CREATE`
9. Realtime publication
10. Storage buckets

## Impacto

Após aplicação, todo o sistema de multi-tenancy, auto-assignment de chat, NPS trails e métricas voltará a funcionar corretamente.

