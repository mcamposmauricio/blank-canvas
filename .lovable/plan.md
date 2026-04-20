
## Problema
Service Dashboard mostra 0 em tudo, mas existem 64 chats atribuídos a atendentes no momento. Os números não batem.

## Investigação necessária
Preciso identificar qual é o "Service Dashboard" exato. Pelos arquivos do projeto, os candidatos são:
- `src/pages/AdminDashboard.tsx`
- `src/pages/AdminDashboardGerencial.tsx`
- `src/components/backoffice/Operations.tsx` / `LiveTimeline.tsx`
- `src/hooks/useDashboardStats.ts`

Vou:
1. Ler `useDashboardStats.ts` e os componentes de dashboard para entender as queries
2. Rodar queries no banco para confirmar o estado real (64 atribuídos, distribuição por status, tenant)
3. Identificar a causa raiz: filtro errado de `tenant_id` (impersonation), filtro de status (`status = 'active'` vs `attendant_id IS NOT NULL`), filtro de data (hoje vs período), ou RLS bloqueando

## Hipóteses prováveis
- **H1:** Dashboard filtra por `status = 'active'` mas as 64 salas estão em outro status (ex: `waiting` com atendente atribuído, ou status legado)
- **H2:** Filtro de período (hoje, América/Sao_Paulo) está cortando salas atribuídas em dias anteriores que continuam abertas
- **H3:** Filtro de tenant errado — dashboard não está enxergando o tenant correto (provável MarQ) por estar logado como master sem impersonação
- **H4:** Query usa `attendant_profiles.active_conversations` (mantido por trigger) que está dessincronizado do estado real de `chat_rooms`

## Plano de execução
1. Ler código dos dashboards e do hook `useDashboardStats`
2. Rodar SQL para:
   - Contar salas com `attendant_id IS NOT NULL` agrupadas por `status` e `tenant_id`
   - Comparar `SUM(active_conversations)` de `attendant_profiles` vs contagem real em `chat_rooms`
   - Verificar `closed_at IS NULL AND attendant_id IS NOT NULL` (definição operacional de "em atendimento agora")
3. Apresentar diagnóstico em chat com:
   - Causa raiz identificada
   - Números reais por tenant/status
   - Recomendação de correção (ajustar filtro do dashboard ou ressincronizar `active_conversations`)

## Saída
Resposta em chat com diagnóstico — sem alteração de código nesta etapa. Se a causa for bug de query no frontend, abro um segundo plano para o fix.
