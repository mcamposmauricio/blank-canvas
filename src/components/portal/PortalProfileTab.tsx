import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, Mail, Phone, User, Briefcase } from "lucide-react";

interface PortalProfileTabProps {
  contact: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string | null;
    department: string | null;
  };
  onUpdate: (updated: any) => void;
}

export default function PortalProfileTab({ contact, onUpdate }: PortalProfileTabProps) {
  const { toast } = useToast();
  const [name, setName] = useState(contact.name);
  const [phone, setPhone] = useState(contact.phone || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("company_contacts")
      .update({ name, phone: phone || null })
      .eq("id", contact.id);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Dados atualizados!" });
      onUpdate({ ...contact, name, phone });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Meus Dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <User className="h-3 w-3" /> Nome
            </Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Mail className="h-3 w-3" /> Email
            </Label>
            <Input value={contact.email} disabled className="bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Phone className="h-3 w-3" /> Telefone
            </Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          {contact.role && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Briefcase className="h-3 w-3" /> Cargo
              </Label>
              <Input value={contact.role} disabled className="bg-muted" />
            </div>
          )}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
