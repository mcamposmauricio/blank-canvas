

# Painel Master Backoffice — Garantia de Zero Impacto nos Tenants

## Analise de Risco

Revisei os arquivos criticos: `App.tsx`, `Auth.tsx`, `SidebarLayout.tsx`, `AuthContext.tsx`. Abaixo esta a analise de cada ponto de risco e a estrategia para elimina-lo.

### 1. Redirect no Login (Auth.tsx linha 39)

**Risco**: Alterar o redirect pos-login pode afetar todos os usuarios.

**Estrategia segura**: O redirect so muda para master. A logica sera:
```
if (authUser && !inviteToken) {
  // Check isMaster from context — if not loaded yet, default to current behavior
  navigate("/nps/dashboard", { replace: true });
}
```
O redirect para `/backoffice` sera feito **dentro do SidebarLayout** apos os dados de role ja estarem carregados, nao no Auth.tsx. Assim o Auth.tsx NAO MUDA — zero risco para tenants.

### 2. SidebarLayout.tsx (linhas 36-43)

**Risco**: Adicionar logica de redirect para master pode quebrar o fluxo de tenants.

**Estrategia segura**: A verificacao sera estritamente `if (isMaster && !isImpersonating && !location.pathname.startsWith('/backoffice'))`. Usuarios de tenant nunca terao `isMaster = true` (vem da tabela `user_roles` com role `master`), entao essa condicao nunca sera verdadeira para eles.

### 3. Rotas no App.tsx

**Risco**: Adicionar rotas pode conflitar com rotas existentes.

**Estrategia segura**: As novas rotas ficam DENTRO do mesmo `<Route element={<SidebarLayout />}>` existente, usando o prefixo `/backoffice/*` que nao colide com nenhuma rota existente. O `Guarded` com `requireMaster` ja existe e ja e usado na rota atual `/backoffice`. Nenhuma rota existente sera movida ou alterada.

### 4. AppSidebar.tsx

**Risco**: Remover a secao backoffice do sidebar pode afetar a navegacao.

**Estrategia segura**: NAO remover nada do AppSidebar. O master continuara vendo o item "Backoffice" no sidebar como hoje. A diferenca e que ao clicar, ele vai para o `/backoffice` que tera o layout expandido. Tenants nunca veem esse item (ja esta protegido por `isMaster`).

### 5. Migration para `tenant_modules`

**Risco**: Nova tabela com RLS pode causar erros.

**Estrategia segura**: A tabela e completamente nova e isolada. Nenhuma tabela existente sera alterada. O `AppSidebar` so consultara `tenant_modules` se a tabela existir e tiver dados — caso contrario, todos os modulos continuam visiveis (fallback permissivo). Isso significa que ate o master configurar modulos para um tenant, nada muda.

### 6. Realtime/Performance

**Risco**: Novos componentes do backoffice podem gerar carga adicional.

**Estrategia segura**: Todos os dados do backoffice serao carregados sob demanda (clique em tab) com `staleTime` alto. O unico canal realtime novo sera para a Timeline, e so existira enquanto o master estiver na aba de Timeline. Tenants nao carregam nenhum desses componentes.

## Resumo de Arquivos

| Arquivo | Tipo de Mudanca | Impacto em Tenants |
|---|---|---|
| `Auth.tsx` | **SEM MUDANCA** | Zero |
| `SidebarLayout.tsx` | Adicionar 3 linhas de redirect condicional (isMaster only) | Zero — condicao nunca verdadeira para tenants |
| `App.tsx` | Adicionar sub-rotas `/backoffice/*` | Zero — rotas novas, protegidas por requireMaster |
| `AppSidebar.tsx` | **SEM MUDANCA** | Zero |
| Novos componentes master/* | Arquivos novos | Zero — nunca importados por paginas de tenant |
| Migration tenant_modules | Tabela nova, sem ALTER em tabelas existentes | Zero — fallback permissivo |

## Principio de Seguranca

Toda logica nova esta protegida por `isMaster === true`, que e derivado de `user_roles.role = 'master'`. Apenas o usuario `mcampos.mauricio@gmail.com` tem esse role. Nenhum codigo de tenant carrega, importa ou executa componentes do backoffice master.

