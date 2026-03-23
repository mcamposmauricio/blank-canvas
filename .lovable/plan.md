

# Plano: Workspace Full-Width + Layout Responsivo Fixo

## Problemas

1. **Telas menores (tablet/compact):** O side panel inicia colapsado (`isCompact` seta `infoPanelOpen = false`). Deveria iniciar aberto como em telas grandes.
2. **Telas grandes:** O workspace nao ocupa 100% da largura — sobra espaco a direita do side panel. Causado pelo padding do `SidebarLayout` (`p-3 sm:p-4 md:p-6 lg:p-8`) e pelo `max-w-full` insuficiente.
3. **Redimensionamento:** So a area de mensagens deveria ser redimensionavel via drag. Room list e side panel devem ter tamanho fixo.

## Solucao

### A. Remover padding do SidebarLayout para o workspace

O workspace ja usa `-m-4 md:-m-6 lg:-m-8` para compensar o padding, mas isso nao e perfeito. Solucao: detectar quando a rota e `/admin/workspace` e remover o padding do container.

**Arquivo:** `src/components/SidebarLayout.tsx`
- Adicionar `useLocation()` e verificar se a rota comeca com `/admin/workspace`
- Se sim, usar `p-0` em vez de `p-3 sm:p-4 md:p-6 lg:p-8`

### B. Side panel sempre aberto (remover auto-collapse)

**Arquivo:** `src/pages/AdminWorkspace.tsx`
- Remover o `useEffect` que seta `infoPanelOpen(false)` quando `isCompact` (linhas 86-88)
- Manter o botao de toggle manual para o usuario colapsar se quiser

### C. Layout com tamanhos fixos + area de mensagens flexivel

Trocar a logica do `ResizablePanelGroup` para:
- **Room list:** tamanho fixo (largura fixa via CSS, ~280px desktop, ~240px compact)
- **Side panel:** tamanho fixo (~320px desktop, ~280px compact)
- **Area de mensagens:** ocupa todo o espaco restante (`flex-1`), com `ResizableHandle` apenas entre mensagens e side panel para permitir ajuste

Abordagem: usar `flex` layout em vez de `ResizablePanelGroup` para room list (fixo) e um `ResizablePanelGroup` apenas para chat+side panel. Ou manter o ResizablePanelGroup mas com `defaultSize` em pixels via CSS custom.

**Abordagem simplificada:** Manter `ResizablePanelGroup` mas:
- Room list: `defaultSize={18}`, sem handle de resize (fixo)
- Chat area: `flex-1` (pega o restante)
- Side panel: `defaultSize={25}`, com handle de resize entre chat e side panel

Remover o `ResizableHandle` entre room list e chat. Manter apenas o handle entre chat e side panel.

### D. Remover margin negativo hack

Com padding zero no SidebarLayout para workspace, remover o `-m-4 md:-m-6 lg:-m-8` do workspace container.

## Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/components/SidebarLayout.tsx` | Padding zero para rota workspace |
| `src/pages/AdminWorkspace.tsx` | Remover auto-collapse, remover margin hack, room list fixo, handle apenas entre chat e side panel |

