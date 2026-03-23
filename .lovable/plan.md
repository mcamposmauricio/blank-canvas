

# Plano: Ajustar larguras do sidebar, room list e truncamento de textos

## Mudancas

### 1. Sidebar 20% menor (`sidebar.tsx`)

Sidebar atual: `16rem` (256px). Reduzir 20%: `12.8rem` (~205px).

- `SIDEBAR_WIDTH`: `"16rem"` → `"12.8rem"`

### 2. Room list 20% maior (`AdminWorkspace.tsx`)

Room list atual: `260px` desktop, `200px` compact. Aumentar 20%: `312px` desktop, `240px` compact.

- Linha 628: `w-[260px]` → `w-[312px]`, `w-[200px]` → `w-[240px]`

### 3. Textos truncados no ChatRoomList (`ChatRoomList.tsx`)

- Linha 114: remover o `slice(0, 60)` manual — ja tem `truncate` (CSS ellipsis) na `<p>` que faz o trabalho. O slice duplo com truncate causa inconsistencia.
- Garantir que o container do badge+unread tem `overflow-hidden` e `min-w-0` para nao empurrar o nome.

## Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/components/ui/sidebar.tsx` | `SIDEBAR_WIDTH` de `16rem` → `12.8rem` |
| `src/pages/AdminWorkspace.tsx` | Room list `312px` / `240px` |
| `src/components/chat/ChatRoomList.tsx` | Remover `slice(0,60)`, confiar no CSS truncate |

