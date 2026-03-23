

# Plano: Fixar Workspace na viewport — aplicar mudancas pendentes

## Problema

O plano anterior (trocar `min-h-screen` por `h-screen`) foi aprovado mas nao foi implementado. O layout ainda permite crescimento vertical alem da tela, empurrando o ChatInput para fora.

## Mudancas

### 1. SidebarLayout.tsx (linha 178)

`min-h-screen` → `h-screen overflow-hidden`

Isso trava a altura do container no viewport.

### 2. SidebarLayout.tsx (linha 180)

`<main className="flex-1 flex flex-col">` → `<main className="flex-1 flex flex-col min-h-0 overflow-hidden">`

O `min-h-0` permite que o flex child encolha abaixo do conteudo natural. Sem isso, o `flex-1` nao respeita a altura do pai.

### 3. SidebarLayout.tsx (linha 214)

Confirmar que o container do workspace ja tem `overflow-hidden` (ja tem via condicional `isWorkspaceRoute`).

### 4. AdminWorkspace.tsx (linha 773)

`<div className="flex-1 overflow-auto">` → `<div className="flex-1 min-h-0 overflow-auto">`

Mesmo principio: sem `min-h-0`, o flex item nao encolhe e empurra o ChatInput para fora.

## Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/components/SidebarLayout.tsx` | `h-screen overflow-hidden` + `min-h-0` no main |
| `src/pages/AdminWorkspace.tsx` | `min-h-0` na div de mensagens |

