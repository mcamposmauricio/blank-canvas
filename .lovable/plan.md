

# Plano: Status de Empresa Inativa + Performance

## 1. Adicionar coluna `is_active` na tabela `contacts`

**Migração SQL:**
- `ALTER TABLE contacts ADD COLUMN is_active boolean NOT NULL DEFAULT true;`
- Criar index parcial: `CREATE INDEX idx_contacts_active_companies ON contacts(tenant_id) WHERE is_company = true AND is_active = true;` — queries de empresas ativas ficam rápidas sem scannear inativas
- Criar index para category assignment: `CREATE INDEX idx_contacts_category_tenant ON contacts(tenant_id, service_category_id) WHERE is_company = true AND is_active = true;`

## 2. Ignorar empresas inativas nos pontos de automação

### 2a. Trigger `assign_chat_room` (BEFORE INSERT em chat_rooms)
Após buscar o `contacts` (linha 81-84), adicionar check:
```sql
-- Se a empresa (contact) está inativa, não atribuir — sala fica 'waiting' sem atendente
IF v_contact.is_active = false THEN RETURN NEW; END IF;
```
Impacto: zero custo extra (já faz o SELECT no contact, só adiciona 1 coluna ao select + 1 IF).

### 2b. Edge function `resolve-chat-visitor` — `applyCategoryFieldRules`
Após buscar o contact (linha 712-716), verificar `is_active`:
```typescript
if (contact.is_active === false) return; // skip categorization for inactive
```

### 2c. `CategoryFieldRules.tsx` — sync de regras
No loop de empresas para sincronização (linha ~230), filtrar apenas `is_active = true` na query de companies.

### 2d. `process-chat-auto-rules` — auto-close/mensagens
Nas queries de rooms com inactivity, já filtram por `status = 'active'` ou `'waiting'`. Não precisa mudar — empresa inativa simplesmente não terá rooms novos atribuídos.

### 2e. Banners/Outbound (`get-visitor-banners`)
Adicionar filtro: ao buscar contact para segmentação, ignorar se `is_active = false`.

### 2f. NPS Campaigns (`process-automatic-campaigns`)
Na query de contacts elegíveis, adicionar `AND c.is_active = true`.

## 3. Frontend — Toggle de ativo/inativo

### 3a. `CompanyForm.tsx`
Adicionar toggle `Empresa ativa` no formulário (default: true).

### 3b. `Contacts.tsx`
- Adicionar filtro de status (Ativas / Inativas / Todas) no filter bar
- Query padrão: `is_active = true` (mostrar apenas ativas por padrão)
- Badge visual "Inativa" na listagem para empresas desativadas

### 3c. `CompanyDetailsSheet.tsx`
Mostrar badge de status e permitir ativar/desativar empresa.

### 3d. `CategoriesTab.tsx`
Na contagem de empresas por categoria, filtrar apenas `is_active = true`.

## 4. Performance e Escalabilidade

Todas as operações adicionadas são **O(1) por empresa** — apenas checks booleanos em dados já carregados. Não há queries adicionais.

| Ponto | Custo | Justificativa |
|---|---|---|
| `assign_chat_room` trigger | +1 IF check | Column já é buscada no SELECT existente |
| `applyCategoryFieldRules` | +1 IF check | Dado já carregado |
| `CategoryFieldRules` sync | Filter na query | Index parcial `idx_contacts_active_companies` |
| `Contacts.tsx` listagem | Filter na query | Mesmo index parcial |
| NPS campaigns | +1 AND na WHERE | Index parcial cobre |

**Indexes parciais** garantem que queries de empresas ativas nunca scaneiam inativas, mantendo performance constante conforme a base cresce.

## Resumo de arquivos

| Tipo | Arquivo |
|---|---|
| Migração SQL | Coluna `is_active` + 2 indexes parciais + update `assign_chat_room` |
| Edge function | `resolve-chat-visitor/index.ts` |
| Edge function | `get-visitor-banners/index.ts` |
| Frontend | `CompanyForm.tsx`, `Contacts.tsx`, `CompanyDetailsSheet.tsx` |
| Frontend | `CategoryFieldRules.tsx`, `CategoriesTab.tsx` |

