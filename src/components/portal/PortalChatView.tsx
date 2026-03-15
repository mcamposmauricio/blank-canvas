import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, Send, MessageSquare, Loader2, Paperclip, FileText, Download, X, Star } from "lucide-react";
import { renderTextWithLinks } from "@/utils/chatUtils";
import { format } from "date-fns";
import { toast } from "sonner";
import PortalCSATForm from "./PortalCSATForm";
import type { WidgetConfig } from "@/pages/UserPortal";

interface PortalChatViewProps {
  roomId: string;
  visitorId: string;
  contactName: string;
  onBack: () => void;
  widgetConfig: WidgetConfig | null;
  allBusy: boolean;
  outsideHours: boolean;
}

interface ChatMessage {
  id: string;
  content: string;
  sender_type: string;
  sender_name: string | null;
  created_at: string;
  message_type?: string | null;
  metadata?: {
    file_url?: string;
    file_name?: string;
    file_type?: string;
    file_size?: number;
  } | null;
}

type ChatPhase = "waiting" | "chat" | "csat" | "closed";

const PAGE_SIZE = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function isImage(type: string) { return type.startsWith("image/"); }

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PortalChatView = ({ roomId, visitorId, contactName, onBack, widgetConfig, allBusy, outsideHours }: PortalChatViewProps) => {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<ChatPhase>("waiting");
  const [roomCsatScore, setRoomCsatScore] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async (before?: string) => {
    let query = supabase
      .from("chat_messages")
      .select("id, content, sender_type, sender_name, created_at, message_type, metadata")
      .eq("room_id", roomId)
      .eq("is_internal", false)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE + 1);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data } = await query;
    const items = (data as ChatMessage[]) ?? [];
    const hasMore = items.length > PAGE_SIZE;
    if (hasMore) items.pop();
    items.reverse();

    if (before) {
      setMessages((prev) => [...items, ...prev]);
    } else {
      setMessages(items);
    }
    setHasMoreMessages(hasMore);
  }, [roomId]);

  const loadMore = async () => {
    if (messages.length === 0 || loadingMore) return;
    setLoadingMore(true);
    await fetchMessages(messages[0].created_at);
    setLoadingMore(false);
  };

  // Fetch initial room status + messages
  useEffect(() => {
    const init = async () => {
      const { data: room } = await supabase
        .from("chat_rooms")
        .select("status, csat_score")
        .eq("id", roomId)
        .single();

      if (room) {
        if (room.status === "closed") {
          setRoomCsatScore(room.csat_score ?? null);
          setPhase(room.csat_score != null ? "closed" : "csat");
        } else if (room.status === "active") {
          setPhase("chat");
        } else {
          setPhase("waiting");
        }
      }

      await fetchMessages();
    };

    init();
  }, [roomId, fetchMessages]);

  // Realtime messages
  useEffect(() => {
    const channel = supabase
      .channel(`portal-msgs-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const msg = payload.new as any;
          if (!msg.is_internal) {
            setMessages((prev) => [...prev, {
              id: msg.id,
              content: msg.content,
              sender_type: msg.sender_type,
              sender_name: msg.sender_name,
              created_at: msg.created_at,
              message_type: msg.message_type,
              metadata: msg.metadata,
            }]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  // Realtime room status
  useEffect(() => {
    const channel = supabase
      .channel(`portal-room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          const room = payload.new as any;
          if (room.status === "active" && phase === "waiting") {
            setPhase("chat");
          } else if (room.status === "closed" && phase !== "closed") {
            setPhase(room.csat_score != null ? "closed" : "csat");
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, phase]);

  // Auto scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    });
  }, [messages]);

  const uploadFile = async (file: File) => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("chat-attachments")
      .upload(path, file, { contentType: file.type });

    if (error) {
      toast.error("Erro ao enviar arquivo");
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("chat-attachments")
      .getPublicUrl(path);

    return {
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    };
  };

  const handleFileSelect = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande. Limite: 10MB");
      return;
    }
    setPendingFile(file);
  };

  const handleSend = async () => {
    const hasContent = input.trim() || pendingFile;
    if (!hasContent || sending || uploading) return;

    let metadata: any = undefined;

    if (pendingFile) {
      setUploading(true);
      const result = await uploadFile(pendingFile);
      setUploading(false);
      if (!result) return;
      metadata = result;
    }

    const content = input.trim() || metadata?.file_name || "";
    setInput("");
    setPendingFile(null);
    setSending(true);

    await supabase.from("chat_messages").insert({
      room_id: roomId,
      sender_type: "visitor",
      sender_id: visitorId,
      sender_name: contactName,
      content,
      ...(metadata ? { message_type: "file", metadata } : {}),
    });

    setSending(false);
  };

  const handleCSATSubmit = async (score: number, comment: string) => {
    await supabase
      .from("chat_rooms")
      .update({ csat_score: score, csat_comment: comment || null })
      .eq("id", roomId);

    setPhase("closed");
  };

  const renderFileMessage = (msg: ChatMessage) => {
    const meta = msg.metadata;
    if (!meta?.file_url) return <p>{msg.content}</p>;

    if (isImage(meta.file_type || "")) {
      return (
        <div className="space-y-1 cursor-pointer" onClick={() => setLightboxUrl(meta.file_url!)}>
          <img
            src={meta.file_url}
            alt={meta.file_name}
            className="max-w-[220px] max-h-[180px] rounded-md object-cover"
            loading="lazy"
          />
          <p className="text-[10px] opacity-60 truncate max-w-[220px]">{meta.file_name}</p>
        </div>
      );
    }

    return (
      <a
        href={meta.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-md border p-2 hover:bg-muted/50 transition-colors"
      >
        <FileText className="h-6 w-6 shrink-0 opacity-60" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">{meta.file_name}</p>
          {meta.file_size && <p className="text-[10px] opacity-60">{formatFileSize(meta.file_size)}</p>}
        </div>
        <Download className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </a>
    );
  };

  const showCsat = widgetConfig?.show_csat ?? true;
  const allowFiles = widgetConfig?.allow_file_attachments ?? true;

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <p className="font-medium text-sm">
            {phase === "waiting" ? t("chat.portal.waiting") : phase === "chat" ? t("chat.portal.active_chat") : t("chat.portal.closed_chat")}
          </p>
        </div>
        <Badge variant={phase === "chat" ? "default" : phase === "waiting" ? "secondary" : "outline"}>
          {phase === "waiting" ? t("people.chatStatus.waiting") : phase === "chat" ? t("people.chatStatus.active") : t("people.chatStatus.closed")}
        </Badge>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-auto p-4" ref={scrollRef}>
        {/* Waiting state */}
        {phase === "waiting" && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full space-y-4 py-12">
            <div className={outsideHours || allBusy ? "" : "animate-pulse"}>
              <MessageSquare className="h-12 w-12 text-primary opacity-50" />
            </div>

            {outsideHours && (widgetConfig?.show_outside_hours_banner ?? true) ? (
              <div className="text-center space-y-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 max-w-xs">
                <p className="text-sm font-medium text-blue-800">
                  {widgetConfig?.outside_hours_title ?? "Estamos fora do horário de atendimento."}
                </p>
                <p className="text-xs text-blue-700">
                  {widgetConfig?.outside_hours_message ?? "Sua mensagem ficará registrada e responderemos assim que voltarmos."}
                </p>
              </div>
            ) : allBusy && (widgetConfig?.show_all_busy_banner ?? true) ? (
              <div className="text-center space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 max-w-xs">
                <p className="text-sm font-medium text-amber-800">
                  {widgetConfig?.all_busy_title ?? "Todos os atendentes estão ocupados no momento."}
                </p>
                <p className="text-xs text-amber-700">
                  {widgetConfig?.all_busy_message ?? "Você está na fila e será atendido em breve. Por favor, aguarde."}
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  {widgetConfig?.waiting_message ?? t("chat.portal.waiting")}
                </p>
                <p className="text-xs text-muted-foreground">{t("chat.portal.waiting_desc")}</p>
              </>
            )}
          </div>
        )}

        {/* Load more button */}
        {messages.length > 0 && hasMoreMessages && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full text-xs mb-3 py-2 px-3 border rounded-md hover:bg-muted/50 disabled:opacity-50 flex items-center justify-center gap-1 text-muted-foreground"
          >
            {loadingMore ? <Loader2 className="h-3 w-3 animate-spin" /> : "▲ Carregar anteriores"}
          </button>
        )}

        {/* Messages */}
        {messages.length > 0 && (
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
                  {msg.sender_type !== "visitor" && msg.sender_name && (
                    <p className="text-xs font-medium mb-1 opacity-70">{msg.sender_name}</p>
                  )}
                  {msg.message_type === "file" && msg.metadata?.file_url
                    ? <>
                        {renderFileMessage(msg)}
                        {msg.content && msg.content !== msg.metadata.file_name && (
                          <p className="mt-1 whitespace-pre-wrap" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{renderTextWithLinks(msg.content, msg.sender_type === "visitor")}</p>
                        )}
                      </>
                    : <p className="whitespace-pre-wrap" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{renderTextWithLinks(msg.content, msg.sender_type === "visitor")}</p>
                  }
                  <p className="text-xs opacity-60 mt-1">
                    {format(new Date(msg.created_at), "HH:mm")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CSAT */}
        {phase === "csat" && showCsat && (
          <PortalCSATForm onSubmit={handleCSATSubmit} />
        )}

        {phase === "csat" && !showCsat && (
          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Esta conversa foi encerrada.</p>
            <Button variant="outline" onClick={() => { setPhase("closed"); onBack(); }}>
              Concluir
            </Button>
          </div>
        )}

        {phase === "closed" && (
          <div className="mt-6 text-center text-sm text-muted-foreground py-4 space-y-2">
            <p>{t("chat.portal.thanks")}</p>
            {roomCsatScore != null && (
              <div className="flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map((v) => (
                  <Star key={v} className={`h-4 w-4 ${v <= roomCsatScore ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* File preview bar */}
      {phase === "chat" && pendingFile && (
        <div className="border-t px-3 py-2 flex items-center gap-2 bg-muted/30">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs truncate flex-1">{pendingFile.name}</span>
          <button
            onClick={() => {
              setPendingFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Input bar */}
      {phase === "chat" && (
        <div className="border-t p-3 flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
          {allowFiles && (
            <Button
              size="icon"
              variant="ghost"
              className="shrink-0 h-9 w-9"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          )}
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chat.portal.type_message")}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={uploading}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={(!input.trim() && !pendingFile) || sending || uploading}
          >
            {sending || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="Preview"
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortalChatView;
