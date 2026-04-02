

# Plano Revisado: Scroll na Tabela + Exclusao de Testes no Banco

## 1. Scroll na tabela de empresas do Statistics

**Arquivo: `src/pages/AdminBanners.tsx`**

Substituir o `ScrollArea` (linha 1605) por `div` com `overflow-y-auto max-h-[350px]` e adicionar `sticky top-0 bg-background z-10` no `TableHeader` para manter cabecalho fixo durante scroll.

## 2. Excluir registros de teste diretamente no banco

**Arquivo: `src/pages/AdminBanners.tsx`** (funcao `openMetricsDialog`, linhas 620-637)

Ao buscar os assignments, fazer query adicional para identificar `contact_id`s com chats fechados nos ultimos 30 minutos:

```
chat_rooms WHERE status='closed' AND closed_at >= now()-30min
```

Cruzar os `visitor_id` dessas salas com `chat_visitors.company_contact_id` para obter os `contact_id`s de teste. Filtrar esses IDs do array `enriched` antes de setar no state.

Nenhum elemento de UI novo (sem toggle, sem checkbox). Os registros de teste simplesmente nao aparecem nas metricas.

## Arquivos Modificados

| Arquivo | Mudanca |
|---|---|
| `src/pages/AdminBanners.tsx` | Scroll com header sticky na tabela + filtro silencioso de contact_ids com chats fechados recentemente |

