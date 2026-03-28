

# Apagar CSAT de Kevin Pro Bar e Marq. Testes

## Escopo

23 registros de CSAT (score + comment) em `chat_rooms` vinculados a:
- **Marq. Testes** (contact_id: `7da1a0df-1848-41c6-9620-948ed842eb35`) — 13 registros
- **Kevin Pro Bar** (contact_id: `26087678-ae68-461c-8c09-552f464f7cf6`) — 10 registros

Nao ha registros de Mauricio/Thaina fora dessas empresas.

## Acao

Uma unica migration SQL:

```sql
UPDATE chat_rooms
SET csat_score = NULL, csat_comment = NULL
WHERE contact_id IN (
  '7da1a0df-1848-41c6-9620-948ed842eb35',
  '26087678-ae68-461c-8c09-552f464f7cf6'
)
AND csat_score IS NOT NULL;
```

Tambem verificar se `company_contacts` tem campos de media CSAT que precisam ser zerados:

```sql
UPDATE company_contacts
SET chat_avg_csat = 0
WHERE company_id IN (
  '7da1a0df-1848-41c6-9620-948ed842eb35',
  '26087678-ae68-461c-8c09-552f464f7cf6'
)
AND chat_avg_csat > 0;
```

## Arquivos

| Arquivo | Mudanca |
|---|---|
| Nova migration SQL | UPDATE para zerar csat_score/csat_comment nas chat_rooms + chat_avg_csat nos company_contacts |

