import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";

import { CSKanbanBoard } from "@/components/cs/CSKanbanBoard";
import { CSMetricsHeader } from "@/components/cs/CSMetricsHeader";
import { PageHeader } from "@/components/ui/page-header";

export default function CSDashboard() {
  const { t } = useLanguage();
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission('cs.kanban', 'edit');

  const { data: companies = [], isLoading, refetch } = useQuery({
    queryKey: ["cs-companies", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("is_company", true)
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: csms = [] } = useQuery({
    queryKey: ["csms", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("csms")
        .select("*")
        .eq("is_active", true);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const metrics = {
    totalCompanies: companies.length,
    totalMRR: companies.reduce((sum, c) => sum + Number(c.mrr || 0), 0),
    avgHealthScore: companies.length > 0 
      ? Math.round(companies.reduce((sum, c) => sum + Number(c.health_score || 50), 0) / companies.length)
      : 0,
    atRisk: companies.filter(c => Number(c.health_score || 50) < 40).length,
  };

  return (
    <div className="space-y-8">
        <PageHeader title={t("cs.dashboard.title")} subtitle={t("cs.dashboard.subtitle")} />

        <CSMetricsHeader metrics={metrics} />

        <CSKanbanBoard 
          companies={companies} 
          csms={csms}
          isLoading={isLoading} 
          onRefresh={refetch}
          canEdit={canEdit}
        />
    </div>
  );
}
