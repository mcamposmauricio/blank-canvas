import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, BookOpen, ExternalLink } from "lucide-react";

interface PortalHelpTabProps {
  tenantId: string;
}

interface HelpArticle {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  body_snippet?: string | null;
}

export default function PortalHelpTab({ tenantId }: PortalHelpTabProps) {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: arts }, { data: tenant }] = await Promise.all([
        supabase
          .from("help_articles")
          .select("id, title, subtitle, slug")
          .eq("tenant_id", tenantId)
          .eq("status", "published")
          .order("updated_at", { ascending: false })
          .limit(20),
        supabase.from("tenants").select("slug").eq("id", tenantId).single(),
      ]);
      setArticles(arts || []);
      setTenantSlug(tenant?.slug || null);
      setLoading(false);
    };
    fetchData();
  }, [tenantId]);

  // Debounced search via RPC
  useEffect(() => {
    if (!search.trim()) return;
    const timer = setTimeout(async () => {
      const { data } = await supabase.rpc("search_help_articles", {
        p_tenant_id: tenantId,
        p_query: search.trim(),
        p_limit: 20,
      });
      if (data) setArticles(data as HelpArticle[]);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, tenantId]);

  // Reset to default list when search is cleared
  useEffect(() => {
    if (search.trim()) return;
    supabase
      .from("help_articles")
      .select("id, title, subtitle, slug")
      .eq("tenant_id", tenantId)
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setArticles(data); });
  }, [search, tenantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  const helpBase = tenantSlug ? `/${tenantSlug}/help` : "/help";

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar artigos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-muted-foreground">
            {search ? "Nenhum artigo encontrado." : "Nenhum artigo disponível."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((article) => (
            <a
              key={article.id}
              href={`${helpBase}/a/${article.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{article.title}</p>
                    {article.subtitle && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{article.subtitle}</p>
                    )}
                    {article.body_snippet && (
                      <p className="text-xs text-muted-foreground/70 line-clamp-1 mt-0.5">
                        ...{article.body_snippet.trim()}...
                      </p>
                    )}
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
