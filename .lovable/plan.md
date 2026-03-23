

# Plano: Corrigir Tags, Loading de Anexos, Horário em Mensagens de Sistema

## 1. Tags não sendo adicionadas (RLS + tenant_id)

**Causa raiz:** Dois problemas:

- A RLS policy de `chat_room_tags` exige `chat_rooms.owner_user_id = auth.uid()`. Atendentes **não** são o `owner_user_id` do room (que é o usuário do tenant). Logo, qualquer insert/delete de tags pelo atendente é bloqueado silenciosamente.
- O `ChatTagSelector` não envia `tenant_id` ao criar tags em `chat_tags`, mas a RLS exige `tenant_id = get_user_tenant_id(auth.uid())`.

**Correção:**
- **Migration SQL:** Alterar a RLS policy de `chat_room_tags` para verificar tenant membership via `chat_rooms.tenant_id = get_user_tenant_id(auth.uid())` em vez de `owner_user_id = auth.uid()`.
- **ChatTagSelector.tsx:** Ao criar tag (`chat_tags.insert`), incluir `tenant_id` buscando do perfil do usuário ou passando como prop. Adicionar error handling com `toast.error` nas operações de `addTag` e `removeTag` para feedback visual.

## 2. Loading para upload de anexos no Widget

**Problema:** Quando o visitante envia um arquivo pesado (vídeo, PDF grande), o `uploading` state só muda o ícone do botão enviar. Não há indicação clara de progresso.

**Correção no ChatWidget.tsx:**
- Quando `uploading === true`, exibir um overlay/barra de progresso sobre a file preview bar com texto "Enviando arquivo..." e um `Loader2` animado.
- Desabilitar o campo de texto e mostrar estado visual claro durante o upload.

## 3. Horário em mensagens de sistema via hover

**Problema:** Mensagens de sistema (`sender_type === "system"`) não exibem horário.

**Correção no ChatMessageList.tsx (linha 121-123):**
- Adicionar `title={formatChatTime(msg.created_at)}` ao `<p>` da mensagem de sistema para exibir horário no hover.
- Alternativa mais elegante: usar o componente `Tooltip` do shadcn para exibir o horário completo (data + hora) ao passar o mouse.

## 4. Label "Fila do chat" → "Fila chat"

Já está configurado como `"Fila chat"` em `src/locales/pt-BR.ts`. Nenhuma mudança necessária.

## Arquivos

| Arquivo | Mudança |
|---|---|
| Migration SQL | Alterar RLS policy de `chat_room_tags` para tenant membership |
| `src/components/chat/ChatTagSelector.tsx` | Adicionar `tenant_id` no insert de tags + error handling |
| `src/pages/ChatWidget.tsx` | Overlay de loading durante upload de arquivo |
| `src/components/chat/ChatMessageList.tsx` | Tooltip com horário em mensagens de sistema |

