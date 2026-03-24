

# Plano: Importar macros privadas do CSV para o banco

## Resumo

Executar um script que leia o CSV, busque os `user_id` reais no banco pelo email, e insira as macros na tabela `chat_macros` — ignorando registros que ja existam (mesmo titulo+content ou muito similares para o mesmo usuario).

## Abordagem

1. Consultar `auth.users` (via `user_profiles` join) para mapear cada email do CSV ao `user_id` real no banco
2. Consultar macros existentes na tabela `chat_macros` para o tenant `bd0d9374-6253-4070-947c-0f0e85b8d036`
3. Para cada macro do CSV:
   - Encontrar o user_id pelo email
   - Verificar se ja existe macro com titulo e conteudo identico ou muito similar (mesmo user_id)
   - Se nao existir, inserir com `is_private` conforme o CSV
4. Reportar quantas foram inseridas, ignoradas, e erros

## Detalhes tecnicos

- Script Python usando `psycopg2` e variáveis de ambiente pg ja configuradas
- Deduplicacao: comparar titulo exato + similaridade de conteudo (strip/lower) > 90%
- Manter os campos: title, content, shortcut, category, is_private, tenant_id
- O `user_id` do CSV nao e confiavel (pode ser de outro ambiente) — mapear pelo email

## Arquivo

Nenhum arquivo do projeto sera alterado. Apenas execucao direta no banco.

