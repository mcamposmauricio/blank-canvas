

# Ranking de Atendentes no CSAT Report

## O que sera feito

Adicionar um card/secao de ranking de atendentes entre os metric cards e os graficos, mostrando uma tabela compacta com os atendentes ordenados por media CSAT, incluindo quantidade de avaliacoes e media.

## Implementacao

### `useCSATReport.ts`

Agregar dados por atendente a partir dos `rooms` ja carregados na query de stats (que ja tem `attendant_id` e `csat_score`). Calcular por atendente: media CSAT, total de avaliacoes, contagem positiva (4-5) e negativa (1-2). Adicionar ao `CSATReportStats`:

```typescript
attendantRanking: { attendantId: string; avgCsat: number; totalEvals: number; positiveCount: number; negativeCount: number }[]
```

Resolver nomes dos atendentes fazendo uma query em `attendant_profiles` com os IDs encontrados.

### `AdminCSATReport.tsx`

Adicionar um `ChartCard` ou `Card` com titulo "Ranking de Atendentes" apos os metric cards e antes dos graficos. Conteudo:
- Tabela compacta: posicao (medal icons para top 3), nome, media (com estrelas), avaliacoes, % positivo
- Ordenado por media CSAT desc, desempate por quantidade de avaliacoes

## Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/hooks/useCSATReport.ts` | Adicionar `attendantRanking` ao stats com agregacao por atendente |
| `src/pages/AdminCSATReport.tsx` | Novo card de ranking entre metrics e graficos |

