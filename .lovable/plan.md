

# Plano: Corrigir papéis de usuários do tenant marqponto

## Situação atual

Todos os 6 usuários do tenant `eee96b59-d7da-45cf-93f1-e3ab0796e678` têm role `admin`, o que ignora todas as permissões granulares.

## Correção

Remover role `admin` de 4 usuários. Manter apenas Mauricio e Thainá como admin.

| Usuário | Ação |
|---|---|
| `mauricio@marqponto.com.br` | Manter admin |
| `thaina@marqponto.com.br` | Manter admin |
| `lucas@marqponto.com.br` | **Remover admin** |
| `felipe@marqponto.com.br` | **Remover admin** |
| `ana@marqponto.com.br` | **Remover admin** |
| `matheus@marqponto.com.br` | **Remover admin** |

## Detalhes

- Felipe já tem permissões granulares configuradas na tabela `user_permissions` — passará a segui-las imediatamente
- Lucas, Ana e Matheus **não** têm permissões granulares configuradas — após remover o admin, terão acesso zero até que um admin configure suas permissões na tela de permissões
- Executado via SQL `DELETE FROM user_roles` para os 4 user_ids específicos
- Nenhuma alteração de código

## SQL

```sql
DELETE FROM user_roles 
WHERE role = 'admin' 
AND user_id IN (
  '58dd7b3c-5844-4177-baf0-2ef09714aa2a',  -- lucas
  '19c4c328-0627-482f-b787-47b5928e702f',  -- felipe
  'c148f8fe-000d-4cbf-be57-159dbdad29f5',  -- ana
  '21aa0988-c5ea-4961-9884-36d2a69b24c1'   -- matheus
);
```

**Importante:** Após a execução, Lucas, Ana e Matheus precisarão ter permissões configuradas por um admin (Mauricio ou Thainá) na tela de Permissões, senão não verão nada no sistema.

