

# Corrigir sala travada em `waiting` para cliente Maria Do Socorro

## Problema
A sala `47e10e35-5815-4997-851f-4bf880810ebb` esta presa no status `waiting` desde 9 de abril, sem atendente atribuido. Isso bloqueia a visitante de abrir novos chats.

## Solucao
Migration SQL para fechar a sala travada com `resolution_status = 'archived'` (nao foi atendida).

```sql
UPDATE public.chat_rooms
SET status = 'closed',
    closed_at = now(),
    resolution_status = 'archived',
    updated_at = now()
WHERE id = '47e10e35-5815-4997-851f-4bf880810ebb'
  AND status = 'waiting';
```

## Resultado
- A cliente Maria Do Socorro podera abrir um novo chat normalmente
- A sala fechada ficara no historico com status `archived`
- Nenhum dado e perdido

## Investigacao adicional recomendada
A sala ficou 5 dias sem atribuicao. Possivel causa: nenhum atendente online/elegivel quando ela entrou, e nenhuma regra de auto-close cobriu o caso. Isso pode indicar que a regra de inatividade precisa ser ajustada para cobrir salas em `waiting` sem atendente.

