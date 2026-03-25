
# ✅ Concluído: Fix contadores + Performance Realtime

## Parte 1 — Triggers unificados (contadores)
- Removidos triggers conflitantes (`decrement_on_room_close`, `decrement_on_room_delete`)
- Recriado `resync_attendant_on_room_change` com escopo completo: INSERT + DELETE + UPDATE OF attendant_id, status
- Resync imediato executado — Felipe corrigido de 1→2

## Parte 2 — Filtros Realtime (performance)
- Adicionado `filter: tenant_id=eq.${tenantId}` em todos os canais: `chat-rooms-updates`, `global-sidebar-chat-rooms`, `global-sidebar-attendants`, `pending-rooms-realtime`, `attendant-queues-realtime`
- Removido listener global de `chat_messages` (`chat-messages-notification`) — substituído por detecção via `updated_at` do room
- Canais reduzidos de 7 sem filtro para 5 com filtro por tenant
