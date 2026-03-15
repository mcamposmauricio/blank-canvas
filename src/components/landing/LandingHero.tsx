import { MessageSquare, Star, Target, BookOpen } from "lucide-react";
import LeadForm, { type LeadFormTexts } from "./LeadForm";

type HeroTexts = {
  heroBadge: string;
  heroH1: string;
  heroSub: string;
  heroSubCta: string;
  heroBadgeChat: string;
  heroBadgeCSAT: string;
  heroBadgeNPS: string;
  heroBadgeHelp: string;
};

const LandingHero = ({ t, formTexts }: { t: HeroTexts; formTexts: LeadFormTexts }) => {
  const badges = [
    { label: t.heroBadgeChat, icon: MessageSquare, color: "#FF7A59" },
    { label: t.heroBadgeCSAT, icon: Star, color: "#F59E0B" },
    { label: t.heroBadgeNPS, icon: Target, color: "#3498DB" },
    { label: t.heroBadgeHelp, icon: BookOpen, color: "#2ECC71" },
  ];

  return (
    <section className="relative py-20 lg:py-28 px-4 overflow-hidden" style={{ background: "#0F1115" }}>
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%, -50%)", width: "min(800px, 100%)", height: 500, background: "radial-gradient(ellipse, rgba(255,122,89,0.06) 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium uppercase tracking-widest mb-8"
          style={{ background: "rgba(255,122,89,0.08)", border: "1px solid rgba(255,122,89,0.18)", color: "rgba(255,122,89,0.85)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {t.heroBadge}
        </div>

        {/* Headline */}
        <h1
          className="font-medium text-white mb-4"
          style={{ fontSize: "clamp(28px, 4vw, 46px)", lineHeight: 1.15, letterSpacing: "-0.03em" }}
        >
          {t.heroH1}
        </h1>

        {/* Subtitle */}
        <p className="mb-8 max-w-lg" style={{ fontSize: "clamp(14px, 1.4vw, 16px)", lineHeight: 1.7, color: "rgba(255,255,255,0.5)" }}>
          {t.heroSub}
        </p>

        {/* Form */}
        <div className="w-full max-w-xl">
          <LeadForm t={formTexts} layout="inline" />
        </div>
        <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.28)" }}>{t.heroSubCta}</p>

        {/* Module badges */}
        <div className="flex flex-wrap justify-center gap-3 mt-10">
          {badges.map(({ label, icon: Icon, color }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full text-[12px] font-medium"
              style={{ background: `${color}10`, border: `1px solid ${color}25`, color }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
