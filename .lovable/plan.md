

# Plano: Ajustar Textarea e Eliminar Scroll Horizontal

## Problemas

1. **Textarea muito alta**: O `Textarea` no `ChatInput` usa `min-h-[80px]` (herdado do componente base) — equivale a ~5 linhas. Deveria ter altura para ~3 linhas (~54px) como padrao.
2. **Scroll horizontal em telas pequenas**: O layout do workspace usa larguras fixas (`w-[240px]` room list + chat area + side panel) que somadas podem ultrapassar a tela. O `overflow-hidden` no container principal deveria impedir isso, mas o `min-w-0` pode nao estar propagando corretamente. Alem disso, o sidebar do app (menu lateral) nao e contabilizado.

## Mudancas

### 1. Reduzir altura padrao do Textarea (ChatInput.tsx)

- Linha 719: mudar `min-h-[36px]` para `min-h-[54px]` (3 linhas) e manter `max-h-[200px]`
- No componente `Textarea` base (`textarea.tsx`): mudar `min-h-[80px]` para `min-h-0` — o min-height deve ser controlado por quem usa, nao pelo componente generico

### 2. Eliminar scroll horizontal (AdminWorkspace.tsx)

- Linha 608: adicionar `overflow-x-hidden` ao container principal
- Linha 611: reduzir largura fixa do room list em telas compactas: `w-[240px]` → `w-[200px]` para dar mais espaco
- Linha 627: garantir `min-w-0 overflow-hidden` no `ResizablePanelGroup`

### 3. ChatInput — toolbar responsiva

- Linha 602: adicionar `flex-wrap` e `min-w-0` ao container dos botoes para que em telas menores os botoes quebrem linha em vez de gerar overflow
- Alternativa mais limpa: esconder botoes menos usados (Keyboard shortcuts, Articles) em telas compactas via classe `hidden` condicional

## Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/components/ui/textarea.tsx` | `min-h-[80px]` → `min-h-0` |
| `src/components/chat/ChatInput.tsx` | `min-h-[54px]`, toolbar `flex-wrap min-w-0` |
| `src/pages/AdminWorkspace.tsx` | `overflow-x-hidden`, room list width menor em compact |

