import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Clock, AlertTriangle, Flame, Search, ArrowUpDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChatRoom {
  id: string;
  status: string;
  priority: string;
  created_at: string;
  started_at: string;
  visitor_id: string;
  attendant_id: string | null;
  visitor_name?: string;
  visitor_email?: string;
  last_message?: string;
  last_message_at?: string;
  last_message_sender_type?: string;
  unread_count?: number;
}

interface ChatRoomListProps {
  rooms: ChatRoom[];
  selectedRoomId: string | null;
  onSelectRoom: (id: string) => void;
  loading: boolean;
}

type SortField = "last_message" | "created_at";
type SortDir = "desc" | "asc";

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return "<1min";
  if (diff < 60) return `${diff}min`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  return `${Math.floor(diff / 1440)}d`;
}

function getWaitingSlaColor(createdAt: string): string {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (minutes < 5) return "bg-green-500";
  if (minutes < 15) return "bg-yellow-500";
  return "bg-red-500";
}

function durationLabel(startedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
  if (diff < 60) return `${diff}min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

function sortRooms(rooms: ChatRoom[], field: SortField, dir: SortDir): ChatRoom[] {
  return [...rooms].sort((a, b) => {
    let dateA: string, dateB: string;
    if (field === "last_message") {
      dateA = a.last_message_at || a.created_at;
      dateB = b.last_message_at || b.created_at;
    } else {
      dateA = a.created_at;
      dateB = b.created_at;
    }
    const cmp = new Date(dateA).getTime() - new Date(dateB).getTime();
    return dir === "desc" ? -cmp : cmp;
  });
}

function RoomItem({ room, selectedRoomId, onSelectRoom }: { room: ChatRoom; selectedRoomId: string | null; onSelectRoom: (id: string) => void }) {
  const unread = room.unread_count ?? 0;
  const isHighPriority = room.priority === "high" || room.priority === "urgent";

  return (
    <button
      key={room.id}
      onClick={() => onSelectRoom(room.id)}
      className={`w-full text-left p-3 rounded-md transition-colors text-sm ${
        selectedRoomId === room.id ? "bg-primary/10 border border-primary/20"
        : unread > 0 ? "bg-accent/50 hover:bg-accent/70"
        : "hover:bg-muted/50"
      } ${isHighPriority ? "border-l-2 border-l-destructive" : ""}`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {isHighPriority && (
            room.priority === "urgent"
              ? <Flame className="h-3 w-3 text-destructive shrink-0" />
              : <AlertTriangle className="h-3 w-3 text-orange-500 shrink-0" />
          )}
          <span className={`font-medium text-xs flex-1 min-w-0 truncate ${unread > 0 ? "font-bold" : ""}`}>
            {room.visitor_name || `#${room.id.slice(0, 8)}`}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {unread > 0 && (
          <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
          <Badge variant={room.status === "active" ? "default" : room.status === "waiting" ? "secondary" : "outline"} className="text-[10px] gap-1 shrink-0">
            {room.status === "waiting" && <span className={`h-1.5 w-1.5 rounded-full ${getWaitingSlaColor(room.created_at)}`} />}
            {room.status === "waiting" ? <Clock className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
            {room.status}
          </Badge>
        </div>
      </div>
      {room.last_message && (
        <p className={`text-xs text-muted-foreground truncate ${unread > 0 ? "font-medium text-foreground" : ""}`}>
          {room.last_message_sender_type && room.last_message_sender_type !== "visitor" ? "Você: " : ""}
          {room.last_message.slice(0, 60)}{room.last_message.length > 60 ? "..." : ""}
        </p>
      )}
      <div className="flex items-center justify-between mt-1">
        <p className="text-[10px] text-muted-foreground">
          {room.last_message_at ? timeAgo(room.last_message_at) : timeAgo(room.created_at)}
        </p>
        {room.status === "active" && room.started_at && (
          <p className="text-[10px] text-muted-foreground">⏱ {durationLabel(room.started_at)}</p>
        )}
      </div>
    </button>
  );
}

export function ChatRoomList({ rooms, selectedRoomId, onSelectRoom, loading }: ChatRoomListProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("last_message");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  if (loading) {
    return (
      <div className="glass-card h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  const filtered = search
    ? rooms.filter((r) => {
        const q = search.toLowerCase();
        return (r.visitor_name ?? "").toLowerCase().includes(q) ||
          (r.visitor_email ?? "").toLowerCase().includes(q) ||
          (r.last_message ?? "").toLowerCase().includes(q);
      })
    : rooms;

  const waitingRooms = sortRooms(filtered.filter((r) => r.status === "waiting"), sortField, sortDir);
  const activeRooms = sortRooms(filtered.filter((r) => r.status === "active"), sortField, sortDir);

  const sortValue = `${sortField}-${sortDir}`;
  const handleSortChange = (val: string) => {
    const [f, d] = val.split("-") as [SortField, SortDir];
    setSortField(f);
    setSortDir(d);
  };

  return (
    <div className="glass-card h-full flex flex-col min-w-0 overflow-hidden">
      <div className="p-3 border-b border-border space-y-2">
        <div>
          <h3 className="font-semibold text-sm">{t("chat.workspace.conversations")}</h3>
          <p className="text-xs text-muted-foreground">{rooms.length} {t("chat.workspace.total")}</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, email ou mensagem..." className="h-8 text-xs pl-8" />
        </div>
        <Select value={sortValue} onValueChange={handleSortChange}>
          <SelectTrigger className="h-7 text-[10px]">
            <ArrowUpDown className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_message-desc" className="text-xs">Última msg (recente)</SelectItem>
            <SelectItem value="last_message-asc" className="text-xs">Última msg (antiga)</SelectItem>
            <SelectItem value="created_at-desc" className="text-xs">Abertura (recente)</SelectItem>
            <SelectItem value="created_at-asc" className="text-xs">Abertura (antiga)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("chat.workspace.no_conversations")}</p>
          ) : (
            <>
              {waitingRooms.length > 0 && (
                <>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-3 py-1">
                    Na Fila ({waitingRooms.length})
                  </p>
                  {waitingRooms.map((room) => (
                    <RoomItem key={room.id} room={room} selectedRoomId={selectedRoomId} onSelectRoom={onSelectRoom} />
                  ))}
                </>
              )}
              {activeRooms.length > 0 && (
                <>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-3 py-1 mt-2">
                    Ativas ({activeRooms.length})
                  </p>
                  {activeRooms.map((room) => (
                    <RoomItem key={room.id} room={room} selectedRoomId={selectedRoomId} onSelectRoom={onSelectRoom} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
