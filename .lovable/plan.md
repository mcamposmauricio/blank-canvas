

# Correcao: Scroll na tabela de empresas do Statistics do Banner

## Problema

A `ScrollArea` na linha 1605 usa `max-h-[300px]` mas sem altura fixa definida, o Radix ScrollArea nao ativa a rolagem corretamente. A tabela cresce sem limites visuais.

## Correcao

**Arquivo: `src/pages/AdminBanners.tsx`**

Linha 1605: Trocar `<ScrollArea className="max-h-[300px]">` por `<ScrollArea className="h-[300px]">` para forcar a altura fixa e ativar o scroll interno do Radix.

Mudanca de 1 linha, zero risco.

