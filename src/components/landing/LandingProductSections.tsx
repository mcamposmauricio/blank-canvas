import { MessageSquare, BookOpen, Star, CheckCircle2, Search, GitBranch, Megaphone } from "lucide-react";
import QueueRulesMockup from "./QueueRulesMockup";
import BannerScheduleMockup from "./BannerScheduleMockup";

const FeatureList = ({ features, color }: { features: string[]; color: string }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 mt-6">
    {features.map((f) => (
      <div key={f} className="flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} />
        <span className="text-[13px] leading-snug" style={{ color: "rgba(255,255,255,0.65)" }}>{f}</span>
      </div>
    ))}
  </div>
);

/* ── Chat workspace mockup (interno do bloco) ──────────────── */
const ChatBlockMockup = () => (
  <div className="rounded-xl overflow-hidden" style={{ background: "#0F1115", border: "1px solid rgba(255,255,255,0.06)" }}>
    <div className="flex" style={{ minHeight: 320 }}>
      <div className="hidden sm:block w-[140px] border-r flex-shrink-0 p-2 space-y-1.5" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#131722" }}>
        {[
          { name: "João Silva", badge: 2, active: true },
          { name: "Maria Santos", badge: 0, active: false },
          { name: "Pedro Costa", badge: 1, active: false },
        ].map((c) => (
          <div key={c.name} className="flex items-center gap-2 rounded-lg px-2 py-2" style={{ background: c.active ? "rgba(255,122,89,0.1)" : "transparent" }}>
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
            <div className="rounded-lg rounded-bl-sm px-2.5 py-1.5 text-[10px]" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.75)" }}>Oi, preciso de ajuda com a exportação</div>
          </div>
          <div className="flex justify-end">
            <div className="rounded-lg rounded-br-sm px-2.5 py-1.5 text-[10px]" style={{ background: "rgba(255,122,89,0.18)", color: "rgba(255,255,255,0.9)" }}>Claro! Vou verificar seu plano agora...</div>
          </div>
        </div>
        <div className="h-7 rounded-full mt-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }} />
      </div>
      <div className="hidden sm:block w-[130px] border-l flex-shrink-0 p-2.5 space-y-2" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#131722" }}>
        <div className="text-[9px] uppercase tracking-wider font-medium mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>Contexto</div>
        {[["Plano", "Pro"], ["MRR", "R$ 2.4k"], ["Health", "72%"], ["NPS", "9"]].map(([k, v]) => (
          <div key={k}>
            <div className="text-[8px] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>{k}</div>
            <div className="text-[11px] font-medium text-white">{v}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ── CSAT mockup ──────────────── */
const CSATDashboardMockup = () => (
  <div className="rounded-xl p-4 space-y-3" style={{ background: "#0F1115", border: "1px solid rgba(255,255,255,0.06)" }}>
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>CSAT médio</div>
        <div className="text-3xl font-semibold" style={{ color: "#F59E0B" }}>4.6<span className="text-base font-normal" style={{ color: "rgba(255,255,255,0.35)" }}>/5</span></div>
      </div>
      <div className="text-right">
        <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Respostas</div>
        <div className="text-lg font-medium text-white">842</div>
      </div>
    </div>
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
          <div className="text-[9px] w-7 text-right" style={{ color: "rgba(255,255,255,0.45)" }}>{row.pct}%</div>
        </div>
      ))}
    </div>
    <div className="space-y-1.5">
      {[
        { name: "Ana L.", score: 5, text: "Excelente atendimento!" },
        { name: "Carlos M.", score: 2, text: "Demorou pra resolver…" },
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
          <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.55)" }}>{fb.text}</div>
        </div>
      ))}
    </div>
  </div>
);

/* ── Help Center mockup ──────────────── */
const HelpCenterMockup = () => (
  <div className="rounded-xl p-4 space-y-3" style={{ background: "#0F1115", border: "1px solid rgba(255,255,255,0.06)" }}>
    <div className="rounded-lg px-3 py-2.5 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <Search className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.35)" }} />
      <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>Buscar na central de ajuda…</span>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {[["Primeiros passos", "12 artigos"], ["Configuração", "8 artigos"], ["Widget", "6 artigos"], ["Relatórios", "4 artigos"]].map(([t, c]) => (
        <div key={t} className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="text-[10px] font-medium text-white">{t}</div>
          <div className="text-[8px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{c}</div>
        </div>
      ))}
    </div>
    <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)" }}>
      <div className="text-[10px] font-medium text-white mb-1">Como instalar o widget de chat</div>
      <div className="h-2 rounded w-full mb-1" style={{ background: "rgba(255,255,255,0.05)" }} />
      <div className="h-2 rounded w-3/4" style={{ background: "rgba(255,255,255,0.03)" }} />
      <div className="text-[8px] mt-1.5" style={{ color: "#2ECC71" }}>92% acharam útil</div>
    </div>
  </div>
);

const sections = [
  {
    id: "chat",
    icon: MessageSquare,
    color: "#FF7A59",
    pain: "Chat em tempo real",
    title: "Chat ao vivo com contexto de quem tá do outro lado",
    sub: "Seu time atende com o histórico completo do cliente do lado. Sem pedir pra repetir o problema, sem abrir 3 abas pra entender quem é.",
    features: [
      "Widget instalável com 1 linha de código",
      "Painel de contexto: plano, MRR, health, NPS",
      "Busca de artigos do Help Center dentro do chat",
      "Histórico completo de conversas por cliente",
      "Indicadores de tempo de resposta e resolução",
      "Widget customizável: cor, posição, mensagem",
    ],
    Mockup: ChatBlockMockup,
    reverse: false,
    bg: "#0F1115",
  },
  {
    id: "fila",
    icon: GitBranch,
    color: "#FF7A59",
    pain: "Fila inteligente",
    title: "Cada conversa cai no atendente certo, sem ninguém empurrando",
    sub: "Round Robin, Least Busy ou regras condicionais que você monta — por categoria, time, capacidade ou MRR. O sistema distribui em segundos respeitando seu horário comercial.",
    features: [
      "Round Robin (distribui igual entre o time)",
      "Least Busy (manda pro atendente mais livre)",
      "Regras por categoria, time ou MRR",
      "Limite de conversas simultâneas por agente",
      "Respeita horário comercial e breaks",
      "Mensagem automática fora do expediente",
    ],
    Mockup: QueueRulesMockup,
    reverse: true,
    bg: "#0D0F13",
  },
  {
    id: "helpcenter",
    icon: BookOpen,
    color: "#2ECC71",
    pain: "Base de conhecimento",
    title: "Uma resposta que o cliente acha sozinho é um ticket que seu time não atende",
    sub: "Portal público com a cara da sua empresa. Seus clientes pesquisam, encontram e resolvem — e você mede o que tá funcionando e o que não tá.",
    features: [
      "Portal customizável: logo, cores, domínio próprio",
      "Editor rico com imagens e vídeo",
      "Coleções organizadas com ícones",
      "Busca integrada no widget de chat",
      "Feedback \"Foi útil?\" com métricas",
      "Importação de artigos em massa",
    ],
    Mockup: HelpCenterMockup,
    reverse: false,
    bg: "#0F1115",
  },
  {
    id: "csat",
    icon: Star,
    color: "#F59E0B",
    pain: "CSAT",
    title: "Descubra o que o cliente sentiu 30 segundos depois do atendimento",
    sub: "Pesquisa automática no fim de cada conversa. Sem depender de email, sem esperar dias. O feedback chega quente.",
    features: [
      "Pesquisa automática ao encerrar o chat",
      "Escala de 1 a 5 estrelas com comentário",
      "Dashboard com tendência ao longo do tempo",
      "Filtros por atendente, time, empresa e período",
      "Alerta automático em nota baixa",
      "Exportação dos dados",
    ],
    Mockup: CSATDashboardMockup,
    reverse: true,
    bg: "#0D0F13",
  },
  {
    id: "banners",
    icon: Megaphone,
    color: "#3498DB",
    pain: "Banners agendados",
    title: "Avisa antes de virar ticket",
    sub: "Manutenção, novidade, promoção — tudo agendado com hora de início e fim, segmentado por plano, MRR ou tag. Seu time atende menos perguntas óbvias.",
    features: [
      "Agendamento por data e hora",
      "Segmentação por plano, MRR ou tag",
      "Banners no widget de chat e no portal",
      "Métricas de visualização e clique",
      "Encerramento automático no fim da janela",
      "Recorrência pra avisos periódicos",
    ],
    Mockup: BannerScheduleMockup,
    reverse: false,
    bg: "#0F1115",
  },
];

const LandingProductSections = () => (
  <div id="produto">
    {sections.map(({ id, icon: Icon, color, pain, title, sub, features, Mockup, reverse, bg }) => (
      <section key={id} id={id} className="py-24 lg:py-28 px-4" style={{ background: bg }}>
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <div className={`flex flex-col ${reverse ? "" : "lg:order-last"}`}>
            <p className="text-[12px] font-semibold uppercase tracking-widest mb-3" style={{ color }}>{pain}</p>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}14` }}>
                <Icon style={{ color }} className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-[22px] lg:text-[26px] font-semibold text-white leading-tight" style={{ letterSpacing: "-0.02em" }}>{title}</h3>
            <p className="text-[14px] leading-relaxed mt-3" style={{ color: "rgba(255,255,255,0.55)", maxWidth: 520 }}>{sub}</p>
            <FeatureList features={features} color={color} />
          </div>
          <div className={`${reverse ? "" : "lg:order-first"}`}>
            <div className="rounded-2xl p-5" style={{ background: "#171C28", border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 16px 48px rgba(0,0,0,0.45)" }}>
              <Mockup />
            </div>
          </div>
        </div>
      </section>
    ))}
  </div>
);

export default LandingProductSections;
