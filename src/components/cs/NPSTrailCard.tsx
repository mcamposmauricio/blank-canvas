import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  MessageSquare, 
  Mail, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";

interface NPSTrail {
  id: string;
  name: string;
  status: string;
  progress_percentage: number | null;
  campaign_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  metadata: {
    score?: number;
    comment?: string;
    classification?: "promoter" | "passive" | "detractor";
    stages?: {
      added_to_campaign?: string;
      email_sent?: string;
      response_received?: string;
    };
  } | null;
}

interface NPSTrailCardProps {
  trail: NPSTrail;
}

export function NPSTrailCard({ trail }: NPSTrailCardProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === "pt-BR" ? ptBR : enUS;

  const { data: campaign } = useQuery({
    queryKey: ["campaign-details", trail.campaign_id],
    queryFn: async () => {
      if (!trail.campaign_id) return null;
      const { data, error } = await supabase
        .from("campaigns")
        .select("name, status, sent_at")
        .eq("id", trail.campaign_id)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!trail.campaign_id,
  });

  const metadata = trail.metadata || {};
  const stages = metadata.stages || {};
  const score = metadata.score;
  const classification = metadata.classification;

  const getClassificationBadge = () => {
    if (!classification) return null;
    
    switch (classification) {
      case "promoter":
        return (
          <Badge className="bg-primary text-primary-foreground">
            {t("cs.npsTrail.promoter")}
          </Badge>
        );
      case "passive":
        return (
          <Badge className="bg-warning text-warning-foreground">
            {t("cs.npsTrail.passive")}
          </Badge>
        );
      case "detractor":
        return (
          <Badge variant="destructive">
            {t("cs.npsTrail.detractor")}
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    if (trail.status === "completed") {
      return (
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t("cs.trailStatus.completed")}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        {t("cs.trailStatus.active")}
      </Badge>
    );
  };

  const getCurrentStage = () => {
    if (stages.response_received) return t("cs.npsTrail.responseReceived");
    if (stages.email_sent) return t("cs.npsTrail.awaitingResponse");
    return t("cs.npsTrail.addedToCampaign");
  };

  const getStageIcon = () => {
    if (stages.response_received) return <CheckCircle2 className="h-4 w-4 text-primary" />;
    if (stages.email_sent) return <Clock className="h-4 w-4 text-warning" />;
    return <Calendar className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              {campaign?.name || trail.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              {getClassificationBadge()}
            </div>
          </div>
          {score !== undefined && (
            <div className="text-right">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{score}</span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{getCurrentStage()}</span>
            <span>{trail.progress_percentage || 0}%</span>
          </div>
          <Progress value={trail.progress_percentage || 0} className="h-2" />
        </div>

        <Separator />

        {/* Stages Timeline */}
        <div className="space-y-2">
          {/* Stage 1: Added to Campaign */}
          <div className="flex items-center gap-2 text-xs">
            <div className={`p-1 rounded-full ${stages.added_to_campaign ? "bg-primary/10" : "bg-muted"}`}>
              <Calendar className={`h-3 w-3 ${stages.added_to_campaign ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <span className={stages.added_to_campaign ? "text-foreground" : "text-muted-foreground"}>
              {t("cs.npsTrail.addedToCampaign")}
            </span>
            {stages.added_to_campaign && (
              <span className="text-muted-foreground ml-auto">
                {format(new Date(stages.added_to_campaign), "dd/MM/yy", { locale: dateLocale })}
              </span>
            )}
          </div>

          {/* Stage 2: Email Sent */}
          <div className="flex items-center gap-2 text-xs">
            <div className={`p-1 rounded-full ${stages.email_sent ? "bg-primary/10" : "bg-muted"}`}>
              <Mail className={`h-3 w-3 ${stages.email_sent ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <span className={stages.email_sent ? "text-foreground" : "text-muted-foreground"}>
              {t("cs.npsTrail.emailSent")}
            </span>
            {stages.email_sent && (
              <span className="text-muted-foreground ml-auto">
                {format(new Date(stages.email_sent), "dd/MM/yy", { locale: dateLocale })}
              </span>
            )}
          </div>

          {/* Stage 3: Response Received */}
          <div className="flex items-center gap-2 text-xs">
            <div className={`p-1 rounded-full ${stages.response_received ? "bg-primary/10" : "bg-muted"}`}>
              <CheckCircle2 className={`h-3 w-3 ${stages.response_received ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <span className={stages.response_received ? "text-foreground" : "text-muted-foreground"}>
              {t("cs.npsTrail.responseReceived")}
            </span>
            {stages.response_received && (
              <span className="text-muted-foreground ml-auto">
                {format(new Date(stages.response_received), "dd/MM/yy", { locale: dateLocale })}
              </span>
            )}
          </div>
        </div>

        {/* Comment if exists */}
        {metadata.comment && (
          <>
            <Separator />
            <div className="text-xs text-muted-foreground italic">
              "{metadata.comment}"
            </div>
          </>
        )}

        {/* Detractor alert */}
        {classification === "detractor" && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
            <AlertTriangle className="h-4 w-4" />
            <span>{t("cs.npsTrail.detractorAlert")}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
