

# Plano: Corrigir link de conversa redirecionando para workspace vazio

## Causa raiz

Quando o usuario acessa `/admin/chat/:roomId`, o `ChatRouteRedirect` redireciona para `/admin/workspace/:roomId`. O workspace seta `selectedRoomId = paramRoomId`.

Porem, o `useEffect` nas linhas 234-243 do `AdminWorkspace.tsx` limpa o `selectedRoomId` se o room nao estiver em `filteredRooms`. O `filteredRooms` filtra apenas rooms do atendente atual (linha 221-225). Se o room pertence a outro atendente (ou esta sem atendente), ele e removido da selecao — e o usuario ve o workspace vazio.

## Correcao

### AdminWorkspace.tsx — Preservar `paramRoomId`

1. No `useEffect` de limpeza (linha 234-243): se `paramRoomId` estiver definido e for igual ao `selectedRoomId`, **nao limpar** — o usuario navegou intencionalmente para essa conversa

2. No `filteredRooms` (linha 217-225): se `paramRoomId` estiver definido, incluir sempre o room com esse ID no filtro (alem dos filtros normais), para que ele apareca na lista lateral

3. Se o room do `paramRoomId` nao estiver na lista `rooms` (pertence a outro atendente e o `useChatRooms` nao o retorna por filtro de status), fazer um fetch direto desse room especifico no mount e adicionar ao estado

## Arquivo

| Arquivo | Mudanca |
|---|---|
| `src/pages/AdminWorkspace.tsx` | Preservar paramRoomId no filtro e na limpeza, fetch direto se necessario |

