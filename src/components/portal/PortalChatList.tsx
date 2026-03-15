import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, ChevronDown, ChevronUp, Star, Plus, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PortalRoom {
  id: string;
  status: string;
  created_at: string;
  closed_at: string | null;
  csat_score: number | null;
  resolution_status: string | null;
}

interface PortalMessage {
  id: string;
  content: string;
  sender_type: string;
  sender_name: string | null;
  created_at: string;
  is_internal: boolean;
}

interface PortalChatListProps {
  rooms: PortalRoom[];
  activeRoom: PortalRoom | null;
  onNewChat: () => void;
  onResumeChat: (roomId: string) => void;
  onReopenChat?: (roomId: string) => void;
  loading: boolean;
}

const PortalChatList = ({ rooms, activeRoom, onNewChat, onResumeChat, onReopenChat, loading }: PortalChatListProps) => {
  const { t } = useLanguage();
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const loadTranscript = async (roomId: string) => {
    if (expandedRoom === roomId) {
      setExpandedRoom(null);
      return;
    }

    setLoadingMessages(true);
    setExpandedRoom(roomId);

    const { data } = await supabase
      .from("chat_messages")
      .select("id, content, sender_type, sender_name, created_at, is_internal")
      .eq("room_id", roomId)
      .eq("is_internal", false)
      .order("created_at", { ascending: true });

    setMessages(data ?? []);
    setLoadingMessages(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
      case "waiting": return <Badge className="bg-yellow-100 text-yellow-800">Aguardando</Badge>;
      case "closed": return <Badge variant="outline">Encerrado</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const resolutionBadge = (status: string | null) => {
    switch (status) {
      case "resolved": return <Badge className="bg-green-100 text-green-800">Resolvido</Badge>;
      case "escalated": return <Badge className="bg-red-100 text-red-800">Escalado</Badge>;
      case "pending": return <Badge className="bg-orange-100 text-orange-800">Pendente</Badge>;
      case "inactive": return <Badge className="bg-muted text-muted-foreground">Inativo</Badge>;
      case "archived": return <Badge className="bg-blue-100 text-blue-800">Arquivado</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Active chat alert */}
      {activeRoom && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{t("chat.portal.has_active")}</span>
              </div>
              <Button size="sm" onClick={() => onResumeChat(activeRoom.id)}>
                {t("chat.portal.resume_chat")}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header with new chat button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("chat.portal.chats")}</h2>
        {!activeRoom && (
          <Button onClick={onNewChat} disabled={loading} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t("chat.portal.new_chat")}
          </Button>
        )}
      </div>

      {rooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{t("chat.portal.no_chats")}</p>
            {!activeRoom && (
              <Button variant="outline" className="mt-4" onClick={onNewChat} disabled={loading}>
                <Plus className="h-4 w-4 mr-1" />
                {t("chat.portal.new_chat")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <Card key={room.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {statusBadge(room.status)}
                    {room.status === "closed" && resolutionBadge(room.resolution_status)}
                  </div>
                  <div className="flex items-center gap-2">
                    {room.csat_score != null && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                        <span>{room.csat_score}/5</span>
                      </div>
                    )}
                    {(room.status === "active" || room.status === "waiting") ? (
                      <Button variant="default" size="sm" onClick={() => onResumeChat(room.id)}>
                        {t("chat.portal.resume_chat")}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : room.status === "closed" && room.resolution_status === "pending" ? (
                      <Button variant="default" size="sm" onClick={() => onReopenChat?.(room.id)}>
                        Retomar conversa
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => loadTranscript(room.id)}>
                        {expandedRoom === room.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {t("chat.portal.view_transcript")}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Início: {format(new Date(room.created_at), "dd/MM/yyyy HH:mm")}</p>
                  {room.closed_at && (
                    <p>Encerramento: {format(new Date(room.closed_at), "dd/MM/yyyy HH:mm")}</p>
                  )}
                </div>

                {/* Transcript */}
                {expandedRoom === room.id && (
                  <div className="mt-4 border-t pt-4">
                    {loadingMessages ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      </div>
                    ) : messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma mensagem</p>
                    ) : (
                      <ScrollArea className="max-h-80">
                        <div className="space-y-3">
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.sender_type === "visitor" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                  msg.sender_type === "visitor"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                {msg.sender_name && (
                                  <p className="text-xs font-medium mb-1 opacity-75">{msg.sender_name}</p>
                                )}
                                <p>{msg.content}</p>
                                <p className="text-xs opacity-60 mt-1">
                                  {format(new Date(msg.created_at), "HH:mm")}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortalChatList;
