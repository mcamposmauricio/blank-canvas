

# Plano: Limpar dados ao trocar de room + preservar drafts

## Problemas

1. **Side panel e mensagens mostram dados do room anterior** — O `lastEffectiveRoomRef` mantem o room antigo como fallback durante transicoes. Quando o usuario clica em outro room ou troca filtro de atendente, o ref continua exibindo o room anterior ate o novo carregar.

2. **Drafts** — Ja implementado via `draftsMap` no `ChatInput.tsx` (linha 17). O sistema ja persiste e restaura rascunhos por room. Nenhuma mudanca necessaria.

## Causa raiz

Linha 285-287 do `AdminWorkspace.tsx`:
```
const rawEffectiveRoom = selectedRoom ?? pendingSelectedRoom;
if (rawEffectiveRoom) lastEffectiveRoomRef.current = rawEffectiveRoom;
const effectiveRoom = rawEffectiveRoom ?? lastEffectiveRoomRef.current;
```

O ref so e util para evitar flicker durante refetches do realtime (quando o mesmo room desaparece e reaparece). Mas quando o usuario **intencionalmente** troca de room, o ref deveria ser limpo.

## Mudancas

### AdminWorkspace.tsx

1. **Limpar `lastEffectiveRoomRef` ao trocar de room**: No `handleSelectRoom` e `handleSelectPendingRoom`, fazer `lastEffectiveRoomRef.current = null` antes de setar o novo `selectedRoomId`. Isso garante que o panel/mensagens nao mostrem dados do room anterior.

2. **Limpar ao trocar filtro de atendente**: Quando o usuario troca o filtro de atendente (`selectedAttendantId`), limpar `selectedRoomId` e `lastEffectiveRoomRef` para que o painel fique vazio ate selecionar um novo room.

3. **Limpar `pendingSelectedRoom`** nos mesmos pontos para evitar conflitos.

## Arquivo

| Arquivo | Mudanca |
|---|---|
| `src/pages/AdminWorkspace.tsx` | Limpar ref e pendingSelectedRoom ao trocar room/atendente |

