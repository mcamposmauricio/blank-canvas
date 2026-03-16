

# Plano de Teste End-to-End

## Realidade

Este é um conjunto de **50+ cenários** que abrange 7 módulos. Testes end-to-end via browser automation são limitados a interações de UI — não conseguem verificar triggers de banco, RLS policies, ou lógica de edge functions diretamente. 

## Abordagem Proposta

Dividir em **3 camadas de teste**:

### Camada 1: Testes de Edge Functions (automatizáveis agora)
Usar `supabase--test_edge_functions` para validar lógica de backend:
- `assign-chat-room`: business hours, breaks, overrides, capacity check
- `backoffice-admin`: accept-invite, confirm users
- `resolve-chat-visitor`: criação de visitor/contact
- `process-chat-auto-rules`: welcome message, inactivity rules

### Camada 2: Queries de Validação no Banco
Usar `supabase--read_query` para verificar estado do banco:
- Triggers preenchendo `tenant_id` corretamente
- RLS isolando dados por tenant
- `active_conversations` incrementando/decrementando
- Health score calculado após resposta NPS
- Trail NPS criada automaticamente

### Camada 3: Testes de UI via Browser (seletivos)
Testar fluxos críticos de UI:
- Login → navegação ao Home
- Abrir chat widget → preencher form → sala criada
- Criar campanha NPS
- Criar artigo no Help Center
- Impersonation no Backoffice

## Priorização

Dado o volume, sugiro executar em **fases**:

**Fase 1 — Multi-Tenancy & Auth (crítico)**
- Verificar isolamento de tenant via queries no banco
- Testar invite flow (já corrigido recentemente)
- Verificar que master vê dados filtrados por tenant selecionado

**Fase 2 — Chat Module**
- Testar assign-chat-room edge function
- Verificar business hours / breaks / overrides
- Validar round-robin e capacity via queries

**Fase 3 — NPS Module**
- Verificar criação de campanha e envio
- Testar resposta via link_token
- Validar trail automática e health score

**Fase 4 — Contatos, Help Center, Banners**
- Verificar CRUD básico com isolamento de tenant
- Testar publicação de artigos
- Validar regras de segmentação de banners

## Execução

Posso começar imediatamente com as Camadas 1 e 2 (edge function tests + queries de banco) para cobrir a maior parte dos cenários sem depender de interação manual. Para a Camada 3, precisarei que você esteja logado no preview.

**Quer que eu comece pela Fase 1 (Multi-Tenancy) ou por outro módulo específico?**

