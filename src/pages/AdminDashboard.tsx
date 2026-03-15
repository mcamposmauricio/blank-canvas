import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Clock, Star, Users, TrendingUp, Timer, Eye, ChevronDown, ChevronRight as ChevronRightIcon, ArrowUp, ArrowDown, AlertTriangle, Zap, TrendingDown, RefreshCw, Radio, Save, Trash2, Plus, X, ChevronLeft, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats, DashboardFilters } from "@/hooks/useDashboardStats";
import { useAttendantQueues } from "@/hooks/useChatRealtime";
import { ReadOnlyChatDialog } from "@/components/chat/ReadOnlyChatDialog";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionLabel } from "@/components/ui/section-label";
import { FilterBar } from "@/components/ui/filter-bar";
import { ChartCard } from "@/components/ui/chart-card";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { Tag } from "lucide-react";
import { format, subDays } from "date-fns";

// Saved views
interface SavedView {
  id: string;
  name: string;
  filters: DashboardFilters;
}

const SAVED_VIEWS_KEY = "dashboard-saved-views";
const MAX_VIEWS = 5;

function loadSavedViews(): SavedView[] {
  try { return JSON.parse(localStorage.getItem(SAVED_VIEWS_KEY) ?? "[]"); } catch { return []; }
}
function persistViews(views: SavedView[]) {
  localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
}

const fmt = (d: Date) => format(d, "yyyy-MM-dd");
const todayRange = () => ({ from: fmt(new Date()), to: fmt(new Date()) });

const RESOLUTION_COLORS: Record<string, string> = {
  resolved: "hsl(142, 71%, 45%)",
  pending: "hsl(38, 92%, 50%)",
  escalated: "hsl(0, 84%, 60%)",
  inactive: "hsl(220, 9%, 46%)",
  archived: "hsl(217, 91%, 60%)",
};

const AdminDashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Initialize with today
  const [filters, setFilters] = useState<DashboardFilters>(() => {
    const r = todayRange();
    return { period: "today", dateFrom: r.from, dateTo: r.to };
  });
  const [attendantOptions, setAttendantOptions] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [companyOptions, setCompanyOptions] = useState<{ id: string; name: string }[]>([]);
  const [contactOptions, setContactOptions] = useState<{ id: string; name: string; companyId: string }[]>([]);
  const { stats, loading, refetch, realtimeEnabled, toggleRealtime } = useDashboardStats(filters);
  const { attendants, unassignedRooms, loading: queuesLoading } = useAttendantQueues();

  const [teams, setTeams] = useState<{ id: string; name: string; memberIds: string[] }[]>([]);
  const [prevStats, setPrevStats] = useState<{ totalChats: number; avgCsat: number | null; resolutionRate: number | null } | null>(null);
  const [readOnlyRoom, setReadOnlyRoom] = useState<{ id: string; name: string } | null>(null);
  const [currentAttendantId, setCurrentAttendantId] = useState<string | null>(null);
  const [expandedAttendant, setExpandedAttendant] = useState<string | null>(null);
  const [attendantRooms, setAttendantRooms] = useState<Record<string, { id: string; visitor_name: string; status: string; created_at: string }[]>>({});
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Saved views state
  const [savedViews, setSavedViews] = useState<SavedView[]>(loadSavedViews);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  // Paginated conversations with load-more
  const [convRooms, setConvRooms] = useState<any[]>([]);
  const [convTotal, setConvTotal] = useState(0);
  const [convLoading, setConvLoading] = useState(false);
  const [convLoadingMore, setConvLoadingMore] = useState(false);
  const [convSortBy, setConvSortBy] = useState<string>("created_at");
  const [convSortDir, setConvSortDir] = useState<"asc" | "desc">("desc");
  const CONV_PAGE_SIZE = 20;

  useEffect(() => { setLastRefresh(new Date()); }, [stats]);

  useEffect(() => {
    const fetchMeta = async () => {
      const [attRes, catRes, tagRes, teamRes, memberRes, compRes, ccRes] = await Promise.all([
        supabase.from("attendant_profiles").select("id, display_name, user_id"),
        supabase.from("chat_service_categories").select("id, name").order("name"),
        supabase.from("chat_tags").select("id, name").order("name"),
        supabase.from("chat_teams").select("id, name").order("name"),
        supabase.from("chat_team_members").select("team_id, attendant_id"),
        supabase.from("contacts").select("id, name").eq("is_company", true).order("name"),
        supabase.from("company_contacts").select("id, name, company_id").order("name"),
      ]);
      if (attRes.data) {
        setAttendantOptions(attRes.data.map(a => ({ id: a.id, name: a.display_name })));
        const mine = attRes.data.find(a => a.user_id === user?.id);
        if (mine) setCurrentAttendantId(mine.id);
      }
      setCategories(catRes.data ?? []);
      setTags(tagRes.data ?? []);
      setCompanyOptions((compRes.data ?? []).map(c => ({ id: c.id, name: c.name })));
      setContactOptions((ccRes.data ?? []).map(c => ({ id: c.id, name: c.name, companyId: c.company_id })));
      const teamData = teamRes.data ?? [];
      const memberData = memberRes.data ?? [];
      setTeams(teamData.map(team => ({
        id: team.id, name: team.name,
        memberIds: memberData.filter(m => m.team_id === team.id).map(m => m.attendant_id),
      })));
    };
    fetchMeta();
  }, [user?.id]);

  // Fetch conversations list
  const fetchConversations = useCallback(async (append = false) => {
    if (append) setConvLoadingMore(true); else setConvLoading(true);

    const startDate = filters.dateFrom ? new Date(filters.dateFrom + "T00:00:00").toISOString() : null;
    let endDate: string | null = null;
    if (filters.dateTo) { const d = new Date(filters.dateTo + "T00:00:00"); d.setDate(d.getDate() + 1); endDate = d.toISOString(); }

    const from = append ? convRooms.length : 0;
    const to = from + CONV_PAGE_SIZE - 1;

    // Determine sort column (only sortable DB columns)
    const dbSortable: Record<string, string> = { created_at: "created_at", csat_score: "csat_score", status: "status", resolution_status: "resolution_status" };
    const sortCol = dbSortable[convSortBy] ?? "created_at";

    let query = supabase.from("chat_rooms")
      .select("id, status, resolution_status, created_at, closed_at, csat_score, visitor_id, attendant_id, priority, contact_id, chat_visitors!visitor_id(name)", { count: "exact" })
      .order(sortCol, { ascending: convSortDir === "asc" })
      .range(from, to);

    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lt("created_at", endDate);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.attendantIds && filters.attendantIds.length > 0) query = query.in("attendant_id", filters.attendantIds);
    if (filters.contactId) query = query.eq("contact_id", filters.contactId);
    if (filters.companyContactId) query = query.eq("company_contact_id", filters.companyContactId);

    const { data, count } = await query;
    if (data) {
      const attIds = [...new Set(data.filter(r => r.attendant_id).map(r => r.attendant_id!))];
      let attMap = new Map<string, string>();
      if (attIds.length > 0) {
        const { data: atts } = await supabase.from("attendant_profiles").select("id, display_name").in("id", attIds);
        attMap = new Map(atts?.map(a => [a.id, a.display_name]) ?? []);
      }

      // Fetch tags for these rooms
      const roomIds = data.map(r => r.id);
      let roomTagsMap = new Map<string, { name: string; color: string }[]>();
      if (roomIds.length > 0) {
        const { data: roomTags } = await supabase.from("chat_room_tags").select("room_id, tag_id, chat_tags!tag_id(name, color)").in("room_id", roomIds);
        if (roomTags) {
          roomTags.forEach((rt: any) => {
            const existing = roomTagsMap.get(rt.room_id) ?? [];
            if (rt.chat_tags) existing.push({ name: rt.chat_tags.name, color: rt.chat_tags.color ?? "#6366f1" });
            roomTagsMap.set(rt.room_id, existing);
          });
        }
      }

      // Fetch company names for contact_ids
      const contactIds = [...new Set(data.filter(r => r.contact_id).map(r => r.contact_id!))];
      let companyMap = new Map<string, string>();
      if (contactIds.length > 0) {
        const { data: companies } = await supabase.from("contacts").select("id, name").in("id", contactIds);
        companyMap = new Map(companies?.map(c => [c.id, c.name]) ?? []);
      }

      const mapped = data.map((r: any) => ({
        ...r,
        visitor_name: r.chat_visitors?.name ?? "Visitante",
        attendant_name: r.attendant_id ? (attMap.get(r.attendant_id) ?? "—") : "—",
        tags: roomTagsMap.get(r.id) ?? [],
        company_name: r.contact_id ? (companyMap.get(r.contact_id) ?? "—") : "—",
      }));

      if (append) setConvRooms(prev => [...prev, ...mapped]);
      else setConvRooms(mapped);
    }
    setConvTotal(count ?? 0);
    if (append) setConvLoadingMore(false); else setConvLoading(false);
  }, [filters, convSortBy, convSortDir, convRooms.length]);

  // Reset conversations when filters change
  useEffect(() => { setConvRooms([]); fetchConversations(false); }, [filters, convSortBy, convSortDir]);

  useEffect(() => {
    const fetchPrevStats = async () => {
      if (!filters.dateFrom || !filters.dateTo) { setPrevStats(null); return; }
      const from = new Date(filters.dateFrom + "T00:00:00");
      const to = new Date(filters.dateTo + "T00:00:00");
      const diff = to.getTime() - from.getTime();
      const prevFrom = new Date(from.getTime() - diff - 86400000);
      const prevTo = new Date(from.getTime());

      let query = supabase.from("chat_rooms").select("id, status, csat_score, resolution_status");
      query = query.gte("created_at", prevFrom.toISOString()).lt("created_at", prevTo.toISOString());
      const { data } = await query;
      if (!data || data.length === 0) { setPrevStats({ totalChats: 0, avgCsat: null, resolutionRate: null }); return; }
      const withCsat = data.filter(r => r.csat_score != null);
      const avgCsat = withCsat.length > 0 ? Number((withCsat.reduce((s, r) => s + (r.csat_score ?? 0), 0) / withCsat.length).toFixed(1)) : null;
      const closed = data.filter(r => r.status === "closed");
      const resolved = closed.filter(r => r.resolution_status === "resolved").length;
      const resolutionRate = closed.length > 0 ? Math.round((resolved / closed.length) * 100) : null;
      setPrevStats({ totalChats: data.length, avgCsat, resolutionRate });
    };
    fetchPrevStats();
  }, [filters.dateFrom, filters.dateTo]);

  const handleExpandAttendant = async (attendantId: string) => {
    if (expandedAttendant === attendantId) { setExpandedAttendant(null); return; }
    setExpandedAttendant(attendantId);
    if (!attendantRooms[attendantId]) {
      const { data } = await supabase.from("chat_rooms")
        .select("id, status, created_at, visitor_id, chat_visitors!visitor_id(name)")
        .eq("attendant_id", attendantId).in("status", ["active", "waiting"])
        .order("created_at", { ascending: false });
      if (data) {
        const rooms = data.map((r: any) => ({ id: r.id, visitor_name: r.chat_visitors?.name ?? "Visitante", status: r.status, created_at: r.created_at }));
        setAttendantRooms(prev => ({ ...prev, [attendantId]: rooms }));
      }
    }
  };

  const getDelta = (current: number, prev: number | null | undefined) => {
    if (prev == null || prev === 0) return null;
    return Math.round(((current - prev) / prev) * 100);
  };

  const handleRoomClick = (roomId: string, attendantId: string | null, visitorName: string) => {
    if (attendantId === currentAttendantId) navigate(`/admin/workspace/${roomId}`);
    else setReadOnlyRoom({ id: roomId, name: visitorName });
  };

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return "<1min";
    if (diff < 60) return `${diff}min`;
    return `${Math.floor(diff / 60)}h`;
  };

  const lastRefreshLabel = () => {
    const diff = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
    if (diff < 10) return "agora";
    if (diff < 60) return `${diff}s atrás`;
    return `${Math.floor(diff / 60)}min atrás`;
  };

  const capacityPercent = (active: number, max: number) => max === 0 ? 0 : Math.round((active / max) * 100);

  // Saved views
  const handleSaveView = () => {
    if (!newViewName.trim() || savedViews.length >= MAX_VIEWS) return;
    const view: SavedView = { id: crypto.randomUUID(), name: newViewName.trim(), filters: { ...filters } };
    const updated = [...savedViews, view];
    setSavedViews(updated);
    persistViews(updated);
    setShowSaveDialog(false);
    setNewViewName("");
  };

  const handleDeleteView = (id: string) => {
    const updated = savedViews.filter(v => v.id !== id);
    setSavedViews(updated);
    persistViews(updated);
  };

  const handleApplyView = (view: SavedView) => {
    setFilters({ ...view.filters });
  };

  const hasActiveFilters = (filters.attendantIds?.length ?? 0) > 0 || (filters.teamIds?.length ?? 0) > 0 || (filters.tagIds?.length ?? 0) > 0 || !!filters.categoryId || !!filters.contactId || !!filters.companyContactId || !!filters.search || !!filters.status || !!filters.priority;

  const clearFilters = () => setFilters(f => ({ period: f.period, dateFrom: f.dateFrom, dateTo: f.dateTo }));

  const getTeamGroups = () => {
    const assignedIds = new Set<string>();
    const groups: { teamName: string; teamId: string | null; members: typeof attendants; summary: { online: number; activeTotal: number; avgCapacity: number } }[] = [];
    teams.forEach(team => {
      const members = attendants.filter(a => team.memberIds.includes(a.id));
      if (members.length === 0) return;
      members.forEach(m => assignedIds.add(m.id));
      const online = members.filter(m => m.status === "online" || m.status === "available").length;
      const activeTotal = members.reduce((s, m) => s + m.active_count, 0);
      const totalCap = members.reduce((s, m) => s + m.max_conversations, 0);
      groups.push({ teamName: team.name, teamId: team.id, members, summary: { online, activeTotal, avgCapacity: totalCap > 0 ? Math.round((activeTotal / totalCap) * 100) : 0 } });
    });
    const unassigned = attendants.filter(a => !assignedIds.has(a.id));
    if (unassigned.length > 0) {
      const online = unassigned.filter(m => m.status === "online" || m.status === "available").length;
      const activeTotal = unassigned.reduce((s, m) => s + m.active_count, 0);
      const totalCap = unassigned.reduce((s, m) => s + m.max_conversations, 0);
      groups.push({ teamName: t("chat.dashboard.no_team"), teamId: null, members: unassigned, summary: { online, activeTotal, avgCapacity: totalCap > 0 ? Math.round((activeTotal / totalCap) * 100) : 0 } });
    }
    return groups;
  };

  const resolutionColor = (status: string) => {
    switch (status) {
      case "resolved": return "bg-green-100 text-green-800";
      case "pending": return "bg-orange-100 text-orange-800";
      case "escalated": return "bg-red-100 text-red-800";
      case "inactive": return "bg-muted text-muted-foreground";
      case "archived": return "bg-blue-100 text-blue-800";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const skillBadge = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case "senior": return <Badge className="text-[9px] bg-purple-100 text-purple-700 border-purple-200">Senior</Badge>;
      case "pleno": return <Badge className="text-[9px] bg-blue-100 text-blue-700 border-blue-200">Pleno</Badge>;
      default: return <Badge className="text-[9px] bg-gray-100 text-gray-600 border-gray-200">Junior</Badge>;
    }
  };

  const metricCards = [
    { title: t("chat.dashboard.active_chats"), value: stats.activeChats, icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10", delta: null as number | null },
    { title: t("chat.dashboard.waiting"), value: stats.waitingChats, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", delta: null as number | null },
    { title: t("chat.dashboard.closed_today"), value: stats.chatsToday, icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10", delta: getDelta(stats.totalChats, prevStats?.totalChats) },
    { title: t("chat.dashboard.online_attendants"), value: stats.onlineAttendants, icon: Users, color: "text-green-500", bg: "bg-green-500/10", delta: null as number | null },
    { title: t("chat.dashboard.csat_avg"), value: stats.avgCsat != null ? `${stats.avgCsat}/5` : "—", icon: Star, color: "text-yellow-500", bg: "bg-yellow-500/10", delta: prevStats && stats.avgCsat != null && prevStats.avgCsat != null ? getDelta(stats.avgCsat, prevStats.avgCsat) : null },
    { title: t("chat.gerencial.resolution_rate"), value: stats.resolutionRate != null ? `${stats.resolutionRate}%` : "—", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", delta: prevStats && stats.resolutionRate != null && prevStats.resolutionRate != null ? getDelta(stats.resolutionRate, prevStats.resolutionRate) : null },
    { title: t("chat.dashboard.avg_wait_time"), value: stats.avgWaitMinutes != null ? `${stats.avgWaitMinutes}min` : "—", icon: Clock, color: "text-cyan-500", bg: "bg-cyan-500/10", delta: null as number | null },
    { title: t("chat.gerencial.avg_first_response"), value: stats.avgFirstResponseMinutes != null ? `${stats.avgFirstResponseMinutes}min` : "—", icon: Zap, color: "text-orange-500", bg: "bg-orange-500/10", delta: null as number | null },
    { title: t("chat.gerencial.unresolved_chats"), value: stats.unresolvedChats, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", delta: null as number | null },
    { title: t("chat.gerencial.avg_resolution"), value: stats.avgResolutionMinutes != null ? `${stats.avgResolutionMinutes}min` : "—", icon: Timer, color: "text-indigo-500", bg: "bg-indigo-500/10", delta: null as number | null },
    { title: t("chat.dashboard.abandonment_rate"), value: stats.abandonmentRate != null ? `${stats.abandonmentRate}%` : "—", icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-500/10", delta: null as number | null },
  ];

  const teamGroups = getTeamGroups();
  const hasMoreConv = convRooms.length < convTotal;

  // Top Tags
  const tagTotal = stats.topTags.reduce((s, t) => s + t.count, 0);
  const remainingTags = stats.topTags.length > 10 ? stats.topTags.length - 10 : 0;
  const displayTags = stats.topTags.slice(0, 10);

  // Resolution distribution total
  const resDistTotal = stats.resolutionDistribution.reduce((s, d) => s + d.count, 0);

  // DB-sortable columns trigger re-fetch; client-side columns sort in-place
  const DB_SORT_COLS = new Set(["created_at", "csat_score", "status", "resolution_status"]);

  const handleSort = (col: string) => {
    if (DB_SORT_COLS.has(col)) {
      if (convSortBy === col) setConvSortDir(d => d === "asc" ? "desc" : "asc");
      else { setConvSortBy(col); setConvSortDir("desc"); }
    } else {
      // Client-side sort
      if (convSortBy === col) setConvSortDir(d => d === "asc" ? "desc" : "asc");
      else { setConvSortBy(col); setConvSortDir("desc"); }
    }
  };

  const sortedConvRooms = useMemo(() => {
    if (DB_SORT_COLS.has(convSortBy)) return convRooms;
    const sorted = [...convRooms];
    sorted.sort((a, b) => {
      let valA: any, valB: any;
      switch (convSortBy) {
        case "attendant_name": valA = a.attendant_name ?? ""; valB = b.attendant_name ?? ""; break;
        case "tags": valA = (a.tags ?? []).length; valB = (b.tags ?? []).length; break;
        case "duration": {
          const durA = a.closed_at && a.created_at ? new Date(a.closed_at).getTime() - new Date(a.created_at).getTime() : 0;
          const durB = b.closed_at && b.created_at ? new Date(b.closed_at).getTime() - new Date(b.created_at).getTime() : 0;
          valA = durA; valB = durB; break;
        }
        case "date": valA = a.created_at ?? ""; valB = b.created_at ?? ""; break;
        case "company_name": valA = a.company_name ?? ""; valB = b.company_name ?? ""; break;
        default: valA = a[convSortBy] ?? ""; valB = b[convSortBy] ?? "";
      }
      if (typeof valA === "string") return convSortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      return convSortDir === "asc" ? valA - valB : valB - valA;
    });
    return sorted;
  }, [convRooms, convSortBy, convSortDir]);

  // Conv sort header helper
  const SortableHead = ({ col, label, className = "" }: { col: string; label: string; className?: string }) => (
    <TableHead
      className={`text-[10px] font-medium uppercase tracking-wider cursor-pointer select-none transition-colors group ${className} ${convSortBy === col ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      onClick={() => handleSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {convSortBy === col ? (
          convSortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />
        )}
      </span>
    </TableHead>
  );

  const renderAttendantRow = (att: typeof attendants[0]) => {
    const pct = capacityPercent(att.active_count, att.max_conversations);
    const isExpanded = expandedAttendant === att.id;
    return (
      <Collapsible key={att.id} open={isExpanded} onOpenChange={() => handleExpandAttendant(att.id)} asChild>
        <>
          <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => handleExpandAttendant(att.id)}>
            <TableCell className="text-[13px] font-medium">
              <div className="flex items-center gap-1.5">
                <CollapsibleTrigger asChild>
                  <span className="shrink-0">{isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}</span>
                </CollapsibleTrigger>
                <span className={`h-2 w-2 rounded-full shrink-0 ${att.status === "online" ? "bg-green-500" : att.status === "busy" ? "bg-amber-500" : "bg-gray-400"}`} />
                {att.display_name}
                {att.user_id === user?.id && <span className="text-[11px] text-muted-foreground ml-1">(você)</span>}
              </div>
            </TableCell>
            <TableCell>{skillBadge((att as any).skill_level)}</TableCell>
            <TableCell>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${att.status === "online" || att.status === "available" ? "bg-green-100 text-green-700" : att.status === "busy" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                {att.status}
              </span>
            </TableCell>
            <TableCell className="text-center text-[13px]">{att.waiting_count}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Progress value={pct} className="h-1.5" style={{ ['--progress-color' as string]: pct < 60 ? 'hsl(142 71% 45%)' : pct < 80 ? 'hsl(48 96% 53%)' : 'hsl(0 84% 60%)' }} />
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap tabular-nums">{att.active_count}/{att.max_conversations}</span>
              </div>
            </TableCell>
          </TableRow>
          <CollapsibleContent asChild>
            <TableRow>
              <TableCell colSpan={5} className="p-0">
                <div className="bg-muted/30 p-3 space-y-1">
                  {(attendantRooms[att.id] ?? []).length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">Nenhuma conversa ativa</p>
                  ) : (
                    (attendantRooms[att.id] ?? []).map(room => (
                      <div key={room.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); handleRoomClick(room.id, att.id, room.visitor_name); }}>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[13px]">{room.visitor_name}</span>
                          <Badge variant={room.status === "active" ? "default" : "secondary"} className="text-[10px]">{room.status}</Badge>
                          <span className="text-[11px] text-muted-foreground">{timeAgo(room.created_at)}</span>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1"><Eye className="h-3 w-3" />Ver</Button>
                      </div>
                    ))
                  )}
                </div>
              </TableCell>
            </TableRow>
          </CollapsibleContent>
        </>
      </Collapsible>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <PageHeader title={t("chat.dashboard.title")} subtitle={t("chat.dashboard.subtitle")} />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[11px]" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />Atualizar
            </Button>
            <Button
              variant={realtimeEnabled ? "default" : "outline"}
              size="sm"
              className="h-8 gap-1.5 text-[11px]"
              onClick={toggleRealtime}
            >
              <Radio className={`h-3.5 w-3.5 ${realtimeEnabled ? "animate-pulse" : ""}`} />
              Tempo real: {realtimeEnabled ? "Ligado" : "Desligado"}
            </Button>
            <span className="text-[10px] text-muted-foreground/60">Atualizado {lastRefreshLabel()}</span>
          </div>
        </div>

        {/* Filters */}
        <FilterBar>
          <DateRangeFilter
            dateFrom={filters.dateFrom ?? null}
            dateTo={filters.dateTo ?? null}
            onChange={(from, to) => setFilters(f => ({ ...f, dateFrom: from, dateTo: to }))}
            maxRangeMonths={3}
          />
          <SearchableMultiSelect
            label={t("chat.gerencial.filter_by_attendant")}
            options={attendantOptions.map(a => ({ value: a.id, label: a.name }))}
            selected={filters.attendantIds ?? []}
            onChange={(v) => setFilters(f => ({ ...f, attendantIds: v }))}
            placeholder={t("chat.gerencial.filter_by_attendant")}
          />
          {teams.length > 0 && (
            <SearchableMultiSelect
              label="Time"
              options={teams.map(t => ({ value: t.id, label: t.name }))}
              selected={filters.teamIds ?? []}
              onChange={(v) => setFilters(f => ({ ...f, teamIds: v }))}
              placeholder="Time"
            />
          )}
          <Select value={filters.status ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, status: v === "all" ? null : v }))}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter.all_status")}</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="waiting">Na Fila</SelectItem>
              <SelectItem value="closed">Encerrado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.priority ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, priority: v === "all" ? null : v }))}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter.all_categories")}</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
          {categories.length > 0 && (
            <SearchableMultiSelect
              label={t("chat.gerencial.filter_by_category")}
              options={categories.map(c => ({ value: c.id, label: c.name }))}
              selected={filters.categoryId ? [filters.categoryId] : []}
              onChange={(v) => setFilters(f => ({ ...f, categoryId: v[0] ?? null }))}
              placeholder={t("chat.gerencial.filter_by_category")}
            />
          )}
          {tags.length > 0 && (
            <SearchableMultiSelect
              label="Tag"
              options={tags.map(tag => ({ value: tag.id, label: tag.name }))}
              selected={filters.tagIds ?? []}
              onChange={(v) => setFilters(f => ({ ...f, tagIds: v }))}
              placeholder="Tag"
            />
          )}
          {companyOptions.length > 0 && (
            <SearchableMultiSelect
              label="Empresa"
              options={companyOptions.map(c => ({ value: c.id, label: c.name }))}
              selected={filters.contactId ? [filters.contactId] : []}
              onChange={(v) => setFilters(f => ({ ...f, contactId: v[0] ?? null, companyContactId: null }))}
              placeholder="Empresa"
            />
          )}
          {contactOptions.length > 0 && (
            <SearchableMultiSelect
              label="Contato"
              options={(filters.contactId ? contactOptions.filter(c => c.companyId === filters.contactId) : contactOptions).map(c => ({ value: c.id, label: c.name }))}
              selected={filters.companyContactId ? [filters.companyContactId] : []}
              onChange={(v) => setFilters(f => ({ ...f, companyContactId: v[0] ?? null }))}
              placeholder="Contato"
            />
          )}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-9 text-[11px] text-muted-foreground" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" />Limpar
            </Button>
          )}
        </FilterBar>

        {/* Saved Views */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-muted-foreground font-medium">Visões salvas:</span>
          {savedViews.map(view => (
            <div key={view.id} className="group relative">
              <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 pr-7" onClick={() => handleApplyView(view)}>
                <Save className="h-3 w-3" />{view.name}
              </Button>
              <button
                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-4 w-4 flex items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); handleDeleteView(view.id); }}
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] gap-1"
                  onClick={() => setShowSaveDialog(true)}
                  disabled={savedViews.length >= MAX_VIEWS}
                >
                  <Plus className="h-3 w-3" />Salvar visão
                </Button>
              </TooltipTrigger>
              {savedViews.length >= MAX_VIEWS && (
                <TooltipContent><p>Máximo de {MAX_VIEWS} visões</p></TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : (
          <>
            {/* KPI Cards */}
            <div>
              <SectionLabel>Métricas do Período</SectionLabel>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {metricCards.map(card => (
                  <MetricCard key={card.title} title={card.title} value={card.value} icon={card.icon} iconColor={card.color} iconBgColor={card.bg} delta={card.delta} />
                ))}
              </div>
            </div>

            {/* Charts */}
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title={t("chat.gerencial.conversations_per_day")} isEmpty={stats.chartData.length === 0} emptyText={t("chat.gerencial.no_data")}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title={t("chat.gerencial.csat_evolution")} isEmpty={stats.csatByDay.length === 0} emptyText={t("chat.gerencial.no_data")}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.csatByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title={t("chat.gerencial.peak_hours")} isEmpty={!stats.chatsByHour.some(h => h.count > 0)} emptyText={t("chat.gerencial.no_data")}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chatsByHour}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <RechartsTooltip labelFormatter={(h) => `${h}:00`} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Resolution Distribution - Stacked Bar Chart */}
              <ChartCard
                title={`${t("chat.gerencial.resolution_distribution")} — ${resDistTotal} encerrados`}
                isEmpty={stats.resolutionByDay.length === 0}
                emptyText={t("chat.gerencial.no_data")}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.resolutionByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload) return null;
                        const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
                        return (
                          <div className="bg-popover border rounded-lg p-2 shadow-md text-[12px] space-y-0.5">
                            <p className="font-medium">{label} — {total} total</p>
                            {payload.map(p => (
                              <div key={p.dataKey} className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                                <span>{String(p.dataKey)}</span>
                                <span className="ml-auto font-medium tabular-nums">{String(p.value)}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11 }}
                      formatter={(value: string) => <span className="text-[11px] text-foreground">{value}</span>}
                    />
                    <Bar dataKey="resolved" stackId="1" fill={RESOLUTION_COLORS.resolved} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="pending" stackId="1" fill={RESOLUTION_COLORS.pending} />
                    <Bar dataKey="escalated" stackId="1" fill={RESOLUTION_COLORS.escalated} />
                    <Bar dataKey="inactive" stackId="1" fill={RESOLUTION_COLORS.inactive} />
                    <Bar dataKey="archived" stackId="1" fill={RESOLUTION_COLORS.archived} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Redesigned Top Tags - Horizontal Bar Chart */}
              <ChartCard title={`Top Tags — ${tagTotal} incidências`} isEmpty={stats.topTags.length === 0} emptyText={t("chat.gerencial.no_data")}>
                <div className="space-y-1.5 overflow-y-auto h-full py-1">
                  {displayTags.map((tag, i) => {
                    const maxCount = displayTags[0]?.count ?? 1;
                    const pct = tagTotal > 0 ? Math.round((tag.count / tagTotal) * 100) : 0;
                    return (
                      <TooltipProvider key={tag.name}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2.5 group cursor-default px-1 py-1 rounded-md hover:bg-muted/50 transition-colors">
                              <span className="text-[11px] text-muted-foreground w-5 text-right tabular-nums font-medium">#{i + 1}</span>
                              <div className="h-3 w-3 rounded-full shrink-0 ring-2 ring-white/20" style={{ backgroundColor: tag.color }} />
                              <span className="text-[13px] font-medium truncate min-w-0 flex-shrink" style={{ maxWidth: 120 }}>{tag.name}</span>
                              {i === 0 && <Badge className="text-[8px] h-4 px-1 bg-amber-100 text-amber-700 border-amber-200 shrink-0"><Award className="h-2.5 w-2.5 mr-0.5" />Top</Badge>}
                              <div className="flex-1 min-w-[60px]">
                                <div className="h-3 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${(tag.count / maxCount) * 100}%`, background: `linear-gradient(90deg, ${tag.color}CC, ${tag.color})` }}
                                  />
                                </div>
                              </div>
                              <span className="text-[13px] font-bold tabular-nums w-8 text-right">{tag.count}</span>
                              <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">{pct}%</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">{tag.name} — {tag.count} conversas — {pct}% do total</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                  {remainingTags > 0 && (
                    <p className="text-[10px] text-muted-foreground text-center pt-1">+{remainingTags} outras tags</p>
                  )}
                </div>
              </ChartCard>
            </div>

            {/* Attendant Performance Table */}
            {stats.attendantPerformance.length > 0 && (
              <div>
                <SectionLabel>{t("chat.gerencial.attendant_performance")}</SectionLabel>
                <Card className="rounded-xl border border-white/[0.06] bg-card shadow-sm">
                  <CardContent className="p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("chat.gerencial.attendant")}</TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("chat.dashboard.team_col")}</TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-right">{t("chat.gerencial.chats_col")}</TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-right">{t("chat.gerencial.csat_col")}</TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-right">{t("chat.gerencial.resolution_col")}</TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-right">{t("chat.gerencial.avg_time_col")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.attendantPerformance.map(att => {
                          const attId = attendantOptions.find(a => a.name === att.name)?.id;
                          const teamName = teams.find(t => attId && t.memberIds.includes(attId))?.name ?? "—";
                          return (
                            <TableRow key={att.name}>
                              <TableCell className="text-[13px] font-medium">{att.name}</TableCell>
                              <TableCell className="text-[13px] text-muted-foreground">{teamName}</TableCell>
                              <TableCell className="text-[13px] text-right tabular-nums font-medium">{att.chats}</TableCell>
                              <TableCell className="text-[13px] text-right tabular-nums font-medium">{att.csat != null ? `${att.csat}/5` : "—"}</TableCell>
                              <TableCell className="text-[13px] text-right tabular-nums font-medium">{att.resolutionRate != null ? `${att.resolutionRate}%` : "—"}</TableCell>
                              <TableCell className="text-[13px] text-right tabular-nums font-medium">{att.avgResolution != null ? `${att.avgResolution}min` : "—"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Paginated Conversations List with Load More */}
            <div>
              <SectionLabel>Conversas do Período ({convTotal})</SectionLabel>
              <Card className="rounded-xl border border-white/[0.06] bg-card shadow-sm">
                <CardContent className="p-4">
                  {convLoading ? (
                    <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
                  ) : convRooms.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground text-center py-8">Nenhuma conversa encontrada</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                             <SortableHead col="created_at" label="Cliente" />
                              <SortableHead col="attendant_name" label="Atendente" />
                              <SortableHead col="status" label="Status" />
                              <SortableHead col="resolution_status" label="Resolução" />
                              <SortableHead col="csat_score" label="CSAT" className="text-center" />
                              <SortableHead col="tags" label="Tags" />
                              <SortableHead col="duration" label="Duração" />
                              <SortableHead col="date" label="Data" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedConvRooms.map((room: any) => {
                              const dur = room.closed_at && room.created_at ? Math.floor((new Date(room.closed_at).getTime() - new Date(room.created_at).getTime()) / 60000) : null;
                              const visibleTags = (room.tags ?? []).slice(0, 2);
                              const overflowTags = (room.tags ?? []).slice(2);
                              return (
                                <TableRow key={room.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setReadOnlyRoom({ id: room.id, name: room.visitor_name })}>
                                  <TableCell className="text-[13px] font-medium">{room.visitor_name}</TableCell>
                                  <TableCell className="text-[13px]">{room.attendant_name}</TableCell>
                                  <TableCell>
                                    <Badge variant={room.status === "active" ? "default" : room.status === "closed" ? "secondary" : "outline"} className="text-[10px]">{room.status}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={resolutionColor(room.resolution_status ?? "pending")}>{room.resolution_status ?? "pending"}</Badge>
                                  </TableCell>
                                  <TableCell className="text-center text-[13px] tabular-nums">
                                    {room.csat_score != null ? <span className="flex items-center justify-center gap-0.5"><Star className="h-3 w-3 fill-current text-yellow-500" />{room.csat_score}</span> : "—"}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1 items-center flex-nowrap max-w-[160px] overflow-hidden">
                                      {visibleTags.length > 0
                                        ? visibleTags.map((tag: any, i: number) => <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 rounded whitespace-nowrap" style={{ borderColor: tag.color, color: tag.color }}>{tag.name}</Badge>)
                                        : <span className="text-muted-foreground text-[11px]">—</span>}
                                      {overflowTags.length > 0 && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 rounded cursor-default whitespace-nowrap">+{overflowTags.length}</Badge>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-[200px]">
                                              <div className="flex flex-wrap gap-1">
                                                {overflowTags.map((tag: any, i: number) => (
                                                  <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 rounded" style={{ borderColor: tag.color, color: tag.color }}>{tag.name}</Badge>
                                                ))}
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-[13px] tabular-nums">
                                    {dur != null ? (dur < 60 ? `${dur}min` : `${Math.floor(dur / 60)}h${dur % 60}min`) : "—"}
                                  </TableCell>
                                  <TableCell className="text-[13px] tabular-nums whitespace-nowrap">{room.created_at ? format(new Date(room.created_at), "dd/MM HH:mm") : "—"}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      {hasMoreConv && (
                        <div className="flex justify-center mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[12px] gap-1.5"
                            onClick={() => fetchConversations(true)}
                            disabled={convLoadingMore}
                          >
                            {convLoadingMore ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" /> : null}
                            Carregar mais ({convRooms.length} de {convTotal})
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Real-time Status by Team */}
            <div>
              <SectionLabel>Status em Tempo Real</SectionLabel>
              {queuesLoading ? (
                <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
              ) : (
                <div className="space-y-4">
                  {teamGroups.length === 0 ? (
                    <Card className="rounded-xl border border-white/[0.06] bg-card shadow-sm">
                      <CardContent className="py-6 text-center text-[13px] text-muted-foreground">Nenhum atendente cadastrado</CardContent>
                    </Card>
                  ) : (
                    teamGroups.map(group => (
                      <Card key={group.teamId ?? "none"} className="rounded-xl border border-white/[0.06] bg-card shadow-sm">
                        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                          <p className="text-sm font-medium">{group.teamName}</p>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />{group.summary.online} online</span>
                            <span>·</span>
                            <span>{group.summary.activeTotal} {t("chat.dashboard.active_conversations")}</span>
                            <span>·</span>
                            <span>{t("chat.dashboard.capacity")}: {group.summary.avgCapacity}%</span>
                          </div>
                        </div>
                        <CardContent className="px-4 pb-4 pt-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("chat.gerencial.attendant")}</TableHead>
                                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("chat.dashboard.skill_level")}</TableHead>
                                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Status</TableHead>
                                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-center">{t("chat.dashboard.in_queue")}</TableHead>
                                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-[200px]">{t("chat.dashboard.capacity")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.members.map(att => renderAttendantRow(att))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    ))
                  )}

                  {unassignedRooms.length > 0 && (
                    <Card className="rounded-xl border border-white/[0.06] bg-card shadow-sm">
                      <div className="px-4 pt-4 pb-2"><p className="text-sm font-medium">{t("chat.dashboard.unassigned_queue")}</p></div>
                      <CardContent className="px-4 pb-4 pt-0">
                        <div className="space-y-1">
                          {unassignedRooms.map(room => (
                            <div key={room.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                              onClick={() => handleRoomClick(room.id, null, room.visitor_name)}>
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                <span className="text-[13px]">{room.visitor_name}</span>
                                <span className="text-[11px] text-muted-foreground">{timeAgo(room.created_at)} atrás</span>
                              </div>
                              <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1"><Eye className="h-3 w-3" />Ver</Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ReadOnlyChatDialog roomId={readOnlyRoom?.id ?? null} visitorName={readOnlyRoom?.name ?? ""} open={!!readOnlyRoom} onOpenChange={(open) => !open && setReadOnlyRoom(null)} />

      {/* Save View Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Salvar Visão</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Nome da visão (ex: Hoje + Time A)"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              maxLength={40}
              autoFocus
            />
            <p className="text-[10px] text-muted-foreground mt-1">{savedViews.length}/{MAX_VIEWS} visões salvas</p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSaveView} disabled={!newViewName.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminDashboard;
