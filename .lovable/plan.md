

# Fix: Bug de timezone no relatório CSAT

## Diagnóstico

Analisei todos os arquivos que fazem parsing de `dateFrom`/`dateTo` para queries ao Supabase:

| Arquivo | Parsing | Status |
|---|---|---|
| `src/hooks/useCSATReport.ts` | `new Date(filters.dateFrom)` (sem T00:00:00) | **BUGADO** |
| `src/hooks/useDashboardStats.ts` | `new Date(filters.dateFrom + "T00:00:00")` | OK |
| `src/pages/AdminDashboard.tsx` | `new Date(filters.dateFrom + "T00:00:00")` | OK |
| `src/pages/AdminChatHistory.tsx` | `new Date(dateFrom + "T00:00:00")` | OK |
| `src/hooks/useChatHistory.ts` | Recebe datas já processadas do AdminChatHistory | OK |

**Apenas `useCSATReport.ts` tem o bug.** Os outros arquivos já usam o sufixo `"T00:00:00"` que força o parsing como horário local.

## O bug

```typescript
// BUGADO — "2026-03-17" é parseado como UTC midnight (00:00 UTC = 21:00 BRT dia anterior)
startDate = new Date(filters.dateFrom).toISOString();

// dateTo também bugado — setDate opera em local mas a base é UTC
const d = new Date(filters.dateTo); d.setDate(d.getDate() + 1); endDate = d.toISOString();
```

## Correção

Arquivo: `src/hooks/useCSATReport.ts`, linhas 62-71

```typescript
// dateFrom: parsear como meia-noite LOCAL
if (filters.dateFrom) {
  startDate = new Date(filters.dateFrom + "T00:00:00").toISOString();
} else {
  // ... switch case inalterado
}

// dateTo: parsear como meia-noite LOCAL do dia seguinte
if (filters.dateTo) {
  const d = new Date(filters.dateTo + "T00:00:00");
  d.setDate(d.getDate() + 1);
  endDate = d.toISOString();
}
```

Mesma correção aplicada na segunda query paginada (linhas ~128-130).

## Escopo

- **1 arquivo alterado**: `src/hooks/useCSATReport.ts`
- **0 migrações SQL**
- **0 mudanças de frontend**

