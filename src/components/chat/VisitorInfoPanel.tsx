import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Phone, Building2, Hash, Star, Calendar, DollarSign, Activity, ExternalLink, RefreshCw, ChevronDown, Clock, FileText, MapPin, Briefcase, Link2, Layers, Users, Bot, XCircle, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { isComplexValue, formatComplexValue, SimpleList, UrlList, ObjectList, JsonDisplay } from "@/components/CustomFieldsDisplay";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { TimelineComponent } from "@/components/cs/TimelineComponent";
import { ReadOnlyChatDialog } from "@/components/chat/ReadOnlyChatDialog";

interface Visitor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  department: string | null;
  created_at: string;
  contact_id: string | null;
  company_contact_id: string | null;
}

interface CompanyContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  department: string | null;
  external_id: string | null;
  chat_total: number | null;
  chat_avg_csat: number | null;
  chat_last_at: string | null;
  custom_fields: Record<string, any> | null;
}

interface Company {
  id: string;
  name: string;
  trade_name: string | null;
  health_score: number | null;
  mrr: number | null;
  contract_value: number | null;
  renewal_date: string | null;
  last_nps_score: number | null;
  last_nps_date: string | null;
  city: string | null;
  state: string | null;
  company_sector: string | null;
  company_document: string | null;
  custom_fields: Record<string, any> | null;
  external_id: string | null;
  service_category_id: string | null;
}

interface CategoryInfo {
  id: string;
  name: string;
  color: string | null;
}

interface TeamInfo {
  id: string;
  name: string;
}

interface AssignmentInfo {
  model: string;
  capacity_limit: number;
  online_only: boolean;
  enabled: boolean;
}

interface AutoRuleInfo {
  id: string;
  rule_type: string;
  trigger_minutes: number | null;
  message_content: string | null;
  close_resolution_status: string;
}

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string | null;
  date: string;
  user_name: string;
  metadata: Record<string, unknown>;
}

interface FieldDef {
  id: string;
  key: string;
  label: string;
  field_type: string;
  target: string;
  maps_to: string | null;
  display_order: number | null;
  is_active: boolean;
}

interface RecentChat {
  id: string;
  status: string;
  created_at: string;
  closed_at: string | null;
  csat_score: number | null;
  attendant_name: string | null;
  tags: { name: string; color: string | null }[];
}

export interface WorkspaceDisplaySettings {
  ws_show_company_info: boolean;
  ws_show_company_cnpj: boolean;
  ws_show_company_external_id: boolean;
  ws_show_company_sector: boolean;
  ws_show_company_location: boolean;
  ws_show_metrics: boolean;
  ws_show_metric_health: boolean;
  ws_show_metric_mrr: boolean;
  ws_show_metric_contract: boolean;
  ws_show_metric_nps: boolean;
  ws_show_metric_renewal: boolean;
  ws_show_contact_data: boolean;
  ws_show_contact_department: boolean;
  ws_show_contact_external_id: boolean;
  ws_show_contact_chat_stats: boolean;
  ws_show_custom_fields: boolean;
  ws_hidden_custom_fields: string[];
  ws_show_timeline: boolean;
  ws_timeline_max_events: number;
  ws_show_recent_chats: boolean;
  ws_recent_chats_count: number;
  ws_show_queue_info?: boolean;
}

const DEFAULT_SETTINGS: WorkspaceDisplaySettings = {
  ws_show_company_info: true,
  ws_show_company_cnpj: true,
  ws_show_company_external_id: true,
  ws_show_company_sector: true,
  ws_show_company_location: true,
  ws_show_metrics: true,
  ws_show_metric_health: true,
  ws_show_metric_mrr: true,
  ws_show_metric_contract: true,
  ws_show_metric_nps: true,
  ws_show_metric_renewal: true,
  ws_show_contact_data: true,
  ws_show_contact_department: true,
  ws_show_contact_external_id: true,
  ws_show_contact_chat_stats: true,
  ws_show_custom_fields: true,
  ws_hidden_custom_fields: [],
  ws_show_timeline: true,
  ws_timeline_max_events: 10,
  ws_show_recent_chats: true,
  ws_recent_chats_count: 5,
  ws_show_queue_info: true,
};

interface VisitorInfoPanelProps {
  roomId: string;
  visitorId: string;
  contactId?: string | null;
  companyContactId?: string | null;
  displaySettings?: WorkspaceDisplaySettings;
  activeRoomId?: string;
}

function getHealthColor(score: number) {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
}

function getHealthBg(score: number) {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

function getNpsBadge(score: number) {
  if (score >= 9) return { label: "Promotor", className: "bg-green-500/15 text-green-700 border-green-500/30" };
  if (score >= 7) return { label: "Neutro", className: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" };
  return { label: "Detrator", className: "bg-red-500/15 text-red-700 border-red-500/30" };
}

function isUrl(val: string) {
  return /^(https?:\/\/|www\.)/i.test(val);
}

function ClickableValue({ value, type }: { value: string; type?: string }) {
  if (type === "url" || isUrl(value)) {
    const href = value.startsWith("http") ? value : `https://${value}`;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
        {value.replace(/^https?:\/\//, "").slice(0, 35)}
      </a>
    );
  }
  return <span className="truncate">{value}</span>;
}

export function VisitorInfoPanel({ roomId, visitorId, contactId: propContactId, companyContactId: propCompanyContactId, displaySettings, activeRoomId }: VisitorInfoPanelProps) {
  const s = displaySettings ?? DEFAULT_SETTINGS;
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyContact, setCompanyContact] = useState<CompanyContact | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [fieldDefs, setFieldDefs] = useState<FieldDef[]>([]);
  const [visitorMetadata, setVisitorMetadata] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [chatPage, setChatPage] = useState(0);
  const [hasMoreChats, setHasMoreChats] = useState(false);
  const [readOnlyRoom, setReadOnlyRoom] = useState<{ id: string; name: string } | null>(null);
  const [categoryInfo, setCategoryInfo] = useState<CategoryInfo | null>(null);
  const [categoryTeams, setCategoryTeams] = useState<TeamInfo[]>([]);
  const [assignmentInfo, setAssignmentInfo] = useState<AssignmentInfo | null>(null);
  const [autoRules, setAutoRules] = useState<AutoRuleInfo[]>([]);
  const CHAT_PAGE_SIZE = s.ws_recent_chats_count;
  const fieldDefsCache = useRef<FieldDef[] | null>(null);

  const fetchRecentChats = async (contactId: string | null | undefined, companyContactId: string | null | undefined, page: number) => {
    if (!contactId && !companyContactId) return;
    let query = supabase
      .from("chat_rooms")
      .select("id, status, created_at, closed_at, csat_score, attendant_id")
      .order("created_at", { ascending: false })
      .range(page * CHAT_PAGE_SIZE, (page + 1) * CHAT_PAGE_SIZE);

    if (companyContactId) {
      query = query.eq("company_contact_id", companyContactId);
    } else if (contactId) {
      query = query.eq("contact_id", contactId);
    }

    const { data: rooms } = await query;
    const roomList = rooms ?? [];
    setHasMoreChats(roomList.length > CHAT_PAGE_SIZE);
    const trimmed = roomList.slice(0, CHAT_PAGE_SIZE);

    const attIds = [...new Set(trimmed.map(r => r.attendant_id).filter(Boolean))] as string[];
    const roomIds = trimmed.map(r => r.id);

    const [attRes, tagsRes] = await Promise.all([
      attIds.length > 0 ? supabase.from("attendant_profiles").select("id, display_name").in("id", attIds) : Promise.resolve({ data: [] }),
      roomIds.length > 0 ? supabase.from("chat_room_tags").select("room_id, tag_id, chat_tags!tag_id(name, color)").in("room_id", roomIds) : Promise.resolve({ data: [] }),
    ]);

    const attMap: Record<string, string> = {};
    (attRes.data ?? []).forEach((a: any) => { attMap[a.id] = a.display_name; });
    const tagMap: Record<string, { name: string; color: string | null }[]> = {};
    (tagsRes.data ?? []).forEach((rt: any) => {
      if (!tagMap[rt.room_id]) tagMap[rt.room_id] = [];
      if (rt.chat_tags) tagMap[rt.room_id].push({ name: rt.chat_tags.name, color: rt.chat_tags.color });
    });

    const mapped: RecentChat[] = trimmed.map(r => ({
      id: r.id,
      status: r.status ?? "closed",
      created_at: r.created_at ?? "",
      closed_at: r.closed_at,
      csat_score: r.csat_score,
      attendant_name: r.attendant_id ? (attMap[r.attendant_id] ?? null) : null,
      tags: tagMap[r.id] ?? [],
    }));

    if (page === 0) {
      setRecentChats(mapped);
    } else {
      setRecentChats(prev => [...prev, ...mapped]);
    }
    setChatPage(page);
  };

  const loadMoreChats = async () => {
    const cId = propContactId || visitor?.contact_id;
    const ccId = propCompanyContactId || visitor?.company_contact_id;
    await fetchRecentChats(cId, ccId, chatPage + 1);
  };

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    // ── Group 1: visitor + field_defs (parallel) ──
    const [visitorRes, defsRes] = await Promise.all([
      supabase
        .from("chat_visitors")
        .select("id, name, email, phone, role, department, created_at, contact_id, company_contact_id, metadata")
        .eq("id", visitorId)
        .maybeSingle(),
      // Use cached field_defs if available
      fieldDefsCache.current
        ? Promise.resolve({ data: fieldDefsCache.current })
        : supabase
            .from("chat_custom_field_definitions" as any)
            .select("*")
            .eq("is_active", true)
            .order("display_order", { ascending: true }),
    ]);

    const v = visitorRes.data as (Visitor & { metadata?: Record<string, any> }) | null;
    setVisitor(v);
    setVisitorMetadata((v?.metadata as Record<string, any>) ?? {});

    const fetchedDefs = (defsRes.data as any as FieldDef[]) ?? [];
    if (!fieldDefsCache.current) fieldDefsCache.current = fetchedDefs;
    setFieldDefs(fetchedDefs);

    const resolvedContactId = propContactId || v?.contact_id;
    const resolvedCcId = propCompanyContactId || v?.company_contact_id;

    // ── Group 2: company + timeline + companyContact + recentChats (parallel) ──
    const group2: Promise<any>[] = [];
    let companyData: Company | null = null;

    if (resolvedContactId) {
      group2.push(
        (async () => {
          const { data } = await supabase
            .from("contacts")
            .select("id, name, trade_name, health_score, mrr, contract_value, renewal_date, last_nps_score, last_nps_date, city, state, company_sector, company_document, custom_fields, external_id, service_category_id")
            .eq("id", resolvedContactId)
            .maybeSingle();
          companyData = data as Company | null;
          setCompany(data as Company | null);
        })(),
        (async () => {
          const { data } = await supabase
            .from("timeline_events")
            .select("id, type, title, description, date, user_name, metadata")
            .eq("contact_id", resolvedContactId)
            .order("date", { ascending: false })
            .limit(s.ws_timeline_max_events);
          setTimelineEvents((data as TimelineEvent[]) ?? []);
        })(),
      );
    }

    if (resolvedCcId) {
      group2.push(
        (async () => {
          const { data } = await supabase
            .from("company_contacts")
            .select("id, name, email, phone, role, department, external_id, chat_total, chat_avg_csat, chat_last_at, custom_fields")
            .eq("id", resolvedCcId)
            .maybeSingle();
          setCompanyContact(data as CompanyContact | null);
        })(),
      );
    }

    // Recent chats in parallel with group 2
    group2.push(fetchRecentChats(resolvedContactId, resolvedCcId, 0));

    await Promise.all(group2);

    // ── Group 3: queue/category info (uses companyData from group 2) ──
    const catId = companyData?.service_category_id;

    const [catRes, rulesRes] = await Promise.all([
      catId
        ? supabase.from("chat_service_categories").select("id, name, color").eq("id", catId).maybeSingle()
        : supabase.from("chat_service_categories").select("id, name, color").eq("is_default", true).maybeSingle(),
      supabase.from("chat_auto_rules").select("id, rule_type, trigger_minutes, message_content, close_resolution_status").eq("is_enabled", true).order("sort_order", { ascending: true }),
    ]);

    const cat = catRes.data as CategoryInfo | null;
    setCategoryInfo(cat);
    setAutoRules((rulesRes.data as AutoRuleInfo[]) ?? []);

    if (cat) {
      const { data: ctData } = await supabase
        .from("chat_category_teams")
        .select("id, team_id")
        .eq("category_id", cat.id);

      const ctList = ctData ?? [];
      if (ctList.length > 0) {
        const teamIds = ctList.map((ct: any) => ct.team_id);
        const ctIds = ctList.map((ct: any) => ct.id);

        const [teamsRes, configRes] = await Promise.all([
          supabase.from("chat_teams").select("id, name").in("id", teamIds),
          supabase.from("chat_assignment_configs").select("model, capacity_limit, online_only, enabled").in("category_team_id", ctIds).limit(1).maybeSingle(),
        ]);

        setCategoryTeams((teamsRes.data as TeamInfo[]) ?? []);
        setAssignmentInfo(configRes.data as AssignmentInfo | null);
      } else {
        setCategoryTeams([]);
        setAssignmentInfo(null);
      }
    } else {
      setCategoryTeams([]);
      setAssignmentInfo(null);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, [visitorId, propContactId, propCompanyContactId]);

  // pg_changes listener removed for performance — data refreshes on room switch and manual edits

  if (loading) {
    return (
      <div className="glass-card h-full flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (!visitor) return null;

  const displayContact = companyContact || visitor;
  const hasCompany = !!company;

  const companyCustomFields = company?.custom_fields ?? {};
  const contactCustomFields = (companyContact?.custom_fields as Record<string, any>) ?? {};

  return (
    <div className="glass-card h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-1.5 relative">
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            onClick={() => {
              const url = `${window.location.origin}/admin/chat/${roomId}`;
              navigator.clipboard.writeText(url);
              toast({ title: "Link copiado!", description: "Link direto da conversa copiado para a área de transferência." });
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Copiar link direto"
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{displayContact.name}</p>
            {displayContact.role && <p className="text-[11px] text-muted-foreground truncate">{displayContact.role}</p>}
          </div>
        </div>

        {displayContact.email && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0" />
            <a href={`mailto:${displayContact.email}`} className="truncate hover:text-primary hover:underline transition-colors">
              {displayContact.email}
            </a>
          </div>
        )}
        {displayContact.phone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0" />
            <a href={`tel:${displayContact.phone}`} className="hover:text-primary hover:underline transition-colors">
              {displayContact.phone}
            </a>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">

          {/* EMPRESA */}
          {hasCompany && s.ws_show_company_info && (
            <section>
              <SectionLabel>Empresa</SectionLabel>
              <div className="space-y-1.5">
                <button onClick={() => navigate("/nps/contacts")} className="text-left group w-full">
                  <p className="font-medium text-sm group-hover:text-primary transition-colors flex items-center gap-1">
                    {company!.trade_name || company!.name}
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                  {company!.trade_name && company!.name !== company!.trade_name && (
                    <p className="text-[11px] text-muted-foreground">{company!.name}</p>
                  )}
                </button>

                {s.ws_show_company_cnpj && company!.company_document && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3 shrink-0" />
                    <span>CNPJ: {company!.company_document}</span>
                  </div>
                )}
                {s.ws_show_company_external_id && company!.external_id && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Hash className="h-3 w-3 shrink-0" />
                    <span>ID Externo: {company!.external_id}</span>
                  </div>
                )}
                {s.ws_show_company_sector && company!.company_sector && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Briefcase className="h-3 w-3 shrink-0" />
                    <span>{company!.company_sector}</span>
                  </div>
                )}
                {s.ws_show_company_location && (company!.city || company!.state) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span>{[company!.city, company!.state].filter(Boolean).join(", ")}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* FILA DE ATENDIMENTO */}
          {(s.ws_show_queue_info !== false) && (categoryInfo || autoRules.length > 0) && (
            <section className="border-t border-border pt-3">
              <SectionLabel className="flex items-center gap-1">
                <Layers className="h-3 w-3" /> Fila de Atendimento
              </SectionLabel>
              <div className="space-y-2">
                {categoryInfo && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Categoria:</span>
                      <Badge variant="outline" className="text-[10px] font-medium gap-1">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: categoryInfo.color ?? 'hsl(var(--primary))' }} />
                        {categoryInfo.name}
                      </Badge>
                    </div>
                    {categoryTeams.length > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground truncate">
                          {categoryTeams.map(t => t.name).join(", ")}
                        </span>
                      </div>
                    )}
                    {assignmentInfo && assignmentInfo.enabled && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                          {assignmentInfo.model === "round_robin" ? "Round Robin" : assignmentInfo.model === "load_balance" ? "Load Balance" : assignmentInfo.model}
                        </Badge>
                        {assignmentInfo.online_only && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Online only</Badge>
                        )}
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                          Cap. {assignmentInfo.capacity_limit}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {autoRules.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Regras Automáticas</p>
                    {autoRules.map(rule => (
                      <div key={rule.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        {rule.rule_type === "auto_close" ? (
                          <XCircle className="h-3 w-3 shrink-0" />
                        ) : (
                          <MessageSquare className="h-3 w-3 shrink-0" />
                        )}
                        <span>
                          {rule.rule_type === "auto_close"
                            ? `Fechar sala após ${rule.trigger_minutes} min inativo`
                            : `Auto-mensagem após ${rule.trigger_minutes} min inativo`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* MÉTRICAS */}
          {hasCompany && s.ws_show_metrics && (
            <section className="border-t border-border pt-3">
              <SectionLabel>Métricas</SectionLabel>

              {/* Health Score */}
              {s.ws_show_metric_health && company!.health_score != null && (
                <button onClick={() => navigate("/cs-health")} className="w-full text-left group mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                      Health Score
                      <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                    <span className={`text-xs font-bold ${getHealthColor(company!.health_score!)}`}>
                      {company!.health_score}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getHealthBg(company!.health_score!)}`}
                      style={{ width: `${company!.health_score}%` }}
                    />
                  </div>
                </button>
              )}

              {/* Metric pills */}
              <div className="flex flex-wrap gap-1.5">
                {s.ws_show_metric_mrr && company!.mrr != null && Number(company!.mrr) > 0 && (
                  <button onClick={() => navigate("/cs-financial")} className="group">
                    <Badge variant="outline" className="text-[10px] font-medium gap-1 group-hover:border-primary group-hover:text-primary transition-colors">
                      <DollarSign className="h-2.5 w-2.5" />
                      MRR R$ {Number(company!.mrr).toLocaleString("pt-BR")}
                    </Badge>
                  </button>
                )}
                {s.ws_show_metric_contract && company!.contract_value != null && Number(company!.contract_value) > 0 && (
                  <button onClick={() => navigate("/cs-financial")} className="group">
                    <Badge variant="outline" className="text-[10px] font-medium gap-1 group-hover:border-primary group-hover:text-primary transition-colors">
                      Contrato R$ {Number(company!.contract_value).toLocaleString("pt-BR")}
                    </Badge>
                  </button>
                )}
                {s.ws_show_metric_nps && company!.last_nps_score != null && (
                  <button onClick={() => navigate("/nps/dashboard")} className="group">
                    <Badge variant="outline" className={`text-[10px] font-medium gap-1 ${getNpsBadge(company!.last_nps_score!).className}`}>
                      <Star className="h-2.5 w-2.5" />
                      NPS {company!.last_nps_score}
                    </Badge>
                  </button>
                )}
                {s.ws_show_metric_renewal && company!.renewal_date && (
                  <Badge variant="outline" className="text-[10px] font-medium gap-1">
                    <Calendar className="h-2.5 w-2.5" />
                    Renov. {new Date(company!.renewal_date).toLocaleDateString("pt-BR")}
                  </Badge>
                )}
              </div>
            </section>
          )}

          {/* DADOS DO CONTATO */}
          {s.ws_show_contact_data && (
            <section className="border-t border-border pt-3">
              <SectionLabel>Dados do Contato</SectionLabel>
              <div className="space-y-1.5">
                {s.ws_show_contact_department && companyContact?.department && (
                  <InfoRow label="Departamento" value={companyContact.department} />
                )}
                {s.ws_show_contact_external_id && companyContact?.external_id && (
                  <InfoRow label="External ID" value={companyContact.external_id} />
                )}
                {s.ws_show_contact_chat_stats && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Badge variant="secondary" className="text-[10px] font-medium gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {companyContact?.chat_total ?? 0} sessões
                    </Badge>
                    {companyContact?.chat_avg_csat != null && Number(companyContact.chat_avg_csat) > 0 && (
                      <Badge variant="secondary" className="text-[10px] font-medium gap-1">
                        <Star className="h-2.5 w-2.5" />
                        CSAT {Number(companyContact.chat_avg_csat).toFixed(1)}
                      </Badge>
                    )}
                    {companyContact?.chat_last_at && (
                      <Badge variant="secondary" className="text-[10px] font-medium gap-1">
                        Último: {new Date(companyContact.chat_last_at).toLocaleDateString("pt-BR")}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* CAMPOS CUSTOMIZADOS */}
          {s.ws_show_custom_fields && (() => {
            const hiddenKeys = s.ws_hidden_custom_fields;
            const allCustomEntries: { key: string; label: string; value: any; fieldType: string; order: number }[] = [];

            fieldDefs.forEach((fd) => {
              if (fd.maps_to) return;
              if (hiddenKeys.includes(fd.key)) return;
              if (visitorMetadata[fd.key] !== undefined && visitorMetadata[fd.key] !== null) {
                allCustomEntries.push({ key: `v_${fd.key}`, label: fd.label, value: visitorMetadata[fd.key], fieldType: fd.field_type, order: fd.display_order ?? 999 });
              }
            });

            const companyDefs = fieldDefs.filter(fd => fd.target === "company");
            companyDefs.forEach(fd => {
              if (fd.maps_to) return;
              if (hiddenKeys.includes(fd.key)) return;
              if (companyCustomFields[fd.key] !== undefined && companyCustomFields[fd.key] !== null && !allCustomEntries.some(e => e.label === fd.label)) {
                allCustomEntries.push({ key: `c_${fd.key}`, label: fd.label, value: companyCustomFields[fd.key], fieldType: fd.field_type, order: fd.display_order ?? 999 });
              }
            });
            Object.entries(companyCustomFields).forEach(([key, val]) => {
              if (val != null && !companyDefs.some(fd => fd.key === key) && !allCustomEntries.some(e => e.label === key) && !hiddenKeys.includes(key)) {
                allCustomEntries.push({ key: `cf_${key}`, label: key, value: val, fieldType: "text", order: 9999 });
              }
            });

            const contactDefs = fieldDefs.filter(fd => fd.target === "contact");
            contactDefs.forEach(fd => {
              if (hiddenKeys.includes(fd.key)) return;
              if (contactCustomFields[fd.key] !== undefined && contactCustomFields[fd.key] !== null && !allCustomEntries.some(e => e.label === fd.label)) {
                allCustomEntries.push({ key: `cc_${fd.key}`, label: fd.label, value: contactCustomFields[fd.key], fieldType: fd.field_type, order: fd.display_order ?? 999 });
              }
            });
            Object.entries(contactCustomFields).forEach(([key, val]) => {
              if (val != null && !contactDefs.some(fd => fd.key === key) && !allCustomEntries.some(e => e.label === key) && !hiddenKeys.includes(key)) {
                allCustomEntries.push({ key: `ccf_${key}`, label: key, value: val, fieldType: "text", order: 9999 });
              }
            });

            allCustomEntries.sort((a, b) => a.order - b.order);

            if (allCustomEntries.length === 0) return null;

            return (
              <section className="border-t border-border pt-3">
                <SectionLabel>Campos Customizados</SectionLabel>
                <div className="space-y-1.5">
                  {allCustomEntries.map((entry) => (
                    <CustomFieldRow key={entry.key} label={entry.label} value={entry.value} fieldType={entry.fieldType} />
                  ))}
                </div>
              </section>
            );
          })()}

          {/* ÚLTIMOS CHATS */}
          {s.ws_show_recent_chats && recentChats.filter((c) => c.id !== activeRoomId).length > 0 && (
            <section className="border-t border-border pt-3">
              <SectionLabel className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Últimos Chats
              </SectionLabel>
              <div className="space-y-1.5">
                {recentChats.filter((c) => c.id !== activeRoomId).map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setReadOnlyRoom({ id: chat.id, name: visitor?.name ?? "Visitante" })}
                    className="w-full text-left p-2 rounded-md border border-border hover:bg-muted/50 transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {new Date(chat.created_at).toLocaleDateString("pt-BR")}
                      </span>
                      <Badge
                        variant={chat.status === "active" ? "default" : chat.status === "closed" ? "secondary" : "outline"}
                        className="text-[9px] px-1.5 py-0"
                      >
                        {chat.status === "active" ? "Ativo" : chat.status === "closed" ? "Encerrado" : chat.status === "waiting" ? "Aguardando" : chat.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {chat.csat_score != null && (
                        <span className="text-[10px] flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
                          {chat.csat_score}
                        </span>
                      )}
                      {chat.attendant_name && (
                        <span className="text-[10px] text-muted-foreground">{chat.attendant_name}</span>
                      )}
                      {chat.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-[9px] px-1 py-0" style={{ borderColor: tag.color ?? undefined }}>
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
              {hasMoreChats && (
                <Button variant="ghost" size="sm" className="w-full text-[11px] h-7 mt-1" onClick={loadMoreChats}>
                  <ChevronDown className="h-3 w-3 mr-1" /> Carregar mais
                </Button>
              )}
            </section>
          )}

          {/* TIMELINE */}
          {s.ws_show_timeline && (
            <section className="border-t border-border pt-3">
              <SectionLabel>Timeline</SectionLabel>
              {timelineEvents.length > 0 ? (
                <TimelineComponent events={timelineEvents} />
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Activity className="h-6 w-6 mx-auto mb-1 opacity-40" />
                  <p className="text-xs">Nenhum evento registrado</p>
                </div>
              )}
            </section>
          )}
        </div>
      </ScrollArea>

      <ReadOnlyChatDialog
        roomId={readOnlyRoom?.id ?? null}
        visitorName={readOnlyRoom?.name ?? ""}
        open={!!readOnlyRoom}
        onOpenChange={(open) => !open && setReadOnlyRoom(null)}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] truncate">
        <ClickableValue value={value} />
      </span>
    </div>
  );
}

function parseIfString(value: any): any {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "object" && parsed !== null) return parsed;
    } catch {}
  }
  return value;
}

function CustomFieldRow({ label, value, fieldType }: { label: string; value: any; fieldType: string }) {
  if (value === null || value === undefined || value === "") return null;

  const resolved = parseIfString(value);
  const complex = isComplexValue(resolved, fieldType);

  if (complex) {
    const rendered = formatComplexValue(value, fieldType);
    if (rendered) {
      return (
        <div className="space-y-1 text-xs">
          <span className="text-muted-foreground">{label}</span>
          <div className="pl-1">{rendered}</div>
        </div>
      );
    }
  }

  const formatScalar = () => {
    switch (fieldType) {
      case "decimal":
        return `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
      case "integer":
        return Number(value).toLocaleString("pt-BR");
      case "date":
        try { return new Date(value).toLocaleDateString("pt-BR"); } catch { return String(value); }
      case "url":
        return (
          <a href={String(value).startsWith("http") ? String(value) : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
            {String(value).replace(/^https?:\/\//, "").slice(0, 35)}
          </a>
        );
      case "boolean":
        return (
          <Badge variant={value === true || value === "true" ? "default" : "secondary"} className="text-[10px]">
            {value === true || value === "true" ? "Sim" : "Não"}
          </Badge>
        );
      default: {
        const str = String(value);
        if (isUrl(str)) {
          return (
            <a href={str.startsWith("http") ? str : `https://${str}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
              {str.replace(/^https?:\/\//, "").slice(0, 35)}
            </a>
          );
        }
        return str;
      }
    }
  };

  const formatted = formatScalar();
  if (formatted === null) return null;

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] truncate">{formatted}</span>
    </div>
  );
}
