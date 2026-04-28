import { Calendar, Eye, MousePointerClick } from "lucide-react";

const banners = [
  { title: "Manutenção programada", date: "Sáb 02/05 · 02h–04h", segment: "Todos os planos", status: "Agendado", color: "#3498DB", views: "—", clicks: "—" },
  { title: "Promo Black Friday · -30%", date: "Em andamento até 30/11", segment: "Plano Free + Trial", status: "Ativo", color: "#2ECC71", views: "8.2k", clicks: "412" },
  { title: "Novo recurso: Fila inteligente", date: "Até 28/04", segment: "Plano Pro · MRR > R$ 1k", status: "Encerrado", color: "rgba(255,255,255,0.4)", views: "12.4k", clicks: "1.1k" },
];

const BannerScheduleMockup = () => (
  <div className="rounded-xl p-4 space-y-3" style={{ background: "#0F1115", border: "1px solid rgba(255,255,255,0.06)" }}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Calendar className="w-3.5 h-3.5" style={{ color: "#3498DB" }} />
        <span className="text-[11px] font-semibold text-white">Banners agendados</span>
      </div>
      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(52,152,219,0.1)", color: "#3498DB" }}>3 ativos</span>
    </div>

    <div className="space-y-2">
      {banners.map((b) => (
        <div key={b.title} className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium text-white truncate">{b.title}</div>
              <div className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{b.date}</div>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: `${b.color}15`, color: b.color, border: `1px solid ${b.color}25` }}>
              {b.status}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}>
              {b.segment}
            </span>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1">
                <Eye className="w-2.5 h-2.5" style={{ color: "rgba(255,255,255,0.4)" }} />
                <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>{b.views}</span>
              </div>
              <div className="flex items-center gap-1">
                <MousePointerClick className="w-2.5 h-2.5" style={{ color: "rgba(255,255,255,0.4)" }} />
                <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>{b.clicks}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>

    <button className="w-full rounded-lg py-2 text-[10px] font-medium transition-opacity hover:opacity-90" style={{ background: "rgba(52,152,219,0.1)", color: "#3498DB", border: "1px dashed rgba(52,152,219,0.3)" }}>
      + Agendar novo banner
    </button>
  </div>
);

export default BannerScheduleMockup;
