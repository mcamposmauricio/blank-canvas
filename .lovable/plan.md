

# Plano: Mapear atendentes nos 548 rooms importados

## Situacao

548 rooms fechados com `attendant_id = NULL`. A migration aprovada anteriormente para corrigir isso nunca foi criada como arquivo. Os dados nas mensagens permitem mapear:

- Lucas (134 rooms) → `4873662b-2c67-475f-b8ce-c7bd3d902ee3`
- Felipe (132 rooms) → `8799798f-20b1-44c1-9313-231e69d578e8`
- Matheus (99 rooms) → `b15cea0b-ec10-462d-8dc3-8e553f42b1a1`
- Ana (91 rooms) → `20d1df9d-b67a-4fa4-a7af-d625627ab5e0`
- Sem mapeamento: chuckzera (33), alexandre ando (3), thainá (1), sem mensagem (~55) = ~92 rooms

## Execucao (1 migration SQL)

### Passo 1 — Mapear 456 rooms pelo sender_name das mensagens

UPDATE `chat_rooms.attendant_id` usando a primeira mensagem de atendente com nome conhecido (Felipe, Lucas, Ana, Matheus).

### Passo 2 — Distribuir os ~92 rooms restantes em round-robin

Rooms sem atendente mapeavel (chuckzera, alexandre, thainá, sem mensagens) serao distribuidos igualmente entre os 4 atendentes.

### Passo 3 — Preencher sender_id nas mensagens

UPDATE `chat_messages.sender_id` onde `sender_type = 'attendant'` e `sender_id IS NULL`, mapeando `sender_name` para o `user_id` correspondente.

### Passo 4 — Recalcular contadores

Recalcular `active_conversations` em `attendant_profiles`.

## Arquivos

| Arquivo | Mudanca |
|---|---|
| Nova migration SQL | Mapear attendant_id nos rooms + sender_id nas mensagens + round-robin dos restantes |

