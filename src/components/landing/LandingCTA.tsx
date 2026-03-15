import LeadForm, { type LeadFormTexts } from "./LeadForm";

type CTATexts = {
  formLabel: string;
  formH2: string;
  formSub: string;
  formFootnote: string;
};

const LandingCTA = ({ t, formTexts }: { t: CTATexts; formTexts: LeadFormTexts }) => (
  <section id="early-access" className="py-16 px-4 relative overflow-hidden" style={{ background: "#0F1115" }}>
    <div className="absolute pointer-events-none" style={{ bottom: 0, left: "50%", transform: "translateX(-50%)", width: 700, height: 280, background: "radial-gradient(ellipse, rgba(61,165,244,0.04) 0%, transparent 70%)" }} />
    <div className="relative z-10 max-w-lg mx-auto">
      <div className="text-center mb-10">
        <p className="text-sm font-medium uppercase tracking-widest mb-3" style={{ color: "#3DA5F4" }}>{t.formLabel}</p>
        <h2 className="text-[26px] font-medium text-white mb-3" style={{ lineHeight: 1.25, letterSpacing: "-0.02em" }}>{t.formH2}</h2>
        <p className="text-[15px]" style={{ color: "rgba(255,255,255,0.45)" }}>{t.formSub}</p>
      </div>
      <div className="rounded-xl p-5 sm:p-8" style={{ background: "#131722", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
        <LeadForm t={formTexts} layout="stacked" />
        <p className="text-center text-[11px] mt-4" style={{ color: "rgba(255,255,255,0.28)" }}>{t.formFootnote}</p>
      </div>
    </div>
  </section>
);

export default LandingCTA;
