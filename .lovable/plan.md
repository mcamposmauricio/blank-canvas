

# Plano: Corrigir historico de chats antigos no widget

## Problema

Dois problemas combinados impedem a visualizacao do historico:

### 1. Widget nao mostra historico para visitantes que retornam via token salvo

No `ChatWidget.tsx` (linhas 353-380), quando um visitante retorna com `visitor_token` salvo no localStorage e nao tem room ativo, o codigo nao faz nada — o `phase` permanece em `"form"`. O visitante ve o formulario de novo em vez do historico.

Comparacao: quando o visitante vem via `paramVisitorToken` + `isResolvedVisitor` (linhas 310-324), o codigo corretamente faz `setPhase("history")`. Mas o branch do `savedToken` (linha 344) nao tem essa logica.

**Correcao em `src/pages/ChatWidget.tsx` (linhas 353-380):**

Apos encontrar o visitor pelo token salvo e verificar que nao ha room ativo, checar se existem rooms fechados. Se sim, ir para `phase = "history"`. Se nao, ficar em `"form"`.

```
if (visitor) {
  setVisitorId(visitor.id);
  // Check active rooms
  const { data: room } = await supabase...
  if (room) {
    // existing logic for active/waiting
  } else {
    // NEW: check for any closed rooms (history)
    const { count } = await supabase
      .from("chat_rooms")
      .select("id", { count: "exact", head: true })
      .eq("visitor_id", visitor.id);
    if ((count || 0) > 0) {
      setPhase("history");
    }
  }
}
```

### 2. Visitantes duplicados da migracao

A migracao criou novos visitors com novos `visitor_token`s. Se um visitante ja tinha um token no localStorage (de antes da migracao), ele encontra o visitor antigo (pre-migracao, sem rooms). Os rooms importados estao vinculados ao visitor importado (diferente).

**Correcao no `resolve-chat-visitor/index.ts` (funcao `findOrCreateVisitor`):**

Quando encontra um visitor por `company_contact_id` (linha 432-436), usar `.limit(1)` e ordenar por rooms existentes. Mas a solucao mais robusta e um script de consolidacao:

**Script de consolidacao de visitors duplicados (execucao direta no banco):**

Para cada `company_contact_id` com mais de 1 visitor:
1. Escolher o visitor que tem mais rooms como "primario"
2. UPDATE todos os `chat_rooms` dos visitors secundarios para apontar ao primario
3. DELETE os visitors secundarios

Isso garante que todo o historico fica sob um unico visitor.

## Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/pages/ChatWidget.tsx` | Adicionar `setPhase("history")` no branch do savedToken quando ha rooms fechados |
| Script SQL (execucao direta) | Consolidar visitors duplicados por `company_contact_id` |

