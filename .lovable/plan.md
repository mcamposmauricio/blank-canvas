
## Problema
64 salas com `status='waiting'` + `attendant_id NOT NULL` (já atribuídas mas presas em waiting) não aparecem como "Na Fila" no dashboard nem como "Ativas".

## Causa raiz
No `useDashboardStats.ts` (a confirmar), a contagem de "fila/waiting" provavelmente filtra `status='waiting' AND attendant_id IS NULL`. Como essas 64 têm atendente atribuído, caem no vácuo.

## Correção mínima
Alterar **uma única linha** da query/filtro de "salas na fila" no dashboard para considerar apenas `status='waiting'` (sem condicionar a `attendant_id`). Assim toda sala em waiting aparece na fila, independente de ter sido pré-atribuída.

## Passos
1. Ler `src/hooks/useDashboardStats.ts` e `src/pages/AdminDashboard.tsx` para localizar o filtro exato de "waiting/fila".
2. Remover a condição `attendant_id IS NULL` (ou equivalente) do contador de fila.
3. Sem outras mudanças: KPIs de "ativas", tempo de espera e demais permanecem iguais.

## Fora de escopo
- Não vou destravar as 64 salas (mudar status para active) — só corrigir a contagem.
- Não vou alterar o `ChatRoomList` do workspace (já agrupa corretamente waiting vs active).
- Não vou mexer em triggers nem trigger de assignment.

## Arquivo afetado
- `src/hooks/useDashboardStats.ts` (provável; confirmar no momento da execução)
