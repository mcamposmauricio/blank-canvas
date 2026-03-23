import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format } from "date-fns";

export interface DashboardStats {
  totalChats: number;
  chatsToday: number;
  avgCsat: number | null;
  resolutionRate: number | null;
  avgResolutionMinutes: number | null;
  chartData: { date: string; total: number }[];
  chatsByAttendant: { name: string; count: number }[];
  resolutionDistribution: { status: string; count: number }[];
  resolutionByDay: { date: string; resolved: number; pending: number; inactive: number; archived: number; escalated: number; total: number }[];
  activeChats: number;
  waitingChats: number;
  onlineAttendants: number;
  avgFirstResponseMinutes: number | null;
  unresolvedChats: number;
  csatByDay: { date: string; avg: number }[];
  attendantPerformance: { name: string; chats: number; csat: number | null; resolutionRate: number | null; avgResolution: number | null }[];
  chatsByHour: { hour: number; count: number }[];
  avgWaitMinutes: number | null;
  abandonmentRate: number | null;
  topTags: { name: string; color: string; count: number }[];
}

export interface DashboardFilters {
  period: "today" | "week" | "month" | "all";
  attendantIds?: string[];
  teamIds?: string[];
  status?: string | null;
  priority?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
  contactId?: string | null;
  companyContactId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string | null;
}

const EMPTY_STATS: DashboardStats = {
  totalChats: 0, chatsToday: 0, avgCsat: null, resolutionRate: null,
  avgResolutionMinutes: null, chartData: [], chatsByAttendant: [],
  resolutionDistribution: [], resolutionByDay: [], activeChats: 0, waitingChats: 0,
  onlineAttendants: 0, avgFirstResponseMinutes: null, unresolvedChats: 0,
  csatByDay: [], attendantPerformance: [], chatsByHour: [],
  avgWaitMinutes: null, abandonmentRate: null, topTags: [],
};

function computeDateRange(filters: DashboardFilters): { startDate: string | null; endDate: string | null } {
  const now = new Date();
  let startDate: string | null = null;
  let endDate: string | null = null;

  if (filters.dateFrom) {
    startDate = new Date(filters.dateFrom + "T00:00:00").toISOString();
  } else {
    switch (filters.period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        break;
      case "week": {
        const w = new Date(now); w.setDate(w.getDate() - 7);
        startDate = w.toISOString(); break;
      }
      case "month": {
        const m = new Date(now); m.setDate(m.getDate() - 30);
        startDate = m.toISOString(); break;
      }
    }
  }
  if (filters.dateTo) {
    const d = new Date(filters.dateTo + "T00:00:00");
    d.setDate(d.getDate() + 1);
    endDate = d.toISOString();
  }
  return { startDate, endDate };
}

export function useDashboardStats(filters: DashboardFilters) {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const { startDate, endDate } = computeDateRange(filters);

    // Resolve team filter → attendant IDs
    let teamAttendantIds: string[] | null = null;
    if (filters.teamIds && filters.teamIds.length > 0) {
      const { data: members } = await supabase
        .from("chat_team_members")
        .select("attendant_id")
        .in("team_id", filters.teamIds);
      teamAttendantIds = members?.map(m => m.attendant_id) ?? [];
      if (teamAttendantIds.length === 0) {
        setStats(EMPTY_STATS); setLoading(false); return;
      }
    }

    // Merge attendant filter with team filter
    let effectiveAttendantIds: string[] | null = null;
    if (filters.attendantIds && filters.attendantIds.length > 0) {
      effectiveAttendantIds = filters.attendantIds;
      if (teamAttendantIds) {
        const teamSet = new Set(teamAttendantIds);
        effectiveAttendantIds = effectiveAttendantIds.filter(id => teamSet.has(id));
        if (effectiveAttendantIds.length === 0) {
          setStats(EMPTY_STATS); setLoading(false); return;
        }
      }
    } else if (teamAttendantIds) {
      effectiveAttendantIds = teamAttendantIds;
    }

    // Search → visitor IDs
    let searchVisitorIds: string[] | null = null;
    if (filters.search && filters.search.trim()) {
      const { data: visitors } = await supabase
        .from("chat_visitors")
        .select("id")
        .ilike("name", `%${filters.search.trim()}%`)
        .limit(500);
      searchVisitorIds = visitors?.map(v => v.id) ?? [];
      if (searchVisitorIds.length === 0) {
        setStats(EMPTY_STATS); setLoading(false); return;
      }
    }

    // Tag filter → room IDs
    let tagRoomIds: string[] | null = null;
    if (filters.tagIds && filters.tagIds.length > 0) {
      const allRoomIds = new Set<string>();
      for (let i = 0; i < filters.tagIds.length; i += 100) {
        const batch = filters.tagIds.slice(i, i + 100);
        const { data } = await supabase.from("chat_room_tags").select("room_id").in("tag_id", batch);
        data?.forEach(r => allRoomIds.add(r.room_id));
      }
      tagRoomIds = [...allRoomIds];
      if (tagRoomIds.length === 0) {
        setStats(EMPTY_STATS); setLoading(false); return;
      }
    }

    // Category → contact IDs
    let categoryContactIds: string[] | null = null;
    if (filters.categoryId) {
      const { data } = await supabase.from("contacts").select("id").eq("service_category_id", filters.categoryId);
      categoryContactIds = data?.map(c => c.id) ?? [];
    }

    // Build rooms query
    let query = supabase
      .from("chat_rooms")
      .select("id, status, resolution_status, created_at, closed_at, csat_score, attendant_id, priority, contact_id, company_contact_id, visitor_id");

    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lt("created_at", endDate);
    if (effectiveAttendantIds) query = query.in("attendant_id", effectiveAttendantIds);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.priority) query = query.eq("priority", filters.priority);
    if (filters.contactId) query = query.eq("contact_id", filters.contactId);
    if (filters.companyContactId) query = query.eq("company_contact_id", filters.companyContactId);
    if (tagRoomIds) query = query.in("id", tagRoomIds.slice(0, 500));
    if (searchVisitorIds) query = query.in("visitor_id", searchVisitorIds.slice(0, 500));

    const [roomsRes, attendantsRes] = await Promise.all([
      query,
      supabase.from("attendant_profiles").select("id, display_name, status"),
    ]);

    let rooms = roomsRes.data ?? [];
    const allAttendants = attendantsRes.data ?? [];

    if (categoryContactIds !== null) {
      rooms = rooms.filter(r => r.contact_id && categoryContactIds!.includes(r.contact_id));
    }

    const onlineAttendants = allAttendants.filter(a => a.status === "available" || a.status === "online").length;

    if (rooms.length === 0) {
      setStats({ ...EMPTY_STATS, onlineAttendants }); setLoading(false); return;
    }

    const totalChats = rooms.length;
    const todayStr = now.toISOString().slice(0, 10);
    const chatsToday = rooms.filter(r => r.created_at?.slice(0, 10) === todayStr).length;
    const activeChats = rooms.filter(r => r.status === "active").length;
    const waitingChats = rooms.filter(r => r.status === "waiting").length;

    const withCsat = rooms.filter(r => r.csat_score != null);
    const avgCsat = withCsat.length > 0 ? Number((withCsat.reduce((s, r) => s + (r.csat_score ?? 0), 0) / withCsat.length).toFixed(1)) : null;

    const closedRooms = rooms.filter(r => r.status === "closed");
    const resolvedCount = closedRooms.filter(r => r.resolution_status === "resolved").length;
    const resolutionRate = closedRooms.length > 0 ? Math.round((resolvedCount / closedRooms.length) * 100) : null;

    const roomsWithTimes = closedRooms.filter(r => r.created_at && r.closed_at);
    let avgResolutionMinutes: number | null = null;
    if (roomsWithTimes.length > 0) {
      const totalMinutes = roomsWithTimes.reduce((sum, r) => sum + (new Date(r.closed_at!).getTime() - new Date(r.created_at!).getTime()) / 60000, 0);
      avgResolutionMinutes = Math.round(totalMinutes / roomsWithTimes.length);
    }

    const unresolvedChats = closedRooms.filter(r => r.resolution_status === "pending").length;

    // Chart data by day
    const byDay: Record<string, number> = {};
    rooms.forEach(r => { const day = r.created_at?.slice(0, 10) ?? ""; byDay[day] = (byDay[day] ?? 0) + 1; });
    const chartData = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, total]) => ({ date: date.slice(5), total }));

    // Resolution by day (for stacked area chart)
    const resByDay: Record<string, { resolved: number; pending: number; inactive: number; archived: number; escalated: number; total: number }> = {};
    rooms.forEach(r => {
      const day = r.created_at?.slice(0, 10) ?? "";
      if (!resByDay[day]) resByDay[day] = { resolved: 0, pending: 0, inactive: 0, archived: 0, escalated: 0, total: 0 };
      resByDay[day].total += 1;
      const rs = r.status === "closed" ? (r.resolution_status ?? "pending") : "active";
      if (rs === "resolved") resByDay[day].resolved += 1;
      else if (rs === "escalated") resByDay[day].escalated += 1;
      else if (rs === "inactive") resByDay[day].inactive += 1;
      else if (rs === "archived") resByDay[day].archived += 1;
      else resByDay[day].pending += 1;
    });
    const resolutionByDay = Object.entries(resByDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date: date.slice(5), ...v }));

    // CSAT by day
    const csatByDayMap: Record<string, { sum: number; count: number }> = {};
    rooms.forEach(r => {
      if (r.csat_score != null && r.created_at) {
        const day = r.created_at.slice(0, 10);
        if (!csatByDayMap[day]) csatByDayMap[day] = { sum: 0, count: 0 };
        csatByDayMap[day].sum += r.csat_score; csatByDayMap[day].count += 1;
      }
    });
    const csatByDay = Object.entries(csatByDayMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date: date.slice(5), avg: Number((v.sum / v.count).toFixed(1)) }));

    // Chats by hour
    const byHour: Record<number, number> = {};
    rooms.forEach(r => { if (r.created_at) { const hour = new Date(r.created_at).getHours(); byHour[hour] = (byHour[hour] ?? 0) + 1; } });
    const chatsByHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: byHour[h] ?? 0 }));

    // By attendant
    const byAttendant: Record<string, typeof rooms> = {};
    rooms.forEach(r => { if (r.attendant_id) { if (!byAttendant[r.attendant_id]) byAttendant[r.attendant_id] = []; byAttendant[r.attendant_id].push(r); } });

    const nameMap = new Map(allAttendants.map(a => [a.id, a.display_name]));
    const chatsByAttendant = Object.keys(byAttendant).map(id => ({ name: nameMap.get(id) ?? id.slice(0, 8), count: byAttendant[id].length })).sort((a, b) => b.count - a.count);

    const attendantPerformance = Object.keys(byAttendant).map(id => {
      const attRooms = byAttendant[id];
      const attCsat = attRooms.filter(r => r.csat_score != null);
      const attClosed = attRooms.filter(r => r.status === "closed");
      const attResolved = attClosed.filter(r => r.resolution_status === "resolved");
      const attWithTimes = attClosed.filter(r => r.created_at && r.closed_at);
      let attAvgRes: number | null = null;
      if (attWithTimes.length > 0) {
        const total = attWithTimes.reduce((s, r) => s + (new Date(r.closed_at!).getTime() - new Date(r.created_at!).getTime()) / 60000, 0);
        attAvgRes = Math.round(total / attWithTimes.length);
      }
      return {
        name: nameMap.get(id) ?? id.slice(0, 8), chats: attRooms.length,
        csat: attCsat.length > 0 ? Number((attCsat.reduce((s, r) => s + (r.csat_score ?? 0), 0) / attCsat.length).toFixed(1)) : null,
        resolutionRate: attClosed.length > 0 ? Math.round((attResolved.length / attClosed.length) * 100) : null,
        avgResolution: attAvgRes,
      };
    }).sort((a, b) => b.chats - a.chats);

    // Resolution distribution
    const resDist: Record<string, number> = {};
    closedRooms.forEach(r => { const st = r.resolution_status ?? "pending"; resDist[st] = (resDist[st] ?? 0) + 1; });
    const resolutionDistribution = Object.entries(resDist).map(([status, count]) => ({ status, count }));

    // Avg first response — single RPC call instead of batched queries
    let avgFirstResponseMinutes: number | null = null;
    const roomIds = rooms.map(r => r.id);
    if (roomIds.length > 0) {
      const { data: firstResponses } = await supabase.rpc("get_first_response_times", {
        p_room_ids: roomIds.slice(0, 500),
      });
      const firstByRoom: Record<string, string> = {};
      (firstResponses ?? []).forEach((m: any) => { firstByRoom[m.room_id] = m.created_at; });
      const responseTimes: number[] = [];
      rooms.forEach(r => { if (r.created_at && firstByRoom[r.id]) { const diff = (new Date(firstByRoom[r.id]).getTime() - new Date(r.created_at).getTime()) / 60000; if (diff >= 0) responseTimes.push(diff); } });
      if (responseTimes.length > 0) avgFirstResponseMinutes = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
    }

    const avgWaitMinutes = avgFirstResponseMinutes;
    const closedWithoutAttendant = closedRooms.filter(r => !r.attendant_id).length;
    const abandonmentRate = closedRooms.length > 0 ? Math.round((closedWithoutAttendant / closedRooms.length) * 100) : null;

    // Top tags
    let topTags: { name: string; color: string; count: number }[] = [];
    if (roomIds.length > 0) {
      const tagBatchSize = 100;
      const allRoomTags: { tag_id: string }[] = [];
      for (let i = 0; i < Math.min(roomIds.length, 500); i += tagBatchSize) {
        const batch = roomIds.slice(i, i + tagBatchSize);
        const { data: rt } = await supabase.from("chat_room_tags").select("tag_id").in("room_id", batch);
        if (rt) allRoomTags.push(...rt);
      }
      if (allRoomTags.length > 0) {
        const tagCounts: Record<string, number> = {};
        allRoomTags.forEach(rt => { tagCounts[rt.tag_id] = (tagCounts[rt.tag_id] ?? 0) + 1; });
        const uniqueTagIds = Object.keys(tagCounts);
        const { data: tagDetails } = await supabase.from("chat_tags").select("id, name, color").in("id", uniqueTagIds);
        if (tagDetails) {
          topTags = tagDetails.map(t => ({ name: t.name, color: t.color ?? "#6366f1", count: tagCounts[t.id] ?? 0 })).sort((a, b) => b.count - a.count).slice(0, 15);
        }
      }
    }

    setStats({
      totalChats, chatsToday, avgCsat, resolutionRate, avgResolutionMinutes,
      chartData, chatsByAttendant, resolutionDistribution, resolutionByDay, activeChats,
      waitingChats, onlineAttendants, avgFirstResponseMinutes, unresolvedChats,
      csatByDay, attendantPerformance, chatsByHour, avgWaitMinutes, abandonmentRate, topTags,
    });
    setLoading(false);
  }, [filters.period, filters.attendantIds, filters.teamIds, filters.status, filters.priority, filters.categoryId, filters.tagIds, filters.contactId, filters.companyContactId, filters.dateFrom, filters.dateTo, filters.search]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const toggleRealtime = useCallback(() => { setRealtimeEnabled(prev => !prev); }, []);

  useEffect(() => {
    if (!realtimeEnabled) {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
      return;
    }
    const debouncedFetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => { fetchStats(); }, 5000);
    };
    const channel = supabase.channel("dashboard-realtime-rooms").on("postgres_changes", { event: "*", schema: "public", table: "chat_rooms" }, debouncedFetch).subscribe();
    channelRef.current = channel;
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel); channelRef.current = null;
    };
  }, [realtimeEnabled, fetchStats]);

  return { stats, loading, refetch: fetchStats, realtimeEnabled, toggleRealtime };
}
