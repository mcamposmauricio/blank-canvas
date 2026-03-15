import { MessageSquare, Target, BookOpen, Star, CheckCircle2, Search } from "lucide-react";

type ProductTexts = {
  chatPain: string;
  chatTitle: string;
  chatSub: string;
  chatFeatures: string[];
  csatPain: string;
  csatTitle: string;
  csatSub: string;
  csatFeatures: string[];
  npsPain: string;
  npsTitle: string;
  npsSub: string;
  npsFeatures: string[];
  helpPain: string;
  helpTitle: string;
  helpSub: string;
  helpFeatures: string[];
};

const FeatureList = ({ features, color }: { features: string[]; color: string }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 mt-6">
    {features.map((f) => (
      <div key={f} className="flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} />
        <span className="text-[13px] leading-snug" style={{ color: "rgba(255,255,255,0.6)" }}>{f}</span>
      </div>
    ))}
  </div>
);

/* ── Chat Workspace Mockup ──────────────── */
const ChatWorkspaceMockup = () => (
  <div className="rounded-xl overflow-hidden" style={{ background: "#0F1115", border: "1px solid rgba(255,255,255,0.06)" }}>
    <div className="flex" style={{ minHeight: 320 }}>
      <div className="hidden sm:block w-[140px] border-r flex-shrink-0 p-2 space-y-1.5" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#131722" }}>
        {[
          { name: "João Silva", badge: 2, active: true },
          { name: "Maria Santos", badge: 0, active: false },
          { name: "Pedro Costa", badge: 1, active: false },
        ].map((c) => (
          <div key={c.name} className="flex items-center gap-2 rounded-lg px-2 py-2 cursor-default" style={{ background: c.active ? "rgba(255,122,89,0.1)" : "transparent" }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-semibold" style={{ background: "rgba(255,122,89,0.18)", color: "#FF7A59" }}>
              {c.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-white truncate">{c.name}</div>
            </div>
            {c.badge > 0 && <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ background: "#FF7A59" }}>{c.badge}</div>}
          </div>
        ))}
      </div>
      <div className="flex-1 p-3 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex gap-1.5 items-end">
            <div className="rounded-lg rounded-bl-sm px-2.5 py-1.5 text-[10px]" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}>Oi, preciso de ajuda com a exportação</div>
          </div>
          <div className="flex justify-end">
            <div className="rounded-lg rounded-br-sm px-2.5 py-1.5 text-[10px]" style={{ background: "rgba(255,122,89,0.15)", color: "rgba(255,255,255,0.8)" }}>Claro! Vou verificar seu plano agora...</div>
          </div>
        </div>
        <div className="h-7 rounded-full mt-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }} />
      </div>
      <div className="hidden sm:block w-[130px] border-l flex-shrink-0 p-2.5 space-y-2" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#131722" }}>
        <div className="text-[9px] uppercase tracking-wider font-medium mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Context</div>
        {[["Plan", "Pro"], ["MRR", "$2.4k"], ["Health", "72%"], ["NPS", "9"]].map(([k, v]) => (
          <div key={k}>
            <div className="text-[8px] uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>{k}</div>
            <div className="text-[11px] font-medium text-white">{v}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ── CSAT Dashboard Mockup ──────────────── */
const CSATDashboardMockup = () => (
  <div className="rounded-xl p-4 space-y-3" style={{ background: "#0F1115", border: "1px solid rgba(255,255,255,0.06)" }}>
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>CSAT Score</div>
        <div className="text-3xl font-semibold" style={{ color: "#F59E0B" }}>4.6<span className="text-base font-normal" style={{ color: "rgba(255,255,255,0.3)" }}>/5</span></div>
      </div>
      <div className="text-right">
        <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Responses</div>
        <div className="text-lg font-medium text-white">842</div>
      </div>
    </div>
    {/* Star distribution bars */}
    <div className="space-y-1.5">
      {[
        { stars: 5, pct: 68, color: "#2ECC71" },
        { stars: 4, pct: 18, color: "#F59E0B" },
        { stars: 3, pct: 8, color: "#F5B546" },
        { stars: 2, pct: 4, color: "#FF8C42" },
        { stars: 1, pct: 2, color: "#FF5C5C" },
      ].map((row) => (
        <div key={row.stars} className="flex items-center gap-2">
          <div className="flex gap-0.5 w-[52px]">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-2.5 h-2.5" style={{ color: i < row.stars ? row.color : "rgba(255,255,255,0.1)" }} fill={i < row.stars ? row.color : "none"} />
            ))}
          </div>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color }} />
          </div>
          <div className="text-[9px] w-7 text-right" style={{ color: "rgba(255,255,255,0.4)" }}>{row.pct}%</div>
        </div>
      ))}
    </div>
    {/* Recent feedback */}
    <div className="space-y-1.5">
      {[
        { name: "Ana L.", score: 5, text: "Excelente atendimento!" },
        { name: "Carlos M.", score: 2, text: "Demorou para resolver..." },
      ].map((fb) => (
        <div key={fb.name} className="rounded-lg p-2" style={{ background: fb.score <= 2 ? "rgba(255,92,92,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${fb.score <= 2 ? "rgba(255,92,92,0.1)" : "rgba(255,255,255,0.04)"}` }}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] font-medium text-white">{fb.name}</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-2 h-2" style={{ color: i < fb.score ? "#F59E0B" : "rgba(255,255,255,0.1)" }} fill={i < fb.score ? "#F59E0B" : "none"} />
              ))}
            </div>
          </div>
          <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>{fb.text}</div>
        </div>
      ))}
    </div>
  </div>
);

/* ── NPS Dashboard Mockup ──────────────── */
const NPSDashboardMockup = () => (
  <div className="rounded-xl p-4 space-y-3" style={{ background: "#0F1115", border: "1px solid rgba(255,255,255,0.06)" }}>
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>NPS Score</div>
        <div className="text-3xl font-semibold" style={{ color: "#3498DB" }}>72</div>
      </div>
      <div className="text-right">
        <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Responses</div>
        <div className="text-lg font-medium text-white">1,247</div>
      </div>
    </div>
    <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
      <div className="rounded-l-full" style={{ width: "15%", background: "#FF5C5C88" }} />
      <div style={{ width: "20%", background: "#F5B54688" }} />
      <div className="rounded-r-full" style={{ width: "65%", background: "#2ECC7188" }} />
    </div>
    <div className="grid grid-cols-3 gap-2">
      {[["Detractors", "15%", "#FF5C5C"], ["Passives", "20%", "#F5B546"], ["Promoters", "65%", "#2ECC71"]].map(([l, p, c]) => (
        <div key={l} className="text-center rounded-lg py-2" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="text-sm font-semibold" style={{ color: c }}>{p}</div>
          <div className="text-[8px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{l}</div>
        </div>
      ))}
    </div>
    <div className="rounded-lg p-2.5 flex items-center gap-2" style={{ background: "rgba(255,92,92,0.08)", border: "1px solid rgba(255,92,92,0.12)" }}>
      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,92,92,0.2)" }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#FF5C5C" }} />
      </div>
      <div>
        <div className="text-[10px] font-medium text-white">3 detractors · $12k at risk</div>
      </div>
    </div>
  </div>
);

/* ── Help Center Mockup ──────────────── */
const HelpCenterMockup = () => (
  <div className="rounded-xl p-4 space-y-3" style={{ background: "#0F1115", border: "1px solid rgba(255,255,255,0.06)" }}>
    <div className="rounded-lg px-3 py-2.5 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <Search className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
      <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>Search articles...</span>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {[["Getting Started", "12"], ["Configuration", "8"], ["Chat Widget", "6"], ["Reports", "4"]].map(([t, c]) => (
        <div key={t} className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="text-[10px] font-medium text-white">{t}</div>
          <div className="text-[8px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{c} articles</div>
        </div>
      ))}
    </div>
    <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)" }}>
      <div className="text-[10px] font-medium text-white mb-1">How to install the chat widget</div>
      <div className="h-2 rounded w-full mb-1" style={{ background: "rgba(255,255,255,0.05)" }} />
      <div className="h-2 rounded w-3/4" style={{ background: "rgba(255,255,255,0.03)" }} />
      <div className="text-[8px] mt-1.5" style={{ color: "#2ECC71" }}>92% found helpful</div>
    </div>
  </div>
);

const sections = (t: ProductTexts) => [
  {
    id: "chat",
    icon: MessageSquare,
    color: "#FF7A59",
    pain: t.chatPain,
    title: t.chatTitle,
    sub: t.chatSub,
    features: t.chatFeatures,
    Mockup: ChatWorkspaceMockup,
    reverse: false,
    bg: "#0F1115",
  },
  {
    id: "csat",
    icon: Star,
    color: "#F59E0B",
    pain: t.csatPain,
    title: t.csatTitle,
    sub: t.csatSub,
    features: t.csatFeatures,
    Mockup: CSATDashboardMockup,
    reverse: true,
    bg: "#0D0F13",
  },
  {
    id: "nps",
    icon: Target,
    color: "#3498DB",
    pain: t.npsPain,
    title: t.npsTitle,
    sub: t.npsSub,
    features: t.npsFeatures,
    Mockup: NPSDashboardMockup,
    reverse: false,
    bg: "#0F1115",
  },
  {
    id: "helpcenter",
    icon: BookOpen,
    color: "#2ECC71",
    pain: t.helpPain,
    title: t.helpTitle,
    sub: t.helpSub,
    features: t.helpFeatures,
    Mockup: HelpCenterMockup,
    reverse: true,
    bg: "#0D0F13",
  },
];

const LandingProductSections = ({ t }: { t: ProductTexts }) => (
  <div>
    {sections(t).map(({ id, icon: Icon, color, pain, title, sub, features, Mockup, reverse, bg }) => (
      <section key={id} id={id} className="py-20 px-4" style={{ background: bg }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <div className={`flex flex-col ${reverse ? "" : "lg:order-last"}`}>
            {/* Pain label */}
            <p className="text-[13px] font-medium mb-3" style={{ color }}>{pain}</p>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}14` }}>
                <Icon style={{ color }} className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-medium text-white">{title}</h3>
            </div>
            <p className="text-[14px] leading-relaxed mt-2" style={{ color: "rgba(255,255,255,0.5)", maxWidth: 500 }}>{sub}</p>
            <FeatureList features={features} color={color} />
          </div>
          <div className={`${reverse ? "" : "lg:order-first"}`}>
            <div className="rounded-xl p-5" style={{ background: "#171C28", border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
              <Mockup />
            </div>
          </div>
        </div>
      </section>
    ))}
  </div>
);

export default LandingProductSections;
