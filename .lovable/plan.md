

# Plano: Corrigir Historico Nao Carregando no Widget (Visitors Duplicados)

## Problema

O widget do "Sukita Loco" (e potencialmente qualquer cliente) nao carrega conversas anteriores porque a funcao `findOrCreateVisitor` cria visitantes duplicados para o mesmo `company_contact_id`.

**Dados concretos**: O `company_contact_id` `15ba4b66...` (Administrador Kev) tem **10 registros de visitor** no banco. O visitor original (`c6499438`) tem 45 salas, mas os visitors mais recentes tem 0. Quando o widget abre, usa o token do visitor mais novo (sem salas), logo o historico aparece vazio.

**Causa raiz**: A funcao `findOrCreateVisitor` na edge function `resolve-chat-visitor` usa `.maybeSingle()` para buscar visitor por `company_contact_id`. Quando existem duplicatas (criadas por race condition — 2 chamadas paralelas no mesmo segundo), `.maybeSingle()` retorna `null` (Supabase retorna erro quando ha mais de 1 resultado), fazendo a funcao criar MAIS um visitor. Isso piora o problema progressivamente.

## Solucao (2 partes)

### 1. Edge Function: Trocar `.maybeSingle()` por `.limit(1).single()` + consolidar

**`supabase/functions/resolve-chat-visitor/index.ts`** — funcao `findOrCreateVisitor`:

- Substituir a query de lookup por `.order("created_at", { ascending: true }).limit(1)` para sempre retornar o visitor mais antigo (que tem mais historico)
- Adicionar `UNIQUE` constraint nao e viavel (ja existem duplicatas), entao a solucao e tolerante a duplicatas

Mudanca especifica:
```text
// ANTES (linha 432-436):
.eq("company_contact_id", companyContactId)
.maybeSingle();

// DEPOIS:
.eq("company_contact_id", companyContactId)
.order("created_at", { ascending: true })
.limit(1)
.maybeSingle();
```

Isso garante que mesmo com duplicatas, sempre retorna o visitor mais antigo (que contem o historico real).

### 2. Migration: Consolidar visitors duplicados existentes

Criar uma migration SQL que:
- Identifica visitors duplicados por `company_contact_id`
- Para cada grupo, mantém o mais antigo (que tem mais rooms)
- Move todas as `chat_rooms` dos duplicados para o visitor primario (`UPDATE chat_rooms SET visitor_id = primary WHERE visitor_id IN (duplicates)`)
- Deleta os visitors orfaos

```sql
-- Mover rooms de visitors duplicados para o primario (mais antigo)
WITH ranked AS (
  SELECT id, company_contact_id,
    ROW_NUMBER() OVER (PARTITION BY company_contact_id ORDER BY created_at ASC) as rn
  FROM chat_visitors
  WHERE company_contact_id IS NOT NULL
),
primaries AS (
  SELECT id as primary_id, company_contact_id FROM ranked WHERE rn = 1
),
duplicates AS (
  SELECT r.id as dup_id, p.primary_id
  FROM ranked r
  JOIN primaries p ON p.company_contact_id = r.company_contact_id
  WHERE r.rn > 1
)
UPDATE chat_rooms SET visitor_id = d.primary_id
FROM duplicates d WHERE chat_rooms.visitor_id = d.dup_id;

-- Deletar visitors duplicados (sem rooms restantes)
DELETE FROM chat_visitors
WHERE id IN (
  SELECT id FROM (
    SELECT id, company_contact_id,
      ROW_NUMBER() OVER (PARTITION BY company_contact_id ORDER BY created_at ASC) as rn
    FROM chat_visitors WHERE company_contact_id IS NOT NULL
  ) sub WHERE rn > 1
);
```

## Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/resolve-chat-visitor/index.ts` | Adicionar `.order("created_at").limit(1)` no lookup de visitor |
| Nova migration SQL | Consolidar visitors duplicados e mover rooms |

## Impacto

- Corrige o historico para todos os clientes afetados (nao so Sukita Loco)
- Previne criacao de novos duplicados
- Sem mudanca no widget frontend — o problema e 100% backend

