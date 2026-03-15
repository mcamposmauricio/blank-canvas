import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { CSKanbanCard, type KanbanCompany } from "./CSKanbanCard";
import { CompanyDetailsSheet } from "@/components/CompanyDetailsSheet";

interface CSM {
  id: string;
  name: string;
}

interface CSKanbanBoardProps {
  companies: KanbanCompany[];
  csms: CSM[];
  isLoading: boolean;
  onRefresh: () => void;
  canEdit?: boolean;
}

const CS_STATUSES = [
  { key: "implementacao", color: "bg-blue-500" },
  { key: "onboarding", color: "bg-purple-500" },
  { key: "acompanhamento", color: "bg-green-500" },
  { key: "churn", color: "bg-destructive" },
];

export function CSKanbanBoard({ companies, csms, isLoading, onRefresh, canEdit = true }: CSKanbanBoardProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedCompany, setSelectedCompany] = useState<KanbanCompany | null>(null);
  const [draggedCompany, setDraggedCompany] = useState<KanbanCompany | null>(null);
  const [csmFilter, setCsmFilter] = useState<string>("all");

  const filteredCompanies = csmFilter && csmFilter !== "all"
    ? companies.filter((c) => (c as any).csm_id === csmFilter)
    : companies;

  const getCompaniesByStatus = (status: string) => {
    return filteredCompanies.filter((c) => (c.cs_status || "implementacao") === status);
  };

  const handleDragStart = (company: KanbanCompany) => {
    setDraggedCompany(company);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: string) => {
    if (!canEdit || !draggedCompany || draggedCompany.cs_status === status) {
      setDraggedCompany(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("contacts")
        .update({ cs_status: status })
        .eq("id", draggedCompany.id);

      if (error) throw error;

      toast({
        title: t("cs.statusUpdated"),
        description: `${draggedCompany.name} → ${t(`cs.status.${status}`)}`,
      });
      
      onRefresh();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: t("common.error"),
        description: t("cs.statusUpdateError"),
        variant: "destructive",
      });
    } finally {
      setDraggedCompany(null);
    }
  };

  if (isLoading) {
    return <PageSkeleton variant="kanban" />;
  }

  return (
    <>
      {/* CSM Filter */}
      {csms.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-muted-foreground">{t("cs.filterByCSM") || "Filtrar por CSM"}:</span>
          <Select value={csmFilter} onValueChange={setCsmFilter}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue placeholder={t("cs.allCSMs") || "Todos os CSMs"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("cs.allCSMs") || "Todos os CSMs"}</SelectItem>
              {csms.map((csm) => (
                <SelectItem key={csm.id} value={csm.id}>{csm.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {csmFilter && csmFilter !== "all" && (
            <Badge variant="secondary" className="text-xs">
              {filteredCompanies.length} {t("cs.metrics.totalCompanies") || "empresas"}
            </Badge>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto">
        {CS_STATUSES.map((status) => {
          const statusCompanies = getCompaniesByStatus(status.key);
          return (
            <Card 
              key={status.key}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(status.key)}
              className="min-h-[400px] min-w-[200px] rounded-lg border bg-card shadow-sm"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${status.color}`} />
                    {t(`cs.status.${status.key}`)}
                  </CardTitle>
                  <Badge variant="secondary">{statusCompanies.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                {statusCompanies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t("cs.noCompaniesInStatus")}
                  </p>
                ) : (
                  statusCompanies.map((company) => (
                    <CSKanbanCard
                      key={company.id}
                      company={company as KanbanCompany}
                      csms={csms}
                      onDragStart={canEdit ? () => handleDragStart(company) : () => {}}
                      onClick={() => setSelectedCompany(company)}
                      draggable={canEdit}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CompanyDetailsSheet
        companyId={selectedCompany?.id || null}
        onClose={() => setSelectedCompany(null)}
        canEdit={canEdit}
      />
    </>
  );
}
