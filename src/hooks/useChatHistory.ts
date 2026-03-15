import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HistoryFilter {
  resolutionStatuses?: string[];
  attendantIds?: string[];
  tagIds?: string[];
  teamIds?: string[];
  companyId?: string | null;
  companyContactId?: string | null;
  search?: string;
  page: number;
  csatFilters?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface ClosedRoom {
  id: string;
  status: string;
  resolution_status: string | null;
  created_at: string;
  closed_at: string | null;
  csat_score: number | null;
  visitor_id: string;
  attendant_id: string | null;
  visitor_name: string | null;
  attendant_name: string | null;
  tags: { name: string; color: string }[];
}

const PAGE_SIZE = 20;
const MAX_FILTER_IDS = 500;

function batchArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

async function fetchRoomIdsByTags(tagIds: string[]): Promise<string[] | null> {
  if (!tagIds || tagIds.length === 0) return null;
  const batches = batchArray(tagIds, 100);
  const allRoomIds = new Set<string>();
  for (const batch of batches) {
    const { data } = await supabase.from("chat_room_tags").select("room_id").in("tag_id", batch);
    if (data) data.forEach(r => allRoomIds.add(r.room_id));
  }
  return [...allRoomIds].slice(0, MAX_FILTER_IDS);
}

async function fetchVisitorIdsBySearch(search: string): Promise<string[] | null> {
  if (!search || search.trim() === "") return null;
  const { data } = await supabase.from("chat_visitors").select("id").ilike("name", `%${search.trim()}%`).limit(MAX_FILTER_IDS);
  if (!data || data.length === 0) return [];
  return data.map(v => v.id);
}

async function fetchAttendantIdsByTeams(teamIds: string[]): Promise<string[] | null> {
  if (!teamIds || teamIds.length === 0) return null;
  const { data } = await supabase.from("chat_team_members").select("attendant_id").in("team_id", teamIds);
  if (!data || data.length === 0) return [];
  return [...new Set(data.map(m => m.attendant_id))];
}

async function fetchRoomIdsByCompany(companyId: string | null, companyContactId: string | null): Promise<string[] | null> {
  if (!companyId && !companyContactId) return null;
  let query = supabase.from("chat_rooms").select("id").eq("status", "closed");
  if (companyContactId) query = query.eq("company_contact_id", companyContactId);
  else if (companyId) query = query.eq("contact_id", companyId);
  const { data } = await query.limit(MAX_FILTER_IDS);
  if (!data || data.length === 0) return [];
  return data.map(r => r.id);
}

export function useChatHistory(filters: HistoryFilter) {
  const [rooms, setRooms] = useState<ClosedRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchRooms = useCallback(async () => {
    setLoading(true);

    const [tagRoomIds, searchVisitorIds, teamAttIds, companyRoomIds] = await Promise.all([
      fetchRoomIdsByTags(filters.tagIds ?? []),
      fetchVisitorIdsBySearch(filters.search ?? ""),
      fetchAttendantIdsByTeams(filters.teamIds ?? []),
      fetchRoomIdsByCompany(filters.companyId ?? null, filters.companyContactId ?? null),
    ]);

    if (tagRoomIds !== null && tagRoomIds.length === 0) { setRooms([]); setTotalCount(0); setLoading(false); return; }
    if (searchVisitorIds !== null && searchVisitorIds.length === 0) { setRooms([]); setTotalCount(0); setLoading(false); return; }
    if (teamAttIds !== null && teamAttIds.length === 0) { setRooms([]); setTotalCount(0); setLoading(false); return; }
    if (companyRoomIds !== null && companyRoomIds.length === 0) { setRooms([]); setTotalCount(0); setLoading(false); return; }

    // Merge tag room IDs and company room IDs
    let effectiveRoomIds: string[] | null = null;
    if (tagRoomIds && companyRoomIds) {
      const tagSet = new Set(tagRoomIds);
      effectiveRoomIds = companyRoomIds.filter(id => tagSet.has(id));
      if (effectiveRoomIds.length === 0) { setRooms([]); setTotalCount(0); setLoading(false); return; }
    } else {
      effectiveRoomIds = tagRoomIds ?? companyRoomIds;
    }

    // Merge attendant filters with team attendant IDs
    let effectiveAttendantIds: string[] | null = null;
    if (filters.attendantIds && filters.attendantIds.length > 0) {
      effectiveAttendantIds = filters.attendantIds;
      if (teamAttIds) {
        const teamSet = new Set(teamAttIds);
        effectiveAttendantIds = effectiveAttendantIds.filter(id => teamSet.has(id));
        if (effectiveAttendantIds.length === 0) { setRooms([]); setTotalCount(0); setLoading(false); return; }
      }
    } else if (teamAttIds) {
      effectiveAttendantIds = teamAttIds;
    }

    const from = filters.page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("chat_rooms")
      .select("id, status, resolution_status, created_at, closed_at, csat_score, visitor_id, attendant_id", { count: "exact" })
      .eq("status", "closed")
      .order("closed_at", { ascending: false })
      .range(from, to);

    if (effectiveRoomIds !== null) query = query.in("id", effectiveRoomIds);
    if (searchVisitorIds !== null) query = query.in("visitor_id", searchVisitorIds);
    if (effectiveAttendantIds !== null) query = query.in("attendant_id", effectiveAttendantIds);

    if (filters.resolutionStatuses && filters.resolutionStatuses.length > 0) query = query.in("resolution_status", filters.resolutionStatuses);
    if (filters.dateFrom) query = query.gte("closed_at", filters.dateFrom);
    if (filters.dateTo) query = query.lte("closed_at", filters.dateTo);
    if (filters.csatFilters && filters.csatFilters.length > 0) {
      if (filters.csatFilters.length === 1) {
        if (filters.csatFilters.includes("low")) query = query.lte("csat_score", 2).not("csat_score", "is", null);
        else if (filters.csatFilters.includes("neutral")) query = query.eq("csat_score", 3);
        else if (filters.csatFilters.includes("good")) query = query.gte("csat_score", 4);
      } else {
        query = query.not("csat_score", "is", null);
      }
    }

    const { data: roomsData, count } = await query;

    if (!roomsData || roomsData.length === 0) { setRooms([]); setTotalCount(count ?? 0); setLoading(false); return; }
    setTotalCount(count ?? 0);

    const visitorIds = [...new Set(roomsData.map(r => r.visitor_id))];
    const { data: visitors } = await supabase.from("chat_visitors").select("id, name").in("id", visitorIds);
    const visitorMap = new Map(visitors?.map(v => [v.id, v.name]) ?? []);

    const attendantIds = [...new Set(roomsData.filter(r => r.attendant_id).map(r => r.attendant_id!))];
    let attendantMap = new Map<string, string>();
    if (attendantIds.length > 0) {
      const { data: attendants } = await supabase.from("attendant_profiles").select("id, display_name").in("id", attendantIds);
      attendantMap = new Map(attendants?.map(a => [a.id, a.display_name]) ?? []);
    }

    const roomIds = roomsData.map(r => r.id);
    const { data: roomTags } = await supabase.from("chat_room_tags").select("room_id, tag_id").in("room_id", roomIds);

    let tagMap = new Map<string, { name: string; color: string }[]>();
    if (roomTags && roomTags.length > 0) {
      const tIds = [...new Set(roomTags.map(rt => rt.tag_id))];
      const { data: tags } = await supabase.from("chat_tags").select("id, name, color").in("id", tIds);
      const tagInfoMap = new Map(tags?.map(t => [t.id, { name: t.name, color: t.color ?? "#6366f1" }]) ?? []);
      roomTags.forEach(rt => {
        const existing = tagMap.get(rt.room_id) ?? [];
        const tagInfo = tagInfoMap.get(rt.tag_id);
        if (tagInfo) existing.push(tagInfo);
        tagMap.set(rt.room_id, existing);
      });
    }

    const enriched: ClosedRoom[] = roomsData.map(r => ({
      id: r.id, status: r.status ?? "closed", resolution_status: r.resolution_status,
      created_at: r.created_at ?? "", closed_at: r.closed_at, csat_score: r.csat_score,
      visitor_id: r.visitor_id, attendant_id: r.attendant_id,
      visitor_name: visitorMap.get(r.visitor_id) ?? null,
      attendant_name: r.attendant_id ? (attendantMap.get(r.attendant_id) ?? null) : null,
      tags: tagMap.get(r.id) ?? [],
    }));

    setRooms(enriched);
    setLoading(false);
  }, [filters.page, filters.resolutionStatuses, filters.attendantIds, filters.tagIds, filters.teamIds, filters.companyId, filters.companyContactId, filters.search, filters.csatFilters, filters.dateFrom, filters.dateTo]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const exportToCSV = useCallback(() => {
    const headers = ["ID", "Cliente", "Atendente", "Status", "Resolução", "CSAT", "Duração (min)", "Início", "Encerramento", "Tags"];
    const rows = rooms.map(r => {
      const dur = r.closed_at && r.created_at ? Math.floor((new Date(r.closed_at).getTime() - new Date(r.created_at).getTime()) / 60000) : "";
      return [r.id.slice(0, 8), r.visitor_name ?? "—", r.attendant_name ?? "—", r.status, r.resolution_status ?? "—", r.csat_score != null ? `${r.csat_score}/5` : "—", String(dur), r.created_at ? new Date(r.created_at).toLocaleString("pt-BR") : "—", r.closed_at ? new Date(r.closed_at).toLocaleString("pt-BR") : "—", r.tags.map(t => t.name).join(", ") || "—"];
    });
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `historico-chats-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  }, [rooms]);

  return { rooms, loading, totalCount, totalPages: Math.ceil(totalCount / PAGE_SIZE), exportToCSV, refetch: fetchRooms };
}
