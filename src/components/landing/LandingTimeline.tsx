type LandingTimelineTexts = {
  timelineLabel: string;
  timelineH2: string;
  timelineSub: string;
};

const timelineEvents = [
  { dot: "#3498DB", label: "NPS: 9 — Promoter", sub: "Submitted via email campaign", time: "2d ago" },
  { dot: "#3498DB", label: "Support chat closed", sub: "Resolved in 4 min · CSAT 5/5", time: "5d ago" },
  { dot: "#2ECC71", label: "Feature adoption +40%", sub: "Analytics module usage spike", time: "1w ago" },
  { dot: "#FF5C5C", label: "Health dropped to 52", sub: "Risk alert triggered automatically", time: "2w ago" },
  { dot: "#2ECC71", label: "Upsell signal detected", sub: "3 users activated Premium features", time: "3w ago" },
  { dot: "#F5B546", label: "Renewal in 30 days", sub: "Action assigned to CSM · $12k ARR", time: "1mo ago" },
];

const LandingTimeline = ({ t }: { t: LandingTimelineTexts }) => (
  <section className="py-8" style={{ background: "#0F1115" }}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Left copy */}
        <div className="animate-fade-in-up">
          <p className="text-sm font-medium uppercase tracking-widest mb-3" style={{ color: "#FF7A59" }}>
            {t.timelineLabel}
          </p>
          <h2
            className="text-[26px] font-medium text-white mb-4"
            style={{ lineHeight: 1.28, letterSpacing: "-0.02em" }}
          >
            {t.timelineH2.split("\n").map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </h2>
          <p className="text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)", maxWidth: 400 }}>
            {t.timelineSub}
          </p>
        </div>

        {/* Right mockup */}
        <div
          className="rounded-xl overflow-hidden animate-fade-in-up delay-200"
          style={{
            background: "#171C28",
            border: "1px solid rgba(255,255,255,0.05)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
          }}
        >
          {/* Account header */}
          <div
            className="flex flex-wrap items-center gap-3 px-5 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "#131722" }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0"
            style={{ background: "rgba(52,152,219,0.12)", color: "#3498DB" }}
            >
              RM
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white">Rampside Inc.</div>
              <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>Enterprise · SaaS</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: "rgba(46,204,113,0.12)", color: "#2ECC71" }}
              >
                ● Health 84
              </span>
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: "rgba(52,152,219,0.08)", color: "#3498DB" }}
              >
                $12k MRR
              </span>
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: "rgba(245,181,70,0.1)", color: "#F5B546" }}
              >
                Renewal soon
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="px-5 py-5">
            <div className="text-[11px] font-medium uppercase tracking-wider mb-4" style={{ color: "rgba(255,255,255,0.25)" }}>
              Activity Timeline
            </div>
            <div className="relative">
              {/* Vertical line */}
              <div
                className="absolute left-[7px] top-2 bottom-2"
                style={{ width: 1, background: "rgba(255,255,255,0.06)" }}
              />
              <div className="flex flex-col gap-4">
                {timelineEvents.map((ev, i) => (
                  <div key={i} className="flex items-start gap-4 pl-1">
                    <div
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-0.5"
                      style={{
                        background: ev.dot,
                        boxShadow: `0 0 0 3px ${ev.dot}18`,
                        zIndex: 1,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-medium text-white">{ev.label}</span>
                        <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.28)" }}>
                          {ev.time}
                        </span>
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {ev.sub}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default LandingTimeline;
