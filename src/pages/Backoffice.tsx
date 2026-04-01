import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { Building2, Users, Settings, BarChart3, Terminal, Activity, Clock, HeartPulse, Blocks, TrendingUp } from "lucide-react";
import { lazy, Suspense } from "react";

const TenantManagement = lazy(() => import("@/components/backoffice/TenantManagement"));
const UserManagement = lazy(() => import("@/components/backoffice/UserManagement"));
const GlobalSettings = lazy(() => import("@/components/backoffice/GlobalSettings"));
const GlobalMetrics = lazy(() => import("@/components/backoffice/GlobalMetrics"));
const Operations = lazy(() => import("@/components/backoffice/Operations"));
const PerformanceTab = lazy(() => import("@/components/backoffice/PerformanceTab"));
const LiveTimeline = lazy(() => import("@/components/backoffice/LiveTimeline"));
const HealthCheckTab = lazy(() => import("@/components/backoffice/HealthCheckTab"));
const ModulesTab = lazy(() => import("@/components/backoffice/ModulesTab"));
const BenchmarkTab = lazy(() => import("@/components/backoffice/BenchmarkTab"));

const TabFallback = () => (
  <div className="flex items-center justify-center h-32">
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

export default function Backoffice() {
  const { isMaster, loading } = useAuth();

  if (loading) return null;
  if (!isMaster) return <Navigate to="/nps/dashboard" replace />;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Backoffice Master"
        subtitle="Painel de administração global — gerencie tenants, usuários, configurações e operações."
      />

      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="tenants" className="gap-2"><Building2 className="h-4 w-4" />Plataformas</TabsTrigger>
          <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" />Usuários</TabsTrigger>
          <TabsTrigger value="modules" className="gap-2"><Blocks className="h-4 w-4" />Módulos</TabsTrigger>
          <TabsTrigger value="benchmark" className="gap-2"><TrendingUp className="h-4 w-4" />Comparativo</TabsTrigger>
          <TabsTrigger value="performance" className="gap-2"><Activity className="h-4 w-4" />Performance</TabsTrigger>
          <TabsTrigger value="health" className="gap-2"><HeartPulse className="h-4 w-4" />Health Check</TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2"><Clock className="h-4 w-4" />Timeline</TabsTrigger>
          <TabsTrigger value="metrics" className="gap-2"><BarChart3 className="h-4 w-4" />Métricas</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" />Configurações</TabsTrigger>
          <TabsTrigger value="operations" className="gap-2"><Terminal className="h-4 w-4" />Operações</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants"><Suspense fallback={<TabFallback />}><TenantManagement /></Suspense></TabsContent>
        <TabsContent value="users"><Suspense fallback={<TabFallback />}><UserManagement /></Suspense></TabsContent>
        <TabsContent value="modules"><Suspense fallback={<TabFallback />}><ModulesTab /></Suspense></TabsContent>
        <TabsContent value="benchmark"><Suspense fallback={<TabFallback />}><BenchmarkTab /></Suspense></TabsContent>
        <TabsContent value="performance"><Suspense fallback={<TabFallback />}><PerformanceTab /></Suspense></TabsContent>
        <TabsContent value="health"><Suspense fallback={<TabFallback />}><HealthCheckTab /></Suspense></TabsContent>
        <TabsContent value="timeline"><Suspense fallback={<TabFallback />}><LiveTimeline /></Suspense></TabsContent>
        <TabsContent value="metrics"><Suspense fallback={<TabFallback />}><GlobalMetrics /></Suspense></TabsContent>
        <TabsContent value="settings"><Suspense fallback={<TabFallback />}><GlobalSettings /></Suspense></TabsContent>
        <TabsContent value="operations"><Suspense fallback={<TabFallback />}><Operations /></Suspense></TabsContent>
      </Tabs>
    </div>
  );
}
