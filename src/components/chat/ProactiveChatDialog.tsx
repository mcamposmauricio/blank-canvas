import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, MessageSquare, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Company {
  id: string;
  name: string;
}

interface CompanyContact {
  id: string;
  name: string;
  email: string;
  company_id: string;
  chat_visitor_id: string | null;
}

interface ProactiveChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  attendantId: string;
  attendantName: string;
}

const ProactiveChatDialog = ({ open, onOpenChange, userId, attendantId, attendantName }: ProactiveChatDialogProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const selectedContact = contacts.find(c => c.id === selectedContactId);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("contacts")
      .select("id, name")
      .eq("is_company", true)
      .order("name")
      .then(({ data }) => setCompanies(data ?? []));
  }, [open]);

  useEffect(() => {
    if (!selectedCompanyId) { setContacts([]); return; }
    supabase
      .from("company_contacts")
      .select("id, name, email, company_id, chat_visitor_id")
      .eq("company_id", selectedCompanyId)
      .order("name")
      .then(({ data }) => setContacts(data ?? []));
  }, [selectedCompanyId]);

  const handleCreate = async () => {
    if (!selectedContactId || !message.trim()) return;
    setCreating(true);

    const contact = contacts.find((c) => c.id === selectedContactId);
    if (!contact) { setCreating(false); return; }

    try {
      let visitorId: string | null = null;

      if (contact.chat_visitor_id) {
        const { data: existing } = await supabase
          .from("chat_visitors")
          .select("id")
          .eq("id", contact.chat_visitor_id)
          .maybeSingle();
        if (existing) visitorId = existing.id;
      }

      if (!visitorId) {
        const { data: byContact } = await supabase
          .from("chat_visitors")
          .select("id")
          .eq("company_contact_id", contact.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (byContact) {
          visitorId = byContact.id;
          await supabase
            .from("company_contacts")
            .update({ chat_visitor_id: visitorId })
            .eq("id", contact.id);
        }
      }

      if (!visitorId) {
        const { data: visitor } = await supabase
          .from("chat_visitors")
          .insert({
            name: contact.name,
            email: contact.email,
            owner_user_id: userId,
            company_contact_id: contact.id,
            contact_id: contact.company_id,
          })
          .select("id")
          .single();

        if (!visitor) throw new Error("Failed to create visitor");
        visitorId = visitor.id;

        await supabase
          .from("company_contacts")
          .update({ chat_visitor_id: visitorId })
          .eq("id", contact.id);
      }

      const { data: room } = await supabase
        .from("chat_rooms")
        .insert({
          visitor_id: visitorId,
          owner_user_id: userId,
          attendant_id: attendantId,
          company_contact_id: contact.id,
          contact_id: contact.company_id,
          status: "active",
          assigned_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (!room) throw new Error("Failed to create room");

      const { data: attProfile } = await supabase
        .from("attendant_profiles")
        .select("active_conversations")
        .eq("id", attendantId)
        .maybeSingle();

      if (attProfile) {
        await supabase
          .from("attendant_profiles")
          .update({ active_conversations: (attProfile.active_conversations ?? 0) + 1 })
          .eq("id", attendantId);
      }

      await supabase.from("chat_messages").insert({
        room_id: room.id,
        sender_type: "attendant",
        sender_id: userId,
        sender_name: attendantName,
        content: message.trim(),
      });

      toast.success("Chat proativo criado com sucesso!");
      onOpenChange(false);
      setSelectedCompanyId("");
      setSelectedContactId("");
      setMessage("");
    } catch {
      toast.error("Erro ao criar chat proativo");
    }

    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Novo Chat Proativo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={companyOpen} className="w-full justify-between font-normal">
                  {selectedCompany ? selectedCompany.name : "Buscar empresa..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar empresa..." />
                  <CommandList>
                    <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
                    <CommandGroup>
                      {companies.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.name}
                          onSelect={() => {
                            setSelectedCompanyId(c.id);
                            setSelectedContactId("");
                            setCompanyOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedCompanyId === c.id ? "opacity-100" : "opacity-0")} />
                          {c.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedCompanyId && (
            <div className="space-y-2">
              <Label>Contato</Label>
              <Popover open={contactOpen} onOpenChange={setContactOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={contactOpen} className="w-full justify-between font-normal">
                    {selectedContact ? `${selectedContact.name} (${selectedContact.email})` : "Buscar contato..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar contato..." />
                    <CommandList>
                      <CommandEmpty>Nenhum contato encontrado.</CommandEmpty>
                      <CommandGroup>
                        {contacts.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={`${c.name} ${c.email}`}
                            onSelect={() => {
                              setSelectedContactId(c.id);
                              setContactOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedContactId === c.id ? "opacity-100" : "opacity-0")} />
                            {c.name} ({c.email})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="space-y-2">
            <Label>Mensagem inicial</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Olá! Gostaria de verificar como está..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={creating || !selectedContactId || !message.trim()}>
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Iniciar Conversa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProactiveChatDialog;
