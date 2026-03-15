import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FolderOpen, Eye, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface ArticleStats {
  draft: number;
  published: number;
  archived: number;
  pending_review: number;
}

interface TopArticle {
  id: string;
  title: string;
  slug: string;
  views: number;
}

export default function HelpOverview() {
  const { t } = useLanguage();
  const { tenantId } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ArticleStats>({ draft: 0, published: 0, archived: 0, pending_review: 0 });
  const [collectionsCount, setCollectionsCount] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [topArticles, setTopArticles] = useState<TopArticle[]>([]);
  const [viewsChart, setViewsChart] = useState<{ date: string; views: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    setLoading(true);

    // Article counts by status
    const { data: articles } = await supabase
      .from("help_articles")
      .select("status")
      .eq("tenant_id", tenantId!);

    const counts: ArticleStats = { draft: 0, published: 0, archived: 0, pending_review: 0 };
    (articles ?? []).forEach(a => {
      if (a.status in counts) counts[a.status as keyof ArticleStats]++;
    });
    setStats(counts);

    // Collections count
    const { count } = await supabase
      .from("help_collections")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId!)
      .eq("status", "active");
    setCollectionsCount(count ?? 0);

    // Total views last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: events } = await supabase
      .from("help_article_events")
      .select("article_id, occurred_at")
      .eq("tenant_id", tenantId!)
      .eq("event_type", "page_view")
      .gte("occurred_at", thirtyDaysAgo);

    setTotalViews(events?.length ?? 0);

    // Top 10 articles by views
    const viewsByArticle: Record<string, number> = {};
    (events ?? []).forEach(e => {
      viewsByArticle[e.article_id] = (viewsByArticle[e.article_id] || 0) + 1;
    });
    const topIds = Object.entries(viewsByArticle)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (topIds.length > 0) {
      const { data: topArts } = await supabase
        .from("help_articles")
        .select("id, title, slug")
        .in("id", topIds.map(([id]) => id));

      setTopArticles(topIds.map(([id, views]) => {
        const art = topArts?.find(a => a.id === id);
        return { id, title: art?.title ?? "—", slug: art?.slug ?? "", views };
      }));
    }

    // Views chart (last 7 days)
    const chart: { date: string; views: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dateStr = d.toISOString().slice(0, 10);
      const dayViews = (events ?? []).filter(e => e.occurred_at?.startsWith(dateStr)).length;
      chart.push({ date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), views: dayViews });
    }
    setViewsChart(chart);

    setLoading(false);
  };

  const totalArticles = stats.draft + stats.published + stats.archived + stats.pending_review;

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t("help.title")} subtitle={t("help.overview")} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title={t("help.totalArticles")} value={totalArticles} icon={FileText} />
        <MetricCard title={t("help.totalCollections")} value={collectionsCount} icon={FolderOpen} />
        <MetricCard title={t("help.totalViews")} value={totalViews} subtitle="30d" icon={Eye} />
        <MetricCard title={t("help.status.published")} value={stats.published} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views chart */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">{t("help.totalViews")} (7d)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={viewsChart}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top articles */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">{t("help.topArticles")}</CardTitle></CardHeader>
          <CardContent>
            {topArticles.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("help.noArticles")}</p>
            ) : (
              <div className="space-y-2">
                {topArticles.map((art, i) => (
                  <div key={art.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <button onClick={() => navigate(`/help/articles/${art.id}/edit`)} className="text-sm text-left hover:text-primary truncate flex-1">
                      <span className="text-muted-foreground mr-2">{i + 1}.</span>{art.title}
                    </button>
                    <Badge variant="secondary" className="ml-2 text-xs">{art.views} views</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending review */}
      {stats.pending_review > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">{t("help.pendingReview")} ({stats.pending_review})</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {stats.pending_review} artigo(s) aguardando aprovação.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
