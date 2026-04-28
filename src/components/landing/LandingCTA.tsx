import LeadForm, { type LeadFormTexts } from "./LeadForm";

const formTexts: LeadFormTexts = {
  fieldName: "Seu nome",
  fieldEmail: "Seu melhor email",
  fieldPhone: "Telefone",
  formCta: "Criar minha conta",
  successTitle: "Conta reservada!",
  successSub: "Em até 1 dia útil te chamamos pra liberar seu acesso e ajudar no setup.",
};

const LandingCTA = () => (
  <section id="early-access" className="py-24 lg:py-28 px-4 relative overflow-hidden" style={{ background: "#0F1115" }}>
    <div className="absolute pointer-events-none" style={{ bottom: 0, left: "50%", transform: "translateX(-50%)", width: 800, height: 320, background: "radial-gradient(ellipse, rgba(255,122,89,0.08) 0%, transparent 70%)" }} />
    <div className="relative z-10 max-w-xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="font-semibold text-white mb-3" style={{ fontSize: "clamp(26px, 3vw, 38px)", lineHeight: 1.2, letterSpacing: "-0.025em" }}>
          Comece a atender melhor hoje.
        </h2>
        <p className="text-[15px]" style={{ color: "rgba(255,255,255,0.55)" }}>
          Conta grátis pra até 2 agentes. Sem cartão, sem contrato. Setup em 5 minutos.
        </p>
      </div>
      <div className="rounded-2xl p-6 sm:p-7" style={{ background: "#131722", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
        <LeadForm t={formTexts} mode="emailOnly" />
        <p className="text-center text-[11px] mt-4" style={{ color: "rgba(255,255,255,0.35)" }}>
          Acesso direto ao time fundador. Sua opinião constrói o produto.
        </p>
      </div>
    </div>
  </section>
);

export default LandingCTA;
