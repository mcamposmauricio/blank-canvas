import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, User, ClipboardList, BookOpen, UserCog } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import PortalChatList from "@/components/portal/PortalChatList";
import PortalChatView from "@/components/portal/PortalChatView";
import PortalNPSTab from "@/components/portal/PortalNPSTab";
import PortalProfileTab from "@/components/portal/PortalProfileTab";
import PortalHelpTab from "@/components/portal/PortalHelpTab";

interface PortalContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company_id: string;
  user_id: string;
  chat_visitor_id: string | null;
  role: string | null;
  department: string | null;
}

interface PortalRoom {
  id: string;
  status: string;
  created_at: string;
  closed_at: string | null;
  csat_score: number | null;
  resolution_status: string | null;
}

export interface WidgetConfig {
  show_outside_hours_banner: boolean;
  outside_hours_title: string | null;
  outside_hours_message: string | null;
  show_all_busy_banner: boolean;
  all_busy_title: string | null;
  all_busy_message: string | null;
  waiting_message: string | null;
  show_csat: boolean;
  allow_file_attachments: boolean;
  allow_multiple_chats: boolean;
}

const UserPortal = () => {
  const { token } = useParams<{ token: string }>();
  const { t } = useLanguage();
  const [contact, setContact] = useState<PortalContact | null>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [rooms, setRooms] = useState<PortalRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig | null>(null);

  // Chat mode state
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeVisitorId, setActiveVisitorId] = useState<string | null>(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const [allBusy, setAllBusy] = useState(false);
  const [outsideHours, setOutsideHours] = useState(false);

  const fetchRooms = useCallback(async (contactId: string) => {
    const { data: roomsData } = await supabase
      .from("chat_rooms")
      .select("id, status, created_at, closed_at, csat_score, resolution_status")
      .eq("company_contact_id", contactId)
      .order("created_at", { ascending: false });

    setRooms(roomsData ?? []);
  }, []);

  useEffect(() => {
    const fetchPortalData = async () => {
      if (!token) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data: contactData } = await supabase
        .from("company_contacts")
        .select("id, name, email, phone, company_id, user_id, chat_visitor_id, role, department")
        .eq("public_token", token)
        .maybeSingle();

      if (!contactData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setContact(contactData);

      // Fetch company name + chat_settings in parallel
      const [companyResult, cfgResult] = await Promise.all([
        supabase
          .from("contacts")
          .select("name")
          .eq("id", contactData.company_id)
          .maybeSingle(),
        supabase
          .from("chat_settings")
          .select("show_outside_hours_banner, outside_hours_title, outside_hours_message, show_all_busy_banner, all_busy_title, all_busy_message, waiting_message, show_csat, allow_file_attachments, allow_multiple_chats")
          .eq("user_id", contactData.user_id)
          .maybeSingle(),
      ]);

      setCompanyName(companyResult.data?.name ?? "");
      if (cfgResult.data) setWidgetConfig(cfgResult.data as WidgetConfig);

      await fetchRooms(contactData.id);
      setLoading(false);
    };

    fetchPortalData();
  }, [token, fetchRooms]);

  // Realtime subscription for proactive chats (new rooms created by attendants)
  useEffect(() => {
    if (!contact) return;

    const filterField = contact.chat_visitor_id
      ? `visitor_id=eq.${contact.chat_visitor_id}`
      : `company_contact_id=eq.${contact.id}`;

    const channel = supabase
      .channel(`portal-new-rooms-${contact.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_rooms",
        filter: filterField,
      }, async (payload) => {
        const newRoom = payload.new as any;
        await fetchRooms(contact.id);
        // If not currently in a chat, auto-enter the new proactive chat
        if (!activeRoomId) {
          setActiveRoomId(newRoom.id);
          setActiveVisitorId(contact.chat_visitor_id ?? newRoom.visitor_id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [contact, activeRoomId, fetchRooms]);

  // Find active/waiting room
  const activeRoom = rooms.find((r) => r.status === "active" || r.status === "waiting") ?? null;

  const checkRoomAssignment = async (roomId: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/assign-chat-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": supabaseAnonKey },
        body: JSON.stringify({ room_id: roomId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.outside_hours) {
          setOutsideHours(true);
          setAllBusy(false);
        } else if (data.all_busy) {
          setAllBusy(true);
          setOutsideHours(false);
        } else {
          setAllBusy(false);
          setOutsideHours(false);
        }
      }
    } catch {
      // fail silently — realtime handles status updates
    }
  };

  const getOrCreateVisitor = async (): Promise<string | null> => {
    if (!contact) return null;

    // Reuse existing visitor
    if (contact.chat_visitor_id) {
      const { data: existing } = await supabase
        .from("chat_visitors")
        .select("id")
        .eq("id", contact.chat_visitor_id)
        .maybeSingle();

      if (existing) return existing.id;
    }

    // Create new visitor with all linking fields
    const { data: visitor } = await supabase
      .from("chat_visitors")
      .insert({
        name: contact.name,
        email: contact.email,
        phone: contact.phone || null,
        owner_user_id: contact.user_id,
        company_contact_id: contact.id,
        contact_id: contact.company_id,
        role: contact.role || null,
        department: contact.department || null,
      })
      .select("id")
      .single();

    if (!visitor) return null;

    // Save visitor ID back to contact for reuse
    await supabase
      .from("company_contacts")
      .update({ chat_visitor_id: visitor.id })
      .eq("id", contact.id);

    // Update local state
    setContact((prev) => prev ? { ...prev, chat_visitor_id: visitor.id } : prev);

    return visitor.id;
  };

  const handleNewChat = async () => {
    if (!contact || creatingChat) return;

    // If there's already an active room, resume it
    if (activeRoom) {
      handleResumeChat(activeRoom.id);
      return;
    }

    setCreatingChat(true);
    setAllBusy(false);
    setOutsideHours(false);

    // Check allow_multiple_chats
    if (!(widgetConfig as any)?.allow_multiple_chats) {
      const existingActive = rooms.find((r) => r.status === "active" || r.status === "waiting");
      if (existingActive) {
        setCreatingChat(false);
        return;
      }
    }

    const visitorId = await getOrCreateVisitor();
    if (!visitorId) {
      setCreatingChat(false);
      return;
    }

    const { data: room } = await supabase
      .from("chat_rooms")
      .insert({
        visitor_id: visitorId,
        owner_user_id: contact.user_id,
        company_contact_id: contact.id,
        contact_id: contact.company_id,
        status: "waiting",
      })
      .select("id, status, attendant_id")
      .single();

    if (room) {
      setActiveRoomId(room.id);
      setActiveVisitorId(visitorId);
      await fetchRooms(contact.id);
      if (!(room.status === "active" && room.attendant_id)) {
        await checkRoomAssignment(room.id);
      }
    }

    setCreatingChat(false);
  };

  const handleReopenChat = async (roomId: string) => {
    if (!contact || creatingChat) return;

    // Check allow_multiple_chats
    if (!(widgetConfig as any)?.allow_multiple_chats) {
      const existingActive = rooms.find((r) => r.status === "active" || r.status === "waiting");
      if (existingActive) return;
    }

    setCreatingChat(true);

    await supabase.from("chat_rooms").update({
      status: "waiting",
      closed_at: null,
      resolution_status: null,
    }).eq("id", roomId);

    await supabase.from("chat_messages").insert({
      room_id: roomId,
      sender_type: "system",
      sender_name: "Sistema",
      content: "[Sistema] Chat reaberto pelo cliente",
      is_internal: false,
      metadata: { auto_rule: "chain_reset" },
    });

    const visitorId = contact.chat_visitor_id ?? (await getOrCreateVisitor());
    setActiveRoomId(roomId);
    setActiveVisitorId(visitorId);
    await fetchRooms(contact.id);
    await checkRoomAssignment(roomId);

    setCreatingChat(false);
  };

  const handleResumeChat = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room || !contact) return;

    setAllBusy(false);
    setOutsideHours(false);
    setActiveRoomId(roomId);
    setActiveVisitorId(contact.chat_visitor_id);
  };

  const handleBackToList = async () => {
    setActiveRoomId(null);
    setActiveVisitorId(null);
    setAllBusy(false);
    setOutsideHours(false);
    if (contact) {
      await fetchRooms(contact.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t("chat.portal.not_found")}</h2>
            <p className="text-sm text-muted-foreground">Link inválido ou expirado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Chat view
  if (activeRoomId && activeVisitorId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-sm">{contact?.name}</h1>
              <p className="text-xs text-muted-foreground">{companyName}</p>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-3xl mx-auto w-full">
          <PortalChatView
            roomId={activeRoomId}
            visitorId={activeVisitorId}
            contactName={contact?.name ?? "Visitante"}
            onBack={handleBackToList}
            widgetConfig={widgetConfig}
            allBusy={allBusy}
            outsideHours={outsideHours}
          />
        </main>
      </div>
    );
  }

  // List view with tabs
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold">{contact?.name}</h1>
            <p className="text-sm text-muted-foreground">{companyName} • {contact?.email}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <Tabs defaultValue="chats" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-6">
            <TabsTrigger value="chats" className="gap-1.5">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Meus Chats</span>
            </TabsTrigger>
            <TabsTrigger value="nps" className="gap-1.5">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">NPS</span>
            </TabsTrigger>
            <TabsTrigger value="help" className="gap-1.5">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Ajuda</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-1.5">
              <UserCog className="h-4 w-4" />
              <span className="hidden sm:inline">Meus Dados</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chats">
            <PortalChatList
              rooms={rooms}
              activeRoom={activeRoom}
              onNewChat={handleNewChat}
              onResumeChat={handleResumeChat}
              onReopenChat={handleReopenChat}
              loading={creatingChat}
            />
          </TabsContent>

          <TabsContent value="nps">
            {contact && (
              <PortalNPSTab
                companyId={contact.company_id}
                contactName={contact.name}
              />
            )}
          </TabsContent>

          <TabsContent value="help">
            {contact && (
              <PortalHelpTab tenantId={contact.user_id} />
            )}
          </TabsContent>

          <TabsContent value="profile">
            {contact && (
              <PortalProfileTab
                contact={contact}
                onUpdate={(updated) => setContact(updated)}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default UserPortal;
