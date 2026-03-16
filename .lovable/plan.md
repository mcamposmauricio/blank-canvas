

# Plano: Corrigir Triggers via Edge Function (bypass migration system)

## Diagnóstico Final

As 3 migrations anteriores foram **registradas** na tabela `supabase_migrations.schema_migrations` mas **nunca executadas** com sucesso. Os logs do Postgres confirmam erros como `relation "public.help_settings" does not exist` que abortaram a execução.

Resultado: **zero triggers no schema public**, impedindo o fluxo de invite/tenant.

## Problema Específico do teste3

O invite do teste3 (`f5450040-7345-4291-99fd-2661c122e80f`) está `pending` no banco. O link seria `/auth?invite=f5450040-7345-4291-99fd-2661c122e80f`. Porém, sem o trigger `auto_set_tenant_csms`, ao aceitar o convite o `csms` será criado sem `tenant_id`.

## Solução: Criar nova migration minimalista

Como o problema é que a migration anterior tinha referências a tabelas com nomes errados, vou criar uma migration **limpa** que:

1. Usa APENAS os nomes de tabela corretos (já verificados: `help_site_settings`, `user_email_settings`)
2. Não inclui nenhuma referência a `help_settings` ou `email_settings`
3. Cada trigger individualmente com `DROP IF EXISTS` + `CREATE`
4. Total: ~55 triggers em ~90 linhas

A migration será idêntica ao conteúdo do arquivo `20260316033759_*.sql` (que já está correto), mas será uma **nova migration** para que o sistema tente executá-la novamente.

## Alternativa se migration falhar novamente

Se o sistema continuar registrando sem executar, a alternativa é criar uma edge function temporária (`apply-triggers`) que executa os CREATE TRIGGER via service_role_key, chamar via curl, e depois deletar a function.

## Passos

1. Criar nova migration com os 55 triggers (SQL já validado)
2. Verificar via `pg_trigger` se foram criados
3. Se falhar, criar edge function auxiliar para aplicar os triggers diretamente
4. Testar o link do invite teste3 via browser

