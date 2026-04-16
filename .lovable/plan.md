
## Definição refinada de "tempo de espera"

Vou recalcular o KPI de tempo de espera do tenant MarQ usando uma definição operacionalmente correta, que reflete apenas situações onde havia capacidade real de atendimento.

### Regra: uma sala entra no cálculo de tempo de espera SOMENTE se

1. **Foi efetivamente atribuída a um atendente** (`attendant_id IS NOT NULL` e `assigned_at IS NOT NULL`), OU
2. **Está atualmente em `waiting` E havia pelo menos 1 atendente online no momento da criação da sala** (capacidade existente, fila legítima)

### Regra: uma sala é EXCLUÍDA do cálculo se

- Está/ficou em `waiting` sem atendente algum online no período (não é "espera", é "ausência de operação")
- Foi arquivada sem atribuição (`resolution_status = 'archived'` e `attendant_id IS NULL`)
- Foi criada fora do horário comercial configurado em `chat_business_hours` (sem capacidade prevista)

### Métricas a entregar

Para o tenant MarQ, nos últimos 28 dias:

| Métrica | Como calcular |
|---|---|
| Tempo médio de espera (real) | `AVG(assigned_at - created_at)` apenas em salas atribuídas |
| Mediana de espera (p50) | mais representativo que média |
| p90 de espera | identifica cauda longa |
| Volume considerado | nº de salas que entraram no cálculo |
| Volume descartado | nº de salas excluídas + motivo (arquivadas, fora de horário, sem operação) |
| Tempo médio de atendimento (real) | `AVG(closed_at - assigned_at)` em salas atribuídas e fechadas |
| Taxa de atribuição | salas atribuídas / total de salas criadas |

### Execução

Apenas leituras SQL via Supabase (sem alteração de código). Resposta em chat com tabela markdown comparando o KPI antigo (média ingênua) vs. o novo (filtrado), explicando o que mudou e por quê.

### Arquivos
Nenhum. Operação read-only sobre o banco.
