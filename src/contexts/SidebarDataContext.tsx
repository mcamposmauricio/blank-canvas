import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenantRealtime, type RoomStatusPayload, type AttendantUpdatePayload } from "@/contexts/TenantRealtimeContext";

export interface TeamAttendant {
  id: string;
  display_name: string;
  active_count: number;
  user_id: string;
  status: string | null;
}

interface SidebarDataContextType {
  teamAttendants: TeamAttendant[];
  otherTeamAttendants: TeamAttendant[];
  totalActiveChats: number;
  otherTeamsTotalChats: number;
  unassignedCount: number;
  initialized: boolean;
}

const SidebarDataContext = createContext<SidebarDataContextType | undefined>(undefined);

export function SidebarDataProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, isMaster, isImpersonating, tenantId } = useAuth();
  const { onRoomStatusChange, onAttendantUpdate } = useTenantRealtime();
  const [teamAttendants, setTeamAttendants] = useState<TeamAttendant[]>([]);
  const [otherTeamAttendants, setOtherTeamAttendants] = useState<TeamAttendant[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const initializedForRef = useRef<string | null>(null);

  const totalActiveChats = teamAttendants.reduce((sum, a) => sum + a.active_count, 0) + unassignedCount;
  const otherTeamsTotalChats = otherTeamAttendants.reduce((sum, a) => sum + a.active_count, 0);

  const initializeData = useCallback(async (userId: string, adminStatus: boolean, currentTenantId?: string | null, masterImpersonating?: boolean) => {
    let attQuery = supabase
      .from("attendant_profiles")
      .select("id, display_name, user_id, status, active_conversations");
    if (currentTenantId) attQuery = attQuery.eq("tenant_id", currentTenantId);

    let tmQuery = supabase
      .from("chat_team_members")
      .select("team_id, attendant_id");
    if (currentTenantId) tmQuery = tmQuery.eq("tenant_id", currentTenantId);

    const [{ data: allAttendants }, { data: allTeamMembers }] = await Promise.all([attQuery, tmQuery]);
    const attendantsList = allAttendants ?? [];
    const teamMembersList = allTeamMembers ?? [];

    const myProfile = attendantsList.find((a: any) => a.user_id === userId);

    let attendants: any[] = [];
    let otherAttendants: any[] = [];

    if (masterImpersonating || (adminStatus && !myProfile)) {
      attendants = attendantsList;
    } else if (myProfile) {
      const myTeamIds = new Set(
        teamMembersList.filter((m: any) => m.attendant_id === myProfile.id).map((m: any) => m.team_id)
      );

      if (myTeamIds.size > 0) {
        const myTeamAttendantIds = new Set(
          teamMembersList.filter((m: any) => myTeamIds.has(m.team_id)).map((m: any) => m.attendant_id)
        );
        attendants = attendantsList.filter((a: any) => myTeamAttendantIds.has(a.id));
        otherAttendants = attendantsList.filter((a: any) => !myTeamAttendantIds.has(a.id));
      } else if (adminStatus) {
        attendants = attendantsList;
      } else {
        attendants = attendantsList.filter((a: any) => a.user_id === userId);
        otherAttendants = attendantsList.filter((a: any) => a.user_id !== userId);
      }
    }

    let unassignedQuery = supabase
      .from("chat_rooms")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "waiting"])
      .is("attendant_id", null);

    if (masterImpersonating && currentTenantId) {
      unassignedQuery = unassignedQuery.eq("tenant_id", currentTenantId);
    }

    const { count: unassigned } = await unassignedQuery;
    setUnassignedCount(unassigned ?? 0);

    const sorted = attendants
      .map((a: any) => ({
        id: a.id,
        display_name: a.display_name,
        user_id: a.user_id,
        active_count: a.active_conversations ?? 0,
        status: a.status ?? null,
      }))
      .sort((a, b) => {
        if (a.user_id === userId) return -1;
        if (b.user_id === userId) return 1;
        return a.display_name.localeCompare(b.display_name);
      });

    setTeamAttendants(sorted);

    const sortedOther = otherAttendants
      .map((a: any) => ({
        id: a.id,
        display_name: a.display_name,
        user_id: a.user_id,
        active_count: a.active_conversations ?? 0,
        status: a.status ?? null,
      }))
      .sort((a, b) => a.display_name.localeCompare(b.display_name));

    setOtherTeamAttendants(sortedOther);
    setInitialized(true);
    initializedForRef.current = userId + (currentTenantId ?? '');
  }, []);

  const resyncCounts = useCallback(async () => {
    const { count: unassigned } = await supabase
      .from("chat_rooms")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "waiting"])
      .is("attendant_id", null);
    setUnassignedCount(unassigned ?? 0);

    const allIds = [...new Set([
      ...teamAttendants.map(a => a.id),
      ...otherTeamAttendants.map(a => a.id),
    ])];
    if (allIds.length > 0) {
      const { data: profiles } = await supabase
        .from("attendant_profiles")
        .select("id, active_conversations")
        .in("id", allIds);
      if (profiles) {
        const countsMap: Record<string, number> = {};
        profiles.forEach(p => { countsMap[p.id] = p.active_conversations ?? 0; });
        setTeamAttendants(prev => prev.map(a => ({ ...a, active_count: countsMap[a.id] ?? a.active_count })));
        setOtherTeamAttendants(prev => prev.map(a => ({ ...a, active_count: countsMap[a.id] ?? a.active_count })));
      }
    }
  }, [teamAttendants, otherTeamAttendants]);

  const resyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedResync = useCallback(() => {
    if (resyncTimerRef.current) clearTimeout(resyncTimerRef.current);
    resyncTimerRef.current = setTimeout(() => {
      resyncCounts();
    }, 5000);
  }, [resyncCounts]);

  const isAdminRef = useRef(isAdmin);
  const isMasterRef = useRef(isMaster);
  const isImpersonatingRef = useRef(isImpersonating);
  isAdminRef.current = isAdmin;
  isMasterRef.current = isMaster;
  isImpersonatingRef.current = isImpersonating;

  useEffect(() => {
    if (!user?.id) {
      setTeamAttendants([]);
      setOtherTeamAttendants([]);
      setInitialized(false);
      initializedForRef.current = null;
      return;
    }

    const cacheKey = user.id + (tenantId ?? '');

    if (initializedForRef.current !== cacheKey) {
      setInitialized(false);
      initializeData(user.id, isAdminRef.current, tenantId, isMasterRef.current && isImpersonatingRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, tenantId]);

  // ── Consume TenantRealtime events instead of pg_changes channels ────
  useEffect(() => {
    if (!user?.id) return;

    // Room status changes → debounced resync of counters
    const unsubRoom = onRoomStatusChange(() => {
      debouncedResync();
    });

    // Attendant updates → apply inline changes
    const unsubAtt = onAttendantUpdate((payload: AttendantUpdatePayload) => {
      const applyUpdate = (setter: React.Dispatch<React.SetStateAction<TeamAttendant[]>>) => {
        setter(prev => prev.map(a =>
          a.id === payload.attendant_id
            ? {
                ...a,
                status: payload.status ?? a.status,
                display_name: payload.display_name ?? a.display_name,
                active_count: payload.active_conversations ?? a.active_count,
              }
            : a
        ));
      };
      applyUpdate(setTeamAttendants);
      applyUpdate(setOtherTeamAttendants);
    });

    // Periodic reconciliation
    const resyncInterval = setInterval(resyncCounts, 300_000);

    return () => {
      unsubRoom();
      unsubAtt();
      clearInterval(resyncInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, tenantId, debouncedResync, resyncCounts, onRoomStatusChange, onAttendantUpdate]);

  return (
    <SidebarDataContext.Provider value={{ teamAttendants, otherTeamAttendants, totalActiveChats, otherTeamsTotalChats, unassignedCount, initialized }}>
      {children}
    </SidebarDataContext.Provider>
  );
}

export function useSidebarData(): SidebarDataContextType {
  const context = useContext(SidebarDataContext);
  if (!context) {
    throw new Error("useSidebarData must be used within SidebarDataProvider");
  }
  return context;
}
