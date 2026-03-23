

# Plano: Workspace sem scroll horizontal + Textarea 2 linhas

## Problemas

1. **Scroll horizontal com menu aberto:** Sidebar aberta = 256px. Room list = 280px. Sobram ~928px para chat+panel em 1464px. O `ResizablePanelGroup` com percentuais pode gerar overflow quando o side panel esta aberto. O container precisa respeitar `100vw - sidebar_width`.
2. **Textarea muito alta:** `min-h-[54px]` e ~3.5 linhas vazias. Para 2 linhas o valor correto e `min-h-[36px]` (~2 linhas de texto + padding).

## Mudancas

### 1. AdminWorkspace.tsx — Layout que respeita o sidebar

- Trocar `h-screen` por `h-full` no container principal (o parent em SidebarLayout ja controla a altura)
- Adicionar `max-w-full` ao container para garantir que nunca ultrapasse o espaco disponivel
- Reduzir room list de `w-[280px]` para `w-[260px]` em desktop para dar mais folga
- No `ResizablePanelGroup`: manter `min-w-0 overflow-hidden` e ajustar `defaultSize` do side panel de 35 para 30 quando aberto

### 2. ChatInput.tsx — Textarea 2 linhas

- `min-h-[54px]` → `min-h-[36px]` (2 linhas de texto)
- Manter `max-h-[200px]` e `resize-y` para expandir ao digitar

### 3. SidebarLayout.tsx — Garantir overflow hidden no workspace

- Verificar que o container do workspace tem `overflow-hidden` para prevenir qualquer scroll horizontal

## Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/pages/AdminWorkspace.tsx` | `h-screen`→`h-full`, room list 260px, panel 30% default |
| `src/components/chat/ChatInput.tsx` | `min-h-[36px]` |
| `src/components/SidebarLayout.tsx` | Confirmar `overflow-hidden` no container workspace |

