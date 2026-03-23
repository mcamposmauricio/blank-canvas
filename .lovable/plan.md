

# Plano: Corrigir ChatInput que aparece e depois some

## Causa provavel

O `effectiveRoom` (linha 275) depende de `selectedRoom` que vem de `rooms.find()`. Quando o `useChatRealtime` refaz o fetch dos rooms (via realtime trigger ou polling), o array `rooms` e substituido — durante esse refetch, `selectedRoom` fica `undefined` momentaneamente. Como `pendingSelectedRoom` tambem e `null` para rooms normais, `effectiveRoom` fica `null` e todo o bloco do chat (incluindo ChatInput) desmonta.

Ao completar o refetch, `selectedRoom` volta e o chat remonta — mas o ChatInput some e nao reaparece visivelmente porque o textarea perde o foco/estado.

Alem disso, o `useEffect` na linha 240-249 pode limpar `selectedRoomId` se o room sair momentaneamente de `filteredRooms` durante um re-render.

## Correcao

### AdminWorkspace.tsx

1. **Preservar ultimo room selecionado**: Criar um `lastEffectiveRoom` ref que guarda o ultimo `effectiveRoom` valido. Usar esse ref como fallback quando `effectiveRoom` e `null` durante refetches — assim o chat nunca desmonta durante carregamentos

2. **Proteger o useEffect de limpeza** (linha 240-249): Adicionar debounce ou verificar que o room realmente sumiu (nao e so um refetch temporario) — ex: so limpar apos 2 ciclos de render sem encontrar o room

3. **Textarea**: Remover `resize-y` que pode causar colapso visual em alguns cenarios. Usar auto-resize via JS (ajustar `scrollHeight`) em vez de resize manual

## Arquivo

| Arquivo | Mudanca |
|---|---|
| `src/pages/AdminWorkspace.tsx` | `lastEffectiveRoom` ref como fallback, debounce na limpeza |
| `src/components/chat/ChatInput.tsx` | Remover `resize-y`, usar auto-resize por scrollHeight |

