import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

interface HelpSiteSettings {
  home_title?: string;
  brand_logo_url?: string | null;
  brand_primary_color?: string;
  brand_secondary_color?: string;
  header_bg_color?: string | null;
  header_links_json?: Array<{ label: string; url: string }> | null;
  footer_logo_url?: string | null;
  footer_text?: string | null;
  footer_bg_color?: string | null;
  footer_links_json?: Array<{ label: string; url: string }> | null;
  footer_social_json?: Array<{ type: string; url: string }> | null;
  favicon_url?: string | null;
}

interface HelpPublicLayoutProps {
  children: React.ReactNode;
  settings: HelpSiteSettings | null;
  helpBase: string;
}

const socialIcons: Record<string, React.ReactNode> = {
  linkedin: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
  ),
  twitter: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  ),
  instagram: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
  ),
  facebook: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  ),
  youtube: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
  ),
};

export default function HelpPublicLayout({ children, settings, helpBase }: HelpPublicLayoutProps) {
  const primaryColor = settings?.brand_primary_color || "#3B82F6";
  const headerBg = settings?.header_bg_color || "#ffffff";
  const footerBg = settings?.footer_bg_color || "#111827";
  const headerLinks = settings?.header_links_json || [];
  const footerLinks = settings?.footer_links_json || [];
  const footerSocial = settings?.footer_social_json || [];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Set favicon
  useEffect(() => {
    if (settings?.favicon_url) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = settings.favicon_url;
    }
  }, [settings?.favicon_url]);

  const isFooterDark = isColorDark(footerBg);
  const isHeaderDark = isColorDark(headerBg);

  return (
    <div className="light min-h-screen flex flex-col" style={{ background: "#f8fafc", color: "#111827" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur-xl border-b transition-all duration-300"
        style={{
          backgroundColor: `${headerBg}f0`,
          borderColor: isHeaderDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to={helpBase} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            {settings?.brand_logo_url && (
              <img src={settings.brand_logo_url} alt="" className="h-8 object-contain" />
            )}
            <span className="font-semibold text-base" style={{ color: isHeaderDark ? "#ffffff" : "#111827" }}>
              {settings?.home_title || "Help Center"}
            </span>
          </Link>

          {/* Desktop nav */}
          {headerLinks.length > 0 && (
            <nav className="hidden md:flex items-center gap-1">
              {headerLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target={link.url.startsWith("http") ? "_blank" : undefined}
                  rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
                  style={{ color: isHeaderDark ? "rgba(255,255,255,0.8)" : "#4b5563" }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = primaryColor;
                    e.currentTarget.style.backgroundColor = `${primaryColor}08`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = isHeaderDark ? "rgba(255,255,255,0.8)" : "#4b5563";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          )}

          {/* Mobile menu button */}
          {headerLinks.length > 0 && (
            <button
              className="md:hidden p-2 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ color: isHeaderDark ? "#ffffff" : "#374151" }}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && headerLinks.length > 0 && (
          <div
            className="md:hidden border-t px-4 py-3 space-y-1"
            style={{
              backgroundColor: headerBg,
              borderColor: isHeaderDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
            }}
          >
            {headerLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target={link.url.startsWith("http") ? "_blank" : undefined}
                rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined}
                className="block text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                style={{ color: isHeaderDark ? "rgba(255,255,255,0.8)" : "#4b5563" }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer style={{ backgroundColor: footerBg }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          {/* Accent line */}
          <div
            className="h-0.5 w-16 rounded-full mb-8"
            style={{ backgroundColor: `${primaryColor}40` }}
          />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="space-y-4">
              {settings?.footer_logo_url && (
                <img src={settings.footer_logo_url} alt="" className="h-8 object-contain" />
              )}
              {settings?.footer_text && (
                <p className="text-sm max-w-md leading-relaxed" style={{ color: isFooterDark ? "#9ca3af" : "#6b7280" }}>
                  {settings.footer_text}
                </p>
              )}
              {!settings?.footer_text && !settings?.footer_logo_url && (
                <p className="text-sm" style={{ color: isFooterDark ? "#6b7280" : "#9ca3af" }}>
                  Powered by Journey
                </p>
              )}
            </div>

            <div className="flex flex-col items-start md:items-end gap-5">
              {footerLinks.length > 0 && (
                <nav className="flex flex-wrap gap-x-6 gap-y-2">
                  {footerLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target={link.url.startsWith("http") ? "_blank" : undefined}
                      rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="text-sm transition-colors duration-200"
                      style={{ color: isFooterDark ? "#d1d5db" : "#374151" }}
                      onMouseEnter={e => (e.currentTarget.style.color = primaryColor)}
                      onMouseLeave={e => (e.currentTarget.style.color = isFooterDark ? "#d1d5db" : "#374151")}
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>
              )}

              {footerSocial.length > 0 && (
                <div className="flex items-center gap-3">
                  {footerSocial.map((social, i) => (
                    <a
                      key={i}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg transition-all duration-200"
                      style={{ color: isFooterDark ? "#9ca3af" : "#6b7280" }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = primaryColor;
                        e.currentTarget.style.backgroundColor = `${primaryColor}15`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = isFooterDark ? "#9ca3af" : "#6b7280";
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {socialIcons[social.type] || <span className="text-sm">{social.type}</span>}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function isColorDark(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length !== 6) return true;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}
