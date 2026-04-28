import { GitBranch, Megaphone, Layers } from "lucide-react";

const columns = [
  {
    icon: GitBranch,
    color: "#FF7A59",
    title: "Distribui sozinho",
    desc: "Regras automáticas mandam cada conversa pro time certo, atendente certo, dentro do limite de capacidade. Ninguém fica empurrando ticket.",
  },
  {
    icon: Megaphone,
    color: "#3498DB",
    title: "Antecipa antes do ticket",
    desc: "Banners agendados avisam manutenção, novidade ou promoção pra segmentos específicos. Cliente já entra sabendo, não abre conversa.",
  },
  {
    icon: Layers,
    color: "#2ECC71",
    title: "Contexto na hora certa",
    desc: "Atendente abre a conversa já vendo plano, MRR, health e histórico. Sem trocar de aba, sem pedir pra repetir o problema.",
  },
];

const LandingEfficiency = () => (
  <section className="py-24 lg:py-28 px-4" style={{ background: "#131722" }}>
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-14">
        <p className="text-[12px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#FF7A59" }}>Eficiência operacional</p>
        <h2 className="font-medium text-white mb-3" style={{ fontSize: "clamp(24px, 3vw, 36px)", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
          Atendimento desenhado pra eficiência
        </h2>
        <p className="max-w-xl mx-auto text-[15px]" style={{ color: "rgba(255,255,255,0.5)" }}>
          Menos toques, mais resoluções. O sistema trabalha pelo seu time pra ele atender, não configurar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {columns.map(({ icon: Icon, color, title, desc }) => (
          <div key={title} className="rounded-2xl p-6" style={{ background: "#0F1115", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <h3 className="text-[16px] font-semibold text-white mb-2">{title}</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default LandingEfficiency;
