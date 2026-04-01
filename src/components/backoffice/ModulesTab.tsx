import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Settings, MessageSquare, BarChart3, TrendingUp, BookOpen } from "lucide-react";

const MODULES = [
  { key: "chat", label: "Chat / Atendimento", icon: MessageSquare },
  { key: "nps", label: "NPS / Pesquisas", icon: BarChart3 },
  { key: "cs", label: "Customer Success", icon: TrendingUp },
  { key: "help", label: "Help Center", icon: BookOpen },
];

export default function ModulesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTenant, setSelectedTenant] = useState<string>("all");

  const { data: tenants = [] } = useQuery({
    queryKey: ["bo-modules-tenants"],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data: modules = [] } = useQuery({
    queryKey: ["bo-modules-all"],
    queryFn: async () => {
      const { data } = await supabase.from("tenant_modules").select("*");
      return data ?? [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ tenantId, module, enabled }: { tenantId: string; module: string; enabled: boolean }) => {
      const existing = modules.find((m: any) => m.tenant_id === tenantId && m.module === module);
      if (existing) {
        const { error } = await supabase.from("tenant_modules").update({ is_enabled: enabled, updated_at: new Date().toISOString() }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tenant_modules").insert({ tenant_id: tenantId, module, is_enabled: enabled });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bo-modules-all"] });
      toast({ title: "Módulo atualizado" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const isModuleEnabled = (tenantId: string, moduleKey: string): boolean => {
    const entry = modules.find((m: any) => m.tenant_id === tenantId && m.module === moduleKey);
    // Permissive fallback: if no entry exists, module is enabled by default
    return entry ? entry.is_enabled : true;
  };

  const filteredTenants = selectedTenant === "all" ? tenants : tenants.filter((t) => t.id === selectedTenant);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" /> Módulos por Plataforma
        </h3>
        <Select value={selectedTenant} onValueChange={setSelectedTenant}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Filtrar tenant" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tenants</SelectItem>
            {tenants.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        Por padrão, todos os módulos estão habilitados. Desative módulos individualmente por tenant para controlar o acesso.
      </p>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plataforma</TableHead>
                {MODULES.map((m) => {
                  const Icon = m.icon;
                  return (
                    <TableHead key={m.key} className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" /> {m.label}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  {MODULES.map((mod) => {
                    const enabled = isModuleEnabled(tenant.id, mod.key);
                    return (
                      <TableCell key={mod.key} className="text-center">
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ tenantId: tenant.id, module: mod.key, enabled: checked })
                          }
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              {filteredTenants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum tenant encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
