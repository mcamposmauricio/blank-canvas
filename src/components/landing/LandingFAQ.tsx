import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqItems = [
  {
    q: "Quanto tempo leva pra instalar?",
    a: "5 minutos. Literalmente. É uma linha de código no seu site e o widget tá rodando.",
  },
  {
    q: "Preciso de cartão de crédito?",
    a: "Não. O plano grátis é grátis de verdade. Cartão só quando você decidir subir pro Growth.",
  },
  {
    q: "Funciona com qualquer site?",
    a: "Se roda no browser, funciona. React, Next, WordPress, Webflow, HTML puro — qualquer coisa.",
  },
  {
    q: "Como funciona a distribuição automática?",
    a: "Você escolhe entre Round Robin (divide igual) ou Least Busy (manda pro mais livre), define regras por categoria e limite de conversas simultâneas por atendente, e o sistema respeita seu horário comercial. O resto é com a gente.",
  },
  {
    q: "Dá pra integrar com meu CRM?",
    a: "Tem API REST e webhooks documentados. Estamos construindo integrações nativas — me chama que a gente prioriza a sua.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Sim. Infraestrutura na AWS, criptografia em trânsito e em repouso, compliance LGPD.",
  },
  {
    q: "Tem contrato de fidelidade?",
    a: "Não. Cancela quando quiser, sem multa, sem burocracia.",
  },
  {
    q: "Qual a diferença pro Intercom?",
    a: "O Journey faz o que 90% dos times realmente usam no Intercom, por uma fração do preço, em português e com suporte de quem construiu o produto.",
  },
];

const LandingFAQ = () => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 lg:py-28 px-4" style={{ background: "#0D0F13" }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[12px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#FF7A59" }}>FAQ</p>
          <h2 className="font-medium text-white" style={{ fontSize: "clamp(24px, 3vw, 36px)", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            Perguntas que o pessoal sempre faz
          </h2>
        </div>
        <div className="space-y-2">
          {faqItems.map(({ q, a }, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden transition-colors duration-200"
              style={{
                background: "#131722",
                border: open === i ? "1px solid rgba(255,122,89,0.3)" : "1px solid rgba(255,255,255,0.05)",
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
                  <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{a}</p>
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
