import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldOff } from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string | null;
  email: string;
  display_name: string | null;
  tenant_id: string | null;
  is_active: boolean | null;
  invite_status: string | null;
  last_sign_in_at: string | null;
  created_at: string | null;
}

interface TenantOption {
  id: string;
  name: string;
}

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterTenant, setFilterTenant] = useState<string>("all");

  const { data: tenants = [] } = useQuery({
    queryKey: ["backoffice-tenants-options"],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("id, name").order("name");
      return (data ?? []) as TenantOption[];
    },
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["backoffice-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["backoffice-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role");
      return data ?? [];
    },
  });

  const getUserRoles = (userId: string | null) =>
    roles.filter(r => r.user_id === userId).map(r => r.role);

  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, isCurrentlyAdmin }: { userId: string; isCurrentlyAdmin: boolean }) => {
      if (isCurrentlyAdmin) {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backoffice-roles"] });
      toast({ title: "Role atualizada" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("user_profiles").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["backoffice-users"] }),
  });

  const changeTenant = useMutation({
    mutationFn: async ({ id, tenantId }: { id: string; tenantId: string | null }) => {
      const { error } = await supabase.from("user_profiles").update({ tenant_id: tenantId }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backoffice-users"] });
      toast({ title: "Tenant atualizado" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const getTenantName = (id: string | null) => tenants.find(t => t.id === id)?.name || "Sem tenant";

  const filtered = users.filter(u => {
    const matchSearch = u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.display_name || "").toLowerCase().includes(search.toLowerCase());
    const matchTenant = filterTenant === "all" || u.tenant_id === filterTenant || (filterTenant === "none" && !u.tenant_id);
    return matchSearch && matchTenant;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Usuários Globais</CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <Input placeholder="Buscar por email ou nome..." value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
          <Select value={filterTenant} onValueChange={setFilterTenant}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar tenant" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tenants</SelectItem>
              <SelectItem value="none">Sem tenant</SelectItem>
              {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Convite</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Mover Tenant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(u => {
                const userRoles = getUserRoles(u.user_id);
                const isAdminUser = userRoles.includes("admin");
                const isMasterUser = userRoles.includes("master");
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{u.display_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{getTenantName(u.tenant_id)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {userRoles.map(r => (
                          <Badge key={r} variant={r === "master" ? "destructive" : r === "admin" ? "default" : "secondary"} className="text-xs">
                            {r}
                          </Badge>
                        ))}
                        {userRoles.length === 0 && <span className="text-xs text-muted-foreground">user</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? "default" : "secondary"}>
                        {u.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.invite_status || "—"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={!!u.is_active}
                        onCheckedChange={v => toggleActive.mutate({ id: u.id, active: v })}
                        disabled={isMasterUser}
                      />
                    </TableCell>
                    <TableCell>
                      {!isMasterUser && u.user_id && (
                        <Button
                          variant={isAdminUser ? "destructive" : "outline"}
                          size="sm"
                          className="gap-1"
                          onClick={() => toggleAdmin.mutate({ userId: u.user_id!, isCurrentlyAdmin: isAdminUser })}
                        >
                          {isAdminUser ? <ShieldOff className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                          {isAdminUser ? "Revogar" : "Promover"}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.tenant_id || "none"}
                        onValueChange={v => changeTenant.mutate({ id: u.id, tenantId: v === "none" ? null : v })}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem tenant</SelectItem>
                          {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
