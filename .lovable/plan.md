

# Plano: Bateria de Testes Automatizados para Validacao das Otimizacoes

## Objetivo

Criar testes automatizados que validam que os 7 fixes da Fase 1+2 nao quebraram nenhum fluxo existente: contadores, troca de mensagens, atualizacoes em tempo real, debounces e inline updates.

## Abordagem

Testes unitarios com Vitest + mocks do Supabase (mesmo padrao de `useChatHistory.test.ts`). Nao e possivel criar "usuarios temporarios" reais no sandbox de build — mas podemos simular todos os fluxos com mocks precisos que replicam o comportamento do Supabase Realtime.

Os testes serao organizados por fix e cobrirao os cenarios criticos de regressao.

## Arquivos de Teste

### 1. `src/hooks/__tests__/useAttendantQueues.test.ts`
Valida Fix 1.1 (inline updates + safety net 120s):
- **Inline update de attendant**: Simula callback `onAttendantUpdate` com payload `{ attendant_id, status, active_conversations }` e verifica que `setAttendants` atualiza apenas o attendant correto sem chamar `fetchQueues`
- **Inline update de unassigned rooms**: Simula `onRoomStatusChange` com payload de sala sem attendant — verifica que sala e adicionada a `unassignedRooms`. Simula com `attendant_id` preenchido — verifica que sala e removida
- **Safety net 120s**: Verifica que `setInterval` e chamado com 120000ms (nao 10000)
- **Nao tem polling 10s**: Verifica que nenhum interval de 10s existe

### 2. `src/hooks/__tests__/useChatMessages.test.ts`
Valida Fix 1.2 (sem UPDATE listener):
- **INSERT listener ativo**: Simula `.on("postgres_changes", { event: "INSERT" })` e verifica que mensagens novas sao adicionadas ao state
- **Sem UPDATE listener**: Verifica que o canal NAO registra listener para evento UPDATE
- **Canal com sufixo aleatorio**: Verifica que nome do canal inclui sufixo

### 3. `src/contexts/__tests__/TenantRealtimeContext.test.ts`
Valida Fix 1.3 (UPDATE only) + Fix 2.2 (visitor_last_read_at no payload):
- **attendant_profiles escuta UPDATE only**: Verifica que o canal `tenant-attendants-pg` registra `event: "UPDATE"` (nao `"*"`)
- **RoomStatusPayload inclui visitor_last_read_at**: Verifica que o safety net mapeia `visitor_last_read_at` do payload do banco
- **Dedup funciona**: Simula dois eventos com mesmo `updated_at` — verifica que so o primeiro e processado

### 4. `src/components/chat/__tests__/VisitorInfoPanel.perf.test.ts`
Valida Fix 2.1 (sem pg_changes):
- **Sem canal postgres_changes**: Verifica que o componente NAO cria canal `visitor-panel-*`
- **fetchData executa ao trocar de sala**: Verifica que `fetchData` e chamado quando `visitorId` muda

### 5. `src/pages/__tests__/WorkspaceDebounce.test.ts`
Valida Fix 2.2 + 2.3 (visitor_last_read_at via safety net + debounces):
- **Sem canal workspace-room-read**: Verifica que AdminWorkspace NAO cria canal `workspace-room-read-*`
- **visitor_last_read_at via onRoomStatusChange**: Simula payload com `visitor_last_read_at` e verifica que state atualiza
- **Debounce 10s no pendingRefreshTrigger**: Simula 5 eventos rapidos de `onRoomStatusChange` — verifica que `setPendingRefreshTrigger` incrementa apenas 1 vez apos 10s

### 6. `src/components/chat/__tests__/PendingRoomsList.debounce.test.ts`
Valida Fix 2.3 (debounce 5s):
- **Debounce 5s no refreshTrigger**: Muda `refreshTrigger` 3 vezes em 1s — verifica que `fetchPendingRooms` executa apenas 1 vez apos 5s
- **Primeiro load sem debounce**: Verifica que `refreshTrigger === 0` executa imediatamente (sem delay)

## Detalhes Tecnicos

- Mock do `supabase` com chainable queries (padrao existente)
- Mock do `useTenantRealtime` retornando callbacks controlaveis
- `vi.useFakeTimers()` para testar debounces e intervals
- Nao precisa de usuarios reais no banco — os mocks simulam os payloads exatos que o Supabase enviaria
- Total: ~6 arquivos de teste, ~20 cenarios

## Arquivos criados/modificados

| Arquivo | Tipo |
|---------|------|
| `src/hooks/__tests__/useAttendantQueues.test.ts` | Novo |
| `src/hooks/__tests__/useChatMessages.test.ts` | Novo |
| `src/contexts/__tests__/TenantRealtimeContext.test.ts` | Novo |
| `src/components/chat/__tests__/VisitorInfoPanel.perf.test.ts` | Novo |
| `src/pages/__tests__/WorkspaceDebounce.test.ts` | Novo |
| `src/components/chat/__tests__/PendingRoomsList.debounce.test.ts` | Novo |

Nenhum arquivo de producao sera modificado.

