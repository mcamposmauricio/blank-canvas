import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useChatMessages, useChatRooms } from "@/hooks/useChatRealtime";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChatRoomList } from "@/components/chat/ChatRoomList";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatInput, clearDraft } from "@/components/chat/ChatInput";
import { VisitorInfoPanel, type WorkspaceDisplaySettings } from "@/components/chat/VisitorInfoPanel";
import { CloseRoomDialog } from "@/components/chat/CloseRoomDialog";
import { ReassignDialog } from "@/components/chat/ReassignDialog";
import ProactiveChatDialog from "@/components/chat/ProactiveChatDialog";
import { PendingRoomsList } from "@/components/chat/PendingRoomsList";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ChatTagSelector } from "@/components/chat/ChatTagSelector";
import { MessageSquare, PanelRightClose, PanelRightOpen, ArrowLeft, Info, Clock, X, ArrowRightLeft, Tag, Plus, RotateCcw, CheckCircle2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

type MobileView = "list" | "chat" | "info";

interface ReplyTarget {
  id: string;
  content: string;
  sender_name: string | null;
}

function durationLabel(startedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
  if (diff < 60) return `${diff}min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

const AdminWorkspace = () => {
  const { roomId: paramRoomId } = useParams();
  const [searchParams] = useSearchParams();
  const viewingAttendantId = searchParams.get("attendant");
  const viewingUnassigned = searchParams.get("queue") === "unassigned";
  const { t } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1920);
  const isTablet = !isMobile && windowWidth < 1024;
  const isCompact = windowWidth < 1280;
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(paramRoomId ?? null);
  const [infoPanelOpen, setInfoPanelOpen] = useState(true);
  const [wsDisplaySettings, setWsDisplaySettings] = useState<WorkspaceDisplaySettings | undefined>(undefined);
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closingRoomId, setClosingRoomId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [proactiveChatOpen, setProactiveChatOpen] = useState(false);
  const [userAttendantId, setUserAttendantId] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { rooms, loading: roomsLoading, markRoomAsRead, setSelectedRoomRef } = useChatRooms(user?.id ?? null, { excludeClosed: true, soundEnabled });
  const { messages, loading: messagesLoading, hasMore, loadingMore, loadMore } = useChatMessages(selectedRoomId);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [visitorLastReadAt, setVisitorLastReadAt] = useState<string | null>(null);

  // Track window width for responsive breakpoints
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Side panel stays open by default — user can toggle manually

  // Polling moved to SidebarLayout for reliability (runs even without Workspace open)

  // Request browser notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Fetch workspace display settings
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("chat_settings")
        .select("ws_show_company_info, ws_show_company_cnpj, ws_show_company_external_id, ws_show_company_sector, ws_show_company_location, ws_show_metrics, ws_show_metric_health, ws_show_metric_mrr, ws_show_metric_contract, ws_show_metric_nps, ws_show_metric_renewal, ws_show_contact_data, ws_show_contact_department, ws_show_contact_external_id, ws_show_contact_chat_stats, ws_show_custom_fields, ws_hidden_custom_fields, ws_show_timeline, ws_timeline_max_events, ws_show_recent_chats, ws_recent_chats_count, ws_default_panel_open")
        .maybeSingle();
      if (data) {
        const d = data as any;
        setWsDisplaySettings({
          ws_show_company_info: d.ws_show_company_info ?? true,
          ws_show_company_cnpj: d.ws_show_company_cnpj ?? true,
          ws_show_company_external_id: d.ws_show_company_external_id ?? true,
          ws_show_company_sector: d.ws_show_company_sector ?? true,
          ws_show_company_location: d.ws_show_company_location ?? true,
          ws_show_metrics: d.ws_show_metrics ?? true,
          ws_show_metric_health: d.ws_show_metric_health ?? true,
          ws_show_metric_mrr: d.ws_show_metric_mrr ?? true,
          ws_show_metric_contract: d.ws_show_metric_contract ?? true,
          ws_show_metric_nps: d.ws_show_metric_nps ?? true,
          ws_show_metric_renewal: d.ws_show_metric_renewal ?? true,
          ws_show_contact_data: d.ws_show_contact_data ?? true,
          ws_show_contact_department: d.ws_show_contact_department ?? true,
          ws_show_contact_external_id: d.ws_show_contact_external_id ?? true,
          ws_show_contact_chat_stats: d.ws_show_contact_chat_stats ?? true,
          ws_show_custom_fields: d.ws_show_custom_fields ?? true,
          ws_hidden_custom_fields: d.ws_hidden_custom_fields ?? [],
          ws_show_timeline: d.ws_show_timeline ?? true,
          ws_timeline_max_events: d.ws_timeline_max_events ?? 10,
          ws_show_recent_chats: d.ws_show_recent_chats ?? true,
          ws_recent_chats_count: d.ws_recent_chats_count ?? 5,
        });
        setInfoPanelOpen(d.ws_default_panel_open !== false);
      }
    })();
  }, []);

  // Get the current user's attendant profile id and display name
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data: profile } = await supabase
        .from("attendant_profiles")
        .select("id, display_name, sound_enabled")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile) {
        setUserAttendantId(profile.id);
        setUserDisplayName(profile.display_name);
        setSoundEnabled(profile.sound_enabled !== false);
      } else {
        // Fallback to user_profiles
        const { data: userProfile } = await supabase
          .from("user_profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .maybeSingle();
        if (userProfile?.display_name) setUserDisplayName(userProfile.display_name);
      }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (paramRoomId) setSelectedRoomId(paramRoomId);
  }, [paramRoomId]);

  // Reset selectedRoomId when switching queues/attendants
  useEffect(() => {
    setSelectedRoomId(null);
    setPendingSelectedRoom(null);
    setReplyTarget(null);
  }, [viewingAttendantId, viewingUnassigned]);

  useEffect(() => {
    setSelectedRoomRef(selectedRoomId);
  }, [selectedRoomId, setSelectedRoomRef]);

  // Typing indicator via Realtime Broadcast + visitor_last_read_at tracking
  useEffect(() => {
    if (!selectedRoomId) { setTypingUser(null); setVisitorLastReadAt(null); return; }
    setTypingUser(null);

    // Fetch initial visitor_last_read_at
    supabase.from("chat_rooms").select("visitor_last_read_at").eq("id", selectedRoomId).maybeSingle().then(({ data }) => {
      if (data) setVisitorLastReadAt((data as any).visitor_last_read_at ?? null);
    });

    const channel = supabase
      .channel(`typing-${selectedRoomId}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        const name = payload.payload?.name;
        if (name && payload.payload?.user_id !== user?.id) {
          setTypingUser(name);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
        }
      })
      .subscribe();

    // Subscribe to room updates for visitor_last_read_at changes
    const roomChannel = supabase
      .channel(`workspace-room-read-${selectedRoomId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_rooms", filter: `id=eq.${selectedRoomId}` }, (payload) => {
        const room = payload.new as any;
        if (room.visitor_last_read_at) {
          setVisitorLastReadAt(room.visitor_last_read_at);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(roomChannel);
    };
  }, [selectedRoomId, user?.id]);

  // Filter rooms based on viewing context, always include paramRoomId if navigated directly
  const filteredRooms = (() => {
    let filtered = viewingUnassigned
      ? rooms.filter((r) => !r.attendant_id)
      : viewingAttendantId
      ? rooms.filter((r) => r.attendant_id === viewingAttendantId)
      : rooms.filter((r) => {
          if (!r.attendant_id) return false;
          return r.attendant_id === userAttendantId;
        });
    // Always include the paramRoomId room so direct links work
    if (paramRoomId && !filtered.some((r) => r.id === paramRoomId)) {
      const paramRoom = rooms.find((r) => r.id === paramRoomId);
      if (paramRoom) filtered = [paramRoom, ...filtered];
    }
    return filtered;
  })();

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const [pendingSelectedRoom, setPendingSelectedRoom] = useState<{
    id: string; visitor_name: string; visitor_id: string; status: string;
    resolution_status: string; attendant_id: string | null; contact_id: string | null;
    company_contact_id: string | null; started_at: string | null;
  } | null>(null);

  // Clear selectedRoomId if no longer in filteredRooms (and not a pending room)
  // Never clear if it matches paramRoomId (user navigated intentionally via link)
  useEffect(() => {
    if (!selectedRoomId) return;
    if (pendingSelectedRoom) return;
    if (paramRoomId && selectedRoomId === paramRoomId) return;
    const found = filteredRooms.some((r) => r.id === selectedRoomId);
    if (!found && !roomsLoading) {
      setSelectedRoomId(null);
      setReplyTarget(null);
    }
  }, [filteredRooms, selectedRoomId, roomsLoading, pendingSelectedRoom, paramRoomId]);

  // If paramRoomId is set but room is not in rooms list, fetch it directly
  useEffect(() => {
    if (!paramRoomId || !user) return;
    const inRooms = rooms.some((r) => r.id === paramRoomId);
    if (inRooms || roomsLoading) return;
    // Room not in active rooms — fetch directly and set as pendingSelectedRoom
    (async () => {
      const { data } = await supabase
        .from("chat_rooms")
        .select("id, visitor_id, status, resolution_status, attendant_id, contact_id, company_contact_id, started_at, chat_visitors!visitor_id(name)")
        .eq("id", paramRoomId)
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
    })();
  }, [paramRoomId, rooms, roomsLoading, user]);

  const effectiveRoom = selectedRoom ?? pendingSelectedRoom;
  const isPendingRoom = effectiveRoom?.status === "closed" && (effectiveRoom as any)?.resolution_status === "pending";

  const handleSelectPendingRoom = async (roomId: string) => {
    setSelectedRoomId(roomId);
    setReplyTarget(null);
    // Fetch room data since it's not in the active rooms list
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
    if (isMobile) setMobileView("chat");
  };

  const handleReopenRoom = async () => {
    if (!selectedRoomId || !user) return;
    await supabase.from("chat_rooms").update({
      status: "active", resolution_status: null, closed_at: null,
      assigned_at: new Date().toISOString(),
      attendant_id: userAttendantId,
    }).eq("id", selectedRoomId);
    await supabase.from("chat_messages").insert({
      room_id: selectedRoomId, sender_type: "system", sender_name: "Sistema",
      content: "[Sistema] Conversa reaberta pelo atendente", is_internal: false,
      metadata: { auto_rule: "chain_reset" },
    });
    // Trigger welcome message via assign-chat-room
    supabase.functions.invoke("assign-chat-room", { body: { room_id: selectedRoomId } }).catch(() => {});
    setPendingSelectedRoom(null);
    toast.success("Conversa reaberta!");
  };

  const handleMarkResolved = async () => {
    if (!selectedRoomId) return;
    await supabase.from("chat_rooms").update({ resolution_status: "resolved" }).eq("id", selectedRoomId);
    setPendingSelectedRoom(null);
    setSelectedRoomId(null);
    toast.success("Marcado como resolvido!");
  };

  const handleSelectRoom = (id: string) => {
    setSelectedRoomId(id);
    markRoomAsRead(id);
    setReplyTarget(null);
    if (isMobile) setMobileView("chat");
    // Update attendant_last_read_at for read receipts in widget
    supabase.from("chat_rooms").update({ attendant_last_read_at: new Date().toISOString() }).eq("id", id).then(() => {});
  };

  const handleAssignRoom = async (roomId: string) => {
    if (!user) return;

    // Fetch user profile display_name to use as attendant name
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle();
    const profileName = userProfile?.display_name || user.email?.split("@")[0] || "Admin";

    let { data: profile } = await supabase
      .from("attendant_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      const { data: newProfile, error: createError } = await supabase
        .from("attendant_profiles")
        .insert({
          user_id: user.id,
          csm_id: user.id,
          display_name: profileName,
          status: "online",
        })
        .select("id")
        .single();

      if (createError) {
        const { data: csm } = await supabase.from("csms").select("id").eq("user_id", user.id).maybeSingle();
        let csmId = csm?.id;
        if (!csmId) {
          const { data: newCsm } = await supabase
            .from("csms")
            .insert({ user_id: user.id, name: profileName, email: user.email ?? "", is_chat_enabled: true })
            .select("id")
            .single();
          csmId = newCsm?.id;
        }
        if (!csmId) { toast.error("Não foi possível criar perfil de atendente"); return; }
        const { data: retryProfile } = await supabase.from("attendant_profiles").select("id").eq("user_id", user.id).maybeSingle();
        profile = retryProfile;
        if (!profile) { toast.error("Não foi possível atribuir a conversa."); return; }
      } else {
        profile = newProfile;
      }
    }

    const { error } = await supabase
      .from("chat_rooms")
      .update({ attendant_id: profile.id, status: "active", assigned_at: new Date().toISOString() })
      .eq("id", roomId);

    if (error) toast.error("Erro ao atribuir conversa");
    else toast.success("Conversa atribuída com sucesso!");
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
      sender_name: userDisplayName || user.email?.split("@")[0] || "Atendente", content: `[Encerramento] ${note}`, is_internal: true,
      });
    }
    await supabase.from("chat_rooms").update({
      status: "closed", resolution_status: resolutionStatus, closed_at: new Date().toISOString(),
    }).eq("id", closingRoomId);
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

  const handleSendMessage = async (
    content: string,
    isInternal = false,
    metadata?: Record<string, any>,
    messageType?: string
  ) => {
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

    if (messageType) {
      insertData.message_type = messageType;
      insertData.metadata = metadata as any;
    } else if (metadata && (metadata as any).file_url) {
      insertData.message_type = "file";
      insertData.metadata = metadata as any;
    }

    await supabase.from("chat_messages").insert(insertData as any);
    setReplyTarget(null);
  };

  const msgCount = messages.length;

  const renderDuration = (room: typeof selectedRoom) => {
    if (!room || !room.started_at || room.status !== "active") return null;
    return (
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        {durationLabel(room.started_at)}
      </span>
    );
  };

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

  // Mobile layout
  if (isMobile) {
    return (
      <>
        <div className="h-screen flex flex-col bg-transparent overflow-hidden">
          {mobileView === "list" && (
            <ChatRoomList rooms={filteredRooms} selectedRoomId={selectedRoomId} onSelectRoom={handleSelectRoom} loading={roomsLoading} />
          )}
          {mobileView === "chat" && selectedRoom && (
            <Card className="flex-1 flex flex-col rounded-none border-0 overflow-hidden">
              <div className="p-3 flex items-center justify-between border-b">
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setMobileView("list")}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium text-sm truncate">
                    {selectedRoom.visitor_name || `#${selectedRoom.id.slice(0, 8)}`}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedRoom.status === "active" ? "bg-green-100 text-green-700" :
                    selectedRoom.status === "waiting" ? "bg-amber-100 text-amber-700" :
                    "bg-muted text-muted-foreground"
                  }`}>{selectedRoom.status === "active" ? "Ativo" : selectedRoom.status === "waiting" ? "Aguardando" : selectedRoom.status === "closed" ? "Encerrado" : selectedRoom.status}</span>
                  {renderDuration(selectedRoom)}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8"><Info className="h-4 w-4" /></Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[85vw] p-0">
                      <VisitorInfoPanel roomId={selectedRoom.id} visitorId={selectedRoom.visitor_id} contactId={selectedRoom.contact_id} companyContactId={selectedRoom.company_contact_id} displaySettings={wsDisplaySettings} />
                    </SheetContent>
                  </Sheet>
                  {selectedRoom.status === "active" && (
                    <>
                      <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => handleRequestClose(selectedRoom.id)}>
                        {t("chat.workspace.close")}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="outline" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setReassignOpen(true)}>
                            <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />Transferir
                          </DropdownMenuItem>
                          <Popover>
                            <PopoverTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Tag className="h-3.5 w-3.5 mr-2" />Tags
                              </DropdownMenuItem>
                            </PopoverTrigger>
                            <PopoverContent className="w-72" align="end">
                              <ChatTagSelector roomId={selectedRoom.id} compact />
                            </PopoverContent>
                          </Popover>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                  {selectedRoom.status === "waiting" && (
                    <>
                      <Button size="sm" className="h-8 text-xs" onClick={() => handleAssignRoom(selectedRoom.id)}>
                        {t("chat.workspace.assign")}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="outline" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setReassignOpen(true)}>
                            <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />Transferir
                          </DropdownMenuItem>
                          <Popover>
                            <PopoverTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Tag className="h-3.5 w-3.5 mr-2" />Tags
                              </DropdownMenuItem>
                            </PopoverTrigger>
                            <PopoverContent className="w-72" align="end">
                              <ChatTagSelector roomId={selectedRoom.id} compact />
                            </PopoverContent>
                          </Popover>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                    <ChatMessageList messages={messages} loading={messagesLoading} onReply={handleReply} onDelete={handleDeleteMessage} hasMore={hasMore} loadingMore={loadingMore} onLoadMore={loadMore} typingUser={typingUser} visitorLastReadAt={visitorLastReadAt} />
              </div>
              {selectedRoom.status !== "closed" && (
                <>{renderReplyBanner()}<ChatInput onSend={handleSendMessage} roomId={selectedRoomId} senderName={userDisplayName} /></>
              )}
            </Card>
          )}
        </div>
      <CloseRoomDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen} onConfirm={handleConfirmClose} roomId={closingRoomId} />
        <ReassignDialog open={reassignOpen} onOpenChange={setReassignOpen} currentAttendantId={selectedRoom?.attendant_id ?? null} onConfirm={handleReassign} />
      </>
    );
  }

  // Desktop layout with resizable panels
  return (
    <>
      <div className="-m-4 md:-m-6 lg:-m-8 h-screen flex flex-col bg-transparent overflow-hidden w-full max-w-full">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left: Room list */}
          <ResizablePanel defaultSize={isTablet ? 25 : 20} minSize={isCompact ? 15 : 18} maxSize={35}>
            <div className={`h-full flex flex-col ${isCompact ? 'p-1 pl-2 pt-2 pb-2' : 'p-1.5 pl-3 pt-3 pb-3'}`}>
              <div className="mb-2 px-1">
                <Button size="sm" className="w-full gap-1" onClick={() => setProactiveChatOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Novo Chat
                </Button>
              </div>
              <PendingRoomsList attendantId={userAttendantId} selectedRoomId={selectedRoomId} onSelectRoom={handleSelectPendingRoom} />
              <div className="flex-1 min-h-0">
                <ChatRoomList rooms={filteredRooms} selectedRoomId={selectedRoomId} onSelectRoom={handleSelectRoom} loading={roomsLoading} />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center: Chat area */}
          <ResizablePanel defaultSize={infoPanelOpen ? 50 : 80} minSize={isCompact ? 30 : 35}>
            <div className={`h-full min-w-0 ${isCompact ? 'p-1 pt-2 pb-2' : 'p-1.5 pt-3 pb-3'}`}>
              {effectiveRoom ? (
                <Card className="h-full flex flex-col rounded-lg border bg-card shadow-sm overflow-hidden">
                  <div className="p-3 flex items-center justify-between border-b gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium text-sm truncate">
                        {(effectiveRoom as any).visitor_name || `${t("chat.workspace.room")} #${effectiveRoom.id.slice(0, 8)}`}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                        effectiveRoom.status === "active" ? "bg-green-100 text-green-700" :
                        effectiveRoom.status === "waiting" ? "bg-amber-100 text-amber-700" :
                        isPendingRoom ? "bg-amber-100 text-amber-700" :
                        "bg-muted text-muted-foreground"
                      }`}>{isPendingRoom ? "Pendente" : effectiveRoom.status === "active" ? "Ativo" : effectiveRoom.status === "waiting" ? "Aguardando" : effectiveRoom.status === "closed" ? "Encerrado" : effectiveRoom.status}</span>
                      {!isPendingRoom && renderDuration(selectedRoom)}
                      {!isCompact && <span className="text-[10px] text-muted-foreground">{msgCount} msgs</span>}
                    </div>
                    <div className="flex gap-1.5 shrink-0 items-center">
                      {isPendingRoom && (
                        <>
                          <Button size="sm" variant="outline" className="gap-1 h-8" onClick={handleReopenRoom}>
                            <RotateCcw className="h-3 w-3" />{!isTablet && "Reabrir"}
                          </Button>
                          <Button size="sm" variant="default" className="gap-1 h-8" onClick={handleMarkResolved}>
                            <CheckCircle2 className="h-3 w-3" />{!isTablet && "Resolvido"}
                          </Button>
                        </>
                      )}
                      {selectedRoom?.status === "waiting" && !isPendingRoom && (
                        <>
                          <Button size="sm" className="h-8" onClick={() => handleAssignRoom(selectedRoom.id)}>{t("chat.workspace.assign")}</Button>
                          {isCompact ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="outline" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setReassignOpen(true)}>
                                  <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />Transferir
                                </DropdownMenuItem>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <Tag className="h-3.5 w-3.5 mr-2" />Tags
                                    </DropdownMenuItem>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-72" align="end">
                                    <ChatTagSelector roomId={selectedRoom.id} compact />
                                  </PopoverContent>
                                </Popover>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" className="h-8" onClick={() => setReassignOpen(true)}>
                                <ArrowRightLeft className="h-3 w-3 mr-1" />Transferir
                              </Button>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button size="icon" variant="outline" className="h-8 w-8">
                                    <Tag className="h-3.5 w-3.5" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72" align="end">
                                  <ChatTagSelector roomId={selectedRoom.id} compact />
                                </PopoverContent>
                              </Popover>
                            </>
                          )}
                        </>
                      )}
                      {selectedRoom?.status === "active" && !isPendingRoom && (
                        <>
                          {isCompact ? (
                            <>
                              <Button size="sm" variant="destructive" className="h-8" onClick={() => handleRequestClose(selectedRoom.id)}>
                                {isTablet ? <X className="h-3.5 w-3.5" /> : t("chat.workspace.close")}
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="outline" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setReassignOpen(true)}>
                                    <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />Transferir
                                  </DropdownMenuItem>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Tag className="h-3.5 w-3.5 mr-2" />Tags
                                      </DropdownMenuItem>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72" align="end">
                                      <ChatTagSelector roomId={selectedRoom.id} compact />
                                    </PopoverContent>
                                  </Popover>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" className="h-8" onClick={() => setReassignOpen(true)}>
                                <ArrowRightLeft className="h-3 w-3 mr-1" />Transferir
                              </Button>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-8">
                                    <Tag className="h-3 w-3 mr-1" />Tags
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72" align="end">
                                  <ChatTagSelector roomId={selectedRoom.id} compact />
                                </PopoverContent>
                              </Popover>
                              <Button size="sm" variant="destructive" className="h-8" onClick={() => handleRequestClose(selectedRoom.id)}>
                                {t("chat.workspace.close")}
                              </Button>
                            </>
                          )}
                        </>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setInfoPanelOpen(!infoPanelOpen)}
                        title={infoPanelOpen ? "Esconder painel" : "Mostrar painel"}>
                        {infoPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <ChatMessageList messages={messages} loading={messagesLoading} onReply={handleReply} onDelete={handleDeleteMessage} hasMore={hasMore} loadingMore={loadingMore} onLoadMore={loadMore} typingUser={typingUser} visitorLastReadAt={visitorLastReadAt} />
                  </div>
                  {effectiveRoom.status !== "closed" && (
                    <>{renderReplyBanner()}<ChatInput onSend={handleSendMessage} roomId={selectedRoomId} senderName={userDisplayName} /></>
                  )}
                </Card>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-2">
                    <MessageSquare className="h-12 w-12 mx-auto opacity-30" />
                    <p>{t("chat.workspace.select_room")}</p>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>

          {/* Right: Visitor info */}
          {effectiveRoom && infoPanelOpen && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={isCompact ? 18 : 22} maxSize={40}>
                <div className={`h-full overflow-y-auto ${isCompact ? 'p-1 pr-2 pt-2 pb-2' : 'p-1.5 pr-3 pt-3 pb-3'}`}>
                  <VisitorInfoPanel roomId={effectiveRoom.id} visitorId={effectiveRoom.visitor_id} contactId={effectiveRoom.contact_id} companyContactId={effectiveRoom.company_contact_id} displaySettings={wsDisplaySettings} />
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      <CloseRoomDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen} onConfirm={handleConfirmClose} roomId={closingRoomId} />
      <ReassignDialog open={reassignOpen} onOpenChange={setReassignOpen} currentAttendantId={effectiveRoom?.attendant_id ?? null} onConfirm={handleReassign} />
      {userAttendantId && (
        <ProactiveChatDialog
          open={proactiveChatOpen}
          onOpenChange={setProactiveChatOpen}
          userId={user?.id ?? ""}
          attendantId={userAttendantId}
          attendantName={userDisplayName ?? "Atendente"}
        />
      )}
    </>
  );
};

export default AdminWorkspace;
