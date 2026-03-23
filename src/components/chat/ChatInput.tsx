import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Eye, Loader2, Paperclip, X, FileText, Zap, Keyboard, BookOpen } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { EmojiPicker } from "@/components/chat/EmojiPicker";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// Module-level draft storage — survives component unmount, clears on F5
const draftsMap = new Map<string, string>();

/** Clear stored draft for a specific room (call when room is closed) */
export function clearDraft(roomId: string) {
  draftsMap.delete(roomId);
}

interface Macro {
  id: string;
  title: string;
  content: string;
  shortcut: string | null;
  is_private?: boolean;
  user_id?: string;
}

interface HelpArticle {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  body_snippet?: string | null;
}

interface ChatInputProps {
  onSend: (
    content: string,
    isInternal?: boolean,
    metadata?: Record<string, any>,
    messageType?: string
  ) => Promise<void>;
  roomId?: string | null;
  senderName?: string | null;
}

export function ChatInput({ onSend, roomId, senderName }: ChatInputProps) {
  const { t } = useLanguage();
  const { tenantId } = useAuth();
  const [value, setValue] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [macrosOpen, setMacrosOpen] = useState(false);
  const [macroFilter, setMacroFilter] = useState("");
  const [articlesOpen, setArticlesOpen] = useState(false);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [articlesLoaded, setArticlesLoaded] = useState(false);
  const [articleFilter, setArticleFilter] = useState("");
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingBroadcast = useRef<number>(0);
  const prevRoomIdRef = useRef<string | null | undefined>(undefined);
  const valueRef = useRef(value);
  const macrosPopupRef = useRef<HTMLDivElement>(null);
  const articlesPopupRef = useRef<HTMLDivElement>(null);
  const slashPosRef = useRef<number>(-1);

  useEffect(() => {
    const fetchMacros = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      let query = supabase.from("chat_macros").select("id, title, content, shortcut");
      if (userId) {
        query = query.or(`is_private.eq.false,user_id.eq.${userId}`);
      } else {
        query = query.eq("is_private", false);
      }
      const { data } = await query;
      if (data) setMacros(data as Macro[]);
    };
    fetchMacros();
  }, []);

  // Fetch tenant slug for article URL
  useEffect(() => {
    if (!tenantId) return;
    supabase.from("tenants").select("slug").eq("id", tenantId).maybeSingle().then(({ data }) => {
      if (data) setTenantSlug((data as any).slug);
    });
  }, [tenantId]);

  const loadArticles = useCallback(async () => {
    if (articlesLoaded || !tenantId) return;
    const { data } = await supabase
      .from("help_articles")
      .select("id, title, subtitle, slug")
      .eq("tenant_id", tenantId)
      .eq("status", "published")
      .order("title");
    if (data) setArticles(data);
    setArticlesLoaded(true);
  }, [tenantId, articlesLoaded]);

  const searchArticles = useCallback(async (query: string) => {
    if (!tenantId || !query.trim()) return;
    const { data } = await supabase.rpc("search_help_articles", {
      p_tenant_id: tenantId,
      p_query: query.trim(),
      p_limit: 10,
    });
    if (data) setArticles(data as HelpArticle[]);
  }, [tenantId]);

  const handleOpenArticles = () => {
    loadArticles();
    setArticleFilter("");
    setArticlesOpen(true);
  };

  const handleSelectArticle = (article: HelpArticle) => {
    const articleUrl = `${window.location.origin}/${tenantSlug}/help/a/${article.slug}`;
    const metadata = {
      article_id: article.id,
      article_title: article.title,
      article_subtitle: article.subtitle || "",
      article_url: articleUrl,
      article_slug: article.slug,
      tenant_slug: tenantSlug,
    };
    setArticlesOpen(false);
    onSend(article.title, false, metadata, "help_article");
  };

  // Debounced article search
  useEffect(() => {
    if (!articlesOpen) return;
    if (!articleFilter.trim()) {
      // Reset to full list
      setArticlesLoaded(false);
      loadArticles();
      return;
    }
    const timer = setTimeout(() => searchArticles(articleFilter), 300);
    return () => clearTimeout(timer);
  }, [articleFilter, articlesOpen]);

  const filteredArticles = articles;

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = 200;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Keep valueRef in sync so cleanup always has latest text
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Helper: persist or clear draft for a room
  const persistDraft = useCallback((rid: string, text: string) => {
    if (text.trim()) draftsMap.set(rid, text);
    else draftsMap.delete(rid);
  }, []);

  // Draft persistence per room — using module-level Map
  useEffect(() => {
    const prevId = prevRoomIdRef.current;
    if (prevId !== undefined && prevId !== roomId) {
      // Save draft for previous room using ref (always fresh)
      if (prevId) persistDraft(prevId, valueRef.current);
      // Restore draft for new room
      const draft = roomId ? (draftsMap.get(roomId) ?? "") : "";
      setValue(draft);
      setMacrosOpen(false);
      setMacroFilter("");
      setArticlesOpen(false);
    }
    prevRoomIdRef.current = roomId;
  }, [roomId, persistDraft]);

  // Also save draft on unmount using valueRef
  useEffect(() => {
    return () => {
      const currentRoomId = prevRoomIdRef.current;
      if (currentRoomId) persistDraft(currentRoomId, valueRef.current);
    };
  }, [persistDraft]);

  // Click-outside to close macros/articles popups
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (macrosOpen && macrosPopupRef.current && !macrosPopupRef.current.contains(e.target as Node)) {
        setMacrosOpen(false);
      }
      if (articlesOpen && articlesPopupRef.current && !articlesPopupRef.current.contains(e.target as Node)) {
        setArticlesOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [macrosOpen, articlesOpen]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  const handleFileSelect = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande. Limite: 10MB");
      return;
    }
    setPendingFile(file);
    if (IMAGE_TYPES.includes(file.type)) {
      setFilePreviewUrl(URL.createObjectURL(file));
    } else {
      setFilePreviewUrl(null);
    }
  };

  const clearFile = () => {
    setPendingFile(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFile = async (file: File): Promise<{ file_url: string; file_name: string; file_type: string; file_size: number } | null> => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("chat-attachments").upload(path, file, { contentType: file.type });
    if (error) {
      toast.error("Erro ao enviar arquivo");
      return null;
    }
    const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    return { file_url: urlData.publicUrl, file_name: file.name, file_type: file.type, file_size: file.size };
  };

  const handleSend = async () => {
    if ((!value.trim() && !pendingFile) || sending || uploading) return;
    setSending(true);

    let metadata: { file_url: string; file_name: string; file_type: string; file_size: number } | undefined;
    if (pendingFile) {
      setUploading(true);
      const result = await uploadFile(pendingFile);
      setUploading(false);
      if (!result) { setSending(false); return; }
      metadata = result;
    }

    const content = value.trim() || metadata?.file_name || "";
    await onSend(content, isInternal, metadata);
    setValue("");
    // Clear draft for this room after sending
    if (roomId) draftsMap.delete(roomId);
    clearFile();
    setSending(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const commandListRef = useRef<HTMLDivElement>(null);
  const articleListRef = useRef<HTMLDivElement>(null);

  const handleBoldToggle = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) return;
    const selected = value.slice(start, end);
    // If already wrapped in *, unwrap
    if (start >= 1 && value[start - 1] === "*" && end < value.length && value[end] === "*") {
      const newVal = value.slice(0, start - 1) + selected + value.slice(end + 1);
      setValue(newVal);
      if (roomId) persistDraft(roomId, newVal);
      setTimeout(() => { el.focus(); el.setSelectionRange(start - 1, end - 1); }, 0);
    } else {
      const newVal = value.slice(0, start) + `*${selected}*` + value.slice(end);
      setValue(newVal);
      if (roomId) persistDraft(roomId, newVal);
      setTimeout(() => { el.focus(); el.setSelectionRange(start + 1, end + 1); }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // When articles popup is open, delegate navigation
    if (articlesOpen) {
      if (e.key === "Escape") { e.preventDefault(); setArticlesOpen(false); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const cmdList = articleListRef.current;
        if (cmdList) {
          const items = Array.from(cmdList.querySelectorAll("[cmdk-item]")) as HTMLElement[];
          const selected = cmdList.querySelector("[data-selected='true']") as HTMLElement | null;
          let idx = selected ? items.indexOf(selected) : -1;
          if (e.key === "ArrowDown") idx = Math.min(idx + 1, items.length - 1);
          else idx = Math.max(idx - 1, 0);
          items.forEach(item => item.setAttribute("data-selected", "false"));
          if (items[idx]) { items[idx].setAttribute("data-selected", "true"); items[idx].scrollIntoView({ block: "nearest" }); }
        }
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const cmdList = articleListRef.current;
        if (cmdList) {
          const selected = cmdList.querySelector("[data-selected='true']") as HTMLElement | null;
          if (selected) { selected.click(); return; }
        }
        setArticlesOpen(false);
        return;
      }
      return;
    }

    // When macros popup is open, delegate navigation keys
    if (macrosOpen) {
      if (e.key === "Escape") {
        e.preventDefault();
        setMacrosOpen(false);
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const cmdList = commandListRef.current;
        if (cmdList) {
          const items = cmdList.querySelectorAll("[cmdk-item]");
          const selectedItem = cmdList.querySelector("[data-selected='true']") as HTMLElement | null;
          const itemsArr = Array.from(items) as HTMLElement[];
          let currentIdx = selectedItem ? itemsArr.indexOf(selectedItem) : -1;
          
          if (e.key === "ArrowDown") currentIdx = Math.min(currentIdx + 1, itemsArr.length - 1);
          else currentIdx = Math.max(currentIdx - 1, 0);
          
          itemsArr.forEach(item => item.setAttribute("data-selected", "false"));
          if (itemsArr[currentIdx]) {
            itemsArr[currentIdx].setAttribute("data-selected", "true");
            itemsArr[currentIdx].scrollIntoView({ block: "nearest" });
          }
        }
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const cmdList = commandListRef.current;
        if (cmdList) {
          const selected = cmdList.querySelector("[data-selected='true']") as HTMLElement | null;
          if (selected) {
            selected.click();
            return;
          }
        }
        setMacrosOpen(false);
        handleSend();
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "i" && e.shiftKey && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setIsInternal((prev) => !prev);
    }
    if (e.key === "b" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault();
      handleBoldToggle();
    }
  };

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setValue(v);
    autoResize();
    // Persist draft immediately on every keystroke
    if (roomId) persistDraft(roomId, v);

    if (roomId && senderName && Date.now() - lastTypingBroadcast.current > 2000) {
      lastTypingBroadcast.current = Date.now();
      supabase.channel(`typing-${roomId}`).send({
        type: "broadcast",
        event: "typing",
        payload: { name: senderName, user_id: undefined },
      }).catch(() => {});
    }

    // Detect slash command anywhere in text (at cursor position)
    const cursorPos = e.target.selectionStart ?? v.length;
    const textBeforeCursor = v.slice(0, cursorPos);
    const slashMatch = textBeforeCursor.match(/(?:^|\n|\s)(\/\S*)$/);

    if (slashMatch && macros.length > 0) {
      const matchedPart = slashMatch[1]; // e.g. "/hel"
      const slashPos = cursorPos - matchedPart.length;
      slashPosRef.current = slashPos;
      setMacroFilter(matchedPart.slice(1).toLowerCase()); // remove leading "/"
      setMacrosOpen(true);
    } else {
      setMacrosOpen(false);
      setMacroFilter("");
      slashPosRef.current = -1;
    }
  };

  const handleSelectMacro = (macro: Macro) => {
    const el = textareaRef.current;
    const cursorPos = el?.selectionStart ?? value.length;
    const slashPos = slashPosRef.current;

    if (slashPos >= 0) {
      // Insert at cursor, replacing the /command
      const before = value.slice(0, slashPos);
      const after = value.slice(cursorPos);
      
      // Add line breaks if needed
      const prefix = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
      const suffix = after.length > 0 && !after.startsWith("\n") ? "\n" : "";
      
      const newValue = before + prefix + macro.content + suffix + after;
      setValue(newValue);
      
      // Position cursor after inserted content
      const newCursorPos = (before + prefix + macro.content + suffix).length;
      setTimeout(() => {
        if (el) {
          el.focus();
          el.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    } else {
      // Fallback: append
      setValue(value + macro.content);
      setTimeout(() => el?.focus(), 0);
    }

    setMacrosOpen(false);
    setMacroFilter("");
    slashPosRef.current = -1;
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) handleFileSelect(file);
        return;
      }
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newValue = value.slice(0, start) + emoji + value.slice(end);
      setValue(newValue);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setValue(value + emoji);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  // Filter macros by the current slash command text
  const filteredMacros = macroFilter
    ? macros.filter(m => m.title.toLowerCase().includes(macroFilter) || (m.shortcut && m.shortcut.toLowerCase().includes(macroFilter)))
    : macros;

  return (
    <div className="border-t p-3 space-y-2 min-w-0" onDrop={handleDrop} onDragOver={handleDragOver}>
      {isInternal && (
        <div className="text-xs text-yellow-600 flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {t("chat.workspace.internal_note")}
        </div>
      )}

      {pendingFile && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2">
          {filePreviewUrl ? (
            <img src={filePreviewUrl} alt={pendingFile.name} className="h-12 w-12 rounded object-cover" />
          ) : (
            <FileText className="h-8 w-8 text-muted-foreground" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{pendingFile.name}</p>
            <p className="text-[10px] text-muted-foreground">{(pendingFile.size / 1024).toFixed(0)} KB</p>
          </div>
          <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={clearFile}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {macrosOpen && filteredMacros.length > 0 && (
        <div className="rounded-md border bg-popover shadow-md max-h-48 overflow-auto" ref={(el) => { (commandListRef as any).current = el; (macrosPopupRef as any).current = el; }}>
          <div className="flex justify-end p-1">
            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setMacrosOpen(false)}><X className="h-3 w-3" /></Button>
          </div>
          <Command shouldFilter={false}>
            <CommandList>
              <CommandEmpty className="text-xs p-2">Nenhuma macro encontrada</CommandEmpty>
              <CommandGroup>
                {filteredMacros.map((macro, idx) => (
                  <CommandItem key={macro.id} onSelect={() => handleSelectMacro(macro)} className="text-xs cursor-pointer" data-selected={idx === 0 ? "true" : "false"}>
                    <div className="flex items-center gap-2 w-full">
                      <Zap className="h-3 w-3 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{macro.title}</span>
                        {macro.shortcut && <span className="ml-1 text-muted-foreground">/{macro.shortcut}</span>}
                        <p className="text-muted-foreground truncate text-[10px]">{macro.content.slice(0, 60)}</p>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}

      {/* Articles popup */}
      {articlesOpen && (
        <div className="rounded-md border bg-popover shadow-md max-h-56 overflow-hidden flex flex-col" ref={(el) => { (articleListRef as any).current = el; (articlesPopupRef as any).current = el; }}>
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3 py-1.5">
              <BookOpen className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder={t("chat.articles.search")}
                value={articleFilter}
                onChange={(e) => setArticleFilter(e.target.value)}
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={() => setArticlesOpen(false)}><X className="h-3 w-3" /></Button>
            </div>
            <CommandList className="max-h-44 overflow-auto">
              <CommandEmpty className="text-xs p-3 text-center text-muted-foreground">{t("chat.articles.empty")}</CommandEmpty>
              <CommandGroup>
                {filteredArticles.map((article, idx) => (
                  <CommandItem
                    key={article.id}
                    onSelect={() => handleSelectArticle(article)}
                    className="text-xs cursor-pointer px-3 py-2"
                    data-selected={idx === 0 ? "true" : "false"}
                  >
                    <div className="flex items-start gap-2 w-full">
                      <BookOpen className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground">{article.title}</span>
                        {article.subtitle && (
                          <p className="text-muted-foreground truncate text-[10px] mt-0.5">{article.subtitle}</p>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}

      <div className="flex gap-2 items-end flex-wrap min-w-0">
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 h-7 w-7 rounded text-xs font-bold"
          onClick={handleBoldToggle}
          title="Negrito (Ctrl+B)"
          type="button"
        >
          B
        </Button>
        <Button
          size="icon"
          variant={isInternal ? "default" : "ghost"}
          className="shrink-0 h-9 w-9"
          onClick={() => setIsInternal(!isInternal)}
          title={`${t("chat.workspace.toggle_internal")} (Ctrl+Shift+I)`}
        >
          <Eye className="h-4 w-4" />
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 h-9 w-9"
          onClick={() => fileInputRef.current?.click()}
          title="Anexar arquivo"
          disabled={uploading}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <EmojiPicker onSelect={handleEmojiSelect} />

        <Popover open={false}>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="shrink-0 h-9 w-9"
              onClick={() => {
                // Insert "/" at cursor position
                const el = textareaRef.current;
                if (el) {
                  const start = el.selectionStart;
                  const newVal = value.slice(0, start) + "/" + value.slice(start);
                  setValue(newVal);
                  slashPosRef.current = start;
                  setMacroFilter("");
                  setMacrosOpen(true);
                  setTimeout(() => {
                    el.focus();
                    el.setSelectionRange(start + 1, start + 1);
                  }, 0);
                } else {
                  setValue(value + "/");
                  setMacrosOpen(true);
                }
              }}
              title="Macros (digite /)"
            >
              <Zap className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </Popover>

        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 h-9 w-9"
          onClick={handleOpenArticles}
          title={t("chat.articles.title")}
        >
          <BookOpen className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="shrink-0 h-9 w-9"
              title="Atalhos de teclado"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="start" side="top">
            <p className="text-xs font-semibold mb-2">Atalhos de teclado</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span>Enviar mensagem</span><kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">Enter</kbd></div>
              <div className="flex justify-between"><span>Nova linha</span><kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">Shift+Enter</kbd></div>
              <div className="flex justify-between"><span>Negrito</span><kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">Ctrl+B</kbd></div>
              <div className="flex justify-between"><span>Nota interna</span><kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">Ctrl+Shift+I</kbd></div>
              <div className="flex justify-between"><span>Macros</span><kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">/</kbd></div>
            </div>
          </PopoverContent>
        </Popover>

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder={isInternal ? t("chat.workspace.internal_placeholder") : t("chat.workspace.message_placeholder")}
          onKeyDown={handleKeyDown}
          disabled={sending}
          rows={1}
          className="min-h-[36px] max-h-[200px] resize-none py-2"
        />
        <Button
          size="icon"
          className="shrink-0 h-9 w-9"
          onClick={handleSend}
          disabled={(!value.trim() && !pendingFile) || sending || uploading}
        >
          {sending || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
