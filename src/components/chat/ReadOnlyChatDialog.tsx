import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Eye, MessageSquare, RotateCcw, Clock, Star, User, Building2, ExternalLink, Link2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useChatMessages } from "@/hooks/useChatRealtime";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatTagSelector } from "@/components/chat/ChatTagSelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { CompanyDetailsSheet } from "@/components/CompanyDetailsSheet";

interface ReadOnlyChatDialogProps {
  roomId: string | null;
  visitorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resolutionStatus?: string | null;
  onReopen?: (roomId: string) => void;
}

interface RoomInfo {
  attendant_name: string | null;
  contact_name: string | null;
  contact_id: string | null;
  company_contact_id: string | null;
  csat_score: number | null;
  csat_comment: string | null;
  resolution_status: string | null;
  created_at: string | null;
  closed_at: string | null;
  
}

export function ReadOnlyChatDialog({ roomId, visitorName, open, onOpenChange, resolutionStatus, onReopen }: ReadOnlyChatDialogProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { messages, loading, refetch } = useChatMessages(open ? roomId : null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId || !open) { setRoomInfo(null); return; }
    const fetchRoomInfo = async () => {
      const { data: room } = await supabase
        .from("chat_rooms")
        .select("attendant_id, contact_id, company_contact_id, csat_score, csat_comment, resolution_status, created_at, closed_at")
        .eq("id", roomId)
        .maybeSingle();
      if (!room) return;

      let attendant_name: string | null = null;
      if (room.attendant_id) {
        const { data: att } = await supabase.from("attendant_profiles").select("display_name").eq("id", room.attendant_id).maybeSingle();
        attendant_name = att?.display_name ?? null;
      }

      let contact_name: string | null = null;
      if (room.contact_id) {
        const { data: contact } = await supabase.from("contacts").select("name").eq("id", room.contact_id).maybeSingle();
        contact_name = contact?.name ?? null;
      }



      setRoomInfo({
        attendant_name,
        contact_name,
        contact_id: room.contact_id,
        company_contact_id: room.company_contact_id,
        csat_score: room.csat_score,
        csat_comment: room.csat_comment,
        resolution_status: room.resolution_status,
        created_at: room.created_at,
        closed_at: room.closed_at,
      });
    };
    fetchRoomInfo();
  }, [roomId, open]);

  const handleSendNote = async () => {
    if (!note.trim() || !roomId || !user) return;
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      room_id: roomId,
      sender_type: "attendant",
      sender_id: user.id,
      sender_name: user.email?.split("@")[0] ?? "Atendente",
      content: note,
      is_internal: true,
    });
    setNote("");
    setSending(false);
    if (!error) refetch();
  };

  const duration = roomInfo?.closed_at && roomInfo?.created_at
    ? Math.floor((new Date(roomInfo.closed_at).getTime() - new Date(roomInfo.created_at).getTime()) / 60000)
    : null;
  const durationStr = duration != null ? (duration < 60 ? `${duration}min` : `${Math.floor(duration / 60)}h${duration % 60 > 0 ? `${duration % 60}min` : ""}`) : null;

  const resolutionBadge = (status: string | null) => {
    switch (status) {
      case "resolved": return <Badge className="bg-green-100 text-green-800 text-[10px]">Resolvido</Badge>;
      case "pending": return <Badge className="bg-orange-100 text-orange-800 text-[10px]">Pendente</Badge>;
      case "inactive": return <Badge className="bg-muted text-muted-foreground text-[10px]">Inativo</Badge>;
      case "archived": return <Badge className="bg-blue-100 text-blue-800 text-[10px]">Arquivado</Badge>;
      case "escalated": return <Badge className="bg-red-100 text-red-800 text-[10px]">Escalado</Badge>;
      default: return null;
    }
  };

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {visitorName}
              {roomId && (
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/admin/chat/${roomId}`;
                    navigator.clipboard.writeText(url);
                    toast({ title: "Link copiado!", description: "Link direto da conversa copiado para a área de transferência." });
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors ml-1"
                  title="Copiar link direto"
                >
                  <Link2 className="h-3.5 w-3.5" />
                </button>
              )}
            </SheetTitle>
            {onReopen && roomId && (resolutionStatus === "pending" || resolutionStatus === "resolved") && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => {
                  onReopen(roomId);
                  onOpenChange(false);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reabrir
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Room info header */}
        {roomInfo && (
          <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <div className="flex flex-wrap items-center gap-2 text-[12px]">
              {roomInfo.resolution_status && resolutionBadge(roomInfo.resolution_status)}
              {roomInfo.attendant_name && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <User className="h-3 w-3" />{roomInfo.attendant_name}
                </span>
              )}
              {durationStr && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />{durationStr}
                </span>
              )}
              {roomInfo.csat_score != null && (
                <span className={`flex items-center gap-1 font-medium ${roomInfo.csat_score <= 2 ? "text-red-500" : roomInfo.csat_score === 3 ? "text-yellow-500" : "text-green-500"}`}>
                  <Star className="h-3 w-3 fill-current" />{roomInfo.csat_score}/5
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {roomInfo.contact_name && roomInfo.contact_id && (
                <button
                  onClick={() => setSelectedCompanyId(roomInfo.contact_id)}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  <Building2 className="h-3 w-3" />{roomInfo.contact_name}<ExternalLink className="h-2.5 w-2.5" />
                </button>
              )}
              {roomId && <ChatTagSelector roomId={roomId} compact />}
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 my-4">
          <ChatMessageList messages={messages} loading={loading} />
        </ScrollArea>

        {/* Internal note only */}
        <div className="border-t pt-3 space-y-2">
          <div className="text-xs text-yellow-600 flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {t("chat.workspace.internal_note")}
          </div>
          <div className="flex gap-2">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("chat.workspace.internal_placeholder")}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendNote()}
              disabled={sending}
            />
            <Button size="icon" onClick={handleSendNote} disabled={!note.trim() || sending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    {selectedCompanyId && (
      <CompanyDetailsSheet
        companyId={selectedCompanyId}
        onClose={() => setSelectedCompanyId(null)}
        canEdit={false}
        canDelete={false}
      />
    )}
  </>
  );
}
