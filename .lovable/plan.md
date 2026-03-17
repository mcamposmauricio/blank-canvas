

# Fix: Bug 2 — `createLinkedRoom` usa owner_user_id errado no segundo chat

## Causa raiz

Na primeira conversa, `handleStartChat` resolve `ownerUserId`, `finalContactId` e `finalCompanyContactId` via edge function `resolve-chat-visitor` (linhas 907-909), mas armazena esses valores apenas em **variáveis locais**. Quando o usuário inicia um segundo chat, `handleNewChat` chama `createLinkedRoom` que lê `paramOwnerUserId`, `paramContactId` e `paramCompanyContactId` dos **URL params** — que são `null` para visitantes não-resolvidos. Isso resulta em `owner_user_id = "00000000..."`, e o trigger `assign_chat_room` não encontra o tenant, impedindo a atribuição.

## Correção

**Arquivo:** `src/pages/ChatWidget.tsx`

1. **Adicionar 3 refs** para persistir os IDs resolvidos entre chats:
   - `resolvedOwnerRef = useRef<string | null>(null)`
   - `resolvedContactIdRef = useRef<string | null>(null)`
   - `resolvedCompanyContactIdRef = useRef<string | null>(null)`

2. **Em `handleStartChat`** (após linha 909): salvar os valores resolvidos nos refs:
   ```typescript
   if (data.user_id) { ownerUserId = data.user_id; resolvedOwnerRef.current = data.user_id; }
   if (data.contact_id) { finalContactId = data.contact_id; resolvedContactIdRef.current = data.contact_id; }
   if (data.company_contact_id) { finalCompanyContactId = data.company_contact_id; resolvedCompanyContactIdRef.current = data.company_contact_id; }
   ```

3. **Em `createLinkedRoom`** (linhas 708-714): usar os refs como fallback:
   ```typescript
   const insertData: any = {
     visitor_id: vId,
     owner_user_id: paramOwnerUserId || resolvedOwnerRef.current || "00000000-...",
     status: "waiting",
   };
   const ccId = paramCompanyContactId || resolvedCompanyContactIdRef.current;
   const cId = paramContactId || resolvedContactIdRef.current;
   if (ccId) insertData.company_contact_id = ccId;
   if (cId) insertData.contact_id = cId;
   ```

Nenhuma migração SQL necessária. Apenas alterações em `src/pages/ChatWidget.tsx`.

