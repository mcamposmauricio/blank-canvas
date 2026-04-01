

# Ranking de Atendentes — Informacoes Expandidas

## O que sera adicionado

Expandir o card de ranking para incluir: total de chats atendidos (closed), taxa de resposta CSAT, contagem de negativos, e tempo medio de atendimento por atendente.

## Implementacao

### `useCSATReport.ts`

1. Expandir a interface `AttendantRankingEntry` com novos campos:
   - `totalClosedChats: number` — total de salas fechadas por aquele atendente (com ou sem CSAT)
   - `responseRate: number` — % de chats que tiveram avaliacao CSAT
   - `avgDurationMinutes: number | null` — tempo medio de atendimento

2. Na agregacao existente (linhas 155-165), ja temos `rooms` (salas com CSAT). Precisamos de uma query adicional para contar **todos** os chats fechados por atendente (sem filtro de CSAT) para calcular a taxa de resposta:
   - Query: `chat_rooms` where `status = closed`, agrupando por `attendant_id`, com os mesmos filtros de data/tag/contact
   - Calcular `created_at → closed_at` diff para tempo medio

3. Atualizar `EMPTY_STATS` para incluir os novos campos default.

### `AdminCSATReport.tsx`

Expandir a tabela do ranking com novas colunas:
- **Chats Atendidos** — total de chats fechados pelo atendente
- **Taxa de Resposta** — % dos chats que receberam avaliacao CSAT
- **% Negativo** — percentual de avaliacoes 1-2
- **Tempo Médio** — duracao media em minutos (formatado como Xh Ym ou Xm)

A tabela ficara com 8 colunas: #, Atendente, Media, Avaliacoes, Chats, Taxa Resp., % Positivo, % Negativo, Tempo Medio.

## Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/hooks/useCSATReport.ts` | Expandir interface + query adicional de closed chats por atendente |
| `src/pages/AdminCSATReport.tsx` | Novas colunas na tabela de ranking |

## Impacto

Uma query adicional de contagem (head only com group simulation) — impacto minimo em performance. Nenhuma mudanca em outras paginas.

