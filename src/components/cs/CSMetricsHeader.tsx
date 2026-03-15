import { useLanguage } from "@/contexts/LanguageContext";
import { Building2, DollarSign, Heart, AlertTriangle } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";

interface CSMetricsHeaderProps {
  metrics: {
    totalCompanies: number;
    totalMRR: number;
    avgHealthScore: number;
    atRisk: number;
  };
}

export function CSMetricsHeader({ metrics }: CSMetricsHeaderProps) {
  const { t } = useLanguage();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title={t("cs.metrics.totalCompanies")}
        value={metrics.totalCompanies}
        icon={Building2}
        iconColor="text-primary"
        iconBgColor="bg-primary/10"
      />
      <MetricCard
        title={t("cs.metrics.totalMRR")}
        value={formatCurrency(metrics.totalMRR)}
        icon={DollarSign}
        iconColor="text-accent"
        iconBgColor="bg-accent/10"
      />
      <MetricCard
        title={t("cs.metrics.avgHealth")}
        value={`${metrics.avgHealthScore}%`}
        icon={Heart}
        iconColor={metrics.avgHealthScore >= 70 ? "text-accent" : metrics.avgHealthScore >= 40 ? "text-warning" : "text-destructive"}
        iconBgColor={metrics.avgHealthScore >= 70 ? "bg-accent/10" : metrics.avgHealthScore >= 40 ? "bg-warning/10" : "bg-destructive/10"}
      />
      <MetricCard
        title={t("cs.metrics.atRisk")}
        value={metrics.atRisk}
        icon={AlertTriangle}
        iconColor="text-destructive"
        iconBgColor="bg-destructive/10"
      />
    </div>
  );
}
