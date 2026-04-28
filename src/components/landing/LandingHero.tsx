import LeadForm, { type LeadFormTexts } from "./LeadForm";
import HeroChatMockup from "./HeroChatMockup";

const formTexts: LeadFormTexts = {
  fieldName: "Seu nome",
  fieldEmail: "Seu melhor email",
  fieldPhone: "Telefone",
  formCta: "Começar grátis",
  successTitle: "Conta reservada!",
  successSub: "Em até 1 dia útil te chamamos pra liberar seu acesso e ajudar no setup.",
};

const LandingHero = () => (
  <section className="relative pt-16 pb-20 lg:pt-20 lg:pb-28 px-4 overflow-hidden" style={{ background: "#0F1115" }}>
    {/* Subtle background glow */}
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translate(-50%, -50%)", width: "min(900px, 100%)", height: 600, background: "radial-gradient(ellipse, rgba(255,122,89,0.06) 0%, transparent 70%)" }} />
    </div>

    <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center mb-12 lg:mb-16">
      {/* Badge */}
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium uppercase tracking-widest mb-7"
        style={{ background: "rgba(255,122,89,0.08)", border: "1px solid rgba(255,122,89,0.2)", color: "rgba(255,122,89,0.9)" }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        Atendimento · Help Center · CSAT
      </div>

      {/* Headline */}
      <h1
        className="font-semibold text-white mb-5"
        style={{ fontSize: "clamp(30px, 4.5vw, 52px)", lineHeight: 1.1, letterSpacing: "-0.035em" }}
      >
        A plataforma de atendimento que startups brasileiras estavam esperando.
      </h1>

      {/* Subtitle */}
      <p className="mb-9 max-w-xl" style={{ fontSize: "clamp(15px, 1.4vw, 17px)", lineHeight: 1.6, color: "rgba(255,255,255,0.55)" }}>
        Chat em tempo real, fila inteligente, banners proativos, base de conhecimento e CSAT — tudo no mesmo lugar, por uma fração do preço que você paga hoje.
      </p>

      {/* Form */}
      <div className="w-full max-w-md">
        <LeadForm t={formTexts} mode="emailOnly" />
      </div>
      <p className="text-[12px] mt-3.5" style={{ color: "rgba(255,255,255,0.35)" }}>
        Grátis pra até 2 agentes · Sem cartão de crédito · Setup em 5 minutos
      </p>
    </div>

    {/* Hero mockup */}
    <div className="relative z-10 max-w-6xl mx-auto px-2">
      <HeroChatMockup />
    </div>
  </section>
);

export default LandingHero;
