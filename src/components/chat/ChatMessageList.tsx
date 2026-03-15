import { useEffect, useRef } from "react";
import { Loader2, BookOpen, ExternalLink, Trash2 } from "lucide-react";
import { FileMessage } from "@/components/chat/FileMessage";
import { renderTextWithLinks } from "@/utils/chatUtils";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChatMessage {
  id: string;
  content: string;
  sender_type: string;
  sender_name: string | null;
  is_internal: boolean;
  created_at: string;
  message_type?: string | null;
  metadata?: Record<string, any> | null;
  deleted_at?: string | null;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  onReply?: (msg: ChatMessage) => void;
  onDelete?: (msgId: string) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  typingUser?: string | null;
  visitorLastReadAt?: string | null;
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, "dd/MM/yyyy", { locale: ptBR });
}


export function ChatMessageList({ messages, loading, onReply, onDelete, hasMore, loadingMore, onLoadMore, typingUser, visitorLastReadAt }: ChatMessageListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sentinelRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Nenhuma mensagem ainda.
      </div>
    );
  }

  let lastDay = "";

  return (
    <div className="space-y-3 p-4">
      {hasMore && onLoadMore && (
        <div className="flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="text-xs py-1.5 px-4 border rounded-md hover:bg-muted/50 disabled:opacity-50 flex items-center gap-1 text-muted-foreground"
          >
            {loadingMore ? <Loader2 className="h-3 w-3 animate-spin" /> : "▲ Carregar anteriores"}
          </button>
        </div>
      )}
      {messages.map((msg) => {
        const isFile = msg.message_type === "file" && msg.metadata?.file_url;
        const isOwn = msg.sender_type !== "visitor";
        const msgDay = msg.created_at.slice(0, 10);
        let showDaySeparator = false;
        if (msgDay !== lastDay) {
          showDaySeparator = true;
          lastDay = msgDay;
        }

        // Check if content has a quoted reply
        const hasQuote = msg.content.startsWith("> ");
        let quoteText = "";
        let mainContent = msg.content;
        if (hasQuote) {
          const lines = msg.content.split("\n");
          const quoteLines: string[] = [];
          let i = 0;
          while (i < lines.length && lines[i].startsWith("> ")) {
            quoteLines.push(lines[i].slice(2));
            i++;
          }
          if (i < lines.length && lines[i].trim() === "") i++;
          quoteText = quoteLines.join("\n");
          mainContent = lines.slice(i).join("\n");
        }

        // For file messages, check if there's actual text content beyond the file name
        const hasTextWithFile = isFile && mainContent.trim() && mainContent.trim() !== msg.metadata?.file_name;

        return (
          <div key={msg.id}>
            {showDaySeparator && (
              <div className="flex items-center justify-center my-4">
                <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {getDayLabel(msg.created_at)}
                </span>
              </div>
            )}
            <div
              className={`flex ${msg.sender_type === "system" ? "justify-center" : msg.sender_type === "visitor" ? "justify-start" : "justify-end"} group`}
            >
              {msg.sender_type === "system" ? (
                <p className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200/60 rounded-full px-3 py-1.5 text-center max-w-[85%] my-1">
                  {mainContent || msg.content}
                </p>
              ) : msg.deleted_at ? (
                <div className="max-w-[75%] rounded-lg px-3 py-2 text-sm bg-muted/50 border border-dashed border-muted-foreground/20">
                  <p className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                    <Trash2 className="h-3 w-3" /> Mensagem apagada
                  </p>
                  <p className="text-[10px] opacity-50 mt-1 text-right">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ) : (
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  msg.is_internal
                    ? "bg-yellow-100 border border-yellow-300 text-yellow-900 dark:bg-yellow-900/30 dark:border-yellow-700/50 dark:text-yellow-100"
                    : msg.sender_type === "visitor"
                    ? "bg-muted"
                    : "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-medium opacity-70">
                    {msg.sender_name ?? msg.sender_type}
                  </span>
                  {msg.is_internal && (
                    <span className="text-[10px] font-medium text-yellow-700 dark:text-yellow-500">
                      (Nota interna)
                    </span>
                  )}
                </div>

                {hasQuote && quoteText && (
                  <div className={`text-[11px] rounded px-2 py-1 mb-1 border-l-2 ${
                    msg.sender_type === "visitor"
                      ? "bg-background/50 border-muted-foreground/30 text-muted-foreground"
                      : "bg-sky-200/50 border-sky-400/40 text-sky-800 dark:bg-sky-950/50 dark:border-sky-700/50 dark:text-sky-200"
                  }`}>
                    {quoteText}
                  </div>
                )}

                {msg.message_type === "help_article" && msg.metadata?.article_url ? (
                  <a
                    href={(msg.metadata as any).article_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block rounded-lg border p-3 mt-1 transition-shadow hover:shadow-md ${
                      isOwn ? "bg-primary-foreground/10 border-primary-foreground/20" : "bg-background/60 border-border"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <BookOpen className={`h-4 w-4 shrink-0 mt-0.5 ${isOwn ? "text-primary-foreground/70" : "text-primary"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs">{(msg.metadata as any).article_title}</p>
                        {(msg.metadata as any).article_subtitle && (
                          <p className={`text-[10px] mt-0.5 truncate ${isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {(msg.metadata as any).article_subtitle}
                          </p>
                        )}
                        <span className={`inline-flex items-center gap-1 text-[10px] mt-1.5 ${isOwn ? "text-primary-foreground/70" : "text-primary"}`}>
                          <ExternalLink className="h-3 w-3" /> Abrir artigo
                        </span>
                      </div>
                    </div>
                  </a>
                ) : isFile ? (
                  <>
                    <FileMessage
                      metadata={msg.metadata as { file_url: string; file_name: string; file_type: string; file_size?: number }}
                      isOwn={isOwn}
                    />
                    {hasTextWithFile && (
                      <p className="whitespace-pre-wrap mt-2">{renderTextWithLinks(hasQuote ? mainContent : mainContent, isOwn)}</p>
                    )}
                  </>
                ) : (
                  <p className="whitespace-pre-wrap">{renderTextWithLinks(hasQuote ? mainContent : msg.content, isOwn)}</p>
                )}

                <p className="text-[10px] opacity-50 mt-1 text-right flex items-center justify-end gap-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {isOwn && msg.sender_type !== "system" && (
                    <span className="inline-flex items-center">
                      {visitorLastReadAt && msg.created_at <= visitorLastReadAt ? (
                        <svg width="16" height="10" viewBox="0 0 16 10" fill="none" className="opacity-70">
                          <path d="M1 5l3 3L9 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M6 5l3 3L14 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-50">
                          <path d="M1 5l3 3L9 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                  )}
                </p>
              </div>

              )}
              {/* Reply button for visitor messages */}
              {msg.sender_type === "visitor" && onReply && !msg.is_internal && !msg.deleted_at && (
                <button
                  onClick={() => onReply(msg)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity self-center ml-1 text-[10px] text-muted-foreground hover:text-foreground px-1"
                  title="Responder"
                >
                  ↩
                </button>
              )}
              {/* Delete button for attendant messages */}
              {isOwn && onDelete && !msg.is_internal && !msg.deleted_at && msg.sender_type !== "system" && (
                <button
                  onClick={() => onDelete(msg.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity self-center ml-1 text-[10px] text-muted-foreground hover:text-destructive px-1"
                  title="Apagar mensagem"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}
      {typingUser && (
        <div className="flex items-center gap-2 px-1 py-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground italic">
            <span>{typingUser} digitando</span>
            <span className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          </div>
        </div>
      )}
      <div ref={sentinelRef} />
    </div>
  );
}
