import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Heart,
  MessageSquare,
  FileText,
  Building2,
  TrendingUp,
  AlertTriangle,
  Send,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModuleCardProps {
  title: string;
  icon: React.ElementType;
  metrics: { label: string; value: string | number; color?: string }[];
  path: string;
  accentColor: string;
  badge?: { label: string; variant: "default" | "destructive" | "secondary" };
}

function ModuleCard({ title, icon: Icon, metrics, path, accentColor, badge }: ModuleCardProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  return (
    <Card
      className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:border-accent/30"
      onClick={() => navigate(path)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className={`p-2 rounded-lg ${accentColor}`}>
              <Icon className="h-4 w-4" />
            </div>
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {badge && (
              <Badge variant={badge.variant} className="text-[10px]">
                {badge.label}
              </Badge>
            )}
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m) => (
            <div key={m.label}>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">{m.label}</p>
              <p className={`text-lg font-semibold tabular-nums ${m.color || ""}`}>{m.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { t } = useLanguage();
  const { user, hasPermission } = useAuth();

  const showCS = hasPermission("cs", "view") || hasPermission("cs.kanban", "view");
  const showNPS = hasPermission("nps", "view") || hasPermission("nps.dashboard", "view");
  const showChat = hasPermission("chat", "view") || hasPermission("chat.workspace", "view");
  const showHelp = hasPermission("help", "view") || hasPermission("help.articles", "view");
  const showContacts = hasPermission("contacts", "view") || hasPermission("contacts.companies", "view");

  // CS data
  const { data: csData, isLoading: csLoading } = useQuery({
    queryKey: ["home-cs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("health_score, cs_status")
        .eq("is_company", true);
      if (error) throw error;
      const companies = data || [];
      const avgHealth = companies.length > 0
        ? Math.round(companies.reduce((s, c) => s + (c.health_score ?? 50), 0) / companies.length)
        : 0;
      const atRisk = companies.filter((c) => (c.health_score ?? 50) < 40).length;
      return { total: companies.length, avgHealth, atRisk };
    },
    enabled: !!user && showCS,
  });

  // NPS data
  const { data: npsData, isLoading: npsLoading } = useQuery({
    queryKey: ["home-nps", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responses")
        .select("score");
      if (error) throw error;
      const responses = data || [];
      const promoters = responses.filter((r) => r.score >= 9).length;
      const detractors = responses.filter((r) => r.score <= 6).length;
      const total = responses.length;
      const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;
      return { npsScore, total, promoters, detractors };
    },
    enabled: !!user && showNPS,
  });

  // Chat data
  const { data: chatData, isLoading: chatLoading } = useQuery({
    queryKey: ["home-chat", user?.id],
    queryFn: async () => {
      const [activeRes, waitingRes] = await Promise.all([
        supabase.from("chat_rooms").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("chat_rooms").select("id", { count: "exact", head: true }).eq("status", "waiting"),
      ]);
      return {
        active: activeRes.count || 0,
        waiting: waitingRes.count || 0,
      };
    },
    enabled: !!user && showChat,
  });

  // Help data
  const { data: helpData, isLoading: helpLoading } = useQuery({
    queryKey: ["home-help", user?.id],
    queryFn: async () => {
      const [pubRes, draftRes] = await Promise.all([
        supabase.from("help_articles").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("help_articles").select("id", { count: "exact", head: true }).eq("status", "draft"),
      ]);
      return {
        published: pubRes.count || 0,
        drafts: draftRes.count || 0,
      };
    },
    enabled: !!user && showHelp,
  });

  // Companies count
  const { data: contactsData } = useQuery({
    queryKey: ["home-contacts", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("contacts").select("id", { count: "exact", head: true }).eq("is_company", true);
      return { total: count || 0 };
    },
    enabled: !!user && showContacts,
  });

  const isLoading = csLoading || npsLoading || chatLoading || helpLoading;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("home.title") !== "home.title" ? t("home.title") : "Visão Geral"}
        subtitle={t("home.subtitle") !== "home.subtitle" ? t("home.subtitle") : "Resumo de todos os módulos"}
      />

      {isLoading ? (
        <PageSkeleton variant="metrics" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {showCS && csData && (
            <MetricCard
              title="Health Score Médio"
              value={`${csData.avgHealth}%`}
              icon={Heart}
              iconColor={csData.avgHealth >= 70 ? "text-primary" : csData.avgHealth >= 40 ? "text-warning" : "text-destructive"}
              iconBgColor={csData.avgHealth >= 70 ? "bg-primary/10" : csData.avgHealth >= 40 ? "bg-warning/10" : "bg-destructive/10"}
              subtitle={`${csData.atRisk} em risco`}
            />
          )}
          {showNPS && npsData && (
            <MetricCard
              title="NPS Score"
              value={npsData.npsScore}
              icon={TrendingUp}
              iconColor="text-accent"
              iconBgColor="bg-accent/10"
              subtitle={`${npsData.total} respostas`}
            />
          )}
          {showChat && chatData && (
            <MetricCard
              title="Chats Ativos"
              value={chatData.active}
              icon={MessageSquare}
              iconColor="text-accent"
              iconBgColor="bg-accent/10"
              subtitle={chatData.waiting > 0 ? `${chatData.waiting} aguardando` : undefined}
            />
          )}
          {showContacts && contactsData && (
            <MetricCard
              title="Empresas"
              value={contactsData.total}
              icon={Building2}
              iconColor="text-muted-foreground"
              iconBgColor="bg-muted"
            />
          )}
        </div>
      )}

      {/* Module cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {showCS && csData && (
          <ModuleCard
            title="Customer Success"
            icon={Heart}
            path="/cs-dashboard"
            accentColor="bg-primary/10 text-primary"
            badge={csData.atRisk > 0 ? { label: `${csData.atRisk} risco`, variant: "destructive" } : undefined}
            metrics={[
              { label: "Total Empresas", value: csData.total },
              { label: "Health Médio", value: `${csData.avgHealth}%` },
            ]}
          />
        )}
        {showNPS && npsData && (
          <ModuleCard
            title="NPS"
            icon={BarChart3}
            path="/nps/dashboard"
            accentColor="bg-accent/10 text-accent"
            metrics={[
              { label: "NPS Score", value: npsData.npsScore },
              { label: "Respostas", value: npsData.total },
            ]}
          />
        )}
        {showChat && chatData && (
          <ModuleCard
            title="Chat"
            icon={MessageSquare}
            path="/admin/dashboard"
            accentColor="bg-accent/10 text-accent"
            badge={chatData.waiting > 0 ? { label: `${chatData.waiting} na fila`, variant: "destructive" } : undefined}
            metrics={[
              { label: "Ativos", value: chatData.active },
              { label: "Aguardando", value: chatData.waiting },
            ]}
          />
        )}
        {showHelp && helpData && (
          <ModuleCard
            title="Help Center"
            icon={FileText}
            path="/help/overview"
            accentColor="bg-muted text-muted-foreground"
            badge={helpData.drafts > 0 ? { label: `${helpData.drafts} rascunhos`, variant: "secondary" } : undefined}
            metrics={[
              { label: "Publicados", value: helpData.published },
              { label: "Rascunhos", value: helpData.drafts },
            ]}
          />
        )}
      </div>
    </div>
  );
}
