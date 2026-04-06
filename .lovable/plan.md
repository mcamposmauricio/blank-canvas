

# Plano: Advisory Lock no Trigger de Resync

## Resumo

Adicionar `pg_advisory_xact_lock` na funcao `resync_attendant_counter_on_room_change` para serializar COUNTs concorrentes do mesmo atendente, eliminando a race condition que causa contagens erradas.

## Mudanca unica: nova migration SQL

Alterar a funcao existente para adicionar advisory lock antes de cada COUNT:

```sql
CREATE OR REPLACE FUNCTION public.resync_attendant_counter_on_room_change()
  RETURNS trigger ...
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.attendant_id IS NOT NULL AND OLD.status IN ('active', 'waiting') THEN
      PERFORM pg_advisory_xact_lock(hashtext(OLD.attendant_id::text));
      UPDATE ... SET active_conversations = (SELECT COUNT(*) ...) ...
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.attendant_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(OLD.attendant_id::text));
    UPDATE ... SET active_conversations = (SELECT COUNT(*) ...) ...
  END IF;

  IF NEW.attendant_id IS NOT NULL AND (...) THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.attendant_id::text));
    UPDATE ... SET active_conversations = (SELECT COUNT(*) ...) ...
  END IF;

  RETURN NEW;
END;
$$
```

## Impacto

- Zero custo em operacao normal (lock instantaneo sem concorrencia)
- Serializa apenas quando dois triggers rodam para o mesmo atendente simultaneamente
- Sem tabelas, colunas ou indices novos
- Nenhum arquivo frontend modificado

## Arquivos

| Arquivo | Alteracao |
|---------|-----------|
| Nova migration SQL | `pg_advisory_xact_lock` no `resync_attendant_counter_on_room_change` |

