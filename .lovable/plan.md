

# Plano: Otimizacao Completa de Performance do Sistema

O plano anterior (widget) foi implementado. Este plano cobre as otimizacoes do painel admin/operador que foram identificadas mas nao executadas.

## 1. Polling do SidebarDataContext: 30s → 5min

**Arquivo:** `src/contexts/SidebarDataContext.tsx` linha 286

Hoje: `setInterval(resyncCounts, 30_000)` — ~120 queries/hora por usuario.
O Realtime com debounce de 1s ja cobre mudancas em tempo real. O intervalo serve apenas como safety net.

**Mudanca:** Alterar para `300_000` (5 minutos). Economia: ~108 queries/hora por usuario.

## 2. Mover `process-chat-auto-rules` para cron job

**Arquivo:** `src/components/SidebarLayout.tsx` linhas 126-150

Hoje: cada usuario logado chama a edge function a cada 5 min. Com 6 usuarios = 72 chamadas/hora ao edge function, que por sua vez faz queries no banco.

**Mudanca:**
- Criar migracao SQL com `cron.schedule` para chamar `process-chat-auto-rules` a cada 5 min (1 chamada global, nao por usuario)
- Remover o `useEffect` de polling do `SidebarLayout.tsx`

## 3. Otimizar `fetchRooms` no `useChatRealtime.ts`

**Arquivo:** `src/hooks/useChatRealtime.ts` linhas 222-274

Hoje faz 3 queries separadas apos buscar rooms:
1. `chat_messages` SELECT para last message (retorna TODAS as mensagens de todos os rooms, filtra no client)
2. `chat_room_reads` SELECT
3. `chat_messages` SELECT novamente para unreads

**Mudanca:**
- Query 1: usar a funcao `get_last_messages_for_rooms` (ja criada na migracao anterior) via RPC em vez de buscar todas as mensagens
- Queries 2+3 permanecem (sao necessarias para unread count preciso)

Economia: de centenas/milhares de rows retornadas para exatamente 1 row por room.

## 4. Otimizar `useDashboardStats` — batches de first response

**Arquivo:** `src/hooks/useDashboardStats.ts` linhas 282-320

Hoje: busca TODAS as mensagens de atendente em batches de 50 rooms para calcular first response time. Com 200 rooms = 4 queries retornando potencialmente milhares de rows.

**Mudanca:** Criar database function `get_first_response_times(p_room_ids uuid[])` que usa `DISTINCT ON (room_id)` com `ORDER BY created_at ASC` para retornar apenas 1 mensagem por room. Substituir os batches por 1 chamada RPC.

## 5. Consolidar queries do SidebarDataContext

**Arquivo:** `src/contexts/SidebarDataContext.tsx` linhas 35-100

Hoje faz ate 6 queries sequenciais:
1. `attendant_profiles` (my profile)
2. `attendant_profiles` (all tenant)
3. `chat_team_members` (my teams)
4. `chat_team_members` (team members)
5. `attendant_profiles` (again, for "other" teams — redundante)

**Mudanca:** Buscar `attendant_profiles` do tenant 1 vez. Buscar `chat_team_members` do tenant 1 vez. Filtrar no client. De 5 queries → 2 queries.

## Resumo de Impacto

| Melhoria | Antes | Depois | Complexidade |
|---|---|---|---|
| Resync interval | 120 queries/h/user | 12 queries/h/user | 1 linha |
| Auto-rules cron | 72 calls/h (6 users) | 12 calls/h (global) | Migration + remover useEffect |
| fetchRooms last msg | Todas as msgs retornadas | 1 msg/room via RPC | 1 chamada RPC |
| Dashboard first response | 4 batches, milhares rows | 1 RPC, 1 row/room | Nova DB function |
| Sidebar queries | 5 queries sequenciais | 2 queries | Refactor JS |

## Arquivos

| Tipo | Arquivo |
|---|---|
| Editar | `src/contexts/SidebarDataContext.tsx` — intervalo 30s→300s + consolidar queries |
| Editar | `src/components/SidebarLayout.tsx` — remover useEffect de polling |
| Editar | `src/hooks/useChatRealtime.ts` — usar RPC `get_last_messages_for_rooms` |
| Editar | `src/hooks/useDashboardStats.ts` — usar nova RPC para first response |
| Migration | Cron job `process-chat-auto-rules` a cada 5 min |
| Migration | Nova function `get_first_response_times(p_room_ids uuid[])` |

