

# Plano: Completar importacao com JSON completo + deduplicacao

## Situacao atual no destino

| Tabela | Existente |
|---|---|
| contacts | 480 |
| company_contacts | 521 |
| visitors | 551 |
| rooms | 1,047 (1046 closed + 1 active) |
| messages | 12,886 |

O JSON novo tem ~369K linhas — significativamente maior que o primeiro (250K linhas). O primeiro import foi limitado a ~1000 rooms.

## Abordagem

Script Python executado no sandbox (mesmo approach anterior). Processar o JSON completo com deduplicacao em cada fase para nao duplicar os ~1000 rooms ja importados.

### Deduplicacao por fase

1. **Contacts**: Buscar por `external_id` no destino. Se existir, mapear sem recriar. Se nao, INSERT.
2. **Company_contacts**: Buscar por `external_id` + `tenant_id`. Se existir, mapear. Se nao, INSERT.
3. **Attendants**: Mapear por `user_email` (mesmo de antes). 5 atendentes ja mapeados.
4. **Tags**: Buscar por `name` no mesmo tenant. Mapear existentes.
5. **Visitors**: Buscar visitors ja criados pelo `contact_id` + `company_contact_id` mapeados. Se o visitor ja existe (mesmo contact+company_contact), reusar. Senao, INSERT.
6. **Rooms**: Deduplicar pelo `created_at` + `visitor_id` (mapeado). Se ja existe room com mesmo created_at e visitor, pular. Senao, INSERT. **Desabilitar triggers antes, reabilitar depois.**
7. **Messages**: Para rooms novos, inserir todas as mensagens. Para rooms ja existentes, pular.
8. **Room_tags**: Inserir apenas para rooms novos.

### Chats pendentes (active/waiting)

Rooms com `status = 'active'` ou `'waiting'` no JSON serao importados com o status original. Como os triggers estao desabilitados durante o INSERT, o auto-assignment nao vai disparar. O `attendant_id` sera mapeado pelo de-para de atendentes, garantindo que o chat aparece para o atendente correto no workspace.

Apos a importacao, executar um UPDATE nos `attendant_profiles` para recalcular `active_conversations` baseado na contagem real de rooms ativos.

### Recalculo de contadores

Apos inserir tudo:
```sql
UPDATE attendant_profiles SET active_conversations = (
  SELECT count(*) FROM chat_rooms 
  WHERE attendant_id = attendant_profiles.id 
  AND status IN ('active', 'waiting')
) WHERE tenant_id = 'eee96b59-...';
```

## Execucao

Script Python unico (`/tmp/import_chat_v2.py`) que:
1. Le o JSON de 369K linhas
2. Busca dados existentes no destino para deduplicacao
3. Processa fases 1-8 sequencialmente
4. Recalcula contadores de atendentes
5. Imprime relatorio: X criados / Y existentes por tabela

## Nenhum arquivo do projeto sera alterado

Execucao direta no banco via script.

