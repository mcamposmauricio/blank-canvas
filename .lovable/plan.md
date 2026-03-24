

# Plano: Importar historico de chat completo do JSON exportado

## Escopo do JSON

| Secao | Qtd estimada | Linhas |
|---|---|---|
| contacts (empresas) | ~400 | 7-21500 |
| company_contacts | ~500 | 21500-33000 |
| visitors | ~700 | 33000-48000 |
| rooms | ~1000 | 48000-76000 |
| messages | ~15000+ | 76000-245352 |
| tags | ~100 | 245353-246378 |
| room_tags | ~1000 | 246379-249323 |
| attendants | 7 | 249325-249452 |

## Por que nao Edge Function

O JSON tem 250K linhas (~15MB+). Edge functions tem timeout de 150s e limite de body. A abordagem correta e um script Python executado no sandbox com acesso direto ao banco via `psql`/`psycopg2`.

## Implementacao

Um script Python (`/tmp/import_chat.py`) que:

### Fase 0 — Setup
- Le o JSON do arquivo uploaded
- Conecta ao banco via env vars pg
- Busca `tenant_id` e `user_id` do admin no banco destino (o tenant ativo `eee96b59...`)

### Fase 1 — Empresas (contacts)
- Para cada contact do JSON, buscar no destino por `external_id` (mesmo tenant)
- Se existir: mapear `old_id → existing_id`, nao duplicar
- Se nao existir: INSERT com todos os campos (name, company_document, custom_fields, mrr, health_score, etc.) usando `user_id` e `tenant_id` do destino
- Mapa: `old_contact_id → new_contact_id`

### Fase 2 — Contatos de empresa (company_contacts)
- Resolver `company_id` via mapa da Fase 1
- Buscar duplicata por `external_id` + `tenant_id`
- Se nao existir: INSERT preservando chat_total, chat_avg_csat, chat_last_at
- Mapa: `old_cc_id → new_cc_id`

### Fase 3 — Atendentes
- Para cada attendant do JSON, buscar `user_profiles` + `attendant_profiles` no destino pelo `user_email`
- Mapa: `old_attendant_id → new_attendant_id` (NULL se nao encontrado)

### Fase 4 — Tags
- Para cada tag, buscar por `name` no mesmo tenant
- Se existir: mapear
- Se nao existir: INSERT com name, color
- Mapa: `old_tag_id → new_tag_id`

### Fase 5 — Visitors
- INSERT novo para cada visitor com:
  - `contact_id` → mapa Fase 1
  - `company_contact_id` → mapa Fase 2
  - `owner_user_id` e `tenant_id` do destino
  - Preservar name, email, phone, role, department, metadata
  - Gerar novo `visitor_token` (uuid)
- Mapa: `old_visitor_id → new_visitor_id`

### Fase 6 — Rooms
- **Desabilitar triggers** em `chat_rooms` antes de inserir (evitar auto-assignment)
- INSERT com todos IDs mapeados (visitor, attendant, contact, company_contact)
- Preservar: status, priority, csat_score, csat_comment, resolution_status, created_at, started_at, assigned_at, closed_at, metadata
- **Reabilitar triggers** apos inserir
- Mapa: `old_room_id → new_room_id`

### Fase 7 — Mensagens
- INSERT em batches de 500
- `room_id` → mapa Fase 6
- `sender_id`: visitor → mapa Fase 5, attendant → buscar por user_id nos atendentes mapeados (o sender_id nas mensagens e o `user_id` do atendente, nao o `attendant_id`)
- Preservar: sender_type, sender_name, content, message_type, is_internal, metadata, created_at, deleted_at

### Fase 8 — Room Tags
- INSERT com room_id e tag_id mapeados

### Fase 9 — Reabilitar triggers
- `ALTER TABLE chat_rooms ENABLE TRIGGER ALL`

## Deduplicacao futura

As empresas importadas terao `external_id` preenchido. Quando o widget de chat resolver o visitante (via `resolve-chat-visitor`), ele ja busca por `external_id` na tabela `contacts`, garantindo que nao cria duplicata.

## Saida

O script imprime relatorio:
- X empresas criadas / Y existentes
- X contatos criados / Y existentes
- X visitors criados
- X rooms criados
- X mensagens inseridas
- X tags criadas / Y existentes
- X room_tags inseridos

## Nenhum arquivo do projeto sera alterado

Execucao direta no banco via script Python.

