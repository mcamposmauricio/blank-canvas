import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User } from "lucide-react";

interface Attendant {
  id: string;
  display_name: string;
  status: string | null;
  user_id: string;
  active_conversations: number | null;
  max_conversations: number | null;
}

interface ReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAttendantId: string | null;
  onConfirm: (attendantId: string, attendantName: string) => Promise<void>;
}

export function ReassignDialog({ open, onOpenChange, currentAttendantId, onConfirm }: ReassignDialogProps) {
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelected(null);
    supabase
      .from("attendant_profiles")
      .select("id, display_name, status, user_id, active_conversations, max_conversations")
      .then(({ data }) => {
        const list = (data ?? []) as Attendant[];
        setAttendants(list.filter((a) => a.id !== currentAttendantId));
        setLoading(false);
      });
  }, [open, currentAttendantId]);

  const handleConfirm = async () => {
    if (!selected) return;
    const att = attendants.find((a) => a.id === selected);
    if (!att) return;
    setConfirming(true);
    await onConfirm(att.id, att.display_name);
    setConfirming(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Transferir conversa</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : attendants.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum outro atendente disponível</p>
        ) : (
          <ScrollArea className="max-h-60">
            <div className="space-y-1">
              {attendants.map((att) => (
                <button
                  key={att.id}
                  onClick={() => setSelected(att.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-md text-sm transition-colors ${
                    selected === att.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                   <div className="flex-1 text-left">
                    <p className="font-medium">{att.display_name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">{att.status === "online" ? "Online" : "Offline"}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {att.active_conversations ?? 0}/{att.max_conversations ?? "∞"} conversas
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" disabled={!selected || confirming} onClick={handleConfirm}>
            {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Transferir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
