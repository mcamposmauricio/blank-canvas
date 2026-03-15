import { useNavigate } from "react-router-dom";

type FooterTexts = {
  footerTagline: string;
  footerRights: string;
  footerProduct: string;
  footerCompany: string;
  footerLegal: string;
  footerProductLinks: { label: string; href: string }[];
  footerCompanyLinks: { label: string; href: string }[];
  footerLegalLinks: { label: string; href: string }[];
};

const LandingFooter = ({ t }: { t: FooterTexts }) => {
  const navigate = useNavigate();

  const handleClick = (href: string) => {
    if (href.startsWith("#")) {
      document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth" });
    } else if (href.startsWith("/")) {
      navigate(href);
    }
  };

  return (
    <footer className="py-12 px-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: "#0A0C10" }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <img src="/logo-dark.svg" alt="Journey" className="h-10 w-auto mb-3" />
            <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>{t.footerTagline}</p>
          </div>
          {[
            { title: t.footerProduct, links: t.footerProductLinks },
            { title: t.footerCompany, links: t.footerCompanyLinks },
            { title: t.footerLegal, links: t.footerLegalLinks },
          ].map(({ title, links }) => (
            <div key={title}>
              <div className="text-[11px] font-medium uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>{title}</div>
              <div className="space-y-2.5">
                {links.map(({ label, href }) => (
                  <button
                    key={label}
                    onClick={() => handleClick(href)}
                    className="block text-[13px] bg-transparent border-none cursor-pointer text-left"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#FF7A59")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>© {new Date().getFullYear()} Journey. {t.footerRights}</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-1 rounded" style={{ background: "rgba(46,204,113,0.1)", color: "#2ECC71", border: "1px solid rgba(46,204,113,0.2)" }}>LGPD</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
