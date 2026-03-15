import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, DollarSign, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";

export default function CSChurnPage() {
  const { t, language } = useLanguage();
  const dateLocale = language === "pt-BR" ? ptBR : enUS;

  const { data: churnedCompanies = [], isLoading: loadingChurned } = useQuery({
    queryKey: ["churned-companies"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("is_company", true)
        .eq("cs_status", "churn")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: atRiskCompanies = [], isLoading: loadingAtRisk } = useQuery({
    queryKey: ["at-risk-companies"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("is_company", true)
        .neq("cs_status", "churn")
        .lt("health_score", 40)
        .order("health_score", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: upcomingRenewals = [], isLoading: loadingRenewals } = useQuery({
    queryKey: ["upcoming-renewals"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("is_company", true)
        .neq("cs_status", "churn")
        .not("renewal_date", "is", null)
        .lte("renewal_date", thirtyDaysFromNow.toISOString())
        .gte("renewal_date", new Date().toISOString())
        .order("renewal_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const totalChurnedMRR = churnedCompanies.reduce((acc, c) => acc + (c.mrr || 0), 0);
  const atRiskMRR = atRiskCompanies.reduce((acc, c) => acc + (c.mrr || 0), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const isLoading = loadingChurned || loadingAtRisk || loadingRenewals;

  return (
    <div className="space-y-8">
        <PageHeader title={t("cs.churn.title")} subtitle={t("cs.churn.subtitle")} />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="rounded-lg border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("cs.churn.churned")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-semibold text-destructive">{churnedCompanies.length}</span>
            </CardContent>
          </Card>
          <Card className="rounded-lg border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("cs.churn.atRisk")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-semibold text-warning">{atRiskCompanies.length}</span>
            </CardContent>
          </Card>
          <Card className="rounded-lg border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("cs.churn.lostMRR")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-semibold text-destructive">{formatCurrency(totalChurnedMRR)}</span>
            </CardContent>
          </Card>
          <Card className="rounded-lg border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("cs.churn.atRiskMRR")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-semibold text-warning">{formatCurrency(atRiskMRR)}</span>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">{t("common.loading")}</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* At Risk Companies */}
            <Card className="rounded-lg border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  {t("cs.churn.atRiskTitle")}
                </CardTitle>
                <CardDescription>{t("cs.churn.atRiskDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                {atRiskCompanies.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">{t("cs.churn.noAtRisk")}</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {atRiskCompanies.map((company) => (
                      <div key={company.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-medium">{company.trade_name || company.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Health: {company.health_score ?? 50}%</span>
                            {company.last_nps_score !== null && (
                              <span>• NPS: {company.last_nps_score}</span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-warning border-warning">
                          {formatCurrency(company.mrr || 0)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Renewals */}
            <Card className="rounded-lg border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  {t("cs.churn.upcomingRenewals")}
                </CardTitle>
                <CardDescription>{t("cs.churn.renewalsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingRenewals.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">{t("cs.churn.noRenewals")}</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingRenewals.map((company) => {
                      const daysUntil = differenceInDays(new Date(company.renewal_date!), new Date());
                      return (
                        <div key={company.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div>
                            <p className="font-medium">{company.trade_name || company.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(company.renewal_date!), "PPP", { locale: dateLocale })}
                            </p>
                          </div>
                          <Badge variant={daysUntil <= 7 ? "destructive" : "secondary"}>
                            {daysUntil} {t("cs.churn.daysLeft")}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Churned Companies */}
            <Card className="rounded-lg border bg-card shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  {t("cs.churn.churnedTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {churnedCompanies.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">{t("cs.churn.noChurned")}</p>
                ) : (
                  <div className="space-y-3">
                    {churnedCompanies.map((company) => (
                      <div key={company.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-medium">{company.trade_name || company.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {company.updated_at && format(new Date(company.updated_at), "PPP", { locale: dateLocale })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-destructive">{formatCurrency(company.mrr || 0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
    </div>
  );
}
