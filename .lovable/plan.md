

# Plano: Corrigir Build Error + Regenerar Link de Convite

## Parte 1 — Fix build error em AutoMessagesTab.tsx

O erro ocorre porque `Record<string, any>` nao e aceito pelo tipo estrito do Supabase. Solucao: tipar o objeto `updates` explicitamente com os campos da tabela.

**Arquivo**: `src/components/chat/AutoMessagesTab.tsx`
- Linhas 143 e 163: trocar `Record<string, any>` por um tipo inline com os campos opcionais da tabela:
```ts
const updates: { message_content?: string; trigger_minutes?: number; close_resolution_status?: string } = {};
```

## Parte 2 — Regenerar link de convite no TeamSettingsTab

O convite do Gustavo esta com status "pending" mas o token UUID provavelmente nao tem expiracao no banco (nao existe coluna `expires_at`). O problema e que o link aparece como "expirado" na UI do Auth.tsx porque a query nao encontra o registro — possivelmente o `invite_status` ja foi alterado ou o token nao bate.

**Solucao**: adicionar botao "Regenerar link" ao lado do botao de copiar, visivel para convites pendentes.

**Arquivo**: `src/components/TeamSettingsTab.tsx`

1. Adicionar funcao `handleRegenerateInvite(profileId)`:
   - Gera novo UUID via `crypto.randomUUID()`
   - Faz `UPDATE user_profiles SET invite_token = newToken, invite_status = 'pending' WHERE id = profileId`
   - Copia novo link para clipboard
   - Recarrega dados

2. Na area de botoes (linha ~329), ao lado do botao Copy, adicionar botao com icone `RefreshCw` que chama `handleRegenerateInvite`

3. Adicionar traducoes:
   - `team.regenerateLink` / `team.linkRegenerated` em pt-BR e en

**Nenhuma migration necessaria** — o campo `invite_token` ja aceita qualquer texto e a atualizacao e feita via RLS existente (tenant members podem atualizar).

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/chat/AutoMessagesTab.tsx` | Tipar `updates` para fix build |
| `src/components/TeamSettingsTab.tsx` | Botao regenerar link + handler |
| `src/locales/pt-BR.ts` | Traducoes regenerate |
| `src/locales/en.ts` | Traducoes regenerate |

