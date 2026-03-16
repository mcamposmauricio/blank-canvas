

# Plano: Bypass de Confirmação de Email nos Invites

## Problema
Usuários convidados (teste2, teste6) têm contas auth criadas mas com `email_confirmed_at = NULL`. Ao tentar logar após aceitar o convite, recebem erro **"Email not confirmed"** (400). O `signUp` do Supabase envia email de confirmação que nunca é aberto (emails de teste).

## Solução

### 1. Edge Function `backoffice-admin` — accept-invite com criação de user via Admin API

Modificar a action `accept-invite` para:
- Receber `password` do frontend
- Verificar se o auth user já existe via `adminClient.auth.admin.listUsers()`
- Se **não existe**: criar via `adminClient.auth.admin.createUser({ email, password, email_confirm: true })` — isso cria o user **já confirmado**, sem enviar email
- Se **existe mas não confirmado**: confirmar via `adminClient.auth.admin.updateUserById(userId, { email_confirm: true })`
- Remover a necessidade do frontend fazer `signUp`/`signIn` antes de chamar accept-invite

### 2. Frontend `Auth.tsx` — simplificar handleAcceptInvite

- Enviar `password` no body do `accept-invite`
- Remover as chamadas `signInWithPassword` e `signUp` do frontend
- Após sucesso do accept-invite, fazer apenas `signInWithPassword` para logar automaticamente

### 3. Retroativo — confirmar users existentes

Na mesma edge function, durante o accept-invite, qualquer user não confirmado será confirmado via `admin.updateUserById`. Adicionalmente, criar uma action `confirm-all-pending` (master only) para confirmar todos os auth users com invites aceitos que estão sem confirmação.

**Alternativa mais simples para retroativo**: executar uma query via a edge function para confirmar os 2 users existentes (teste2, teste6).

## Arquivos a Modificar

1. **`supabase/functions/backoffice-admin/index.ts`** — accept-invite recebe password, cria/confirma user via Admin API
2. **`src/pages/Auth.tsx`** — handleAcceptInvite envia password para edge function, faz login após sucesso

## Fluxo Simplificado
```text
Link invite → Preenche nome + senha → Chama accept-invite (edge function)
  → Edge function cria auth user confirmado (admin API)
  → Edge function aceita invite (profile + role + csm)  
  → Frontend faz signInWithPassword → Logado automaticamente
```

