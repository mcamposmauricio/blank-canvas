

# Plano: Importar 170 Tags + 6 Macros Públicas

## Dados

- **Tenant destino:** `eee96b59-d7da-45cf-93f1-e3ab0796e678`
- **User_id destino:** `e89e32e3-cd89-4998-a455-b16178cbfffe`

## Tags: 170 registros

Todos os 170 registros do CSV `chat_tags_2026-03-21.csv` serão inseridos com novos UUIDs, preservando `name` e `color`.

## Macros: 6 registros (is_private = false)

Do CSV `chat_macros_2026-03-21.csv`, apenas as macros públicas:

| Título | Shortcut |
|---|---|
| Financeiro | /Financeiro |
| Fim do dia | Fim do dia |
| Almoço | Almoço |
| Solicitação cancelamento | (nenhum) |
| mais detalhes | + |
| Atendimento | /atendimento |

Serão inseridas com `is_private = false`, novos UUIDs, e o `user_id`/`tenant_id` do tenant destino.

## Execução

Script via `psql` que:
1. Lê os CSVs com `duckdb` ou processa diretamente
2. Gera INSERTs para `chat_tags` (170 rows) e `chat_macros` (6 rows)
3. Executa no banco

Sem migrações SQL, sem alterações de frontend.

