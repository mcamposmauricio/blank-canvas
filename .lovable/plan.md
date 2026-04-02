

# Plano: Melhorar Statistics dos Banners + Scroll com Paginacao nos Pendentes

## Problema 1: Statistics do Banner

O dialog de metricas atual (linhas 1443-1530) e apenas uma tabela simples com 4 cards numericos no topo. Falta um mini-dashboard com visualizacao clara de engajamento, funil e tendencias.

### Mudancas

**Arquivo: `src/pages/AdminBanners.tsx`**

Substituir o dialog de metricas (linhas 1443-1530) por um mini-dashboard com:

1. **Header com resumo visual** — 5 MetricCards em grid:
   - Atribuidos (total)
   - Views totais
   - Taxa de visualizacao (views/atribuidos %)
   - Favorabilidade (up/total votos %)
   - Dismissed (count + %)

2. **Barra de funil horizontal** — Visualizacao tipo funnel:
   - Atribuidos → Visualizaram → Votaram → Dismissed
   - Cada etapa com barra de progresso proporcional e label

3. **Breakdown de votos** — Se `has_voting`:
   - Barra horizontal bicolor (verde positivo / vermelho negativo) com percentuais
   - Count de cada lado

4. **Tabela compacta** — Manter a tabela existente mas:
   - Adicionar busca por nome
   - Adicionar filtro por status (ativo/dismissed) e voto (positivo/negativo/sem)
   - Scroll interno com altura max de 300px
   - Ordenacao por views (clicavel no header)

---

## Problema 2: PendingRoomsList sem scroll funcional para volumes grandes

O componente atual tem `ScrollArea` com `max-h-[300px]` mas com muitos itens a paginacao "Carregar mais" fica escondida ou o scroll nao e intuitivo.

### Mudancas

**Arquivo: `src/components/chat/PendingRoomsList.tsx`**

1. Aumentar `max-h` de 300px para `max-h-[400px]` para mais visibilidade
2. Adicionar **scroll infinito** com `IntersectionObserver` — quando o usuario rola ate o final, carrega automaticamente a proxima pagina (sem precisar clicar "Carregar mais")
3. Manter o botao "Carregar mais" como fallback caso o observer nao dispare
4. Adicionar indicador de loading (spinner pequeno) durante carregamento de pagina adicional
5. Mostrar counter "Exibindo X de Y" no topo da lista para dar contexto

---

## Arquivos Modificados

| Arquivo | Mudanca |
|---|---|
| `src/pages/AdminBanners.tsx` | Redesign do metricsDialog com mini-dashboard, funil, filtros e scroll na tabela |
| `src/components/chat/PendingRoomsList.tsx` | Scroll infinito com IntersectionObserver + counter + loading indicator |

## Detalhes Tecnicos

- Funil usa `Progress` component existente com widths proporcionais
- IntersectionObserver via `useRef` + `useEffect` no ultimo item visivel
- Sem dependencias novas — tudo com componentes UI existentes (MetricCard nao sera importado no dialog, usara divs styled inline para manter o dialog leve)
- Zero impacto em outros processos — ambas as mudancas sao puramente visuais/UX

