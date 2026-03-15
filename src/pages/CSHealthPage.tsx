import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/ui/metric-card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Heart, TrendingUp, TrendingDown, Minus, Building2 } from "lucide-react";

export default function CSHealthPage() {
  const { t } = useLanguage();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies-health"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, trade_name, health_score, last_nps_score, cs_status, mrr")
        .eq("is_company", true)
        .order("health_score", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const getHealthColor = (score: number) => {
    if (score >= 70) return "bg-primary";
    if (score >= 40) return "bg-warning";
    return "bg-destructive";
  };

  const distribution = {
    healthy: companies.filter((c) => (c.health_score ?? 50) >= 70).length,
    attention: companies.filter((c) => (c.health_score ?? 50) >= 40 && (c.health_score ?? 50) < 70).length,
    critical: companies.filter((c) => (c.health_score ?? 50) < 40).length,
  };

  const avgHealth = companies.length > 0
    ? Math.round(companies.reduce((acc, c) => acc + (c.health_score ?? 50), 0) / companies.length)
    : 0;

  return (
    <div className="space-y-8">
      <PageHeader title={t("cs.health.title")} subtitle={t("cs.health.subtitle")} />

      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title={t("cs.health.average")}
          value={`${avgHealth}%`}
          icon={Heart}
          iconColor={avgHealth >= 70 ? "text-primary" : avgHealth >= 40 ? "text-warning" : "text-destructive"}
          iconBgColor={avgHealth >= 70 ? "bg-primary/10" : avgHealth >= 40 ? "bg-warning/10" : "bg-destructive/10"}
        />
        <MetricCard
          title={t("cs.health.healthy")}
          value={distribution.healthy}
          icon={TrendingUp}
          iconColor="text-primary"
          iconBgColor="bg-primary/10"
          subtitle="≥ 70%"
        />
        <MetricCard
          title={t("cs.health.attention")}
          value={distribution.attention}
          icon={Minus}
          iconColor="text-warning"
          iconBgColor="bg-warning/10"
          subtitle="40-69%"
        />
        <MetricCard
          title={t("cs.health.critical")}
          value={distribution.critical}
          icon={TrendingDown}
          iconColor="text-destructive"
          iconBgColor="bg-destructive/10"
          subtitle="< 40%"
        />
      </div>

      {/* Companies List */}
      <Card className="rounded-lg border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>{t("cs.health.companiesList")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PageSkeleton variant="table" />
          ) : companies.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={t("cs.health.noCompanies")}
              description={t("cs.dashboard.subtitle")}
            />
          ) : (
            <div className="space-y-3">
              {companies.map((company) => {
                const healthScore = company.health_score ?? 50;
                return (
                  <div key={company.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {company.trade_name || company.name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{t(`cs.status.${company.cs_status || "implementacao"}`)}</Badge>
                        {company.last_nps_score !== null && (
                          <span>NPS: {company.last_nps_score}</span>
                        )}
                      </div>
                    </div>
                    <div className="w-32">
                      <Progress value={healthScore} className="h-2" />
                    </div>
                    <Badge className={`${getHealthColor(healthScore)} text-white min-w-[80px] justify-center`}>
                      {healthScore}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
