## Redesign Landing Page Journey CS (sem NPS, isolado da área logada)

Reescrita completa da rota `/` (landing pública) sem tocar em nada da área logada, do produto ou do schema.

### Garantia de isolamento — o que NÃO será tocado

Tudo abaixo continua intacto:

- **Rotas e páginas do produto**: `/dashboard`, `/workspace`, `/csat`, `/nps`, `/help/*`, `/cs/*`, `/backoffice`, `/settings`, `/auth`, `/portal`, `/chat`, `/journey`, etc.
- **Contextos globais**: `AuthContext`, `LanguageContext`, `SidebarDataContext`, `TenantRealtimeContext` — sem alterações.
- **Hooks**: `useAuth`, `useChatRealtime`, `useDashboardStats`, `useCSATReport`, `useChatHistory`, `useAttendants` — sem alterações.
- **Componentes do produto**: `src/components/chat/*`, `src/components/cs/*`, `src/components/help/*`, `src/components/portal/*`, `src/components/backoffice/*`, `AppSidebar`, `SidebarLayout`, `PermissionGuard`, todos os `*Tab.tsx`, `NPSForm`, `CompanyForm`, etc.
- **Edge functions**: nenhuma será criada, alterada ou redeployada.
- **Schema Supabase**: nenhuma migration. Tabela `leads` continua igual; só será lida/escrita pelo form da landing como já é hoje.
- **RLS, policies, triggers**: nada muda.
- **Realtime, broadcasts, pg_cron**: nada muda.
- **`src/locales/pt-BR.ts` e `src/locales/en.ts`**: ficam como estão (usados pelo produto). A remoção de i18n é **apenas dentro dos componentes da landing**, que hoje têm um objeto `texts` local — não usam `useLanguage`.
- **Permissões, roles, tenant isolation**: nada muda.

### Escopo restrito (apenas estes arquivos)

**Editar:**
- `src/pages/LandingPage.tsx`
- `src/components/landing/LandingNavbar.tsx`
- `src/components/landing/LandingHero.tsx`
- `src/components/landing/LeadForm.tsx` *(adicionar prop `mode` opcional, default = comportamento atual; nenhuma chamada existente quebra)*
- `src/components/landing/LandingProductSections.tsx` *(remover bloco NPS, reordenar)*
- `src/components/landing/LandingFAQ.tsx`
- `src/components/landing/LandingCTA.tsx`
- `src/components/landing/LandingFooter.tsx`

**Criar:**
- `src/components/landing/HeroChatMockup.tsx`
- `src/components/landing/LandingQuickContext.tsx`
- `src/components/landing/QueueRulesMockup.tsx`
- `src/components/landing/BannerScheduleMockup.tsx`
- `src/components/landing/LandingComparison.tsx`
- `src/components/landing/LandingEfficiency.tsx`
- `src/components/landing/LandingPricing.tsx`
- `src/components/landing/SectionFadeIn.tsx`

**Deletar (órfão, não referenciado em lugar nenhum — confirmado via busca):**
- `src/components/landing/LandingSocialProof.tsx` *(se tiver qualquer import fora de `src/components/landing/` e `LandingPage.tsx`, mantenho o arquivo)*

**Verificação final antes de deletar**: rodar `rg "LandingSocialProof"` para confirmar que só é referenciado dentro do diretório landing/LandingPage.

### Verificações de segurança que farei na implementação

1. **`LeadForm`**: a prop `mode` será opcional com default `"full"`. O hero/CTA atuais que já chamam o form continuam funcionando se eu não passar nada. Schema Zod do modo full permanece idêntico.
2. **Tabela `leads`**: continuo usando o mesmo `insert` com as mesmas colunas. No modo `emailOnly`, envio `name=""` e `phone=""` (string vazia, como já é tolerado hoje) para não bater em `NOT NULL` caso exista.
3. **Fonte Inter**: se faltar no `index.html`, adiciono o `<link>` Google Fonts. Isso afeta apenas o `<head>` global, mas a fonte só é aplicada onde a landing aplica explicitamente via `style={{ fontFamily }}` — o resto do app continua usando o que já usa (não há regra global em `index.css` sendo trocada).
4. **Rotas**: `LandingPage` continua montada apenas em `/` (pública). Nenhuma rota nova é criada, nenhuma rota existente é alterada.
5. **Sem novas dependências** no `package.json`.
6. **Sem mudança em `tailwind.config.ts`**, `vite.config.ts`, `src/index.css` ou `src/App.tsx`.
7. **Sem mexer em `JourneyPage.tsx`** mesmo que use componentes parecidos.

### Mudanças funcionais (resumo da landing)

#### Ordem das seções
```text
LandingNavbar
LandingHero              (form email-only + HeroChatMockup grande)
LandingQuickContext      (4 fatos)
LandingProductSections   (Chat → Fila inteligente → Help Center → CSAT → Banners agendados)
LandingEfficiency        (3 colunas: distribui sozinho, antecipa com banner, contexto na hora)
LandingComparison        (4 cards anti-Intercom)
LandingPricing           (3 cards, Growth com badge "Promo de lançamento")
LandingFAQ               (8 perguntas, tom direto)
LandingCTA               (form email-only)
LandingFooter            (links limpos)
```

#### Destaques de copy
- **NPS removido** da landing. O módulo continua existindo no produto, mencionado de leve apenas no card Growth ("…inclui NPS no produto").
- **Hero H1**: "A plataforma de atendimento que startups brasileiras estavam esperando."
- **Sub**: "Chat em tempo real, fila inteligente, banners proativos, base de conhecimento e CSAT — tudo no mesmo lugar."
- **Bloco Fila inteligente**: Round Robin, Least Busy, regras por categoria/time, capacidade por agente, horário comercial e breaks, fallback fora do expediente.
- **Bloco Banners agendados**: agendamento por data/hora, segmentação por plano/MRR/tag, banners no widget e portal, métricas de view/clique.
- **Pricing comercial**: Growth com `~~R$ 129~~ R$ 79/mês por agente`, badge **"Promo de lançamento · -38%"**, microcopy "Economize R$ 600/agente/ano".

#### Detalhes visuais
- Tema escuro mantido. Backgrounds alternados `#0F1115` / `#0D0F13` / `#131722`.
- Laranja `#FF7A59` para Chat/Fila/marca, `#3498DB` para Banners, `#F59E0B` para CSAT, `#2ECC71` para Help.
- Fonte Inter, espaçamento `py-24` mobile / `py-28` lg.
- `SectionFadeIn` via IntersectionObserver nativo (sem libs).

### Fora do escopo (intocado)
- Qualquer página, hook, contexto, componente ou função fora de `src/pages/LandingPage.tsx` e `src/components/landing/`.
- Schema, RLS, edge functions, cron, realtime.
- `LanguageContext` e arquivos `src/locales/*`.
- `JourneyPage.tsx` (rota `/journey`).
- Páginas de Política/Termos.
