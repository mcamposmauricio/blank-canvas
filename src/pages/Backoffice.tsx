import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { Building2, Users, Settings, BarChart3, Terminal } from "lucide-react";
import TenantManagement from "@/components/backoffice/TenantManagement";
import UserManagement from "@/components/backoffice/UserManagement";
import GlobalSettings from "@/components/backoffice/GlobalSettings";
import GlobalMetrics from "@/components/backoffice/GlobalMetrics";
import Operations from "@/components/backoffice/Operations";

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
          <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" />Configurações</TabsTrigger>
          <TabsTrigger value="metrics" className="gap-2"><BarChart3 className="h-4 w-4" />Métricas</TabsTrigger>
          <TabsTrigger value="operations" className="gap-2"><Terminal className="h-4 w-4" />Operações</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants"><TenantManagement /></TabsContent>
        <TabsContent value="users"><UserManagement /></TabsContent>
        <TabsContent value="settings"><GlobalSettings /></TabsContent>
        <TabsContent value="metrics"><GlobalMetrics /></TabsContent>
        <TabsContent value="operations"><Operations /></TabsContent>
      </Tabs>
    </div>
  );
}
