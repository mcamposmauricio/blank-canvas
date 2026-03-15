import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PendingRoom {
  id: string;
  visitor_id: string;
  visitor_name: string;
  closed_at: string | null;
  last_message: string | null;
}

interface PendingRoomsListProps {
  attendantId: string | null;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
}

export function PendingRoomsList({ attendantId, selectedRoomId, onSelectRoom }: PendingRoomsListProps) {
  const [rooms, setRooms] = useState<PendingRoom[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPendingRooms = useCallback(async () => {
    if (!attendantId) return;

    const { data } = await supabase
      .from("chat_rooms")
      .select("id, visitor_id, closed_at, chat_visitors!visitor_id(name)")
      .eq("status", "closed")
      .eq("resolution_status", "pending")
      .eq("attendant_id", attendantId)
      .order("closed_at", { ascending: false });

    if (!data) { setRooms([]); return; }

    const roomIds = data.map((r: any) => r.id);
    let lastMessages: Record<string, string> = {};

    if (roomIds.length > 0) {
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("room_id, content, created_at")
        .in("room_id", roomIds)
        .eq("is_internal", false)
        .order("created_at", { ascending: false });

      if (msgs) {
        const seen = new Set<string>();
        for (const m of msgs as { room_id: string; content: string }[]) {
          if (!seen.has(m.room_id)) {
            seen.add(m.room_id);
            lastMessages[m.room_id] = m.content;
          }
        }
      }
    }

    setRooms(data.map((r: any) => ({
      id: r.id,
      visitor_id: r.visitor_id,
      visitor_name: r.chat_visitors?.name ?? "Visitante",
      closed_at: r.closed_at,
      last_message: lastMessages[r.id] ?? null,
    })));
  }, [attendantId]);

  useEffect(() => {
    fetchPendingRooms();
    if (!attendantId) return;

    const channel = supabase
      .channel("pending-rooms-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_rooms" },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(fetchPendingRooms, 3000);
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [attendantId, fetchPendingRooms]);

  if (rooms.length === 0) return null;

  return (
    <div className="px-1 mb-2">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-sm">
          <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
          <AlertCircle className="h-3.5 w-3.5 text-warning" />
          <span className="font-medium text-xs text-muted-foreground">Com Pendência</span>
          <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0 h-4 min-w-[18px] justify-center">
            {rooms.length}
          </Badge>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-1 space-y-0.5">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              className={`w-full text-left px-2 py-2 rounded-md text-xs transition-colors ${
                selectedRoomId === room.id
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium truncate">{room.visitor_name}</span>
                {room.closed_at && (
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {formatDistanceToNow(new Date(room.closed_at), { addSuffix: true, locale: ptBR })}
                  </span>
                )}
              </div>
              {room.last_message && (
                <p className="text-muted-foreground truncate mt-0.5">{room.last_message.slice(0, 60)}</p>
              )}
            </button>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
