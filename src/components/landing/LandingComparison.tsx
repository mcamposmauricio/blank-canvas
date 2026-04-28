import { DollarSign, Zap, MessageSquareHeart, Sparkles } from "lucide-react";

const cards = [
  {
    icon: DollarSign,
    title: "Preço em real, sem conversão de dólar",
    desc: "Plano Growth a partir de R$ 79/mês. Cobrança em real, sem surpresa quando o câmbio sobe.",
  },
  {
    icon: Zap,
    title: "Setup em minutos, não em semanas",
    desc: "Cola uma linha de código no seu site e tá funcionando. Sem consultoria de implementação, sem reunião de kick-off.",
  },
  {
    icon: MessageSquareHeart,
    title: "Suporte de quem construiu",
    desc: "Você fala direto com o time fundador. Sua sugestão vira feature, não vira ticket #48.291 numa fila de priorização.",
  },
  {
    icon: Sparkles,
    title: "Só o que você precisa",
    desc: "Sem 200 features que ninguém usa e que encarecem o produto. Chat, fila, Help Center, CSAT, banners. Pronto.",
  },
];

const LandingComparison = () => (
  <section className="py-24 lg:py-28 px-4" style={{ background: "#0D0F13" }}>
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-14">
        <p className="text-[12px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#FF7A59" }}>Por que o Journey</p>
        <h2 className="font-medium text-white mb-3" style={{ fontSize: "clamp(24px, 3vw, 36px)", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
          A ferramenta certa pro seu momento
        </h2>
        <p className="max-w-xl mx-auto text-[15px]" style={{ color: "rgba(255,255,255,0.5)" }}>
          Feito pra quem tá construindo, não pra quem tem 500 funcionários e um time só pra configurar ferramenta.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-2xl p-5 transition-colors duration-200"
            style={{ background: "#131722", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(255,122,89,0.1)", border: "1px solid rgba(255,122,89,0.2)" }}>
              <Icon className="w-5 h-5" style={{ color: "#FF7A59" }} />
            </div>
            <h3 className="text-[15px] font-semibold text-white mb-2 leading-snug">{title}</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default LandingComparison;
