import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { FilterBar } from "@/components/ui/filter-bar";
import { DateRangeFilter } from "@/components/ui/date-range-filter";

import { useLanguage } from "@/contexts/LanguageContext";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useAttendants } from "@/hooks/useAttendants";
import { useAuth } from "@/hooks/useAuth";
import { ReadOnlyChatDialog } from "@/components/chat/ReadOnlyChatDialog";
import { format } from "date-fns";
import { Download, Search, ChevronLeft, ChevronRight, Eye, Star, Loader2, RotateCcw, MoreHorizontal, Archive, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function formatDuration(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

function csatColor(score: number | null): string {
  if (score == null) return "";
  if (score <= 2) return "text-red-500";
  if (score === 3) return "text-yellow-500";
  return "text-green-500";
}

const AdminChatHistory = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { attendants } = useAttendants();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const [resolutionStatuses, setResolutionStatuses] = useState<string[]>([]);
  const [attendantIds, setAttendantIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [csatFilters, setCsatFilters] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [companyOptions, setCompanyOptions] = useState<{ id: string; name: string }[]>([]);
  const [contactOptions, setContactOptions] = useState<{ id: string; name: string; companyId: string }[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyContactId, setCompanyContactId] = useState<string | null>(null);

  const [readOnlyRoom, setReadOnlyRoom] = useState<{ id: string; name: string; resolution_status: string | null } | null>(null);

  // Auto-open room from ?room= query param
  useEffect(() => {
    const roomParam = searchParams.get("room");
    if (roomParam && !readOnlyRoom) {
      supabase.from("chat_rooms").select("id, visitor_id, resolution_status, chat_visitors!visitor_id(name)").eq("id", roomParam).maybeSingle().then(({ data }) => {
        if (data) {
          setReadOnlyRoom({ id: data.id, name: (data as any).chat_visitors?.name ?? "Visitante", resolution_status: data.resolution_status });
        }
      });
    }
  }, [searchParams]);

  useEffect(() => {
    Promise.all([
      supabase.from("chat_tags").select("id, name, color").order("name"),
      supabase.from("chat_teams").select("id, name").order("name"),
      supabase.from("contacts").select("id, name").eq("is_company", true).order("name"),
      supabase.from("company_contacts").select("id, name, company_id").order("name"),
    ]).then(([tagRes, teamRes, compRes, ccRes]) => {
      setTags(tagRes.data ?? []);
      setTeams((teamRes.data ?? []).map(t => ({ id: t.id, name: t.name })));
      setCompanyOptions((compRes.data ?? []).map(c => ({ id: c.id, name: c.name })));
      setContactOptions((ccRes.data ?? []).map(c => ({ id: c.id, name: c.name, companyId: c.company_id })));
    });
  }, []);

  // Compute ISO date range from dateFrom/dateTo
  const getDateRange = () => {
    if (dateFrom || dateTo) {
      return {
        from: dateFrom ? new Date(dateFrom + "T00:00:00").toISOString() : undefined,
        to: dateTo ? new Date(new Date(dateTo + "T00:00:00").getTime() + 86400000).toISOString() : undefined,
      };
    }
    return { from: undefined, to: undefined };
  };

  const dateRange = getDateRange();

  const { rooms, loading, totalCount, totalPages, exportToCSV, refetch } = useChatHistory({
    page, resolutionStatuses, attendantIds, search, tagIds, teamIds,
    companyId, companyContactId,
    csatFilters,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
  });

  const resolutionBadge = (status: string | null) => {
    switch (status) {
      case "resolved": return <Badge className="bg-green-100 text-green-800">{t("chat.history.resolved")}</Badge>;
      case "escalated": return <Badge className="bg-red-100 text-red-800">{t("chat.history.escalated")}</Badge>;
      case "pending": return <Badge className="bg-orange-100 text-orange-800">{t("chat.history.pending_status")}</Badge>;
      case "inactive": return <Badge className="bg-muted text-muted-foreground">Inativo</Badge>;
      case "archived": return <Badge className="bg-blue-100 text-blue-800">Arquivado</Badge>;
      default: return <Badge variant="secondary">{status ?? "—"}</Badge>;
    }
  };

  const handleFilterChange = () => { setPage(0); setSelectedIds(new Set()); };

  const handleReopenChat = async (roomId: string) => {
    if (!user) return;
    let attendantName = "Atendente";
    const { data: profile } = await supabase.from("user_profiles").select("display_name").eq("user_id", user.id).maybeSingle();
    if (profile?.display_name) attendantName = profile.display_name;
    let { data: attProfile } = await supabase.from("attendant_profiles").select("id").eq("user_id", user.id).maybeSingle();
    if (!attProfile) {
      let { data: csm } = await supabase.from("csms").select("id").eq("user_id", user.id).maybeSingle();
      if (!csm) {
        const { data: newCsm } = await supabase.from("csms").insert({ user_id: user.id, name: attendantName, email: user.email ?? "", is_chat_enabled: true }).select("id").single();
        csm = newCsm;
      }
      if (csm) { await new Promise(r => setTimeout(r, 500)); const { data: ap } = await supabase.from("attendant_profiles").select("id").eq("user_id", user.id).maybeSingle(); attProfile = ap; }
    }
    await supabase.from("chat_rooms").update({ status: "active", closed_at: null, resolution_status: null, attendant_id: attProfile?.id ?? null, assigned_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", roomId);
    await supabase.from("chat_messages").insert({ room_id: roomId, sender_type: "system", sender_name: "Sistema", content: `[Sistema] Chat reaberto e atribuído a ${attendantName}`, is_internal: false, metadata: { auto_rule: "chain_reset" } });
    supabase.functions.invoke("assign-chat-room", { body: { room_id: roomId } }).catch(() => {});
    toast.success("Chat reaberto e atribuído a você!"); refetch();
  };

  const handleBulkAction = async (action: "resolved" | "inactive" | "archived") => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    await supabase.from("chat_rooms").update({ resolution_status: action }).in("id", ids);
    const labels: Record<string, string> = { resolved: "marcado(s) como resolvido(s)", inactive: "inativado(s)", archived: "arquivado(s)" };
    toast.success(`${ids.length} chat(s) ${labels[action]}`);
    setSelectedIds(new Set()); refetch();
  };

  const handleIndividualAction = async (roomId: string, action: "resolved" | "inactive" | "archived") => {
    await supabase.from("chat_rooms").update({ resolution_status: action }).eq("id", roomId);
    const labels: Record<string, string> = { resolved: "Marcado como resolvido", inactive: "Inativado", archived: "Arquivado" };
    toast.success(labels[action]); refetch();
  };

  const toggleSelect = (id: string) => { setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const toggleSelectAll = () => { if (selectedIds.size === rooms.length) setSelectedIds(new Set()); else setSelectedIds(new Set(rooms.map(r => r.id))); };

  const handleFullExport = async () => {
    setExporting(true);
    try {
      const PAGE_SIZE = 100;
      let allRooms: any[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        let query = supabase.from("chat_rooms").select("id, status, resolution_status, created_at, closed_at, csat_score, visitor_id, attendant_id").eq("status", "closed").order("closed_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
        if (resolutionStatuses.length > 0) query = query.in("resolution_status", resolutionStatuses);
        if (attendantIds.length > 0) query = query.in("attendant_id", attendantIds);
        if (dateFrom) query = query.gte("closed_at", new Date(dateFrom + "T00:00:00").toISOString());
        if (dateTo) query = query.lte("closed_at", new Date(new Date(dateTo + "T00:00:00").getTime() + 86400000).toISOString());
        const { data } = await query;
        if (!data || data.length === 0) hasMore = false;
        else { allRooms = [...allRooms, ...data]; from += PAGE_SIZE; if (data.length < PAGE_SIZE) hasMore = false; }
      }
      const visitorIds = [...new Set(allRooms.map(r => r.visitor_id))];
      const { data: visitors } = await supabase.from("chat_visitors").select("id, name").in("id", visitorIds);
      const visitorMap = new Map(visitors?.map(v => [v.id, v.name]) ?? []);
      const attIds = [...new Set(allRooms.filter(r => r.attendant_id).map(r => r.attendant_id!))];
      let attMap = new Map<string, string>();
      if (attIds.length > 0) { const { data: atts } = await supabase.from("attendant_profiles").select("id, display_name").in("id", attIds); attMap = new Map(atts?.map(a => [a.id, a.display_name]) ?? []); }
      const headers = ["ID", "Cliente", "Atendente", "Resolução", "CSAT", "Duração (min)", "Início", "Encerramento"];
      const rows = allRooms.map(r => {
        const dur = r.closed_at && r.created_at ? Math.floor((new Date(r.closed_at).getTime() - new Date(r.created_at).getTime()) / 60000) : "";
        return [r.id.slice(0, 8), visitorMap.get(r.visitor_id) ?? "—", r.attendant_id ? (attMap.get(r.attendant_id) ?? "—") : "—", r.resolution_status ?? "—", r.csat_score != null ? `${r.csat_score}/5` : "—", String(dur), r.created_at ? new Date(r.created_at).toLocaleString("pt-BR") : "—", r.closed_at ? new Date(r.closed_at).toLocaleString("pt-BR") : "—"];
      });
      const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `historico-completo-${new Date().toISOString().split("T")[0]}.csv`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
      toast.success(`${allRooms.length} conversas exportadas`);
    } catch { toast.error("Erro ao exportar"); }
    setExporting(false);
  };

  const activeFilterCount = resolutionStatuses.length + attendantIds.length + csatFilters.length + tagIds.length + teamIds.length + (dateFrom ? 1 : 0) + (companyId ? 1 : 0) + (companyContactId ? 1 : 0);

  const clearAllFilters = () => {
    setResolutionStatuses([]); setAttendantIds([]); setCsatFilters([]); setTagIds([]); setTeamIds([]);
    setDateFrom(null); setDateTo(null); setSearch(""); setCompanyId(null); setCompanyContactId(null);
    handleFilterChange();
  };

  const handleCloseReadOnly = (open: boolean) => {
    if (!open) {
      setReadOnlyRoom(null);
      // Clear room param from URL
      if (searchParams.has("room")) {
        searchParams.delete("room");
        setSearchParams(searchParams, { replace: true });
      }
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{t("chat.history.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {totalCount} {t("chat.history.total_closed")}
              {activeFilterCount > 0 && <span className="ml-1 text-primary">({activeFilterCount} filtros ativos)</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" size="sm" disabled={rooms.length === 0}><Download className="h-4 w-4 mr-2" />Página</Button>
            <Button onClick={handleFullExport} variant="outline" size="sm" disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}Exportar Tudo
            </Button>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-2">
            <span className="text-[13px] font-medium">{selectedIds.size} selecionado(s)</span>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction("resolved")}><CheckCircle2 className="h-4 w-4 mr-1" />Marcar como Resolvido</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction("inactive")}><Archive className="h-4 w-4 mr-1" />Inativar</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction("archived")}><Archive className="h-4 w-4 mr-1" />Arquivar</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Limpar seleção</Button>
          </div>
        )}

        {/* Filters */}
        <FilterBar>
          <div className="relative flex-1 min-w-[140px] sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("chat.history.search_client")} value={search} onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }} className="pl-9 h-9" />
          </div>
          <DateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(from, to) => { setDateFrom(from); setDateTo(to); handleFilterChange(); }}
            maxRangeMonths={3}
          />
          <SearchableMultiSelect
            label="Status"
            options={[
              { value: "resolved", label: t("chat.history.resolved") },
              { value: "pending", label: t("chat.history.pending_status") },
              { value: "escalated", label: t("chat.history.escalated") },
              { value: "inactive", label: "Inativo" },
              { value: "archived", label: "Arquivado" },
            ]}
            selected={resolutionStatuses}
            onChange={(v) => { setResolutionStatuses(v); handleFilterChange(); }}
          />
          <SearchableMultiSelect
            label="Atendente"
            options={attendants.map(a => ({ value: a.id, label: a.display_name }))}
            selected={attendantIds}
            onChange={(v) => { setAttendantIds(v); handleFilterChange(); }}
          />
          {teams.length > 0 && (
            <SearchableMultiSelect
              label="Time"
              options={teams.map(t => ({ value: t.id, label: t.name }))}
              selected={teamIds}
              onChange={(v) => { setTeamIds(v); handleFilterChange(); }}
            />
          )}
          <SearchableMultiSelect
            label="CSAT"
            options={[
              { value: "low", label: "1-2 (Ruim)" },
              { value: "neutral", label: "3 (Neutro)" },
              { value: "good", label: "4-5 (Bom)" },
            ]}
            selected={csatFilters}
            onChange={(v) => { setCsatFilters(v); handleFilterChange(); }}
          />
          {tags.length > 0 && (
            <SearchableMultiSelect
              label="Tags"
              options={tags.map(tag => ({ value: tag.id, label: tag.name, color: tag.color }))}
              selected={tagIds}
              onChange={(v) => { setTagIds(v); handleFilterChange(); }}
            />
          )}
          {companyOptions.length > 0 && (
            <SearchableMultiSelect
              label="Empresa"
              options={companyOptions.map(c => ({ value: c.id, label: c.name }))}
              selected={companyId ? [companyId] : []}
              onChange={(v) => { setCompanyId(v[0] ?? null); setCompanyContactId(null); handleFilterChange(); }}
            />
          )}
          {contactOptions.length > 0 && (
            <SearchableMultiSelect
              label="Contato"
              options={(companyId ? contactOptions.filter(c => c.companyId === companyId) : contactOptions).map(c => ({ value: c.id, label: c.name }))}
              selected={companyContactId ? [companyContactId] : []}
              onChange={(v) => { setCompanyContactId(v[0] ?? null); handleFilterChange(); }}
            />
          )}
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-9 text-[11px] text-muted-foreground" onClick={clearAllFilters}>
              <X className="h-3 w-3 mr-1" />Limpar tudo
            </Button>
          )}
        </FilterBar>

        {/* Table */}
        <Card className="rounded-xl border border-white/[0.06] bg-card shadow-sm">
          <CardContent className="p-4">
            {loading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : rooms.length === 0 ? (
              <p className="text-[13px] text-muted-foreground text-center py-8">{t("chat.history.no_data")}</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"><Checkbox checked={selectedIds.size === rooms.length && rooms.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                      <TableHead className="w-[40px] text-[10px] font-medium uppercase tracking-wider text-muted-foreground"></TableHead>
                      <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">ID</TableHead>
                      <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("chat.history.client")}</TableHead>
                      <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">{t("chat.history.attendant")}</TableHead>
                      <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("chat.history.resolution")}</TableHead>
                      <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground hidden lg:table-cell">{t("chat.history.csat")}</TableHead>
                      <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Duração</TableHead>
                      <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground hidden lg:table-cell">{t("chat.history.tags")}</TableHead>
                      <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">{t("chat.history.started_at")}</TableHead>
                      <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">{t("chat.history.closed_at")}</TableHead>
                      <TableHead className="w-[80px] text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map(room => {
                      const duration = room.closed_at && room.created_at ? Math.floor((new Date(room.closed_at).getTime() - new Date(room.created_at).getTime()) / 60000) : null;
                      const visibleTags = room.tags.slice(0, 2);
                      const overflowTags = room.tags.slice(2);
                      return (
                        <TableRow key={room.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setReadOnlyRoom({ id: room.id, name: room.visitor_name ?? "Visitante", resolution_status: room.resolution_status })}>
                          <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedIds.has(room.id)} onCheckedChange={() => toggleSelect(room.id)} /></TableCell>
                          <TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
                          <TableCell className="font-mono text-[11px] hidden md:table-cell">{room.id.slice(0, 8)}</TableCell>
                          <TableCell className="text-[13px]">{room.visitor_name ?? "—"}</TableCell>
                          <TableCell className="text-[13px] hidden md:table-cell">{room.attendant_name ?? "—"}</TableCell>
                          <TableCell>{resolutionBadge(room.resolution_status)}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {room.csat_score != null ? (
                              <span className={`flex items-center gap-1 text-[13px] font-medium ${csatColor(room.csat_score)}`}>
                                <Star className="h-3 w-3 fill-current" />{room.csat_score}/5
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-[13px] tabular-nums hidden lg:table-cell">{formatDuration(duration)}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex gap-1 items-center flex-nowrap max-w-[180px] overflow-hidden">
                              {visibleTags.length > 0
                                ? visibleTags.map((tag, i) => <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 rounded whitespace-nowrap" style={{ borderColor: tag.color, color: tag.color }}>{tag.name}</Badge>)
                                : "—"}
                              {overflowTags.length > 0 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 rounded cursor-default whitespace-nowrap">+{overflowTags.length}</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[200px]">
                                      <div className="flex flex-wrap gap-1">
                                        {overflowTags.map((tag, i) => (
                                          <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 rounded" style={{ borderColor: tag.color, color: tag.color }}>{tag.name}</Badge>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-[13px] tabular-nums hidden md:table-cell">{format(new Date(room.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell className="text-[13px] tabular-nums hidden md:table-cell">{room.closed_at ? format(new Date(room.closed_at), "dd/MM/yyyy HH:mm") : "—"}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {room.resolution_status === "pending" && <DropdownMenuItem onClick={() => handleReopenChat(room.id)}><RotateCcw className="h-4 w-4 mr-2" />Reabrir</DropdownMenuItem>}
                                {room.resolution_status !== "resolved" && <DropdownMenuItem onClick={() => handleIndividualAction(room.id, "resolved")}><CheckCircle2 className="h-4 w-4 mr-2" />Marcar como Resolvido</DropdownMenuItem>}
                                {room.resolution_status !== "inactive" && <DropdownMenuItem onClick={() => handleIndividualAction(room.id, "inactive")}><Archive className="h-4 w-4 mr-2" />Inativar</DropdownMenuItem>}
                                {room.resolution_status !== "archived" && <DropdownMenuItem onClick={() => handleIndividualAction(room.id, "archived")}><Archive className="h-4 w-4 mr-2" />Arquivar</DropdownMenuItem>}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-[11px] text-muted-foreground">
                      {t("chat.history.page").replace("{page}", String(page + 1)).replace("{total}", String(totalPages))}
                    </p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <ReadOnlyChatDialog
        roomId={readOnlyRoom?.id ?? null}
        visitorName={readOnlyRoom?.name ?? ""}
        open={!!readOnlyRoom}
        onOpenChange={handleCloseReadOnly}
        resolutionStatus={readOnlyRoom?.resolution_status ?? null}
        onReopen={(id) => { handleReopenChat(id); setReadOnlyRoom(null); }}
      />
    </>
  );
};

export default AdminChatHistory;
