import { useState } from "react";
import {
  MessageSquare, X, Clock, Users, Loader2,
  Plus, ArrowLeft, Star, Paperclip, Send, CheckCircle2,
} from "lucide-react";

interface WidgetPreviewProps {
  position: "left" | "right";
  primaryColor: string;
  companyName: string;
  buttonShape?: "circle" | "square";
  showEmailField?: boolean;
  showPhoneField?: boolean;
  formIntroText?: string;
  showOutsideHoursBanner?: boolean;
  outsideHoursTitle?: string;
  outsideHoursMessage?: string;
  showAllBusyBanner?: boolean;
  allBusyTitle?: string;
  allBusyMessage?: string;
  waitingMessage?: string;
}

type PreviewTab = "form" | "history" | "outside_hours" | "all_busy" | "waiting" | "chat" | "csat" | "closed";

const tabGroups: { label: string; tabs: { id: PreviewTab; label: string }[] }[] = [
  {
    label: "Entrada",
    tabs: [
      { id: "form", label: "Formulário" },
      { id: "history", label: "Histórico" },
    ],
  },
  {
    label: "Status",
    tabs: [
      { id: "outside_hours", label: "Fora do horário" },
      { id: "all_busy", label: "Ocupados" },
      { id: "waiting", label: "Aguardando" },
    ],
  },
  {
    label: "Conversa",
    tabs: [
      { id: "chat", label: "Conversa" },
      { id: "csat", label: "Avaliação" },
      { id: "closed", label: "Encerrado" },
    ],
  },
];

const mockMessages = [
  { sender: "system" as const, content: "Você foi conectado com Maria" },
  { sender: "attendant" as const, name: "Maria", content: "Olá! Como posso ajudar?", time: "14:30" },
  { sender: "visitor" as const, content: "Preciso de ajuda com meu pedido", time: "14:31" },
  { sender: "attendant" as const, name: "Maria", content: "Claro! Qual o número do pedido?", time: "14:31" },
  { sender: "visitor" as const, content: "Pedido #12345", time: "14:32" },
];

const getHeaderSubtitle = (tab: PreviewTab): string => {
  switch (tab) {
    case "history": return "Suas conversas";
    case "chat": return "Chat ativo";
    case "waiting": return "Aguardando...";
    case "csat": return "Avaliação";
    case "closed": return "Encerrado";
    default: return "Suporte";
  }
};

const showBackArrow = (tab: PreviewTab) =>
  tab === "chat" || tab === "csat" || tab === "closed" || tab === "waiting";

const WidgetPreview = ({
  position,
  primaryColor,
  companyName,
  buttonShape = "circle",
  showEmailField = true,
  showPhoneField = true,
  formIntroText = "Preencha seus dados para iniciar o atendimento.",
  showOutsideHoursBanner = true,
  outsideHoursTitle = "Estamos fora do horário de atendimento.",
  outsideHoursMessage = "Sua mensagem ficará registrada e responderemos assim que voltarmos.",
  showAllBusyBanner = true,
  allBusyTitle = "Todos os atendentes estão ocupados no momento.",
  allBusyMessage = "Você está na fila e será atendido em breve. Por favor, aguarde.",
  waitingMessage = "Aguardando atendimento...",
}: WidgetPreviewProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("form");
  const [csatRating, setCsatRating] = useState(3);

  return (
    <div className="space-y-3">
      {/* Tab groups */}
      <div className="space-y-1.5">
        {tabGroups.map((group) => (
          <div key={group.label} className="flex items-center gap-1 flex-wrap">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider w-14 shrink-0">{group.label}</span>
            {group.tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setPreviewTab(tab.id); setIsOpen(true); }}
                className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                  previewTab === tab.id && isOpen
                    ? "border-transparent text-white"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
                style={previewTab === tab.id && isOpen ? { backgroundColor: primaryColor } : {}}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ))}
        {isOpen && (
          <button
            onClick={() => setIsOpen(false)}
            className="text-[10px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors ml-14"
          >
            Fechar preview
          </button>
        )}
      </div>

      <div className="relative w-full h-[420px] bg-muted/50 rounded-lg border overflow-hidden">
        {/* Mock browser bar */}
        <div className="bg-muted px-4 py-2 border-b flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-destructive/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-400/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/50" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground text-center">
              www.seusite.com.br
            </div>
          </div>
        </div>

        {/* Mock page content */}
        <div className="p-6 space-y-3">
          <div className="h-4 w-3/4 bg-muted rounded" />
          <div className="h-3 w-full bg-muted rounded" />
          <div className="h-3 w-5/6 bg-muted rounded" />
          <div className="h-20 w-full bg-muted rounded mt-4" />
          <div className="h-3 w-2/3 bg-muted rounded" />
        </div>

        {/* Widget FAB */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className={`absolute bottom-4 ${buttonShape === "square" ? "rounded-lg" : "rounded-full"} shadow-lg flex items-center justify-center transition-transform hover:scale-110`}
            style={{
              ...(position === "right" ? { right: "16px" } : { left: "16px" }),
              width: "48px",
              height: "48px",
              backgroundColor: primaryColor,
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        )}

        {/* Widget Panel */}
        {isOpen && (
          <div
            className="absolute bottom-4 w-[300px] bg-background rounded-xl shadow-2xl border overflow-hidden flex flex-col"
            style={{
              ...(position === "right" ? { right: "16px" } : { left: "16px" }),
              height: "350px",
            }}
          >
            {/* Header */}
            <div
              className="p-3 flex items-center gap-2 shrink-0"
              style={{ backgroundColor: primaryColor, color: "#fff" }}
            >
              {showBackArrow(previewTab) ? (
                <ArrowLeft className="h-4 w-4 opacity-80" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold block truncate">{companyName || "Suporte"}</span>
                <span className="text-[9px] opacity-80 block">{getHeaderSubtitle(previewTab)}</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-0.5 rounded-full hover:bg-white/20"
                style={{ color: "#fff" }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">

              {/* FORM */}
              {previewTab === "form" && (
                <div className="flex-1 p-3 space-y-2 overflow-hidden">
                  <p className="text-[10px] text-muted-foreground">{formIntroText}</p>
                  <div className="h-6 w-full bg-muted rounded border text-[9px] px-2 flex items-center text-muted-foreground">Nome *</div>
                  {showEmailField && (
                    <div className="h-6 w-full bg-muted rounded border text-[9px] px-2 flex items-center text-muted-foreground">Email</div>
                  )}
                  {showPhoneField && (
                    <div className="h-6 w-full bg-muted rounded border text-[9px] px-2 flex items-center text-muted-foreground">Telefone</div>
                  )}
                  <div
                    className="h-7 w-full rounded flex items-center justify-center text-[10px] text-white font-medium mt-1"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Iniciar Conversa
                  </div>
                </div>
              )}

              {/* HISTORY */}
              {previewTab === "history" && (
                <div className="flex-1 p-2.5 space-y-2 overflow-auto">
                  <button
                    className="w-full h-7 rounded-md flex items-center justify-center gap-1 text-[10px] text-white font-medium"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Plus className="h-3 w-3" /> Novo Chat
                  </button>

                  {/* Mock conversation cards */}
                  <div className="rounded-lg border p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" style={{ color: primaryColor }} />
                        <span className="text-[9px] font-medium">Em andamento</span>
                      </div>
                      <span className="text-[8px] text-muted-foreground">Hoje 14:30</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground truncate">Preciso de ajuda com meu pedido...</p>
                  </div>

                  <div className="rounded-lg border p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-600 font-medium">Pendente</span>
                      <span className="text-[8px] text-muted-foreground">Ontem</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground truncate">Estamos analisando sua solicitação...</p>
                    <button className="text-[9px] font-medium" style={{ color: primaryColor }}>Retomar conversa →</button>
                  </div>

                  <div className="rounded-lg border p-2 space-y-1 opacity-70">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span className="text-[9px] font-medium">Encerrado</span>
                      </div>
                      <span className="text-[8px] text-muted-foreground">15/02</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground truncate">Obrigado, problema resolvido!</p>
                  </div>
                </div>
              )}

              {/* OUTSIDE HOURS */}
              {previewTab === "outside_hours" && (
                <div className="flex-1 p-3 flex flex-col items-center justify-center text-center space-y-2">
                  {showOutsideHoursBanner ? (
                    <>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                        <Clock className="h-4 w-4" style={{ color: primaryColor }} />
                      </div>
                      <p className="text-[10px] font-semibold leading-tight">{outsideHoursTitle}</p>
                      <p className="text-[9px] text-muted-foreground leading-relaxed">{outsideHoursMessage}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] font-semibold text-muted-foreground">Banner desativado</p>
                      <p className="text-[9px] text-muted-foreground">O formulário será exibido mesmo fora do horário.</p>
                    </>
                  )}
                </div>
              )}

              {/* ALL BUSY */}
              {previewTab === "all_busy" && (
                <div className="flex-1 p-3 flex flex-col items-center justify-center text-center space-y-2">
                  {showAllBusyBanner ? (
                    <>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                        <Users className="h-4 w-4" style={{ color: primaryColor }} />
                      </div>
                      <p className="text-[10px] font-semibold leading-tight">{allBusyTitle}</p>
                      <p className="text-[9px] text-muted-foreground leading-relaxed">{allBusyMessage}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] font-semibold text-muted-foreground">Banner desativado</p>
                      <p className="text-[9px] text-muted-foreground">O chat permanece disponível mesmo com todos ocupados.</p>
                    </>
                  )}
                </div>
              )}

              {/* WAITING */}
              {previewTab === "waiting" && (
                <div className="flex-1 p-3 flex flex-col items-center justify-center text-center space-y-2">
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: primaryColor }} />
                  <p className="text-[10px] text-muted-foreground">{waitingMessage}</p>
                </div>
              )}

              {/* CHAT */}
              {previewTab === "chat" && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 p-2.5 space-y-2 overflow-auto">
                    {mockMessages.map((msg, i) => {
                      if (msg.sender === "system") {
                        return (
                          <div key={i} className="flex justify-center">
                            <span className="text-[8px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              {msg.content}
                            </span>
                          </div>
                        );
                      }
                      const isVisitor = msg.sender === "visitor";
                      return (
                        <div key={i} className={`flex flex-col ${isVisitor ? "items-end" : "items-start"}`}>
                          {!isVisitor && (
                            <span className="text-[8px] text-muted-foreground mb-0.5 ml-1">{msg.name}</span>
                          )}
                          <div
                            className={`max-w-[80%] px-2.5 py-1.5 rounded-xl text-[10px] leading-snug ${
                              isVisitor ? "text-white rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"
                            }`}
                            style={isVisitor ? { backgroundColor: primaryColor } : {}}
                          >
                            {msg.content}
                          </div>
                          <span className="text-[7px] text-muted-foreground mt-0.5 mx-1">{msg.time}</span>
                        </div>
                      );
                    })}
                    {/* Typing indicator */}
                    <div className="flex flex-col items-start">
                      <span className="text-[8px] text-muted-foreground mb-0.5 ml-1">Maria</span>
                      <div className="bg-muted px-3 py-2 rounded-xl rounded-bl-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                  {/* Input bar */}
                  <div className="border-t px-2.5 py-2 flex items-center gap-2 shrink-0">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="flex-1 h-6 bg-muted rounded-md border text-[9px] px-2 flex items-center text-muted-foreground">
                      Digite sua mensagem...
                    </div>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                      <Send className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>
              )}

              {/* CSAT */}
              {previewTab === "csat" && (
                <div className="flex-1 p-3 flex flex-col items-center justify-center text-center space-y-3">
                  <p className="text-[11px] font-semibold">Avalie o atendimento</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => setCsatRating(s)}>
                        <Star
                          className="h-5 w-5 transition-colors"
                          fill={s <= csatRating ? primaryColor : "transparent"}
                          stroke={s <= csatRating ? primaryColor : "currentColor"}
                          strokeWidth={1.5}
                        />
                      </button>
                    ))}
                  </div>
                  <div className="w-full h-12 bg-muted rounded border text-[9px] px-2 pt-1.5 text-left text-muted-foreground">
                    Comentário (opcional)
                  </div>
                  <div className="flex gap-2 w-full">
                    <div className="flex-1 h-7 rounded-md border border-border flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                      Pular
                    </div>
                    <div
                      className="flex-1 h-7 rounded-md flex items-center justify-center text-[10px] text-white font-medium"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Enviar
                    </div>
                  </div>
                </div>
              )}

              {/* CLOSED */}
              {previewTab === "closed" && (
                <div className="flex-1 p-3 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                    <CheckCircle2 className="h-5 w-5" style={{ color: primaryColor }} />
                  </div>
                  <p className="text-[11px] font-semibold leading-tight">Obrigado pelo feedback!</p>
                  <p className="text-[9px] text-muted-foreground">Esta conversa foi encerrada.</p>
                  <button
                    className="text-[10px] font-medium mt-1"
                    style={{ color: primaryColor }}
                  >
                    ← Voltar ao histórico
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WidgetPreview;
