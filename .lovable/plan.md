

# Sidebar dedicado para Master Backoffice

## O que muda

Quando `isMaster && !isImpersonating`, o `AppSidebar` exibe apenas itens do backoffice (Plataformas, Usuarios, Modulos, etc.) em vez do menu normal de tenant (Chat, NPS, CS, Help, Contacts). Quando impersonando, volta ao menu normal.

## Implementacao

### `AppSidebar.tsx`

Envolver todo o conteudo do `SidebarContent` (linhas 163-556) em uma condicional:

```text
if (isMaster && !isImpersonating) {
  → Renderizar sidebar do backoffice com items:
    - Painel Master (/backoffice) — default tab "tenants"
    - Plataformas (/backoffice?tab=tenants)
    - Usuarios (/backoffice?tab=users)
    - Modulos (/backoffice?tab=modules)
    - Comparativo (/backoffice?tab=benchmark)
    - Performance (/backoffice?tab=performance)
    - Health Check (/backoffice?tab=health)
    - Timeline (/backoffice?tab=timeline)
    - Metricas (/backoffice?tab=metrics)
    - Configuracoes (/backoffice?tab=settings)
    - Operacoes (/backoffice?tab=operations)
} else {
  → Menu normal atual (Home, Chat, NPS, CS, Contacts, Help, Backoffice collapsible)
}
```

Os items do sidebar master usam query params `?tab=X` para selecionar a aba no `Backoffice.tsx`.

### `Backoffice.tsx`

Ler `tab` da URL search params e usar como `defaultValue` do `<Tabs>`:

```typescript
const [searchParams] = useSearchParams();
const activeTab = searchParams.get("tab") || "tenants";
// <Tabs value={activeTab} onValueChange={...}>
```

Ao trocar de tab, atualizar a URL com `setSearchParams({ tab: newTab })`.

Remover o `PageHeader` e a `TabsList` visual (ja que a navegacao agora e pelo sidebar). Manter apenas os `TabsContent`.

### Footer do sidebar

Manter o footer (perfil, tema, idioma, logout) identico para ambos os modos.

### Header do sidebar

Logo clica para `/backoffice` quando master (em vez de `/admin/dashboard`).

## Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/components/AppSidebar.tsx` | Condicional master vs tenant no SidebarContent + header click |
| `src/pages/Backoffice.tsx` | Tabs controladas por URL params, remover TabsList visual |

## Impacto em tenants

Zero. A condicional `isMaster && !isImpersonating` nunca e verdadeira para usuarios de tenant.

