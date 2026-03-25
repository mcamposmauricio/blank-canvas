

# Plano: Layout do ChatInput, Contador de reopen, Scroll em pendentes, Slug do Help Center

## 1. Reorganizar layout do ChatInput

**Problema:** Botoes de acao (negrito, nota, anexo, emoji, macros, artigos, atalhos) ficam na mesma linha que o textarea e o botao de enviar. O usuario quer os botoes de acao ABAIXO do textarea alinhados a esquerda, e o botao de enviar a direita do textarea.

**Arquivo:** `src/components/chat/ChatInput.tsx` (linhas 602-729)

**Mudanca:** Reestruturar o JSX:

```
┌─────────────────────────────────────────────────────┐
│  [Textarea..........................]  [Enviar]      │
│  [B] [👁] [📎] [😊] [⚡] [📖] [⌨]                  │
└─────────────────────────────────────────────────────┘
```

- Linha 1: `flex` com `Textarea` (flex-1) + botao `Send` (alinhado a direita)
- Linha 2: `flex gap-1` com todos os botoes de acao, alinhados a esquerda

## 2. Contador de chats no workspace ao reabrir via widget

**Problema:** Quando o visitante reabre um chat fechado via widget (linha 800-804 de ChatWidget.tsx), o UPDATE muda `status: closed → active`. O workspace deveria captar isso via realtime. O `useChatRealtime.ts` (linha 326-329) chama `fetchSingleRoom` quando `idx === -1`, o que deveria funcionar.

**Causa provavel:** O `resync_attendant_counter_on_room_change` trigger faz um COUNT real dos rooms ativos. Porem, o widget (linha 807-815) TAMBEM incrementa manualmente `active_conversations`, causando uma **race condition** com o trigger. Resultado: o trigger roda, conta N rooms, seta active_conversations=N, depois o widget incrementa para N+1 (errado), ou vice-versa.

**Correcao:**
- **ChatWidget.tsx** (linhas 806-818): Remover o incremento manual de `active_conversations` — o trigger `resync_attendant_counter_on_room_change` ja faz o resync via COUNT real. O incremento manual duplica o trabalho e causa inconsistencia.
- **useChatRealtime.ts**: O handler de UPDATE no canal `chat-rooms-updates` ja trata o caso de `idx === -1` corretamente chamando `fetchSingleRoom`. Nao precisa de mudanca aqui.

## 3. Paginacao e scroll na lista de pendentes

**Problema:** `PendingRoomsList.tsx` lista todos os rooms pendentes de uma vez, sem scroll nem paginacao.

**Correcao em `src/components/chat/PendingRoomsList.tsx`:**
- Envolver o `CollapsibleContent` em um `ScrollArea` com `max-h-[300px]` para scroll quando houver muitos itens
- Adicionar paginacao simples (mostrar 20 por pagina + botao "Carregar mais") na query com `.range()`
- Remover o `slice(0, 60)` na linha 127 — ja tem `truncate` no CSS

## 4. Alterar slug do Help Center de "marq-hr" para "marq"

**Problema:** O slug do tenant no banco e `marq-hr`. Precisa ser `marq`.

**Correcao:** Migration SQL:
```sql
UPDATE tenants SET slug = 'marq' WHERE id = 'eee96b59-d7da-45cf-93f1-e3ab0796e678' AND slug = 'marq-hr';
```

Isso muda automaticamente todas as URLs publicas do Help Center de `/marq-hr/help/...` para `/marq/help/...`. O codigo ja usa o slug dinamicamente do banco.

## Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/components/chat/ChatInput.tsx` | Textarea+Send na linha de cima, botoes de acao embaixo |
| `src/pages/ChatWidget.tsx` | Remover incremento manual de active_conversations (linhas 806-818) |
| `src/components/chat/PendingRoomsList.tsx` | ScrollArea + paginacao + remover slice |
| Migration SQL | `UPDATE tenants SET slug = 'marq'` |

