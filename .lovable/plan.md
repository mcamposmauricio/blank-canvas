
# Auditoria do Chat — Resultado

## Status Geral: Sistema Funcional com 1 Bug Encontrado

Todos os 18 processos criticos estao operacionais. A arquitetura broadcast + safety net esta correta e completa. Porem ha um bug na edge function `assign-chat-room` que impede o broadcast explicito de funcionar (o safety net compensa, mas com 1-2s de atraso).

## Bug: `assign-chat-room` — variavel errada no broadcast

**Arquivo**: `supabase/functions/assign-chat-room/index.ts`, linha 161
**Problema**: O broadcast usa `roomId` (variavel inexistente/undefined) em vez de `room_id` (variavel do request body). O payload enviado fica `{ room_id: undefined, ... }`, que o frontend ignora.

```text
ANTES (bugado):   payload: { room_id: roomId, ...
CORRETO:          payload: { room_id: room_id, ...
```

**Impacto**: O broadcast da edge function nao funciona. O frontend ainda recebe o evento via safety net (pg_changes), entao o chat aparece — mas com ~1-2s a mais de latencia ao atribuir salas automaticamente.

## Verificacao Completa

| Componente | Status | Observacao |
|---|---|---|
| TenantRealtimeContext | OK | Broadcast + safety net (INSERT, UPDATE, DELETE) + attendants pg_changes |
| useChatRooms | OK | Consome onRoomStatusChange + onNewMessageActivity corretamente |
| useChatMessages | OK | Canal scoped `chat-messages-{roomId}` inalterado |
| useAttendantQueues | OK | Polling 10s + onAttendantUpdate |
| SidebarDataContext | OK | debouncedResync via broadcast + polling 300s |
| PendingRoomsList | OK | refreshTrigger prop via onRoomStatusChange |
| AdminWorkspace broadcasts | OK | handleReopenRoom, handleMarkResolved, handleConfirmClose, handleReassign, handleSendMessage, handleAssignRoom — todos enviam broadcast |
| ChatWidget visitor channel | OK | Merged INSERT+UPDATE em `widget-visitor-{visitorId}` |
| Widget messages/room channels | OK | Scoped, inalterados |
| process-chat-auto-rules | OK | Broadcasts corretos com `room.id` |
| process-chat-broadcasts | OK | Broadcasts corretos com `room.id` |
| assign-chat-room | **BUG** | `roomId` em vez de `room_id` na linha 161 |
| Som/notificacao | OK | Handler em useChatRooms L350-369 |
| App.tsx wrapper | OK | TenantRealtimeProvider dentro de AuthProvider |

## Correcao

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/assign-chat-room/index.ts` | Linha 161: trocar `roomId` por `room_id` |

Correcao de 1 linha, zero risco, deploy automatico.
