import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

interface LandingNavbarProps {
  isLoggedIn: boolean;
  onCtaClick: () => void;
}

const navLinks = [
  { label: "Produto", target: "produto" },
  { label: "Preços", target: "precos" },
  { label: "FAQ", target: "faq" },
];

const LandingNavbar = ({ isLoggedIn, onCtaClick }: LandingNavbarProps) => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      className="sticky top-0 z-50"
      style={{ background: "rgba(15,17,21,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <img src="/logo-dark.svg" alt="Journey" className="h-12 w-auto" />
        </div>

        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <button
              key={link.target}
              onClick={() => scrollTo(link.target)}
              className="text-sm transition-colors duration-150 bg-transparent border-none cursor-pointer"
              style={{ color: "rgba(255,255,255,0.55)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FF7A59")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
            >
              {link.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => navigate(isLoggedIn ? "/home" : "/auth")}
            className="hidden lg:inline-flex items-center justify-center text-sm px-4 h-9 rounded-lg transition-colors duration-150 whitespace-nowrap"
            style={{ color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.12)", background: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
          >
            {isLoggedIn ? "Dashboard" : "Entrar"}
          </button>
          <button
            onClick={onCtaClick}
            className="hidden lg:inline-flex items-center justify-center text-sm px-5 h-9 rounded-lg font-medium transition-opacity duration-150 hover:opacity-90 whitespace-nowrap"
            style={{ background: "#FF7A59", color: "#fff" }}
          >
            Começar grátis
          </button>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 rounded-lg" style={{ color: "rgba(255,255,255,0.6)", background: "transparent" }}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden px-4 pb-4 space-y-1" style={{ background: "rgba(15,17,21,0.98)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {navLinks.map((link) => (
            <button key={link.target} onClick={() => scrollTo(link.target)} className="block w-full text-left py-3 text-sm border-none bg-transparent" style={{ color: "rgba(255,255,255,0.7)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              {link.label}
            </button>
          ))}
          <div className="flex gap-2 pt-3">
            <button onClick={() => { setMobileOpen(false); navigate(isLoggedIn ? "/home" : "/auth"); }} className="flex-1 text-sm py-2.5 rounded-lg" style={{ color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.08)", background: "transparent" }}>
              {isLoggedIn ? "Dashboard" : "Entrar"}
            </button>
            <button onClick={() => { setMobileOpen(false); onCtaClick(); }} className="flex-1 text-sm py-2.5 rounded-lg font-medium" style={{ background: "#FF7A59", color: "#fff" }}>
              Começar grátis
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default LandingNavbar;
