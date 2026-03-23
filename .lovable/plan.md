

# Plano: Converter Tags e Macros de Grid para Listagem

## Problema

O grid de cards com 24 tags/pagina e 12 macros/pagina renderiza muitos DOM nodes por item (badge, color dot, hover buttons, etc), tornando a tela lenta. Alem disso, o `TagManagementSection` busca TODOS os `chat_room_tags` para contar uso — query pesada.

## Mudancas

### 1. TagManagementSection.tsx — Listagem compacta

Trocar o grid de cards por uma **tabela/lista compacta**:
- Cada linha: cor (dot) | nome | uso count | data | botoes edit/delete
- Manter busca e paginacao (24/page)
- **Remover query de `chat_room_tags`** (usage count) — essa query puxa TODOS os registros da tabela so para contar. Mostrar uso apenas sob demanda (ao abrir dialog de delete)
- Loading state: retornar skeleton rows em vez de `null`

### 2. Macros no AdminSettings.tsx — Listagem compacta

Trocar o grid de cards por lista:
- Cada linha: titulo | badge publica/particular | shortcut | conteudo truncado | botoes
- Manter busca e paginacao (12/page)

### 3. Performance: lazy usage count nas tags

Em vez de buscar `chat_room_tags` no carregamento inicial, buscar o usage_count apenas quando o usuario clica em deletar uma tag (no `setDeleteTag`). Isso elimina a query mais pesada do carregamento.

## Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/components/chat/TagManagementSection.tsx` | Lista compacta, remover usage query do init, lazy usage no delete |
| `src/pages/AdminSettings.tsx` | Macros em lista compacta |

