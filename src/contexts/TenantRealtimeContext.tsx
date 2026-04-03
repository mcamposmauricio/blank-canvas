import { createContext, useContext, useEffect, useRef, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ── Broadcast event types ──────────────────────────────────────────────
export interface RoomStatusPayload {
  room_id: string;
  status?: string;
  attendant_id?: string | null;
  updated_at?: string;
  resolution_status?: string | null;
  priority?: string | null;
  closed_at?: string | null;
  assigned_at?: string | null;
  visitor_last_read_at?: string | null;
}

export interface NewMessageActivityPayload {
  room_id: string;
  updated_at?: string;
  content?: string;
  sender_type?: string;
  sender_name?: string | null;
  created_at?: string;
}

export interface AttendantUpdatePayload {
  attendant_id: string;
  status?: string | null;
  active_conversations?: number;
  display_name?: string;
}

type BroadcastEvent = "room_status" | "new_message_activity" | "attendant_update";

type RoomStatusCallback = (payload: RoomStatusPayload, source: "broadcast" | "pg") => void;
type MessageActivityCallback = (payload: NewMessageActivityPayload, source: "broadcast" | "pg") => void;
type AttendantUpdateCallback = (payload: AttendantUpdatePayload) => void;

interface TenantRealtimeContextType {
  broadcastEvent: (event: BroadcastEvent, payload: Record<string, unknown>) => void;
  onRoomStatusChange: (cb: RoomStatusCallback) => () => void;
  onNewMessageActivity: (cb: MessageActivityCallback) => () => void;
  onAttendantUpdate: (cb: AttendantUpdateCallback) => () => void;
}

const TenantRealtimeContext = createContext<TenantRealtimeContextType | undefined>(undefined);

export function TenantRealtimeProvider({ children }: { children: ReactNode }) {
  const { user, tenantId } = useAuth();

  const roomStatusCallbacks = useRef<Set<RoomStatusCallback>>(new Set());
  const messageActivityCallbacks = useRef<Set<MessageActivityCallback>>(new Set());
  const attendantUpdateCallbacks = useRef<Set<AttendantUpdateCallback>>(new Set());

  // Dedup: track last processed event per room to avoid double-processing
  const lastSeenRef = useRef<Map<string, string>>(new Map());

  const shouldProcess = useCallback((roomId: string, updatedAt?: string): boolean => {
    if (!updatedAt) return true;
    const key = `${roomId}`;
    const last = lastSeenRef.current.get(key);
    if (last === updatedAt) return false;
    lastSeenRef.current.set(key, updatedAt);
    // Keep map from growing unbounded
    if (lastSeenRef.current.size > 500) {
      const entries = Array.from(lastSeenRef.current.entries());
      lastSeenRef.current = new Map(entries.slice(-250));
    }
    return true;
  }, []);

  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const broadcastEvent = useCallback((event: BroadcastEvent, payload: Record<string, unknown>) => {
    const ch = broadcastChannelRef.current;
    if (!ch) return;
    ch.send({ type: "broadcast", event, payload }).catch(() => {});
  }, []);

  const onRoomStatusChange = useCallback((cb: RoomStatusCallback) => {
    roomStatusCallbacks.current.add(cb);
    return () => { roomStatusCallbacks.current.delete(cb); };
  }, []);

  const onNewMessageActivity = useCallback((cb: MessageActivityCallback) => {
    messageActivityCallbacks.current.add(cb);
    return () => { messageActivityCallbacks.current.delete(cb); };
  }, []);

  const onAttendantUpdate = useCallback((cb: AttendantUpdateCallback) => {
    attendantUpdateCallbacks.current.add(cb);
    return () => { attendantUpdateCallbacks.current.delete(cb); };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const channelName = tenantId ? `tenant-bc-${tenantId}` : `tenant-bc-global-${user.id}`;

    // ── Broadcast channel (zero DB cost) ──────────────────────────────
    const bcChannel = supabase
      .channel(channelName)
      .on("broadcast", { event: "room_status" }, ({ payload }) => {
        const p = payload as RoomStatusPayload;
        if (!shouldProcess(p.room_id, p.updated_at)) return;
        roomStatusCallbacks.current.forEach(cb => cb(p, "broadcast"));
      })
      .on("broadcast", { event: "new_message_activity" }, ({ payload }) => {
        const p = payload as NewMessageActivityPayload;
        if (!shouldProcess(p.room_id, p.updated_at)) return;
        messageActivityCallbacks.current.forEach(cb => cb(p, "broadcast"));
      })
      .on("broadcast", { event: "attendant_update" }, ({ payload }) => {
        const p = payload as AttendantUpdatePayload;
        attendantUpdateCallbacks.current.forEach(cb => cb(p));
      })
      .subscribe();

    broadcastChannelRef.current = bcChannel;

    // ── Safety net: 1 pg_changes listener for chat_rooms UPDATE ───────
    // Catches server-side mutations (triggers, cron, edge functions)
    const safetyChannel = supabase
      .channel("tenant-safety-net")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_rooms",
          ...(tenantId ? { filter: `tenant_id=eq.${tenantId}` } : {}),
        },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          const old = payload.old as Record<string, unknown>;
          const roomId = updated.id as string;
          const updatedAt = updated.updated_at as string;

          // Room status/metadata changed
          if (shouldProcess(roomId, updatedAt)) {
            const statusPayload: RoomStatusPayload = {
              room_id: roomId,
              status: updated.status as string,
              attendant_id: updated.attendant_id as string | null,
              updated_at: updatedAt,
              resolution_status: updated.resolution_status as string | null,
              priority: updated.priority as string | null,
              closed_at: updated.closed_at as string | null,
              assigned_at: updated.assigned_at as string | null,
              visitor_last_read_at: updated.visitor_last_read_at as string | null,
            };
            roomStatusCallbacks.current.forEach(cb => cb(statusPayload, "pg"));

            // If updated_at changed, also fire message activity (trigger trg_update_room_on_message)
            if (updatedAt !== (old.updated_at as string)) {
              const msgPayload: NewMessageActivityPayload = {
                room_id: roomId,
                updated_at: updatedAt,
              };
              messageActivityCallbacks.current.forEach(cb => cb(msgPayload, "pg"));
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_rooms",
          ...(tenantId ? { filter: `tenant_id=eq.${tenantId}` } : {}),
        },
        (payload) => {
          const newRoom = payload.new as Record<string, unknown>;
          const roomId = newRoom.id as string;
          const statusPayload: RoomStatusPayload = {
            room_id: roomId,
            status: newRoom.status as string,
            attendant_id: newRoom.attendant_id as string | null,
            updated_at: newRoom.updated_at as string,
          };
          roomStatusCallbacks.current.forEach(cb => cb(statusPayload, "pg"));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chat_rooms",
          ...(tenantId ? { filter: `tenant_id=eq.${tenantId}` } : {}),
        },
        (payload) => {
          const old = payload.old as Record<string, unknown>;
          const roomId = old.id as string;
          roomStatusCallbacks.current.forEach(cb =>
            cb({ room_id: roomId, status: "_deleted" }, "pg")
          );
        }
      )
      .subscribe();

    // ── Attendant profiles pg_changes (kept — covers trigger-based updates) ──
    const attendantChannel = supabase
      .channel("tenant-attendants-pg")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendant_profiles",
          ...(tenantId ? { filter: `tenant_id=eq.${tenantId}` } : {}),
        },
        (payload) => {
          const updated = (payload.new ?? payload.old) as Record<string, unknown>;
          if (!updated) return;
          const p: AttendantUpdatePayload = {
            attendant_id: updated.id as string,
            status: updated.status as string | null,
            active_conversations: updated.active_conversations as number,
            display_name: updated.display_name as string,
          };
          attendantUpdateCallbacks.current.forEach(cb => cb(p));
        }
      )
      .subscribe();

    return () => {
      broadcastChannelRef.current = null;
      supabase.removeChannel(bcChannel);
      supabase.removeChannel(safetyChannel);
      supabase.removeChannel(attendantChannel);
    };
  }, [user?.id, tenantId, shouldProcess]);

  return (
    <TenantRealtimeContext.Provider value={{ broadcastEvent, onRoomStatusChange, onNewMessageActivity, onAttendantUpdate }}>
      {children}
    </TenantRealtimeContext.Provider>
  );
}

export function useTenantRealtime(): TenantRealtimeContextType {
  const ctx = useContext(TenantRealtimeContext);
  if (!ctx) throw new Error("useTenantRealtime must be used within TenantRealtimeProvider");
  return ctx;
}
