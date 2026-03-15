import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, FileText, ChevronRight, BookOpen, Layers } from "lucide-react";
import HelpPublicLayout from "@/components/help/HelpPublicLayout";

interface SiteSettings {
  home_title: string;
  home_subtitle: string;
  theme: string;
  brand_logo_url: string | null;
  brand_primary_color: string;
  hero_image_url?: string | null;
  hero_overlay_opacity?: number | null;
  favicon_url?: string | null;
  header_bg_color?: string | null;
  header_links_json?: any;
  footer_logo_url?: string | null;
  footer_text?: string | null;
  footer_bg_color?: string | null;
  footer_links_json?: any;
  footer_social_json?: any;
}

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  article_count: number;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  body_snippet?: string | null;
  relevance?: number;
}

function highlightTerm(text: string, term: string) {
  if (!term.trim()) return text;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-inherit rounded-sm px-0.5">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  );
}

export default function HelpPublicHome() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [recentArticles, setRecentArticles] = useState<SearchResult[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(tenantSlug || null);

  const helpBase = resolvedSlug ? `/${resolvedSlug}/help` : "/help";

  useEffect(() => { loadTenant(); }, [tenantSlug]);

  const loadTenant = async () => {
    if (tenantSlug) {
      const { data: tenant } = await supabase.from("tenants").select("id, slug").eq("slug", tenantSlug).maybeSingle();
      if (tenant) { setTenantId(tenant.id); setResolvedSlug(tenant.slug); return; }
      const { data: t2 } = await supabase.from("tenants").select("id, slug").eq("id", tenantSlug).maybeSingle();
      if (t2) { setTenantId(t2.id); setResolvedSlug(t2.slug); return; }
      setLoading(false);
    } else {
      let resolvedTenantId: string | null = null;
      const { data: site } = await supabase.from("help_site_settings").select("tenant_id").limit(1).maybeSingle();
      if (site) resolvedTenantId = site.tenant_id;
      if (!resolvedTenantId) {
        const { data: art } = await supabase.from("help_articles").select("tenant_id").eq("status", "published").limit(1).maybeSingle();
        if (art) resolvedTenantId = art.tenant_id;
      }
      if (resolvedTenantId) {
        const { data: t } = await supabase.from("tenants").select("slug").eq("id", resolvedTenantId).single();
        if (t?.slug) { navigate(`/${t.slug}/help`, { replace: true }); return; }
      }
      setLoading(false);
    }
  };

  useEffect(() => { if (tenantId) loadData(); }, [tenantId]);

  const loadData = async () => {
    const [{ data: site }, { data: cols }, { data: arts }, { data: allArticles }] = await Promise.all([
      supabase.from("help_site_settings").select("*").eq("tenant_id", tenantId!).maybeSingle(),
      supabase.from("help_collections").select("id, name, slug, description, icon").eq("tenant_id", tenantId!).eq("status", "active").order("order_index"),
      supabase.from("help_articles").select("id, title, subtitle, slug, collection_id").eq("tenant_id", tenantId!).eq("status", "published").order("published_at", { ascending: false }).limit(10),
      supabase.from("help_articles").select("collection_id").eq("tenant_id", tenantId!).eq("status", "published").not("collection_id", "is", null),
    ]);

    if (site) setSettings(site as any);
    else setSettings({ home_title: "Central de Ajuda", home_subtitle: "Como podemos ajudar?", theme: "light", brand_logo_url: null, brand_primary_color: "#3B82F6" });

    const countMap: Record<string, number> = {};
    (allArticles ?? []).forEach(a => { if (a.collection_id) countMap[a.collection_id] = (countMap[a.collection_id] || 0) + 1; });
    setCollections((cols ?? []).map(c => ({ ...c, article_count: countMap[c.id] || 0 })));
    setRecentArticles((arts ?? []).map(a => ({ id: a.id, title: a.title, subtitle: a.subtitle, slug: a.slug })));
    setLoading(false);
  };

  // Debounced search using RPC
  useEffect(() => {
    if (!search.trim() || !tenantId) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase.rpc("search_help_articles", {
        p_tenant_id: tenantId!,
        p_query: search.trim(),
        p_limit: 10,
      });
      setSearchResults((data as SearchResult[]) ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, tenantId]);

  if (loading) return (
    <div className="light flex items-center justify-center min-h-screen" style={{ background: "#f8fafc" }}>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "#3B82F6", borderTopColor: "transparent" }} />
    </div>
  );
  if (!tenantId) return (
    <div className="light flex items-center justify-center min-h-screen" style={{ background: "#f8fafc", color: "#6b7280" }}>Help Center not found</div>
  );

  const primaryColor = settings?.brand_primary_color || "#3B82F6";
  const heroImage = settings?.hero_image_url;
  const overlayOpacity = settings?.hero_overlay_opacity ?? 50;

  return (
    <HelpPublicLayout settings={settings} helpBase={helpBase}>
      {/* Hero — background only, no overflow-hidden on wrapper */}
      <div
        className="relative py-20 px-4 text-center"
        style={{
          background: heroImage
            ? undefined
            : `linear-gradient(180deg, ${primaryColor}08 0%, ${primaryColor}04 60%, #f8fafc 100%)`,
        }}
      >
        {heroImage && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center overflow-hidden"
              style={{ backgroundImage: `url(${heroImage})` }}
            />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ backgroundColor: primaryColor, opacity: overlayOpacity / 100 }}
            />
          </>
        )}

        <div className="relative z-10 max-w-2xl mx-auto">
          <h1
            className="text-4xl sm:text-5xl font-bold mb-3 tracking-tight leading-tight"
            style={{ color: heroImage ? "#ffffff" : "#1e293b" }}
          >
            {settings?.home_title || "Central de Ajuda"}
          </h1>
          <p
            className="text-lg sm:text-xl mb-10 font-light"
            style={{ color: heroImage ? "rgba(255,255,255,0.9)" : "#475569" }}
          >
            {settings?.home_subtitle || "Como podemos ajudar?"}
          </p>
        </div>
      </div>

      {/* Search — outside hero, own stacking context */}
      <div className="relative z-20 max-w-xl mx-auto px-4 -mt-7">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "#94a3b8" }} />
          <input
            placeholder="Buscar na base de conhecimento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-14 pr-5 h-14 text-base rounded-xl border shadow-lg focus:outline-none focus:ring-2 transition-all duration-200"
            style={{
              backgroundColor: "#ffffff",
              color: "#1e293b",
              borderColor: "#e2e8f0",
              boxShadow: "0 4px 20px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
            }}
            onFocus={e => { e.target.style.boxShadow = `0 4px 20px ${primaryColor}18, 0 0 0 2px ${primaryColor}40`; e.target.style.borderColor = `${primaryColor}60`; }}
            onBlur={e => { e.target.style.boxShadow = "0 4px 20px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)"; e.target.style.borderColor = "#e2e8f0"; }}
          />
          {searchResults.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl z-50 max-h-80 overflow-auto border"
              style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
            >
              {searchResults.map((r, idx) => (
                <Link
                  key={r.id}
                  to={`${helpBase}/a/${r.slug}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors duration-150"
                  style={{ borderBottom: idx < searchResults.length - 1 ? "1px solid #f1f5f9" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#ffffff")}
                >
                  <FileText className="h-4 w-4 flex-shrink-0" style={{ color: "#94a3b8" }} />
                  <div className="text-left min-w-0 flex-1">
                    <p className="font-medium text-sm" style={{ color: "#1e293b" }}>
                      {highlightTerm(r.title, search)}
                    </p>
                    {r.subtitle && <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{highlightTerm(r.subtitle, search)}</p>}
                    {r.body_snippet && (
                      <p className="text-xs mt-1 line-clamp-1" style={{ color: "#94a3b8" }}>
                        ...{highlightTerm(r.body_snippet.trim(), search)}...
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
        {/* Collections section */}
        {collections.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-2 mb-6">
              <Layers className="h-5 w-5" style={{ color: primaryColor }} />
              <h2 className="text-xl font-semibold" style={{ color: "#1e293b" }}>Coleções</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {collections.map(col => (
                <Link
                  key={col.id}
                  to={`${helpBase}/c/${col.slug}`}
                  className="group block p-6 rounded-xl border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 relative"
                  style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${primaryColor}50`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${primaryColor}0c` }}
                    >
                      {col.icon || "📚"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-[15px] mb-1" style={{ color: "#1e293b" }}>{col.name}</h3>
                      {col.description && (
                        <p className="text-sm leading-relaxed mb-3 line-clamp-2" style={{ color: "#64748b" }}>{col.description}</p>
                      )}
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: `${primaryColor}0c`, color: primaryColor }}
                      >
                        <BookOpen className="h-3 w-3" />
                        {col.article_count} {col.article_count === 1 ? "artigo" : "artigos"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent articles */}
        {recentArticles.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-6" style={{ color: "#1e293b" }}>Artigos Recentes</h2>
            <div
              className="rounded-xl border divide-y"
              style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
            >
              {recentArticles.map(art => (
                <Link
                  key={art.id}
                  to={`${helpBase}/a/${art.slug}`}
                  className="flex items-center justify-between px-5 py-4 transition-colors duration-150 group first:rounded-t-xl last:rounded-b-xl"
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#ffffff"; }}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 flex-shrink-0" style={{ color: "#cbd5e1" }} />
                    <div>
                      <p className="font-medium text-sm" style={{ color: "#1e293b" }}>{art.title}</p>
                      {art.subtitle && <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{art.subtitle}</p>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ color: primaryColor }} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </HelpPublicLayout>
  );
}
