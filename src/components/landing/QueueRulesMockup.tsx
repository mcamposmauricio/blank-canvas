import { Users, GitBranch, Clock, CheckCircle2 } from "lucide-react";

const QueueRulesMockup = () => (
  <div className="rounded-xl p-4 space-y-3" style={{ background: "#0F1115", border: "1px solid rgba(255,255,255,0.06)" }}>
    {/* Strategy toggles */}
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg p-3" style={{ background: "rgba(255,122,89,0.08)", border: "1px solid rgba(255,122,89,0.25)" }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <GitBranch className="w-3 h-3" style={{ color: "#FF7A59" }} />
            <span className="text-[10px] font-semibold" style={{ color: "#FF7A59" }}>Round Robin</span>
          </div>
          <div className="w-6 h-3 rounded-full flex items-center px-0.5" style={{ background: "#FF7A59" }}>
            <div className="w-2.5 h-2.5 rounded-full bg-white ml-auto" />
          </div>
        </div>
        <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>Distribui igual entre o time</div>
      </div>
      <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3" style={{ color: "rgba(255,255,255,0.4)" }} />
            <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>Least Busy</span>
          </div>
          <div className="w-6 h-3 rounded-full flex items-center px-0.5" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.3)" }} />
          </div>
        </div>
        <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>Manda pro mais livre</div>
      </div>
    </div>

    {/* Rules list */}
    <div>
      <div className="text-[9px] uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Regras de roteamento</div>
      <div className="space-y-1.5">
        {[
          { cond: "Categoria = Suporte", action: "Time Tier 1", cap: "5 conversas/agente" },
          { cond: "Categoria = Vendas", action: "Time Comercial", cap: "3 conversas/agente" },
          { cond: "MRR > R$ 5.000", action: "Time Premium", cap: "Sem limite" },
        ].map((r, i) => (
          <div key={i} className="rounded-lg px-2.5 py-2 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: "#2ECC71" }} />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-white">
                <span style={{ color: "rgba(255,255,255,0.5)" }}>Se </span>
                <span className="font-medium">{r.cond}</span>
                <span style={{ color: "rgba(255,255,255,0.5)" }}> → </span>
                <span className="font-medium" style={{ color: "#FF7A59" }}>{r.action}</span>
              </div>
              <div className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{r.cap}</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Business hours */}
    <div className="rounded-lg p-2.5 flex items-center gap-2" style={{ background: "rgba(52,152,219,0.06)", border: "1px solid rgba(52,152,219,0.15)" }}>
      <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#3498DB" }} />
      <div className="flex-1">
        <div className="text-[10px] font-medium text-white">Seg–Sex · 09h–18h</div>
        <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>Break 12h–13h · Fora do horário: mensagem automática</div>
      </div>
    </div>
  </div>
);

export default QueueRulesMockup;
