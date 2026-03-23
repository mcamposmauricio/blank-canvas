

# Plano: Otimizar Carregamento do Widget de Chat

## Problema Atual

Quando o embed `nps-chat-embed.js` carrega em uma pagina do cliente, **antes mesmo do usuario clicar no FAB**, as seguintes requests sao disparadas:

### No script embed (nps-chat-embed.js)
| # | Request | Quando |
|---|---|---|
| 1 | `get-widget-config` (edge function) | Imediato no page load |
| 2 | `resolve-chat-visitor` (edge function) | Imediato no page load |
| 3 | `get-visitor-banners` (edge function) | Imediato no page load |

### No iframe ChatWidget.tsx (carregado automaticamente)
| # | Request | Quando |
|---|---|---|
| 4 | `chat_settings` SELECT | Iframe mount |
| 5 | `chat_visitors` SELECT | Iframe mount |
| 6 | `chat_rooms` SELECT (active room check) | Iframe mount |
| 7 | `chat_rooms` SELECT (history) | Se phase = history |
| 8 | `attendant_profiles` SELECT | Se tem rooms no history |
| 9 | `chat_messages` SELECT (last msgs) | Para cada room no history |
| 10 | Realtime channel subscription | Iframe mount |

**Total: 7-10 requests no carregamento da pagina, antes de qualquer clique.**

## Solucao Proposta

### Fase 1: Lazy iframe — so carregar o iframe ao clicar no FAB

Hoje o embed cria o iframe imediatamente. O iframe carrega `/widget` que e uma pagina React completa — JS bundle, queries, realtime.

**Mudanca:** O `nps-chat-embed.js` deve:
1. No page load: executar apenas `get-widget-config` (necessario para cores/nome do FAB) e `get-visitor-banners` (banners sao independentes do chat)
2. O `resolve-chat-visitor` pode ser adiado — so precisa rodar se o usuario abrir o chat
3. **Nao criar o iframe** ate o primeiro clique no FAB
4. Renderizar o FAB (botao flutuante) diretamente no DOM via JS puro (ja renderiza parcialmente, mas o iframe e criado junto)
5. Ao clicar no FAB pela primeira vez: criar iframe, resolver visitor, carregar chat

**Economia no page load:** De ~7-10 requests para **1-2 requests** (apenas `get-widget-config` + `get-visitor-banners`). O `resolve-chat-visitor` e todas as queries do iframe so acontecem quando o usuario interage.

### Fase 2: Lazy history no ChatWidget.tsx

O ChatWidget.tsx ja tem logica de lazy history (so busca quando `phase === "history"` e widget `isOpen`), mas pode melhorar:

1. **Historico ja e paginado** (HISTORY_PAGE_SIZE = 10) — ok
2. **Mensagens ja sao paginadas** (PAGE_SIZE = 10) — ok
3. **Last messages do historico**: hoje busca TODAS as mensagens de todos os rooms do history e filtra no client (linhas 248-264). Mudar para buscar apenas os rooms visiveis, com `LIMIT 1` por room via database function
4. **Realtime subscription**: so criar channel apos ter um `roomId` ativo (ja faz isso — ok)

### Fase 3: Otimizar o FAB com unread badge

Hoje o unread count so funciona quando o iframe ja existe (mensagem postMessage). Com lazy iframe:
1. Na resolucao do visitor (que agora acontece no clique), se houver room ativo, retornar `unread_count` no response
2. Mostrar badge de unread no FAB puro (sem iframe)
3. Alternativa mais simples: ao detectar `has_history = true` do resolve (que roda no primeiro clique), mostrar um dot generico

### Fase 4: Cache do widget config

O `get-widget-config` retorna dados que raramente mudam (cores, nome). Cachear em `localStorage` com TTL de 1h para eliminar ate essa request em visitas subsequentes.

## Resumo de Impacto

| Metrica | Antes | Depois |
|---|---|---|
| Requests no page load | 7-10 | 1-2 |
| Iframe carregado | Sempre | So no clique |
| JS bundle do React carregado | Sempre | So no clique |
| Realtime channels | Sempre | So com room ativo |
| History queries | Na abertura | Na abertura (mantido, ja e lazy) |

## Arquivos

| Arquivo | Mudanca |
|---|---|
| `public/nps-chat-embed.js` | FAB puro em JS, lazy iframe, defer resolve-visitor, cache widget-config |
| `src/pages/ChatWidget.tsx` | Otimizar query de last_message no history (database function ou limit) |

## Paginacao adicional

Itens que ja estao paginados e nao precisam de mudanca:
- History rooms: paginado com `HISTORY_PAGE_SIZE = 10`
- Mensagens do chat: paginado com `PAGE_SIZE = 10` + scroll-to-load-more

Itens a paginar/otimizar:
- Last messages do history: hoje faz `SELECT * FROM chat_messages WHERE room_id IN (...)` sem limit por room — pode retornar centenas de registros. Solucao: usar `DISTINCT ON (room_id)` via database function ou view

