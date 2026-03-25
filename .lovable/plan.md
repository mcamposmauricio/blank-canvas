
# ✅ Concluído: Fix contadores + Performance Realtime

## Parte 1 — Triggers unificados (contadores)
- Removidos triggers conflitantes (`decrement_on_room_close`, `decrement_on_room_delete`)
- Recriado `resync_attendant_on_room_change` com escopo completo: INSERT + DELETE + UPDATE OF attendant_id, status
- Resync imediato executado — Felipe corrigido de 1→2

## Parte 2 — Filtros Realtime (performance)
- Adicionado `filter: tenant_id=eq.${tenantId}` em todos os canais: `chat-rooms-updates`, `global-sidebar-chat-rooms`, `global-sidebar-attendants`, `pending-rooms-realtime`, `attendant-queues-realtime`
- Removido listener global de `chat_messages` (`chat-messages-notification`) — substituído por detecção via `updated_at` do room
- Canais reduzidos de 7 sem filtro para 5 com filtro por tenant

# ✅ Concluído: Fix last message + unread + redução de DB requests

## Trigger: update_room_on_new_message
- Novo trigger `trg_update_room_on_message` em `chat_messages` (AFTER INSERT) que faz UPDATE em `chat_rooms.updated_at = now()`
- Isso garante que o canal realtime de `chat_rooms` detecte novas mensagens

## RPC: get_last_messages_for_rooms
- Atualizada para retornar `created_at` além de `room_id`, `content`, `sender_type`
- `fetchRooms` agora usa `m.created_at` ao invés de string vazia

## Consolidação de canais realtime
- Unificados `chat-rooms-updates` e `chat-room-activity` em um único canal
- Removido listener redundante de `chat_rooms` do `attendant-queues-realtime`
- Debounce do SidebarDataContext aumentado de 1s para 5s
- Adicionado filtro `tenant_id` no canal `dashboard-realtime-rooms`

## Impacto estimado
- ~60% redução no volume de DB requests
- Last message e unread count atualizando corretamente em tempo real
