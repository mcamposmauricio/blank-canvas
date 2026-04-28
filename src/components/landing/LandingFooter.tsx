const LandingFooter = () => {
  const handleScroll = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const productLinks = [
    { label: "Chat", target: "chat" },
    { label: "Fila inteligente", target: "fila" },
    { label: "Help Center", target: "helpcenter" },
    { label: "CSAT", target: "csat" },
    { label: "Banners agendados", target: "banners" },
  ];

  const companyLinks = [
    { label: "Preços", target: "precos" },
    { label: "FAQ", target: "faq" },
    { label: "Começar grátis", target: "early-access" },
  ];

  return (
    <footer className="py-14 px-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: "#0A0C10" }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <img src="/logo-dark.svg" alt="Journey" className="h-10 w-auto mb-3" />
            <p className="text-[12px] leading-relaxed max-w-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              A plataforma de atendimento que startups brasileiras estavam esperando.
            </p>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>Produto</div>
            <div className="space-y-2.5">
              {productLinks.map(({ label, target }) => (
                <button
                  key={label}
                  onClick={() => handleScroll(target)}
                  className="block text-[13px] bg-transparent border-none cursor-pointer text-left"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#FF7A59")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>Empresa</div>
            <div className="space-y-2.5">
              {companyLinks.map(({ label, target }) => (
                <button
                  key={label}
                  onClick={() => handleScroll(target)}
                  className="block text-[13px] bg-transparent border-none cursor-pointer text-left"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#FF7A59")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                >
                  {label}
                </button>
              ))}
              <a
                href="mailto:contato@jornadacliente.com.br"
                className="block text-[13px]"
                style={{ color: "rgba(255,255,255,0.5)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FF7A59")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
              >
                Falar com vendas
              </a>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            © {new Date().getFullYear()} Journey. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-1 rounded font-medium" style={{ background: "rgba(46,204,113,0.1)", color: "#2ECC71", border: "1px solid rgba(46,204,113,0.2)" }}>LGPD compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
