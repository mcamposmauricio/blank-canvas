import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantRealtime, type RoomStatusPayload, type NewMessageActivityPayload } from "@/contexts/TenantRealtimeContext";

interface ChatMessage {
  id: string;
  room_id: string;
  sender_type: string;
  sender_id: string | null;
  sender_name: string | null;
  content: string;
  message_type: string;
  is_internal: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ChatRoom {
  id: string;
  owner_user_id: string;
  visitor_id: string;
  attendant_id: string | null;
  contact_id: string | null;
  company_contact_id: string | null;
  status: string;
  priority: string;
  started_at: string;
  assigned_at: string | null;
  closed_at: string | null;
  csat_score: number | null;
  csat_comment: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  visitor_name?: string;
  visitor_email?: string;
  last_message?: string;
  last_message_at?: string;
  last_message_sender_type?: string;
  unread_count?: number;
}

interface AttendantQueue {
  id: string;
  user_id: string;
  display_name: string;
  status: string;
  max_conversations: number;
  active_count: number;
  waiting_count: number;
}

interface UnassignedRoom {
  id: string;
  visitor_name: string;
  created_at: string;
  status: string;
}

const SORT_ROOMS = (a: ChatRoom, b: ChatRoom) => {
  const aU = a.unread_count ?? 0;
  const bU = b.unread_count ?? 0;
  if (aU > 0 && bU === 0) return -1;
  if (aU === 0 && bU > 0) return 1;
  const aTime = a.last_message_at || a.created_at;
  const bTime = b.last_message_at || b.created_at;
  return new Date(bTime).getTime() - new Date(aTime).getTime();
};

const WORKSPACE_PAGE_SIZE = 50;

export function useChatMessages(roomId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchMessages = useCallback(async (before?: string) => {
    if (!roomId) return;
    if (!before) setLoading(true);
    else setLoadingMore(true);

    let query = supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(WORKSPACE_PAGE_SIZE + 1);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data } = await query;
    const items = ((data as ChatMessage[]) ?? []);
    const moreAvailable = items.length > WORKSPACE_PAGE_SIZE;
    if (moreAvailable) items.pop();
    items.reverse();

    if (before) {
      setMessages((prev) => [...items, ...prev]);
    } else {
      setMessages(items);
    }
    setHasMore(moreAvailable);
    if (!before) setLoading(false);
    else setLoadingMore(false);
  }, [roomId]);

  const loadMore = useCallback(async () => {
    if (messages.length === 0 || loadingMore || !roomId) return;
    await fetchMessages(messages[0].created_at);
  }, [messages, loadingMore, roomId, fetchMessages]);

  useEffect(() => {
    // Clear messages immediately when switching rooms to prevent flash
    setMessages([]);
    setHasMore(false);
    fetchMessages();

    if (!roomId) return;

    const channelSuffix = Math.random().toString(36).slice(2, 8);
    const channel = supabase
      .channel(`chat-messages-${roomId}-${channelSuffix}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      // UPDATE listener removed for performance — soft-deletes handled on room switch refetch
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchMessages]);

  return { messages, loading, hasMore, loadingMore, loadMore, refetch: fetchMessages };
}

export function useChatRooms(ownerUserId: string | null, options?: { excludeClosed?: boolean; soundEnabled?: boolean; tenantId?: string | null }) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const selectedRoomIdRef = useRef<string | null>(null);
  const initialLoadDone = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;

  const { onRoomStatusChange, onNewMessageActivity } = useTenantRealtime();

  const fetchSingleRoom = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from("chat_rooms")
      .select("*, chat_visitors!visitor_id(name, email)")
      .eq("id", roomId)
      .maybeSingle();

    if (!data) return;

    const visitor = (data as Record<string, unknown>).chat_visitors as { name?: string; email?: string } | null;
    const enriched: ChatRoom = {
      ...(data as unknown as ChatRoom),
      visitor_name: visitor?.name ?? undefined,
      visitor_email: visitor?.email ?? undefined,
      unread_count: 0,
    };

    setRooms((prev) => {
      const filtered = prev.filter((r) => r.id !== roomId);
      return [enriched, ...filtered].sort(SORT_ROOMS);
    });
  }, []);

  const fetchRooms = useCallback(
    async (showLoading = false) => {
      if (!ownerUserId) return;
      if (showLoading && !initialLoadDone.current) setLoading(true);

      let query = supabase
        .from("chat_rooms")
        .select("*, chat_visitors!visitor_id(name, email)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (optionsRef.current?.excludeClosed) {
        query = query.in("status", ["active", "waiting"]);
      }

      const { data } = await query;

      if (!data) {
        if (showLoading) setLoading(false);
        setRooms([]);
        return;
      }

      const roomIds = data.map((r: Record<string, unknown>) => (r as { id: string }).id);
      let lastMessages: Record<string, { content: string; created_at: string; sender_type: string }> = {};
      let unreadCounts: Record<string, number> = {};

      if (roomIds.length > 0) {
        const { data: msgs } = await supabase.rpc("get_last_messages_for_rooms", {
          p_room_ids: roomIds,
        });

        if (msgs) {
          for (const m of msgs as { room_id: string; content: string; sender_type: string; created_at: string }[]) {
            lastMessages[m.room_id] = { content: m.content, created_at: m.created_at ?? "", sender_type: m.sender_type };
          }
        }

        const { data: reads } = await supabase
          .from("chat_room_reads")
          .select("room_id, last_read_at")
          .eq("user_id", ownerUserId)
          .in("room_id", roomIds);

        const readMap: Record<string, string> = {};
        if (reads) {
          for (const r of reads as { room_id: string; last_read_at: string }[]) {
            readMap[r.room_id] = r.last_read_at;
          }
        }

        const oldestReadAt =
          Object.values(readMap).length > 0
            ? Object.values(readMap).reduce((a, b) => (a < b ? a : b))
            : "1970-01-01T00:00:00Z";

        const { data: unreadMsgs } = await supabase
          .from("chat_messages")
          .select("room_id, created_at")
          .in("room_id", roomIds)
          .eq("sender_type", "visitor")
          .eq("is_internal", false)
          .gt("created_at", oldestReadAt);

        for (const msg of (unreadMsgs ?? []) as { room_id: string; created_at: string }[]) {
          const lastRead = readMap[msg.room_id] || "1970-01-01T00:00:00Z";
          if (msg.created_at > lastRead) {
            unreadCounts[msg.room_id] = (unreadCounts[msg.room_id] ?? 0) + 1;
          }
        }
      }

      const enrichedRooms: ChatRoom[] = data.map((r: Record<string, unknown>) => {
        const visitor = r.chat_visitors as { name?: string; email?: string } | null;
        const roomId = r.id as string;
        const lm = lastMessages[roomId];
        return {
          ...r,
          visitor_name: visitor?.name ?? undefined,
          visitor_email: visitor?.email ?? undefined,
          last_message: lm?.content,
          last_message_at: lm?.created_at,
          last_message_sender_type: lm?.sender_type,
          unread_count: unreadCounts[roomId] ?? 0,
        } as ChatRoom;
      });

      setRooms(enrichedRooms.sort(SORT_ROOMS));
      initialLoadDone.current = true;
      if (showLoading) setLoading(false);
    },
    [ownerUserId]
  );

  // ── Subscribe to TenantRealtime events instead of pg_changes ─────────
  useEffect(() => {
    fetchRooms(true);
    if (!ownerUserId) return;

    // Handle room status changes (INSERT, UPDATE, DELETE via safety net + broadcasts)
    const unsubStatus = onRoomStatusChange((payload: RoomStatusPayload) => {
      const roomId = payload.room_id;

      // DELETE
      if (payload.status === "_deleted") {
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
        return;
      }

      // If excludeClosed and status is closed, remove from list
      if (optionsRef.current?.excludeClosed && payload.status === "closed") {
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
        return;
      }

      setRooms((prev) => {
        const idx = prev.findIndex((r) => r.id === roomId);
        if (idx === -1) {
          // New room — fetch full data
          fetchSingleRoom(roomId);
          return prev;
        }

        const patched = [...prev];
        patched[idx] = {
          ...patched[idx],
          status: payload.status ?? patched[idx].status,
          attendant_id: payload.attendant_id !== undefined ? payload.attendant_id : patched[idx].attendant_id,
          priority: (payload.priority ?? patched[idx].priority) as string,
          assigned_at: payload.assigned_at ?? patched[idx].assigned_at,
          closed_at: payload.closed_at ?? patched[idx].closed_at,
          updated_at: payload.updated_at ?? patched[idx].updated_at,
        };
        return patched;
      });
    });

    // Handle message activity (fetch last message, sound, notification)
    const unsubMsg = onNewMessageActivity((payload: NewMessageActivityPayload) => {
      const roomId = payload.room_id;

      supabase
        .from("chat_messages")
        .select("content, sender_type, is_internal, sender_name, created_at, room_id")
        .eq("room_id", roomId)
        .eq("is_internal", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .then(({ data: msgs }) => {
          if (!msgs || msgs.length === 0) return;
          const msg = msgs[0];

          // Sound notification for visitor messages on non-selected rooms
          if (msg.sender_type === "visitor" && msg.room_id !== selectedRoomIdRef.current) {
            if (optionsRef.current?.soundEnabled !== false) {
              try {
                const audio = new Audio(
                  "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczGjlqj8Lb1LRiQhY0YYa95+3UdFQmLFl7p+Xj2p6MiWpXdZqXh3FxOBImWVhzl5KCcHM1EjhWX3eVkYBxcjURO1hdepCSfm5pJytRVnqNjoFyey8lRE55lYd5ciwnNk55ioJ3ay0vQU94jXlwYSAyREhqfG9eLjAqI0E="
                );
                audio.volume = 0.3;
                audio.play().catch(() => {});
              } catch {}
            }

            if (document.hidden && "Notification" in window && Notification.permission === "granted") {
              const room = roomsRef.current.find((r) => r.id === msg.room_id);
              const visitorName = room?.visitor_name || msg.sender_name || "Visitante";
              new Notification(`Nova mensagem de ${visitorName}`, {
                body: msg.content.slice(0, 100),
                icon: "/logo-icon-dark.svg",
                tag: `chat-${msg.room_id}`,
              });
            }
          }

          // Update room in list
          setRooms((prev) => {
            const idx = prev.findIndex((r) => r.id === msg.room_id);
            if (idx === -1) return prev;

            const patched = [...prev];
            const room = { ...patched[idx] };

            room.last_message = msg.content;
            room.last_message_at = msg.created_at;
            room.last_message_sender_type = msg.sender_type;

            if (
              msg.sender_type === "visitor" &&
              msg.room_id !== selectedRoomIdRef.current
            ) {
              room.unread_count = (room.unread_count ?? 0) + 1;
            }

            patched[idx] = room;
            return [...patched].sort(SORT_ROOMS);
          });
        });
    });

    return () => {
      unsubStatus();
      unsubMsg();
    };
  }, [ownerUserId, fetchRooms, fetchSingleRoom, onRoomStatusChange, onNewMessageActivity]);

  const markRoomAsRead = useCallback(
    async (roomId: string) => {
      if (!ownerUserId) return;
      selectedRoomIdRef.current = roomId;

      await supabase
        .from("chat_room_reads")
        .upsert(
          { room_id: roomId, user_id: ownerUserId, last_read_at: new Date().toISOString() },
          { onConflict: "room_id,user_id" }
        );

      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, unread_count: 0 } : r))
      );
    },
    [ownerUserId]
  );

  const setSelectedRoomRef = useCallback((roomId: string | null) => {
    selectedRoomIdRef.current = roomId;
  }, []);

  return { rooms, loading, refetch: fetchRooms, markRoomAsRead, setSelectedRoomRef };
}

export function useAttendantQueues(tenantId?: string | null) {
  const [attendants, setAttendants] = useState<AttendantQueue[]>([]);
  const [unassignedRooms, setUnassignedRooms] = useState<UnassignedRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const { onAttendantUpdate } = useTenantRealtime();

  const fetchQueues = useCallback(async () => {
    const { data: profiles } = await supabase
      .from("attendant_profiles")
      .select("id, user_id, display_name, status, max_conversations, active_conversations");

    const { data: unassignedData } = await supabase
      .from("chat_rooms")
      .select("id, attendant_id, status, visitor_id, created_at, chat_visitors!visitor_id(name)")
      .in("status", ["active", "waiting"])
      .is("attendant_id", null);

    const { data: waitingData } = await supabase
      .from("chat_rooms")
      .select("attendant_id")
      .eq("status", "waiting")
      .not("attendant_id", "is", null);

    const waitingByAttendant: Record<string, number> = {};
    for (const room of (waitingData ?? []) as { attendant_id: string }[]) {
      waitingByAttendant[room.attendant_id] = (waitingByAttendant[room.attendant_id] ?? 0) + 1;
    }

    const unassigned: UnassignedRoom[] = ((unassignedData ?? []) as Array<{
      id: string;
      attendant_id: string | null;
      status: string;
      visitor_id: string;
      created_at: string;
      chat_visitors: { name: string } | null;
    }>).map(room => ({
      id: room.id,
      visitor_name: room.chat_visitors?.name ?? "Visitante",
      created_at: room.created_at,
      status: room.status,
    }));

    const enrichedAttendants: AttendantQueue[] = (profiles ?? []).map((p) => ({
      id: p.id,
      user_id: p.user_id,
      display_name: p.display_name,
      status: p.status ?? "offline",
      max_conversations: p.max_conversations ?? 5,
      active_count: p.active_conversations ?? 0,
      waiting_count: waitingByAttendant[p.id] ?? 0,
    }));

    setAttendants(enrichedAttendants);
    setUnassignedRooms(unassigned);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQueues();

    // Polling fallback every 10s instead of pg_changes channel
    const interval = setInterval(fetchQueues, 10000);

    // Also listen for attendant updates via broadcast for immediate refresh
    const unsub = onAttendantUpdate(() => {
      fetchQueues();
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [fetchQueues, onAttendantUpdate]);

  return { attendants, unassignedRooms, loading, refetch: fetchQueues };
}
