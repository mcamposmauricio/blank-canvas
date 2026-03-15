import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  const [teamAttendants, setTeamAttendants] = useState<TeamAttendant[]>([]);
  const [otherTeamAttendants, setOtherTeamAttendants] = useState<TeamAttendant[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const initializedForRef = useRef<string | null>(null);

  const totalActiveChats = teamAttendants.reduce((sum, a) => sum + a.active_count, 0) + unassignedCount;
  const otherTeamsTotalChats = otherTeamAttendants.reduce((sum, a) => sum + a.active_count, 0);

  const initializeData = useCallback(async (userId: string, adminStatus: boolean, currentTenantId?: string | null, masterImpersonating?: boolean) => {
    const { data: myProfile } = await supabase
      .from("attendant_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    let attendants: any[] = [];
    let myTeamAttendantIds: string[] = [];
    let otherAttendants: any[] = [];

    if (masterImpersonating && currentTenantId) {
      const { data } = await supabase
        .from("attendant_profiles")
        .select("id, display_name, user_id, status, active_conversations")
        .eq("tenant_id", currentTenantId);
      attendants = data ?? [];
    } else if (adminStatus) {
      const { data: allData } = await supabase
        .from("attendant_profiles")
        .select("id, display_name, user_id, status, active_conversations");
      const allAttendants = allData ?? [];

      if (myProfile) {
        const { data: myTeams } = await supabase
          .from("chat_team_members")
          .select("team_id")
          .eq("attendant_id", myProfile.id);
        if (myTeams && myTeams.length > 0) {
          const teamIds = myTeams.map((t: any) => t.team_id);
          const { data: teamMembers } = await supabase
            .from("chat_team_members")
            .select("attendant_id")
            .in("team_id", teamIds);
          const myTeamIds = new Set((teamMembers ?? []).map((m: any) => m.attendant_id));
          myTeamAttendantIds = [...myTeamIds];
          attendants = allAttendants.filter((a: any) => myTeamIds.has(a.id));
          otherAttendants = allAttendants.filter((a: any) => !myTeamIds.has(a.id));
        } else {
          attendants = allAttendants;
        }
      } else {
        attendants = allAttendants;
      }
    } else if (myProfile) {
      const { data: myTeams } = await supabase
        .from("chat_team_members")
        .select("team_id")
        .eq("attendant_id", myProfile.id);
      if (myTeams && myTeams.length > 0) {
        const teamIds = myTeams.map((t: any) => t.team_id);
        const { data: teamMembers } = await supabase
          .from("chat_team_members")
          .select("attendant_id")
          .in("team_id", teamIds);
        const uniqueIds = [...new Set((teamMembers ?? []).map((m: any) => m.attendant_id))];
        myTeamAttendantIds = uniqueIds;
        if (uniqueIds.length > 0) {
          const { data } = await supabase
            .from("attendant_profiles")
            .select("id, display_name, user_id, status, active_conversations")
            .in("id", uniqueIds);
          attendants = data ?? [];
        }
      } else {
        const { data } = await supabase
          .from("attendant_profiles")
          .select("id, display_name, user_id, status, active_conversations")
          .eq("user_id", userId);
        attendants = data ?? [];
        myTeamAttendantIds = (data ?? []).map((a: any) => a.id);
      }
    }

    if (!adminStatus && !masterImpersonating && currentTenantId && myProfile) {
      const { data: allTenant } = await supabase
        .from("attendant_profiles")
        .select("id, display_name, user_id, status, active_conversations")
        .eq("tenant_id", currentTenantId);
      const myIds = new Set(myTeamAttendantIds);
      otherAttendants = (allTenant ?? []).filter((a: any) => !myIds.has(a.id));
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

  // Resync counts from the database (always accurate thanks to COUNT-based trigger)
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

  // Debounced resync: triggers on any room change instead of incremental patches
  const resyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedResync = useCallback(() => {
    if (resyncTimerRef.current) clearTimeout(resyncTimerRef.current);
    resyncTimerRef.current = setTimeout(() => {
      resyncCounts();
    }, 1000);
  }, [resyncCounts]);

  const handleRoomChange = useCallback(() => {
    debouncedResync();
  }, [debouncedResync]);

  const handleAttendantChange = useCallback((payload: any) => {
    const updated = payload.new as any;
    if (!updated) return;

    const applyToSetter = (setter: React.Dispatch<React.SetStateAction<TeamAttendant[]>>) => {
      if (payload.eventType === "UPDATE") {
        setter(prev => prev.map(a =>
          a.id === updated.id
            ? { ...a, status: updated.status, display_name: updated.display_name, active_count: updated.active_conversations ?? a.active_count }
            : a
        ));
      } else if (payload.eventType === "DELETE") {
        setter(prev => prev.filter(a => a.id !== payload.old?.id));
      }
    };

    if (payload.eventType === "INSERT") {
      setTeamAttendants(prev => {
        if (prev.find(a => a.id === updated.id)) return prev;
        return [...prev, {
          id: updated.id,
          display_name: updated.display_name,
          user_id: updated.user_id,
          active_count: updated.active_conversations ?? 0,
          status: updated.status ?? null,
        }];
      });
    }

    applyToSetter(setTeamAttendants);
    applyToSetter(setOtherTeamAttendants);
  }, []);

  // Refs for stable values used inside effects without triggering re-runs
  const isAdminRef = useRef(isAdmin);
  const isMasterRef = useRef(isMaster);
  const isImpersonatingRef = useRef(isImpersonating);
  isAdminRef.current = isAdmin;
  isMasterRef.current = isMaster;
  isImpersonatingRef.current = isImpersonating;

  // Data initialization — depends on user.id + tenantId (stable keys)
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

  // Realtime channels — only depend on user.id (stable, never re-created on token refresh)
  useEffect(() => {
    if (!user?.id) return;

    const roomsChannel = supabase
      .channel("global-sidebar-chat-rooms")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_rooms" },
        handleRoomChange
      )
      .subscribe();

    const attendantsChannel = supabase
      .channel("global-sidebar-attendants")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendant_profiles" },
        handleAttendantChange
      )
      .subscribe();

    const resyncInterval = setInterval(resyncCounts, 30_000);

    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(attendantsChannel);
      clearInterval(resyncInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
