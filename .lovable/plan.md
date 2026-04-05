

# Plano: Botao Deletar CSAT no Relatorio

## Resumo

Adicionar botao de lixeira na coluna de acoes da tabela de resultados do relatorio CSAT (`AdminCSATReport.tsx`), visivel apenas para admin/master. Ao clicar, confirma e nullifica `csat_score` + `csat_comment` no `chat_rooms`, removendo o registro de todos os calculos.

## Mudancas em `src/pages/AdminCSATReport.tsx`

1. **Imports**: Adicionar `Trash2` do lucide, `useAuth` do contexto, `toast` do sonner
2. **Estado**: Adicionar `deletingId: string | null` para loading state
3. **Funcao `handleDeleteCsat(roomId)`**:
   - `window.confirm("Tem certeza que deseja excluir esta avaliacao CSAT?")`
   - `supabase.from("chat_rooms").update({ csat_score: null, csat_comment: null }).eq("id", roomId)`
   - Toast de sucesso/erro
   - Chama `refetch()` do hook (ja retornado por `useCSATReport`)
4. **Coluna de acoes (linha ~354)**: Ao lado do botao "Ver chat", adicionar botao com `Trash2`, cor vermelha no hover, visivel apenas se `isAdmin || isMaster`
5. **Hook `useCSATReport`**: Expor `refetch` (ja expoe como `refetch: fetchData`)

## Nenhum outro arquivo modificado

- Nenhuma migration — `csat_score` ja e nullable
- Nenhuma mudanca no hook — ja filtra `.not("csat_score", "is", null)`
- RLS existente permite UPDATE para membros do tenant

