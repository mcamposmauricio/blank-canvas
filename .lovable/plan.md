

# Plano: Bateria de Testes — Validacao da Fase 3 (Consolidacao de Canais)

## Objetivo

Criar testes automatizados que validam que a consolidacao dos 3 canais pg_changes em 1 canal unico no ChatWidget nao quebrou nenhum fluxo: recepcao de mensagens, transicoes de fase, deteccao de mensagens deletadas, chats proativos, typing indicator e contadores de unread.

## Abordagem

Testes unitarios puros com Vitest, extraindo a logica dos handlers do canal consolidado para funcoes testaveis. Sem dependencia de Supabase real.

## Testes a Criar

### Arquivo 1: `src/pages/__tests__/ChatWidgetRealtime.test.ts`

**Suite 1 — Recepcao de mensagens (INSERT chat_messages)**
- Mensagem de atendente incrementa unreadCount quando widget fechado
- Mensagem de atendente NAO incrementa unread quando widget aberto
- Mensagem duplicada (mesmo id) nao e adicionada duas vezes
- Mensagens otimisticas (prefixo "optimistic-") sao removidas ao receber mensagem real
- Mensagem interna (is_internal=true) e ignorada
- Mensagem deletada (deleted_at != null) e ignorada no INSERT

**Suite 2 — Delecao de mensagens (UPDATE chat_messages)**
- Mensagem com deleted_at remove do array de mensagens
- Mensagem sem deleted_at nao altera o array

**Suite 3 — Transicoes de fase (UPDATE chat_rooms por roomId)**
- Room status "active" + phase "waiting" → phase "chat"
- Room status "closed" + resolution "resolved" → phase "csat"
- Room status "closed" + resolution "archived" → phase "closed"
- Room status "closed" + resolution "pending" → phase "viewTranscript"

**Suite 4 — Chats proativos (INSERT chat_rooms por visitorId)**
- Nova room com status "active" → phase "chat" + roomId atualizado
- Nova room com status != "active" → phase "waiting"
- Nova room NAO processa se phase atual e "chat", "waiting" ou "csat"
- Nova room incrementa unreadCount se widget fechado

**Suite 5 — Reopen de rooms (UPDATE chat_rooms por visitorId)**
- Room que muda de "closed" para "active" → phase "chat"
- Room que muda de "closed" para "waiting" → phase "waiting"
- NAO processa se phase atual e "chat", "waiting" ou "csat"

**Suite 6 — Typing indicator (broadcast separado)**
- Receber evento typing seta typingUser com o nome
- typingUser reseta para null apos timeout
- Canal de typing so existe quando roomId esta presente

### Arquivo 2: `src/pages/__tests__/ChatWidgetChannelStructure.test.ts`

**Suite — Estrutura do canal consolidado**
- Canal e criado com nome `widget-realtime-{visitorId}-{suffix}`
- Com roomId: canal tem 5 listeners (INSERT+UPDATE messages, UPDATE rooms por id, INSERT+UPDATE rooms por visitorId)
- Sem roomId: canal tem apenas 2 listeners (INSERT+UPDATE rooms por visitorId)
- Canal de typing e separado com nome `typing-{roomId}`

## Implementacao

Toda a logica dos handlers sera extraida como funcoes puras que recebem state e retornam novo state, permitindo teste sem mocks de Supabase. Os testes replicam o padrao ja existente em `ChatWidget.test.tsx`.

## Arquivos

| Arquivo | Tipo |
|---------|------|
| `src/pages/__tests__/ChatWidgetRealtime.test.ts` | Novo |
| `src/pages/__tests__/ChatWidgetChannelStructure.test.ts` | Novo |

Nenhum arquivo de producao sera modificado.

