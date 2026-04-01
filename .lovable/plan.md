

# Plano Definitivo: Otimizacao de Performance e Reducao de Chamadas ao Banco

## Revisao Consolidada dos Planos Anteriores

Ao longo da conversa, foram propostos multiplos planos com variantes (com/sem safety net, com/sem broadcast channels). Apos revisar todo o codigo atual e todos os planos discutidos, a recomendacao abaixo e a **sintese otima**: maximiza reducao de requests, garante continuidade de todos os processos, e permite rollback instantaneo.

## Diagnostico Atual (codigo em producao)

```text
COMPONENTE                     CANAL                           LISTENERS  TIPO
─────────────────────────────────────────────────────────────────────────────────
useChatRooms                   chat-rooms-updates               4 (I,U,U,D)  pg_changes  ← 2 UPDATE duplicados
SidebarDataContext             global-sidebar-chat-rooms        1 (*)        pg_changes  ← redundante com acima
SidebarDataContext             global-sidebar-attendants        1 (*)        pg_changes
useAttendantQueues             attendant-queues-realtime         1 (*)        pg_changes  ← redundante com sidebar
PendingRoomsList               pending-rooms-realtime           1 (*)        pg_changes  ← redundante com acima
useDashboardStats              dashboard-realtime-rooms         1 (*)        pg_changes  (opt-in)
useChatMessages                chat-messages-{roomId}           2 (I,U)      pg_changes  (scoped)
ChatWidget                     widget-messages-{roomId}         2 (I,U)      pg_changes  (scoped)
ChatWidget                     widget-room-{roomId}             1 (U)        pg_changes  (scoped)
ChatWidget                     widget-new-rooms-{visitorId}     1 (I)        pg_changes
ChatWidget                     widget-reopen-rooms-{visitorId}  1 (U)        pg_changes  ← merge com acima
─────────────────────────────────────────────────────────────────────────────────
TOTAL: ~11 canais, ~16 listeners pg_changes por sessao admin
```

**Problemas identificados**:
1. 2 handlers UPDATE identicos no mesmo canal `chat-rooms-updates` (linhas 310-351 e 366-439)
2. `global-sidebar-chat-rooms` escuta a mesma tabela que `chat-rooms-updates`
3. `attendant-queues-realtime` escuta a mesma tabela que `global-sidebar-attendants`
4. `pending-rooms-realtime` escuta a mesma tabela que `chat-rooms-updates`
5. 2 canais separados no widget para o mesmo visitor_id

## Abordagem Recomendada: Consolidacao + Broadcast Hibrido

A estrategia pura de broadcast (sem safety net) tem risco alto porque acoes server-side (triggers de auto-assignment, cron de auto-rules, broadcasts em massa) nao passam pelo frontend. A estrategia com safety net completo anula boa parte dos ganhos.

**Recomendacao: modelo hibrido em 2 etapas.**

---

## Etapa 1: Consolidacao Imediata (frontend-only, zero risco)

Reducao estimada: de ~16 listeners para ~9 listeners (~44%)

### 1.1 Merge dos 2 UPDATE handlers — `useChatRealtime.ts`

**O que**: Linhas 310-351 (metadata) e 366-439 (fetch last message) sao 2 callbacks para o mesmo evento no mesmo canal.

**Como**: Um unico handler que:
1. Atualiza metadata (status, attendant_id, priority)
2. Se `updated_at !== old.updated_at`, faz fetch da ultima mensagem + som + unread

**Processo garantido**: Todos os 4 processos (nova sala, msg preview, fechamento, reatribuicao) continuam identicos.

### 1.2 Remover `global-sidebar-chat-rooms` — `SidebarDataContext.tsx`

**O que**: Linha 220-232 cria canal redundante que escuta `chat_rooms` — mesma tabela que `chat-rooms-updates`.

**Como**: Remover o canal. O `handleRoomChange` (que faz `debouncedResync`) sera disparado por callback do `useChatRooms` via um `onRoomEvent` prop/context.

**Processo garantido**: Sidebar continua recebendo updates porque o `debouncedResync` e chamado pelo mesmo evento, so muda o caminho (callback em vez de canal proprio).

### 1.3 Remover `attendant-queues-realtime` — `useChatRealtime.ts`

**O que**: Linhas 542-554 criam canal para `attendant_profiles` — mesma tabela que `global-sidebar-attendants` (que continua ativo).

**Como**: Remover o canal. Substituir por `setInterval(fetchQueues, 10000)` + consumir evento do `global-sidebar-attendants` via callback.

**Processo garantido**: Contadores de fila atualizam via polling de 10s (trigger `resync_attendant_on_room_change` ja garante dados corretos no banco) + callback do canal de attendants da sidebar.

### 1.4 Remover `pending-rooms-realtime` — `PendingRoomsList.tsx`

**O que**: Linhas 91-114 criam canal redundante para `chat_rooms`.

**Como**: Adicionar prop `refreshTrigger: number`. AdminWorkspace incrementa quando `useChatRooms` detecta mudanca.

**Processo garantido**: PendingRoomsList refaz fetch com o mesmo debounce, so muda o gatilho (prop em vez de canal proprio).

### 1.5 Merge 2 canais widget — `ChatWidget.tsx`

**O que**: `widget-new-rooms-{visitorId}` (INSERT, L567-615) e `widget-reopen-rooms-{visitorId}` (UPDATE, L618-665) escutam a mesma tabela com o mesmo filtro.

**Como**: 1 canal `widget-visitor-{visitorId}` com 2 listeners (INSERT + UPDATE).

**Processo garantido**: Chat proativo e reopen continuam funcionando identicamente — apenas o container do canal e compartilhado.

### 1.6 Cache `get-visitor-banners` — Edge Function

Adicionar `"Cache-Control": "public, max-age=300"` na resposta.

**Processo garantido**: Banners ainda sao carregados, apenas com cache de 5 minutos.

### Resultado Etapa 1

```text
DE: 11 canais, ~16 listeners
PARA: 7 canais, ~9 listeners
Reducao: ~44% de listeners pg_changes
```

---

## Etapa 2: Broadcast Hibrido (requer atualizacao de edge functions)

Reducao adicional estimada: de ~9 para ~6 listeners de custo fixo

### Conceito

Manter `postgres_changes` apenas nos canais **scoped por room/visitor** (custo proporcional ao uso, nao ao numero de sessoes). Substituir os canais **globais por tenant** por broadcast.

### 2.1 Criar `TenantRealtimeContext.tsx`

Canal broadcast `tenant-bc-{tenantId}` com eventos tipados:
- `room_status`: `{ room_id, status, attendant_id, updated_at }`
- `new_message_activity`: `{ room_id, content, sender_type, sender_name, created_at }`
- `attendant_update`: `{ attendant_id, status, active_conversations }`

**+ 1 canal pg_changes minimal** para `chat_rooms` UPDATE filtrado por `tenant_id` como safety net para acoes de triggers/cron. Este listener unico substitui os 3 listeners do `chat-rooms-updates` (INSERT ja e coberto pelo trigger que faz UPDATE logo apos, DELETE e raro e coberto por polling).

### 2.2 Frontend envia broadcasts apos mutacoes

| Componente | Acao | Evento |
|---|---|---|
| `ChatInput.tsx` | Enviar mensagem | `new_message_activity` |
| `AdminWorkspace.tsx` | Fechar/atribuir/reabrir sala | `room_status` |
| `CloseRoomDialog.tsx` | Fechar com CSAT | `room_status` |
| `ReassignDialog.tsx` | Reatribuir | `room_status` |
| `ProactiveChatDialog.tsx` | Chat proativo | `room_status` |
| `AttendantsTab.tsx` | Mudar status | `attendant_update` |
| `ChatWidget.tsx` | Visitante envia msg | `new_message_activity` |

### 2.3 Edge Functions enviam broadcasts

| Edge Function | Evento |
|---|---|
| `process-chat-auto-rules` | `room_status` (close/warning) |
| `process-chat-broadcasts` | `room_status` + `new_message_activity` |

```typescript
const bc = supabaseAdmin.channel(`tenant-bc-${tenantId}`);
await bc.send({ type: "broadcast", event: "room_status", payload: { ... } });
await supabaseAdmin.removeChannel(bc);
```

### 2.4 Consumidores migram para broadcast

- `useChatRooms`: consome broadcast `room_status` e `new_message_activity` + safety net pg_changes
- `SidebarDataContext`: consome broadcast `room_status` e `attendant_update`
- `PendingRoomsList`: refreshTrigger via broadcast (ja implementado na Etapa 1)

### 2.5 O que NAO muda (canais scoped que permanecem)

| Canal | Motivo |
|---|---|
| `chat-messages-{roomId}` | Scoped, critico para msgs em tempo real |
| `widget-messages-{roomId}` | Scoped, widget precisa INSERT instantaneo |
| `widget-room-{roomId}` | Scoped, detecta fechamento/CSAT |
| `widget-visitor-{visitorId}` | Scoped, chat proativo + reopen |
| `dashboard-realtime-rooms` | Opt-in, so existe se dashboard aberto |

### Dedup entre broadcast e safety net

Frontend mantem `Map<string, string>` com `room_id → last_seen_updated_at`. Se o mesmo room_id com mesmo updated_at ja foi processado (via broadcast), ignora o evento do pg_changes (e vice-versa).

### Resultado Final

```text
CANAIS PG_CHANGES POR SESSAO ADMIN:
  1 safety net (tenant, UPDATE only)         — fixo
  1 chat-messages-{roomId}                   — scoped (ativo so com sala aberta)
  1 dashboard-realtime-rooms                 — opt-in

CANAIS BROADCAST:
  1 tenant-bc-{tenantId}                     — zero custo no banco

CANAIS PG_CHANGES POR SESSAO WIDGET:
  1 widget-messages-{roomId}                 — scoped
  1 widget-room-{roomId}                     — scoped
  1 widget-visitor-{visitorId}               — scoped
```

---

## Checklist de Continuidade — Todos os Processos

| Processo | Garantia pos-migracao |
|---|---|
| Admin ve nova sala | Safety net pg_changes (trigger faz UPDATE apos INSERT) + broadcast do widget |
| Admin ve msg nova (preview) | Broadcast `new_message_activity` do ChatInput/Widget + safety net |
| Admin ve sala fechada | Broadcast `room_status` do CloseRoomDialog + safety net |
| Admin ve reatribuicao | Broadcast `room_status` do ReassignDialog + safety net |
| Sidebar contadores | Broadcast `room_status` → debouncedResync + polling 5min |
| Sidebar status atendente | Broadcast `attendant_update` + canal attendants pg_changes |
| PendingRoomsList | refreshTrigger via broadcast |
| AttendantQueues | Polling 10s + broadcast `attendant_update` |
| Widget msgs tempo real | `widget-messages-{roomId}` pg_changes (inalterado) |
| Widget sala fechada | `widget-room-{roomId}` pg_changes (inalterado) |
| Widget chat proativo | `widget-visitor-{visitorId}` pg_changes (inalterado) |
| Admin msgs tempo real | `chat-messages-{roomId}` pg_changes (inalterado) |
| Dashboard stats | `dashboard-realtime-rooms` pg_changes (inalterado) |
| Typing indicator | Broadcast (ja usa, inalterado) |
| Auto-rules (cron) | EF envia broadcast + safety net pg_changes |
| Broadcasts em massa | EF envia broadcast + safety net pg_changes |
| Auto-assignment (trigger) | Safety net pg_changes captura UPDATE |
| Som/notificacao de nova msg | Mantido no handler unificado de `new_message_activity` |

## Rollback

- **Etapa 1**: 100% frontend, rollback via Revert no historico. Nenhuma migration.
- **Etapa 2**: Frontend + edge functions (aditivas). Rollback via Revert restaura canais pg_changes originais. Edge functions com broadcast sao aditivas — nao quebram nada se frontend antigo nao escutar.

## Arquivos Impactados

### Etapa 1
| Arquivo | Mudanca |
|---|---|
| `src/hooks/useChatRealtime.ts` | Merge 2 UPDATE; remover canal attendant-queues; callback onRoomEvent |
| `src/contexts/SidebarDataContext.tsx` | Remover `global-sidebar-chat-rooms`; consumir callback |
| `src/components/chat/PendingRoomsList.tsx` | Remover canal; prop `refreshTrigger` |
| `src/pages/AdminWorkspace.tsx` | State `pendingRefreshTrigger`; passar para PendingRoomsList |
| `src/pages/ChatWidget.tsx` | Merge 2 canais visitor em 1 |
| `supabase/functions/get-visitor-banners/index.ts` | Cache-Control header |

### Etapa 2
| Arquivo | Mudanca |
|---|---|
| `src/contexts/TenantRealtimeContext.tsx` | NOVO — broadcast + safety net |
| `src/App.tsx` | Wrapper TenantRealtimeProvider |
| `src/hooks/useChatRealtime.ts` | Consumir broadcast; remover chat-rooms-updates |
| `src/contexts/SidebarDataContext.tsx` | Consumir broadcast |
| `src/components/chat/ChatInput.tsx` | broadcastEvent apos enviar msg |
| `src/pages/AdminWorkspace.tsx` | broadcastEvent apos fechar/atribuir |
| `src/components/chat/CloseRoomDialog.tsx` | broadcastEvent |
| `src/components/chat/ReassignDialog.tsx` | broadcastEvent |
| `src/components/chat/ProactiveChatDialog.tsx` | broadcastEvent |
| `src/components/chat/AttendantsTab.tsx` | broadcastEvent |
| `src/pages/ChatWidget.tsx` | broadcastEvent apos enviar msg |
| `supabase/functions/process-chat-auto-rules/index.ts` | broadcast apos mutacoes |
| `supabase/functions/process-chat-broadcasts/index.ts` | broadcast apos criar salas |

## Recomendacao de Execucao

**Implementar Etapa 1 primeiro** — zero risco, ganho imediato de ~44%, permite validar em producao. Apos confirmar estabilidade (1-2 dias), implementar Etapa 2 para reducao total de ~70%.

