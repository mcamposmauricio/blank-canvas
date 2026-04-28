import { Grid3x3, Clock, Shield, MessageCircle } from "lucide-react";

const items = [
  { icon: Grid3x3, label: "4 canais em 1 plataforma" },
  { icon: Clock, label: "Setup em 5 minutos" },
  { icon: Shield, label: "Preço em real, sem surpresa" },
  { icon: MessageCircle, label: "Suporte humano em português" },
];

const LandingQuickContext = () => (
  <section className="py-12 px-4" style={{ background: "#0F1115", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
    <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-6">
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,122,89,0.08)", border: "1px solid rgba(255,122,89,0.15)" }}>
            <Icon className="w-4 h-4" style={{ color: "#FF7A59" }} />
          </div>
          <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>{label}</span>
        </div>
      ))}
    </div>
  </section>
);

export default LandingQuickContext;
