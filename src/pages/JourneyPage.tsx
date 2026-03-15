import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingTimeline from "@/components/landing/LandingTimeline";
import LandingKanban from "@/components/landing/LandingKanban";
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
    navChat: "Chat",
    navCSAT: "CSAT",
    navNPS: "NPS",
    navHelpCenter: "Help Center",
    navPlataforma: "Platform",
    navSignIn: "Sign In",
    navDashboard: "Dashboard",
    navCta: "Get Started",
    langToggle: "PT",
    platformLabel: "Complete Platform",
    platformTitle: "The full CS operating system",
    platformSub: "Beyond chat, NPS and knowledge base — Journey gives you timeline, kanban, health scoring and executive dashboards.",
    timelineLabel: "CRM + Timeline",
    timelineH2: "Track every interaction.\nEvery signal.\nEvery opportunity.",
    timelineSub: "From first onboarding to renewal — every touchpoint, health change, and revenue signal captured in one unified timeline.",
    kanbanLabel: "Customer Journey",
    kanbanH2: "Visualize every customer journey stage.",
    kanbanSub: "Move accounts based on signals — not assumptions.",
    socialTitle: "Measurable impact for your CS team",
    socialSub: "Average results from teams using Journey",
    socialMetrics: [
      { value: "-40%", label: "Response Time" },
      { value: "NPS 72", label: "Average Score" },
      { value: "85%", label: "Articles Helpful" },
      { value: "-25%", label: "Ticket Volume" },
    ],
    faqTitle: "Frequently Asked Questions",
    faqItems: [
      { q: "How long does it take to install?", a: "The chat widget can be installed with a single line of JavaScript. Full setup including NPS and Help Center typically takes under 30 minutes." },
      { q: "Do I need a credit card?", a: "No. Early access is free and doesn't require payment information." },
      { q: "Does it work with my CRM?", a: "Journey has a built-in CRM with timeline and kanban. We also support integrations via API and webhooks." },
      { q: "How is the data protected?", a: "All data is encrypted at rest and in transit. We are LGPD compliant and follow industry-standard security practices." },
      { q: "Can I customize the chat widget?", a: "Yes — colors, position, form fields, business hours, welcome messages, and more are fully configurable." },
      { q: "How does automatic assignment work?", a: "You can configure Round Robin, Least Busy, or manual assignment. Rules can be set per category with team fallbacks." },
    ],
    fieldName: "Your Name *",
    fieldEmail: "Work Email *",
    fieldPhone: "Phone *",
    formCta: "Get Started",
    successTitle: "You're on the list!",
     successSub: "We'll reach out soon to get you started.",
     formLabel: "Get Started",
     formH2: "Start using Journey today",
     formSub: "Built for CS and Revenue teams who want to build predictable growth from customer data.",
     formFootnote: "Get direct access to the founding team and influence the product roadmap.",
    footerTagline: "The CX platform for revenue-driven CS teams.",
    footerRights: "All rights reserved.",
    footerProduct: "Product",
    footerCompany: "Company",
    footerLegal: "Legal",
    footerProductLinks: [
      { label: "Chat", href: "/#chat" },
      { label: "CSAT", href: "/#csat" },
      { label: "NPS", href: "/#nps" },
      { label: "Help Center", href: "/#helpcenter" },
      { label: "Platform", href: "/journey" },
    ],
    footerCompanyLinks: [
      { label: "Get Started", href: "#early-access" },
    ],
    footerLegalLinks: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
    ],
  },
  "pt-BR": {
    navChat: "Chat",
    navCSAT: "CSAT",
    navNPS: "NPS",
    navHelpCenter: "Help Center",
    navPlataforma: "Plataforma",
    navSignIn: "Entrar",
    navDashboard: "Dashboard",
    navCta: "Clique e Conheça",
    langToggle: "EN",
    platformLabel: "Plataforma Completa",
    platformTitle: "O sistema operacional de CS completo",
    platformSub: "Além de chat, NPS e base de conhecimento — o Journey entrega timeline, kanban, health score e dashboards executivos.",
    timelineLabel: "CRM + Timeline",
    timelineH2: "Rastreie cada interação.\nCada sinal.\nCada oportunidade.",
    timelineSub: "Do primeiro onboarding à renovação — cada touchpoint, mudança de health e sinal de receita capturado em uma timeline unificada.",
    kanbanLabel: "Jornada do Cliente",
    kanbanH2: "Visualize cada etapa da jornada do cliente.",
    kanbanSub: "Mova contas com base em sinais — não em suposições.",
    socialTitle: "Impacto mensurável para seu time de CS",
    socialSub: "Resultados médios de times que usam o Journey",
    socialMetrics: [
      { value: "-40%", label: "Tempo de Resposta" },
      { value: "NPS 72", label: "Score Médio" },
      { value: "85%", label: "Artigos Úteis" },
      { value: "-25%", label: "Volume de Tickets" },
    ],
    faqTitle: "Perguntas Frequentes",
    faqItems: [
      { q: "Quanto tempo leva para instalar?", a: "O widget de chat pode ser instalado com uma única linha de JavaScript. A configuração completa incluindo NPS e Help Center leva menos de 30 minutos." },
      { q: "Preciso de cartão de crédito?", a: "Não. O acesso antecipado é gratuito e não exige informações de pagamento." },
      { q: "Funciona com meu CRM?", a: "O Journey possui CRM integrado com timeline e kanban. Também suportamos integrações via API e webhooks." },
      { q: "Como os dados são protegidos?", a: "Todos os dados são criptografados em repouso e em trânsito. Somos compatíveis com a LGPD e seguimos as melhores práticas de segurança." },
      { q: "Posso personalizar o widget de chat?", a: "Sim — cores, posição, campos do formulário, horários de atendimento, mensagens de boas-vindas e mais são totalmente configuráveis." },
      { q: "Como funciona a atribuição automática?", a: "Você pode configurar Round Robin, Least Busy ou manual. Regras podem ser definidas por categoria com fallback por time." },
    ],
    fieldName: "Seu Nome *",
    fieldEmail: "Email Corporativo *",
    fieldPhone: "Telefone *",
    formCta: "Começar Agora",
    successTitle: "Você está na lista!",
     successSub: "Entraremos em contato em breve.",
     formLabel: "Comece agora",
     formH2: "Comece a usar o Journey hoje",
     formSub: "Feito para times de CS e Receita que querem construir crescimento previsível a partir de dados de clientes.",
     formFootnote: "Tenha acesso direto ao time fundador e influência no roadmap do produto.",
    footerTagline: "A plataforma de CX para times de CS orientados a receita.",
    footerRights: "Todos os direitos reservados.",
    footerProduct: "Produto",
    footerCompany: "Empresa",
    footerLegal: "Legal",
    footerProductLinks: [
      { label: "Chat", href: "/#chat" },
      { label: "CSAT", href: "/#csat" },
      { label: "NPS", href: "/#nps" },
      { label: "Help Center", href: "/#helpcenter" },
      { label: "Plataforma", href: "/journey" },
    ],
    footerCompanyLinks: [
      { label: "Começar", href: "#early-access" },
    ],
    footerLegalLinks: [
      { label: "Política de Privacidade", href: "#" },
      { label: "Termos de Uso", href: "#" },
    ],
  },
};

const JourneyPage = () => {
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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0F1115", fontFamily: "Manrope, sans-serif" }}>
      <LandingNavbar t={t} isLoggedIn={isLoggedIn} onToggleLang={toggleLang} onCtaClick={scrollToForm} />

      {/* ── Platform Hero ─── */}
      <section className="py-20 px-4 text-center" style={{ background: "#0F1115" }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-sm font-medium uppercase tracking-widest mb-4" style={{ color: "#FF7A59" }}>{t.platformLabel}</p>
          <h1 className="text-white font-medium mb-4" style={{ fontSize: "clamp(28px, 3.8vw, 48px)", lineHeight: 1.15, letterSpacing: "-0.025em" }}>
            {t.platformTitle}
          </h1>
          <p className="text-[16px] mx-auto" style={{ color: "rgba(255,255,255,0.5)", maxWidth: 560 }}>{t.platformSub}</p>
        </div>
      </section>

      <LandingTimeline t={t} />
      <LandingKanban t={t} />
      <LandingSocialProof t={{ socialTitle: t.socialTitle, socialSub: t.socialSub, metrics: t.socialMetrics }} />
      <LandingFAQ t={{ faqTitle: t.faqTitle, faqItems: t.faqItems }} />
      <LandingCTA t={t} formTexts={{ fieldName: t.fieldName, fieldEmail: t.fieldEmail, fieldPhone: t.fieldPhone, formCta: t.formCta, successTitle: t.successTitle, successSub: t.successSub }} />
      <LandingFooter t={t} />
    </div>
  );
};

export default JourneyPage;
