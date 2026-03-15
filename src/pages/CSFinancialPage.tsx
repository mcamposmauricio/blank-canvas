import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/ui/metric-card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DollarSign, TrendingUp, Building2, PieChart } from "lucide-react";

export default function CSFinancialPage() {
  const { t } = useLanguage();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies-financial"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("is_company", true)
        .neq("cs_status", "churn")
        .order("mrr", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const totalMRR = companies.reduce((acc, c) => acc + (c.mrr || 0), 0);
  const totalContractValue = companies.reduce((acc, c) => acc + (c.contract_value || 0), 0);
  const avgMRR = companies.length > 0 ? totalMRR / companies.length : 0;

  const mrrByStatus = {
    implementacao: companies.filter((c) => c.cs_status === "implementacao").reduce((acc, c) => acc + (c.mrr || 0), 0),
    onboarding: companies.filter((c) => c.cs_status === "onboarding").reduce((acc, c) => acc + (c.mrr || 0), 0),
    acompanhamento: companies.filter((c) => c.cs_status === "acompanhamento").reduce((acc, c) => acc + (c.mrr || 0), 0),
  };

  return (
    <div className="space-y-8">
      <PageHeader title={t("cs.financial.title")} subtitle={t("cs.financial.subtitle")} />

      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title={t("cs.financial.totalMRR")}
          value={formatCurrency(totalMRR)}
          icon={DollarSign}
          iconColor="text-primary"
          iconBgColor="bg-primary/10"
        />
        <MetricCard
          title={t("cs.financial.avgMRR")}
          value={formatCurrency(avgMRR)}
          icon={TrendingUp}
          iconColor="text-accent"
          iconBgColor="bg-accent/10"
        />
        <MetricCard
          title={t("cs.financial.totalContracts")}
          value={formatCurrency(totalContractValue)}
          icon={PieChart}
          iconColor="text-muted-foreground"
          iconBgColor="bg-muted"
        />
        <MetricCard
          title={t("cs.financial.activeCompanies")}
          value={companies.length}
          icon={Building2}
          iconColor="text-accent"
          iconBgColor="bg-accent/10"
        />
      </div>

      {/* MRR by Status */}
      <Card className="rounded-lg border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>{t("cs.financial.mrrByStatus")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border bg-muted/20">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("cs.status.implementacao")}</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(mrrByStatus.implementacao)}</p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/20">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("cs.status.onboarding")}</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(mrrByStatus.onboarding)}</p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/20">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("cs.status.acompanhamento")}</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(mrrByStatus.acompanhamento)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Companies by MRR */}
      <Card className="rounded-lg border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>{t("cs.financial.topCompanies")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PageSkeleton variant="table" />
          ) : companies.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={t("cs.financial.noCompanies")}
            />
          ) : (
            <div className="space-y-3">
              {companies.slice(0, 10).map((company, index) => (
                <div key={company.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">{index + 1}</span>
                    <div>
                      <p className="font-medium">{company.trade_name || company.name}</p>
                      <Badge variant="outline">{t(`cs.status.${company.cs_status || "implementacao"}`)}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{formatCurrency(company.mrr || 0)}</p>
                    <p className="text-xs text-muted-foreground">{t("cs.financial.monthly")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
