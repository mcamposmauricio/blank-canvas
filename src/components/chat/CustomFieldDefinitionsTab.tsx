import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FieldDef {
  id: string;
  key: string;
  label: string;
  field_type: string;
  target: string;
  maps_to: string | null;
  display_order: number;
  is_active: boolean;
}

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "decimal", label: "Decimal" },
  { value: "integer", label: "Inteiro" },
  { value: "date", label: "Data" },
  { value: "url", label: "URL" },
  { value: "boolean", label: "Booleano" },
  { value: "list", label: "Lista" },
  { value: "list_url", label: "Lista de Links" },
  { value: "list_object", label: "Lista de Objetos" },
  { value: "json", label: "JSON / Objeto" },
];

const FIELD_TYPE_HINTS: Record<string, string> = {
  list: 'Array de valores simples. Ex: ["Item A", "Item B", "Item C"]',
  list_url: 'Array de URLs. Ex: ["https://link1.com", "https://link2.com"]',
  list_object: 'Array de objetos. Ex: [{"Titulo": "X", "Link": "https://...", "Status": "Ativo"}]',
  json: 'Objeto chave-valor. Ex: {"chave": "valor", "outra": 123}',
};

const COMPANY_COLUMNS = [
  { value: "mrr", label: "MRR" },
  { value: "contract_value", label: "Valor do Contrato" },
  { value: "company_sector", label: "Setor" },
  { value: "company_document", label: "CNPJ" },
  { value: "trade_name", label: "Nome Fantasia" },
];

const MAX_FIELDS = 20;

export default function CustomFieldDefinitionsTab() {
  const { toast } = useToast();
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FieldDef | null>(null);
  const [form, setForm] = useState({
    key: "",
    label: "",
    field_type: "text",
    target: "company",
    maps_to: "",
  });

  const fetchFields = async () => {
    const { data } = await supabase
      .from("chat_custom_field_definitions" as any)
      .select("*")
      .order("display_order", { ascending: true });
    setFields((data as any as FieldDef[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const openDialog = (field?: FieldDef) => {
    if (field) {
      setEditing(field);
      setForm({
        key: field.key,
        label: field.label,
        field_type: field.field_type,
        target: field.target,
        maps_to: field.maps_to ?? "",
      });
    } else {
      setEditing(null);
      setForm({ key: "", label: "", field_type: "text", target: "company", maps_to: "" });
    }
    setDialogOpen(true);
  };

  const saveField = async () => {
    if (!form.key.trim() || !form.label.trim()) {
      toast({ title: "Key e Label são obrigatórios", variant: "destructive" });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const payload = {
      key: form.key.trim().toLowerCase().replace(/\s+/g, "_"),
      label: form.label.trim(),
      field_type: form.field_type,
      target: form.target,
      maps_to: form.maps_to || null,
      user_id: session.user.id,
    };

    if (editing) {
      await supabase
        .from("chat_custom_field_definitions" as any)
        .update(payload as any)
        .eq("id", editing.id);
    } else {
      if (fields.length >= MAX_FIELDS) {
        toast({ title: `Limite de ${MAX_FIELDS} campos atingido`, variant: "destructive" });
        return;
      }
      await supabase
        .from("chat_custom_field_definitions" as any)
        .insert({ ...payload, display_order: fields.length } as any);
    }

    setDialogOpen(false);
    toast({ title: "Campo salvo com sucesso" });
    fetchFields();
  };

  const deleteField = async (id: string) => {
    await supabase.from("chat_custom_field_definitions" as any).delete().eq("id", id);
    toast({ title: "Campo excluído" });
    fetchFields();
  };

  const typeLabel = (t: string) => FIELD_TYPES.find((f) => f.value === t)?.label ?? t;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4" />
          Campos Customizados do Chat
        </CardTitle>
        <CardDescription>
          Defina campos que sua plataforma pode enviar via <code className="text-xs bg-muted px-1 rounded">window.NPSChat.update()</code>. 
          Campos com destino "Empresa" atualizam automaticamente o cadastro da empresa.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Mapeia para</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.key}</TableCell>
                  <TableCell>{f.label}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{typeLabel(f.field_type)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.target === "company" ? "default" : "secondary"} className="text-xs">
                      {f.target === "company" ? "Empresa" : "Contato"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {f.maps_to ? COMPANY_COLUMNS.find((c) => c.value === f.maps_to)?.label ?? f.maps_to : "custom_fields"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDialog(f)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteField(f.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {fields.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum campo customizado configurado. Adicione campos para que sua plataforma possa enviar dados adicionais.
          </p>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => openDialog()}
          disabled={fields.length >= MAX_FIELDS}
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Campo
          <span className="text-muted-foreground ml-1 text-xs">({fields.length}/{MAX_FIELDS})</span>
        </Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Campo" : "Novo Campo Customizado"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Key (identificador no payload)</Label>
                <Input
                  value={form.key}
                  onChange={(e) => setForm({ ...form, key: e.target.value })}
                  placeholder="Ex: mrr, plano_contratado, link_master"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Nome da propriedade que será enviada no <code>update()</code>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Label (nome para atendentes)</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Ex: Valor do MRR, Plano Contratado"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.field_type} onValueChange={(v) => setForm({ ...form, field_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {FIELD_TYPE_HINTS[form.field_type] && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <code className="bg-muted px-1 rounded text-[10px]">{FIELD_TYPE_HINTS[form.field_type]}</code>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Destino</Label>
                  <Select value={form.target} onValueChange={(v) => setForm({ ...form, target: v, maps_to: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">Empresa</SelectItem>
                      <SelectItem value="contact">Contato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.target === "company" && (
                <div className="space-y-2">
                  <Label>Mapeia para coluna (opcional)</Label>
                  <Select value={form.maps_to || "none"} onValueChange={(v) => setForm({ ...form, maps_to: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma (salvar em custom_fields)</SelectItem>
                      {COMPANY_COLUMNS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Se mapeado, o valor será salvo diretamente na coluna da empresa ao invés de custom_fields.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={saveField}>{editing ? "Salvar" : "Adicionar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
