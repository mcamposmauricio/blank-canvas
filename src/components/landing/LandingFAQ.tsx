import { useState } from "react";
import { ChevronDown } from "lucide-react";

type FAQTexts = {
  faqTitle: string;
  faqItems: { q: string; a: string }[];
};

const LandingFAQ = ({ t }: { t: FAQTexts }) => {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-16 px-4" style={{ background: "#0D0F13" }}>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl font-medium text-white text-center mb-10">{t.faqTitle}</h2>
        <div className="space-y-2">
          {t.faqItems.map(({ q, a }, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden transition-colors duration-200"
              style={{
                background: "#131722",
                border: open === i ? "1px solid rgba(255,122,89,0.25)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left bg-transparent border-none cursor-pointer"
              >
                <span className="text-[14px] font-medium text-white pr-4">{q}</span>
                <ChevronDown
                  className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
                  style={{ color: open === i ? "#FF7A59" : "rgba(255,255,255,0.4)", transform: open === i ? "rotate(180deg)" : "rotate(0)" }}
                />
              </button>
              {open === i && (
                <div className="px-5 pb-4">
                  <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingFAQ;
