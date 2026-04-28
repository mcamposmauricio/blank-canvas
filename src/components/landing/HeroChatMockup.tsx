import { Send, Paperclip, Smile, Search, Circle } from "lucide-react";

const conversations = [
  { name: "João Silva", company: "Acme Tech", preview: "Preciso de ajuda com a exportação...", time: "agora", unread: 2, active: true, online: true },
  { name: "Maria Santos", company: "Beta Corp", preview: "Obrigada pelo atendimento!", time: "5min", unread: 0, active: false, online: true },
  { name: "Pedro Costa", company: "Delta SA", preview: "Como faço pra integrar com o...", time: "12min", unread: 1, active: false, online: false },
  { name: "Ana Lima", company: "Gamma Ltd", preview: "O widget está funcionando", time: "1h", unread: 0, active: false, online: false },
];

const HeroChatMockup = () => (
  <div
    className="rounded-2xl overflow-hidden mx-auto w-full"
    style={{
      background: "#171C28",
      border: "1px solid rgba(255,255,255,0.06)",
      boxShadow: "0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02)",
      maxWidth: 1100,
    }}
  >
    {/* Window chrome */}
    <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "#131722", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#FF5F57" }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#FEBC2E" }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#28C840" }} />
      </div>
      <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>workspace.jornadacliente.com.br</div>
      <div style={{ width: 40 }} />
    </div>

    <div className="flex" style={{ minHeight: 460 }}>
      {/* Left column: conversations */}
      <div className="hidden md:flex flex-col w-[260px] border-r flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.04)", background: "#131722" }}>
        <div className="p-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>Conversas</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,122,89,0.15)", color: "#FF7A59" }}>4</span>
          </div>
          <div className="rounded-lg px-2.5 py-1.5 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.04)" }}>
            <Search className="w-3 h-3" style={{ color: "rgba(255,255,255,0.3)" }} />
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>Buscar...</span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {conversations.map((c) => (
            <div
              key={c.name}
              className="flex items-start gap-2.5 px-3 py-2.5 cursor-default"
              style={{
                background: c.active ? "rgba(255,122,89,0.08)" : "transparent",
                borderLeft: c.active ? "2px solid #FF7A59" : "2px solid transparent",
              }}
            >
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ background: "rgba(255,122,89,0.15)", color: "#FF7A59" }}>
                  {c.name.split(" ").map((n) => n[0]).join("")}
                </div>
                {c.online && <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full border" style={{ background: "#2ECC71", borderColor: "#131722" }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-white truncate">{c.name}</span>
                  <span className="text-[9px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>{c.time}</span>
                </div>
                <div className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.3)" }}>{c.company}</div>
                <div className="text-[11px] truncate mt-0.5" style={{ color: c.unread > 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)" }}>{c.preview}</div>
              </div>
              {c.unread > 0 && (
                <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-1" style={{ background: "#FF7A59" }}>
                  {c.unread}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Center: chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ background: "rgba(255,122,89,0.15)", color: "#FF7A59" }}>JS</div>
            <div>
              <div className="text-[12px] font-medium text-white">João Silva</div>
              <div className="flex items-center gap-1">
                <Circle className="w-1.5 h-1.5" style={{ color: "#2ECC71", fill: "#2ECC71" }} />
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>online · respondendo</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,122,89,0.1)", color: "#FF7A59", border: "1px solid rgba(255,122,89,0.2)" }}>Suporte</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(52,152,219,0.1)", color: "#3498DB", border: "1px solid rgba(52,152,219,0.2)" }}>Pro</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 space-y-3 overflow-hidden" style={{ background: "#0F1320" }}>
          <div className="flex justify-center">
            <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)" }}>Hoje, 14:32</span>
          </div>

          <div className="flex gap-2 items-end max-w-[75%]">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-semibold flex-shrink-0" style={{ background: "rgba(255,122,89,0.15)", color: "#FF7A59" }}>JS</div>
            <div className="rounded-2xl rounded-bl-sm px-3 py-2" style={{ background: "rgba(255,255,255,0.06)" }}>
              <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.85)" }}>Oi! Tô tentando exportar meus contatos mas tá dando erro 😕</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="rounded-2xl rounded-br-sm px-3 py-2 max-w-[75%]" style={{ background: "rgba(255,122,89,0.18)", border: "1px solid rgba(255,122,89,0.25)" }}>
              <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.95)" }}>Oi João! Já tô vendo aqui no seu plano Pro. Pode me dizer qual erro aparece?</p>
              <span className="text-[9px] mt-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>14:32 ✓✓</span>
            </div>
          </div>

          <div className="flex gap-2 items-end max-w-[75%]">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-semibold flex-shrink-0" style={{ background: "rgba(255,122,89,0.15)", color: "#FF7A59" }}>JS</div>
            <div className="rounded-2xl rounded-bl-sm px-3 py-2" style={{ background: "rgba(255,255,255,0.06)" }}>
              <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.85)" }}>Diz "limite de exportação atingido"</p>
            </div>
          </div>

          <div className="flex gap-1.5 items-center">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-semibold flex-shrink-0" style={{ background: "rgba(255,122,89,0.15)", color: "#FF7A59" }}>JS</div>
            <div className="rounded-full px-3 py-1.5 flex gap-1" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: "rgba(255,255,255,0.5)" }} />
              <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: "rgba(255,255,255,0.5)", animationDelay: "0.2s" }} />
              <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: "rgba(255,255,255,0.5)", animationDelay: "0.4s" }} />
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="px-3 py-2.5 border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Paperclip className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
            <span className="flex-1 text-[12px]" style={{ color: "rgba(255,255,255,0.3)" }}>Escreva uma mensagem...</span>
            <Smile className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
            <button className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#FF7A59" }}>
              <Send className="w-3 h-3" style={{ color: "#fff" }} />
            </button>
          </div>
        </div>
      </div>

      {/* Right column: customer context */}
      <div className="hidden lg:flex flex-col w-[240px] border-l flex-shrink-0 p-4" style={{ borderColor: "rgba(255,255,255,0.04)", background: "#131722" }}>
        <div className="flex flex-col items-center text-center pb-4 mb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold mb-2" style={{ background: "rgba(255,122,89,0.18)", color: "#FF7A59" }}>JS</div>
          <div className="text-[12px] font-semibold text-white">João Silva</div>
          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>joao@acmetech.com.br</div>
          <div className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>Acme Tech · CTO</div>
        </div>

        <div className="space-y-3 flex-1">
          {[
            { k: "Plano", v: "Pro", color: "#3498DB" },
            { k: "MRR", v: "R$ 2.400", color: "#2ECC71" },
            { k: "Health Score", v: "72%", color: "#F59E0B" },
            { k: "Último NPS", v: "9 · Promotor", color: "#2ECC71" },
            { k: "Cliente desde", v: "Mar/2024", color: "rgba(255,255,255,0.7)" },
          ].map(({ k, v, color }) => (
            <div key={k}>
              <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{k}</div>
              <div className="text-[12px] font-medium" style={{ color }}>{v}</div>
            </div>
          ))}

          <div>
            <div className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Tags</div>
            <div className="flex flex-wrap gap-1">
              {["VIP", "Onboarding ok", "Tech"].map((tag) => (
                <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          <div className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Conversas anteriores</div>
          <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.6)" }}>14 · última há 3 dias</div>
        </div>
      </div>
    </div>
  </div>
);

export default HeroChatMockup;
