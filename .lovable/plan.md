

# Plano: Teste E2E Completo + Correção Crítica de Triggers

## Bloqueio Crítico Descoberto

Confirmei que **ZERO triggers existem no banco** apesar de duas migrations terem sido criadas. As migrations foram registradas na tabela `supabase_migrations.schema_migrations` mas o SQL **não foi executado**. Isso é o bloqueio principal — sem triggers, multi-tenancy, auto-assignment e NPS não funcionam.

## Parte 1: Corrigir os Triggers (Prioridade Máxima)

Criar uma **nova migration** que aplique todos os 55 triggers. Desta vez, cada statement será separado individualmente para garantir execução. A migration incluirá:

- 55 `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` statements
- Realtime publication (já está OK: 6 tabelas ativas)
- Storage buckets (já está OK: 3 buckets existem)

As funções já estão todas criadas no banco (confirmei 20+ funções). Apenas os triggers estão ausentes.

## Parte 2: Teste E2E — Fluxos a Validar

Após corrigir triggers, testar via queries e chamadas de edge function:

### 2a. Fluxo de Tenant + Convite
1. Verificar tenant "teste 2" (id: `06a1e7c4`) com profile pendente (`teste2@teste.com`)
2. Simular accept-invite via edge function `backoffice-admin`
3. Verificar que `user_profiles.invite_status` → `accepted`
4. Verificar que `user_roles` recebe role `admin`
5. Verificar que `csms` é criado com `tenant_id` correto (trigger `auto_set_tenant_csms`)

### 2b. Multi-tenancy (tenant_id auto-fill)
1. Inserir um `contact` com `user_id` do master → verificar `tenant_id` preenchido
2. Inserir um `campaign` → verificar `tenant_id`
3. Inserir um `chat_room` com `owner_user_id` → verificar `tenant_id` via `set_tenant_id_from_owner`

### 2c. Chat Assignment
1. Criar `chat_service_category` com `is_default = true`
2. Criar `chat_team` + `chat_team_member` + `chat_assignment_config`
3. Criar `attendant_profile` com `status = 'online'`
4. Inserir `chat_room` com `status = 'waiting'` → verificar auto-assignment
5. Fechar room → verificar `active_conversations` decrementa

### 2d. NPS Flows
1. Criar `campaign` + `campaign_contact` → verificar trail NPS criada automaticamente
2. Simular `email_sent = true` → verificar trail progress = 50%
3. Inserir `response` com score = 10 → verificar:
   - `contacts.last_nps_score` atualizado
   - Trail NPS → `completed`
   - Timeline event criado
4. Inserir `response` com score = 3 → verificar trail de recuperação criada

### 2e. Edge Functions
1. `get-widget-config` — verificar retorno sem JWT
2. `resolve-chat-visitor` — criar visitante
3. `assign-chat-room` — verificar lógica de assignment
4. `backoffice-admin` — testar `provision-tenant-admin` e `accept-invite`

### 2f. RLS Policies
1. Verificar isolamento: user do tenant A não vê dados do tenant B
2. Verificar que policies usam `get_user_tenant_id(auth.uid())`
3. Verificar acesso anon para tabelas públicas (brand_settings, campaign_contacts)

### 2g. Realtime
- Já configurado para: `attendant_profiles`, `chat_rooms`, `chat_messages`, `chat_banner_assignments`, `help_articles`, `chat_broadcasts`

### 2h. updated_at Triggers
- Verificar que UPDATE em qualquer tabela com `updated_at` atualiza automaticamente o timestamp

## Ordem de Execução

1. **Migration**: Criar nova migration com os 55 triggers (statements individuais)
2. **Verificar**: Query para confirmar triggers criados
3. **Testar tenant flow**: via edge function + queries
4. **Testar chat assignment**: insert chat_room + verificar assignment
5. **Testar NPS**: insert response + verificar cascata
6. **Testar edge functions**: curl nas 4 funções públicas
7. **Reportar**: resumo com status de cada fluxo

