

# Fase 3: Consolidacao de Canais do Widget (mantendo Typing Indicator)

## Resumo

Consolida 3 canais `pg_changes` do Widget em 1 unico canal. Typing indicator mantido intacto. Total: 4 canais por visitante reduzidos para 2 (1 pg_changes + 1 broadcast).

## Situacao Atual

```text
Canal                              Tipo           Custo WAL
─────────────────────────────────────────────────────────────
widget-messages-{roomId}           pg_changes     Alto (INSERT+UPDATE)
widget-room-{roomId}               pg_changes     Alto (UPDATE)
widget-visitor-{visitorId}         pg_changes     Alto (INSERT+UPDATE)
typing-{roomId}                    broadcast      Zero
```

4 canais por visitante. 3 geram WAL polling. Com 100 visitantes = 300 conexoes WAL.

## Plano

### Fix 3.1 — Unificar 3 canais pg_changes em 1

**Arquivo**: `src/pages/ChatWidget.tsx`

Substituir os 3 useEffects (linhas 441-666) por 1 unico useEffect com canal consolidado `widget-realtime-{visitorId}-{suffix}`:

```text
Canal unico: widget-realtime-{visitorId}-{suffix}
  ├─ pg_changes INSERT chat_messages  (filter: room_id=eq.{roomId})
  ├─ pg_changes UPDATE chat_messages  (filter: room_id=eq.{roomId})
  ├─ pg_changes UPDATE chat_rooms     (filter: id=eq.{roomId})
  ├─ pg_changes INSERT chat_rooms     (filter: visitor_id=eq.{visitorId})
  └─ pg_changes UPDATE chat_rooms     (filter: visitor_id=eq.{visitorId})
```

- Quando `roomId` ou `visitorId` mudam, canal e destruido e recriado (mesmo padrao atual)
- Toda a logica interna dos handlers permanece identica
- Se `roomId` for null, apenas os listeners de `chat_rooms` por `visitorId` sao registrados

### Fix 3.2 — Manter canal de typing separado

O canal `typing-{roomId}` (linhas 496-513) permanece **inalterado**:
- Broadcast puro, zero custo WAL
- Ciclo de vida diferente (so existe com roomId ativo)
- Nenhuma mudanca necessaria

## Resultado

```text
                              ANTES    DEPOIS
─────────────────────────────────────────────
Canais pg_changes / visitante    3        1
Canais broadcast / visitante     1        1
Total canais / visitante         4        2
───────────────────────────────────────────
100 visitantes simultaneos:
  Canais pg_changes            300      100
  Canais broadcast             100      100
  Total                        400      200
```

Economia: **~200 conexoes WAL** por 100 visitantes. ~6.000 req/hora a menos.

## Riscos

| Risco | Prob. | Mitigacao |
|-------|-------|-----------|
| Canal consolidado falha ao recriar quando roomId muda | Baixa | Cleanup no return do useEffect, padrao existente |
| Multiplos .on() perdem eventos | Nenhuma | Supabase suporta nativamente |
| Typing para de funcionar | Nenhuma | Canal mantido separado, sem alteracao |

## Arquivo Modificado

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/ChatWidget.tsx` | Consolidar 3 useEffects de pg_changes (linhas 441-666) em 1 unico useEffect com canal unificado |

Nenhuma mudanca de banco, edge function ou schema. Typing mantido.

