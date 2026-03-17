import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CSATRecord {
  roomId: string;
  visitorName: string;
  attendantName: string;
  attendantId: string | null;
  csatScore: number;
  csatComment: string | null;
  closedAt: string;
  createdAt: string;
  durationMinutes: number | null;
  tags: { id: string; name: string; color: string | null }[];
}

export interface CSATReportFilters {
  period: "today" | "week" | "month" | "all";
  scores: number[];
  attendantIds: string[];
  teamIds: string[];
  tagIds: string[];
  contactId: string | null;
  companyContactId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  sortBy: "date" | "score";
  sortDir: "asc" | "desc";
  page: number;
}

export interface CSATReportStats {
  avgCsat: number | null;
  totalEvaluations: number;
  totalClosedChats: number;
  responseRate: number | null;
  positivePercent: number | null;
  positiveCount: number;
  negativePercent: number | null;
  negativeCount: number;
  csatByDay: { date: string; avg: number; count: number }[];
  scoreDistribution: { score: number; count: number }[];
}

const PAGE_SIZE = 20;

const EMPTY_STATS: CSATReportStats = { avgCsat: null, totalEvaluations: 0, totalClosedChats: 0, responseRate: null, positivePercent: null, positiveCount: 0, negativePercent: null, negativeCount: 0, csatByDay: [], scoreDistribution: [] };

export function useCSATReport(filters: CSATReportFilters) {
  const [records, setRecords] = useState<CSATRecord[]>([]);
  const [stats, setStats] = useState<CSATReportStats>(EMPTY_STATS);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const now = new Date();
    let startDate: string | null = null;
    let endDate: string | null = null;

    if (filters.dateFrom) {
      startDate = new Date(filters.dateFrom + "T00:00:00").toISOString();
    } else {
      switch (filters.period) {
        case "today": startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(); break;
        case "week": { const w = new Date(now); w.setDate(w.getDate() - 7); startDate = w.toISOString(); break; }
        case "month": { const m = new Date(now); m.setDate(m.getDate() - 30); startDate = m.toISOString(); break; }
      }
    }
    if (filters.dateTo) { const d = new Date(filters.dateTo + "T00:00:00"); d.setDate(d.getDate() + 1); endDate = d.toISOString(); }

    // Resolve teams → attendant IDs
    let teamAttendantIds: string[] | null = null;
    if (filters.teamIds.length > 0) {
      const { data: members } = await supabase.from("chat_team_members").select("attendant_id").in("team_id", filters.teamIds);
      teamAttendantIds = members?.map(m => m.attendant_id) ?? [];
      if (teamAttendantIds.length === 0) { setRecords([]); setStats(EMPTY_STATS); setTotalCount(0); setLoading(false); return; }
    }

    // Merge attendant filters
    let effectiveAttendantIds: string[] | null = null;
    if (filters.attendantIds.length > 0) {
      effectiveAttendantIds = filters.attendantIds;
      if (teamAttendantIds) {
        const teamSet = new Set(teamAttendantIds);
        effectiveAttendantIds = effectiveAttendantIds.filter(id => teamSet.has(id));
        if (effectiveAttendantIds.length === 0) { setRecords([]); setStats(EMPTY_STATS); setTotalCount(0); setLoading(false); return; }
      }
    } else if (teamAttendantIds) {
      effectiveAttendantIds = teamAttendantIds;
    }

    // Resolve tags → room IDs
    let tagRoomIds: string[] | null = null;
    if (filters.tagIds.length > 0) {
      const allIds = new Set<string>();
      for (let i = 0; i < filters.tagIds.length; i += 100) {
        const batch = filters.tagIds.slice(i, i + 100);
        const { data } = await supabase.from("chat_room_tags").select("room_id").in("tag_id", batch);
        data?.forEach(r => allIds.add(r.room_id));
      }
      tagRoomIds = [...allIds];
      if (tagRoomIds.length === 0) { setRecords([]); setStats(EMPTY_STATS); setTotalCount(0); setLoading(false); return; }
    }

    // Stats query (only rooms with CSAT)
    let statsQuery = supabase.from("chat_rooms").select("id, csat_score, csat_comment, closed_at, created_at, attendant_id").eq("status", "closed").not("csat_score", "is", null);
    // Total closed chats query (head only, no csat filter)
    let totalClosedQuery = supabase.from("chat_rooms").select("id", { count: "exact", head: true }).eq("status", "closed");

    // Apply same date/filter constraints to both queries
    if (startDate) { statsQuery = statsQuery.gte("closed_at", startDate); totalClosedQuery = totalClosedQuery.gte("closed_at", startDate); }
    if (endDate) { statsQuery = statsQuery.lt("closed_at", endDate); totalClosedQuery = totalClosedQuery.lt("closed_at", endDate); }
    if (effectiveAttendantIds) { statsQuery = statsQuery.in("attendant_id", effectiveAttendantIds); totalClosedQuery = totalClosedQuery.in("attendant_id", effectiveAttendantIds); }
    if (filters.scores.length > 0) statsQuery = statsQuery.in("csat_score", filters.scores);
    if (tagRoomIds) { statsQuery = statsQuery.in("id", tagRoomIds.slice(0, 500)); totalClosedQuery = totalClosedQuery.in("id", tagRoomIds.slice(0, 500)); }
    if (filters.contactId) { statsQuery = statsQuery.eq("contact_id", filters.contactId); totalClosedQuery = totalClosedQuery.eq("contact_id", filters.contactId); }
    if (filters.companyContactId) { statsQuery = statsQuery.eq("company_contact_id", filters.companyContactId); totalClosedQuery = totalClosedQuery.eq("company_contact_id", filters.companyContactId); }

    const [{ data: allRooms }, { count: closedCount }] = await Promise.all([statsQuery, totalClosedQuery]);
    const rooms = allRooms ?? [];
    const totalClosedChats = closedCount ?? 0;

    const totalEvaluations = rooms.length;
    const avgCsat = totalEvaluations > 0 ? Number((rooms.reduce((s, r) => s + (r.csat_score ?? 0), 0) / totalEvaluations).toFixed(1)) : null;
    const positiveCount = rooms.filter(r => (r.csat_score ?? 0) >= 4).length;
    const negativeCount = rooms.filter(r => (r.csat_score ?? 0) <= 2).length;
    const positivePercent = totalEvaluations > 0 ? Math.round((positiveCount / totalEvaluations) * 100) : null;
    const negativePercent = totalEvaluations > 0 ? Math.round((negativeCount / totalEvaluations) * 100) : null;
    const responseRate = totalClosedChats > 0 ? Math.round((totalEvaluations / totalClosedChats) * 100) : null;

    const byDayMap: Record<string, { sum: number; count: number }> = {};
    rooms.forEach(r => {
      const day = (r.closed_at ?? r.created_at)?.slice(0, 10) ?? "";
      if (!byDayMap[day]) byDayMap[day] = { sum: 0, count: 0 };
      byDayMap[day].sum += r.csat_score ?? 0; byDayMap[day].count += 1;
    });
    const csatByDay = Object.entries(byDayMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date: date.slice(5), avg: Number((v.sum / v.count).toFixed(1)), count: v.count }));

    const scoreCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    rooms.forEach(r => { const s = r.csat_score ?? 0; if (s >= 1 && s <= 5) scoreCounts[s]++; });
    const scoreDistribution = [1, 2, 3, 4, 5].map(score => ({ score, count: scoreCounts[score] }));

    setStats({ avgCsat, totalEvaluations, totalClosedChats, responseRate, positivePercent, positiveCount, negativePercent, negativeCount, csatByDay, scoreDistribution });
    setTotalCount(totalEvaluations);

    // Paginated records
    const sortField = filters.sortBy === "score" ? "csat_score" : "closed_at";
    const ascending = filters.sortDir === "asc";
    const offset = filters.page * PAGE_SIZE;

    let pageQuery = supabase.from("chat_rooms").select("id, csat_score, csat_comment, closed_at, created_at, attendant_id, visitor_id, chat_visitors!visitor_id(name)").eq("status", "closed").not("csat_score", "is", null).order(sortField, { ascending }).range(offset, offset + PAGE_SIZE - 1);
    if (startDate) pageQuery = pageQuery.gte("closed_at", startDate);
    if (endDate) pageQuery = pageQuery.lt("closed_at", endDate);
    if (effectiveAttendantIds) pageQuery = pageQuery.in("attendant_id", effectiveAttendantIds);
    if (filters.scores.length > 0) pageQuery = pageQuery.in("csat_score", filters.scores);
    if (tagRoomIds) pageQuery = pageQuery.in("id", tagRoomIds.slice(0, 500));
    if (filters.contactId) pageQuery = pageQuery.eq("contact_id", filters.contactId);
    if (filters.companyContactId) pageQuery = pageQuery.eq("company_contact_id", filters.companyContactId);

    const { data: pageData } = await pageQuery;
    const pageRooms = pageData ?? [];

    const attIds = [...new Set(pageRooms.map(r => r.attendant_id).filter(Boolean))] as string[];
    let attendantMap: Record<string, string> = {};
    if (attIds.length > 0) {
      const { data: atts } = await supabase.from("attendant_profiles").select("id, display_name").in("id", attIds);
      (atts ?? []).forEach(a => { attendantMap[a.id] = a.display_name; });
    }

    const roomIds = pageRooms.map(r => r.id);
    let roomTagsMap: Record<string, { id: string; name: string; color: string | null }[]> = {};
    if (roomIds.length > 0) {
      const { data: roomTags } = await supabase.from("chat_room_tags").select("room_id, tag_id, chat_tags!tag_id(id, name, color)").in("room_id", roomIds);
      (roomTags ?? []).forEach((rt: any) => {
        if (!roomTagsMap[rt.room_id]) roomTagsMap[rt.room_id] = [];
        if (rt.chat_tags) roomTagsMap[rt.room_id].push({ id: rt.chat_tags.id, name: rt.chat_tags.name, color: rt.chat_tags.color });
      });
    }

    const mappedRecords: CSATRecord[] = pageRooms.map((r: any) => {
      const created = new Date(r.created_at).getTime();
      const closed = r.closed_at ? new Date(r.closed_at).getTime() : null;
      const duration = closed ? Math.round((closed - created) / 60000) : null;
      return {
        roomId: r.id, visitorName: r.chat_visitors?.name ?? "Visitante",
        attendantName: r.attendant_id ? (attendantMap[r.attendant_id] ?? "—") : "—",
        attendantId: r.attendant_id, csatScore: r.csat_score, csatComment: r.csat_comment,
        closedAt: r.closed_at ?? r.created_at, createdAt: r.created_at,
        durationMinutes: duration, tags: roomTagsMap[r.id] ?? [],
      };
    });

    setRecords(mappedRecords);
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { records, stats, totalCount, loading, pageSize: PAGE_SIZE, refetch: fetchData };
}
