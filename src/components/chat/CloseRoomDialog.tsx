import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertTriangle, Archive } from "lucide-react";
import { ChatTagSelector } from "@/components/chat/ChatTagSelector";
import { cn } from "@/lib/utils";

interface CloseRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (resolutionStatus: "resolved" | "pending" | "inactive" | "archived", note?: string) => void;
  roomId?: string | null;
}

const statusOptions = [
  { value: "resolved" as const, label: "Resolvido", icon: CheckCircle2, color: "bg-green-600 hover:bg-green-700 text-white", activeRing: "ring-green-500" },
  { value: "pending" as const, label: "Com pendência", icon: AlertTriangle, color: "bg-yellow-500 hover:bg-yellow-600 text-white", activeRing: "ring-yellow-500" },
  { value: "inactive" as const, label: "Inativar", icon: Archive, color: "bg-muted hover:bg-muted/80 text-foreground", activeRing: "ring-border" },
  { value: "archived" as const, label: "Arquivar", icon: Archive, color: "bg-blue-100 hover:bg-blue-200 text-blue-800", activeRing: "ring-blue-400" },
];

export function CloseRoomDialog({ open, onOpenChange, onConfirm, roomId }: CloseRoomDialogProps) {
  const [note, setNote] = useState("");
  const [closing, setClosing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"resolved" | "pending" | "inactive" | "archived">("resolved");

  const handleConfirm = async () => {
    setClosing(true);
    await onConfirm(selectedStatus, note.trim() || undefined);
    setNote("");
    setSelectedStatus("resolved");
    setClosing(false);
    onOpenChange(false);
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setSelectedStatus("resolved");
      setNote("");
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Como encerrar esta conversa?</DialogTitle>
          <DialogDescription>
            Selecione o status, adicione tags e uma nota opcional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status selection */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {statusOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = selectedStatus === opt.value;
              return (
                <Button
                  key={opt.value}
                  variant="outline"
                  className={cn(
                    "min-w-0 gap-1.5 h-10 text-xs font-medium transition-all",
                    isActive && `ring-2 ${opt.activeRing} ${opt.color}`
                  )}
                  onClick={() => setSelectedStatus(opt.value)}
                  disabled={closing}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{opt.label}</span>
                </Button>
              );
            })}
          </div>

          {/* Tags - available for all statuses */}
          {roomId && <ChatTagSelector roomId={roomId} compact />}

          {/* Note */}
          <Textarea
            placeholder="Observação de encerramento (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="resize-none"
          />

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={closing}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleConfirm}
              disabled={closing}
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
