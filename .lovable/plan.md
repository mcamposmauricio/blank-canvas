

# Fix: Não listar o chat ativo nos "Últimos Chats" do VisitorInfoPanel

## Problema

Ao clicar no chat ativo na lista de "Últimos Chats" do painel lateral, a tela fica branca por conflito de canal Realtime. A solução mais limpa é simplesmente não exibir o chat que já está aberto.

## Correção

**`src/components/chat/VisitorInfoPanel.tsx`**
- Adicionar prop `activeRoomId?: string`
- Filtrar a lista de chats recentes para excluir o que tem `id === activeRoomId`

**`src/pages/AdminWorkspace.tsx`**
- Passar `activeRoomId={selectedRoomId}` para o `VisitorInfoPanel`

**`src/hooks/useChatRealtime.ts`**
- Tornar nome do canal único com sufixo aleatório (prevenção futura de colisões Realtime)

| Arquivo | Mudança |
|---------|---------|
| `src/components/chat/VisitorInfoPanel.tsx` | Prop + filtro do chat ativo |
| `src/pages/AdminWorkspace.tsx` | Passar `activeRoomId` |
| `src/hooks/useChatRealtime.ts` | Canal com nome único |

