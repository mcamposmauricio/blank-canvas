import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingHero from "@/components/landing/LandingHero";
import LandingProductSections from "@/components/landing/LandingProductSections";
import LandingSocialProof from "@/components/landing/LandingSocialProof";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingCTA from "@/components/landing/LandingCTA";
import LandingFooter from "@/components/landing/LandingFooter";

type Lang = "en" | "pt-BR";

const initLang = (): Lang => {
  const saved = localStorage.getItem("landing_lang");
  if (saved === "en" || saved === "pt-BR") return saved;
  return navigator.language.startsWith("pt") ? "pt-BR" : "en";
};

const texts = {
  en: {
    // Navbar
    navChat: "Chat",
    navCSAT: "CSAT",
    navNPS: "NPS",
    navHelpCenter: "Help Center",
    navSignIn: "Sign In",
    navDashboard: "Dashboard",
    navCta: "Get Started",
    langToggle: "PT",
    // Hero
    heroBadge: "Support · NPS · Help Center",
    heroH1: "Support, NPS & Help Center in one place",
    heroSub: "Everything your CS team needs to retain customers and scale support.",
    heroSubCta: "No credit card · Setup in minutes",
    heroBadgeChat: "Chat",
    heroBadgeCSAT: "CSAT",
    heroBadgeNPS: "NPS",
    heroBadgeHelp: "Help Center",
    // Form
    fieldName: "Your Name *",
    fieldEmail: "Work Email *",
    fieldPhone: "Phone *",
    formCta: "Get Started",
    successTitle: "You're on the list!",
    successSub: "We'll reach out soon to get you started.",
    // Product sections
    chatPain: "Your team responds without knowing who the customer is?",
    chatTitle: "Chat with context that retains",
    chatSub: "Plan, MRR, health score and history — everything right next to the conversation.",
    chatFeatures: [
      "Automatic assignment (Round Robin / Least Busy)",
      "Install with 1 line of code",
      "Customizable form fields",
      "Customer context alongside every conversation",
      "Complete conversation history",
      "Help Center article search inside chat",
    ],
    csatPain: "You don't know how customers feel after each chat?",
    csatTitle: "Post-chat CSAT that drives improvement",
    csatSub: "Automatic satisfaction surveys after every conversation with detailed analytics per agent.",
    csatFeatures: [
      "Automatic post-chat satisfaction survey",
      "1-5 star rating with optional comment",
      "Filters by agent, team, company, and date",
      "Dashboard with score trends over time",
      "Low-score alerts with conversation transcript",
      "Export reports for team reviews",
    ],
    npsPain: "You only discover dissatisfaction when the customer cancels?",
    npsTitle: "Automated NPS with risk alerts",
    npsSub: "Automatic campaigns that surface detractors with revenue impact.",
    npsFeatures: [
      "Automatic & manual campaigns",
      "NPS via email and in-app embed",
      "Segmentation by company, plan, health",
      "Dashboard with highlighted detractors",
      "Automatic reminders",
    ],
    helpPain: "Repetitive tickets consuming your team?",
    helpTitle: "Knowledge base that resolves before the ticket",
    helpSub: "Customizable portal integrated into chat that deflects tickets automatically.",
    helpFeatures: [
      "Customizable public portal (colors, logo, domain)",
      "Rich editor with live preview",
      "Organized collections with icons",
      "Integrated search inside chat widget",
      "\"Was this helpful?\" feedback with metrics",
      "Bulk article import",
    ],
    // Social proof
    socialTitle: "Measurable impact for your CS team",
    socialSub: "Average results from teams using Journey",
    socialMetrics: [
      { value: "-40%", label: "Response Time" },
      { value: "NPS 72", label: "Average Score" },
      { value: "85%", label: "Articles Helpful" },
      { value: "-25%", label: "Ticket Volume" },
    ],
    // FAQ
    faqTitle: "Frequently Asked Questions",
    faqItems: [
      { q: "How long does it take to install?", a: "The chat widget can be installed with a single line of JavaScript. Full setup including NPS and Help Center typically takes under 30 minutes." },
      { q: "Do I need a credit card?", a: "No. Getting started is free and doesn't require payment information." },
      { q: "Does it work with my CRM?", a: "Journey has a built-in CRM with timeline and kanban. We also support integrations via API and webhooks." },
      { q: "How is the data protected?", a: "All data is encrypted at rest and in transit. We are LGPD compliant and follow industry-standard security practices." },
      { q: "Can I customize the chat widget?", a: "Yes — colors, position, form fields, business hours, welcome messages, and more are fully configurable." },
      { q: "How does automatic assignment work?", a: "You can configure Round Robin, Least Busy, or manual assignment. Rules can be set per category with team fallbacks." },
      { q: "How is Journey different from Intercom/Zendesk?", a: "Journey is purpose-built for B2B CS teams. It combines chat, NPS, and Help Center with native customer health context — no bolt-ons needed." },
      { q: "Does Journey have an API?", a: "Yes. We offer a REST API and webhooks for integrating with your existing tools and automating workflows." },
    ],
    // CTA
    formLabel: "Get Started",
    formH2: "Start using Journey today",
    formSub: "Built for CS and Revenue teams who want to build predictable growth from customer data.",
    formFootnote: "Get direct access to the founding team and influence the product roadmap.",
    // Footer
    footerTagline: "The CX platform for revenue-driven CS teams.",
    footerRights: "All rights reserved.",
    footerProduct: "Product",
    footerCompany: "Company",
    footerLegal: "Legal",
    footerProductLinks: [
      { label: "Chat", href: "#chat" },
      { label: "CSAT", href: "#csat" },
      { label: "NPS", href: "#nps" },
      { label: "Help Center", href: "#helpcenter" },
      { label: "Complete Platform", href: "/journey" },
    ],
    footerCompanyLinks: [
      { label: "Get Started", href: "#early-access" },
      { label: "Blog", href: "#" },
    ],
    footerLegalLinks: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
    ],
  },
  "pt-BR": {
    // Navbar
    navChat: "Chat",
    navCSAT: "CSAT",
    navNPS: "NPS",
    navHelpCenter: "Help Center",
    navSignIn: "Entrar",
    navDashboard: "Dashboard",
    navCta: "Quero conhecer",
    langToggle: "EN",
    // Hero
    heroBadge: "Atendimento · NPS · Help Center",
    heroH1: "Atendimento, NPS e Help Center em um só lugar",
    heroSub: "Tudo que seu time de CS precisa para reter clientes e escalar suporte.",
    heroSubCta: "Sem cartão de crédito · Setup em minutos",
    heroBadgeChat: "Chat",
    heroBadgeCSAT: "CSAT",
    heroBadgeNPS: "NPS",
    heroBadgeHelp: "Help Center",
    // Form
    fieldName: "Seu nome *",
    fieldEmail: "Email corporativo *",
    fieldPhone: "Telefone *",
    formCta: "Quero conhecer",
    successTitle: "Você está na lista!",
    successSub: "Entraremos em contato em breve.",
    // Product sections
    chatPain: "Seu time responde sem saber quem é o cliente?",
    chatTitle: "Chat com contexto que retém",
    chatSub: "Plano, MRR, health score e histórico — tudo ao lado da conversa.",
    chatFeatures: [
      "Atribuição automática (Round Robin / Least Busy)",
      "Instalação com 1 linha de código",
      "Campos customizáveis no formulário",
      "Contexto do cliente ao lado da conversa",
      "Histórico completo de conversas",
      "Busca de artigos do Help Center no chat",
    ],
    csatPain: "Você não sabe como o cliente se sente após cada chat?",
    csatTitle: "CSAT pós-chat que direciona melhoria",
    csatSub: "Pesquisa de satisfação automática após cada conversa com analytics detalhado por atendente.",
    csatFeatures: [
      "Pesquisa de satisfação automática pós-chat",
      "Avaliação de 1 a 5 estrelas com comentário opcional",
      "Filtros por atendente, time, empresa e data",
      "Dashboard com tendência de notas ao longo do tempo",
      "Alertas de notas baixas com transcrito da conversa",
      "Exportação de relatórios para revisão do time",
    ],
    npsPain: "Você só descobre a insatisfação quando o cliente cancela?",
    npsTitle: "NPS automatizado com alerta de risco",
    npsSub: "Campanhas automáticas que surfaceiam detratores com impacto em receita.",
    npsFeatures: [
      "Campanhas automáticas e manuais",
      "NPS por email e embed in-app",
      "Segmentação por empresa, plano, health",
      "Dashboard com detratores destacados",
      "Lembretes automáticos",
    ],
    helpPain: "Tickets repetitivos que consomem seu time?",
    helpTitle: "Base de conhecimento que resolve antes do ticket",
    helpSub: "Portal customizável integrado ao chat que desvia tickets automaticamente.",
    helpFeatures: [
      "Portal público customizável (cores, logo, domínio)",
      "Editor rico com preview ao vivo",
      "Coleções organizadas com ícones",
      "Busca integrada no chat widget",
      "Feedback \"Foi útil?\" com métricas",
      "Importação em massa de artigos",
    ],
    // Social proof
    socialTitle: "Impacto mensurável para seu time de CS",
    socialSub: "Resultados médios de times que usam o Journey",
    socialMetrics: [
      { value: "-40%", label: "Tempo de resposta" },
      { value: "NPS 72", label: "Score médio" },
      { value: "85%", label: "Artigos úteis" },
      { value: "-25%", label: "Volume de tickets" },
    ],
    // FAQ
    faqTitle: "Perguntas frequentes",
    faqItems: [
      { q: "Quanto tempo leva para instalar?", a: "O widget de chat pode ser instalado com uma única linha de JavaScript. A configuração completa incluindo NPS e Help Center leva menos de 30 minutos." },
      { q: "Preciso de cartão de crédito?", a: "Não. Começar é gratuito e não exige informações de pagamento." },
      { q: "Funciona com meu CRM?", a: "O Journey possui CRM integrado com timeline e kanban. Também suportamos integrações via API e webhooks." },
      { q: "Como os dados são protegidos?", a: "Todos os dados são criptografados em repouso e em trânsito. Somos compatíveis com a LGPD e seguimos as melhores práticas de segurança." },
      { q: "Posso personalizar o widget de chat?", a: "Sim — cores, posição, campos do formulário, horários de atendimento, mensagens de boas-vindas e mais são totalmente configuráveis." },
      { q: "Como funciona a atribuição automática?", a: "Você pode configurar Round Robin, Least Busy ou manual. Regras podem ser definidas por categoria com fallback por time." },
      { q: "Qual a diferença para Intercom/Zendesk?", a: "O Journey é feito para times de CS B2B. Combina chat, NPS e Help Center com contexto nativo de saúde do cliente — sem precisar de add-ons." },
      { q: "O Journey tem API?", a: "Sim. Oferecemos API REST e webhooks para integrar com suas ferramentas e automatizar fluxos de trabalho." },
    ],
    // CTA
    formLabel: "Comece agora",
    formH2: "Comece a usar o Journey hoje",
    formSub: "Feito para times de CS e Receita que querem construir crescimento previsível a partir de dados de clientes.",
    formFootnote: "Tenha acesso direto ao time fundador e influência no roadmap do produto.",
    // Footer
    footerTagline: "A plataforma de CX para times de CS orientados a receita.",
    footerRights: "Todos os direitos reservados.",
    footerProduct: "Produto",
    footerCompany: "Empresa",
    footerLegal: "Legal",
    footerProductLinks: [
      { label: "Chat", href: "#chat" },
      { label: "CSAT", href: "#csat" },
      { label: "NPS", href: "#nps" },
      { label: "Help Center", href: "#helpcenter" },
      { label: "Plataforma completa", href: "/journey" },
    ],
    footerCompanyLinks: [
      { label: "Começar", href: "#early-access" },
      { label: "Blog", href: "#" },
    ],
    footerLegalLinks: [
      { label: "Política de privacidade", href: "#" },
      { label: "Termos de uso", href: "#" },
    ],
  },
};

const LandingPage = () => {
  const [lang, setLang] = useState<Lang>(initLang);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const t = texts[lang];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsLoggedIn(!!session));
  }, []);

  const toggleLang = () => {
    const next: Lang = lang === "en" ? "pt-BR" : "en";
    setLang(next);
    localStorage.setItem("landing_lang", next);
  };

  const scrollToForm = () => document.getElementById("early-access")?.scrollIntoView({ behavior: "smooth" });

  const formTexts = { fieldName: t.fieldName, fieldEmail: t.fieldEmail, fieldPhone: t.fieldPhone, formCta: t.formCta, successTitle: t.successTitle, successSub: t.successSub };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: "#0F1115", fontFamily: "Manrope, sans-serif" }}>
      <LandingNavbar t={t} isLoggedIn={isLoggedIn} onToggleLang={toggleLang} onCtaClick={scrollToForm} />
      <LandingHero t={t} formTexts={formTexts} />
      <LandingProductSections t={t} />
      <LandingFAQ t={{ faqTitle: t.faqTitle, faqItems: t.faqItems }} />
      <LandingCTA t={t} formTexts={formTexts} />
      <LandingFooter t={t} />
    </div>
  );
};

export default LandingPage;
