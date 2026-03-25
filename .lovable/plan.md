

# Fix contadores + Performance Realtime

## Parte 1 — Corrigir triggers conflitantes (contadores)

Existem 2 triggers atualizando `active_conversations` com logicas diferentes. Unificar em um unico trigger COUNT-based que dispara em todos os cenarios.

### Migration SQL

```sql
-- Remover triggers conflitantes
DROP TRIGGER IF EXISTS decrement_on_room_close ON public.chat_rooms;
DROP TRIGGER IF EXISTS decrement_on_room_delete ON public.chat_rooms;
DROP TRIGGER IF EXISTS resync_attendant_on_room_change ON public.chat_rooms;

-- Recriar com escopo completo (INSERT + DELETE + UPDATE de attendant_id e status)
CREATE TRIGGER resync_attendant_on_room_change
AFTER INSERT OR DELETE OR UPDATE OF attendant_id, status
ON public.chat_rooms
FOR EACH ROW
EXECUTE FUNCTION resync_attendant_counter_on_room_change();

-- Resync imediato
UPDATE attendant_profiles ap
SET active_conversations = sub.cnt
FROM (
  SELECT attendant_id, COUNT(*) as cnt
  FROM chat_rooms
  WHERE status IN ('active','waiting') AND attendant_id IS NOT NULL
  GROUP BY attendant_id
) sub
WHERE ap.id = sub.attendant_id;

UPDATE attendant_profiles
SET active_conversations = 0
WHERE id NOT IN (
  SELECT DISTINCT attendant_id FROM chat_rooms
  WHERE status IN ('active','waiting') AND attendant_id IS NOT NULL
) AND active_conversations != 0;
```

## Parte 2 — Reduzir carga Realtime (86% do tempo do banco)

### Problema

7 subscricoes `postgres_changes` sem filtro, gerando ~900k chamadas a `realtime.list_changes`. Cada write em `chat_rooms`, `chat_messages` ou `attendant_profiles` dispara processamento em TODAS as subscricoes de TODOS os usuarios.

### Inventario atual

```text
Canal                          | Tabela             | Filtro   | Arquivo
───────────────────────────────┼────────────────────┼──────────┼─────────────────────────
chat-rooms-updates             | chat_rooms (x3)    | nenhum   | useChatRealtime.ts
chat-messages-notification     | chat_messages      | nenhum   | useChatRealtime.ts
attendant-queues-realtime      | chat_rooms + att.  | nenhum   | useChatRealtime.ts
global-sidebar-chat-rooms      | chat_rooms         | nenhum   | SidebarDataContext.tsx
global-sidebar-attendants      | attendant_profiles | nenhum   | SidebarDataContext.tsx
pending-rooms-realtime         | chat_rooms         | nenhum   | PendingRoomsList.tsx
dashboard-realtime-rooms       | chat_rooms         | nenhum   | useDashboardStats.ts
```

### Solucao

**A. Adicionar filtro `tenant_id` em todas as subscricoes de `chat_rooms` e `attendant_profiles`**

O `tenantId` ja esta disponivel via `useAuth()`. Adicionar `filter: 'tenant_id=eq.${tenantId}'` reduz o processamento no servidor para apenas eventos do tenant corrente.

**B. Remover listener global de `chat_messages`** (`chat-messages-notification`)

Este e o maior ofensor — `chat_messages` e a tabela com mais writes. Substituir por:
- Usar o canal ja filtrado `chat-messages-${roomId}` (que ja existe em `useChatMessages`) para o room ativo
- Para rooms nao-ativos: usar o `updated_at` do `chat_rooms` (que ja chega via canal filtrado) para detectar atividade e fazer fetch pontual de unread count

**C. Consolidar canais duplicados de `chat_rooms`**

Atualmente 5 canais escutam `chat_rooms`. Reduzir para 2:
- 1 canal no `useChatRooms` (workspace ativo) com filtro `tenant_id`
- 1 canal no `SidebarDataContext` (global) com filtro `tenant_id`

Remover:
- `attendant-queues-realtime` → `useAttendantQueues` passa a escutar mudancas em `attendant_profiles` via `SidebarDataContext` (que ja tem o canal)
- `pending-rooms-realtime` → `PendingRoomsList` recebe callback de refresh do componente pai quando o canal de rooms dispara
- `dashboard-realtime-rooms` → manter mas com filtro `tenant_id`

### Resultado esperado

```text
ANTES: 7 canais sem filtro × N usuarios = ~28 subscricoes ativas
DEPOIS: 3 canais com filtro tenant_id × N usuarios = ~12 subscricoes filtradas

Reducao estimada de chamadas list_changes: 85-90%
```

## Arquivos a modificar

| Arquivo | Mudanca |
|---|---|
| Nova migration SQL | Unificar triggers + resync dados |
| `src/hooks/useChatRealtime.ts` | Adicionar filtro `tenant_id` em `chat-rooms-updates`; remover `chat-messages-notification` global e substituir por deteccao via `updated_at` do room; remover canal duplicado `attendant-queues-realtime` |
| `src/contexts/SidebarDataContext.tsx` | Adicionar filtro `tenant_id` nos 2 canais; expor callback `onRoomChange` para componentes filhos |
| `src/components/chat/PendingRoomsList.tsx` | Remover canal proprio; receber prop `refreshTrigger` do pai |
| `src/hooks/useDashboardStats.ts` | Adicionar filtro `tenant_id` no canal opt-in |

