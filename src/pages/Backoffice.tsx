import { useAuth } from "@/hooks/useAuth";
import { Navigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent } from "@/components/ui/tabs";
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
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "tenants";

  if (loading) return null;
  if (!isMaster) return <Navigate to="/nps/dashboard" replace />;

  return (
    <div className="p-6 space-y-6">
      <Tabs value={activeTab} className="space-y-4">
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
