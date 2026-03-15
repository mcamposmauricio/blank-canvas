import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, DollarSign, MessageSquare } from "lucide-react";

export interface KanbanCompany {
  id: string;
  name: string;
  trade_name: string | null;
  email: string;
  phone: string | null;
  cs_status: string | null;
  health_score: number | null;
  mrr: number | null;
  contract_value: number | null;
  renewal_date: string | null;
  city: string | null;
  state: string | null;
  csm_id: string | null;
  last_nps_score: number | null;
  last_nps_date: string | null;
}

interface CSM {
  id: string;
  name: string;
}

interface CSKanbanCardProps {
  company: KanbanCompany;
  csms: CSM[];
  onDragStart: () => void;
  onClick: () => void;
  draggable?: boolean;
}

export function CSKanbanCard({ company, csms, onDragStart, onClick, draggable = true }: CSKanbanCardProps) {
  const { t } = useLanguage();
  const healthScore = company.health_score ?? 50;
  const csm = csms.find((c) => c.id === company.csm_id);

  const { data: activeNPSTrail } = useQuery({
    queryKey: ["active-nps-trail", company.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trails")
        .select("id, progress_percentage, metadata")
        .eq("contact_id", company.id)
        .eq("type", "nps")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });

  const getHealthColor = (score: number) => {
    if (score >= 70) return "text-success";
    if (score >= 40) return "text-warning";
    return "text-destructive";
  };

  const getHealthBg = (score: number) => {
    if (score >= 70) return "bg-success/10";
    if (score >= 40) return "bg-warning/10";
    return "bg-destructive/10";
  };

  const getStatusStripColor = (score: number) => {
    if (score >= 70) return "bg-success";
    if (score >= 40) return "bg-warning";
    return "bg-destructive";
  };

  const getNPSBadge = (score: number | null) => {
    if (score === null) return null;
    if (score >= 9) return <Badge variant="promoter" className="text-xs">Promotor</Badge>;
    if (score >= 7) return <Badge variant="passive" className="text-xs">Neutro</Badge>;
    return <Badge variant="detractor" className="text-xs">Detrator</Badge>;
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === 0) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
    }).format(value);
  };

  return (
    <Card
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      onClick={onClick}
      className={`cursor-pointer hover:bg-secondary/50 transition-colors overflow-hidden ${!draggable ? 'cursor-default' : ''}`}
    >
      {/* Status strip on top */}
      <div className={`h-1 w-full ${getStatusStripColor(healthScore)}`} />
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {company.trade_name || company.name}
            </p>
            {company.trade_name && (
              <p className="text-xs text-muted-foreground truncate">
                {company.name}
              </p>
            )}
          </div>
          {activeNPSTrail && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/10" title={t("cs.npsTrail.pendingNPS")}>
              <MessageSquare className="h-3 w-3 text-accent" />
              <span className="text-xs text-accent font-medium">
                {activeNPSTrail.progress_percentage || 0}%
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getHealthBg(healthScore)} ${getHealthColor(healthScore)}`}>
            <Heart className="h-3 w-3" />
            {healthScore}%
          </div>

          {company.mrr && company.mrr > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              {formatCurrency(company.mrr)}
            </div>
          )}

          {getNPSBadge(company.last_nps_score)}
        </div>

        {csm && (
          <p className="text-xs text-muted-foreground">
            CSM: {csm.name}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
