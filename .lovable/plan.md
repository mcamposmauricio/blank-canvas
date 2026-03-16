

# Plano: Corrigir Isolamento de Tenant no TeamSettingsTab e Demais Consultas

## Diagnóstico

O problema **não é das migrations nem dos triggers** (93 triggers estão ativos e funcionando). O problema é de **filtragem no código frontend**.

Quando o master admin usa o sistema (ou impersona um tenant), a sessão Supabase continua sendo do master. A policy RLS `is_master(auth.uid())` permite ver **todos** os registros de todas as tabelas. Como o `TeamSettingsTab` faz `select("*")` sem filtro por `tenant_id`, o master vê todos os usuários de todos os tenants.

O mesmo problema pode ocorrer em outras queries que não filtram por `tenant_id`.

## Correções

### 1. `TeamSettingsTab.tsx` — Adicionar filtro por tenant

Na função `loadData()` (linha 71), adicionar `.eq("tenant_id", tenantId)` na query de `user_profiles`. Também garantir que a query de `user_roles` seja filtrada pelos `user_id` dos profiles retornados (não há coluna `tenant_id` em `user_roles`).

```typescript
// Antes:
supabase.from("user_profiles").select("*").order("created_at")

// Depois:
supabase.from("user_profiles").select("*").eq("tenant_id", tenantId).order("created_at")
```

Também adicionar guard `if (!tenantId) return;` no início do `loadData`.

### 2. Adicionar `tenantId` como dependência do `useEffect`

O `useEffect` atual usa `[]` como deps. Deve usar `[tenantId]` para recarregar quando o tenant mudar (troca de tenant ou impersonação).

### 3. Auditar outras queries sem filtro de tenant

Verificar e corrigir queries similares em:
- `OrganizationSettingsTab.tsx` — já usa `tenantId` parcialmente, verificar completude
- `AdminBroadcasts.tsx` — query de recipients
- Hooks como `useAttendants.ts`, `useChatHistory.ts`, `useDashboardStats.ts`

### 4. Padrão defensivo para masters

Criar convenção: toda query que usa `tenantId` do contexto deve ter um guard `if (!tenantId) return` para evitar queries sem filtro.

## Arquivos a Modificar

1. **`src/components/TeamSettingsTab.tsx`** — filtro `.eq("tenant_id", tenantId)` + deps do useEffect
2. Auditoria rápida nos demais componentes que fazem queries sem filtro tenant (lista acima)

## Impacto

- Master admin verá apenas os usuários do tenant selecionado/impersonado
- Admins regulares continuarão funcionando normalmente (RLS já filtra)
- Nenhuma mudança de banco necessária

