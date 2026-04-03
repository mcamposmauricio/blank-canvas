

# Plano: Redesign Visual do Widget — Todas as Telas + Preview

## Resumo

Modernizar o visual de todas as telas de status do widget (fora do horario, ocupados, aguardando, closed) e do preview nas configuracoes. CSAT mantem labels/textos intactos, recebe apenas melhorias visuais (emoji maior, glow nas estrelas). Preview espelha fielmente o novo design.

## Mudancas por Arquivo

### 1. `src/pages/ChatWidget.tsx`

**Tela Outside Hours (linha ~1514-1522)**
- Substituir `bg-blue-50 border-blue-200 text-blue-800` por card usando `primaryColor` com opacidade
- Adicionar icone decorativo `Clock` com circulos concentricos animados (pulse suave)
- Titulo com `font-semibold` e subtitulo com spacing melhorado

**Tela All Busy (linha ~1523-1531)**
- Substituir `bg-amber-50 border-amber-200 text-amber-800` por card usando `primaryColor` com opacidade (mesmo padrao do outside hours)
- Adicionar icone `Users` com circulos decorativos animados
- Mesmo padrao visual do outside hours para consistencia

**Tela Waiting normal (linha ~1497-1541)**
- Substituir `MessageSquare` + ripple por 3 circulos concentricos animados com `primaryColor` (pulse moderno com delays escalonados)
- Barra de progresso com gradiente usando `primaryColor`
- Texto de "Aguardando" com animacao de ellipsis CSS

**Tela Closed (linha ~1788-1798)**
- Circulo de sucesso maior (h-16 w-16) com gradiente suave
- Animacao de confetti CSS sutil (4 particulas com keyframes)
- Tipografia melhorada no texto de agradecimento

**Tela CSAT (linha ~1712-1749)**
- SEM alteracao de textos/labels ("Avalie o atendimento", "Comentario (opcional)", "Enviar Avaliacao" mantidos)
- Estrelas maiores (h-9 w-9) com hover glow sutil usando box-shadow
- Emoji reativo maior com animacao de escala mais expressiva

**Tela CSAT Thank You (linha ~1752-1772)**
- Circulo maior com gradiente, confetti sutil
- Melhor espacamento e tipografia

### 2. `src/components/chat/WidgetPreview.tsx`

Espelhar o novo design em cada tab do preview:

**Tab outside_hours (linha ~270-287)**
- Adicionar circulos decorativos animados ao redor do icone Clock
- Card com borda usando `primaryColor` com opacidade em vez de cor neutra

**Tab all_busy (linha ~290-306)**
- Mesmo padrao do outside_hours para consistencia

**Tab waiting (linha ~310-315)**
- Substituir `Loader2 animate-spin` por 3 circulos concentricos animados (versao miniatura do widget real)
- Adicionar barra de progresso miniatura

**Tab csat (linha ~373-402)**
- Estrelas maiores com hover glow
- Adicionar emoji reativo acima das estrelas
- Manter textos: "Avalie o atendimento", "Comentario (opcional)", "Pular", "Enviar"

**Tab closed (linha ~406-419)**
- Circulo maior com gradiente
- Confetti CSS miniatura
- Melhor tipografia

**Tab chat (linha ~318-369)**
- Ajustar typing indicator para usar `animate-wave-dot` (consistente com widget real)

### 3. `src/index.css`

Adicionar keyframes:
- `confetti-fall`: 4 particulas com rotacao e queda (CSS puro, sem lib)
- `ellipsis`: animacao de "..." para texto de waiting
- `pulse-ring`: circulos concentricos que expandem e desaparecem

## Regras

- Nenhum texto/label do CSAT sera alterado
- Nenhuma mudanca de logica, estado ou fluxo
- Apenas visual/CSS
- `primaryColor` usado em vez de cores hardcoded (blue/amber)

## Arquivos Modificados

| Arquivo | Tipo de Alteracao |
|---------|-------------------|
| `src/pages/ChatWidget.tsx` | Redesign visual: waiting, outside_hours, all_busy, csat (visual only), closed |
| `src/components/chat/WidgetPreview.tsx` | Espelhar novo design em todas as tabs |
| `src/index.css` | Adicionar keyframes: confetti-fall, ellipsis, pulse-ring |

