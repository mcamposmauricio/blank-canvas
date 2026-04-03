

# Plano: Reverter Labels CSAT + Forcar Tenant Modules sobre Permissoes

## Duas tarefas

### 1. Reverter textos/labels do CSAT

O CSAT no `ChatWidget.tsx` e no `WidgetPreview.tsx` nao teve labels alterados nas ultimas mudancas -- os textos atuais sao os originais ("Avalie o atendimento", "Comentario (opcional)", "Enviar Avaliacao", etc.). Nao ha alteracao de texto a reverter neste momento. Confirmo que os labels serao mantidos exatamente como estao, sem nenhuma modificacao de texto no CSAT em ambas as implementacoes.

Se houve uma alteracao anterior que nao esta refletida no codigo atual, por favor indique qual texto precisa ser revertido.

### 2. Tenant Modules deve sobrepor permissoes de usuario

**Problema**: O modulo CS (Customer Success) aparece na sidebar da Marq HR mesmo apos ter sido desabilitado via backoffice master (tabela `tenant_modules`). Isso ocorre porque o `AppSidebar.tsx` verifica apenas `hasPermission("cs", "view")` mas **nunca consulta `tenant_modules`** para verificar se o modulo esta ativo para o tenant.

O mesmo problema potencialmente afeta os modulos: `chat`, `nps`, `help`, `contacts`.

**Solucao**: Carregar os modulos habilitados do tenant no `AuthContext` e expor uma funcao `isModuleEnabled(module)`. O `AppSidebar` e o `PermissionGuard` usarao essa verificacao antes de qualquer checagem de permissao de usuario.

#### Mudancas por arquivo

**`src/contexts/AuthContext.tsx`**
- Adicionar state `disabledModules: Set<string>` 
- No `loadUserData`, apos obter o `tenantId`, buscar `tenant_modules` onde `is_enabled = false`
- Expor funcao `isModuleEnabled(module: string): boolean` no contexto
  - Retorna `true` se nao houver registro (permissivo por padrao)
  - Retorna `false` se modulo estiver explicitamente desabilitado
- Para master nao-impersonando, retorna sempre `true`

**`src/components/AppSidebar.tsx`**
- Importar `isModuleEnabled` do `useAuth`
- Adicionar verificacao de modulo em cada secao:
  - Chat: `showChat && isModuleEnabled('chat')`
  - NPS: `showNPS && isModuleEnabled('nps')`
  - CS: `isModuleEnabled('cs') && (hasPermission(...))`
  - Help: `showHelp && isModuleEnabled('help')`
  - Contacts: `showContacts && isModuleEnabled('contacts')`

**`src/components/PermissionGuard.tsx`**
- Importar `isModuleEnabled` do `useAuth`
- Antes da checagem de permissao, extrair o modulo raiz (ex: `cs.dashboard` -> `cs`)
- Se `!isModuleEnabled(rootModule)`, retornar `AccessDenied`
- Isso garante que mesmo acessando a URL diretamente, o modulo bloqueado nao sera renderizado

#### Logica de `isModuleEnabled`

```text
isModuleEnabled("cs"):
  1. Se master e nao impersonando → true
  2. Se disabledModules contem "cs" → false
  3. Caso contrario → true (permissivo por padrao)
```

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/contexts/AuthContext.tsx` | Carregar `tenant_modules` desabilitados, expor `isModuleEnabled` |
| `src/components/AppSidebar.tsx` | Adicionar `isModuleEnabled` como filtro antes de `hasPermission` |
| `src/components/PermissionGuard.tsx` | Bloquear acesso a modulos desabilitados no tenant |

Nenhuma mudanca de banco, edge function ou schema.

