

# Fase 1+2: Otimizacao de Performance — Implementacao

## Resumo

7 fixes em 6 arquivos. Risco zero a baixo. Economia estimada: ~6.300 req/hora.

---

## Fix 1.1 — Eliminar polling 10s do `useAttendantQueues`

**Arquivo**: `src/hooks/useChatRealtime.ts` (linhas 488-503)

- Remover `setInterval(fetchQueues, 10000)`
- No `onAttendantUpdate`: fazer **inline update** no state (`setAttendants` com map que atualiza so o attendant do payload) em vez de `fetchQueues()` (3 queries)
- Adicionar `onRoomStatusChange` para atualizar `unassignedRooms` inline (add/remove quando `attendant_id` ou `status` muda)
- Safety net: `setInterval(fetchQueues, 120000)` (2 min)

## Fix 1.2 — Remover listener UPDATE de `chat_messages`

**Arquivo**: `src/hooks/useChatRealtime.ts` (linhas 138-152)

- Remover bloco `.on("postgres_changes", { event: "UPDATE", table: "chat_messages" })` inteiro
- Manter apenas INSERT

## Fix 1.3 — `attendant_profiles` apenas UPDATE

**Arquivo**: `src/contexts/TenantRealtimeContext.tsx` (linha 208)

- Trocar `event: "*"` para `event: "UPDATE"`

## Fix 2.1 — Remover pg_changes do `VisitorInfoPanel`

**Arquivo**: `src/components/chat/VisitorInfoPanel.tsx` (linhas 419-453)

- Remover o `useEffect` inteiro que cria o canal `visitor-panel-{visitorId}`

## Fix 2.2 — Remover canal per-room `visitor_last_read_at`

**Arquivos**: `AdminWorkspace.tsx` (linhas 208-222) + `AttendantLite.tsx` (linhas 109-116) + `TenantRealtimeContext.tsx`

- Adicionar `visitor_last_read_at?: string | null` ao `RoomStatusPayload` (interface, linha 7-15)
- Incluir `visitor_last_read_at` no mapping do safety net (linha 141-150)
- AdminWorkspace: remover canal `workspace-room-read-{roomId}`. Adicionar `onRoomStatusChange` que atualiza `visitorLastReadAt` quando `room_id === selectedRoomId`
- AttendantLite: remover canal `lite-room-read-{roomId}`. Mesmo approach via `onRoomStatusChange`

## Fix 2.3 — Debounce em PendingRoomsList e pendingRefreshTrigger

**Arquivo**: `src/components/chat/PendingRoomsList.tsx` (linhas 88-91)
- Adicionar `setTimeout` de 5s com limpeza no `useEffect` do `refreshTrigger`

**Arquivos**: `AdminWorkspace.tsx` (linhas 92-98) + `AttendantLite.tsx` (linhas 86-89)
- Substituir incremento imediato por `setTimeout` de 10s com limpeza

---

## Arquivos modificados

| Arquivo | Fixes |
|---------|-------|
| `src/hooks/useChatRealtime.ts` | 1.1 + 1.2 |
| `src/contexts/TenantRealtimeContext.tsx` | 1.3 + 2.2 (payload + event filter) |
| `src/components/chat/VisitorInfoPanel.tsx` | 2.1 |
| `src/pages/AdminWorkspace.tsx` | 2.2 + 2.3 |
| `src/pages/AttendantLite.tsx` | 2.2 + 2.3 |
| `src/components/chat/PendingRoomsList.tsx` | 2.3 |

## Economia estimada

```text
Fix                                Antes/h    Depois/h
─────────────────────────────────────────────────────────
1.1 useAttendantQueues polling      3.960         90
1.2 chat_messages UPDATE WAL          300        150
1.3 attendant_profiles WAL            200         40
2.1 VisitorInfoPanel WAL              600          0
2.2 Per-room visitor_read WAL       1.200          0
2.3 Debounces                         700        100
─────────────────────────────────────────────────────────
TOTAL                              ~6.960       ~380
```

Reducao: **~6.300 req/hora** (~14% do total). Fase 3 (consolidacao Widget) adiciona mais ~6.000.

