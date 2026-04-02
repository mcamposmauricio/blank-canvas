

# Plano: Visao Lite de Atendimento (OFF por padrao) + Scroll nos Pendentes

## 1. Visao Lite — acesso controlado por permissao (desligada por padrao)

O acesso a pagina `/attendant` sera controlado pela permissao `chat.workspace.lite` no sistema existente. Como todas as permissoes sao "negativa por padrao" (usuario sem permissao explicita nao tem acesso), basta adicionar a permissao na arvore — ela ja nasce desligada para todos.

### Mudancas

**`src/components/UserPermissionsDialog.tsx`**
- Adicionar no `PERMISSION_TREE`, dentro de `chat.children` (apos `chat.workspace`):
  ```
  { key: "chat.workspace.lite", labelKey: "team.submodule.chat.workspace.lite", actions: ["view"] }
  ```

**`src/locales/pt-BR.ts` e `src/locales/en.ts`**
- Adicionar traducao: `"team.submodule.chat.workspace.lite": "Atendimento Lite"` / `"Lite View"`

**Nova pagina: `src/pages/AttendantLite.tsx`**
- Rota `/attendant` FORA do `<SidebarLayout />` no `App.tsx`
- Verifica autenticacao + `hasPermission("chat.workspace.lite", "view")`
- Redireciona para `/home` se sem permissao
- Layout mobile-first (`h-[100dvh]`, flexbox), duas vistas: lista e chat
- Header minimalista: logo, status toggle, botao "Sair"
- Reutiliza: `ChatRoomList`, `ChatMessageList`, `ChatInput`, `PendingRoomsList`, `CloseRoomDialog`, `ReassignDialog`
- Sem sidebar, sem VisitorInfoPanel

**`src/App.tsx`**
- Nova rota: `<Route path="/attendant" element={<AttendantLite />} />`

**`src/components/AppSidebar.tsx`**
- Botao "Atendimento Lite" (icone `Smartphone`) visivel apenas se `hasPermission("chat.workspace.lite", "view")`

### Fluxo de ativacao
Admin vai em Configuracoes > Equipe > clica no usuario > ativa permissao "Atendimento Lite" com nivel "Visualizar". Pronto — o botao aparece na sidebar desse usuario.

---

## 2. Scroll nos Pendentes do Workspace

**`src/components/chat/PendingRoomsList.tsx`**
- Trocar `<ScrollArea className="max-h-[400px]">` por `<ScrollArea className="h-[300px]">` para forcar altura fixa e ativar scroll do Radix

---

## Resumo

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/AttendantLite.tsx` | Nova pagina mobile-first |
| `src/App.tsx` | Rota `/attendant` |
| `src/components/AppSidebar.tsx` | Botao condicional por permissao |
| `src/components/UserPermissionsDialog.tsx` | Nova permissao `chat.workspace.lite` |
| `src/locales/pt-BR.ts` + `en.ts` | Traducao |
| `src/components/chat/PendingRoomsList.tsx` | Fix scroll |

