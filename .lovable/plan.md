

# Plano: Bateria Completa de Testes — Widget + Atendente

## Objetivo

Criar testes abrangentes que validam todos os fluxos criticos do sistema de chat: Widget (visitante), AdminWorkspace (gestor), AttendantLite (atendente) e hooks compartilhados (`useChatMessages`, `useChatRooms`, `useAttendantQueues`). Cobrindo: contadores, troca de mensagens, transicoes de estado, typing, unread, som, notificacoes e debounce.

## Cobertura Existente vs. Gaps

Ja testado:
- Widget: field classification, JSONB merge, auto-start, realtime handlers (INSERT/UPDATE/proactive/reopen/typing), channel structure

Gaps identificados:
- `useChatMessages`: INSERT dedup, clear on room switch, pagination (loadMore)
- `useChatRooms`: room sorting, unread increment via broadcast, inline patch, sound/notification triggers, markRoomAsRead
- `useAttendantQueues`: inline attendant update, unassigned room tracking, safety-net reconciliation
- Workspace/Lite typing: channel lifecycle, timeout reset, filtering own user
- ChatInput typing broadcast: throttle 2s, channel name correctness
- Widget consolidated channel: dependency array rebuild (visitorId/roomId/phase changes)

## Testes a Criar

### Arquivo 1: `src/hooks/__tests__/useChatMessagesLogic.test.ts`

**Suite — Recepcao e paginacao de mensagens**
- INSERT adiciona mensagem ao array em ordem cronologica
- Mensagem duplicada (mesmo id) nao e adicionada
- Ao trocar de room, mensagens sao limpas imediatamente (array vazio)
- loadMore prepend mensagens anteriores mantendo ordem
- hasMore = true quando response > PAGE_SIZE, false caso contrario
- Canal usa sufixo aleatorio para evitar colisao entre instancias

### Arquivo 2: `src/hooks/__tests__/useChatRoomsLogic.test.ts`

**Suite — Ordenacao e unread**
- Rooms com unread_count > 0 aparecem primeiro
- Entre rooms com mesmo status de unread, ordena por last_message_at desc
- Room sem last_message_at usa created_at como fallback
- markRoomAsRead zera unread_count da room no state local

**Suite — Inline update via broadcast**
- onRoomStatusChange com status "closed" remove room quando excludeClosed=true
- onRoomStatusChange com status "_deleted" remove room
- onRoomStatusChange com novo room_id dispara fetchSingleRoom
- onRoomStatusChange com attendant_id atualiza inline sem refetch

**Suite — Mensagem activity**
- onNewMessageActivity incrementa unread_count para mensagem de visitor em room nao selecionada
- onNewMessageActivity NAO incrementa unread se room esta selecionada
- onNewMessageActivity atualiza last_message e last_message_at
- Som toca para mensagem de visitor em room nao selecionada quando soundEnabled=true

### Arquivo 3: `src/hooks/__tests__/useAttendantQueuesLogic.test.ts`

**Suite — Inline updates**
- onAttendantUpdate atualiza status do atendente por id
- onAttendantUpdate atualiza active_conversations inline
- onAttendantUpdate nao altera atendentes com id diferente
- onRoomStatusChange com closed remove de unassignedRooms
- onRoomStatusChange com attendant_id remove de unassignedRooms
- onRoomStatusChange sem attendant_id adiciona a unassignedRooms (dedup)

### Arquivo 4: `src/components/chat/__tests__/TypingFlow.test.ts`

**Suite — Typing lifecycle completo (Workspace + Lite + Widget)**
- Broadcast de typing seta typingUser com nome recebido
- typingUser reseta para null apos 3000ms
- Novo typing antes do timeout reinicia o timer
- Typing do proprio usuario (mesmo user_id) e ignorado (Workspace/Lite)
- Canal Workspace usa nome `typing-{roomId}`, Lite usa `typing-lite-{roomId}`
- Widget typing canal e separado do canal consolidado
- ChatInput throttle: broadcast so dispara se > 2s desde o ultimo

### Arquivo 5: `src/pages/__tests__/WidgetChannelRebuild.test.ts`

**Suite — Rebuild do canal consolidado**
- Canal e destruido e recriado quando roomId muda
- Canal e destruido e recriado quando visitorId muda
- Canal e destruido e recriado quando phase muda
- Sem visitorId, nenhum canal e criado
- Sem roomId, canal tem apenas listeners de chat_rooms por visitorId

## Abordagem Tecnica

Todos os testes sao unitarios puros com Vitest. A logica e extraida como funcoes puras que recebem state e retornam novo state, seguindo o padrao ja estabelecido em `ChatWidgetRealtime.test.ts`. Sem mocks de Supabase, sem dependencia de rede.

## Arquivos

| Arquivo | Tipo |
|---------|------|
| `src/hooks/__tests__/useChatMessagesLogic.test.ts` | Novo |
| `src/hooks/__tests__/useChatRoomsLogic.test.ts` | Novo |
| `src/hooks/__tests__/useAttendantQueuesLogic.test.ts` | Novo |
| `src/components/chat/__tests__/TypingFlow.test.ts` | Novo |
| `src/pages/__tests__/WidgetChannelRebuild.test.ts` | Novo |

Nenhum arquivo de producao sera modificado.

