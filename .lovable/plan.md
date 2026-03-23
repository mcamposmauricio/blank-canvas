

# Plano: Otimizacao de Performance do Workspace

## Mudancas

### 1. VisitorInfoPanel.tsx — Paralelizar e eliminar duplicatas

**Problema atual (linhas 291-422):**
- Visitor query (await) → field defs query (await) → company+timeline+contact em paralelo (await) → contacts query DUPLICADA (linha 403) → fetchQueueInfo sequencial → fetchRecentChats sequencial
- Total: ~6-8 roundtrips sequenciais

**Solucao:**
- Grupo 1 (paralelo): visitor + field_defs
- Grupo 2 (paralelo, usa resultado do visitor): company + timeline + companyContact + recentChats
- Grupo 3 (paralelo, usa resultado do company): category + auto_rules + teams + assignment
- Eliminar a query duplicada de `contacts` na linha 403 — usar o resultado ja obtido no grupo 2
- Cachear `field_defs` em `useRef` para nao rebuscar ao trocar de room

### 2. useChatRealtime.ts — Adicionar `.limit(100)` no fetchRooms

Linha 204: adicionar `.limit(100)` apos o `.order()`. Reduz payload e acelera queries de enriquecimento.

## Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/components/chat/VisitorInfoPanel.tsx` | Paralelizar fetchData, cachear fieldDefs, remover query duplicada |
| `src/hooks/useChatRealtime.ts` | `.limit(100)` no fetchRooms |

