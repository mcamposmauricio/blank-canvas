import { Layers, Activity, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const differentials = [
  { icon: Layers, titleKey: "landing.diff.integrated.title", descKey: "landing.diff.integrated.desc" },
  { icon: Activity, titleKey: "landing.diff.realtime.title", descKey: "landing.diff.realtime.desc" },
  { icon: Sparkles, titleKey: "landing.diff.easy.title", descKey: "landing.diff.easy.desc" },
];

const LandingDifferentials = () => {
  const { t } = useLanguage();

  return (
    <section className="relative z-10 py-16 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl lg:text-2xl font-bold text-white text-center mb-10 animate-fade-in-up">
          {t("landing.diff.title")}
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {differentials.map(({ icon: Icon, titleKey, descKey }, i) => (
            <div
              key={titleKey}
              className={`text-center animate-fade-in-up delay-${(i + 1) * 100}`}
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15">
                <Icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{t(titleKey)}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{t(descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingDifferentials;
