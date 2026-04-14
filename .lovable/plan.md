

# Fechar TODAS as salas travadas em `waiting` sem atendente

## Problema
Existem **65 salas** presas em `waiting` com `attendant_id IS NULL`, algumas desde 17 de marco. Todas bloqueiam os respectivos visitantes de abrir novos chats.

A sala especifica do external_id `8A5CEFC0DA2F46E6A34325B9BA538319` e a `1f37e0af-3bfe-409d-bffa-91655e3185b8` (Administrador Cafe Parambu Ltda).

## Solucao
Uma unica migration SQL que fecha todas as 65 salas de uma vez:

```sql
UPDATE public.chat_rooms
SET status = 'closed',
    closed_at = now(),
    resolution_status = 'archived',
    updated_at = now()
WHERE status = 'waiting'
  AND attendant_id IS NULL;
```

## Resultado
- Todas as 65 salas travadas serao fechadas com status `archived`
- Todos os visitantes afetados poderao abrir novos chats normalmente
- Nenhum dado e perdido — as salas ficam no historico
- A sala da Maria Do Socorro ja foi corrigida na migration anterior; esta cobre todas as restantes

## Investigacao recomendada (pos-fix)
O dia 9 de abril concentra a maioria das salas travadas. Possivel causa: atendentes offline ou regra de auto-close que nao cobre salas em `waiting` sem atendente atribuido.

