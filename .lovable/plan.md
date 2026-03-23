

# Plano: Melhorar UI/UX das abas de Tags e Macros com Paginacao

## Problema

Tags (170 itens) e macros sao exibidas em tabelas sem paginacao, resultando em listas enormes e dificeis de navegar.

## Mudancas

### 1. TagManagementSection.tsx — Grid de cards + paginacao + busca

Substituir a tabela por:
- **Campo de busca** no header (filtrar por nome)
- **Grid de cards** (3 colunas desktop, 2 tablet, 1 mobile) em vez de tabela — cada card mostra: badge colorido com nome, uso count, data, botoes edit/delete
- **Paginacao** com 24 itens por pagina usando os componentes `Pagination` existentes
- Contador de total (ex: "170 tags")

### 2. Macros no AdminSettings.tsx — Cards + paginacao

Substituir a tabela de macros por:
- **Grid de cards** (2 colunas) — cada card mostra: titulo, badge publica/particular, shortcut, preview do conteudo truncado, botoes edit/delete
- **Paginacao** com 12 itens por pagina
- Busca ja existe — manter
- Contador de total

## Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/components/chat/TagManagementSection.tsx` | Grid de cards, busca, paginacao (24/page) |
| `src/pages/AdminSettings.tsx` | Macros: grid de cards, paginacao (12/page) |

