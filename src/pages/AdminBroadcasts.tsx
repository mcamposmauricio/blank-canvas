import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Megaphone, Plus, Send, Clock, FileText, Eye, MousePointerClick, Users, Loader2,
  MoreHorizontal, Trash2, Edit, ArrowLeft, CheckCircle2, XCircle, Search,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { formatDate, getStatusLabel, getStatusColor } from "@/utils/campaignUtils";

interface Broadcast {
  id: string;
  title: string;
  message: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  completed_at: string | null;
  total_recipients: number;
  created_at: string;
  updated_at: string;
}

interface BroadcastRecipient {
  id: string;
  broadcast_id: string;
  company_contact_id: string;
  contact_id: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  clicked_at: string | null;
  chat_room_id: string | null;
  contact_name?: string;
  company_name?: string;
}

interface Company {
  id: string;
  name: string;
}

interface CompanyContact {
  id: string;
  name: string;
  email: string;
  company_id: string;
  role: string | null;
  department: string | null;
}

type View = "list" | "create" | "details";

export default function AdminBroadcasts() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [view, setView] = useState<View>("list");
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create form
  const [formTitle, setFormTitle] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "schedule">("now");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Contact selection
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState("");

  // Details view
  const [detailBroadcast, setDetailBroadcast] = useState<Broadcast | null>(null);
  const [recipients, setRecipients] = useState<BroadcastRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  useEffect(() => {
    fetchBroadcasts();
    fetchCompanies();
  }, []);

  const fetchBroadcasts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("chat_broadcasts")
      .select("*")
      .order("created_at", { ascending: false });
    setBroadcasts((data as any[]) ?? []);
    setLoading(false);
  };

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from("contacts")
      .select("id, name")
      .eq("is_company", true)
      .order("name");
    setCompanies(data ?? []);
  };

  const fetchContacts = async () => {
    let query = supabase
      .from("company_contacts")
      .select("id, name, email, company_id, role, department")
      .order("name");

    if (selectedCompanyFilter !== "all") {
      query = query.eq("company_id", selectedCompanyFilter);
    }

    const { data } = await query;
    setContacts(data ?? []);
  };

  useEffect(() => {
    fetchContacts();
  }, [selectedCompanyFilter]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (roleFilter && !c.role?.toLowerCase().includes(roleFilter.toLowerCase())) return false;
      if (deptFilter && !c.department?.toLowerCase().includes(deptFilter.toLowerCase())) return false;
      if (contactSearch && !c.name.toLowerCase().includes(contactSearch.toLowerCase()) && !c.email.toLowerCase().includes(contactSearch.toLowerCase())) return false;
      return true;
    });
  }, [contacts, roleFilter, deptFilter, contactSearch]);

  const filteredBroadcasts = useMemo(() => {
    if (statusFilter === "all") return broadcasts;
    return broadcasts.filter((b) => b.status === statusFilter);
  }, [broadcasts, statusFilter]);

  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedContactIds.size === filteredContacts.length) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(filteredContacts.map((c) => c.id)));
    }
  };

  const resetForm = () => {
    setFormTitle("");
    setFormMessage("");
    setScheduleMode("now");
    setScheduledDate(undefined);
    setScheduledTime("09:00");
    setSelectedContactIds(new Set());
    setSelectedCompanyFilter("all");
    setRoleFilter("");
    setDeptFilter("");
    setContactSearch("");
    setEditingId(null);
  };

  const handleSave = async (targetStatus: "draft" | "scheduled" | "live") => {
    if (!formTitle.trim() || !formMessage.trim()) {
      toast({ title: "Preencha título e mensagem", variant: "destructive" });
      return;
    }
    if (selectedContactIds.size === 0 && targetStatus !== "draft") {
      toast({ title: "Selecione ao menos um destinatário", variant: "destructive" });
      return;
    }
    if (targetStatus === "scheduled" && !scheduledDate) {
      toast({ title: "Selecione uma data de agendamento", variant: "destructive" });
      return;
    }

    setSaving(true);

    let scheduledAt: string | null = null;
    if (targetStatus === "scheduled" && scheduledDate) {
      const [h, m] = scheduledTime.split(":").map(Number);
      const dt = new Date(scheduledDate);
      dt.setHours(h, m, 0, 0);
      scheduledAt = dt.toISOString();
    }

    const broadcastData = {
      title: formTitle.trim(),
      message: formMessage.trim(),
      status: targetStatus,
      scheduled_at: scheduledAt,
      sent_at: targetStatus === "live" ? new Date().toISOString() : null,
      total_recipients: selectedContactIds.size,
      user_id: user!.id,
    };

    let broadcastId = editingId;

    if (editingId) {
      await supabase.from("chat_broadcasts").update(broadcastData).eq("id", editingId);
      // Remove old recipients and re-insert
      await supabase.from("chat_broadcast_recipients").delete().eq("broadcast_id", editingId);
    } else {
      const { data, error } = await supabase.from("chat_broadcasts").insert(broadcastData).select("id").single();
      if (error || !data) {
        toast({ title: "Erro ao criar broadcast", variant: "destructive" });
        setSaving(false);
        return;
      }
      broadcastId = data.id;
    }

    // Insert recipients
    if (selectedContactIds.size > 0 && broadcastId) {
      const { data: profileData } = await supabase.from("user_profiles").select("tenant_id").eq("user_id", user!.id).maybeSingle();
      const userTenantId = profileData?.tenant_id ?? null;
      const recipientRows = Array.from(selectedContactIds).map((contactId) => {
        const contact = contacts.find((c) => c.id === contactId);
        return {
          broadcast_id: broadcastId!,
          company_contact_id: contactId,
          contact_id: contact?.company_id || null,
          tenant_id: userTenantId,
          status: "pending",
        };
      });
      await supabase.from("chat_broadcast_recipients").insert(recipientRows);
    }

    // If live, invoke the edge function
    if (targetStatus === "live") {
      supabase.functions.invoke("process-chat-broadcasts").catch(console.error);
    }

    toast({ title: targetStatus === "draft" ? "Rascunho salvo" : targetStatus === "scheduled" ? "Broadcast agendado" : "Broadcast iniciado!" });
    resetForm();
    setView("list");
    fetchBroadcasts();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("chat_broadcast_recipients").delete().eq("broadcast_id", id);
    await supabase.from("chat_broadcasts").delete().eq("id", id);
    toast({ title: "Broadcast excluído" });
    fetchBroadcasts();
  };

  const openDetails = async (broadcast: Broadcast) => {
    setDetailBroadcast(broadcast);
    setView("details");
    setLoadingRecipients(true);

    const { data: recs } = await supabase
      .from("chat_broadcast_recipients")
      .select("*")
      .eq("broadcast_id", broadcast.id)
      .order("created_at");

    if (recs && recs.length > 0) {
      // Fetch contact names
      const contactIds = [...new Set((recs as any[]).map((r: any) => r.company_contact_id).filter(Boolean))];
      const companyIds = [...new Set((recs as any[]).map((r: any) => r.contact_id).filter(Boolean))];

      const [{ data: contactData }, { data: companyData }] = await Promise.all([
        supabase.from("company_contacts").select("id, name").in("id", contactIds),
        supabase.from("contacts").select("id, name").in("id", companyIds),
      ]);

      const contactMap = new Map((contactData ?? []).map((c) => [c.id, c.name]));
      const companyMap = new Map((companyData ?? []).map((c) => [c.id, c.name]));

      setRecipients(
        (recs as any[]).map((r: any) => ({
          ...r,
          contact_name: contactMap.get(r.company_contact_id) ?? "—",
          company_name: companyMap.get(r.contact_id) ?? "—",
        }))
      );
    } else {
      setRecipients([]);
    }
    setLoadingRecipients(false);
  };

  const openEdit = async (broadcast: Broadcast) => {
    setEditingId(broadcast.id);
    setFormTitle(broadcast.title);
    setFormMessage(broadcast.message);
    setScheduleMode(broadcast.scheduled_at ? "schedule" : "now");
    if (broadcast.scheduled_at) {
      setScheduledDate(new Date(broadcast.scheduled_at));
      setScheduledTime(format(new Date(broadcast.scheduled_at), "HH:mm"));
    }

    // Load existing recipients
    const { data: recs } = await supabase
      .from("chat_broadcast_recipients")
      .select("company_contact_id")
      .eq("broadcast_id", broadcast.id);

    setSelectedContactIds(new Set((recs ?? []).map((r: any) => r.company_contact_id)));
    setView("create");
  };

  // Metrics for detail view
  const detailMetrics = useMemo(() => {
    const total = recipients.length;
    const sent = recipients.filter((r) => r.status === "sent").length;
    const delivered = recipients.filter((r) => r.delivered_at).length;
    const clicked = recipients.filter((r) => r.clicked_at).length;
    return {
      total,
      sent,
      delivered,
      clicked,
      openRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
      clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
    };
  }, [recipients]);

  // ─── LIST VIEW ──────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title={t("broadcasts.title")} subtitle={t("broadcasts.subtitle")}>
          <Button onClick={() => { resetForm(); setView("create"); }}>
            <Plus className="h-4 w-4 mr-2" /> {t("broadcasts.new")}
          </Button>
        </PageHeader>

        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="scheduled">Agendado</SelectItem>
              <SelectItem value="live">Ativo</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filteredBroadcasts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Megaphone className="h-10 w-10 mb-3 opacity-40" />
              <p>{t("broadcasts.empty")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Destinatários</TableHead>
                  <TableHead className="text-center">Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBroadcasts.map((b) => (
                  <TableRow key={b.id} className="cursor-pointer" onClick={() => openDetails(b)}>
                    <TableCell className="font-medium">{b.title}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(b.status)}>{getStatusLabel(b.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{b.total_recipients}</TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm">
                      {formatDate(b.created_at)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {b.status === "draft" && (
                            <DropdownMenuItem onClick={() => openEdit(b)}>
                              <Edit className="h-4 w-4 mr-2" /> Editar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDelete(b.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  }

  // ─── DETAILS VIEW ──────────────────────────────────────────────────
  if (view === "details" && detailBroadcast) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView("list")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{detailBroadcast.title}</h1>
            <Badge className={getStatusColor(detailBroadcast.status)}>{getStatusLabel(detailBroadcast.status)}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="Enviados" value={detailMetrics.sent} icon={Send} />
          <MetricCard title="Visualizados" value={detailMetrics.delivered} icon={Eye} subtitle={`${detailMetrics.openRate}%`} />
          <MetricCard title="Clicados" value={detailMetrics.clicked} icon={MousePointerClick} subtitle={`${detailMetrics.clickRate}%`} />
          <MetricCard title="Total" value={detailMetrics.total} icon={Users} />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm">Mensagem</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{detailBroadcast.message}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Destinatários</CardTitle></CardHeader>
          <CardContent>
            {loadingRecipients ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contato</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enviado</TableHead>
                    <TableHead>Visualizado</TableHead>
                    <TableHead>Clicado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.contact_name}</TableCell>
                      <TableCell className="text-muted-foreground">{r.company_name}</TableCell>
                      <TableCell>
                        {r.status === "sent" ? (
                          <Badge variant="secondary" className="bg-accent/20 text-accent-foreground">Enviado</Badge>
                        ) : r.status === "failed" ? (
                          <Badge variant="destructive">Falhou</Badge>
                        ) : (
                          <Badge variant="secondary">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.sent_at ? formatDate(r.sent_at) : "—"}</TableCell>
                      <TableCell>{r.delivered_at ? <CheckCircle2 className="h-4 w-4 text-accent" /> : <XCircle className="h-4 w-4 text-muted-foreground/30" />}</TableCell>
                      <TableCell>{r.clicked_at ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-muted-foreground/30" />}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── CREATE/EDIT VIEW ──────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { resetForm(); setView("list"); }}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold">{editingId ? "Editar Broadcast" : t("broadcasts.new")}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Message */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Mensagem</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título da campanha</Label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Ex: Lançamento de novo recurso" />
              </div>
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea value={formMessage} onChange={(e) => setFormMessage(e.target.value)} placeholder="Olá! Temos novidades..." rows={6} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Agendamento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="schedule" checked={scheduleMode === "now"} onChange={() => setScheduleMode("now")} className="accent-primary" />
                  <span className="text-sm">Enviar agora</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="schedule" checked={scheduleMode === "schedule"} onChange={() => setScheduleMode("schedule")} className="accent-primary" />
                  <span className="text-sm">Agendar</span>
                </label>
              </div>
              {scheduleMode === "schedule" && (
                <div className="flex items-center gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-48">
                        <Clock className="h-4 w-4 mr-2" />
                        {scheduledDate ? format(scheduledDate, "dd/MM/yyyy") : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} />
                    </PopoverContent>
                  </Popover>
                  <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-28" />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>
              <FileText className="h-4 w-4 mr-2" /> Salvar Rascunho
            </Button>
            {scheduleMode === "schedule" ? (
              <Button onClick={() => handleSave("scheduled")} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Clock className="h-4 w-4 mr-2" /> Agendar
              </Button>
            ) : (
              <Button onClick={() => handleSave("live")} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Send className="h-4 w-4 mr-2" /> Enviar Agora
              </Button>
            )}
          </div>
        </div>

        {/* Right: Contact selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Destinatários</CardTitle>
              <Badge variant="secondary">{selectedContactIds.size} selecionado(s)</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} placeholder="Cargo" className="flex-1" />
                <Input value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} placeholder="Departamento" className="flex-1" />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} placeholder="Buscar contato..." className="pl-9" />
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-2 px-1">
              <Checkbox
                checked={filteredContacts.length > 0 && selectedContactIds.size === filteredContacts.length}
                onCheckedChange={toggleAll}
              />
              <span className="text-xs text-muted-foreground">Selecionar todos ({filteredContacts.length})</span>
            </div>

            <ScrollArea className="h-[340px]">
              <div className="space-y-1">
                {filteredContacts.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox checked={selectedContactIds.has(c.id)} onCheckedChange={() => toggleContact(c.id)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    </div>
                    {c.role && <Badge variant="outline" className="text-[10px] shrink-0">{c.role}</Badge>}
                  </label>
                ))}
                {filteredContacts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum contato encontrado</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
