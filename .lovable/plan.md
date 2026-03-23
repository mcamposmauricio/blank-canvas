

# Plano: Widget Shell Instantaneo + Loading States

## Problema

Quando o usuario clica no FAB, o iframe e criado e carrega o React bundle + queries antes de renderizar qualquer coisa. O usuario ve uma janela vazia por 1-3 segundos ate o layout aparecer.

## Solucao

### 1. Skeleton shell inline no iframe (nps-chat-embed.js)

Ao criar o iframe em `createChatWidget()`, injetar via `srcdoc` um HTML minimo com o layout do widget (header colorido + body skeleton) que aparece **instantaneamente**, antes do React carregar. O iframe so troca para o `src` real apos o skeleton ser exibido.

**Alternativa mais simples:** Usar o proprio iframe com `src` mas adicionar um overlay skeleton no DOM do host page (fora do iframe) que cobre a area do widget e some quando o iframe envia `postMessage({ type: "chat-toggle" })`.

**Abordagem escolhida:** Overlay no host page — mais simples, sem mexer no React.

No `nps-chat-embed.js`, apos criar o iframe:
- Criar um `div` overlay posicionado identico ao iframe (fixed, mesmo bottom/right, 420px width, mesma height)
- Esse div contem: header com gradiente `primaryColor`, skeleton de linhas simulando form/history
- Quando o iframe envia `chat-toggle` com `isOpen: true`, remover o overlay (React ja renderizou)

### 2. Loading states dentro do ChatWidget.tsx

Adicionar skeleton placeholders nos momentos de carregamento interno:
- **History phase:** ja tem `Loader2` spinner — trocar por skeleton cards (3 cards placeholder)
- **Init loading:** enquanto o `useEffect` init roda (busca settings, visitor, room), mostrar skeleton do body em vez de conteudo vazio

## Arquivos

| Arquivo | Mudanca |
|---|---|
| `public/nps-chat-embed.js` | Criar overlay skeleton no host page durante carregamento do iframe |
| `src/pages/ChatWidget.tsx` | Skeleton placeholders para history loading e init loading |

## Detalhes tecnicos

**Overlay skeleton (embed.js):**
```text
+---------------------------+
| ████ Header (primaryColor)|
|                           |
| ░░░░░░░░░░░░░░ skeleton   |
| ░░░░░░░░ skeleton          |
| ░░░░░░░░░░░░ skeleton      |
|                           |
| ░░░░░░░░░░░░░░░ button    |
+---------------------------+
```

O overlay e removido assim que o iframe posta a primeira mensagem `chat-toggle`.

**History skeleton (ChatWidget.tsx):**
Trocar o `<Loader2>` spinner por 3 cards skeleton com animacao pulse, mantendo o layout visual consistente.

**Init skeleton:**
Adicionar estado `initLoading` que e `true` ate o `useEffect` init terminar. Enquanto `true`, renderizar skeleton do body (header real + body skeleton).

