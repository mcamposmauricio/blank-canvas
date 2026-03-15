import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

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

    const channel = supabase
      .channel(`chat-messages-${roomId}`)
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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchMessages]);

  return { messages, loading, hasMore, loadingMore, loadMore, refetch: fetchMessages };
}

export function useChatRooms(ownerUserId: string | null, options?: { excludeClosed?: boolean; soundEnabled?: boolean }) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const selectedRoomIdRef = useRef<string | null>(null);
  const initialLoadDone = useRef(false);
  // Capture options in a ref so callbacks always have fresh values
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // ─── fetchSingleRoom: mini-fetch sem loading, para novos rooms ────────────
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
      const filtered = prev.filter((r) => r.id !== roomId); // deduplicar
      return [enriched, ...filtered].sort(SORT_ROOMS);
    });
  }, []);

  // ─── fetchRooms: loading=true APENAS no primeiro load ────────────────────
  const fetchRooms = useCallback(
    async (showLoading = false) => {
      if (!ownerUserId) return;
      // Only show loading spinner on the very first load — never again
      if (showLoading && !initialLoadDone.current) setLoading(true);

      let query = supabase
        .from("chat_rooms")
        .select("*, chat_visitors!visitor_id(name, email)")
        .order("created_at", { ascending: false });

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
        // Fetch last message per room (single query)
        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("room_id, content, created_at, sender_type")
          .in("room_id", roomIds)
          .eq("is_internal", false)
          .order("created_at", { ascending: false });

        if (msgs) {
          const seen = new Set<string>();
          for (const m of msgs as { room_id: string; content: string; created_at: string; sender_type: string }[]) {
            if (!seen.has(m.room_id)) {
              seen.add(m.room_id);
              lastMessages[m.room_id] = { content: m.content, created_at: m.created_at, sender_type: m.sender_type };
            }
          }
        }

        // Fetch read timestamps
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

        // ── Otimização: 1 query única para todos os unreads (em vez de N queries) ──
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

  useEffect(() => {
    // Apenas o primeiro fetch mostra o spinner
    fetchRooms(true);

    if (!ownerUserId) return;

    // ── Canal: chat_rooms — patches individuais por evento ─────────────────
    const roomsChannel = supabase
      .channel("chat-rooms-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_rooms" },
        (payload) => {
          const newRoom = payload.new as ChatRoom;
          // Se excludeClosed e o room entrou como closed, ignorar
          if (optionsRef.current?.excludeClosed && newRoom.status === "closed") return;
          fetchSingleRoom(newRoom.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_rooms" },
        (payload) => {
          const updated = payload.new as ChatRoom;

          setRooms((prev) => {
            const idx = prev.findIndex((r) => r.id === updated.id);

            // Room passou para closed com excludeClosed=true → remover
            if (optionsRef.current?.excludeClosed && updated.status === "closed") {
              return prev.filter((r) => r.id !== updated.id);
            }

            if (idx === -1) {
              // Room não estava na lista mas agora é active/waiting → adicionar
              fetchSingleRoom(updated.id);
              return prev;
            }

            // Patch cirúrgico: preservar campos enriquecidos, atualizar campos do banco
            const patched = [...prev];
            patched[idx] = {
              ...patched[idx],
              status: updated.status,
              attendant_id: updated.attendant_id,
              priority: updated.priority,
              assigned_at: updated.assigned_at,
              closed_at: updated.closed_at,
              updated_at: updated.updated_at,
              // Preservar campos calculados localmente:
              visitor_name: patched[idx].visitor_name,
              visitor_email: patched[idx].visitor_email,
              last_message: patched[idx].last_message,
              last_message_at: patched[idx].last_message_at,
              last_message_sender_type: patched[idx].last_message_sender_type,
              unread_count: patched[idx].unread_count,
            };
            return patched;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_rooms" },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setRooms((prev) => prev.filter((r) => r.id !== deletedId));
        }
      )
      .subscribe();

    // ── Canal: chat_messages — patch cirúrgico sem fetchRooms ──────────────
    const msgChannel = supabase
      .channel("chat-messages-notification")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const msg = payload.new as ChatMessage;

          // Som de notificação apenas para mensagens do visitante em rooms não selecionados
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

            // Browser notification when tab is not focused
            if (document.hidden && "Notification" in window && Notification.permission === "granted") {
              const room = rooms.find((r) => r.id === msg.room_id);
              const visitorName = room?.visitor_name || msg.sender_name || "Visitante";
              new Notification(`Nova mensagem de ${visitorName}`, {
                body: msg.content.slice(0, 100),
                icon: "/logo-icon-dark.svg",
                tag: `chat-${msg.room_id}`,
              });
            }
          }

          // ── Atualização cirúrgica do estado — SEM fetchRooms, SEM loading ──
          setRooms((prev) => {
            const idx = prev.findIndex((r) => r.id === msg.room_id);
            if (idx === -1) return prev; // room não está na lista

            const patched = [...prev];
            const room = { ...patched[idx] };

            // Atualizar last_message para qualquer mensagem não-interna
            if (!msg.is_internal) {
              room.last_message = msg.content;
              room.last_message_at = msg.created_at;
              room.last_message_sender_type = msg.sender_type;
            }

            // Incrementar unread APENAS para mensagens do visitante
            // Mensagens do atendente (sender_type="attendant") ou sistema NUNCA incrementam
            if (
              msg.sender_type === "visitor" &&
              !msg.is_internal &&
              msg.room_id !== selectedRoomIdRef.current
            ) {
              room.unread_count = (room.unread_count ?? 0) + 1;
            }

            patched[idx] = room;
            return [...patched].sort(SORT_ROOMS);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [ownerUserId, fetchRooms, fetchSingleRoom]);

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

      // Zerar unread localmente sem refetch
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

export function useAttendantQueues() {
  const [attendants, setAttendants] = useState<AttendantQueue[]>([]);
  const [unassignedRooms, setUnassignedRooms] = useState<UnassignedRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchQueues = useCallback(async () => {
    // Use active_conversations from attendant_profiles instead of counting rooms
    const { data: profiles } = await supabase
      .from("attendant_profiles")
      .select("id, user_id, display_name, status, max_conversations, active_conversations");

    // Only fetch unassigned + waiting rooms (lighter query — no need for ALL rooms)
    const { data: unassignedData } = await supabase
      .from("chat_rooms")
      .select("id, attendant_id, status, visitor_id, created_at, chat_visitors!visitor_id(name)")
      .in("status", ["active", "waiting"])
      .is("attendant_id", null);

    // Fetch waiting counts per attendant (only waiting rooms with an attendant)
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

    // Debounced realtime: batch rapid changes with 3s debounce
    const debouncedFetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchQueues();
      }, 3000);
    };

    const channel = supabase
      .channel("attendant-queues-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_rooms" },
        debouncedFetch
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendant_profiles" },
        debouncedFetch
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [fetchQueues]);

  return { attendants, unassignedRooms, loading, refetch: fetchQueues };
}
