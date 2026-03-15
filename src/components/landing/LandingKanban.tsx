type LandingKanbanTexts = {
  kanbanLabel: string;
  kanbanH2: string;
  kanbanSub: string;
};

const columns = [
  {
    name: "Onboarding",
    count: 4,
    cards: [
      { initials: "AC", name: "Acme Corp", health: "Healthy", healthColor: "#2ECC71", mrr: "$2.4k" },
      { initials: "TN", name: "TechNova", health: "Healthy", healthColor: "#2ECC71", mrr: "$1.8k" },
    ],
    borderColor: "rgba(52,152,219,0.12)",
  },
  {
    name: "Adoption",
    count: 7,
    cards: [
      { initials: "GS", name: "GlobalSoft", health: "Healthy", healthColor: "#2ECC71", mrr: "$5.2k" },
      { initials: "VX", name: "Vexor Inc", health: "At Risk", healthColor: "#F5B546", mrr: "$3.1k" },
      { initials: "BP", name: "BluePeak", health: "Healthy", healthColor: "#2ECC71", mrr: "$4.7k" },
    ],
    borderColor: "rgba(255,255,255,0.05)",
  },
  {
    name: "Expansion",
    count: 3,
    cards: [
      { initials: "RM", name: "Rampside", health: "Healthy", healthColor: "#2ECC71", mrr: "$12k" },
      { initials: "SP", name: "Spark Labs", health: "Healthy", healthColor: "#2ECC71", mrr: "$8.5k" },
    ],
    borderColor: "rgba(46,204,113,0.12)",
    accent: "#2ECC71",
  },
  {
    name: "At Risk",
    count: 2,
    cards: [
      { initials: "KD", name: "Kodex", health: "Critical", healthColor: "#FF5C5C", mrr: "$6.0k" },
      { initials: "OM", name: "Omega", health: "At Risk", healthColor: "#F5B546", mrr: "$2.9k" },
    ],
    borderColor: "rgba(255,92,92,0.12)",
    accent: "#FF5C5C",
  },
  {
    name: "Renewal",
    count: 5,
    cards: [
      { initials: "FG", name: "Forge Co", health: "Healthy", healthColor: "#2ECC71", mrr: "$9.2k" },
      { initials: "NV", name: "Navex", health: "At Risk", healthColor: "#F5B546", mrr: "$4.4k" },
    ],
    borderColor: "rgba(245,181,70,0.12)",
    accent: "#F5B546",
  },
];

const LandingKanban = ({ t }: { t: LandingKanbanTexts }) => (
  <section className="py-8" style={{ background: "#0F1115" }}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Copy */}
      <div className="mb-10 animate-fade-in-up">
        <p className="text-sm font-medium uppercase tracking-widest mb-3" style={{ color: "#3498DB" }}>
          {t.kanbanLabel}
        </p>
        <h2 className="text-[26px] font-medium text-white mb-3" style={{ lineHeight: 1.28, letterSpacing: "-0.02em" }}>
          {t.kanbanH2}
        </h2>
        <p className="text-[15px]" style={{ color: "rgba(255,255,255,0.45)", maxWidth: 480 }}>
          {t.kanbanSub}
        </p>
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div className="flex gap-3" style={{ minWidth: 900 }}>
          {columns.map((col) => (
            <div
              key={col.name}
              className="flex-1 min-w-[168px] rounded-xl flex flex-col gap-2.5"
              style={{
                background: "#171C28",
                border: `1px solid ${col.borderColor}`,
                padding: "12px",
              }}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
                  {col.name}
                </span>
                <span
                  className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                  style={{
                    background: col.accent ? `${col.accent}18` : "rgba(255,255,255,0.06)",
                    color: col.accent || "rgba(255,255,255,0.45)",
                  }}
                >
                  {col.count}
                </span>
              </div>

              {/* Cards */}
              {col.cards.map((card) => (
                <div
                  key={card.initials}
                  className="rounded-lg p-3 flex flex-col gap-2"
                  style={{
                    background: "#131722",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-semibold flex-shrink-0"
                      style={{ background: "rgba(52,152,219,0.12)", color: "#3498DB" }}
                    >
                      {card.initials}
                    </div>
                    <div
                      className="h-1.5 rounded flex-1"
                      style={{ background: "rgba(255,255,255,0.1)" }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: card.healthColor }}
                      />
                      <span className="text-[10px]" style={{ color: card.healthColor }}>
                        {card.health}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.38)" }}>
                      {card.mrr}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default LandingKanban;
