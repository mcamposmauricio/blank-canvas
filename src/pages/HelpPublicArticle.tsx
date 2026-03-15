import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Home, Clock } from "lucide-react";
import HelpPublicLayout from "@/components/help/HelpPublicLayout";
import { ArticleFeedback } from "@/components/help/ArticleFeedback";
import { RelatedArticles } from "@/components/help/RelatedArticles";

interface ArticleData {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  status: string;
  current_version_id: string | null;
  collection_id: string | null;
  tenant_id: string;
  updated_at?: string;
}

export default function HelpPublicArticle() {
  const { tenantSlug, articleSlug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [collectionName, setCollectionName] = useState<string | null>(null);
  const [collectionSlug, setCollectionSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const trackedRef = useRef(false);
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(tenantSlug || null);

  const helpBase = resolvedSlug ? `/${resolvedSlug}/help` : "/help";

  useEffect(() => { if (articleSlug) loadArticle(); }, [tenantSlug, articleSlug]);

  const loadArticle = async () => {
    let tenantIdResolved: string | null = null;

    if (tenantSlug) {
      const { data: tenant } = await supabase.from("tenants").select("id, slug").eq("slug", tenantSlug).maybeSingle();
      if (!tenant) { setLoading(false); return; }
      tenantIdResolved = tenant.id;
      setResolvedSlug(tenant.slug);
    }

    let query = supabase.from("help_articles")
      .select("id, title, subtitle, slug, status, current_version_id, collection_id, tenant_id, updated_at")
      .eq("slug", articleSlug!);
    if (tenantIdResolved) query = query.eq("tenant_id", tenantIdResolved);

    const { data: art } = await query.maybeSingle();

    if (!art || art.status === "archived") { navigate(helpBase, { replace: true }); return; }
    if (art.status !== "published") { setLoading(false); return; }

    if (!tenantSlug && art.tenant_id) {
      const { data: t } = await supabase.from("tenants").select("slug").eq("id", art.tenant_id).single();
      if (t?.slug) { navigate(`/${t.slug}/help/a/${articleSlug}`, { replace: true }); return; }
    }

    setArticle(art);

    const settingsPromise = supabase.from("help_site_settings").select("*").eq("tenant_id", art.tenant_id).maybeSingle();
    const versionPromise = art.current_version_id
      ? supabase.from("help_article_versions").select("html_snapshot").eq("id", art.current_version_id).single()
      : null;
    const collectionPromise = art.collection_id
      ? supabase.from("help_collections").select("name, slug").eq("id", art.collection_id).single()
      : null;

    const [settingsRes, versionRes, collectionRes] = await Promise.all([
      settingsPromise, versionPromise, collectionPromise,
    ]);

    setSiteSettings(settingsRes?.data);
    if (versionRes?.data) setHtmlContent((versionRes.data as any).html_snapshot || "");
    if (collectionRes?.data) {
      setCollectionName((collectionRes.data as any).name);
      setCollectionSlug((collectionRes.data as any).slug);
    }

    setLoading(false);
  };

  // Track page view
  const trackView = useCallback(async () => {
    if (!article || trackedRef.current) return;
    trackedRef.current = true;
    const visitorId = localStorage.getItem("help_visitor_id") || crypto.randomUUID();
    localStorage.setItem("help_visitor_id", visitorId);
    const sessionId = sessionStorage.getItem("help_session_id") || crypto.randomUUID();
    sessionStorage.setItem("help_session_id", sessionId);

    await supabase.from("help_article_events").insert({
      tenant_id: article.tenant_id, article_id: article.id, event_type: "page_view",
      visitor_id: visitorId, session_id: sessionId,
      event_meta: { referrer: document.referrer, url: window.location.href },
    });

    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const { data: existing } = await supabase.from("help_article_events")
      .select("id").eq("article_id", article.id).eq("visitor_id", visitorId)
      .eq("event_type", "unique_view").gte("occurred_at", dayAgo).limit(1);

    if (!existing || existing.length === 0) {
      await supabase.from("help_article_events").insert({
        tenant_id: article.tenant_id, article_id: article.id, event_type: "unique_view",
        visitor_id: visitorId, session_id: sessionId,
      });
    }
  }, [article]);

  useEffect(() => { trackView(); }, [trackView]);

  // Track link clicks
  useEffect(() => {
    if (!contentRef.current || !article) return;
    const handler = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href) return;
      const visitorId = localStorage.getItem("help_visitor_id") || "";
      supabase.from("help_article_events").insert({
        tenant_id: article.tenant_id, article_id: article.id, event_type: "link_click",
        visitor_id: visitorId, event_meta: { url: href },
      });
    };
    contentRef.current.addEventListener("click", handler);
    return () => contentRef.current?.removeEventListener("click", handler);
  }, [htmlContent, article]);

  // SEO
  useEffect(() => {
    if (!article) return;
    document.title = `${article.title} | Help Center`;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
      if (!el) { el = document.createElement("meta"); (name.startsWith("og:") ? el.setAttribute("property", name) : el.setAttribute("name", name)); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    const desc = article.subtitle || "";
    setMeta("description", desc);
    setMeta("og:title", article.title);
    setMeta("og:description", desc);
    setMeta("og:type", "article");
  }, [article]);

  const primaryColor = siteSettings?.brand_primary_color || "#3B82F6";

  // Estimate reading time from HTML
  const estimateReadingTime = (html: string) => {
    const text = html.replace(/<[^>]*>/g, "");
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  };

  if (loading) return (
    <div className="light flex items-center justify-center min-h-screen" style={{ background: "#f8fafc" }}>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "#3B82F6", borderTopColor: "transparent" }} />
    </div>
  );
  if (!article) return (
    <div className="light flex items-center justify-center min-h-screen" style={{ background: "#f8fafc", color: "#64748b" }}>Artigo não encontrado</div>
  );

  const readingTime = estimateReadingTime(htmlContent);

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
          {collectionName && collectionSlug && (
            <>
              <ChevronRight className="h-3.5 w-3.5" style={{ color: "#cbd5e1" }} />
              <Link
                to={`${helpBase}/c/${collectionSlug}`}
                className="px-3 py-1 rounded-full text-sm transition-all duration-200"
                style={{ color: "#64748b", backgroundColor: "#f1f5f9" }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${primaryColor}10`; e.currentTarget.style.color = primaryColor; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#f1f5f9"; e.currentTarget.style.color = "#64748b"; }}
              >
                {collectionName}
              </Link>
            </>
          )}
        </nav>

        <article>
          {/* Article header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight leading-tight" style={{ color: "#0f172a" }}>{article.title}</h1>
            {article.subtitle && <p className="text-lg font-light leading-relaxed" style={{ color: "#64748b" }}>{article.subtitle}</p>}

            {/* Meta info */}
            <div className="flex items-center gap-4 mt-5 pt-5" style={{ borderTop: "1px solid #f1f5f9" }}>
              <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "#94a3b8" }}>
                <Clock className="h-3.5 w-3.5" />
                {readingTime} min de leitura
              </span>
              {article.updated_at && (
                <span className="text-xs" style={{ color: "#94a3b8" }}>
                  Atualizado em {new Date(article.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div
            ref={contentRef}
            className="prose prose-slate max-w-none help-article-content
              prose-headings:font-semibold prose-headings:tracking-tight
              prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
              prose-p:leading-relaxed prose-p:text-[#334155]
              prose-a:font-medium prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-xl prose-img:shadow-md
              prose-table:text-sm prose-th:bg-[#f8fafc]
              prose-blockquote:border-l-4 prose-blockquote:not-italic
              prose-code:text-sm prose-code:bg-[#f1f5f9] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
              prose-pre:bg-[#1e293b] prose-pre:rounded-xl"
            style={{
              "--tw-prose-links": primaryColor,
              "--tw-prose-quotes": primaryColor,
              "--tw-prose-quote-borders": primaryColor,
            } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          {/* Feedback */}
          <ArticleFeedback
            articleId={article.id}
            tenantId={article.tenant_id}
            primaryColor={primaryColor}
          />

          {/* Related Articles */}
          <RelatedArticles
            articleId={article.id}
            collectionId={article.collection_id}
            tenantId={article.tenant_id}
            helpBase={helpBase}
            primaryColor={primaryColor}
          />
        </article>
      </div>
    </HelpPublicLayout>
  );
}
