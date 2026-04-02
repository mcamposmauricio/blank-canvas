import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenantRealtime } from "@/contexts/TenantRealtimeContext";
import { useChatMessages, useChatRooms } from "@/hooks/useChatRealtime";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChatRoomList } from "@/components/chat/ChatRoomList";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatInput, clearDraft } from "@/components/chat/ChatInput";
import { CloseRoomDialog } from "@/components/chat/CloseRoomDialog";
import { ReassignDialog } from "@/components/chat/ReassignDialog";
import { PendingRoomsList } from "@/components/chat/PendingRoomsList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, X, ArrowRightLeft, MessageSquare, LogOut, MoreHorizontal,
  RotateCcw, CheckCircle2, Loader2,
} from "lucide-react";

type LiteView = "list" | "chat";

interface ReplyTarget { id: string; content: string; sender_name: string | null; }

function durationLabel(startedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
  if (diff < 60) return `${diff}min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

const AttendantLite = () => {
  const navigate = useNavigate();
  const { user, tenantId, hasPermission, userDataLoading } = useAuth();
  const { broadcastEvent, onRoomStatusChange } = useTenantRealtime();

  const [userAttendantId, setUserAttendantId] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [attendantStatus, setAttendantStatus] = useState<string>("offline");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [view, setView] = useState<LiteView>("list");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closingRoomId, setClosingRoomId] = useState<string | null>(null);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [pendingRefreshTrigger, setPendingRefreshTrigger] = useState(0);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [visitorLastReadAt, setVisitorLastReadAt] = useState<string | null>(null);

  // Pending room state (for rooms not in active list)
  const [pendingSelectedRoom, setPendingSelectedRoom] = useState<{
    id: string; visitor_name: string; visitor_id: string; status: string;
    resolution_status: string; attendant_id: string | null; contact_id: string | null;
    company_contact_id: string | null; started_at: string | null;
  } | null>(null);
  const lastEffectiveRoomRef = useRef<any>(null);

  const { rooms, loading: roomsLoading, markRoomAsRead, setSelectedRoomRef } = useChatRooms(user?.id ?? null, { excludeClosed: true, soundEnabled, tenantId });
  const { messages, loading: messagesLoading, hasMore, loadingMore, loadMore } = useChatMessages(selectedRoomId);

  // Fetch attendant profile
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("attendant_profiles")
        .select("id, display_name, sound_enabled, status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile) {
        setUserAttendantId(profile.id);
        setUserDisplayName(profile.display_name);
        setSoundEnabled(profile.sound_enabled !== false);
        setAttendantStatus(profile.status ?? "offline");
      }
    })();
  }, [user]);

  // Realtime room status changes
  useEffect(() => {
    const unsub = onRoomStatusChange(() => setPendingRefreshTrigger((p) => p + 1));
    return unsub;
  }, [onRoomStatusChange]);

  // Typing indicator
  useEffect(() => {
    if (!selectedRoomId) { setTypingUser(null); setVisitorLastReadAt(null); return; }
    setTypingUser(null);
    supabase.from("chat_rooms").select("visitor_last_read_at").eq("id", selectedRoomId).maybeSingle().then(({ data }) => {
      if (data) setVisitorLastReadAt((data as any).visitor_last_read_at ?? null);
    });
    const channel = supabase
      .channel(`typing-lite-${selectedRoomId}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        const name = payload.payload?.name;
        if (name && payload.payload?.user_id !== user?.id) {
          setTypingUser(name);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
        }
      })
      .subscribe();
    const roomChannel = supabase
      .channel(`lite-room-read-${selectedRoomId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_rooms", filter: `id=eq.${selectedRoomId}` }, (payload) => {
        const room = payload.new as any;
        if (room.visitor_last_read_at) setVisitorLastReadAt(room.visitor_last_read_at);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); supabase.removeChannel(roomChannel); };
  }, [selectedRoomId, user?.id]);

  useEffect(() => { setSelectedRoomRef(selectedRoomId); }, [selectedRoomId, setSelectedRoomRef]);

  // Filter rooms to only show my conversations
  const filteredRooms = rooms.filter((r) => r.attendant_id === userAttendantId);
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  const rawEffectiveRoom = selectedRoom ?? pendingSelectedRoom;
  if (rawEffectiveRoom) lastEffectiveRoomRef.current = rawEffectiveRoom;
  const effectiveRoom = rawEffectiveRoom ?? lastEffectiveRoomRef.current;
  const isPendingRoom = effectiveRoom?.status === "closed" && (effectiveRoom as any)?.resolution_status === "pending";

  // Status toggle
  const toggleStatus = async () => {
    if (!userAttendantId) return;
    const next = attendantStatus === "online" ? "away" : attendantStatus === "away" ? "offline" : "online";
    await supabase.from("attendant_profiles").update({ status: next }).eq("id", userAttendantId);
    setAttendantStatus(next);
  };

  const statusColor = attendantStatus === "online" ? "bg-green-500" : attendantStatus === "away" ? "bg-amber-500" : "bg-gray-400";
  const statusLabel = attendantStatus === "online" ? "Online" : attendantStatus === "away" ? "Ausente" : "Offline";

  // Handlers (same logic as AdminWorkspace)
  const handleSelectRoom = (id: string) => {
    lastEffectiveRoomRef.current = null;
    setPendingSelectedRoom(null);
    setSelectedRoomId(id);
    markRoomAsRead(id);
    setReplyTarget(null);
    setView("chat");
    supabase.from("chat_rooms").update({ attendant_last_read_at: new Date().toISOString() }).eq("id", id).then(() => {});
  };

  const handleSelectPendingRoom = async (roomId: string) => {
    lastEffectiveRoomRef.current = null;
    setPendingSelectedRoom(null);
    setSelectedRoomId(roomId);
    setReplyTarget(null);
    const { data } = await supabase
      .from("chat_rooms")
      .select("id, visitor_id, status, resolution_status, attendant_id, contact_id, company_contact_id, started_at, chat_visitors!visitor_id(name)")
      .eq("id", roomId)
      .maybeSingle();
    if (data) {
      const visitor = (data as any).chat_visitors as { name?: string } | null;
      setPendingSelectedRoom({
        id: data.id, visitor_name: visitor?.name ?? "Visitante", visitor_id: data.visitor_id,
        status: data.status ?? "closed", resolution_status: data.resolution_status ?? "pending",
        attendant_id: data.attendant_id, contact_id: data.contact_id, company_contact_id: data.company_contact_id,
        started_at: data.started_at,
      });
    }
    setView("chat");
  };

  const handleReopenRoom = async () => {
    if (!selectedRoomId || !user) return;
    await supabase.from("chat_rooms").update({
      status: "active", resolution_status: null, closed_at: null,
      assigned_at: new Date().toISOString(), attendant_id: userAttendantId,
    }).eq("id", selectedRoomId);
    await supabase.from("chat_messages").insert({
      room_id: selectedRoomId, sender_type: "system", sender_name: "Sistema",
      content: "[Sistema] Conversa reaberta pelo atendente", is_internal: false,
      metadata: { auto_rule: "chain_reset" },
    });
    supabase.functions.invoke("assign-chat-room", { body: { room_id: selectedRoomId } }).catch(() => {});
    broadcastEvent("room_status", { room_id: selectedRoomId, status: "active", attendant_id: userAttendantId, updated_at: new Date().toISOString() });
    setPendingSelectedRoom(null);
    toast.success("Conversa reaberta!");
  };

  const handleMarkResolved = async () => {
    if (!selectedRoomId) return;
    await supabase.from("chat_rooms").update({ resolution_status: "resolved" }).eq("id", selectedRoomId);
    broadcastEvent("room_status", { room_id: selectedRoomId, resolution_status: "resolved", updated_at: new Date().toISOString() });
    setPendingSelectedRoom(null);
    setSelectedRoomId(null);
    setView("list");
    toast.success("Marcado como resolvido!");
  };

  const handleRequestClose = (roomId: string) => {
    setClosingRoomId(roomId);
    setCloseDialogOpen(true);
  };

  const handleConfirmClose = async (resolutionStatus: "resolved" | "pending" | "inactive" | "archived", note?: string) => {
    if (!closingRoomId || !user) return;
    if (note) {
      await supabase.from("chat_messages").insert({
        room_id: closingRoomId, sender_type: "attendant", sender_id: user.id,
        sender_name: userDisplayName || user.email?.split("@")[0] || "Atendente",
        content: `[Encerramento] ${note}`, is_internal: true,
      });
    }
    await supabase.from("chat_rooms").update({
      status: "closed", resolution_status: resolutionStatus, closed_at: new Date().toISOString(),
    }).eq("id", closingRoomId);
    broadcastEvent("room_status", { room_id: closingRoomId, status: "closed", resolution_status: resolutionStatus, closed_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    clearDraft(closingRoomId);
    setClosingRoomId(null);
    const msgs: Record<string, string> = { resolved: "Conversa encerrada como resolvida", pending: "Conversa encerrada com pendência", inactive: "Conversa inativada", archived: "Conversa arquivada" };
    toast.success(msgs[resolutionStatus] ?? "Conversa encerrada");
  };

  const handleReassign = async (attendantId: string, attendantName: string) => {
    if (!selectedRoomId || !user) return;
    const isWaiting = selectedRoom?.status === "waiting";
    await supabase.from("chat_rooms").update({
      attendant_id: attendantId, assigned_at: new Date().toISOString(),
      ...(isWaiting ? { status: "active" } : {}),
    }).eq("id", selectedRoomId);
    await supabase.from("chat_messages").insert({
      room_id: selectedRoomId, sender_type: "system", sender_name: "Sistema",
      content: `[Sistema] Chat transferido para ${attendantName}`, is_internal: true,
    });
    broadcastEvent("room_status", { room_id: selectedRoomId, status: isWaiting ? "active" : selectedRoom?.status, attendant_id: attendantId, updated_at: new Date().toISOString() });
    toast.success(`Conversa transferida para ${attendantName}`);
  };

  const handleReply = useCallback((msg: { id: string; content: string; sender_name: string | null }) => {
    setReplyTarget({ id: msg.id, content: msg.content, sender_name: msg.sender_name });
  }, []);

  const handleDeleteMessage = useCallback(async (msgId: string) => {
    const { error } = await supabase.from("chat_messages").update({ deleted_at: new Date().toISOString() } as any).eq("id", msgId);
    if (error) toast.error("Erro ao apagar mensagem");
    else toast.success("Mensagem apagada");
  }, []);

  const handleSendMessage = async (content: string, isInternal = false, metadata?: Record<string, any>, messageType?: string) => {
    if (!selectedRoomId || !user) return;
    let finalContent = content;
    if (replyTarget && !isInternal) {
      const quotedLines = replyTarget.content.split("\n").map((l) => `> ${l}`).join("\n");
      finalContent = `${quotedLines}\n\n${content}`;
    }
    const insertData: Record<string, any> = {
      room_id: selectedRoomId, sender_type: "attendant", sender_id: user.id,
      sender_name: userDisplayName || user.email?.split("@")[0] || "Atendente", content: finalContent, is_internal: isInternal,
    };
    if (messageType) { insertData.message_type = messageType; insertData.metadata = metadata as any; }
    else if (metadata && (metadata as any).file_url) { insertData.message_type = "file"; insertData.metadata = metadata as any; }
    await supabase.from("chat_messages").insert(insertData as any);
    if (!isInternal) broadcastEvent("new_message_activity", { room_id: selectedRoomId, updated_at: new Date().toISOString() });
    setReplyTarget(null);
  };

  // Auth + permission guard
  if (userDataLoading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (!hasPermission("chat.workspace.lite", "view")) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <h2 className="text-lg font-semibold text-foreground">Acesso não disponível</h2>
          <p className="text-sm text-muted-foreground">Você não tem permissão para acessar o Atendimento Lite. Solicite ao administrador.</p>
          <Button onClick={() => navigate("/home")}>Voltar ao início</Button>
        </div>
      </div>
    );
  }

  const renderReplyBanner = () => {
    if (!replyTarget) return null;
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b text-xs">
        <div className="flex-1 min-w-0">
          <span className="text-muted-foreground">Respondendo a </span>
          <span className="font-medium">{replyTarget.sender_name ?? "Visitante"}</span>
          <p className="truncate text-muted-foreground">{replyTarget.content.slice(0, 80)}</p>
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => setReplyTarget(null)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo-icon-dark.svg" alt="Logo" className="h-6 w-6" />
          <span className="text-sm font-semibold text-foreground">Atendimento</span>
          {view === "list" && (
            <Badge variant="secondary" className="text-[10px]">
              {filteredRooms.length} {filteredRooms.length === 1 ? "chat" : "chats"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleStatus}
            className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-muted hover:bg-muted/80 transition-colors"
          >
            <span className={`h-2 w-2 rounded-full ${statusColor}`} />
            {statusLabel}
          </button>
          <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-muted-foreground" onClick={() => navigate("/home")}>
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {view === "list" && (
          <div className="flex-1 min-h-0 flex flex-col">
            <PendingRoomsList
              attendantId={userAttendantId}
              selectedRoomId={selectedRoomId}
              onSelectRoom={handleSelectPendingRoom}
              refreshTrigger={pendingRefreshTrigger}
            />
            <div className="flex-1 min-h-0">
              <ChatRoomList
                rooms={filteredRooms}
                selectedRoomId={selectedRoomId}
                onSelectRoom={handleSelectRoom}
                loading={roomsLoading}
              />
            </div>
          </div>
        )}

        {view === "chat" && effectiveRoom && (
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Chat header */}
            <div className="flex items-center justify-between px-3 py-2 border-b bg-card shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { setView("list"); setSelectedRoomId(null); setPendingSelectedRoom(null); }}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium text-sm truncate">
                  {(effectiveRoom as any).visitor_name || `#${effectiveRoom.id.slice(0, 8)}`}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                  effectiveRoom.status === "active" ? "bg-green-100 text-green-700" :
                  effectiveRoom.status === "waiting" ? "bg-amber-100 text-amber-700" :
                  isPendingRoom ? "bg-amber-100 text-amber-700" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {isPendingRoom ? "Pendente" : effectiveRoom.status === "active" ? "Ativo" : effectiveRoom.status === "waiting" ? "Aguardando" : "Encerrado"}
                </span>
                {!isPendingRoom && effectiveRoom.started_at && effectiveRoom.status === "active" && (
                  <span className="text-[10px] text-muted-foreground">{durationLabel(effectiveRoom.started_at)}</span>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                {isPendingRoom && (
                  <>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleReopenRoom}>
                      <RotateCcw className="h-3 w-3" />Reabrir
                    </Button>
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={handleMarkResolved}>
                      <CheckCircle2 className="h-3 w-3" />Resolvido
                    </Button>
                  </>
                )}
                {effectiveRoom.status === "active" && !isPendingRoom && (
                  <>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleRequestClose(effectiveRoom.id)}>
                      Encerrar
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="outline" className="h-7 w-7">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setReassignOpen(true)}>
                          <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />Transferir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
                {effectiveRoom.status === "waiting" && !isPendingRoom && (
                  <>
                    <Button size="sm" className="h-7 text-xs" onClick={() => {
                      if (!user) return;
                      // Auto-assign to self
                      if (userAttendantId) {
                        supabase.from("chat_rooms").update({ attendant_id: userAttendantId, status: "active", assigned_at: new Date().toISOString() }).eq("id", effectiveRoom.id).then(({ error }) => {
                          if (error) toast.error("Erro ao atribuir");
                          else {
                            broadcastEvent("room_status", { room_id: effectiveRoom.id, status: "active", attendant_id: userAttendantId, updated_at: new Date().toISOString() });
                            toast.success("Conversa atribuída!");
                          }
                        });
                      }
                    }}>
                      Assumir
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="outline" className="h-7 w-7">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setReassignOpen(true)}>
                          <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />Transferir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-auto">
              <ChatMessageList
                messages={messages}
                loading={messagesLoading}
                onReply={handleReply}
                onDelete={handleDeleteMessage}
                hasMore={hasMore}
                loadingMore={loadingMore}
                onLoadMore={loadMore}
                typingUser={typingUser}
                visitorLastReadAt={visitorLastReadAt}
              />
            </div>

            {/* Input */}
            {effectiveRoom.status !== "closed" && (
              <>
                {renderReplyBanner()}
                <ChatInput onSend={handleSendMessage} roomId={selectedRoomId} senderName={userDisplayName} />
              </>
            )}
          </div>
        )}

        {view === "chat" && !effectiveRoom && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <MessageSquare className="h-12 w-12 mx-auto opacity-30" />
              <p className="text-sm">Selecione uma conversa</p>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CloseRoomDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen} onConfirm={handleConfirmClose} roomId={closingRoomId} />
      <ReassignDialog open={reassignOpen} onOpenChange={setReassignOpen} currentAttendantId={effectiveRoom?.attendant_id ?? null} onConfirm={handleReassign} />
    </div>
  );
};

export default AttendantLite;
