import { MessageSquare, Target, BarChart3 } from "lucide-react";

const ChatMockup = () => (
  <div className="w-full rounded-lg overflow-hidden mt-5" style={{ background: "#0F1115", border: "1px solid rgba(255,255,255,0.05)" }}>
    {/* Header */}
    <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "#131722" }}>
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold" style={{ background: "rgba(255,122,89,0.18)", color: "#FF7A59" }}>JN</div>
      <div className="flex-1">
        <div className="h-2 w-16 rounded" style={{ background: "rgba(255,255,255,0.15)" }} />
        <div className="h-1.5 w-10 rounded mt-1" style={{ background: "rgba(255,255,255,0.08)" }} />
      </div>
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#2ECC71" }} />
    </div>
    {/* Messages */}
    <div className="p-3 space-y-2.5">
      <div className="flex justify-start">
        <div className="rounded-lg rounded-tl-none px-3 py-2 max-w-[78%]" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-1.5 w-28 rounded" style={{ background: "rgba(255,255,255,0.18)" }} />
          <div className="h-1.5 w-20 rounded mt-1.5" style={{ background: "rgba(255,255,255,0.1)" }} />
        </div>
      </div>
      <div className="flex justify-end">
        <div className="rounded-lg rounded-tr-none px-3 py-2 max-w-[78%]" style={{ background: "rgba(255,122,89,0.16)" }}>
          <div className="h-1.5 w-24 rounded" style={{ background: "rgba(255,255,255,0.18)" }} />
        </div>
      </div>
      <div className="flex justify-start">
        <div className="rounded-lg rounded-tl-none px-3 py-2 max-w-[78%]" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-1.5 w-32 rounded" style={{ background: "rgba(255,255,255,0.18)" }} />
        </div>
      </div>
      <div className="flex justify-end">
        <div className="rounded-lg rounded-tr-none px-3 py-2 max-w-[78%]" style={{ background: "rgba(255,122,89,0.16)" }}>
          <div className="h-1.5 w-16 rounded" style={{ background: "rgba(255,255,255,0.18)" }} />
          <div className="h-1.5 w-20 rounded mt-1.5" style={{ background: "rgba(255,255,255,0.1)" }} />
        </div>
      </div>
    </div>
    <div className="px-3 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "#131722" }}>
      <div className="h-7 rounded-full" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }} />
    </div>
  </div>
);

const NPSMockup = () => (
  <div className="w-full rounded-lg mt-5 p-4 space-y-3" style={{ background: "#0F1115", border: "1px solid rgba(255,255,255,0.05)" }}>
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[11px] uppercase tracking-wider font-medium mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>NPS Score</div>
        <div className="text-4xl font-semibold" style={{ color: "#FF7A59" }}>72</div>
      </div>
      <div className="text-right">
        <div className="text-[11px] mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>Responses</div>
        <div className="text-lg font-medium text-white">1,247</div>
      </div>
    </div>
    {/* Score bar */}
    <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
      <div className="rounded-l-full" style={{ width: "15%", background: "#FF5C5C88" }} />
      <div style={{ width: "20%", background: "#F5B54688" }} />
      <div className="rounded-r-full" style={{ width: "65%", background: "#2ECC7188" }} />
    </div>
    <div className="grid grid-cols-3 gap-2">
      {[
        ["Detractors", "15%", "#FF5C5C"],
        ["Passives", "20%", "#F5B546"],
        ["Promoters", "65%", "#2ECC71"],
      ].map(([label, pct, color]) => (
        <div key={label} className="text-center rounded-lg py-2" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="text-sm font-semibold" style={{ color }}>{pct}</div>
          <div className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>{label}</div>
        </div>
      ))}
    </div>
  </div>
);

const DashboardMockup = () => (
  <div className="w-full rounded-lg mt-5 p-3 space-y-3" style={{ background: "#0F1115", border: "1px solid rgba(255,255,255,0.05)" }}>
    <div className="grid grid-cols-2 gap-2">
      {[
        ["MRR", "$142k", "#3498DB"],
        ["Churn", "2.1%", "#FF5C5C"],
        ["Health", "78%", "#2ECC71"],
        ["CSAT", "4.6 / 5", "#F5B546"],
      ].map(([label, val, color]) => (
        <div key={label} className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</div>
          <div className="text-sm font-semibold" style={{ color }}>{val}</div>
        </div>
      ))}
    </div>
    <svg viewBox="0 0 200 36" className="w-full h-8">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3498DB" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#3498DB" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0,32 Q30,28 60,22 T120,14 T170,16 T200,8 V36 H0 Z" fill="url(#chartGrad)" />
      <path d="M0,32 Q30,28 60,22 T120,14 T170,16 T200,8" fill="none" stroke="#3498DB" strokeWidth="1.5" />
    </svg>
  </div>
);

type LandingTexts = {
  featuresLabel: string;
  featuresH2a: string;
  featuresH2b: string;
  featuresSub: string;
  feature1Title: string;
  feature1Desc: string;
  feature2Title: string;
  feature2Desc: string;
  feature3Title: string;
  feature3Desc: string;
};

type FeatureRowsTexts = {
  feature1Title: string;
  feature1Desc: string;
  feature2Title: string;
  feature2Desc: string;
  feature3Title: string;
  feature3Desc: string;
};

export const LandingFeatureRows = ({ t }: { t: FeatureRowsTexts }) => {
  const rows = [
    {
      icon: MessageSquare,
      iconColor: "#FF7A59",
      title: t.feature1Title,
      desc: t.feature1Desc,
      Mockup: ChatMockup,
      cardRight: false,
    },
    {
      icon: Target,
      iconColor: "#3498DB",
      title: t.feature2Title,
      desc: t.feature2Desc,
      Mockup: NPSMockup,
      cardRight: true,
    },
    {
      icon: BarChart3,
      iconColor: "#2ECC71",
      title: t.feature3Title,
      desc: t.feature3Desc,
      Mockup: DashboardMockup,
      cardRight: false,
    },
  ];

  return (
    <div style={{ background: "#0F1115" }}>
      {rows.map(({ icon: Icon, iconColor, title, desc, Mockup, cardRight }, i) => (
        <section key={i} className="py-10 px-4" style={{ background: "#0F1115" }}>
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            {/* Text side — always first in DOM (mobile), conditionally ordered on desktop */}
            <div className={`flex flex-col gap-4 ${!cardRight ? "lg:order-last" : ""}`}>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${iconColor}14` }}
                >
                  <Icon style={{ color: iconColor }} className="w-5 h-5" />
                </div>
                <h3 className="text-[20px] font-medium text-white">{title}</h3>
              </div>
              <p className="text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                {desc}
              </p>
            </div>

            {/* Card side */}
            <div className={`${!cardRight ? "lg:order-first" : ""}`}>
              <div
                className="rounded-xl p-6"
                style={{
                  background: "#171C28",
                  border: "1px solid rgba(255,255,255,0.05)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              >
                <Mockup />
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
};

const LandingFeatures = ({ t }: { t: LandingTexts }) => {
  const features = [
    {
      key: "chat",
      icon: MessageSquare,
      iconColor: "#FF7A59",
      title: t.feature1Title,
      desc: t.feature1Desc,
      Mockup: ChatMockup,
    },
    {
      key: "nps",
      icon: Target,
      iconColor: "#3498DB",
      title: t.feature2Title,
      desc: t.feature2Desc,
      Mockup: NPSMockup,
    },
    {
      key: "dashboard",
      icon: BarChart3,
      iconColor: "#2ECC71",
      title: t.feature3Title,
      desc: t.feature3Desc,
      Mockup: DashboardMockup,
    },
  ];

  return (
    <section className="py-14" style={{ background: "#0F1115" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 animate-fade-in-up">
          <p className="text-sm font-medium uppercase tracking-widest mb-3" style={{ color: "#2ECC71" }}>
            {t.featuresLabel}
          </p>
          <h2 className="text-[26px] font-medium text-white mb-3" style={{ lineHeight: 1.28, letterSpacing: "-0.02em" }}>
            {t.featuresH2a}<br />{t.featuresH2b}
          </h2>
          <p className="text-[15px]" style={{ color: "rgba(255,255,255,0.45)", maxWidth: 500, margin: "0 auto" }}>
            {t.featuresSub}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {features.map(({ key, icon: Icon, iconColor, title, desc, Mockup }, i) => (
            <div
              key={key}
              className={`rounded-xl p-6 flex flex-col animate-fade-in-up delay-${(i + 1) * 100}`}
              style={{
                background: "#171C28",
                border: "1px solid rgba(255,255,255,0.05)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${iconColor}14` }}
                >
                  <Icon style={{ color: iconColor }} className="w-4 h-4" />
                </div>
                <h3 className="text-[14px] font-medium text-white">{title}</h3>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{desc}</p>
              <Mockup />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingFeatures;
