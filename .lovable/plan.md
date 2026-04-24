
## Objetivo
Gerar prints polidos (com frame macOS + gradiente mesh) das 3 áreas do sistema usando o tenant MarQ HR para uso em material de marketing:
1. Dashboard (técnico/gerencial)
2. CSAT (relatório)
3. Workspace de atendentes (chat ao vivo)

## Plano de execução

### 1. Login e impersonação
- Navegar até a preview e confirmar sessão master logada
- Impersonar tenant MarQ HR (ou navegar como master com filtro de tenant)
- Se houver tela de login, parar e pedir ao usuário para logar

### 2. Capturas (viewport desktop 1536x864 para qualidade)
Para cada rota, ajustar viewport, navegar, esperar dados carregarem, screenshot:

| # | Rota | Conteúdo esperado |
|---|------|-------------------|
| 1 | `/admin/dashboard` | Dashboard técnico — KPIs, gráficos de volume, fila ao vivo |
| 2 | `/admin/dashboard-gerencial` | Dashboard gerencial — visão executiva (se aplicável) |
| 3 | `/admin/csat` | Relatório CSAT — média, distribuição, ranking de atendentes |
| 4 | `/admin/workspace` | Workspace de atendimento — lista de salas + chat aberto |

Total alvo: 3–4 prints (priorizar os 3 pedidos; gerencial como bônus se ficar bom).

### 3. Pós-processamento
Para cada screenshot bruto:
- Copiar `knowledge://skill/product-shot/generate.py` → `/tmp/generate.py`
- Rodar com presets variados que combinem com a identidade do produto:
  - Dashboard → `ocean` ou `midnight` (sério, dados)
  - CSAT → `aurora` ou `peach` (positivo, satisfação)
  - Workspace → `sunset` ou `lavender` (caloroso, conversação)
- Saída em `/mnt/documents/marketing-{area}.png`

### 4. Entrega
Listar os arquivos como `<lov-artifact>` para o usuário baixar.

## Cuidados
- **Dados sensíveis:** os prints conterão nomes reais de clientes/atendentes do MarQ. Vou avisar o usuário ao final que ele deve revisar/borrar PII antes de publicar — ou posso gerar uma segunda versão com blur se ele pedir.
- **Sem mock data:** vamos usar o estado real do tenant. Se alguma tela estiver vazia (ex: filtro errado), ajusto filtros antes do screenshot.
- **Sem alterações de código** — apenas browser + script de pós-processamento.

## Arquivos gerados
- `/mnt/documents/marketing-dashboard.png`
- `/mnt/documents/marketing-csat.png`
- `/mnt/documents/marketing-workspace.png`
- (opcional) `/mnt/documents/marketing-dashboard-gerencial.png`

Aprove para eu executar.
