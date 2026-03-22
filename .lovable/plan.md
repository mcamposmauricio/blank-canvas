

# Revisao: Sistema de Permissoes Existente + Gaps

## O que ja existe e funciona

O sistema de permissoes esta bem estruturado:

| Componente | Status |
|---|---|
| `PERMISSION_TREE` (UserPermissionsDialog.tsx) | Completo — 6 modulos, ~30 submodulos |
| `hasPermission()` (AuthContext.tsx) | Funcional — hierarquia pai/filho com fallback |
| Sidebar guards (AppSidebar.tsx) | 95% correto — quase todos os itens tem `hasPermission` |
| Route-level guards (App.tsx) | **AUSENTE** — nenhuma rota tem verificacao |

## Gaps identificados

### 1. Chat Dashboard sem guard no sidebar (linha 224)
Unico item do sidebar sem `hasPermission`. Todos os outros (workspace, history, banners, broadcasts, csat, settings, nps.*, contacts.*, help.*) ja verificam.

### 2. Nenhuma rota protegida por permissao
`SidebarLayout` so verifica autenticacao + tenant. Qualquer usuario autenticado pode acessar `/admin/dashboard`, `/help/settings`, `/nps/campaigns`, etc diretamente pela URL.

### 3. Modulo CS sem rotas nem sidebar
PERMISSION_TREE tem `cs.*` completo mas App.tsx nao tem rotas CS e AppSidebar nao tem secao CS.

### 4. `chat.csat` duplicado
Linha 101 do PERMISSION_TREE tem `chat.csat` e linha 102 tem `chat.reports`. O sidebar usa `chat.reports` (linha 340). `chat.csat` e redundante.

### 5. Performance do `hasPermission`
Usa `Array.find()` — O(n) por chamada. Com ~30 modulos e ~20 chamadas no sidebar, sao ~600 comparacoes. **Negligivel** — nao e problema de performance. Um `Map` seria O(1) mas o ganho e irrelevante aqui.

## Correcoes propostas

### A. Componente `PermissionGuard` (novo)
Wrapper que verifica `hasPermission` e mostra pagina de acesso negado:

```typescript
function PermissionGuard({ module, action, children }) {
  const { hasPermission, isAdmin, loading } = useAuth();
  if (loading) return <Skeleton />;
  if (!hasPermission(module, action)) return <AccessDenied />;
  return children;
}
```

### B. Proteger todas as rotas no App.tsx
Envolver cada `<Route>` protegida com `<PermissionGuard>`:

| Rota | Guard |
|---|---|
| `/admin/dashboard` | `chat.dashboard, view` |
| `/admin/workspace` | `chat.workspace, view` |
| `/admin/history` | `chat.history, view` |
| `/admin/banners` | `chat.banners, view` |
| `/admin/broadcasts` | `chat.broadcasts, view` |
| `/admin/csat` | `chat.reports, view` |
| `/admin/settings` | `chat, view` |
| `/nps/dashboard` | `nps.dashboard, view` |
| `/nps/campaigns` | `nps.campaigns, view` |
| `/nps/nps-settings` | `nps.settings, view` |
| `/nps/contacts` | `contacts.companies, view` |
| `/nps/people` | `contacts.people, view` |
| `/help/overview` | `help.overview, view` |
| `/help/articles` | `help.articles, view` |
| `/help/collections` | `help.collections, view` |
| `/help/settings` | `help.settings, view` |
| `/help/import` | `help.import, manage` |
| `/nps/settings` | `settings, view` |
| `/backoffice` | master only |

### C. Fix Chat Dashboard no sidebar (linha 224)
Adicionar `hasPermission("chat.dashboard", "view")`.

### D. Adicionar modulo CS no sidebar + rotas
- 6 rotas CS no App.tsx (lazy imports ja existem nos arquivos)
- Secao CS no AppSidebar com guards por submodulo

### E. Remover `chat.csat` duplicado do PERMISSION_TREE

### F. Nenhuma migracao SQL necessaria

## Arquivos

| Tipo | Arquivo |
|---|---|
| Novo | `src/components/PermissionGuard.tsx` |
| Editar | `src/App.tsx` — guards em todas as rotas + rotas CS |
| Editar | `src/components/AppSidebar.tsx` — fix dashboard + secao CS |
| Editar | `src/components/UserPermissionsDialog.tsx` — remover `chat.csat` |

