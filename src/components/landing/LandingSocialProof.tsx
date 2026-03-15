type SocialProofTexts = {
  socialTitle: string;
  socialSub: string;
  metrics: { value: string; label: string }[];
};

const LandingSocialProof = ({ t }: { t: SocialProofTexts }) => (
  <section className="py-10 px-4" style={{ background: "#0D0F13", borderTop: "1px solid rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
    <div className="max-w-5xl mx-auto text-center">
      <p className="text-[11px] uppercase tracking-widest mb-6" style={{ color: "rgba(255,255,255,0.3)" }}>{t.socialSub}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-14">
        {t.metrics.map(({ value, label }) => (
          <div key={label} className="flex items-baseline justify-center gap-2">
            <span className="text-2xl font-semibold text-white">{value}</span>
            <span className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default LandingSocialProof;
