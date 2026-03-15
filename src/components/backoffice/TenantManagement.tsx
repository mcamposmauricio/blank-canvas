import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Building2, Users, Send, MessageSquare, Eye, AlertTriangle, Copy, UserCheck } from "lucide-react";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface Tenant {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

interface TenantStats {
  tenant_id: string;
  users: number;
  contacts: number;
  campaigns: number;
  chat_rooms: number;
}

interface ExistingProfile {
  email: string;
  display_name: string | null;
  tenant_name: string;
}

interface TenantAdmin {
  id: string;
  email: string;
  display_name: string | null;
  invite_token: string | null;
  invite_status: string | null;
  tenant_id: string | null;
}

interface InviteResult {
  inviteUrl: string;
  email: string;
  userAlreadyExists: boolean;
}

export default function TenantManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setImpersonation } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", logo_url: "", admin_email: "", admin_name: "" });
  const [search, setSearch] = useState("");

  // Duplicate email warning state
  const [duplicateWarning, setDuplicateWarning] = useState<ExistingProfile[] | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  // Invite result dialog state
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["backoffice-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tenant[];
    },
  });

  const { data: stats = [] } = useQuery({
    queryKey: ["backoffice-tenant-stats"],
    queryFn: async () => {
      const results: TenantStats[] = [];
      for (const t of tenants) {
        const [users, contacts, campaigns, rooms] = await Promise.all([
          supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("tenant_id", t.id),
          supabase.from("contacts").select("id", { count: "exact", head: true }).eq("tenant_id", t.id),
          supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("tenant_id", t.id),
          supabase.from("chat_rooms").select("id", { count: "exact", head: true }).eq("tenant_id", t.id),
        ]);
        results.push({
          tenant_id: t.id,
          users: users.count ?? 0,
          contacts: contacts.count ?? 0,
          campaigns: campaigns.count ?? 0,
          chat_rooms: rooms.count ?? 0,
        });
      }
      return results;
    },
    enabled: tenants.length > 0,
  });

  // Query tenant admins (first admin per tenant)
  const { data: tenantAdmins = [] } = useQuery({
    queryKey: ["backoffice-tenant-admins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, email, display_name, invite_token, invite_status, tenant_id")
        .not("tenant_id", "is", null);
      if (error) throw error;
      return (data || []) as TenantAdmin[];
    },
  });

  const getAdminForTenant = (tenantId: string) => {
    const admins = tenantAdmins.filter(a => a.tenant_id === tenantId);
    const accepted = admins.find(a => a.invite_status === "accepted");
    if (accepted) return { status: "accepted" as const, admin: accepted };
    const pending = admins.find(a => a.invite_status === "pending");
    if (pending) return { status: "pending" as const, admin: pending };
    return { status: "none" as const, admin: null };
  };

  const copyInviteLink = (inviteToken: string) => {
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}/auth?invite=${inviteToken}`;
    navigator.clipboard.writeText(fullUrl);
    toast({ title: "Link copiado!" });
  };

  const doSave = async () => {
    if (editingTenant) {
      const { error } = await supabase.from("tenants").update({
        name: form.name,
        slug: form.slug || null,
        logo_url: form.logo_url || null,
      }).eq("id", editingTenant.id);
      if (error) throw error;
    } else {
      const { data: newTenant, error } = await supabase.from("tenants").insert({
        name: form.name,
        slug: form.slug || null,
        logo_url: form.logo_url || null,
      }).select("id").single();
      if (error) throw error;

      if (form.admin_email && form.admin_name) {
        const { data: provisionData, error: provisionError } = await supabase.functions.invoke("backoffice-admin", {
          body: {
            action: "provision-tenant-admin",
            tenantId: newTenant.id,
            email: form.admin_email,
            displayName: form.admin_name,
          },
        });
        if (provisionError) throw provisionError;
        if (provisionData?.error) throw new Error(provisionData.error);

        return provisionData;
      }
    }
  };

  const saveMutation = useMutation({
    mutationFn: doSave,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["backoffice-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["backoffice-tenant-admins"] });
      setDialogOpen(false);
      setEditingTenant(null);

      const inviteUrl = data?.inviteUrl;
      const userExists = data?.userAlreadyExists;
      const savedEmail = form.admin_email;

      setForm({ name: "", slug: "", logo_url: "", admin_email: "", admin_name: "" });

      if (!editingTenant && savedEmail && inviteUrl) {
        // Show persistent dialog with invite link
        setInviteResult({
          inviteUrl,
          email: savedEmail,
          userAlreadyExists: !!userExists,
        });
        setShowInviteDialog(true);
      } else {
        toast({
          title: editingTenant ? "Tenant atualizado" : "Plataforma criada!",
        });
      }
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const handleSaveClick = async () => {
    if (editingTenant || !form.admin_email) {
      saveMutation.mutate();
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("backoffice-admin", {
        body: { action: "check-email-exists", email: form.admin_email },
      });
      if (error) throw error;

      if (data?.exists && data.profiles?.length > 0) {
        setDuplicateWarning(data.profiles);
        setShowDuplicateDialog(true);
        return;
      }
    } catch {
      // If check fails, proceed anyway
    }

    saveMutation.mutate();
  };

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("tenants").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["backoffice-tenants"] }),
  });

  const openEdit = (t: Tenant) => {
    setEditingTenant(t);
    setForm({ name: t.name, slug: t.slug || "", logo_url: t.logo_url || "", admin_email: "", admin_name: "" });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingTenant(null);
    setForm({ name: "", slug: "", logo_url: "", admin_email: "", admin_name: "" });
    setDialogOpen(true);
  };

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.slug || "").toLowerCase().includes(search.toLowerCase())
  );

  const getStats = (id: string) => stats.find(s => s.tenant_id === id);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Plataformas / Tenants</CardTitle>
          <div className="flex items-center gap-2">
            <Input placeholder="Buscar tenant..." value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNew} size="sm" className="gap-2"><Plus className="h-4 w-4" />Novo Tenant</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTenant ? "Editar Tenant" : "Novo Tenant"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome da plataforma" /></div>
                  <div><Label>Slug</Label><Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="slug-unico" /></div>
                  <div>
                    <ImageUploadField
                      value={form.logo_url}
                      onChange={(url) => setForm(f => ({ ...f, logo_url: url }))}
                      label="Logo"
                      bucket="logos"
                      folder="tenants"
                      dimensions="200x60px"
                      maxSizeMB={1}
                      accept=".png,.svg,.webp"
                    />
                  </div>
                  {!editingTenant && (
                    <>
                      <Separator className="my-2" />
                      <p className="text-sm font-medium text-muted-foreground">Primeiro Administrador</p>
                      <div><Label>Nome do admin</Label><Input value={form.admin_name} onChange={e => setForm(f => ({ ...f, admin_name: e.target.value }))} placeholder="Nome completo" /></div>
                      <div><Label>Email do admin</Label><Input type="email" value={form.admin_email} onChange={e => setForm(f => ({ ...f, admin_email: e.target.value }))} placeholder="admin@empresa.com" /></div>
                    </>
                  )}
                  <Button onClick={handleSaveClick} disabled={!form.name || (!editingTenant && (!form.admin_email || !form.admin_name)) || saveMutation.isPending} className="w-full">
                    {saveMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead className="text-center"><Users className="h-4 w-4 inline" /></TableHead>
                  <TableHead className="text-center"><Building2 className="h-4 w-4 inline" /></TableHead>
                  <TableHead className="text-center"><Send className="h-4 w-4 inline" /></TableHead>
                  <TableHead className="text-center"><MessageSquare className="h-4 w-4 inline" /></TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => {
                  const s = getStats(t.id);
                  const adminInfo = getAdminForTenant(t.id);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {t.logo_url && <img src={t.logo_url} className="h-6 w-6 rounded object-cover" alt="" />}
                          {t.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t.slug || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={t.is_active ? "default" : "secondary"}>
                          {t.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {t.created_at ? format(new Date(t.created_at), "dd/MM/yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        {adminInfo.status === "accepted" && adminInfo.admin && (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="promoter" className="gap-1">
                              <UserCheck className="h-3 w-3" />
                              Ativo
                            </Badge>
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={adminInfo.admin.email}>
                              {adminInfo.admin.email}
                            </span>
                          </div>
                        )}
                        {adminInfo.status === "pending" && adminInfo.admin && (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="passive" className="gap-1">Pendente</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              title="Copiar link de convite"
                              onClick={() => adminInfo.admin?.invite_token && copyInviteLink(adminInfo.admin.invite_token)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                        {adminInfo.status === "none" && (
                          <span className="text-xs text-muted-foreground">Sem admin</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{s?.users ?? "—"}</TableCell>
                      <TableCell className="text-center">{s?.contacts ?? "—"}</TableCell>
                      <TableCell className="text-center">{s?.campaigns ?? "—"}</TableCell>
                      <TableCell className="text-center">{s?.chat_rooms ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Visualizar plataforma"
                            onClick={() => {
                              setImpersonation(t.id, t.name);
                              navigate("/admin/dashboard");
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                          <Switch checked={!!t.is_active} onCheckedChange={v => toggleActive.mutate({ id: t.id, active: v })} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Nenhum tenant encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Duplicate email warning dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Email já cadastrado no sistema
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>O email <strong>{form.admin_email}</strong> já está associado a outra(s) plataforma(s):</p>
                <ul className="list-disc list-inside space-y-1">
                  {duplicateWarning?.map((p, i) => (
                    <li key={i} className="text-sm">
                      <strong>{p.tenant_name}</strong> — {p.display_name || p.email}
                    </li>
                  ))}
                </ul>
                <p className="text-sm">
                  Deseja criar um convite para que este usuário também acesse a nova plataforma? 
                  Ele precisará aceitar o convite para ter acesso.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowDuplicateDialog(false);
              saveMutation.mutate();
            }}>
              Sim, criar convite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite success dialog with copyable link */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Plataforma criada com sucesso!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {inviteResult?.userAlreadyExists
                ? `O usuário ${inviteResult.email} já possui conta e receberá um email com o convite.`
                : `Um convite foi criado para ${inviteResult?.email}. Compartilhe o link abaixo para que o administrador configure a plataforma.`
              }
            </p>
            <div className="space-y-2">
              <Label>Link de acesso</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteResult?.inviteUrl ? `${window.location.origin}/auth?invite=${inviteResult.inviteUrl.split("invite=")[1] || inviteResult.inviteUrl}` : ""}
                  className="text-xs font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => {
                    const token = inviteResult?.inviteUrl?.split("invite=")[1] || inviteResult?.inviteUrl;
                    if (token) {
                      navigator.clipboard.writeText(`${window.location.origin}/auth?invite=${token}`);
                      toast({ title: "Link copiado!" });
                    }
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
              O administrador deve acessar este link para criar sua senha e configurar a plataforma. O link é válido até ser utilizado.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowInviteDialog(false); setInviteResult(null); }}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
