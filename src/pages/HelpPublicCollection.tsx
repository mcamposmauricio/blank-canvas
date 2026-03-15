import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, FileText, Home } from "lucide-react";
import HelpPublicLayout from "@/components/help/HelpPublicLayout";

interface Article {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
}

interface CollectionInfo {
  name: string;
  description: string | null;
  icon: string | null;
}

export default function HelpPublicCollection() {
  const { tenantSlug, collectionSlug } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<CollectionInfo | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(tenantSlug || null);
  const [siteSettings, setSiteSettings] = useState<any>(null);

  const helpBase = resolvedSlug ? `/${resolvedSlug}/help` : "/help";

  useEffect(() => { if (collectionSlug) loadData(); }, [tenantSlug, collectionSlug]);

  const loadData = async () => {
    let tenantIdResolved: string | null = null;

    if (tenantSlug) {
      const { data: tenant } = await supabase.from("tenants").select("id, slug").eq("slug", tenantSlug).maybeSingle();
      if (!tenant) { setLoading(false); return; }
      tenantIdResolved = tenant.id;
      setResolvedSlug(tenant.slug);
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
        if (t?.slug) { navigate(`/${t.slug}/help/c/${collectionSlug}`, { replace: true }); return; }
      }
      setLoading(false);
      return;
    }

    if (!tenantIdResolved) { setLoading(false); return; }

    const { data: settings } = await supabase.from("help_site_settings").select("*").eq("tenant_id", tenantIdResolved).maybeSingle();
    setSiteSettings(settings);

    const { data: col } = await supabase.from("help_collections")
      .select("id, name, description, icon")
      .eq("tenant_id", tenantIdResolved)
      .eq("slug", collectionSlug!)
      .eq("status", "active")
      .maybeSingle();
    if (!col) { setLoading(false); return; }
    setCollection(col);

    const { data: arts } = await supabase.from("help_articles")
      .select("id, title, subtitle, slug")
      .eq("tenant_id", tenantIdResolved)
      .eq("collection_id", col.id)
      .eq("status", "published")
      .order("published_at", { ascending: false });

    setArticles(arts ?? []);
    setLoading(false);
  };

  const primaryColor = siteSettings?.brand_primary_color || "#3B82F6";

  if (loading) return (
    <div className="light flex items-center justify-center min-h-screen" style={{ background: "#f8fafc" }}>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "#3B82F6", borderTopColor: "transparent" }} />
    </div>
  );
  if (!collection) return (
    <div className="light flex items-center justify-center min-h-screen" style={{ background: "#f8fafc", color: "#64748b" }}>Coleção não encontrada</div>
  );

  return (
    <HelpPublicLayout settings={siteSettings} helpBase={helpBase}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-8 flex-wrap">
          <Link
            to={helpBase}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm transition-all duration-200"
            style={{ color: "#64748b", backgroundColor: "#f1f5f9" }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${primaryColor}10`; e.currentTarget.style.color = primaryColor; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#f1f5f9"; e.currentTarget.style.color = "#64748b"; }}
          >
            <Home className="h-3.5 w-3.5" />
            Help Center
          </Link>
          <ChevronRight className="h-3.5 w-3.5" style={{ color: "#cbd5e1" }} />
          <span className="font-medium px-3 py-1 rounded-full" style={{ color: "#0f172a", backgroundColor: "#f1f5f9" }}>{collection.name}</span>
        </nav>

        {/* Collection header */}
        <div
          className="mb-10 p-8 rounded-2xl relative overflow-hidden"
          style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}
        >
          {/* Top accent strip */}
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}60)` }}
          />
          <div className="flex items-start gap-5">
            <span className="text-4xl flex-shrink-0">{collection.icon || "📚"}</span>
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: "#0f172a" }}>{collection.name}</h1>
              {collection.description && <p className="text-base leading-relaxed" style={{ color: "#64748b" }}>{collection.description}</p>}
              <p className="text-sm mt-3" style={{ color: "#94a3b8" }}>
                {articles.length} {articles.length === 1 ? "artigo" : "artigos"}
              </p>
            </div>
          </div>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" style={{ color: "#94a3b8" }} />
            <p style={{ color: "#64748b" }}>Nenhum artigo nesta coleção.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {articles.map(art => (
              <Link
                key={art.id}
                to={`${helpBase}/a/${art.slug}`}
                className="flex items-center justify-between p-4 rounded-xl transition-all duration-200 group"
                style={{ borderLeft: "3px solid transparent" }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = "#f8fafc";
                  e.currentTarget.style.borderLeftColor = primaryColor;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.borderLeftColor = "transparent";
                }}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 flex-shrink-0" style={{ color: "#cbd5e1" }} />
                  <div>
                    <p className="font-medium" style={{ color: "#0f172a" }}>{art.title}</p>
                    {art.subtitle && <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>{art.subtitle}</p>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5" style={{ color: primaryColor }} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </HelpPublicLayout>
  );
}
