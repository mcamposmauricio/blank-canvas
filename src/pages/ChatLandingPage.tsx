import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare, Eye, BookOpen, TrendingUp, Hash, BarChart2, GitMerge,
  ArrowRight, Zap, Send, X, User
} from "lucide-react";

type Lang = "en" | "pt-BR";

const initLang = (): Lang => {
  const saved = localStorage.getItem("landing_lang");
  if (saved === "en" || saved === "pt-BR") return saved;
  return navigator.language.startsWith("pt") ? "pt-BR" : "en";
};

const texts = {
  en: {
    navFeatures: "Features",
    navIntegrations: "Integrations",
    navPricing: "Pricing",
    navCrossLink: "Journey Platform",
    navSignIn: "Sign In",
    navDashboard: "Dashboard",
    navCta: "Start Free",
    langToggle: "PT",
    heroBadge: "In-App Chat · For B2B SaaS",
    heroH1: "Turn in-app conversations into revenue retention",
    heroSub: "The lightest in-app chat on the market, designed for B2B startups that need real context to close tickets and identify expansion opportunities.",
    heroCta: "Install in 5 minutes",
    heroSubCta: "No credit card · Setup in minutes",
    socialTitle: "Startups scaling with Journey",
    diff1Title: "Real-Time Context",
    diff1Desc: "See plan metadata and user behavior before even responding.",
    diff2Title: "Integrated Help Center",
    diff2Desc: "Reduce ticket volume by letting users help themselves without leaving the chat.",
    diff3Title: "Success Focus",
    diff3Desc: "Automatically identify if a conversation is a churn risk or upsell opportunity.",
    intTitle: "Reply from Slack, sync with your CRM",
    intSub: "Connect in 1 click with the tools your team already uses",
    intConnected: "Connected ✓",
    ctaTitle: "Ready to elevate your support?",
    ctaSub: "Install the widget in minutes and start seeing your users' context.",
    ctaBtn: "Create free account now",
    ctaFree: "Free forever up to 500 conversations/month",
    footerTagline: "In-App Chat for Revenue-Driven B2B Teams",
    footerRights: "All rights reserved.",
  },
  "pt-BR": {
    navFeatures: "Funcionalidades",
    navIntegrations: "Integrações",
    navPricing: "Preços",
    navCrossLink: "Journey Platform",
    navSignIn: "Entrar",
    navDashboard: "Dashboard",
    navCta: "Começar Grátis",
    langToggle: "EN",
    heroBadge: "In-App Chat · Para B2B SaaS",
    heroH1: "Transforme conversas dentro do app em retenção de receita",
    heroSub: "O chat in-app mais leve do mercado, projetado para startups B2B que precisam de contexto real para fechar tickets e identificar oportunidades de expansão.",
    heroCta: "Instalar em 5 minutos",
    heroSubCta: "Sem cartão de crédito · Setup em minutos",
    socialTitle: "Startups que escalam com a Journey",
    diff1Title: "Contexto em Tempo Real",
    diff1Desc: "Veja os metadados do plano e comportamento do usuário antes mesmo de responder.",
    diff2Title: "Central de Ajuda Integrada",
    diff2Desc: "Reduza o volume de tickets permitindo que o usuário se ajude sem sair do chat.",
    diff3Title: "Foco em Sucesso",
    diff3Desc: "Identifique automaticamente se a conversa é um risco de churn ou chance de upsell.",
    intTitle: "Responda do Slack, sincronize com seu CRM",
    intSub: "Conecte em 1 clique com as ferramentas que seu time já usa",
    intConnected: "Conectado ✓",
    ctaTitle: "Pronto para elevar o nível do seu atendimento?",
    ctaSub: "Instale o widget em minutos e comece a ver o contexto dos seus usuários.",
    ctaBtn: "Criar conta gratuita agora",
    ctaFree: "Grátis para sempre até 500 conversas/mês",
    footerTagline: "In-App Chat para times B2B orientados a Receita",
    footerRights: "Todos os direitos reservados.",
  },
};

/* ─── Chat Widget Mockup ──────────────────────────────────── */
const ChatWidgetMockup = () => (
  <div className="relative w-full" style={{ minHeight: 420 }}>
    {/* SaaS app background */}
    <div
      className="rounded-2xl p-5 w-full h-full"
      style={{ background: "#131722", border: "1px solid rgba(255,255,255,0.07)", minHeight: 420 }}
    >
      {/* Fake app header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full" style={{ background: "#FF5F57" }} />
        <div className="w-2 h-2 rounded-full" style={{ background: "#FEBC2E" }} />
        <div className="w-2 h-2 rounded-full" style={{ background: "#28C840" }} />
        <div className="ml-3 h-3 w-40 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
      {/* Fake app content */}
      <div className="space-y-2 mb-3">
        <div className="h-3 rounded w-3/4" style={{ background: "rgba(255,255,255,0.05)" }} />
        <div className="h-3 rounded w-full" style={{ background: "rgba(255,255,255,0.04)" }} />
        <div className="h-3 rounded w-5/6" style={{ background: "rgba(255,255,255,0.04)" }} />
        <div className="h-16 rounded mt-3" style={{ background: "rgba(255,255,255,0.03)" }} />
        <div className="h-3 rounded w-2/3" style={{ background: "rgba(255,255,255,0.04)" }} />
      </div>

      {/* Context badge (floating) */}
      <div
        className="absolute top-6 right-4 rounded-xl px-3 py-2 flex flex-col gap-1"
        style={{
          background: "#1A2B48",
          border: "1px solid rgba(52,152,219,0.3)",
          boxShadow: "0 8px 24px rgba(52,152,219,0.15)",
          minWidth: 140,
        }}
      >
        <div className="text-[9px] font-medium uppercase tracking-widest" style={{ color: "#3498DB" }}>User Context</div>
        <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.7)" }}>Plan: <span className="text-white font-medium">Pro</span></div>
        <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.7)" }}>MRR impact: <span style={{ color: "#2ECC71" }} className="font-medium">$2.4k</span></div>
        <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.7)" }}>Health: <span style={{ color: "#FF7A59" }} className="font-medium">⚠ At risk</span></div>
      </div>

      {/* Chat widget window */}
      <div
        className="absolute bottom-4 right-4 rounded-2xl flex flex-col overflow-hidden"
        style={{
          width: 230,
          height: 280,
          background: "#0F1115",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Chat header */}
        <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: "#FF7A59" }}>
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <User className="w-3 h-3 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-semibold text-white">Sarah — Support</div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-300" />
              <div className="text-[8px] text-white/70">Online</div>
            </div>
          </div>
          <X className="w-3 h-3 text-white/60 ml-auto" />
        </div>

        {/* Messages */}
        <div className="flex-1 p-2.5 space-y-2 overflow-hidden">
          {/* Agent message */}
          <div className="flex gap-1.5 items-end">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: "#FF7A59" }}>
              <User className="w-2.5 h-2.5 text-white m-0.5" />
            </div>
            <div className="rounded-xl rounded-bl-sm px-2.5 py-1.5 text-[9px] leading-relaxed max-w-[75%]"
              style={{ background: "#171C28", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.06)" }}>
              Oi! Vi que você está no plano Pro. Como posso ajudar?
            </div>
          </div>
          {/* Visitor message */}
          <div className="flex justify-end">
            <div className="rounded-xl rounded-br-sm px-2.5 py-1.5 text-[9px] leading-relaxed max-w-[75%]"
              style={{ background: "rgba(255,122,89,0.15)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,122,89,0.2)" }}>
              Preciso exportar os dados do mês
            </div>
          </div>
          {/* Agent typing */}
          <div className="flex gap-1.5 items-end">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: "#FF7A59" }} />
            <div className="rounded-xl rounded-bl-sm px-3 py-2"
              style={{ background: "#171C28", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-1.5 px-2.5 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex-1 rounded-lg px-2.5 py-1.5 text-[9px]"
            style={{ background: "#171C28", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
            Mensagem...
          </div>
          <button className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#FF7A59" }}>
            <Send className="w-3 h-3 text-white" />
          </button>
        </div>
      </div>
    </div>
  </div>
);

/* ─── Main Component ──────────────────────────────────────── */
const ChatLandingPage = () => {
  const navigate = useNavigate();
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

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const differentials = [
    { icon: Eye, color: "#3498DB", title: t.diff1Title, desc: t.diff1Desc },
    { icon: BookOpen, color: "#2ECC71", title: t.diff2Title, desc: t.diff2Desc },
    { icon: TrendingUp, color: "#FF7A59", title: t.diff3Title, desc: t.diff3Desc },
  ];

  const integrations = [
    { icon: Hash, name: "Slack", color: "#4A154B" },
    { icon: BarChart2, name: "HubSpot", color: "#FF7A59" },
    { icon: GitMerge, name: "Pipedrive", color: "#1F2D3D" },
  ];

  const socialLogos = ["Acme SaaS", "Orbit", "Stackly", "Claros", "Veryfi"];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0F1115", fontFamily: "Manrope, sans-serif" }}>

      {/* ── NAVBAR ──────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50"
        style={{
          background: "rgba(15,17,21,0.92)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <img src="/logo-dark.svg" alt="Journey" className="h-12 w-auto" />
          </div>

          {/* Nav links (desktop) */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/journey"
              className="text-sm transition-colors duration-150"
              style={{ color: "rgba(255,255,255,0.45)", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FF7A59")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
            >
              {t.navCrossLink}
            </Link>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="text-xs font-medium uppercase tracking-widest px-3 h-8 rounded-lg transition-colors duration-150"
              style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)", background: "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
            >
              {t.langToggle}
            </button>
            <span style={{ color: "rgba(255,255,255,0.1)", fontSize: 16 }}>|</span>
            <button
              onClick={() => navigate(isLoggedIn ? "/cs-dashboard" : "/auth")}
              className="text-sm px-4 h-9 rounded-lg transition-colors duration-150"
              style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)", background: "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            >
              {isLoggedIn ? t.navDashboard : t.navSignIn}
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="text-sm px-4 h-9 rounded-lg font-medium transition-opacity duration-150 hover:opacity-90"
              style={{ background: "#FF7A59", color: "#fff" }}
            >
              {t.navCta}
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative py-16 px-4 overflow-hidden" style={{ minHeight: "80vh", display: "flex", alignItems: "center" }}>
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{
            position: "absolute", top: "20%", left: "15%",
            width: 500, height: 400,
            background: "radial-gradient(ellipse, rgba(26,43,72,0.6) 0%, transparent 70%)",
          }} />
          <div style={{
            position: "absolute", top: "40%", right: "10%",
            width: 400, height: 300,
            background: "radial-gradient(ellipse, rgba(255,122,89,0.05) 0%, transparent 70%)",
          }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-14 items-center">
          {/* Left: Copy */}
          <div className="flex flex-col items-start text-left">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium uppercase tracking-widest mb-8"
              style={{ background: "rgba(255,122,89,0.08)", border: "1px solid rgba(255,122,89,0.18)", color: "rgba(255,122,89,0.85)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {t.heroBadge}
            </div>

            <h1
              className="font-medium text-white mb-6"
              style={{ fontSize: "clamp(28px, 3.8vw, 50px)", lineHeight: 1.15, letterSpacing: "-0.025em" }}
            >
              {t.heroH1}
            </h1>

            <p
              className="mb-10"
              style={{ fontSize: "clamp(14px, 1.5vw, 16px)", lineHeight: 1.75, color: "rgba(255,255,255,0.5)", maxWidth: 500 }}
            >
              {t.heroSub}
            </p>

            <div className="flex flex-col items-start gap-3">
              <button
                onClick={() => navigate("/auth")}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-medium text-base transition-all duration-150 hover:opacity-90 hover:-translate-y-0.5"
                style={{ background: "#FF7A59", color: "#fff", boxShadow: "0 8px 32px rgba(255,122,89,0.3)" }}
              >
                <Zap className="w-4 h-4" />
                {t.heroCta}
              </button>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>
                {t.heroSubCta}
              </p>
            </div>
          </div>

          {/* Right: Chat mockup */}
          <div className="w-full">
            <ChatWidgetMockup />
          </div>
        </div>
      </section>



      <section id="features" className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          {differentials.map(({ icon: Icon, color, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl p-7 flex flex-col gap-4 transition-all duration-200"
              style={{
                background: "#131722",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${color}30`)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}14` }}
              >
                <Icon style={{ color }} className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2" style={{ fontSize: 16 }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>




      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section className="py-20 px-4 relative overflow-hidden">
        {/* Gradient bg */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(135deg, #131722 0%, #1A2B48 50%, #2A1F18 100%)" }}
        />
        {/* Coral glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: 0, right: "25%",
            width: 500, height: 300,
            background: "radial-gradient(ellipse, rgba(255,122,89,0.08) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium uppercase tracking-widest mb-6"
            style={{ background: "rgba(255,122,89,0.1)", border: "1px solid rgba(255,122,89,0.2)", color: "rgba(255,122,89,0.8)" }}
          >
            <MessageSquare className="w-3 h-3" />
            In-App Chat
          </div>
          <h2 className="font-medium text-white mb-4" style={{ fontSize: "clamp(24px, 3.5vw, 38px)", letterSpacing: "-0.025em", lineHeight: 1.2 }}>
            {t.ctaTitle}
          </h2>
          <p className="text-base mb-10" style={{ color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
            {t.ctaSub}
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base transition-all duration-150 hover:opacity-90 hover:-translate-y-0.5 mb-4"
            style={{ background: "#FF7A59", color: "#fff", boxShadow: "0 12px 40px rgba(255,122,89,0.35)" }}
          >
            <ArrowRight className="w-5 h-5" />
            {t.ctaBtn}
          </button>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{t.ctaFree}</p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="py-7 px-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: "#0F1115" }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo-dark.svg" alt="Journey" className="h-10 w-auto" />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>
              {t.footerTagline}
            </span>
          </div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.22)" }}>
            © {new Date().getFullYear()} Journey. {t.footerRights}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ChatLandingPage;
