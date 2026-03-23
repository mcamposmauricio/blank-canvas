

# Plano: Exibir Fila/Categoria e Regras Automaticas no Side Panel do Workspace

## O que sera adicionado

Uma nova secao no `VisitorInfoPanel` (abaixo da secao Empresa) mostrando:

1. **Categoria/Fila** — nome e cor da categoria de atendimento atribuida a empresa (`contacts.service_category_id` → `chat_service_categories`)
2. **Times vinculados** — quais times atendem essa categoria (`chat_category_teams` → `chat_teams`)
3. **Regras de atribuicao** — resumo da config automatica (modelo, capacidade, online only) da `chat_assignment_configs` vinculada ao `chat_category_teams`
4. **Regras automaticas** — regras ativas de auto-message/auto-close do tenant (`chat_auto_rules`) com tipo e tempo de trigger

Se a empresa nao tiver categoria atribuida, mostrar "Categoria padrao" (fallback do sistema).

## Dados necessarios (queries adicionais no fetchData)

Ao carregar o painel, apos ter o `company` (contact):

1. `chat_service_categories` — buscar pelo `service_category_id` da empresa (ou `is_default = true` como fallback)
2. `chat_category_teams` + `chat_teams` — buscar times vinculados a essa categoria
3. `chat_assignment_configs` — buscar config de atribuicao por `category_team_id`
4. `chat_auto_rules` — buscar regras ativas do tenant (`is_enabled = true`)

Todas as queries em paralelo, adicionadas ao `Promise.all` existente.

## Layout da nova secao

```text
── Fila de Atendimento ──────────────
● Categoria: [badge colorido] Suporte Técnico
  Times: Equipe Alpha, Equipe Beta
  Atribuição: Round Robin · Online only · Cap. 3
  
── Regras Automáticas ───────────────
⏱ Auto-mensagem após 5 min inativo
⏱ Fechar sala após 30 min inativo
```

Secao colapsavel, visivel apenas quando ha empresa vinculada. Controlada por uma nova flag `ws_show_queue_info` no `WorkspaceDisplaySettings` (default `true`).

## Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/components/chat/VisitorInfoPanel.tsx` | Adicionar queries + secao visual |
| `src/components/chat/WorkspaceDisplayTab.tsx` | Adicionar toggle `ws_show_queue_info` |

Sem migracoes SQL — todos os dados ja existem nas tabelas atuais. A nova flag `ws_show_queue_info` sera apenas client-side (default true) ate que se decida persistir.

