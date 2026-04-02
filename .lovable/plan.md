

# Fix: Contador de chats ativos diverge da realidade

## Causa raiz identificada

Dois problemas independentes que causam o contador desatualizado:

### Problema 1 — AdminChatHistory hardcoda `active_conversations: 1`
Em `src/pages/AdminChatHistory.tsx` linha 140, ao reabrir um chat:
```js
await supabase.from("attendant_profiles").update({ active_conversations: 1 }).eq("id", attProfile.id);
```
Isso sobrescreve o valor correto calculado pelo trigger do banco. Se o atendente tem 4 chats e reabre um, o trigger seta 5, mas logo em seguida essa linha sobrescreve para 1. O trigger da mensagem de sistema corrige de volta para 5, mas o evento intermediario (1) pode ser capturado pelo Realtime e ficar "preso" no frontend.

**Fix**: Remover essa linha. O trigger `resync_attendant_counter_on_room_change` já faz o COUNT correto.

### Problema 2 — Reopens não atualizam `updated_at`
As 3 funções de reopen (ChatWidget, AdminChatHistory, UserPortal) não incluem `updated_at` no UPDATE do chat_rooms. O safety net do Realtime usa `updated_at` para dedup — se o valor não muda, o evento é ignorado e o workspace não recebe a notificação de status change.

**Fix**: Adicionar `updated_at: new Date().toISOString()` em todos os updates de reopen.

## Mudanças

| Arquivo | Mudança |
|---------|---------|
| `src/pages/AdminChatHistory.tsx` | Remover linha 140 (`active_conversations: 1`) |
| `src/pages/ChatWidget.tsx` | Adicionar `updated_at` no update de reopen (linha ~804) |
| `src/pages/AdminChatHistory.tsx` | Adicionar `updated_at` no update de reopen (linha ~139) |
| `src/pages/UserPortal.tsx` | Adicionar `updated_at` no update de reopen (linha ~287) |

Total: 4 edições em 3 arquivos, zero risco de regressão.

