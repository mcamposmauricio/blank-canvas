import { Check, Sparkles } from "lucide-react";

interface LandingPricingProps {
  onGetStarted: () => void;
}

const tiers = [
  {
    name: "Grátis",
    price: "R$ 0",
    priceSuffix: "/mês",
    description: "Pra começar agora, sem cartão.",
    features: [
      "Até 2 atendentes",
      "Chat com widget instalável",
      "Help Center (até 50 artigos)",
      "CSAT pós-atendimento",
      "Histórico de conversas",
    ],
    cta: "Começar grátis",
    highlighted: false,
    action: "form" as const,
  },
  {
    name: "Growth",
    price: "R$ 79",
    priceOld: "R$ 129",
    priceSuffix: "/agente/mês",
    description: "Pra times que querem operação séria.",
    badge: "Promo de lançamento · -38%",
    saving: "Economize R$ 600/agente/ano",
    features: [
      "Tudo do plano grátis",
      "Fila inteligente (Round Robin + Least Busy)",
      "Regras customizadas por categoria/time",
      "Banners agendados e segmentados",
      "Campos customizáveis no painel",
      "Dashboard completo com filtros",
      "NPS automatizado no produto",
      "Integrações via API e webhooks",
    ],
    cta: "Começar grátis · 14 dias",
    highlighted: true,
    action: "form" as const,
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    description: "Pra empresas que precisam de mais.",
    features: [
      "Tudo do plano Growth",
      "Domínio próprio no Help Center",
      "SSO (Google Workspace, Microsoft)",
      "SLA dedicado",
      "Onboarding assistido",
      "Suporte prioritário",
    ],
    cta: "Falar com vendas",
    highlighted: false,
    action: "mailto" as const,
  },
];

const LandingPricing = ({ onGetStarted }: LandingPricingProps) => {
  const handleClick = (action: "form" | "mailto") => {
    if (action === "mailto") {
      window.location.href = "mailto:contato@jornadacliente.com.br?subject=Journey%20Enterprise";
    } else {
      onGetStarted();
    }
  };

  return (
    <section id="precos" className="py-24 lg:py-28 px-4" style={{ background: "#0F1115" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[12px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#FF7A59" }}>Preços</p>
          <h2 className="font-medium text-white mb-3" style={{ fontSize: "clamp(24px, 3vw, 36px)", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            Preço de startup pra startup
          </h2>
          <p className="max-w-xl mx-auto text-[15px]" style={{ color: "rgba(255,255,255,0.5)" }}>
            Sem conversão de dólar, sem surpresa na fatura. Cancela quando quiser.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="rounded-2xl p-6 lg:p-7 flex flex-col relative transition-transform duration-200"
              style={{
                background: tier.highlighted ? "#171C28" : "#131722",
                border: tier.highlighted ? "1px solid rgba(255,122,89,0.4)" : "1px solid rgba(255,255,255,0.05)",
                boxShadow: tier.highlighted ? "0 24px 64px rgba(255,122,89,0.08)" : "none",
                transform: tier.highlighted ? "scale(1.02)" : "none",
              }}
            >
              {tier.badge && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap"
                  style={{ background: "#FF7A59", color: "#fff", boxShadow: "0 8px 24px rgba(255,122,89,0.3)" }}
                >
                  <Sparkles className="w-3 h-3" />
                  {tier.badge}
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-[18px] font-semibold text-white mb-1">{tier.name}</h3>
                <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.5)" }}>{tier.description}</p>
              </div>

              <div className="mb-6">
                {tier.priceOld && (
                  <span className="text-[14px] line-through mr-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {tier.priceOld}
                  </span>
                )}
                <span className="text-[32px] font-semibold" style={{ color: tier.highlighted ? "#FF7A59" : "#fff" }}>
                  {tier.price}
                </span>
                {tier.priceSuffix && (
                  <span className="text-[13px] ml-1" style={{ color: "rgba(255,255,255,0.5)" }}>{tier.priceSuffix}</span>
                )}
                {tier.saving && (
                  <p className="text-[11px] mt-1.5 font-medium" style={{ color: "#2ECC71" }}>{tier.saving}</p>
                )}
              </div>

              <ul className="space-y-2.5 mb-7 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: tier.highlighted ? "#FF7A59" : "#2ECC71" }} />
                    <span className="text-[13px] leading-snug" style={{ color: "rgba(255,255,255,0.7)" }}>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleClick(tier.action)}
                className="w-full py-3 rounded-lg text-sm font-medium transition-opacity duration-150 hover:opacity-90"
                style={{
                  background: tier.highlighted ? "#FF7A59" : "transparent",
                  color: tier.highlighted ? "#fff" : "rgba(255,255,255,0.85)",
                  border: tier.highlighted ? "1px solid #FF7A59" : "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-[12px] mt-10" style={{ color: "rgba(255,255,255,0.4)" }}>
          Sem contrato de fidelidade · Cancela quando quiser · Suporte incluso em todos os planos
        </p>
      </div>
    </section>
  );
};

export default LandingPricing;
